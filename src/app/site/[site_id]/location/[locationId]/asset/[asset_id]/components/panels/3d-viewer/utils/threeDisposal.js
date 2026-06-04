import * as THREE from "three";
import { disposeMaterialTextures } from "./textureUtils";

export function disposeObject3D(object) {
  object.traverse((child) => {
    if (child.geometry?.dispose) {
      child.geometry.dispose();
    }

    if (!child.material) {
      return;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach(disposeMaterial);
  });
}

export function disposeMaterial(material) {
  if (!(material instanceof THREE.Material)) {
    return;
  }

  disposeMaterialTextures(material);
  material.dispose();
}
