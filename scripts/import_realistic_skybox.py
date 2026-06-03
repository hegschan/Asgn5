#!/usr/bin/env python3
"""
Build a seamless realistic sky skybox from a Poly Haven pure-sky HDRI (CC0).

Uses:
  1. overcast_soil_puresky — even blue/gray sky, minimal horizon artifacts
  2. High-res cubemap faces + edge resampling from the equirect source (seam fix)
  3. sky_equirect.jpg for Three.js EquirectangularReflectionMapping (no visible cube edges)

https://polyhaven.com/a/overcast_soil_puresky
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
import py360convert
from PIL import Image
from scipy.ndimage import map_coordinates

SIZE = 2048
EDGE_BLEND = 20
OUT = Path(__file__).resolve().parent.parent / "textures" / "skybox"
EQUIRECT_URL = (
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/"
    "Tonemapped%20JPG/overcast_soil_puresky.jpg"
)
CACHE = Path(__file__).parent / "_cache_overcast_puresky.jpg"
EQUI_OUT = OUT / "sky_equirect.jpg"

FACE_MAP = [
    ("posx.jpg", "R"),
    ("negx.jpg", "L"),
    ("posy.jpg", "U"),
    ("negy.jpg", "D"),
    ("posz.jpg", "F"),
    ("negz.jpg", "B"),
]

# Unit direction for each face pixel (matches py360convert / OpenGL cubemap)
def face_uv_to_dir(face: str, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """u, v in [-1, 1], y up."""
    if face == "F":
        d = np.stack([u, -v, np.ones_like(u)], axis=-1)
    elif face == "B":
        d = np.stack([-u, -v, -np.ones_like(u)], axis=-1)
    elif face == "R":
        d = np.stack([np.ones_like(u), -v, -u], axis=-1)
    elif face == "L":
        d = np.stack([-np.ones_like(u), -v, u], axis=-1)
    elif face == "U":
        d = np.stack([u, np.ones_like(u), v], axis=-1)
    else:  # D
        d = np.stack([u, -np.ones_like(u), -v], axis=-1)
    n = np.linalg.norm(d, axis=-1, keepdims=True)
    return d / np.maximum(n, 1e-8)


def dir_to_equi_uv(d: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    x, y, z = d[..., 0], d[..., 1], d[..., 2]
    lon = np.arctan2(x, z)
    lat = np.arcsin(np.clip(y, -1.0, 1.0))
    eu = lon / (2 * np.pi) + 0.5
    ev = 0.5 - lat / np.pi
    return eu, ev


def sample_equi(equi: np.ndarray, eu: np.ndarray, ev: np.ndarray) -> np.ndarray:
    h, w = equi.shape[:2]
    px = eu * w - 0.5
    py = ev * h - 0.5
    coords = np.array([py, px])
    out = np.zeros(eu.shape + (3,), dtype=np.float32)
    for c in range(3):
        out[..., c] = map_coordinates(
            equi[..., c], coords, order=1, mode="wrap", prefilter=False
        )
    return out


def resample_face_edges(equi: np.ndarray, face: np.ndarray, key: str, margin: int) -> np.ndarray:
    """Re-sample edge texels from equirect so adjacent cube faces match."""
    h, w = face.shape[:2]
    out = face.copy()
    u1d = np.linspace(-1, 1, w, dtype=np.float32)
    v1d = np.linspace(-1, 1, h, dtype=np.float32)

    # Top / bottom rows (v varies along rows in image; u along width)
    for i in range(margin):
        alpha = (margin - i) / margin
        v_top = 1.0 - (i + 0.5) / margin * 0.02
        u_grid, v_grid = np.meshgrid(u1d, np.array([v_top]))
        d = face_uv_to_dir(key, u_grid, v_grid)
        eu, ev = dir_to_equi_uv(d)
        sampled = sample_equi(equi, eu, ev)[0]
        out[i, :, :] = out[i, :, :] * (1 - alpha) + sampled * alpha

    for i in range(margin):
        alpha = (margin - i) / margin
        v_bot = -1.0 + (i + 0.5) / margin * 0.02
        u_grid, v_grid = np.meshgrid(u1d, np.array([v_bot]))
        d = face_uv_to_dir(key, u_grid, v_grid)
        eu, ev = dir_to_equi_uv(d)
        sampled = sample_equi(equi, eu, ev)[0]
        out[-(i + 1), :, :] = out[-(i + 1), :, :] * (1 - alpha) + sampled * alpha

    for j in range(margin):
        alpha = (margin - j) / margin
        u_left = -1.0 + (j + 0.5) / margin * 0.02
        u_grid, v_grid = np.meshgrid(np.array([u_left]), v1d)
        d = face_uv_to_dir(key, u_grid, v_grid)
        eu, ev = dir_to_equi_uv(d)
        sampled = sample_equi(equi, eu, ev)[:, 0]
        out[:, j, :] = out[:, j, :] * (1 - alpha) + sampled * alpha

    for j in range(margin):
        alpha = (margin - j) / margin
        u_right = 1.0 - (j + 0.5) / margin * 0.02
        u_grid, v_grid = np.meshgrid(np.array([u_right]), v1d)
        d = face_uv_to_dir(key, u_grid, v_grid)
        eu, ev = dir_to_equi_uv(d)
        sampled = sample_equi(equi, eu, ev)[:, 0]
        out[:, -(j + 1), :] = out[:, -(j + 1), :] * (1 - alpha) + sampled * alpha

    return out


def download() -> None:
    if CACHE.is_file():
        print(f"Using cached {CACHE.name}")
        return
    print("Downloading overcast_soil_puresky (Poly Haven CC0)...")
    subprocess.run(["curl", "-fsSL", "-o", str(CACHE), EQUIRECT_URL], check=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    download()

    equi_img = Image.open(CACHE).convert("RGB")
    equi_img.save(EQUI_OUT, "JPEG", quality=95, optimize=True)
    print(f"Saved {EQUI_OUT.name}")

    equi = np.array(equi_img, dtype=np.float32) / 255.0
    print(f"Building cubemap faces at {SIZE}px...")
    cube = py360convert.e2c(equi, face_w=SIZE, mode="bilinear", cube_format="dict")

    if EDGE_BLEND > 0:
        print(f"Refining face edges ({EDGE_BLEND}px blend from equirect)...")
    for filename, key in FACE_MAP:
        face = cube[key].astype(np.float32)
        if EDGE_BLEND > 0:
            face = resample_face_edges(equi, face, key, EDGE_BLEND)
        face = (np.clip(face, 0, 1) * 255).astype(np.uint8)
        path = OUT / filename
        Image.fromarray(face).save(path, "JPEG", quality=96, optimize=True)
        print(f"  {filename} ({path.stat().st_size // 1024} KB)")

    print("Done. Use sky_equirect.jpg in Three.js for seamless sky (recommended).")


if __name__ == "__main__":
    main()
