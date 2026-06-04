import * as THREE from "three";
import {
  THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
  THERMAL_CAPTURE_VERTICAL_FOV_MAX_DEGREES,
  THERMAL_CAPTURE_VERTICAL_FOV_MIN_DEGREES,
} from "@/lib/thermal-mapping";

export const DEFAULT_THERMAL_SAMPLE_POSE = Object.freeze({
  coordinateSpace: "asset-relative-sample",
  lookAt: { x: 0, y: 0, z: 0 },
  position: { x: 0, y: 0.06, z: 0.62 },
  previewPlaneScale: 0.14,
  projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
});

export function getThermalTargetMetrics(targetObject) {
  const box = new THREE.Box3().setFromObject(targetObject);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  if (!box.isEmpty()) {
    box.getCenter(center);
    box.getSize(size);
  } else {
    targetObject?.getWorldPosition?.(center);
    size.set(1, 1, 1);
  }

  return {
    center,
    extent: Math.max(size.x, size.y, size.z, 0.75),
    size,
  };
}

export function resolveThermalCameraPose({
  camera,
  index = 0,
  targetMetrics,
  totalCount = 1,
}) {
  const pose = camera?.worldPose ?? getFallbackThermalCameraPose(index, totalCount);
  const position = resolveThermalPoseVector({
    fallback: DEFAULT_THERMAL_SAMPLE_POSE.position,
    targetMetrics,
    vector: pose.position,
    world: pose.coordinateSpace === "world",
  });
  const lookAt = resolveThermalPoseVector({
    fallback: DEFAULT_THERMAL_SAMPLE_POSE.lookAt,
    targetMetrics,
    vector: pose.lookAt,
    world: pose.coordinateSpace === "world",
  });

  return {
    ...pose,
    lookAt,
    position,
    previewPlaneScale: Number.isFinite(pose.previewPlaneScale)
      ? pose.previewPlaneScale
      : DEFAULT_THERMAL_SAMPLE_POSE.previewPlaneScale,
    projectorFov: clampThermalFov(
      Number.isFinite(pose.projectorFov)
        ? pose.projectorFov
        : DEFAULT_THERMAL_SAMPLE_POSE.projectorFov,
    ),
  };
}

export function resolveThermalPoseVector({
  fallback,
  targetMetrics,
  vector,
  world,
}) {
  const source = vector ?? fallback;

  if (world) {
    return new THREE.Vector3(
      toFiniteNumber(source.x, 0),
      toFiniteNumber(source.y, 0),
      toFiniteNumber(source.z, 0),
    );
  }

  return new THREE.Vector3(
    targetMetrics.center.x + toFiniteNumber(source.x, 0) * targetMetrics.extent,
    targetMetrics.center.y + toFiniteNumber(source.y, 0) * targetMetrics.extent,
    targetMetrics.center.z + toFiniteNumber(source.z, 0) * targetMetrics.extent,
  );
}

export function getFallbackThermalCameraPose(index, totalCount) {
  const angle = ((Math.PI * 2) / Math.max(1, totalCount)) * index;

  return {
    coordinateSpace: "asset-relative-sample",
    lookAt: DEFAULT_THERMAL_SAMPLE_POSE.lookAt,
    position: {
      x: Math.sin(angle) * 0.62,
      y: 0.08,
      z: Math.cos(angle) * 0.62,
    },
    previewPlaneScale: DEFAULT_THERMAL_SAMPLE_POSE.previewPlaneScale,
    projectorFov: DEFAULT_THERMAL_SAMPLE_POSE.projectorFov,
  };
}

function toFiniteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clampThermalFov(value) {
  return THREE.MathUtils.clamp(
    value,
    THERMAL_CAPTURE_VERTICAL_FOV_MIN_DEGREES,
    THERMAL_CAPTURE_VERTICAL_FOV_MAX_DEGREES,
  );
}
