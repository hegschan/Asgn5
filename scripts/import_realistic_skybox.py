#!/usr/bin/env python3
"""
Download CC0 photographic sky HDRI (Poly Haven) and build cubemap faces.
Default: kloofendal_48d_partly_cloudy_puresky — realistic blue sky with clouds
https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky — CC0
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from urllib.request import urlretrieve

import numpy as np
import py360convert
from PIL import Image

SIZE = 2048
OUT = Path(__file__).resolve().parent.parent / "textures" / "skybox"

# Realistic daytime sky (minimal ground, mostly clouds + blue sky)
EQUIRECT_URL = (
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/"
    "Tonemapped%20JPG/kloofendal_48d_partly_cloudy_puresky.jpg"
)
CACHE_NAME = "_cache_kloofendal_sky.jpg"
ASSET_LABEL = "kloofendal_48d_partly_cloudy_puresky"

FACE_MAP = [
    ("posx.jpg", "R"),
    ("negx.jpg", "L"),
    ("posy.jpg", "U"),
    ("negy.jpg", "D"),
    ("posz.jpg", "F"),
    ("negz.jpg", "B"),
]


def download(cache: Path) -> None:
    if cache.is_file():
        print(f"Using cached {cache.name}")
        return
    print(f"Downloading realistic sky: {ASSET_LABEL} (Poly Haven CC0)...")
    try:
        urlretrieve(EQUIRECT_URL, cache)
    except Exception:
        subprocess.run(["curl", "-fsSL", "-o", str(cache), EQUIRECT_URL], check=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cache = Path(__file__).parent / CACHE_NAME
    download(cache)

    print(f"Converting equirectangular -> 6 cubemap faces ({SIZE}px)...")
    equi = np.array(Image.open(cache).convert("RGB")) / 255.0
    cube = py360convert.e2c(equi, face_w=SIZE, mode="bilinear", cube_format="dict")

    for filename, key in FACE_MAP:
        face = (np.clip(cube[key], 0, 1) * 255).astype(np.uint8)
        path = OUT / filename
        Image.fromarray(face).save(path, "JPEG", quality=95, optimize=True)
        print(f"  {path.name} ({path.stat().st_size // 1024} KB)")

    print("Done — photographic daytime sky skybox.")


if __name__ == "__main__":
    main()
    sys.exit(0)
