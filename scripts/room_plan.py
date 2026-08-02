import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np

WALL_BAND = 0.18
MIN_WALL_SUPPORT = 0.02
MIN_WALL_EXTENT = 0.8
MIN_WALL_DENSITY = 90
LINE_TOLERANCE = 0.035
LINE_ROUNDS = 600
MERGE_ANGLE = math.radians(7)
MERGE_OFFSET = 0.12
MAX_CANDIDATES = 24
MIN_TRACK = 3
ERROR_PERCENTILE = 92
RADIUS_PERCENTILE = 99


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def progress(value, message):
    print(f"PROGRESS {value:.3f} {message}", flush=True)


def colmap_binary():
    import os
    import shutil

    override = os.environ.get("COLMAP_BIN")
    if override and Path(override).exists():
        return override
    found = shutil.which("colmap")
    if found:
        return found
    fallback = Path.home() / "tools" / "bin" / "colmap.exe"
    return str(fallback) if fallback.exists() else None


def to_text_model(sparse_dir, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    if (out_dir / "points3D.txt").exists():
        return out_dir
    binary = colmap_binary()
    if binary is None:
        fail("colmap was not found, set COLMAP_BIN")
    result = subprocess.run(
        [
            binary,
            "model_converter",
            "--input_path",
            str(sparse_dir),
            "--output_path",
            str(out_dir),
            "--output_type",
            "TXT",
        ],
    )
    if result.returncode != 0:
        fail(f"model_converter exited {result.returncode}")
    return out_dir


def read_points(path):
    rows = []
    errors = []
    tracks = []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) < 8:
                continue
            rows.append([float(parts[1]), float(parts[2]), float(parts[3])])
            errors.append(float(parts[7]))
            tracks.append((len(parts) - 8) // 2)
    if not rows:
        fail("the sparse model has no points")

    points = np.asarray(rows, dtype=np.float64)
    error = np.asarray(errors)
    track = np.asarray(tracks)

    keep = np.ones(len(points), dtype=bool)
    if track.max() >= MIN_TRACK:
        keep &= track >= MIN_TRACK
    if len(error) > 40:
        keep &= error <= np.percentile(error[keep], ERROR_PERCENTILE)
    if keep.sum() >= 200:
        points = points[keep]

    return trim_outliers(points)


def trim_outliers(points):
    if len(points) < 200:
        return points
    centre = np.median(points, axis=0)
    radius = np.linalg.norm(points - centre, axis=1)
    return points[radius <= np.percentile(radius, RADIUS_PERCENTILE)]


def read_cameras(path):
    ups = []
    centres = []
    with open(path, encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            if len(parts) < 10 or not parts[0].isdigit():
                continue
            qw, qx, qy, qz = (float(v) for v in parts[1:5])
            tx, ty, tz = (float(v) for v in parts[5:8])
            rotation = quaternion_matrix(qw, qx, qy, qz)
            centres.append(-rotation.T @ np.array([tx, ty, tz]))
            ups.append(-rotation.T @ np.array([0.0, 1.0, 0.0]))
    if not ups:
        fail("the sparse model has no registered images")
    return np.asarray(ups), np.asarray(centres)


def quaternion_matrix(qw, qx, qy, qz):
    n = math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz)
    qw, qx, qy, qz = qw / n, qx / n, qy / n, qz / n
    return np.array(
        [
            [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
            [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
            [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
        ]
    )


def upright_frame(ups):
    mean = ups.mean(axis=0)
    length = np.linalg.norm(mean)
    if length < 1e-6:
        fail("the camera orientations do not agree on which way is up")
    up = mean / length
    helper = np.array([1.0, 0.0, 0.0])
    if abs(up @ helper) > 0.9:
        helper = np.array([0.0, 0.0, 1.0])
    right = np.cross(helper, up)
    right /= np.linalg.norm(right)
    forward = np.cross(up, right)
    return np.stack([right, up, forward])


def slab_peak(values, low, high, bins=240):
    window = values[(values >= low) & (values <= high)]
    if len(window) < 20:
        return None
    counts, edges = np.histogram(window, bins=bins)
    index = int(counts.argmax())
    return float((edges[index] + edges[index + 1]) / 2)


def refine(points):
    centre = points.mean(axis=0)
    _, _, vectors = np.linalg.svd(points - centre)
    direction = vectors[0]
    return centre, direction / np.linalg.norm(direction)


def fit_lines(points2d, rng):
    candidates = []
    remaining = points2d.copy()
    target = max(40, int(len(points2d) * MIN_WALL_SUPPORT))

    for _ in range(MAX_CANDIDATES):
        if len(remaining) < target:
            break
        best = None
        for _ in range(LINE_ROUNDS):
            pair = remaining[rng.choice(len(remaining), 2, replace=False)]
            direction = pair[1] - pair[0]
            length = np.linalg.norm(direction)
            if length < 1e-6:
                continue
            direction /= length
            normal = np.array([-direction[1], direction[0]])
            inliers = np.abs((remaining - pair[0]) @ normal) < LINE_TOLERANCE
            count = int(inliers.sum())
            if best is None or count > best[0]:
                best = (count, inliers.copy())

        if best is None or best[0] < target:
            break

        count, inliers = best
        member = remaining[inliers]
        remaining = remaining[~inliers]

        centre, direction = refine(member)
        along = (member - centre) @ direction
        lo, hi = float(np.percentile(along, 1)), float(np.percentile(along, 99))
        extent = hi - lo
        if extent < MIN_WALL_EXTENT:
            continue
        if count / extent < MIN_WALL_DENSITY:
            continue

        candidates.append(
            {
                "point": centre,
                "dir": direction,
                "extent": extent,
                "support": count,
                "a": centre + direction * lo,
                "b": centre + direction * hi,
            }
        )

    return merge_lines(candidates)


def merge_lines(lines):
    merged = []
    for line in sorted(lines, key=lambda l: -l["support"]):
        twin = None
        for other in merged:
            angle = math.acos(min(1.0, abs(float(line["dir"] @ other["dir"]))))
            if angle > MERGE_ANGLE:
                continue
            normal = np.array([-other["dir"][1], other["dir"][0]])
            if abs(float((line["point"] - other["point"]) @ normal)) < MERGE_OFFSET:
                twin = other
                break
        if twin is None:
            merged.append(line)
        else:
            twin["extent"] = max(twin["extent"], line["extent"])
            twin["support"] += line["support"]
    return merged


def greedy_chain(lines, start, flip_start):
    pool = [dict(line) for line in lines]
    first = pool.pop(start)
    if flip_start:
        first["a"], first["b"] = first["b"], first["a"]
        first["dir"] = -first["dir"]
    chain = [first]

    while pool:
        tail = chain[-1]["b"]
        best = None
        for index, other in enumerate(pool):
            for flipped in (False, True):
                begin = other["b"] if flipped else other["a"]
                gap = float(np.linalg.norm(begin - tail))
                if best is None or gap < best[0]:
                    best = (gap, index, flipped)
        _, index, flipped = best
        picked = pool.pop(index)
        if flipped:
            picked["a"], picked["b"] = picked["b"], picked["a"]
            picked["dir"] = -picked["dir"]
        chain.append(picked)

    return chain


def segments_cross(p1, p2, p3, p4):
    def side(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    d1, d2 = side(p3, p4, p1), side(p3, p4, p2)
    d3, d4 = side(p1, p2, p3), side(p1, p2, p4)
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0))


def self_intersections(points):
    n = len(points)
    crossings = 0
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if segments_cross(
                points[i], points[(i + 1) % n], points[j], points[(j + 1) % n]
            ):
                crossings += 1
    return crossings


def polygon_of(chain):
    return [corner_between(line, chain[(i + 1) % len(chain)]) for i, line in enumerate(chain)]


def reflex_count(points):
    n = len(points)
    turns = []
    for i in range(n):
        a, b, c = points[i - 1], points[i], points[(i + 1) % n]
        v1 = (b[0] - a[0], b[1] - a[1])
        v2 = (c[0] - b[0], c[1] - b[1])
        turns.append(math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1]))
    sign = 1 if sum(turns) > 0 else -1
    return sum(1 for t in turns if t * sign < -0.2)


def perimeter_of(points):
    n = len(points)
    return sum(
        float(np.linalg.norm(np.asarray(points[(i + 1) % n]) - np.asarray(points[i])))
        for i in range(n)
    )


def manhattan_snap(lines):
    if not lines:
        return lines
    angles = np.array([math.atan2(l["dir"][1], l["dir"][0]) for l in lines])
    weights = np.array([float(l["support"]) for l in lines])
    quad = (angles * 4.0) % (2 * math.pi)
    base = math.atan2(
        float((np.sin(quad) * weights).sum()), float((np.cos(quad) * weights).sum())
    ) / 4.0

    snapped = []
    for line in lines:
        angle = math.atan2(line["dir"][1], line["dir"][0])
        steps = round((angle - base) / (math.pi / 2))
        target = base + steps * (math.pi / 2)
        direction = np.array([math.cos(target), math.sin(target)])
        centre = line["point"]
        span = np.array([(line["a"] - centre) @ direction, (line["b"] - centre) @ direction])
        item = dict(line)
        item["dir"] = direction
        item["a"] = centre + direction * float(span.min())
        item["b"] = centre + direction * float(span.max())
        item["extent"] = float(span.max() - span.min())
        snapped.append(item)
    return merge_lines(snapped)


def chain_lines(lines):
    if len(lines) < 3:
        return lines

    best = None
    for start in range(len(lines)):
        for flip in (False, True):
            chain = greedy_chain(lines, start, flip)
            points = [tuple(p) for p in polygon_of(chain)]
            score = (
                self_intersections(points) * 1000.0
                + reflex_count(points) * 40.0
                + perimeter_of(points)
            )
            if best is None or score < best[0]:
                best = (score, chain)

    return best[1]


def corner_between(a, b):
    matrix = np.array([[a["dir"][0], -b["dir"][0]], [a["dir"][1], -b["dir"][1]]])
    midpoint = (a["b"] + b["a"]) / 2
    if abs(np.linalg.det(matrix)) < 1e-6:
        return midpoint
    t = np.linalg.solve(matrix, b["point"] - a["point"])
    hit = a["point"] + a["dir"] * t[0]
    slack = 0.5 * (a["extent"] + b["extent"])
    if float(np.linalg.norm(hit - midpoint)) > slack:
        return midpoint
    return hit


def main():
    parser = argparse.ArgumentParser(
        description="Derive a floor plan from a COLMAP sparse reconstruction."
    )
    parser.add_argument("scan_dir", help="path to .scans/<set-id>")
    parser.add_argument("--out", required=True, help="where to write the plan json")
    parser.add_argument(
        "--ceiling",
        type=float,
        default=2.4,
        help="real floor to ceiling height in metres, the one measurement that sets scale",
    )
    parser.add_argument("--cloud", help="skip colmap and read this points3D.txt instead")
    parser.add_argument(
        "--freeform",
        action="store_true",
        help="do not snap walls to right angles, for a room that genuinely is not rectilinear",
    )
    args = parser.parse_args()

    scan_dir = Path(args.scan_dir).resolve()
    rng = np.random.default_rng(11)

    progress(0.05, "reading the reconstruction")
    if args.cloud:
        points = read_points(Path(args.cloud))
        ups = np.tile(np.array([0.0, 1.0, 0.0]), (4, 1))
        centres = np.zeros((1, 3))
    else:
        models = sorted(p for p in (scan_dir / "sparse").iterdir() if p.is_dir())
        if not models:
            fail("no sparse model, run the reconstruct stage first")
        text = to_text_model(models[0], scan_dir / "sparse_txt")
        points = read_points(text / "points3D.txt")
        ups, centres = read_cameras(text / "images.txt")

    progress(0.25, f"{len(points)} points, finding which way is up")
    frame = upright_frame(ups)
    local = points @ frame.T
    cams = centres @ frame.T

    heights = local[:, 1]
    low, high = np.percentile(heights, [1, 99])
    floor = slab_peak(heights, low, low + (high - low) * 0.35)
    ceiling = slab_peak(heights, high - (high - low) * 0.35, high)
    if floor is None or ceiling is None or ceiling - floor < 1e-3:
        fail("could not separate a floor from a ceiling in this cloud")

    scale = args.ceiling / (ceiling - floor)
    progress(0.4, f"scale {scale:.4f} from a {args.ceiling}m ceiling")

    band = local[
        (heights > floor + WALL_BAND * (ceiling - floor))
        & (heights < ceiling - WALL_BAND * (ceiling - floor))
    ]
    if len(band) < 80:
        fail("too few points on the walls, the sweep did not see them")

    plan2d = np.stack([band[:, 0], band[:, 2]], axis=1) * scale
    progress(0.55, f"fitting walls to {len(plan2d)} wall points")
    lines = fit_lines(plan2d, rng)
    if not args.freeform:
        lines = manhattan_snap(lines)
    if len(lines) < 3:
        fail(f"only found {len(lines)} walls, need at least 3")

    ordered = chain_lines(lines)

    progress(0.8, f"{len(ordered)} walls, intersecting corners")
    corners = [
        corner_between(line, ordered[(index + 1) % len(ordered)])
        for index, line in enumerate(ordered)
    ]
    if len(corners) < 3:
        fail("the walls did not intersect into a closed room")

    corners = np.asarray(corners)
    corners -= corners.mean(axis=0)

    plan = {
        "points": [{"x": round(float(p[0]), 3), "z": round(float(p[1]), 3)} for p in corners],
        "wallHeight": round(float(args.ceiling), 3),
        "scale": round(float(scale), 6),
        "walls": len(corners),
        "cloudPoints": int(len(points)),
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    progress(1.0, f"{len(corners)} walls written")


if __name__ == "__main__":
    main()
