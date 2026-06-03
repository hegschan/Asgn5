#!/usr/bin/env python3
"""Generate realistic sunset cubemap faces (original procedural art)."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
OUT = Path(__file__).resolve().parent.parent / "textures" / "skybox"

# Realistic sunset palette
HORIZON_DEEP = (255, 120, 60)
HORIZON_MID = (255, 165, 85)
HORIZON_GLOW = (255, 210, 140)
SKY_LOW = (255, 140, 100)
SKY_MID = (200, 120, 160)
SKY_HIGH = (90, 80, 150)
ZENITH = (35, 45, 95)
SUN_CORE = (255, 245, 210)
SUN_HALO = (255, 190, 100)
CLOUD_LIT = (255, 200, 170)
CLOUD_SHADOW = (140, 90, 120)
CLOUD_DARK = (70, 55, 90)

random.seed(24)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def multi_lerp(colors: list[tuple[int, int, int]], t: float) -> tuple[int, int, int]:
    if t <= 0:
        return colors[0]
    if t >= 1:
        return colors[-1]
    seg = 1.0 / (len(colors) - 1)
    i = min(int(t / seg), len(colors) - 2)
    local = (t - i * seg) / seg
    return lerp_rgb(colors[i], colors[i + 1], local)


def sunset_sky_color(t: float) -> tuple[int, int, int]:
    """t=0 bottom horizon, t=1 top zenith."""
    return multi_lerp(
        [HORIZON_DEEP, HORIZON_MID, HORIZON_GLOW, SKY_LOW, SKY_MID, SKY_HIGH, ZENITH],
        t**0.92,
    )


def fill_sunset_gradient(img: Image.Image, horizon: float = 0.38, flip: bool = False) -> None:
    px = img.load()
    w, h = img.size
    for y in range(h):
        t = y / h
        if flip:
            t = 1.0 - t
        # remap so horizon sits lower on side faces
        t = max(0.0, min(1.0, (t - (1 - horizon)) / horizon if t > (1 - horizon) else t / (1 - horizon) * 0.15))
        col = sunset_sky_color(1.0 - t)
        for x in range(w):
            px[x, y] = col


def fill_sunset_gradient_simple(img: Image.Image) -> None:
    px = img.load()
    w, h = img.size
    for y in range(h):
        t = 1.0 - y / h
        col = sunset_sky_color(t)
        for x in range(w):
            px[x, y] = col


def add_sun(img: Image.Image, cx: int, cy: int, core_r: int = 55, halo_r: int = 280) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for r in range(halo_r, 0, -3):
        t = r / halo_r
        alpha = int(130 * (1 - t) ** 1.8)
        c = lerp_rgb(SUN_HALO, HORIZON_GLOW, t * 0.5)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*c, alpha))
    draw.ellipse(
        (cx - core_r, cy - core_r, cx + core_r, cy + core_r),
        fill=(*SUN_CORE, 255),
    )
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))


def draw_clouds(layer: Image.Image, count: int, y_range: tuple[float, float], scale: float = 1.0) -> None:
    draw = ImageDraw.Draw(layer)
    w, h = layer.size
    for _ in range(count):
        cx = random.randint(-50, w + 50)
        cy = int(lerp(y_range[0], y_range[1], random.random()) * h)
        base = int(random.randint(40, 110) * scale)
        for p in range(random.randint(4, 7)):
            r = base + random.randint(-15, 25)
            ox = random.randint(-base, base)
            oy = random.randint(-base // 2, base // 4)
            lit = lerp_rgb(CLOUD_LIT, CLOUD_SHADOW, random.uniform(0.1, 0.55))
            draw.ellipse(
                (cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r),
                fill=lit + (220,),
            )
        # underside shadow
        draw.ellipse(
            (cx - base, cy + base // 4, cx + base, cy + base // 2),
            fill=CLOUD_DARK + (90,),
        )


def composite_clouds(base: Image.Image, cloud_layer: Image.Image, blur: int = 5) -> Image.Image:
    blurred = cloud_layer.filter(ImageFilter.GaussianBlur(radius=blur))
    return Image.alpha_composite(base.convert("RGBA"), blurred).convert("RGB")


def add_haze_band(img: Image.Image, y_center: float, strength: float = 0.35) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    h = img.size[1]
    cy = int(y_center * h)
    band = int(h * 0.22)
    for i in range(band):
        alpha = int(255 * strength * (1 - abs(i - band / 2) / (band / 2)))
        y = cy - band // 2 + i
        if 0 <= y < h:
            draw.line([(0, y), (img.size[0], y)], fill=(*HORIZON_GLOW, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))


def make_side_face(sun_x: float, sun_y: float) -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE))
    fill_sunset_gradient_simple(img)
    sx, sy = int(SIZE * sun_x), int(SIZE * sun_y)
    add_sun(img, sx, sy, core_r=50, halo_r=300)
    add_haze_band(img, sun_y + 0.06, 0.28)

    clouds = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_clouds(clouds, 12, (0.25, 0.72), 1.0)
    draw_clouds(clouds, 6, (0.35, 0.58), 0.65)
    img = composite_clouds(img, clouds, blur=6)
    return img


def make_top_face() -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE))
    px = img.load()
    cx, cy = SIZE // 2, SIZE // 2
    max_r = SIZE * 0.75
    for y in range(SIZE):
        for x in range(SIZE):
            d = min(1.0, math.hypot(x - cx, y - cy) / max_r)
            col = multi_lerp([SKY_HIGH, ZENITH, (20, 30, 70)], d**0.7)
            px[x, y] = col

    clouds = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_clouds(clouds, 10, (0.3, 0.9), 0.9)
    return composite_clouds(img, clouds, blur=8)


def make_bottom_face() -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE))
    fill_sunset_gradient_simple(img)
    draw = ImageDraw.Draw(img)
    # darkened earth silhouette at bottom
    for y in range(int(SIZE * 0.55), SIZE):
        t = max(0.0, (y - SIZE * 0.55) / (SIZE * 0.45))
        col = lerp_rgb((40, 30, 45), (15, 12, 20), math.sqrt(t))
        draw.line([(0, y), (SIZE, y)], fill=col)
    return img.filter(ImageFilter.GaussianBlur(radius=3))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    faces = {
        "posx.jpg": make_side_face(0.82, 0.58),
        "negx.jpg": make_side_face(0.18, 0.55),
        "posz.jpg": make_side_face(0.5, 0.52),
        "negz.jpg": make_side_face(0.5, 0.62),
        "posy.jpg": make_top_face(),
        "negy.jpg": make_bottom_face(),
    }
    for name, im in faces.items():
        path = OUT / name
        im.save(path, "JPEG", quality=93, optimize=True)
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
