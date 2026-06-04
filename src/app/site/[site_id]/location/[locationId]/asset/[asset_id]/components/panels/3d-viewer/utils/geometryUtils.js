import * as THREE from 'three';
export function createGridHelper(size, divisions, color = '#475569') {
    const grid = new THREE.GridHelper(size, divisions, color, color);
    const material = grid.material;
    if (Array.isArray(material)) {
        material.forEach((item) => {
            item.opacity = 0.36;
            item.transparent = true;
        });
    }
    else {
        material.opacity = 0.36;
        material.transparent = true;
    }
    return grid;
}
export function createAxesHelper(size = 100) {
    return new THREE.AxesHelper(size);
}
export function vector3ToThree(v) {
    return new THREE.Vector3(v.x, v.y, v.z);
}
export function threeToVector3(v) {
    return { x: v.x, y: v.y, z: v.z };
}
export function applyRotationToGeometry(geometry, rotation) {
    geometry.rotateX((rotation.x * Math.PI) / 180);
    geometry.rotateY((rotation.y * Math.PI) / 180);
    geometry.rotateZ((rotation.z * Math.PI) / 180);
}
export function centerGeometry(geometry) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -center.y, -center.z);
    }
}
export function prepareModelGeometry(geometry, normalizeSize) {
    const preparedGeometry = ensureGeometryUvs(geometry);
    if (!preparedGeometry.getAttribute('normal')) {
        preparedGeometry.computeVertexNormals();
    }
    centerGeometry(preparedGeometry);
    if (normalizeSize && normalizeSize > 0) {
        normalizeGeometrySize(preparedGeometry, normalizeSize);
    }
    preparedGeometry.computeBoundingSphere();
    return preparedGeometry;
}
export function ensureGeometryUvs(geometry) {
    const existingUv = geometry.getAttribute('uv');
    if (existingUv) {
        return geometry;
    }
    const targetGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
    const position = targetGeometry.getAttribute('position');
    if (!position) {
        return targetGeometry;
    }
    targetGeometry.computeBoundingBox();
    const boundingBox = targetGeometry.boundingBox;
    if (!boundingBox) {
        return targetGeometry;
    }
    const size = boundingBox.getSize(new THREE.Vector3());
    const min = boundingBox.min;
    const uv = new Float32Array(position.count * 2);
    const width = Math.max(size.x, 0.0001);
    const depth = Math.max(size.z, size.y, 0.0001);
    for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const y = position.getY(index);
        const z = position.getZ(index);
        uv[index * 2] = (x - min.x) / width;
        uv[index * 2 + 1] = Math.abs(size.z) > 0.0001
            ? (z - min.z) / depth
            : (y - min.y) / depth;
    }
    targetGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return targetGeometry;
}
export function normalizeGeometrySize(geometry, targetSize) {
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    if (!boundingBox) {
        return;
    }
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (maxDimension <= 0) {
        return;
    }
    const scale = targetSize / maxDimension;
    geometry.scale(scale, scale, scale);
}
