import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { prepareModelGeometry } from "../utils/geometryUtils";
import { normalizeModelTextures } from "../utils/modelFileUtils";
import { loadTextureSource } from "../utils/textureUtils";
export class ModelLoader {
    constructor() {
        this.plyLoader = new PLYLoader();
    }
    async loadModel(modelFile) {
        const geometry = prepareModelGeometry(await this.loadPLY(modelFile.plyUrl), modelFile.normalizeSize);
        const material = await this.createMaterial(normalizeModelTextures(modelFile));
        const mesh = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        mesh.name = "ply-mesh";
        group.name = "asset-ply-model";
        group.userData.modelFile = modelFile;
        group.add(mesh);
        return group;
    }
    async createMaterial(textures) {
        const material = new THREE.MeshStandardMaterial({
            color: "#ffffff",
            metalness: 0.1,
            roughness: 0.72,
            side: THREE.DoubleSide,
        });
        await Promise.all(textures
            .filter((textureConfig) => textureConfig.enabled !== false && Boolean(textureConfig.source))
            .map(async (textureConfig) => {
            const texture = await loadTextureSource(textureConfig.source);
            if (!texture) {
                return;
            }
            this.applyTexture(material, textureConfig, texture);
        }));
        material.needsUpdate = true;
        return material;
    }
    applyTexture(material, textureConfig, texture) {
        if (textureConfig.role === "emissive") {
            material.emissive.set("#ffffff");
            material.emissiveIntensity = textureConfig.strength ?? 0.35;
            material.emissiveMap = texture;
            return;
        }
        if (textureConfig.role === "alpha") {
            material.alphaMap = texture;
            material.transparent = true;
            return;
        }
        if (textureConfig.role === "roughness") {
            material.roughnessMap = texture;
            return;
        }
        material.map = texture;
    }
    loadPLY(plySource) {
        return new Promise((resolve, reject) => {
            if (typeof plySource === "string") {
                this.plyLoader.load(plySource, (geometry) => resolve(geometry), undefined, () => reject(new Error(`Failed to load PLY: ${plySource}`)));
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const arrayBuffer = event.target?.result;
                    resolve(this.plyLoader.parse(arrayBuffer));
                }
                catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error("Failed to read PLY file"));
            reader.readAsArrayBuffer(plySource);
        });
    }
}
