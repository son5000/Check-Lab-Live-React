import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const MATERIAL_TEXTURE_KEYS = [
    "alphaMap",
    "aoMap",
    "bumpMap",
    "clearcoatMap",
    "clearcoatNormalMap",
    "clearcoatRoughnessMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "gradientMap",
    "lightMap",
    "map",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
    "sheenColorMap",
    "sheenRoughnessMap",
    "specularColorMap",
    "specularIntensityMap",
    "transmissionMap",
];

export async function loadTexture(url) {
    return new Promise((resolve) => {
        textureLoader.load(url, (texture) => resolve(configureTexture(texture)), undefined, () => {
            console.warn(`Failed to load texture: ${url}`);
            resolve(null);
        });
    });
}
export async function loadTextureFromFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result;
            try {
                const texture = await loadTexture(dataUrl);
                resolve(texture);
            }
            catch (error) {
                console.error('Failed to load texture from file:', error);
                resolve(null);
            }
        };
        reader.onerror = () => {
            console.error('Failed to read file');
            resolve(null);
        };
        reader.readAsDataURL(file);
    });
}
export async function loadTextureSource(source) {
    return typeof source === 'string'
        ? loadTexture(source)
        : loadTextureFromFile(source);
}
export function configureTexture(texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
}
export function disposeMaterialTextures(material) {
    for (const key of MATERIAL_TEXTURE_KEYS) {
        const texture = material[key];
        if (texture instanceof THREE.Texture) {
            texture.dispose();
            material[key] = null;
        }
    }
}
