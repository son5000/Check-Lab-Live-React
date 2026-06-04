"use client";

import { useEffect } from "react";
import * as THREE from "three";
import {
  createThermalCanvasFromFrame,
  createThermalTextureFromCanvas,
  THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
  THERMAL_CAPTURE_VERTICAL_FOV_MAX_DEGREES,
  THERMAL_CAPTURE_VERTICAL_FOV_MIN_DEGREES,
} from "@/lib/thermal-mapping";
import {
  getThermalTargetMetrics,
  resolveThermalCameraPose,
} from "../utils/thermalCameraPose";

const PREVIEW_GROUP_NAME = "ThermalCameraPreviewPlanes";
const LASER_SAMPLE_POINTS = [
  { key: "top-left", x: -0.5, y: 0.5 },
  { key: "top-center", x: 0, y: 0.5 },
  { key: "top-right", x: 0.5, y: 0.5 },
  { key: "middle-left", x: -0.5, y: 0 },
  { key: "center", x: 0, y: 0 },
  { key: "middle-right", x: 0.5, y: 0 },
  { key: "bottom-left", x: -0.5, y: -0.5 },
  { key: "bottom-center", x: 0, y: -0.5 },
  { key: "bottom-right", x: 0.5, y: -0.5 },
];
const FOOTPRINT_CORNER_KEYS = [
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
];

export function useThermalCameraPreviewPlanes({
  cameras = [],
  enabled = false,
  framesByCameraId = {},
  scene,
  selectedCameraId,
  showLaserGuide = true,
  targetObject,
}) {
  useEffect(() => {
    if (!enabled || !scene || !targetObject || !cameras.length) {
      return undefined;
    }

    const entries = cameras
      .filter((camera) => !selectedCameraId || camera.cameraId === selectedCameraId)
      .map((camera) => ({
        camera,
        frame: framesByCameraId[camera.cameraId],
      }))
      .filter((entry) => entry.frame);

    if (!entries.length) {
      return undefined;
    }

    const targetMetrics = getThermalTargetMetrics(targetObject);
    const group = new THREE.Group();
    group.name = PREVIEW_GROUP_NAME;
    group.userData.isThermalCameraPreviewPlanes = true;

    entries.forEach(({ camera, frame }, index) => {
      const planeGroup = createPreviewPlaneGroup({
        camera,
        frame,
        index,
        targetObject,
        targetMetrics,
        totalCount: entries.length,
        showLaserGuide,
      });

      if (planeGroup) {
        group.add(planeGroup);
      }
    });

    if (!group.children.length) {
      disposeObject3D(group);
      return undefined;
    }

    scene.add(group);

    return () => {
      scene.remove(group);
      disposeObject3D(group);
    };
  }, [
    cameras,
    enabled,
    framesByCameraId,
    scene,
    selectedCameraId,
    showLaserGuide,
    targetObject,
  ]);
}

function createPreviewPlaneGroup({
  camera,
  frame,
  index,
  targetObject,
  targetMetrics,
  totalCount,
  showLaserGuide,
}) {
  const canvas = createThermalCanvasFromFrame(frame, {
    paletteMaxTemperature: frame.maxTemperature,
    paletteMinTemperature: frame.minTemperature,
  });

  if (!canvas) {
    return null;
  }

  const texture = createThermalTextureFromCanvas(canvas, {
    flipY: false,
  });

  if (!texture) {
    return null;
  }

  const pose = resolveThermalCameraPose({
    camera,
    index,
    targetMetrics,
    totalCount,
  });
  const { lookAt, position } = pose;
  const aspectRatio = frame.width && frame.height ? frame.width / frame.height : 4 / 3;
  const viewDirection = lookAt.clone().sub(position).normalize();
  const targetDistance = Math.max(0.01, position.distanceTo(lookAt));
  const previewDistance = Math.max(
    targetMetrics.extent * 0.04,
    Math.min(targetDistance * 0.28, targetMetrics.extent * 0.18),
  );
  const planeHeight = getThermalPreviewPlaneHeight({
    pose,
    previewDistance,
    targetMetrics,
  });
  const planeWidth = planeHeight * aspectRatio;
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: true,
    depthWrite: false,
    map: texture,
    opacity: 0.84,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.name = `${camera.cameraName} thermal preview plane`;
  plane.position.copy(position).addScaledVector(viewDirection, previewDistance);
  plane.lookAt(lookAt);
  plane.renderOrder = 35;
  plane.userData.cameraId = camera.cameraId;

  const group = new THREE.Group();
  group.name = `${camera.cameraName} preview`;
  group.userData.cameraId = camera.cameraId;
  group.add(plane);
  group.add(createPreviewBorder(plane));

  if (showLaserGuide) {
    group.add(createPreviewSightLine(position, lookAt));
    group.add(
      createProjectionLaserGuide({
        direction: lookAt.clone().sub(position).normalize(),
        frame,
        origin: position,
        plane,
        planeHeight,
        planeWidth,
        targetMetrics,
        targetObject,
      }),
    );
  }

  return group;
}

function getThermalPreviewPlaneHeight({ pose, previewDistance, targetMetrics }) {
  const fovRadians = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(
      Number(pose.projectorFov) || THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
      THERMAL_CAPTURE_VERTICAL_FOV_MIN_DEGREES,
      THERMAL_CAPTURE_VERTICAL_FOV_MAX_DEGREES,
    ),
  );
  const fovHeight = 2 * Math.tan(fovRadians / 2) * previewDistance;

  return Math.max(targetMetrics.extent * 0.08, fovHeight);
}

function createPreviewBorder(plane) {
  const borderGeometry = new THREE.EdgesGeometry(plane.geometry);
  const borderMaterial = new THREE.LineBasicMaterial({
    color: 0x67e8f9,
    depthTest: true,
    transparent: true,
    opacity: 0.82,
  });
  const border = new THREE.LineSegments(borderGeometry, borderMaterial);
  border.name = "thermal preview border";
  border.position.copy(plane.position);
  border.quaternion.copy(plane.quaternion);
  border.renderOrder = 36;

  return border;
}

function createPreviewSightLine(position, lookAt) {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    position.clone(),
    lookAt.clone(),
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x22d3ee,
    depthTest: true,
    transparent: true,
    opacity: 0.32,
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.name = "thermal preview sight line";
  line.renderOrder = 34;

  return line;
}

function createProjectionLaserGuide({
  direction,
  frame,
  origin,
  plane,
  planeHeight,
  planeWidth,
  targetMetrics,
  targetObject,
}) {
  const group = new THREE.Group();
  group.name = `${frame.cameraName} thermal projection laser guide`;
  group.userData.isThermalProjectionLaserGuide = true;

  if (
    !targetObject ||
    !direction?.isVector3 ||
    direction.lengthSq() <= 0 ||
    !planeWidth ||
    !planeHeight
  ) {
    return group;
  }

  targetObject.updateWorldMatrix?.(true, true);

  const raycaster = new THREE.Raycaster();
  const cameraOrigin = origin?.isVector3 ? origin.clone() : plane.position.clone();
  const maxDistance = Math.max(
    targetMetrics.extent * 4,
    plane.position.distanceTo(targetMetrics.center) + targetMetrics.extent * 2,
  );
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(plane.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(plane.quaternion);
  const samples = LASER_SAMPLE_POINTS.map((sample) => {
    const source = plane.position
      .clone()
      .addScaledVector(right, sample.x * planeWidth)
      .addScaledVector(up, sample.y * planeHeight);

    const rayDirection = source.clone().sub(cameraOrigin).normalize();
    raycaster.set(cameraOrigin, rayDirection);
    raycaster.far = maxDistance;

    const hit = raycaster.intersectObject(targetObject, true)[0];
    const fallbackPoint = source
      .clone()
      .addScaledVector(rayDirection, maxDistance * 0.55);
    const targetPoint = hit
      ? offsetHitPoint(hit, rayDirection)
      : fallbackPoint;

    return {
      ...sample,
      hit,
      source,
      targetPoint,
    };
  });
  const beamSurface = createLaserBeamSurfaces(samples);
  const beamLine = createLaserBeamLines(samples);
  const footprintFill = createLaserFootprintFill(samples);
  const footprintLine = createLaserFootprintLines(samples);

  if (beamSurface) {
    group.add(beamSurface);
  }

  if (beamLine) {
    group.add(beamLine);
  }

  if (footprintFill) {
    group.add(footprintFill);
  }

  if (footprintLine) {
    group.add(footprintLine);
  }

  return group;
}

function createLaserBeamSurfaces(samples) {
  const corners = getLaserCornerSamples(samples);

  if (corners.some((sample) => !sample)) {
    return null;
  }

  const points = [];

  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index];
    const next = corners[(index + 1) % corners.length];

    points.push(
      current.source,
      next.source,
      next.targetPoint,
      current.source,
      next.targetPoint,
      current.targetPoint,
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    depthTest: true,
    depthWrite: false,
    opacity: 0.16,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "thermal image projection laser surface";
  mesh.renderOrder = 38;

  return mesh;
}

function createLaserBeamLines(samples) {
  const points = [];

  samples.forEach((sample) => {
    points.push(sample.source, sample.targetPoint);
  });

  if (!points.length) {
    return null;
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xfbbf24,
    depthTest: true,
    transparent: true,
    opacity: 0.58,
  });
  const line = new THREE.LineSegments(geometry, material);
  line.name = "thermal image projection laser beams";
  line.renderOrder = 39;

  return line;
}

function createLaserFootprintFill(samples) {
  const footprintPoints = getLaserCornerSamples(samples);

  if (footprintPoints.some((sample) => !sample?.hit)) {
    return null;
  }

  const points = [
    footprintPoints[0].targetPoint,
    footprintPoints[1].targetPoint,
    footprintPoints[2].targetPoint,
    footprintPoints[0].targetPoint,
    footprintPoints[2].targetPoint,
    footprintPoints[3].targetPoint,
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.MeshBasicMaterial({
    color: 0xa3e635,
    depthTest: false,
    depthWrite: false,
    opacity: 0.22,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "thermal texture footprint fill";
  mesh.renderOrder = 41;

  return mesh;
}

function createLaserFootprintLines(samples) {
  const footprintPoints = getLaserCornerSamples(samples);

  if (footprintPoints.some((sample) => !sample?.hit)) {
    return null;
  }

  const points = [];

  for (let index = 0; index < footprintPoints.length; index += 1) {
    points.push(
      footprintPoints[index].targetPoint,
      footprintPoints[(index + 1) % footprintPoints.length].targetPoint,
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xa3e635,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.LineSegments(geometry, material);
  line.name = "thermal texture footprint frame";
  line.renderOrder = 42;

  return line;
}

function getLaserCornerSamples(samples) {
  const samplesByKey = new Map(samples.map((sample) => [sample.key, sample]));
  return FOOTPRINT_CORNER_KEYS.map((key) => samplesByKey.get(key));
}

function offsetHitPoint(hit, direction) {
  const normal = hit.face?.normal?.clone?.() ?? direction.clone().multiplyScalar(-1);

  if (hit.object?.matrixWorld) {
    normal.transformDirection(hit.object.matrixWorld);
  }

  if (normal.lengthSq() <= 0) {
    normal.copy(direction).multiplyScalar(-1);
  }

  return hit.point.clone().addScaledVector(normal.normalize(), 0.01);
}

function disposeObject3D(object) {
  object.traverse?.((entry) => {
    if (entry.geometry) {
      entry.geometry.dispose?.();
    }

    disposeMaterial(entry.material);
  });
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  material?.map?.dispose?.();
  material?.dispose?.();
}
