import * as THREE from "three";
import { disposeObject3D } from "./threeDisposal";

const CAMERA_MARKER_COLOR = 0x22d3ee;
const CAMERA_MARKER_HOVER_COLOR = 0xfacc15;
const CAMERA_MARKER_SELECTED_COLOR = 0xa3e635;
const CAMERA_MARKER_SCALE = 1;
const CAMERA_MARKER_HOVER_SCALE = 1.22;
const CAMERA_MARKER_SELECTED_SCALE = 1.38;
const CAMERA_MARKER_HIT_RADIUS = 5.8;
const CAMERA_MARKER_PICK_RADIUS_PX = 42;
const CAMERA_MARKER_STICKY_RADIUS_PX = 76;
const CAMERA_FOV_COLOR = 0x00bfff;
const CAMERA_FOV_HOVER_COLOR = 0xfacc15;
const CAMERA_FOV_SELECTED_COLOR = 0xa3e635;
const CAMERA_LASER_COLOR = 0x67e8f9;
const CAMERA_LASER_HOVER_COLOR = 0xfacc15;
const CAMERA_LASER_SELECTED_COLOR = 0xa3e635;
const CAMERA_VISUALIZATION_PREFIXES = [
  "viewer-camera-fov-",
  "viewer-camera-laser-",
  "viewer-camera-marker-",
];

export function removeAllCameraVisualizations(scene) {
  findCameraVisualizationObjects(scene).forEach((object) => {
    scene.remove(object);
    disposeObject3D(object);
  });
}

export function updateCameraVisualizationObjects(
  scene,
  cameras,
  selectedCameraId,
  visibleCameraIds,
  customPositions = {},
  customFovs = {},
  showLaserBeams = true,
) {
  const knownCameraIds = new Set(cameras.map((camera) => camera.id));
  const visibleCameraIdSet = new Set(visibleCameraIds);

  findCameraVisualizationObjects(scene)
    .filter((object) => !knownCameraIds.has(object.userData.cameraId))
    .forEach((object) => {
      scene.remove(object);
      disposeObject3D(object);
    });

  cameras.forEach((camera) => {
    const cameraId = camera.id;
    const isSelected = cameraId === selectedCameraId;
    const isVisible = visibleCameraIdSet.has(cameraId);
    const position = customPositions?.[cameraId] ?? camera.position;
    const fov = customFovs?.[cameraId] ?? camera.fov ?? 60;
    const resolvedCamera = {
      ...camera,
      fov,
      position,
    };
    const transformKey = getCameraTransformKey(resolvedCamera, position);

    const laserBeam = getOrReplaceVisualizationObject({
      cacheKey: transformKey,
      createObject: () =>
        createCameraLaserBeam(resolvedCamera, cameraId, position, isSelected),
      name: `viewer-camera-laser-${cameraId}`,
      scene,
    });
    laserBeam.visible = showLaserBeams && isVisible;
    applyCameraLaserVisualState(laserBeam, isSelected, false);

    const cone = getOrReplaceVisualizationObject({
      cacheKey: transformKey,
      createObject: () =>
        createCameraFOVCone(resolvedCamera, cameraId, isSelected),
      name: `viewer-camera-fov-${cameraId}`,
      scene,
    });
    applyCameraFOVTransform(cone, resolvedCamera, position);
    cone.visible = showLaserBeams && isVisible;
    applyCameraFOVVisualState(cone, isSelected, false);

    const marker = getOrCreateVisualizationObject({
      createObject: () => createCameraMarker(cameraId, isSelected),
      name: `viewer-camera-marker-${cameraId}`,
      scene,
    });
    marker.position.set(position.x, position.y, position.z);
    marker.visible = isVisible;
    applyCameraMarkerVisualState(marker, isSelected, false);
  });
}

export function updateCameraMarkerInteractionState(
  scene,
  selectedCameraId,
  hoveredCameraId,
) {
  scene.traverse((object) => {
    const cameraId = object.userData?.cameraId;
    if (!cameraId) {
      return;
    }

    const isSelected = cameraId === selectedCameraId;
    const isHovered = cameraId === hoveredCameraId;

    if (object.userData?.isCameraMarker) {
      applyCameraMarkerVisualState(object, isSelected, isHovered);
    }

    if (object.userData?.isCameraFOV) {
      applyCameraFOVVisualState(object, isSelected, isHovered);
    }

    if (object.userData?.isCameraLaser) {
      applyCameraLaserVisualState(object, isSelected, isHovered);
    }
  });
}

export function pickCameraMarkerFromClientPoint({
  camera,
  clientPoint,
  previousCameraId,
  renderer,
  scene,
}) {
  if (!camera || !renderer || !scene) {
    return null;
  }

  const bounds = renderer.domElement.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return null;
  }

  const pointer = {
    x: clientPoint.x - bounds.left,
    y: clientPoint.y - bounds.top,
  };
  const candidates = [];
  const worldPosition = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const projectedRadiusPosition = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();

  camera.updateMatrixWorld();
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();

  scene.traverse((object) => {
    if (!object.userData?.isCameraMarker || !isVisibleInHierarchy(object)) {
      return;
    }

    object.getWorldPosition(worldPosition);
    projected.copy(worldPosition).project(camera);

    if (projected.z < -1 || projected.z > 1) {
      return;
    }

    const screenPosition = getScreenPositionFromProjectedPoint(
      projected,
      bounds,
    );
    projectedRadiusPosition
      .copy(worldPosition)
      .addScaledVector(cameraRight, CAMERA_MARKER_HIT_RADIUS)
      .project(camera);
    const radiusScreenPosition = getScreenPositionFromProjectedPoint(
      projectedRadiusPosition,
      bounds,
    );
    const projectedRadiusPx = Math.hypot(
      screenPosition.x - radiusScreenPosition.x,
      screenPosition.y - radiusScreenPosition.y,
    );
    const pickRadius = Math.max(
      CAMERA_MARKER_PICK_RADIUS_PX,
      Number.isFinite(projectedRadiusPx) ? projectedRadiusPx : 0,
    );
    const stickyRadius = Math.max(
      CAMERA_MARKER_STICKY_RADIUS_PX,
      pickRadius + 34,
    );
    const distance = Math.hypot(
      pointer.x - screenPosition.x,
      pointer.y - screenPosition.y,
    );

    candidates.push({
      distance,
      id: object.userData.cameraId,
      pickRadius,
      score: distance / pickRadius,
      stickyRadius,
      z: projected.z,
    });
  });

  if (!candidates.length) {
    return null;
  }

  const previous = candidates.find(
    (candidate) => candidate.id === previousCameraId,
  );
  if (previous && previous.distance <= previous.stickyRadius) {
    return previous.id;
  }

  const nearest = candidates.sort(
    (first, second) =>
      first.score - second.score ||
      first.distance - second.distance ||
      first.z - second.z,
  )[0];

  return nearest.distance <= nearest.pickRadius ? nearest.id : null;
}

function createCameraFOVCone(camera, cameraId, isSelected = false) {
  const fov = camera.fov || 60;
  const far = 100;
  const verticalFov = THREE.MathUtils.degToRad(fov);
  const coneHeight = far;
  const coneRadiusBottom = Math.tan(verticalFov / 2) * far;
  const coneGeometry = new THREE.ConeGeometry(
    coneRadiusBottom,
    coneHeight,
    32,
    1,
    true,
  );

  coneGeometry.rotateX(-Math.PI / 2);
  coneGeometry.translate(0, 0, coneHeight / 2);

  const material = new THREE.MeshPhongMaterial({
    color: isSelected ? CAMERA_FOV_SELECTED_COLOR : CAMERA_FOV_COLOR,
    emissive: isSelected ? CAMERA_FOV_SELECTED_COLOR : CAMERA_FOV_COLOR,
    emissiveIntensity: 0.5,
    opacity: isSelected ? 0.3 : 0.15,
    side: THREE.FrontSide,
    transparent: true,
  });
  const cone = new THREE.Mesh(coneGeometry, material);

  cone.name = `viewer-camera-fov-${cameraId}`;
  cone.userData.cameraId = cameraId;
  cone.userData.isCameraFOV = true;
  cone.userData.isCameraVisualization = true;
  cone.userData.isInteractive = false;
  cone.raycast = () => {};
  cone.castShadow = false;
  cone.receiveShadow = false;
  applyCameraFOVVisualState(cone, isSelected, false);

  return cone;
}

function createCameraMarker(cameraId, isSelected = false) {
  const group = new THREE.Group();

  group.name = `viewer-camera-marker-${cameraId}`;
  group.userData.cameraId = cameraId;
  group.userData.isCameraMarker = true;
  group.userData.isCameraVisualization = true;
  group.userData.isInteractive = true;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 24, 16),
    new THREE.MeshPhongMaterial({
      color: isSelected ? CAMERA_MARKER_SELECTED_COLOR : CAMERA_MARKER_COLOR,
      emissive: isSelected ? CAMERA_MARKER_SELECTED_COLOR : CAMERA_MARKER_COLOR,
      emissiveIntensity: isSelected ? 1.25 : 0.85,
      opacity: isSelected ? 1 : 0.88,
      transparent: true,
    }),
  );
  sphere.name = `viewer-camera-marker-sphere-${cameraId}`;
  sphere.userData.cameraId = cameraId;
  sphere.userData.isCameraMarkerVisual = true;
  sphere.castShadow = false;
  sphere.receiveShadow = false;
  group.add(sphere);

  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(CAMERA_MARKER_HIT_RADIUS, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      colorWrite: false,
      depthWrite: false,
      opacity: 0,
      transparent: true,
    }),
  );
  hitTarget.name = `viewer-camera-marker-hit-${cameraId}`;
  hitTarget.userData.cameraId = cameraId;
  hitTarget.userData.isCameraHitTarget = true;
  hitTarget.renderOrder = -1;
  group.add(hitTarget);

  const label = createCameraNumberLabel(cameraId);
  label.name = `viewer-camera-marker-label-${cameraId}`;
  label.position.set(0, 4.8, 0);
  label.userData.cameraId = cameraId;
  label.userData.isCameraMarkerLabel = true;
  group.add(label);

  applyCameraMarkerVisualState(group, isSelected, false);

  return group;
}

function createCameraLaserBeam(camera, cameraId, position, isSelected = false) {
  const start = new THREE.Vector3(position.x, position.y, position.z);
  const end = new THREE.Vector3(
    camera.target.x,
    camera.target.y,
    camera.target.z,
  );
  const direction = end.clone().sub(start);
  const length = direction.length();
  const group = new THREE.Group();

  group.name = `viewer-camera-laser-${cameraId}`;
  group.userData.cameraId = cameraId;
  group.userData.isCameraLaser = true;
  group.userData.isCameraVisualization = true;
  group.userData.isInteractive = false;

  if (!length) {
    return group;
  }

  direction.normalize();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  [
    createLaserBeamSegment({
      cameraId,
      length,
      opacity: 0.12,
      radius: 1.05,
      role: "glow",
    }),
    createLaserBeamSegment({
      cameraId,
      length,
      opacity: 0.58,
      radius: 0.28,
      role: "core",
    }),
  ].forEach((beam) => {
    beam.position.copy(midpoint);
    beam.quaternion.copy(quaternion);
    group.add(beam);
  });

  applyCameraLaserVisualState(group, isSelected, false);

  return group;
}

function getOrCreateVisualizationObject({ createObject, name, scene }) {
  const existing = scene.getObjectByName(name);
  if (existing) {
    return existing;
  }

  const object = createObject();
  scene.add(object);
  return object;
}

function getOrReplaceVisualizationObject({
  cacheKey,
  createObject,
  name,
  scene,
}) {
  const existing = scene.getObjectByName(name);

  if (existing?.userData.cacheKey === cacheKey) {
    return existing;
  }

  if (existing) {
    scene.remove(existing);
    disposeObject3D(existing);
  }

  const object = createObject();
  object.userData.cacheKey = cacheKey;
  scene.add(object);
  return object;
}

function applyCameraFOVTransform(cone, camera, position) {
  cone.position.set(position.x, position.y, position.z);

  const direction = new THREE.Vector3(
    camera.target.x - position.x,
    camera.target.y - position.y,
    camera.target.z - position.z,
  );
  if (direction.lengthSq() <= 0.0001) {
    direction.set(0, 0, 1);
  } else {
    direction.normalize();
  }
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  cone.quaternion.copy(quaternion);
}

function applyCameraMarkerVisualState(marker, isSelected, isHovered) {
  const sphere =
    marker.children?.find((child) => child.userData?.isCameraMarkerVisual) ??
    marker;
  const label = marker.children?.find(
    (child) => child.userData?.isCameraMarkerLabel,
  );
  const material = sphere.material;
  const color = isSelected
    ? CAMERA_MARKER_SELECTED_COLOR
    : isHovered
    ? CAMERA_MARKER_HOVER_COLOR
    : CAMERA_MARKER_COLOR;
  const scale = isSelected
    ? CAMERA_MARKER_SELECTED_SCALE
    : isHovered
    ? CAMERA_MARKER_HOVER_SCALE
    : CAMERA_MARKER_SCALE;

  sphere.scale.setScalar(scale);

  if (label) {
    const labelScale = isHovered || isSelected ? 4.9 : 4.3;
    label.scale.set(labelScale, labelScale, 1);
  }

  if (!material) {
    return;
  }

  material.color.setHex(color);
  material.opacity = isSelected || isHovered ? 1 : 0.88;
  material.emissive.setHex(color);
  material.emissiveIntensity = isSelected ? 1.35 : isHovered ? 1.15 : 0.85;
  material.needsUpdate = true;
}

function applyCameraFOVVisualState(cone, isSelected, isHovered) {
  if (!cone.material) {
    return;
  }

  const color = isHovered
    ? CAMERA_FOV_HOVER_COLOR
    : isSelected
    ? CAMERA_FOV_SELECTED_COLOR
    : CAMERA_FOV_COLOR;

  cone.material.color.setHex(color);
  cone.material.opacity = isHovered ? 0.34 : isSelected ? 0.3 : 0.15;
  cone.material.emissive.setHex(color);
  cone.material.emissiveIntensity = isHovered ? 1.15 : isSelected ? 1 : 0.5;
  cone.material.needsUpdate = true;
}

function createLaserBeamSegment({ cameraId, length, opacity, radius, role }) {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    16,
    1,
    true,
  );
  const material = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: CAMERA_LASER_COLOR,
    depthWrite: false,
    opacity,
    transparent: true,
  });
  const beam = new THREE.Mesh(geometry, material);

  beam.name = `viewer-camera-laser-${role}-${cameraId}`;
  beam.userData.cameraId = cameraId;
  beam.userData.isCameraLaserVisual = true;
  beam.userData.isInteractive = false;
  beam.userData.laserRole = role;
  beam.raycast = () => {};
  beam.renderOrder = role === "core" ? 6 : 5;

  return beam;
}

function applyCameraLaserVisualState(laser, isSelected, isHovered) {
  const color = isHovered
    ? CAMERA_LASER_HOVER_COLOR
    : isSelected
    ? CAMERA_LASER_SELECTED_COLOR
    : CAMERA_LASER_COLOR;
  const coreOpacity = isHovered ? 0.92 : isSelected ? 0.84 : 0.58;
  const glowOpacity = isHovered ? 0.26 : isSelected ? 0.22 : 0.12;
  const widthScale = isHovered ? 1.28 : isSelected ? 1.16 : 1;

  laser.children?.forEach((beam) => {
    if (!beam.userData?.isCameraLaserVisual || !beam.material) {
      return;
    }

    beam.material.color.setHex(color);
    beam.material.opacity =
      beam.userData.laserRole === "core" ? coreOpacity : glowOpacity;
    beam.material.needsUpdate = true;
    beam.scale.set(widthScale, 1, widthScale);
  });
}

function createCameraNumberLabel(cameraId) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(2, 6, 23, 0.82)";
    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.lineWidth = 8;
    context.beginPath();
    context.arc(64, 64, 46, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.font = "700 58px Arial, sans-serif";
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(cameraId), 64, 67);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      depthTest: false,
      depthWrite: false,
      map: texture,
      transparent: true,
    }),
  );
  sprite.scale.set(4.3, 4.3, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function findCameraVisualizationObjects(scene) {
  return scene.children.filter((object) =>
    CAMERA_VISUALIZATION_PREFIXES.some((prefix) =>
      object.name?.startsWith(prefix),
    ),
  );
}

function getCameraTransformKey(camera, position) {
  return [
    position.x,
    position.y,
    position.z,
    camera.target.x,
    camera.target.y,
    camera.target.z,
    camera.fov || 60,
  ].join(":");
}

function getScreenPositionFromProjectedPoint(projected, bounds) {
  return {
    x: ((projected.x + 1) / 2) * bounds.width,
    y: ((1 - projected.y) / 2) * bounds.height,
  };
}

function isVisibleInHierarchy(object) {
  let current = object;

  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }

  return true;
}
