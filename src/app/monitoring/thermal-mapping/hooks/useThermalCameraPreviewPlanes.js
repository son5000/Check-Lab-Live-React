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
import { invalidateThreeScene } from "@/lib/three-scene-invalidation";
import {
  getThermalTargetMetrics,
  resolveThermalCameraPose,
} from "../utils/thermalCameraPose";

const PREVIEW_GROUP_NAME = "ThermalCameraPreviewPlanes";
const CAMERA_LASER_COLOR = 0x67e8f9;
const CAMERA_LASER_HOVER_COLOR = 0xfacc15;
const CAMERA_LASER_SELECTED_COLOR = 0xa3e635;
const CAMERA_LASER_COMPARISON_COLOR = 0xf97316;
const CAMERA_LASER_COMPARISON_DELTA_COLOR = 0xfacc15;
const COVERAGE_GRID_SEGMENTS_ALL = 12;
const COVERAGE_GRID_SEGMENTS_SELECTED = 22;
const THERMAL_PROJECTION_NORMAL_CUTOFF = 0.5;
const THERMAL_CAMERA_IMAGE_MARKER_ASPECT = 4 / 3;
const THERMAL_CAMERA_IMAGE_MARKER_MIN_HEIGHT = 0.12;
const THERMAL_CAMERA_IMAGE_MARKER_MAX_HEIGHT = 0.34;
const THERMAL_CAMERA_IMAGE_MARKER_HEIGHT_RATIO = 0.16;
const THERMAL_CAMERA_MARKER_SCALE = 1;
const THERMAL_CAMERA_MARKER_HOVER_SCALE = 1.06;
const THERMAL_CAMERA_MARKER_SELECTED_SCALE = 1.12;
const WORLD_UP_VECTOR = new THREE.Vector3(0, 1, 0);
const FALLBACK_ROLL_UP_VECTOR = new THREE.Vector3(1, 0, 0);

export function useThermalCameraPreviewPlanes({
  cameras = [],
  enabled = false,
  framesByCameraId = {},
  hoveredCameraId,
  comparisonPose,
  requireSelection = false,
  renderTexturePreview = true,
  scene,
  selectedCameraId,
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
      .filter((entry) => !renderTexturePreview || entry.frame);

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
      const coverageGridSegments = selectedCameraId
        ? COVERAGE_GRID_SEGMENTS_SELECTED
        : COVERAGE_GRID_SEGMENTS_ALL;
      const planeGroup = createPreviewPlaneGroup({
        camera,
        coverageGridSegments,
        coverageRaycastTargets,
        frame,
        index,
        renderTexturePreview,
        targetObject,
        targetMetrics,
        totalCount: cameras.length,
        selectedCameraId,
      });

      if (planeGroup) {
        group.add(planeGroup);
      }

      if (
        !renderTexturePreview &&
        comparisonPose &&
        selectedCameraId &&
        camera.cameraId === selectedCameraId
      ) {
        const comparisonGroup = createThermalComparisonPoseGroup({
          aspectRatio: getThermalFrameAspectRatio(frame),
          camera,
          coverageGridSegments,
          coverageRaycastTargets,
          currentPose: resolveThermalCameraPose({
            camera,
            index,
            targetMetrics,
            totalCount: cameras.length,
          }),
          frame,
          index,
          poseConfig: comparisonPose,
          targetMetrics,
          targetObject,
          totalCount: cameras.length,
        });

        if (comparisonGroup) {
          group.add(comparisonGroup);
        }
      }
    });

    if (!group.children.length) {
      disposeObject3D(group);
      groupRef.current = null;
      return undefined;
    }

    scene.add(group);
    groupRef.current = group;
    invalidateThreeScene(scene, "thermal-preview-planes");

    return () => {
      scene.remove(group);
      groupRef.current = null;
      disposeObject3D(group);
      invalidateThreeScene(scene, "thermal-preview-planes-cleanup");
    };
  }, [
    cameras,
    enabled,
    framesByCameraId,
    comparisonPose,
    requireSelection,
    renderTexturePreview,
    scene,
    selectedCameraId,
    targetObject,
  ]);

  useEffect(() => {
    updateThermalCameraInteractionState({
      group: groupRef.current,
      hoveredCameraId,
      selectedCameraId,
    });
    invalidateThreeScene(
      groupRef.current?.parent,
      "thermal-preview-interaction",
    );
  }, [hoveredCameraId, selectedCameraId]);
}

function createPreviewPlaneGroup({
  camera,
  coverageGridSegments,
  coverageRaycastTargets,
  frame,
  index,
  renderTexturePreview,
  targetObject,
  targetMetrics,
  totalCount,
  selectedCameraId,
}) {
  const pose = resolveThermalCameraPose({
    camera,
    index,
    targetMetrics,
    totalCount,
  });
  const { lookAt, position } = pose;
  const aspectRatio = getThermalFrameAspectRatio(frame);
  const viewDirection = lookAt.clone().sub(position).normalize();

  const group = new THREE.Group();
  group.name = `${camera.cameraName} preview`;
  group.userData.cameraId = camera.cameraId;

  const laserVisualState = getCameraLaserVisualState({
    cameraId: camera.cameraId,
    selectedCameraId,
  });
  let texture = null;

  if (renderTexturePreview) {
    const canvas = frame
      ? createThermalCanvasFromFrame(frame, {
          paletteMaxTemperature: frame.maxTemperature,
          paletteMinTemperature: frame.minTemperature,
        })
      : null;

    if (!canvas) {
      return null;
    }

    texture = createThermalTextureFromCanvas(canvas, {
      flipY: false,
    });

    if (!texture) {
      return null;
    }

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
    plane.userData.isThermalCameraHoverScalable = true;

    group.add(plane);
    const border = createPreviewBorder(plane);
    border.userData.cameraId = camera.cameraId;
    border.userData.isThermalCameraHoverScalable = true;
    group.add(border);
  } else {
    group.add(
      createThermalCameraPoseMarker({
        cameraId: camera.cameraId,
        frame,
        label: camera.cameraIndex ?? "",
        pose,
        position,
        targetMetrics,
        visualState: laserVisualState,
      }),
    );

  }

  group.add(
    createProjectionLaserGuide({
      aspectRatio,
      cameraId: camera.cameraId,
      cameraName: camera.cameraName,
      coverageGridSegments,
      coverageRaycastTargets,
      frame,
      pose,
      targetMetrics,
      targetObject,
      texture,
      visualState: laserVisualState,
    }),
  );

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

function getThermalFrameAspectRatio(frame) {
  const width = Number(frame?.width);
  const height = Number(frame?.height);

  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? width / height
    : 4 / 3;
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

function createThermalComparisonPoseGroup({
  aspectRatio,
  camera,
  coverageGridSegments,
  coverageRaycastTargets,
  currentPose,
  frame,
  index,
  poseConfig,
  targetMetrics,
  targetObject,
  totalCount,
}) {
  if (!camera?.cameraId || !poseConfig) {
    return null;
  }

  const comparisonCamera = {
    ...camera,
    worldPose: poseConfig,
  };
  const pose = resolveThermalCameraPose({
    camera: comparisonCamera,
    index,
    targetMetrics,
    totalCount,
  });

  if (
    !pose?.position?.isVector3 ||
    !pose?.lookAt?.isVector3 ||
    pose.position.distanceToSquared(pose.lookAt) <= 0
  ) {
    return null;
  }

  const visualState = getThermalComparisonLaserVisualState();
  const group = new THREE.Group();
  group.name = `${camera.cameraName} thermal comparison clone`;
  group.userData.cameraId = camera.cameraId;
  group.userData.isThermalProjectionComparison = true;

  group.add(
    createThermalCameraPoseMarker({
      cameraId: camera.cameraId,
      frame,
      isComparison: true,
      label: "BEFORE",
      pose,
      position: pose.position,
      targetMetrics,
      visualState,
    }),
  );

  group.add(
    createProjectionLaserGuide({
      aspectRatio,
      cameraId: camera.cameraId,
      cameraName: `${camera.cameraName} before`,
      coverageGridSegments,
      coverageRaycastTargets,
      frame,
      isComparison: true,
      pose,
      targetMetrics,
      targetObject,
      texture: null,
      visualState,
    }),
  );

  if (currentPose?.position?.isVector3) {
    group.add(
      createThermalComparisonDeltaLine({
        cameraId: camera.cameraId,
        currentPosition: currentPose.position,
        previousPosition: pose.position,
      }),
    );
  }

  return group;
}

function createThermalCameraPoseMarker({
  cameraId,
  frame,
  isComparison = false,
  label,
  pose,
  position,
  targetMetrics,
  visualState,
}) {
  const markerSize = getThermalCameraImageMarkerSize({
    aspectRatio: getThermalFrameAspectRatio(frame),
    targetMetrics,
  });
  const group = new THREE.Group();
  group.name = isComparison
    ? `thermal camera comparison marker ${cameraId}`
    : `thermal camera marker ${cameraId}`;
  group.position.copy(position);
  group.userData.cameraId = cameraId;
  group.userData.isThermalProjectionComparison = isComparison;
  group.userData.isThermalCameraPoseMarkerRoot = !isComparison;

  const forward =
    pose?.lookAt?.isVector3 && position.distanceToSquared(pose.lookAt) > 0
      ? pose.lookAt.clone().sub(position).normalize()
      : new THREE.Vector3(0, 0, 1);
  applyStableThermalImageMarkerRotation(group, forward);

  const texture = getThermalCameraMarkerTexture({
    cameraId,
    frame,
    isComparison,
  });
  const imagePlane = createThermalCameraImagePlane({
    cameraId,
    isComparison,
    markerSize,
    renderOrder: isComparison ? 47 : 37,
    side: THREE.FrontSide,
    texture,
    visualState,
  });
  imagePlane.name = isComparison
    ? "thermal camera comparison image marker"
    : "thermal camera image marker";
  group.add(imagePlane);

  const backImagePlane = createThermalCameraImagePlane({
    cameraId,
    flipHorizontal: true,
    isComparison,
    markerSize,
    renderOrder: isComparison ? 47 : 37,
    side: THREE.BackSide,
    texture,
    visualState,
  });
  backImagePlane.name = isComparison
    ? "thermal camera comparison image marker back"
    : "thermal camera image marker back";
  group.add(backImagePlane);

  const frameLine = createThermalCameraImageFrame({
    cameraId,
    isComparison,
    markerSize,
    visualState,
  });
  group.add(frameLine);

  if (label) {
    const labelPlane = createThermalCameraPoseLabel({
      isComparison,
      label: String(label),
      markerSize,
      side: THREE.FrontSide,
      visualState,
    });
    labelPlane.position.set(
      -markerSize.width / 2 + markerSize.badgeWidth / 2 + markerSize.badgePad,
      markerSize.height / 2 - markerSize.badgeHeight / 2 - markerSize.badgePad,
      markerSize.depthOffset,
    );
    labelPlane.userData.cameraId = cameraId;
    labelPlane.userData.isThermalProjectionComparison = isComparison;
    group.add(labelPlane);

    const backLabelPlane = createThermalCameraPoseLabel({
      flipHorizontal: true,
      isComparison,
      label: String(label),
      markerSize,
      side: THREE.BackSide,
      visualState,
    });
    backLabelPlane.position.set(
      markerSize.width / 2 - markerSize.badgeWidth / 2 - markerSize.badgePad,
      markerSize.height / 2 - markerSize.badgeHeight / 2 - markerSize.badgePad,
      -markerSize.depthOffset,
    );
    backLabelPlane.userData.cameraId = cameraId;
    backLabelPlane.userData.isThermalProjectionComparison = isComparison;
    group.add(backLabelPlane);
  }

  return group;
}

function getThermalCameraImageMarkerSize({ aspectRatio, targetMetrics }) {
  const height = THREE.MathUtils.clamp(
    targetMetrics.extent * THERMAL_CAMERA_IMAGE_MARKER_HEIGHT_RATIO,
    THERMAL_CAMERA_IMAGE_MARKER_MIN_HEIGHT,
    THERMAL_CAMERA_IMAGE_MARKER_MAX_HEIGHT,
  );
  const width =
    height *
    (Number.isFinite(aspectRatio) && aspectRatio > 0
      ? aspectRatio
      : THERMAL_CAMERA_IMAGE_MARKER_ASPECT);

  return {
    badgeHeight: height * 0.22,
    badgePad: height * 0.055,
    badgeWidth: width * 0.34,
    depthOffset: Math.max(0.001, height * 0.018),
    height,
    width,
  };
}

function getThermalCameraMarkerTexture({ cameraId, frame, isComparison }) {
  const canvas = frame
    ? createThermalCanvasFromFrame(frame, {
        paletteMaxTemperature: frame.maxTemperature,
        paletteMinTemperature: frame.minTemperature,
      })
    : createThermalCameraFallbackCanvas(cameraId, isComparison);
  const texture = createThermalTextureFromCanvas(canvas, {
    flipY: false,
  });

  if (texture) {
    texture.name = `thermal-camera-marker-texture-${cameraId}`;
  }

  return texture;
}

function createThermalCameraImagePlane({
  cameraId,
  flipHorizontal = false,
  isComparison = false,
  markerSize,
  renderOrder,
  side,
  texture,
  visualState,
}) {
  const geometry = new THREE.PlaneGeometry(markerSize.width, markerSize.height);
  if (flipHorizontal) {
    flipGeometryUvHorizontally(geometry);
  }

  const plane = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: true,
      depthWrite: false,
      map: texture,
      opacity: visualState.markerImageOpacity ?? 0.92,
      side,
      toneMapped: false,
      transparent: true,
    }),
  );
  plane.renderOrder = renderOrder;
  plane.userData.cameraId = cameraId;
  plane.userData.isThermalProjectionLaserVisual = true;
  plane.userData.isThermalProjectionComparison = isComparison;
  plane.userData.thermalProjectionLaserRole = "marker-image";
  plane.raycast = () => {};

  return plane;
}

function createThermalCameraImageFrame({
  cameraId,
  isComparison,
  markerSize,
  visualState,
}) {
  const halfWidth = markerSize.width / 2;
  const halfHeight = markerSize.height / 2;
  const depthOffset = markerSize.depthOffset * 1.2;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfWidth, -halfHeight, depthOffset),
    new THREE.Vector3(halfWidth, -halfHeight, depthOffset),
    new THREE.Vector3(halfWidth, halfHeight, depthOffset),
    new THREE.Vector3(-halfWidth, halfHeight, depthOffset),
    new THREE.Vector3(-halfWidth, -halfHeight, depthOffset),
  ]);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: visualState.color,
      depthTest: true,
      depthWrite: false,
      opacity: visualState.markerFrameOpacity ?? 0.88,
      transparent: true,
    }),
  );
  line.name = isComparison
    ? "thermal camera comparison image frame"
    : "thermal camera image frame";
  line.renderOrder = isComparison ? 48 : 38;
  line.userData.cameraId = cameraId;
  line.userData.isThermalProjectionLaserVisual = true;
  line.userData.isThermalProjectionComparison = isComparison;
  line.userData.thermalProjectionLaserRole = "marker-frame";
  line.raycast = () => {};

  return line;
}

function createThermalCameraFallbackCanvas(cameraId, isComparison) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, isComparison ? "#431407" : "#020617");
    gradient.addColorStop(0.38, "#1e3a8a");
    gradient.addColorStop(0.72, "#dc2626");
    gradient.addColorStop(1, "#facc15");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(2, 6, 23, 0.64)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = isComparison ? "#f97316" : "#67e8f9";
    context.lineWidth = 8;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    context.font = "700 36px Arial, sans-serif";
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`THERMAL ${cameraId ?? ""}`, canvas.width / 2, canvas.height / 2);
  }

  return canvas;
}

function applyStableThermalImageMarkerRotation(marker, forward) {
  const upSeed =
    Math.abs(forward.dot(WORLD_UP_VECTOR)) > 0.96
      ? FALLBACK_ROLL_UP_VECTOR
      : WORLD_UP_VECTOR;
  const right = new THREE.Vector3().crossVectors(upSeed, forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();
  const rotationMatrix = new THREE.Matrix4().makeBasis(right, up, forward);

  marker.quaternion.setFromRotationMatrix(rotationMatrix);
}

function flipGeometryUvHorizontally(geometry) {
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, 1 - uv.getX(index));
  }
  uv.needsUpdate = true;
}

function createThermalCameraPoseLabel({
  flipHorizontal = false,
  isComparison,
  label,
  markerSize,
  side,
  visualState,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 80;

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = isComparison
      ? "rgba(124, 45, 18, 0.86)"
      : "rgba(8, 47, 73, 0.82)";
    context.strokeStyle = `#${visualState.color.toString(16).padStart(6, "0")}`;
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect?.(20, 18, 152, 44, 12);
    if (!context.roundRect) {
      context.rect(20, 18, 152, 44);
    }
    context.fill();
    context.stroke();
    context.font = "700 24px Arial, sans-serif";
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 96, 40);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const geometry = new THREE.PlaneGeometry(
    markerSize.badgeWidth,
    markerSize.badgeHeight,
  );
  if (flipHorizontal) {
    flipGeometryUvHorizontally(geometry);
  }

  const labelMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      map: texture,
      side,
      transparent: true,
    }),
  );
  labelMesh.name = isComparison
    ? "thermal camera comparison label"
    : "thermal camera label";
  labelMesh.renderOrder = isComparison ? 49 : 39;
  labelMesh.userData.isThermalProjectionLaserVisual = true;
  labelMesh.userData.thermalProjectionLaserRole = "marker-label";
  return labelMesh;
}

function createThermalComparisonDeltaLine({
  cameraId,
  currentPosition,
  previousPosition,
}) {
  if (previousPosition.distanceToSquared(currentPosition) <= 0.000001) {
    return new THREE.Group();
  }

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      previousPosition.clone(),
      currentPosition.clone(),
    ]),
    new THREE.LineBasicMaterial({
      color: CAMERA_LASER_COMPARISON_DELTA_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.94,
      transparent: true,
    }),
  );

  line.name = `thermal camera comparison delta ${cameraId}`;
  line.renderOrder = 49;
  line.userData.cameraId = cameraId;
  line.userData.isThermalProjectionComparison = true;
  line.raycast = () => {};

  return line;
}

function createProjectionLaserGuide({
  aspectRatio,
  cameraId,
  cameraName,
  coverageGridSegments,
  coverageRaycastTargets,
  frame,
  isComparison = false,
  pose,
  targetMetrics,
  targetObject,
  texture,
  visualState,
}) {
  const group = new THREE.Group();
  group.name = `${cameraName ?? frame?.cameraName ?? "Thermal camera"} thermal projection laser guide`;
  group.userData.isThermalProjectionLaserGuide = true;
  group.userData.isThermalProjectionComparison = isComparison;

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
    isComparison,
  );

  if (coverageFill) {
    group.add(coverageFill);
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
  isComparison = false,
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
  mesh.userData.isThermalProjectionComparison = isComparison;
  mesh.userData.thermalProjectionLaserRole = texture
    ? "coverage-texture"
    : "coverage-fill";

  return mesh;
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
    coverageTextureOpacity: isHovered ? 0.88 : isSelected ? 0.8 : 0.68,
    markerFrameOpacity: isHovered ? 1 : isSelected ? 0.96 : 0.84,
    markerImageOpacity: isHovered ? 1 : isSelected ? 0.94 : 0.86,
    markerLabelOpacity: isHovered ? 1 : isSelected ? 0.96 : 0.9,
  };
}

function getThermalComparisonLaserVisualState() {
  return {
    color: CAMERA_LASER_COMPARISON_COLOR,
    coverageFillOpacity: 0.22,
    coverageTextureOpacity: 0,
    markerFrameOpacity: 0.92,
    markerImageOpacity: 0.74,
    markerLabelOpacity: 0.92,
  };
}

function updateThermalCameraInteractionState({
  group,
  hoveredCameraId,
  selectedCameraId,
}) {
  updateThermalProjectionLaserVisualState({
    group,
    hoveredCameraId,
    selectedCameraId,
  });

  if (!group) {
    return;
  }

  group.traverse?.((object) => {
    if (
      object.userData?.isThermalProjectionComparison ||
      (!object.userData?.isThermalCameraHoverScalable &&
        !object.userData?.isThermalCameraPoseMarkerRoot)
    ) {
      return;
    }

    const cameraId = object.userData?.cameraId;
    const isHovered = Boolean(hoveredCameraId && cameraId === hoveredCameraId);
    const isSelected = Boolean(selectedCameraId && cameraId === selectedCameraId);
    const scale = isSelected
      ? THERMAL_CAMERA_MARKER_SELECTED_SCALE
      : isHovered
      ? THERMAL_CAMERA_MARKER_HOVER_SCALE
      : THERMAL_CAMERA_MARKER_SCALE;

    object.scale.setScalar(scale);
  });
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
    if (
      object.userData?.isThermalProjectionComparison ||
      !object.userData?.isThermalProjectionLaserVisual ||
      !object.material
    ) {
      return;
    }

    const visualState = getCameraLaserVisualState({
      cameraId: object.userData.cameraId,
      hoveredCameraId,
      selectedCameraId,
    });
    const opacityByRole = {
      "coverage-fill": visualState.coverageFillOpacity,
      "coverage-texture": visualState.coverageTextureOpacity,
      "marker-frame": visualState.markerFrameOpacity,
      "marker-image": visualState.markerImageOpacity,
      "marker-label": visualState.markerLabelOpacity,
    };
    const shouldTintMaterial =
      !["coverage-texture", "marker-image", "marker-label"].includes(
        object.userData.thermalProjectionLaserRole,
      );
    const opacity =
      opacityByRole[object.userData.thermalProjectionLaserRole] ??
      visualState.markerFrameOpacity;

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
