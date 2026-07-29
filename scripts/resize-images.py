#!/usr/bin/env python3
"""Generate small, sharp derivatives of the before/after images.

One-off maintenance tool, not part of the site build. Run it when a
before/after image is added or replaced, then commit the output.

    pip install pillow
    python3 scripts/resize-images.py

Why this exists
---------------
The before/after images are 1288-1600px wide but render at roughly 115-165
CSS px, so the browser downscales them by a factor of ~10. For the photos
that is merely wasteful. For the line art it destroys the image: 1px black
strokes average into the white background until nothing is left. Measured on
after-family.webp, the darkest pixel in the browser-scaled result was 110/255
- mid grey - where the source had true black.

Photos are simply resized. Line art is thickened with a minimum filter before
downscaling, so strokes survive at the smaller size, then re-normalised to
recover full black. Emitting the derivatives here rather than at build time
keeps the site's dependencies unchanged.
"""

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

IMAGES = Path(__file__).resolve().parent.parent / "public" / "images"

# Rendered width is ~115-165 CSS px in both BeforeAfterSection and
# BeforeAfterStrip; these cover 1x through 3x displays.
WIDTHS = (240, 360, 480)

PHOTOS = ["before-family", "before-pet", "before-vacation"]
LINE_ART = ["after-family", "after-pet", "after-vacation"]


def resize_photo(im: Image.Image, target_w: int) -> Image.Image:
    target_h = round(im.height * target_w / im.width)
    return im.convert("RGB").resize((target_w, target_h), Image.LANCZOS)


def resize_line_art(im: Image.Image, target_w: int) -> Image.Image:
    """Downscale line art without washing the strokes out to grey."""
    target_h = round(im.height * target_w / im.width)
    scale = im.width / target_w
    g = im.convert("L")
    if scale >= 2:
        # Dilate the dark strokes so they still cover a pixel once shrunk.
        radius = max(1, round(scale / 3))
        g = g.filter(ImageFilter.MinFilter(2 * radius + 1))
    out = g.resize((target_w, target_h), Image.LANCZOS)
    # Downscaling lifts the blacks; pull the histogram back to full range.
    return ImageOps.autocontrast(out, cutoff=(0, 1)).convert("RGB")


def main() -> None:
    for name in PHOTOS + LINE_ART:
        src = IMAGES / f"{name}.webp"
        if not src.exists():
            raise SystemExit(f"missing source image: {src}")
        im = Image.open(src)
        is_line_art = name in LINE_ART
        for width in WIDTHS:
            if width >= im.width:
                continue
            out = resize_line_art(im, width) if is_line_art else resize_photo(im, width)
            dest = IMAGES / f"{name}-{width}.webp"
            # Line art needs the higher quality; flat white areas next to hard
            # edges are exactly where webp ringing shows up.
            out.save(dest, "WEBP", quality=88 if is_line_art else 82, method=6)
            print(f"  {dest.name:28} {out.width:>4} x {out.height:<4} "
                  f"{dest.stat().st_size // 1024:>4} KB")


if __name__ == "__main__":
    main()
