#!/usr/bin/env python3
"""Generate seamless waterfall texture; cliff uses Poly Haven photo (see download_cliff)."""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "textures"
CLIFF_URL = (
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/"
    "cliff_side/cliff_side_diff_2k.jpg"
)


def seamless_noise(x: np.ndarray, y: np.ndarray, seed: float = 0.0) -> np.ndarray:
    return (
        np.sin(x * 6.283 + seed) * 0.5
        + np.sin(y * 6.283 + seed * 1.7) * 0.5
        + np.sin((x * 2 + y * 3) * 6.283 + seed * 2.3) * 0.35
        + np.sin((x * 5 - y * 2) * 6.283 + seed * 0.9) * 0.25
    ) / 1.6 + 0.5


def generate_waterfall(w: int = 512, h: int = 1024) -> Image.Image:
    xs = np.linspace(0, 1, w, dtype=np.float32)
    ys = np.linspace(0, 1, h, dtype=np.float32)
    x, y = np.meshgrid(xs, ys)

    base_r = 35 + 25 * np.sin(y * math.pi * 2) ** 2
    base_g = 95 + 45 * seamless_noise(x, y, 1.2)
    base_b = 155 + 55 * seamless_noise(x * 1.3, y * 0.8, 2.1)

    streaks = np.zeros_like(x)
    for i in range(14):
        cx = (i + 0.5) / 14 + 0.02 * math.sin(i * 2.1)
        width = 0.018 + (i % 3) * 0.006
        wave = 0.012 * np.sin(y * math.pi * 2 * (3 + i % 4) + i)
        dist = np.abs(x - cx - wave)
        streak = np.exp(-(dist / width) ** 2)
        phase = (y * (8 + i % 5) + i * 0.37) % 1.0
        pulse = 0.55 + 0.45 * np.sin(phase * math.pi * 2) ** 2
        streaks += streak * pulse * (0.35 + (i % 4) * 0.08)

    streaks = np.clip(streaks, 0, 1.5)
    foam = seamless_noise(x * 4, y * 12, 3.5) ** 2 * 0.35
    mist = seamless_noise(x * 8, y * 20, 5.1) * 0.12

    r = np.clip(base_r + streaks * 170 + foam * 80 + mist * 40, 0, 255)
    g = np.clip(base_g + streaks * 185 + foam * 90 + mist * 50, 0, 255)
    b = np.clip(base_b + streaks * 200 + foam * 100 + mist * 60, 0, 255)

    rgb = np.stack([r, g, b], axis=-1).astype(np.uint8)
    return Image.fromarray(rgb, mode="RGB").filter(ImageFilter.GaussianBlur(radius=0.6))


def download_cliff() -> Path:
    path = OUT / "cliff_rock.jpg"
    print("Downloading cliff_side (Poly Haven CC0)...")
    subprocess.run(["curl", "-fsSL", "-o", str(path), CLIFF_URL], check=True)
    return path


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    wf = OUT / "waterfall.jpg"
    generate_waterfall().save(wf, "JPEG", quality=94, optimize=True)
    print(f"Wrote {wf} ({wf.stat().st_size // 1024} KB)")
    cliff = download_cliff()
    print(f"Wrote {cliff} ({cliff.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
