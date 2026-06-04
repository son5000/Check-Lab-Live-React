import * as THREE from "three";
import { vector3ToThree } from "../utils/geometryUtils";

const VIEWER_LIGHT_PREFIX = "viewer-light-";

export class LightingManager {
  static applyConfig(scene, config) {
    const ambientLight = this.getOrCreateLight(
      scene,
      "viewer-light-ambient",
      () => new THREE.AmbientLight(),
    );
    ambientLight.color.set(config.ambientLight.color);
    ambientLight.intensity = config.ambientLight.intensity;

    this.syncOptionalLight({
      configure: (light) => {
        light.color.set(config.hemisphereLight.color);
        light.groundColor.set(config.hemisphereLight.groundColor);
        light.intensity = config.hemisphereLight.intensity;
      },
      createLight: () => new THREE.HemisphereLight(),
      enabled: Boolean(config.hemisphereLight),
      name: "viewer-light-hemisphere",
      scene,
    });

    const directionalLight = this.getOrCreateLight(
      scene,
      "viewer-light-directional",
      () => new THREE.DirectionalLight(),
    );
    directionalLight.color.set(config.directionalLight.color);
    directionalLight.intensity = config.directionalLight.intensity;
    directionalLight.position.copy(
      vector3ToThree(config.directionalLight.position),
    );
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -220;
    directionalLight.shadow.camera.right = 220;
    directionalLight.shadow.camera.top = 220;
    directionalLight.shadow.camera.bottom = -220;
    directionalLight.shadow.camera.updateProjectionMatrix();

    this.syncOptionalLight({
      configure: (light) => {
        light.color.set(config.pointLight.color);
        light.intensity = config.pointLight.intensity;
        light.distance = config.pointLight.distance;
        light.position.copy(vector3ToThree(config.pointLight.position));
        light.castShadow = true;
      },
      createLight: () => new THREE.PointLight(),
      enabled: Boolean(config.pointLight && config.pointLight.enabled !== false),
      name: "viewer-light-point",
      scene,
    });

    this.removeUnknownViewerLights(scene);
  }

  static syncOptionalLight({ configure, createLight, enabled, name, scene }) {
    const existing = scene.getObjectByName(name);

    if (!enabled) {
      if (existing) {
        scene.remove(existing);
        disposeLight(existing);
      }
      return;
    }

    const light = existing ?? this.getOrCreateLight(scene, name, createLight);
    configure(light);
  }

  static getOrCreateLight(scene, name, createLight) {
    const existing = scene.getObjectByName(name);
    if (existing) {
      return existing;
    }

    const light = createLight();
    light.name = name;
    scene.add(light);
    return light;
  }

  static removeUnknownViewerLights(scene) {
    const knownLightNames = new Set([
      "viewer-light-ambient",
      "viewer-light-directional",
      "viewer-light-hemisphere",
      "viewer-light-point",
    ]);

    scene.children
      .filter(
        (object) =>
          object instanceof THREE.Light &&
          object.name.startsWith(VIEWER_LIGHT_PREFIX) &&
          !knownLightNames.has(object.name),
      )
      .forEach((light) => {
        scene.remove(light);
        disposeLight(light);
      });
  }
}

function disposeLight(light) {
  light.dispose?.();
  light.shadow?.dispose?.();
}
