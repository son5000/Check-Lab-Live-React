import * as THREE from "three";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round(value) {
  return Number(value.toFixed(3));
}

export function roundUv(value) {
  return Number(clamp(value, 0, 1).toFixed(5));
}

export function toVector3(vector) {
  return {
    x: round(vector.x),
    y: round(vector.y),
    z: round(vector.z),
  };
}

export function toThreeVector(vector) {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}

export function toUvPoint(point) {
  return {
    x: roundUv(point.x),
    y: roundUv(point.y),
  };
}

export function toImagePixel(point) {
  return {
    x: round(point.x),
    y: round(point.y),
  };
}

export function clientToPercentPoint(point, bounds) {
  return {
    x: clamp(((point.x - bounds.left) / bounds.width) * 100, 0, 100),
    y: clamp(((point.y - bounds.top) / bounds.height) * 100, 0, 100),
  };
}

export function getClientDistance(firstPoint, secondPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}
