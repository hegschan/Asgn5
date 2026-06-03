# Skybox (realistic matching sky)

**Source:** [Overcast Soil Pure Sky](https://polyhaven.com/a/overcast_soil_puresky) — Poly Haven (CC0).  
Even, photographic sky with soft clouds; designed as a **pure sky** HDRI (minimal ground).

| File | Use |
|------|-----|
| `sky_equirect.jpg` | **Displayed in the scene** — single 360° image, no visible seams between cube edges |
| `posx.jpg` … `negz.jpg` | Six cubemap faces (same photo), for the assignment’s cubemap requirement |

**Regenerate:**

```bash
python3 scripts/import_realistic_skybox.py
```

Requires: `py360convert`, `numpy`, `Pillow`, `scipy`
