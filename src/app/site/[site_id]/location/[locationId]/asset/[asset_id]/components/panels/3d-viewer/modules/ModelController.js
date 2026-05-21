import * as THREE from "three";
import { vector3ToThree } from "../utils/geometryUtils";
export class ModelController {
    static applyConfig(model, config) {
        model.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) {
                return;
            }
            object.castShadow = config.castShadow ?? false;
            object.receiveShadow = config.receiveShadow ?? false;
            if (Array.isArray(object.material)) {
                object.material.forEach((material) => this.applyMaterialConfig(material, config));
                return;
            }
            this.applyMaterialConfig(object.material, config);
        });
        model.scale.setScalar(config.scale);
        this.applyRotation(model, config);
    }
    static applyMaterialConfig(material, config) {
        if (!(material instanceof THREE.MeshStandardMaterial)) {
            return;
        }
        const textureBlend = config.textureBlend ?? 1;
        const baseMap = material.userData.baseMap ?? material.map;
        if (baseMap && !material.userData.baseMap) {
            material.userData.baseMap = baseMap;
        }
        material.color.set(config.color).lerp(new THREE.Color("#ffffff"), textureBlend);
        material.map = baseMap && textureBlend > 0.02 ? baseMap : null;
        material.metalness = config.metalness ?? material.metalness;
        material.opacity = config.opacity;
        material.roughness = config.roughness ?? material.roughness;
        material.transparent = config.opacity < 1 || Boolean(material.alphaMap);
        material.wireframe = config.wireframe ?? false;
        material.needsUpdate = true;
    }
    static applyRotation(model, config) {
        const rotation = vector3ToThree(config.rotation);
        model.rotation.order = "XYZ";
        model.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));
    }
}
