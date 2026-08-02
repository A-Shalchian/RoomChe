import argparse
import sys
from pathlib import Path

import numpy as np
import trimesh
import xatlas
from PIL import Image
from scipy.ndimage import distance_transform_edt
from scipy.spatial import cKDTree

MESH = Path("dense") / "mesh.ply"
RANSAC_ROUNDS = 400
PLANE_TOLERANCE = 0.004
GROUND_CUT = 0.02
MIN_GROUND_SHARE = 0.15
MIN_SURVIVING_SHARE = 0.02
MIN_SURVIVING_FACES = 500
ONE_SIDED_SHARE = 0.90
PART_SHARE = 0.08
BLEND_NEIGHBOURS = 4


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def progress(value, message):
    print(f"PROGRESS {value:.3f} {message}", flush=True)


def load(scan_dir):
    source = scan_dir / MESH
    if not source.exists():
        fail(f"no mesh at {source}, run the reconstruct stage first")
    mesh = trimesh.load(source, process=False)
    if isinstance(mesh, trimesh.Scene):
        mesh = trimesh.util.concatenate(list(mesh.geometry.values()))
    if len(mesh.faces) == 0:
        fail("the mesh has no faces")
    return mesh


def vertex_colors(mesh):
    colors = getattr(mesh.visual, "vertex_colors", None)
    if colors is None or len(colors) != len(mesh.vertices):
        return np.full((len(mesh.vertices), 3), 200, dtype=np.uint8)
    return np.asarray(colors)[:, :3].astype(np.uint8)


def transfer(source_vertices, colors, target_vertices):
    _, index = cKDTree(source_vertices).query(target_vertices)
    return colors[index]


def blend(source_vertices, colors, target_points, neighbours=BLEND_NEIGHBOURS):
    k = min(neighbours, len(source_vertices))
    distance, index = cKDTree(source_vertices).query(target_points, k=k)
    if k == 1:
        return colors[index]
    weight = 1.0 / np.maximum(distance, 1e-6)
    weight /= weight.sum(axis=1, keepdims=True)
    return np.einsum("nk,nkc->nc", weight, colors[index].astype(np.float32))


def keep_solid_parts(mesh, colors):
    parts = mesh.split(only_watertight=False)
    if len(parts) <= 1:
        return mesh, colors
    biggest = max(len(p.faces) for p in parts)
    kept = [p for p in parts if len(p.faces) >= biggest * PART_SHARE]
    if len(kept) == len(parts):
        return mesh, colors
    merged = trimesh.util.concatenate(kept)
    return merged, transfer(mesh.vertices, colors, merged.vertices)


def drop_ground(mesh, colors, rng):
    points = np.asarray(mesh.vertices)
    if len(points) < 1000:
        return mesh, colors

    scale = float(np.ptp(points, axis=0).max())
    if scale <= 0:
        return mesh, colors
    tolerance = scale * PLANE_TOLERANCE
    cut = scale * GROUND_CUT

    best_keep = None
    best_count = 0
    for _ in range(RANSAC_ROUNDS):
        sample = points[rng.choice(len(points), 3, replace=False)]
        normal = np.cross(sample[1] - sample[0], sample[2] - sample[0])
        length = np.linalg.norm(normal)
        if length < 1e-9:
            continue
        normal = normal / length
        signed = (points - sample[0]) @ normal
        inliers = np.abs(signed) < tolerance
        count = int(inliers.sum())
        if count <= best_count:
            continue
        rest = signed[~inliers]
        if len(rest) == 0:
            continue
        above = float((rest > 0).mean())
        if max(above, 1.0 - above) < ONE_SIDED_SHARE:
            continue
        best_count = count
        best_keep = signed > cut if above > 0.5 else signed < -cut

    if best_keep is None or best_count < len(points) * MIN_GROUND_SHARE:
        return mesh, colors

    keep_face = best_keep[mesh.faces].all(axis=1)
    survivors = int(keep_face.sum())
    if survivors < max(MIN_SURVIVING_FACES, len(mesh.faces) * MIN_SURVIVING_SHARE):
        return mesh, colors

    trimmed = mesh.copy()
    trimmed.update_faces(keep_face)
    trimmed.remove_unreferenced_vertices()
    return trimmed, transfer(mesh.vertices, colors, trimmed.vertices)


def decimate(mesh, target_faces):
    if len(mesh.faces) <= target_faces:
        return mesh
    import fast_simplification

    vertices, faces = fast_simplification.simplify(
        np.asarray(mesh.vertices, dtype=np.float64),
        np.asarray(mesh.faces, dtype=np.int32),
        target_count=target_faces,
    )
    return trimesh.Trimesh(vertices=vertices, faces=faces, process=False)


def rasterize_positions(uvs, faces, vertices, size):
    positions = np.zeros((size, size, 3), dtype=np.float32)
    filled = np.zeros((size, size), dtype=bool)

    pixel = uvs * (size - 1)
    pixel[:, 1] = (size - 1) - pixel[:, 1]

    for face in faces:
        tri = pixel[face]
        low = np.maximum(np.floor(tri.min(axis=0)).astype(int), 0)
        high = np.minimum(np.ceil(tri.max(axis=0)).astype(int), size - 1)
        if high[0] < low[0] or high[1] < low[1]:
            continue

        gx, gy = np.meshgrid(
            np.arange(low[0], high[0] + 1),
            np.arange(low[1], high[1] + 1),
        )

        (x0, y0), (x1, y1), (x2, y2) = tri
        denominator = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(denominator) < 1e-9:
            continue

        a = ((y1 - y2) * (gx - x2) + (x2 - x1) * (gy - y2)) / denominator
        b = ((y2 - y0) * (gx - x2) + (x0 - x2) * (gy - y2)) / denominator
        c = 1.0 - a - b
        inside = (a >= -0.002) & (b >= -0.002) & (c >= -0.002)
        if not inside.any():
            continue

        corners = vertices[face]
        blended = (
            a[..., None] * corners[0]
            + b[..., None] * corners[1]
            + c[..., None] * corners[2]
        )
        rows = gy[inside]
        cols = gx[inside]
        positions[rows, cols] = blended[inside]
        filled[rows, cols] = True

    return positions, filled


def bake(positions, filled, source_vertices, source_colors, size):
    texture = np.zeros((size, size, 3), dtype=np.uint8)
    if filled.any():
        sampled = blend(source_vertices, source_colors, positions[filled])
        texture[filled] = np.clip(sampled, 0, 255).astype(np.uint8)
    if not filled.all():
        _, indices = distance_transform_edt(~filled, return_indices=True)
        texture = texture[indices[0], indices[1]]
    return Image.fromarray(texture)


def normalize(mesh):
    bounds = mesh.bounds
    span = float((bounds[1] - bounds[0]).max())
    if span <= 0:
        return mesh
    centre = (bounds[0] + bounds[1]) / 2.0
    mesh.apply_translation([-centre[0], -bounds[0][1], -centre[2]])
    mesh.apply_scale(1.0 / span)
    return mesh


def main():
    parser = argparse.ArgumentParser(
        description="Turn a COLMAP mesh into a textured, web sized glb."
    )
    parser.add_argument("scan_dir", help="path to .scans/<set-id>")
    parser.add_argument("--out", required=True, help="where to write the glb")
    parser.add_argument("--faces", type=int, default=40000)
    parser.add_argument("--texture", type=int, default=2048)
    parser.add_argument(
        "--keep-ground",
        action="store_true",
        help="leave the floor slab in, for room scans where the floor is the point",
    )
    args = parser.parse_args()

    scan_dir = Path(args.scan_dir).resolve()
    rng = np.random.default_rng(7)

    progress(0.05, "loading the mesh")
    mesh = load(scan_dir)
    colors = vertex_colors(mesh)

    if not args.keep_ground:
        progress(0.18, "finding the floor")
        mesh, colors = drop_ground(mesh, colors, rng)

    progress(0.3, "removing floaters")
    mesh, colors = keep_solid_parts(mesh, colors)

    source_vertices = np.asarray(mesh.vertices).copy()
    source_colors = colors.copy()

    progress(0.42, f"decimating from {len(mesh.faces)} faces")
    mesh = decimate(mesh, args.faces)

    progress(0.55, "unwrapping uvs")
    mesh.fix_normals()
    smooth = np.asarray(mesh.vertex_normals).copy()

    vmapping, indices, uvs = xatlas.parametrize(
        np.asarray(mesh.vertices, dtype=np.float32),
        np.asarray(mesh.faces, dtype=np.uint32),
    )
    unwrapped = trimesh.Trimesh(
        vertices=np.asarray(mesh.vertices)[vmapping],
        faces=np.asarray(indices),
        vertex_normals=smooth[vmapping],
        process=False,
    )

    progress(0.66, "baking the texture")
    positions, filled = rasterize_positions(
        uvs, np.asarray(indices), np.asarray(unwrapped.vertices), args.texture
    )
    image = bake(positions, filled, source_vertices, source_colors, args.texture)

    progress(0.9, "packing the glb")
    unwrapped = normalize(unwrapped)
    unwrapped.visual = trimesh.visual.TextureVisuals(
        uv=uvs,
        material=trimesh.visual.material.PBRMaterial(
            baseColorTexture=image,
            metallicFactor=0.0,
            roughnessFactor=0.85,
        ),
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    unwrapped.export(out, include_normals=True)

    progress(1.0, f"{len(unwrapped.faces)} faces, {args.texture}px texture")


if __name__ == "__main__":
    main()
