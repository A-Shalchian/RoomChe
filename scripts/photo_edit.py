import argparse
import json
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

MAX_DIM = 2048
TRIM_PAD = 0.02

_sessions = {}


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def cut(image, name, **kwargs):
    from rembg import new_session, remove

    if name not in _sessions:
        _sessions[name] = new_session(name)
    return remove(image, session=_sessions[name], **kwargs)


def to_pixels(box, size):
    width, height = size
    x1, y1, x2, y2 = box
    left, right = sorted((x1 * width, x2 * width))
    top, bottom = sorted((y1 * height, y2 * height))
    return (
        max(0, int(left)),
        max(0, int(top)),
        min(width, int(round(right))),
        min(height, int(round(bottom))),
    )


def op_cutout(image, _):
    return cut(image, "u2net")


def cut_in_box(image, box):
    region = to_pixels(box, image.size)
    if region[2] - region[0] < 8 or region[3] - region[1] < 8:
        return None
    cutout = cut(image.crop(region), "u2net")
    canvas = Image.new("RGBA", image.size, (0, 0, 0, 0))
    canvas.paste(cutout, (region[0], region[1]))
    return canvas


def cut_with_sam(image, boxes, points):
    prompt = []
    for box in boxes:
        x1, y1, x2, y2 = to_pixels(box, image.size)
        prompt.append({"type": "rectangle", "label": 1, "data": [x1, y1, x2, y2]})
    for x, y in points:
        prompt.append(
            {
                "type": "point",
                "label": 1,
                "data": [int(x * image.width), int(y * image.height)],
            }
        )
    return cut(image, "sam", sam_prompt=prompt)


def op_cutout_region(image, spec):
    boxes = spec.get("boxes") or []
    points = spec.get("points") or []
    if not boxes and not points:
        return op_cutout(image, spec)

    if spec.get("precise") or not boxes:
        try:
            return cut_with_sam(image, boxes, points)
        except Exception as err:
            print(f"precise cut unavailable ({err}), using the box", file=sys.stderr)
            if not boxes:
                return op_cutout(image, spec)

    cutout = cut_in_box(image, boxes[0])
    return cutout if cutout is not None else op_cutout(image, spec)


def op_erase(image, spec):
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    for box in spec.get("boxes") or []:
        x1, y1, x2, y2 = to_pixels(box, image.size)
        if x2 <= x1 or y2 <= y1:
            continue
        alpha.paste(0, (x1, y1, x2, y2))
    image.putalpha(alpha)
    return image


def op_crop(image, spec):
    box = spec.get("box")
    if not box:
        return image
    x1, y1, x2, y2 = to_pixels(box, image.size)
    if x2 - x1 < 4 or y2 - y1 < 4:
        return image
    return image.crop((x1, y1, x2, y2))


def op_trim(image, _):
    image = image.convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        return image
    pad = int(max(image.size) * TRIM_PAD)
    return image.crop(
        (
            max(0, bounds[0] - pad),
            max(0, bounds[1] - pad),
            min(image.width, bounds[2] + pad),
            min(image.height, bounds[3] + pad),
        )
    )


def op_rotate(image, spec):
    degrees = float(spec.get("degrees", 0))
    if degrees % 360 == 0:
        return image
    return image.convert("RGBA").rotate(-degrees, expand=True, resample=Image.BICUBIC)


def op_flip(image, spec):
    if spec.get("axis") == "vertical":
        return image.transpose(Image.FLIP_TOP_BOTTOM)
    return image.transpose(Image.FLIP_LEFT_RIGHT)


def op_exposure(image, spec):
    alpha = image.convert("RGBA").getchannel("A")
    rgb = image.convert("RGB")
    for key, enhancer in (
        ("brightness", ImageEnhance.Brightness),
        ("contrast", ImageEnhance.Contrast),
        ("saturation", ImageEnhance.Color),
    ):
        factor = spec.get(key)
        if factor is not None:
            rgb = enhancer(rgb).enhance(float(factor))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def op_white_balance(image, _):
    alpha = image.convert("RGBA").getchannel("A")
    pixels = np.asarray(image.convert("RGB"), dtype=np.float32)
    mask = np.asarray(alpha, dtype=np.float32) > 8
    if mask.sum() < 16:
        return image
    means = pixels[mask].mean(axis=0)
    means[means < 1e-3] = 1e-3
    pixels *= means.mean() / means
    out = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8)).convert("RGBA")
    out.putalpha(alpha)
    return out


def op_sharpen(image, spec):
    amount = float(spec.get("amount", 1.0))
    return image.filter(
        ImageFilter.UnsharpMask(radius=2, percent=int(80 * amount), threshold=3)
    )


def op_background(image, spec):
    colour = spec.get("color") or "#ffffff"
    image = image.convert("RGBA")
    flat = Image.new("RGBA", image.size, colour)
    flat.alpha_composite(image)
    return flat


OPS = {
    "cutout": op_cutout,
    "cutout_region": op_cutout_region,
    "erase": op_erase,
    "crop": op_crop,
    "trim": op_trim,
    "rotate": op_rotate,
    "flip": op_flip,
    "exposure": op_exposure,
    "white_balance": op_white_balance,
    "sharpen": op_sharpen,
    "background": op_background,
}


def main():
    parser = argparse.ArgumentParser(description="Apply retouch ops to one photo.")
    parser.add_argument("source")
    parser.add_argument("target")
    parser.add_argument("--ops", required=True, help="path to a json array of ops")
    args = parser.parse_args()

    try:
        ops = json.loads(open(args.ops, encoding="utf-8").read())
    except (OSError, json.JSONDecodeError) as err:
        fail(f"could not read the ops: {err}")
    if not isinstance(ops, list) or not ops:
        fail("no ops to apply")

    image = Image.open(args.source).convert("RGBA")

    for spec in ops:
        name = spec.get("op")
        handler = OPS.get(name)
        if handler is None:
            fail(f"unknown op: {name}")
        image = handler(image, spec).convert("RGBA")

    if max(image.size) > MAX_DIM:
        scale = MAX_DIM / max(image.size)
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.LANCZOS,
        )

    image.save(args.target, "PNG")
    print(f"SIZE {image.width}x{image.height}", flush=True)


if __name__ == "__main__":
    main()
