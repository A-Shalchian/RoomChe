import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import laplace

WORK = "frames"
VIDEO_SUFFIXES = {".mov", ".mp4", ".m4v", ".avi", ".mkv", ".hevc", ".webm"}
SHARPNESS_WIDTH = 640
BLUR_FLOOR = 0.4


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def progress(value, message):
    print(f"PROGRESS {value:.3f} {message}", flush=True)


def find_clip(source_dir):
    clips = sorted(
        p for p in source_dir.iterdir() if p.suffix.lower() in VIDEO_SUFFIXES
    )
    if not clips:
        fail(f"no video in {source_dir}")
    return clips[0]


def probe_duration(clip):
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(clip),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        fail(f"ffprobe failed: {result.stderr.strip()[:200]}")
    try:
        return float(json.loads(result.stdout)["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError):
        fail("could not read the clip duration")


def extract(clip, work_dir, sample_fps):
    if work_dir.exists():
        shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True)

    result = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(clip),
            "-vf",
            f"fps={sample_fps:.4f}",
            "-q:v",
            "2",
            str(work_dir / "%05d.jpg"),
        ],
    )
    if result.returncode != 0:
        fail(f"ffmpeg exited {result.returncode}")

    frames = sorted(work_dir.glob("*.jpg"))
    if not frames:
        fail("ffmpeg produced no frames")
    return frames


def sharpness(path):
    with Image.open(path) as image:
        image = image.convert("L")
        if image.width > SHARPNESS_WIDTH:
            scale = SHARPNESS_WIDTH / image.width
            image = image.resize(
                (SHARPNESS_WIDTH, max(1, round(image.height * scale))),
                Image.BILINEAR,
            )
        return float(laplace(np.asarray(image, dtype=np.float32)).var())


def pick(frames, scores, target):
    if len(frames) <= target:
        return list(range(len(frames)))

    edges = np.linspace(0, len(frames), target + 1).astype(int)
    chosen = []
    for start, end in zip(edges[:-1], edges[1:]):
        if end <= start:
            continue
        window = range(start, end)
        chosen.append(max(window, key=lambda i: scores[i]))
    return chosen


def main():
    parser = argparse.ArgumentParser(
        description="Pull the sharpest evenly spaced frames out of a scan video."
    )
    parser.add_argument("source_dir", help="directory holding the clip")
    parser.add_argument("raw_dir", help="directory to write selected frames into")
    parser.add_argument(
        "--target",
        type=int,
        default=120,
        help="how many frames to keep, the count fed to the solver",
    )
    parser.add_argument(
        "--sample-multiplier",
        type=float,
        default=3.0,
        help="how many candidates to extract per kept frame",
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    raw_dir = Path(args.raw_dir)
    if not source_dir.is_dir():
        fail(f"{source_dir} does not exist")

    clip = find_clip(source_dir)
    duration = probe_duration(clip)
    if duration <= 0:
        fail("the clip has no duration")

    candidates = max(args.target, int(args.target * args.sample_multiplier))
    sample_fps = min(30.0, max(0.5, candidates / duration))

    progress(0.02, f"reading {clip.name}, {duration:.0f}s")
    work_dir = source_dir.parent / WORK
    frames = extract(clip, work_dir, sample_fps)
    progress(0.4, f"{len(frames)} candidate frames")

    scores = []
    for index, frame in enumerate(frames):
        scores.append(sharpness(frame))
        if index % 10 == 0:
            progress(0.4 + 0.45 * (index / len(frames)), "scoring sharpness")

    chosen = pick(frames, scores, args.target)
    median = float(np.median([scores[i] for i in chosen]))
    keep = [i for i in chosen if scores[i] >= median * BLUR_FLOOR]
    dropped = len(chosen) - len(keep)

    if not keep:
        fail("every candidate frame was too blurry, shoot a slower orbit")

    if raw_dir.exists():
        shutil.rmtree(raw_dir)
    raw_dir.mkdir(parents=True)

    for position, index in enumerate(keep):
        shutil.copyfile(frames[index], raw_dir / f"{position:04d}.jpg")
        if position % 10 == 0:
            progress(0.85 + 0.14 * (position / len(keep)), "writing frames")

    shutil.rmtree(work_dir, ignore_errors=True)

    print(f"FRAMES {len(keep)}", flush=True)
    progress(1.0, f"kept {len(keep)} frames, dropped {dropped} blurry")


if __name__ == "__main__":
    main()
