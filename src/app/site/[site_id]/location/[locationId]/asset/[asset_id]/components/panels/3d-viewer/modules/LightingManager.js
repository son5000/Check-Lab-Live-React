import * as THREE from "three";
import { vector3ToThree } from "../utils/geometryUtils";
export class LightingManager {
    static applyConfig(scene, config) {
        scene.children
            .filter((object) => object instanceof THREE.Light)
            .filter((light) => light.name.startsWith("viewer-light-"))
            .forEach((light) => scene.remove(light));
        const ambientLight = new THREE.AmbientLight(config.ambientLight.color, config.ambientLight.intensity);
        ambientLight.name = "viewer-light-ambient";
        scene.add(ambientLight);
        if (config.hemisphereLight) {
            const hemisphereLight = new THREE.HemisphereLight(config.hemisphereLight.color, config.hemisphereLight.groundColor, config.hemisphereLight.intensity);
            hemisphereLight.name = "viewer-light-hemisphere";
            scene.add(hemisphereLight);
        }
        const directionalLight = new THREE.DirectionalLight(config.directionalLight.color, config.directionalLight.intensity);
        directionalLight.position.copy(vector3ToThree(config.directionalLight.position));
        directionalLight.castShadow = true;
        directionalLight.name = "viewer-light-directional";
        directionalLight.shadow.mapSize.set(2048, 2048);
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = -220;
        directionalLight.shadow.camera.right = 220;
        directionalLight.shadow.camera.top = 220;
        directionalLight.shadow.camera.bottom = -220;
        scene.add(directionalLight);
        if (config.pointLight && config.pointLight.enabled !== false) {
            const pointLight = new THREE.PointLight(config.pointLight.color, config.pointLight.intensity, config.pointLight.distance);
            pointLight.position.copy(vector3ToThree(config.pointLight.position));
            pointLight.castShadow = true;
            pointLight.name = "viewer-light-point";
            scene.add(pointLight);
        }
    }
}
