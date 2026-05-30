import sys
from rembg import remove, new_session
from PIL import Image
import numpy as np
from scipy import ndimage
import io

session = new_session("u2net")

def keep_largest(img):
    a = np.array(img)
    alpha = a[:, :, 3] > 30
    labeled, n = ndimage.label(alpha)
    if n <= 1:
        return img
    sizes = ndimage.sum(alpha, labeled, range(1, n + 1))
    keep = np.argmax(sizes) + 1
    mask = labeled == keep
    a[:, :, 3] = np.where(mask, a[:, :, 3], 0)
    return Image.fromarray(a)

def process(src, dst):
    with open(src, "rb") as f:
        data = f.read()
    out = remove(data, session=session)
    img = Image.open(io.BytesIO(out)).convert("RGBA")
    img = keep_largest(img)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(dst)
    print(f"{src} -> {dst}  ({img.width}x{img.height})")

if __name__ == "__main__":
    for pair in sys.argv[1:]:
        src, dst = pair.split("::")
        process(src, dst)
