# Skybox (realistic sunset)

Photographic **equirectangular HDRI** converted to a cubemap:

- **Source:** [Dikhololo Sunset](https://polyhaven.com/a/dikhololo_sunset) on [Poly Haven](https://polyhaven.com) (CC0)
- **Regenerate:** `python3 scripts/import_realistic_skybox.py` (requires `py360convert`, `numpy`, `Pillow`)

Face files: `posx`, `negx`, `posy`, `negy`, `posz`, `negz` (Three.js `CubeTextureLoader` order).
