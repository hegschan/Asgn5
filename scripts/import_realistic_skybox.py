#!/usr/bin/env python3
"""
Download CC0 photographic sunset HDRI (Poly Haven) and build cubemap faces.
https://polyhaven.com/a/dikhololo_sunset — CC0 license
"""
from __future__ import annotations

import sys
from pathlib import Path
from urllib.request import urlretrieve

import numpy as np
import py360convert
from PIL import Image

SIZE = 2048  # high quality cubemap faces
OUT = Path(__file__).resolve().parent.parent / "textures" / "skybox"

# Tonemapped LDR equirectangular (real photograph-based)
EQUIRECT_URL = (
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/"
    "Tonemapped%20JPG/dikhololo_sunset.jpg"
)

# py360convert dict keys -> Three.js CubeTextureLoader order
FACE_MAP = [
    ("posx.jpg", "R"),  # +X right
    ("negx.jpg", "L"),  # -X left
    ("posy.jpg", "U"),  # +Y top
    ("negy.jpg", "D"),  # -Y bottom
    ("posz.jpg", "F"),  # +Z front
    ("negz.jpg", "B"),  # -Z back
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cache = Path(__file__).parent / "_cache_dikhololo_sunset.jpg"

    if not cache.is_file():
        print("Downloading realistic sunset (Poly Haven CC0)...")
        try:
            urlretrieve(EQUIRECT_URL, cache)
        except Exception:
            import subprocess
            subprocess.run(
                ["curl", "-fsSL", "-o", str(cache), EQUIRECT_URL],
                check=True,
            )
    else:
        print(f"Using cached {cache.name}")

    print(f"Converting equirectangular -> 6 cubemap faces ({SIZE}px)...")
    equi = np.array(Image.open(cache).convert("RGB")) / 255.0
    cube = py360convert.e2c(
        equi,
        face_w=SIZE,
        mode="bilinear",
        cube_format="dict",
    )

    for filename, key in FACE_MAP:
        face = (np.clip(cube[key], 0, 1) * 255).astype(np.uint8)
        path = OUT / filename
        Image.fromarray(face).save(path, "JPEG", quality=95, optimize=True)
        print(f"  {path.name} ({path.stat().st_size // 1024} KB)")

    print("Done — photographic sunset skybox.")


if __name__ == "__main__":
    main()
    sys.exit(0)
