# Skybox (realistic daytime sky)

Photographic **equirectangular HDRI** converted to a cubemap:

- **Source:** [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) on [Poly Haven](https://polyhaven.com) (CC0)
- **Regenerate:** `python3 scripts/import_realistic_skybox.py` (requires `py360convert`, `numpy`, `Pillow`)

Face files: `posx`, `negx`, `posy`, `negy`, `posz`, `negz` (Three.js `CubeTextureLoader` order).
