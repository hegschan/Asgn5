#!/usr/bin/env python3
"""Generate Spirit of Adventure-inspired blimp (OBJ + MTL + textures)."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "models"
TEX = ROOT / "textures"


def write_texture(path: Path, base_rgb: tuple[int, int, int], variation: float = 0.06) -> None:
    rng = np.random.default_rng(42)
    img = np.zeros((256, 256, 3), dtype=np.uint8)
    for c in range(3):
        noise = rng.random((256, 256)) * 255 * variation
        img[:, :, c] = np.clip(base_rgb[c] + noise - 255 * variation / 2, 0, 255)
    Image.fromarray(img, "RGB").filter(ImageFilter.GaussianBlur(radius=1.2)).save(
        path, "JPEG", quality=92
    )


def ellipsoid_mesh(
    a: float, b: float, c: float, nu: int = 32, nv: int = 20
) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]]]:
    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []
    for i in range(nv + 1):
        v = i / nv
        phi = v * math.pi
        for j in range(nu):
            u = j / nu
            theta = u * math.pi * 2
            x = a * math.sin(phi) * math.cos(theta)
            y = b * math.cos(phi)
            z = c * math.sin(phi) * math.sin(theta)
            verts.append((x, y, z))
    for i in range(nv):
        for j in range(nu):
            jn = (j + 1) % nu
            a0 = i * nu + j
            a1 = a0 + 1 if j < nu - 1 else i * nu
            b0 = (i + 1) * nu + j
            b1 = b0 + 1 if j < nu - 1 else (i + 1) * nu
            if i != 0:
                faces.append((a0 + 1, b0 + 1, a1 + 1))
            if i != nv - 1:
                faces.append((a1 + 1, b1 + 1, b0 + 1))
    return verts, faces


def box_mesh(
    sx: float, sy: float, sz: float, cx: float, cy: float, cz: float
) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]]]:
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    corners = [
        (-hx, -hy, -hz),
        (hx, -hy, -hz),
        (hx, hy, -hz),
        (-hx, hy, -hz),
        (-hx, -hy, hz),
        (hx, -hy, hz),
        (hx, hy, hz),
        (-hx, hy, hz),
    ]
    verts = [(cx + x, cy + y, cz + z) for x, y, z in corners]
    faces = [
        (1, 2, 3),
        (1, 3, 4),
        (5, 6, 7),
        (5, 7, 8),
        (1, 5, 8),
        (1, 8, 4),
        (2, 6, 7),
        (2, 7, 3),
        (4, 3, 7),
        (4, 7, 8),
        (1, 2, 6),
        (1, 6, 5),
    ]
    return verts, faces


def fin_mesh(
    length: float,
    height: float,
    thickness: float,
    cx: float,
    cy: float,
    cz: float,
    rot_y: float = 0,
) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]]]:
    v, f = box_mesh(length, height, thickness, 0, 0, 0)
    out_v = []
    for x, y, z in v:
        xr = x * math.cos(rot_y) - z * math.sin(rot_y)
        zr = x * math.sin(rot_y) + z * math.cos(rot_y)
        out_v.append((xr + cx, y + cy, zr + cz))
    return out_v, f


def merge_meshes(
    parts: list[tuple[list, list, str]],
) -> tuple[list, list, list[str]]:
    verts: list = []
    faces: list = []
    groups: list[str] = []
    offset = 0
    for pv, pf, name in parts:
        verts.extend(pv)
        for a, b, c in pf:
            faces.append((a + offset, b + offset, c + offset))
        groups.append(f"g {name}")
        groups.append(f"usemtl {name}")
        for tri in pf:
            groups.append(f"f {tri[0]+offset} {tri[1]+offset} {tri[2]+offset}")
        offset += len(pv)
    return verts, faces, groups


def main() -> None:
    MODELS.mkdir(parents=True, exist_ok=True)
    TEX.mkdir(parents=True, exist_ok=True)

    write_texture(TEX / "blimp_hull.jpg", (188, 192, 198), 0.05)
    write_texture(TEX / "blimp_fin.jpg", (165, 170, 178), 0.04)
    write_texture(TEX / "blimp_gondola.jpg", (72, 58, 48), 0.06)
    write_texture(TEX / "blimp_detail.jpg", (120, 125, 135), 0.05)

    parts: list[tuple[list, list, str]] = []

    # Main envelope (elongated along Z — forward axis)
    hull_v, hull_f = ellipsoid_mesh(1.35, 1.05, 5.2, nu=36, nv=22)
    parts.append((hull_v, hull_f, "hull"))

    # Nose cone (Spirit of Adventure jaw hint)
    nose_v, nose_f = ellipsoid_mesh(0.95, 0.85, 1.1, nu=24, nv=14)
    nose_v = [(x, y, z + 5.8) for x, y, z in nose_v]
    parts.append((nose_v, nose_f, "hull"))

    # Dorsal fin
    parts.append((*fin_mesh(0.12, 0.9, 1.4, 0, 1.15, -1.2, 0), "fin"))

    # Tail fins (3)
    for angle in (-0.45, 0.0, 0.45):
        parts.append((*fin_mesh(1.1, 1.5, 0.1, 0, 0.35, -5.0, angle), "fin"))

    # Lower tail plane
    parts.append((*fin_mesh(1.8, 0.08, 0.9, 0, -0.2, -5.1, 0), "fin"))

    # Gondola / control car
    parts.append((*box_mesh(1.5, 0.85, 2.4, 0, -1.55, 0.3), "gondola"))

    # Gondola side windows (dark bands)
    parts.append((*box_mesh(1.52, 0.25, 0.08, 0, -1.35, 1.35), "gondola"))
    parts.append((*box_mesh(1.52, 0.25, 0.08, 0, -1.35, -0.75), "gondola"))

    # Engine nacelles (both sides)
    for side in (-1, 1):
        parts.append((*box_mesh(0.45, 0.45, 1.2, side * 1.55, -1.25, 0.8), "detail"))
        parts.append((*fin_mesh(0.5, 0.06, 0.35, side * 1.55, -1.25, 1.55, 0), "detail"))

    # Propeller rings
    for side in (-1, 1):
        nv, nf = ellipsoid_mesh(0.22, 0.22, 0.08, nu=16, nv=10)
        nv = [(x + side * 1.55, y - 1.25, z + 1.85) for x, y, z in nv]
        parts.append((nv, nf, "detail"))

    all_v: list = []
    all_f: list = []
    mtl_groups: list[str] = []
    voff = 0
    obj_lines = ["# Spirit of Adventure style blimp", "o SpiritBlimp"]

    mat_for = {
        "hull": "hull",
        "fin": "fin",
        "detail": "detail",
    }

    for pv, pf, name in parts:
        mtl = mat_for.get(name, "gondola")
        obj_lines.append(f"g {name}")
        obj_lines.append(f"usemtl {mtl}")
        for x, y, z in pv:
            obj_lines.append(f"v {x:.5f} {y:.5f} {z:.5f}")
            all_v.append((x, y, z))
        for a, b, c in pf:
            obj_lines.append(f"f {a + voff} {b + voff} {c + voff}")
            all_f.append((a + voff, b + voff, c + voff))
        voff += len(pv)

    mtl_path = MODELS / "SpiritBlimp.mtl"
    obj_path = MODELS / "SpiritBlimp.obj"
    mtl_path.write_text(
        "\n".join(
            [
                "# Spirit of Adventure inspired blimp materials",
                "newmtl hull",
                "Ns 40.0",
                "Ka 0.4 0.4 0.42",
                "Kd 0.74 0.76 0.78",
                "Ks 0.35 0.35 0.38",
                "map_Kd ../textures/blimp_hull.jpg",
                "",
                "newmtl fin",
                "Ns 30.0",
                "Ka 0.35 0.35 0.38",
                "Kd 0.65 0.67 0.70",
                "Ks 0.2 0.2 0.22",
                "map_Kd ../textures/blimp_fin.jpg",
                "",
                "newmtl gondola",
                "Ns 25.0",
                "Ka 0.2 0.15 0.12",
                "Kd 0.28 0.22 0.18",
                "Ks 0.1 0.1 0.1",
                "map_Kd ../textures/blimp_gondola.jpg",
                "",
                "newmtl detail",
                "Ns 50.0",
                "Ka 0.3 0.3 0.32",
                "Kd 0.5 0.52 0.55",
                "Ks 0.45 0.45 0.48",
                "map_Kd ../textures/blimp_detail.jpg",
                "",
            ]
        ),
        encoding="utf-8",
    )
    obj_path.write_text("\n".join(obj_lines) + "\n", encoding="utf-8")
    print(f"Wrote {obj_path}")
    print(f"Wrote {mtl_path}")
    print(f"Vertices: {len(all_v)}, faces: {len(all_f)}")


if __name__ == "__main__":
    main()
