"use client";

import { useEffect, useRef } from "react";
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
const CAMERA_LASER_COLOR = 0x67e8f9;
const CAMERA_LASER_HOVER_COLOR = 0xfacc15;
const CAMERA_LASER_SELECTED_COLOR = 0xa3e635;
const COVERAGE_GRID_SEGMENTS_ALL = 12;
const COVERAGE_GRID_SEGMENTS_SELECTED = 22;
const THERMAL_PROJECTION_NORMAL_CUTOFF = 0.5;

export function useThermalCameraPreviewPlanes({
  cameras = [],
  enabled = false,
  framesByCameraId = {},
  hoveredCameraId,
  requireSelection = false,
  scene,
  selectedCameraId,
  showLaserGuide = true,
  targetObject,
}) {
  const groupRef = useRef(null);

  useEffect(() => {
    if (!enabled || !scene || !targetObject || !cameras.length) {
      groupRef.current = null;
      return undefined;
    }

    const entries = cameras
      .map((camera, index) => ({
        camera,
        frame: framesByCameraId[camera.cameraId],
        index,
      }))
      .filter(
        ({ camera }) =>
          requireSelection
            ? Boolean(selectedCameraId) && camera.cameraId === selectedCameraId
            : !selectedCameraId || camera.cameraId === selectedCameraId,
      )
      .filter((entry) => entry.frame);

    if (!entries.length) {
      return undefined;
    }

    const targetMetrics = getThermalTargetMetrics(targetObject);
    const coverageRaycastTargets =
      collectThermalCoverageRaycastTargets(targetObject);
    const group = new THREE.Group();
    group.name = PREVIEW_GROUP_NAME;
    group.userData.isThermalCameraPreviewPlanes = true;

    entries.forEach(({ camera, frame, index }) => {
      const planeGroup = createPreviewPlaneGroup({
        camera,
        coverageGridSegments: selectedCameraId
          ? COVERAGE_GRID_SEGMENTS_SELECTED
          : COVERAGE_GRID_SEGMENTS_ALL,
        coverageRaycastTargets,
        frame,
        index,
        targetObject,
        targetMetrics,
        totalCount: cameras.length,
        selectedCameraId,
        showLaserGuide,
      });

      if (planeGroup) {
        group.add(planeGroup);
      }
    });

    if (!group.children.length) {
      disposeObject3D(group);
      groupRef.current = null;
      return undefined;
    }

    scene.add(group);
    groupRef.current = group;

    return () => {
      scene.remove(group);
      groupRef.current = null;
      disposeObject3D(group);
    };
  }, [
    cameras,
    enabled,
    framesByCameraId,
    requireSelection,
    scene,
    selectedCameraId,
    showLaserGuide,
    targetObject,
  ]);

  useEffect(() => {
    updateThermalProjectionLaserVisualState({
      group: groupRef.current,
      hoveredCameraId,
      selectedCameraId,
    });
  }, [hoveredCameraId, selectedCameraId]);
}

function createPreviewPlaneGroup({
  camera,
  coverageGridSegments,
  coverageRaycastTargets,
  frame,
  index,
  targetObject,
  targetMetrics,
  totalCount,
  selectedCameraId,
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

  const laserVisualState = getCameraLaserVisualState({
    cameraId: camera.cameraId,
    selectedCameraId,
  });

  group.add(
    createProjectionLaserGuide({
      aspectRatio,
      cameraId: camera.cameraId,
      coverageGridSegments,
      coverageRaycastTargets,
      frame,
      pose,
      showLaserGuide,
      targetMetrics,
      targetObject,
      texture,
      visualState: laserVisualState,
    }),
  );

  if (showLaserGuide) {
    group.add(
      createPreviewSightLine(
        position,
        lookAt,
        laserVisualState,
        camera.cameraId,
      ),
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

function createPreviewSightLine(position, lookAt, visualState, cameraId) {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    position.clone(),
    lookAt.clone(),
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: visualState.color,
    depthTest: true,
    transparent: true,
    opacity: visualState.sightLineOpacity,
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.name = "thermal preview sight line";
  line.renderOrder = 34;
  line.userData.cameraId = cameraId;
  line.userData.isThermalProjectionLaserVisual = true;
  line.userData.thermalProjectionLaserRole = "sight";

  return line;
}

function createProjectionLaserGuide({
  aspectRatio,
  cameraId,
  coverageGridSegments,
  coverageRaycastTargets,
  frame,
  pose,
  showLaserGuide,
  targetMetrics,
  targetObject,
  texture,
  visualState,
}) {
  const group = new THREE.Group();
  group.name = `${frame.cameraName} thermal projection laser guide`;
  group.userData.isThermalProjectionLaserGuide = true;

  if (
    !targetObject ||
    !pose?.position?.isVector3 ||
    !pose?.lookAt?.isVector3 ||
    pose.position.distanceToSquared(pose.lookAt) <= 0
  ) {
    return group;
  }

  targetObject.updateWorldMatrix?.(true, true);

  const projectorCamera = createThermalProjectorCamera({
    aspectRatio,
    pose,
    targetMetrics,
  });
  const coverageGeometry = createThermalCoverageGeometry({
    coverageGridSegments,
    projectorCamera,
    raycastTargets: coverageRaycastTargets,
    targetObject,
  });
  const coverageFill = createThermalCoverageFill(
    coverageGeometry.fillPoints,
    coverageGeometry.fillUvs,
    texture,
    visualState,
    cameraId,
  );
  const coverageLine = createThermalCoverageLine(
    coverageGeometry.boundaryPoints,
    visualState,
    cameraId,
  );

  if (coverageFill) {
    group.add(coverageFill);
  }

  if (showLaserGuide && coverageLine) {
    group.add(coverageLine);
  }

  return group;
}

function createThermalProjectorCamera({ aspectRatio, pose, targetMetrics }) {
  const distanceToTarget = Math.max(
    0.1,
    pose.position.distanceTo(pose.lookAt),
  );
  const projectorCamera = new THREE.PerspectiveCamera(
    Number(pose.projectorFov) || THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 4 / 3,
    0.01,
    Math.max(10, distanceToTarget + targetMetrics.extent * 4),
  );

  projectorCamera.position.copy(pose.position);
  projectorCamera.lookAt(pose.lookAt);
  projectorCamera.updateMatrixWorld(true);
  projectorCamera.updateProjectionMatrix();

  return projectorCamera;
}

function createThermalCoverageGeometry({
  coverageGridSegments,
  projectorCamera,
  raycastTargets,
  targetObject,
}) {
  const raycaster = new THREE.Raycaster();
  const intersectionHits = [];
  const origin = projectorCamera.position.clone();
  const projectorFacingDirection = projectorCamera
    .getWorldDirection(new THREE.Vector3())
    .multiplyScalar(-1)
    .normalize();
  const samples = [];
  const fillPoints = [];
  const fillUvs = [];
  const boundaryEdges = new Map();

  raycaster.near = projectorCamera.near;
  raycaster.far = projectorCamera.far;

  if (!raycastTargets?.length) {
    return {
      boundaryPoints: [],
      fillPoints,
      fillUvs,
    };
  }

  for (let row = 0; row <= coverageGridSegments; row += 1) {
    const ndcY = 1 - (row / coverageGridSegments) * 2;
    samples[row] = [];

    for (let column = 0; column <= coverageGridSegments; column += 1) {
      const ndcX = (column / coverageGridSegments) * 2 - 1;
      samples[row][column] = getThermalCoverageSample({
        column,
        intersectionHits,
        ndcX,
        ndcY,
        origin,
        projectorCamera,
        projectorFacingDirection,
        raycastTargets,
        raycaster,
        row,
        targetObject,
      });
    }
  }

  for (let row = 0; row < coverageGridSegments; row += 1) {
    for (let column = 0; column < coverageGridSegments; column += 1) {
      const topLeft = samples[row][column];
      const topRight = samples[row][column + 1];
      const bottomRight = samples[row + 1][column + 1];
      const bottomLeft = samples[row + 1][column];

      addCoverageTriangle({
        boundaryEdges,
        fillPoints,
        fillUvs,
        samples: [topLeft, topRight, bottomRight],
      });
      addCoverageTriangle({
        boundaryEdges,
        fillPoints,
        fillUvs,
        samples: [topLeft, bottomRight, bottomLeft],
      });
    }
  }

  return {
    boundaryPoints: getCoverageBoundaryPoints(boundaryEdges),
    fillPoints,
    fillUvs,
  };
}

function getThermalCoverageSample({
  column,
  intersectionHits,
  ndcX,
  ndcY,
  origin,
  projectorCamera,
  projectorFacingDirection,
  raycastTargets,
  raycaster,
  row,
  targetObject,
}) {
  const rayDirection = new THREE.Vector3(ndcX, ndcY, 0.5)
    .unproject(projectorCamera)
    .sub(origin)
    .normalize();

  raycaster.set(origin, rayDirection);

  intersectionHits.length = 0;
  raycaster.intersectObjects(raycastTargets, false, intersectionHits);
  const hit = intersectionHits[0];

  if (!hit || !isObjectWithinTarget(hit.object, targetObject)) {
    return {
      id: `${row}:${column}`,
      targetPoint: null,
      textureUv: null,
    };
  }

  const normal = getHitWorldNormal(hit, rayDirection);
  const surfaceFacing = normal.dot(projectorFacingDirection);

  if (surfaceFacing <= THERMAL_PROJECTION_NORMAL_CUTOFF) {
    return {
      id: `${row}:${column}`,
      targetPoint: null,
      textureUv: null,
    };
  }

  return {
    id: `${row}:${column}`,
    targetPoint: hit.point.clone().addScaledVector(normal, 0.012),
    textureUv: new THREE.Vector2((ndcX + 1) * 0.5, 1 - (ndcY + 1) * 0.5),
  };
}

function collectThermalCoverageRaycastTargets(root) {
  const targets = [];

  root?.traverse?.((object) => {
    if (
      !object?.isMesh ||
      object.userData?.isThermalCameraPreviewPlanes ||
      object.userData?.isThermalProjectionLaserGuide ||
      object.userData?.isThermalProjectionLaserVisual
    ) {
      return;
    }

    targets.push(object);
  });

  return targets;
}

function isObjectWithinTarget(object, targetObject) {
  let currentObject = object;

  while (currentObject) {
    if (currentObject === targetObject) {
      return true;
    }

    currentObject = currentObject.parent;
  }

  return false;
}

function addCoverageTriangle({ boundaryEdges, fillPoints, fillUvs, samples }) {
  if (samples.some((sample) => !sample?.targetPoint || !sample?.textureUv)) {
    return;
  }

  fillPoints.push(
    samples[0].targetPoint,
    samples[1].targetPoint,
    samples[2].targetPoint,
  );
  fillUvs.push(samples[0].textureUv, samples[1].textureUv, samples[2].textureUv);
  addCoverageBoundaryEdge(boundaryEdges, samples[0], samples[1]);
  addCoverageBoundaryEdge(boundaryEdges, samples[1], samples[2]);
  addCoverageBoundaryEdge(boundaryEdges, samples[2], samples[0]);
}

function addCoverageBoundaryEdge(boundaryEdges, start, end) {
  const key =
    start.id < end.id ? `${start.id}|${end.id}` : `${end.id}|${start.id}`;
  const existingEdge = boundaryEdges.get(key);

  if (existingEdge) {
    existingEdge.count += 1;
    return;
  }

  boundaryEdges.set(key, {
    count: 1,
    end,
    start,
  });
}

function getCoverageBoundaryPoints(boundaryEdges) {
  const points = [];

  boundaryEdges.forEach((edge) => {
    if (edge.count !== 1) {
      return;
    }

    points.push(edge.start.targetPoint, edge.end.targetPoint);
  });

  return points;
}

function createThermalCoverageFill(
  points,
  textureUvs,
  texture,
  visualState,
  cameraId,
) {
  if (!points.length) {
    return null;
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const uvBuffer = new Float32Array(textureUvs.length * 2);

  textureUvs.forEach((uv, index) => {
    const bufferIndex = index * 2;
    uvBuffer[bufferIndex] = uv.x;
    uvBuffer[bufferIndex + 1] = uv.y;
  });

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvBuffer, 2));

  const material = new THREE.MeshBasicMaterial({
    color: texture ? 0xffffff : visualState.color,
    depthTest: true,
    depthWrite: false,
    map: texture ?? null,
    opacity: texture
      ? visualState.coverageTextureOpacity
      : visualState.coverageFillOpacity,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = texture
    ? "thermal texture coverage overlay"
    : "thermal texture coverage fill";
  mesh.renderOrder = 41;
  mesh.userData.cameraId = cameraId;
  mesh.userData.isThermalProjectionLaserVisual = true;
  mesh.userData.thermalProjectionLaserRole = texture
    ? "coverage-texture"
    : "coverage-fill";

  return mesh;
}

function createThermalCoverageLine(points, visualState, cameraId) {
  if (!points.length) {
    return null;
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: visualState.color,
    depthTest: true,
    transparent: true,
    opacity: visualState.coverageLineOpacity,
  });
  const line = new THREE.LineSegments(geometry, material);
  line.name = "thermal texture coverage outline";
  line.renderOrder = 42;
  line.userData.cameraId = cameraId;
  line.userData.isThermalProjectionLaserVisual = true;
  line.userData.thermalProjectionLaserRole = "coverage-line";

  return line;
}

function getHitWorldNormal(hit, fallbackDirection) {
  const normal =
    hit.face?.normal?.clone?.() ?? fallbackDirection.clone().multiplyScalar(-1);

  if (hit.object?.matrixWorld) {
    normal.transformDirection(hit.object.matrixWorld);
  }

  if (normal.lengthSq() <= 0) {
    normal.copy(fallbackDirection).multiplyScalar(-1);
  }

  return normal.normalize();
}

function getCameraLaserVisualState({
  cameraId,
  hoveredCameraId,
  selectedCameraId,
}) {
  const isHovered = Boolean(hoveredCameraId && cameraId === hoveredCameraId);
  const isSelected = Boolean(selectedCameraId && cameraId === selectedCameraId);

  return {
    color: isHovered
      ? CAMERA_LASER_HOVER_COLOR
      : isSelected
      ? CAMERA_LASER_SELECTED_COLOR
      : CAMERA_LASER_COLOR,
    coverageFillOpacity: isHovered ? 0.28 : isSelected ? 0.24 : 0.18,
    coverageLineOpacity: isHovered ? 1 : isSelected ? 0.98 : 0.88,
    coverageTextureOpacity: isHovered ? 0.88 : isSelected ? 0.8 : 0.68,
    sightLineOpacity: isHovered ? 0.46 : isSelected ? 0.42 : 0.32,
  };
}

function updateThermalProjectionLaserVisualState({
  group,
  hoveredCameraId,
  selectedCameraId,
}) {
  if (!group) {
    return;
  }

  group.traverse?.((object) => {
    if (!object.userData?.isThermalProjectionLaserVisual || !object.material) {
      return;
    }

    const visualState = getCameraLaserVisualState({
      cameraId: object.userData.cameraId,
      hoveredCameraId,
      selectedCameraId,
    });
    const opacityByRole = {
      "coverage-fill": visualState.coverageFillOpacity,
      "coverage-line": visualState.coverageLineOpacity,
      "coverage-texture": visualState.coverageTextureOpacity,
      sight: visualState.sightLineOpacity,
    };
    const shouldTintMaterial =
      object.userData.thermalProjectionLaserRole !== "coverage-texture";
    const opacity =
      opacityByRole[object.userData.thermalProjectionLaserRole] ??
      visualState.coverageLineOpacity;

    applyLaserMaterialVisualState(
      object.material,
      shouldTintMaterial ? visualState.color : 0xffffff,
      opacity,
    );
  });
}

function applyLaserMaterialVisualState(material, color, opacity) {
  if (Array.isArray(material)) {
    material.forEach((entry) =>
      applyLaserMaterialVisualState(entry, color, opacity),
    );
    return;
  }

  if (!material) {
    return;
  }

  material.color?.setHex?.(color);
  material.opacity = opacity;
  material.needsUpdate = true;
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
