import * as THREE from "three";

export function createThermalTextureFromCanvas(canvas, options = {}) {
  if (!canvas) {
    return null;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.flipY = options.flipY ?? false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = options.minFilter ?? THREE.LinearFilter;
  texture.magFilter = options.magFilter ?? THREE.LinearFilter;

  const hasUvTransform =
    Number.isFinite(options.offsetX) ||
    Number.isFinite(options.offsetY) ||
    Number.isFinite(options.repeatX) ||
    Number.isFinite(options.repeatY);

  texture.wrapS =
    options.wrapS ?? (hasUvTransform ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping);
  texture.wrapT =
    options.wrapT ?? (hasUvTransform ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping);

  texture.offset.set(
    Number.isFinite(options.offsetX) ? options.offsetX : 0,
    Number.isFinite(options.offsetY) ? options.offsetY : 0,
  );
  texture.repeat.set(
    Number.isFinite(options.repeatX) ? options.repeatX : 1,
    Number.isFinite(options.repeatY) ? options.repeatY : 1,
  );

  return texture;
}
