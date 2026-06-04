import * as THREE from "three";
import { createAxesHelper, createGridHelper } from "../utils/geometryUtils";
import { disposeObject3D } from "../utils/threeDisposal";

const GRID_NAME = "viewer-grid-helper";
const AXES_NAME = "viewer-axes-helper";
const GROUND_NAME = "viewer-ground-plane";

export class SceneBuilder {
    static createScene() {
        return new THREE.Scene();
    }
    static createRenderer(container) {
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        container.appendChild(renderer.domElement);
        return renderer;
    }
    static createCamera(width, height, fov = 45) {
        return new THREE.PerspectiveCamera(fov, width / height, 0.1, 5000);
    }
    static applyBackground(scene, config) {
        if (!(scene.background instanceof THREE.Color)) {
            scene.background = new THREE.Color(config.color);
        }
        else {
            scene.background.set(config.color);
        }
        scene.fog = config.fog?.enabled
            ? new THREE.Fog(config.fog.color, config.fog.near, config.fog.far)
            : null;
        this.syncSceneObject({
            cacheKey: [
                config.gridSize,
                config.gridDivisions ?? Math.max(2, Math.round(config.gridSize / 10)),
                config.gridColor,
            ].join(":"),
            createObject: () => {
                const grid = createGridHelper(config.gridSize, config.gridDivisions ?? Math.max(2, Math.round(config.gridSize / 10)), config.gridColor);
                grid.name = GRID_NAME;
                return grid;
            },
            name: GRID_NAME,
            scene,
            shouldExist: config.showGrid,
        });
        this.syncSceneObject({
            cacheKey: String(config.gridSize),
            createObject: () => {
                const axes = createAxesHelper(Math.max(config.gridSize * 0.34, 24));
                axes.name = AXES_NAME;
                return axes;
            },
            name: AXES_NAME,
            scene,
            shouldExist: config.showAxes,
        });
        this.syncSceneObject({
            cacheKey: [config.gridSize, config.groundColor ?? "#0f172a"].join(":"),
            createObject: () => this.createGroundPlane(config),
            name: GROUND_NAME,
            scene,
            shouldExist: config.showGround,
        });
    }
    static createGroundPlane(config) {
        const size = Math.max(config.gridSize, 80) * 1.35;
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({
            color: config.groundColor ?? "#0f172a",
            metalness: 0,
            roughness: 0.95,
            side: THREE.DoubleSide,
        }));
        ground.name = GROUND_NAME;
        ground.receiveShadow = true;
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.03;
        return ground;
    }
    static syncSceneObject({ cacheKey, createObject, name, scene, shouldExist }) {
        const existing = scene.getObjectByName(name);
        if (!shouldExist) {
            if (existing) {
                scene.remove(existing);
                disposeObject3D(existing);
            }
            return;
        }
        if (existing?.userData.cacheKey === cacheKey) {
            return;
        }
        if (existing) {
            scene.remove(existing);
            disposeObject3D(existing);
        }
        const object = createObject();
        object.userData.cacheKey = cacheKey;
        scene.add(object);
    }
}
