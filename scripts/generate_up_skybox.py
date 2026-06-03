#!/usr/bin/env python3
"""Generate Up-inspired cubemap faces (original art, no copyrighted assets)."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
OUT = Path(__file__).resolve().parent.parent / "textures" / "skybox"

# Pixar "Up" adventure sky palette
HORIZON = (255, 198, 140)
HORIZON_GLOW = (255, 228, 185)
MID_SKY = (120, 190, 245)
TOP_SKY = (55, 145, 225)
DEEP_SKY = (30, 105, 200)
CLOUD = (255, 255, 255)
CLOUD_SOFT = (245, 250, 255)
TEPUI = (45, 55, 70)
CANOPY = (35, 75, 45)

random.seed(7)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def sky_column(y: int, height: int, horizon_line: float = 0.42) -> tuple[int, int, int]:
    t = y / height
    if t > horizon_line:
        # Below horizon — warm haze
        u = (t - horizon_line) / (1 - horizon_line)
        return lerp_rgb(HORIZON_GLOW, HORIZON, u**0.6)
    # Above horizon — blue sky
    u = t / horizon_line
    if u > 0.55:
        u2 = (u - 0.55) / 0.45
        return lerp_rgb(MID_SKY, TOP_SKY, u2**0.7)
    u2 = u / 0.55
    return lerp_rgb(HORIZON, MID_SKY, u2**0.85)


def fill_sky_gradient(img: Image.Image, horizon_line: float = 0.42) -> None:
    px = img.load()
    w, h = img.size
    for y in range(h):
        col = sky_column(y, h, horizon_line)
        for x in range(w):
            px[x, y] = col


def add_sun_glow(img: Image.Image, cx: int, cy: int, radius: int = 180) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for r in range(radius, 0, -4):
        alpha = int(90 * (1 - r / radius) ** 2)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 230, 180, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))


def draw_clouds(
    layer: Image.Image,
    count: int,
    y_range: tuple[float, float],
    scale: float = 1.0,
) -> None:
    draw = ImageDraw.Draw(layer)
    w, h = layer.size
    for _ in range(count):
        cx = random.randint(0, w)
        cy = int(lerp(y_range[0], y_range[1], random.random()) * h)
        base = random.randint(int(50 * scale), int(130 * scale))
        puff_count = random.randint(3, 6)
        for p in range(puff_count):
            r = base + random.randint(-20, 30)
            ox = random.randint(-base, base)
            oy = random.randint(-base // 2, base // 3)
            bbox = (cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r)
            draw.ellipse(bbox, fill=CLOUD + (255,))
        # soft shadow under cloud
        sh = base // 3
        draw.ellipse(
            (cx - base, cy + base // 3, cx + base, cy + base // 3 + sh),
            fill=CLOUD_SOFT + (120,),
        )


def composite_clouds(base: Image.Image, cloud_layer: Image.Image) -> Image.Image:
    blurred = cloud_layer.filter(ImageFilter.GaussianBlur(radius=6))
    return Image.alpha_composite(base.convert("RGBA"), blurred).convert("RGB")


def draw_tepui_silhouette(img: Image.Image, side: str) -> None:
    """Distant flat-top mesas on the horizon (Paradise Falls vibe)."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    base_y = int(h * 0.72)
    random.seed({"posx": 1, "negx": 2, "posz": 3, "negz": 4}[side])
    mesas = random.randint(2, 4)
    x = -80
    for i in range(mesas):
        mw = random.randint(140, 280)
        mh = random.randint(60, 140)
        flat = random.randint(15, 35)
        points = [
            (x, base_y),
            (x, base_y - mh),
            (x + flat, base_y - mh - flat),
            (x + mw - flat, base_y - mh - flat),
            (x + mw, base_y - mh),
            (x + mw, base_y),
        ]
        shade = lerp_rgb(TEPUI, (25, 35, 50), i / max(mesas, 1))
        draw.polygon(points, fill=shade)
        x += mw + random.randint(40, 100)


def make_side_face(side: str) -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE))
    fill_sky_gradient(img, horizon_line=0.38 if side in ("posz", "negz") else 0.4)
    add_sun_glow(img, int(SIZE * 0.75), int(SIZE * 0.48), 220)

    clouds = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_clouds(clouds, 14, (0.05, 0.55), 1.1)
    draw_clouds(clouds, 8, (0.15, 0.45), 0.75)
    img = composite_clouds(img, clouds)

    draw_tepui_silhouette(img, side)
    return img


def make_top_face() -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE))
    px = img.load()
    cx, cy = SIZE // 2, SIZE // 2
    max_r = SIZE * 0.72
    for y in range(SIZE):
        for x in range(SIZE):
            d = math.hypot(x - cx, y - cy) / max_r
            d = min(1.0, d)
            col = lerp_rgb(DEEP_SKY, TOP_SKY, d**0.5)
            px[x, y] = col

    clouds = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_clouds(clouds, 18, (0.0, 1.0), 1.3)
    return composite_clouds(img, clouds)


def make_bottom_face() -> Image.Image:
    """Jungle canopy far below — view from floating house."""
    img = Image.new("RGB", (SIZE, SIZE))
    fill_sky_gradient(img, horizon_line=0.15)
    draw = ImageDraw.Draw(img)
    for y in range(int(SIZE * 0.35), SIZE):
        t = max(0.0, (y - SIZE * 0.35) / (SIZE * 0.65))
        col = lerp_rgb(CANOPY, (20, 45, 30), math.sqrt(t))
        draw.line([(0, y), (SIZE, y)], fill=col)
    # soft tree bumps
    random.seed(99)
    for _ in range(120):
        tx = random.randint(0, SIZE)
        ty = random.randint(int(SIZE * 0.5), SIZE - 10)
        r = random.randint(8, 35)
        c = lerp_rgb((50, 110, 55), (25, 60, 35), random.random())
        draw.ellipse((tx - r, ty - r // 2, tx + r, ty + r // 2), fill=c)
    return img.filter(ImageFilter.GaussianBlur(radius=2))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    faces = {
        "posx.jpg": make_side_face("posx"),
        "negx.jpg": make_side_face("negx"),
        "posz.jpg": make_side_face("posz"),
        "negz.jpg": make_side_face("negz"),
        "posy.jpg": make_top_face(),
        "negy.jpg": make_bottom_face(),
    }
    for name, im in faces.items():
        path = OUT / name
        im.save(path, "JPEG", quality=92, optimize=True)
        print(f"Wrote {path} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
