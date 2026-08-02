import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

RAW = "raw"
WORK = "work"
MASKS = "masks"

STAGE_WEIGHTS = [
    ("preparing images", 0.10),
    ("extracting features", 0.16),
    ("matching", 0.30),
    ("mapping", 0.42),
    ("undistorting", 0.46),
    ("dense stereo", 0.90),
    ("fusing", 0.96),
    ("meshing", 1.00),
]


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def progress(stage):
    for name, value in STAGE_WEIGHTS:
        if name == stage:
            print(f"PROGRESS {value:.3f} {stage}", flush=True)
            return


def colmap_binary():
    override = os.environ.get("COLMAP_BIN")
    if override and Path(override).exists():
        return override
    found = shutil.which("colmap")
    if found:
        return found
    fallback = Path.home() / "tools" / "bin" / "colmap.exe"
    return str(fallback) if fallback.exists() else None


def prepare_images(scan_dir, max_dim, with_masks):
    raw_dir = scan_dir / RAW
    work_dir = scan_dir / WORK
    mask_dir = scan_dir / MASKS
    photos = sorted(p for p in raw_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    if not photos:
        fail(f"no photos in {raw_dir}")

    work_dir.mkdir(exist_ok=True)
    session = None
    if with_masks:
        mask_dir.mkdir(exist_ok=True)
        session = new_session("u2net")

    for i, photo in enumerate(photos, 1):
        image = Image.open(photo).convert("RGB")
        if max(image.size) > max_dim:
            scale = max_dim / max(image.size)
            image = image.resize(
                (round(image.width * scale), round(image.height * scale)),
                Image.LANCZOS,
            )
        image.save(work_dir / photo.name, quality=95)

        if session is not None:
            cut = remove(image, session=session)
            alpha = cut.getchannel("A").point(lambda v: 255 if v > 30 else 0)
            alpha.save(mask_dir / f"{photo.name}.png")
        print(f"[{i}/{len(photos)}] {photo.name}")

    return len(photos)


def colmap(args, cwd):
    print("colmap " + " ".join(args))
    result = subprocess.run([colmap_binary(), *args], cwd=cwd)
    if result.returncode != 0:
        fail(f"colmap {args[0]} exited {result.returncode}")


def reconstruct(scan_dir, max_dim, with_masks, sequential, sparse_only=False):
    db = scan_dir / "colmap.db"
    sparse = scan_dir / "sparse"
    dense = scan_dir / "dense"
    sparse.mkdir(exist_ok=True)
    dense.mkdir(exist_ok=True)

    extract = [
        "feature_extractor",
        "--database_path", str(db),
        "--image_path", str(scan_dir / WORK),
        "--ImageReader.single_camera", "1",
        "--FeatureExtraction.max_image_size", str(max_dim),
    ]
    if with_masks:
        extract += ["--ImageReader.mask_path", str(scan_dir / MASKS)]
    progress("extracting features")
    colmap(extract, scan_dir)

    progress("matching")
    if sequential:
        colmap([
            "sequential_matcher",
            "--database_path", str(db),
            "--SequentialMatching.overlap", "12",
            "--SequentialMatching.quadratic_overlap", "1",
            "--SequentialMatching.loop_detection", "0",
        ], scan_dir)
    else:
        colmap(["exhaustive_matcher", "--database_path", str(db)], scan_dir)

    progress("mapping")
    colmap([
        "mapper",
        "--database_path", str(db),
        "--image_path", str(scan_dir / WORK),
        "--output_path", str(sparse),
    ], scan_dir)

    models = sorted(p for p in sparse.iterdir() if p.is_dir())
    if not models:
        fail("mapper produced no model, the photos did not register, shoot more overlap")

    if sparse_only:
        return models[0]

    progress("undistorting")
    colmap([
        "image_undistorter",
        "--image_path", str(scan_dir / WORK),
        "--input_path", str(models[0]),
        "--output_path", str(dense),
        "--output_type", "COLMAP",
        "--max_image_size", str(max_dim),
    ], scan_dir)

    progress("dense stereo")
    colmap(["patch_match_stereo", "--workspace_path", str(dense)], scan_dir)
    progress("fusing")
    colmap([
        "stereo_fusion",
        "--workspace_path", str(dense),
        "--output_path", str(dense / "fused.ply"),
    ], scan_dir)
    progress("meshing")
    colmap([
        "poisson_mesher",
        "--input_path", str(dense / "fused.ply"),
        "--output_path", str(dense / "mesh.ply"),
    ], scan_dir)

    return dense / "mesh.ply"


def main():
    parser = argparse.ArgumentParser(
        description="Turn a roomche photo scan set into a textured mesh."
    )
    parser.add_argument("scan_dir", help="path to .scans/<set-id>")
    parser.add_argument(
        "--max-dim",
        type=int,
        default=2000,
        help="longest edge fed to COLMAP, lower this if the GPU runs out of memory",
    )
    parser.add_argument(
        "--masks",
        action="store_true",
        help=(
            "cut the background out before matching. Needed when the object was "
            "flipped mid-shoot, because the background no longer agrees with it. "
            "Leave it off for a single-side shoot, where background features help "
            "the solve."
        ),
    )
    parser.add_argument(
        "--sequential",
        action="store_true",
        help=(
            "match neighbouring frames only. Correct for video frames, which are "
            "already in orbit order, and far cheaper than matching every pair."
        ),
    )
    parser.add_argument(
        "--sparse-only",
        action="store_true",
        help="stop after the camera solve, which is all a floor plan needs",
    )
    parser.add_argument(
        "--reuse",
        action="store_true",
        help="reuse the resized copies and masks from a previous run",
    )
    args = parser.parse_args()

    scan_dir = Path(args.scan_dir).resolve()
    if not (scan_dir / RAW).is_dir():
        fail(f"{scan_dir} has no {RAW} folder")
    if colmap_binary() is None:
        fail(
            "colmap was not found. Set COLMAP_BIN to colmap.exe, or download the "
            "CUDA build from https://github.com/colmap/colmap/releases and add its "
            "folder to PATH."
        )

    progress("preparing images")
    if args.reuse:
        count = len(list((scan_dir / WORK).iterdir()))
    else:
        count = prepare_images(scan_dir, args.max_dim, args.masks)

    if count < 30:
        print(f"warning: only {count} photos, expect holes", file=sys.stderr)

    result = reconstruct(
        scan_dir, args.max_dim, args.masks, args.sequential, args.sparse_only
    )
    print(f"\n{'sparse' if args.sparse_only else 'mesh'}: {result}")


if __name__ == "__main__":
    main()
