import * as THREE from "three";
import { threeToVector3, vector3ToThree } from "../utils/geometryUtils";
export class CameraController {
    static applyConfig(camera, controls, config) {
        camera.fov = config.fov;
        camera.position.copy(vector3ToThree(config.position));
        camera.updateProjectionMatrix();
        if (controls) {
            controls.target.copy(vector3ToThree(config.target));
            controls.enableDamping = config.damping ?? true;
            controls.minDistance = config.minDistance ?? 12;
            controls.maxDistance = config.maxDistance ?? 720;
            controls.update();
            return;
        }
        camera.lookAt(vector3ToThree(config.target));
    }
    static getPresetConfig(preset, currentConfig, distance) {
        const target = vector3ToThree(currentConfig.target);
        const currentDistance = distance ??
            Math.max(vector3ToThree(currentConfig.position).distanceTo(target), currentConfig.minDistance ?? 120);
        const offset = this.getPresetOffset(preset, currentDistance);
        const position = target.clone().add(offset);
        return {
            ...currentConfig,
            position: threeToVector3(position),
            preset,
        };
    }
    static getPresetOffset(preset, distance) {
        const diagonal = distance * 0.577;
        if (preset === "back") {
            return new THREE.Vector3(0, 0, -distance);
        }
        if (preset === "top") {
            return new THREE.Vector3(0, distance, 0.001);
        }
        if (preset === "bottom") {
            return new THREE.Vector3(0, -distance, 0.001);
        }
        if (preset === "left") {
            return new THREE.Vector3(-distance, 0, 0);
        }
        if (preset === "right") {
            return new THREE.Vector3(distance, 0, 0);
        }
        if (preset === "isometric") {
            return new THREE.Vector3(diagonal, diagonal, diagonal);
        }
        return new THREE.Vector3(0, 0, distance);
    }
}
