import * as THREE from "three";
import { disposeMaterialTextures } from "./textureUtils";
export function disposeObject3D(object) {
    object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(disposeMaterial);
            }
            else {
                disposeMaterial(child.material);
            }
        }
    });
}
export function disposeMaterial(material) {
    disposeMaterialTextures(material);
    material.dispose();
}
