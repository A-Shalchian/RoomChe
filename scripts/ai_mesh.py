import argparse
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

HASH_WIDTH = 9
HASH_HEIGHT = 8
CUTOUT_MAX = 1024


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def progress(value, message):
    print(f"PROGRESS {value:.3f} {message}", flush=True)


def difference_hash(path):
    with Image.open(path) as image:
        small = image.convert("L").resize((HASH_WIDTH, HASH_HEIGHT), Image.BILINEAR)
    pixels = np.asarray(small, dtype=np.int16)
    return (pixels[:, :-1] > pixels[:, 1:]).flatten()


def spread(hashes, count):
    picked = [0]
    while len(picked) < count and len(picked) < len(hashes):
        distances = [
            min(int(np.count_nonzero(hashes[i] ^ hashes[p])) for p in picked)
            if i not in picked
            else -1
            for i in range(len(hashes))
        ]
        picked.append(int(np.argmax(distances)))
    return sorted(picked)


def cutout(source, target, session):
    with Image.open(source) as image:
        image = image.convert("RGB")
        if max(image.size) > CUTOUT_MAX:
            scale = CUTOUT_MAX / max(image.size)
            image = image.resize(
                (round(image.width * scale), round(image.height * scale)),
                Image.LANCZOS,
            )
        remove(image, session=session).save(target)


def main():
    parser = argparse.ArgumentParser(
        description="Feed the best spread frames of a scan to a multi-view 3d model."
    )
    parser.add_argument("raw_dir", help="directory of scan frames")
    parser.add_argument("--out", required=True, help="where to write the glb")
    parser.add_argument("--views", type=int, default=4)
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir).resolve()
    frames = sorted(
        p for p in raw_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if not frames:
        fail(f"no frames in {raw_dir}")

    progress(0.1, f"choosing {args.views} views from {len(frames)}")
    hashes = [difference_hash(p) for p in frames]
    chosen = spread(hashes, min(args.views, len(frames)))

    views_dir = raw_dir.parent / "views"
    if views_dir.exists():
        shutil.rmtree(views_dir)
    views_dir.mkdir(parents=True)

    session = new_session("u2net")
    for position, index in enumerate(chosen):
        cutout(frames[index], views_dir / f"view{position}.png", session)
        progress(0.2 + 0.5 * ((position + 1) / len(chosen)), "cutting out views")

    command = os.environ.get("ROOMCHE_AI_MESH")
    if not command:
        fail(
            f"{len(chosen)} views are ready in {views_dir}, but no model is wired up. "
            "Set ROOMCHE_AI_MESH to a command taking {views} and {out}, for example "
            '"python C:/models/hunyuan3d/run.py --views {views} --out {out}".'
        )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    filled = command.replace("{views}", str(views_dir)).replace("{out}", str(out))

    progress(0.75, "running the multi-view model")
    result = subprocess.run(shlex.split(filled, posix=False))
    if result.returncode != 0:
        fail(f"the model command exited {result.returncode}")
    if not out.exists():
        fail(f"the model command finished but wrote no glb at {out}")

    progress(1.0, "mesh ready")


if __name__ == "__main__":
    main()
