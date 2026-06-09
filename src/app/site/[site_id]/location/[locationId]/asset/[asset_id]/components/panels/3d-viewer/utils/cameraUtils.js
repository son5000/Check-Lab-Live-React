import * as THREE from "three";
import { disposeObject3D } from "./threeDisposal";

const CAMERA_MARKER_COLOR = 0x22d3ee;
const CAMERA_MARKER_HOVER_COLOR = 0xfacc15;
const CAMERA_MARKER_SELECTED_COLOR = 0xa3e635;
const CAMERA_MARKER_SCALE = 1;
const CAMERA_MARKER_HOVER_SCALE = 1.06;
const CAMERA_MARKER_SELECTED_SCALE = 1.12;
const CAMERA_MARKER_HIT_RADIUS = 5.8;
const CAMERA_MARKER_PICK_RADIUS_PX = 42;
const CAMERA_MARKER_STICKY_RADIUS_PX = 76;
const CAMERA_COMPARISON_COLOR = 0xf97316;
const CAMERA_COMPARISON_DELTA_COLOR = 0xfacc15;
const CAMERA_IMAGE_MARKER_ASPECT = 16 / 9;
const CAMERA_IMAGE_MARKER_MIN_HEIGHT = 6.5;
const CAMERA_IMAGE_MARKER_MAX_HEIGHT = 14;
const WORLD_UP_VECTOR = new THREE.Vector3(0, 1, 0);
const FALLBACK_ROLL_UP_VECTOR = new THREE.Vector3(0, 0, 1);
const CAMERA_VISUALIZATION_PREFIXES = [
  "viewer-camera-comparison-",
  "viewer-camera-fov-",
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
  customTargets = {},
  editComparison,
) {
  const knownCameraIds = new Set(cameras.map((camera) => camera.id));
  const visibleCameraIdSet = new Set(visibleCameraIds);

  findCameraVisualizationObjects(scene)
    .filter((object) => !knownCameraIds.has(object.userData.cameraId))
    .forEach((object) => {
      scene.remove(object);
      disposeObject3D(object);
    });
  hideCameraComparisonObjects(scene);

  cameras.forEach((camera) => {
    const cameraId = camera.id;
    const isSelected = cameraId === selectedCameraId;
    const isVisible = visibleCameraIdSet.has(cameraId);
    const position = customPositions?.[cameraId] ?? camera.position;
    const target = customTargets?.[cameraId] ?? camera.target;
    const fov = customFovs?.[cameraId] ?? camera.fov ?? 60;
    const resolvedCamera = {
      ...camera,
      fov,
      position,
      target,
    };
    removeVisualizationObject(scene, `viewer-camera-fov-${cameraId}`);

    const marker = getOrReplaceVisualizationObject({
      cacheKey: getCameraImageMarkerKey(resolvedCamera),
      createObject: () => createCameraMarker(resolvedCamera, cameraId),
      name: `viewer-camera-marker-${cameraId}`,
      scene,
    });
    applyCameraMarkerTransform(marker, resolvedCamera, position);
    marker.visible = isVisible;
    applyCameraMarkerVisualState(marker, isSelected, false);

    updateCameraComparisonObjects({
      camera,
      cameraId,
      currentPosition: position,
      editComparison,
      isSelected,
      isVisible,
      scene,
    });
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

function createCameraMarker(camera, cameraId) {
  const group = new THREE.Group();
  const size = getCameraImageMarkerSize(camera.fov);
  const texture = getCameraMarkerTexture(camera, cameraId);

  group.name = `viewer-camera-marker-${cameraId}`;
  group.userData.cameraId = cameraId;
  group.userData.isCameraMarker = true;
  group.userData.isCameraVisualization = true;
  group.userData.isInteractive = true;

  const imagePlane = createCameraImagePlane({
    cameraId,
    side: THREE.FrontSide,
    size,
    texture,
  });
  imagePlane.name = `viewer-camera-marker-image-${cameraId}`;
  group.add(imagePlane);

  const backImagePlane = createCameraImagePlane({
    cameraId,
    flipHorizontal: true,
    side: THREE.BackSide,
    size,
    texture,
  });
  backImagePlane.name = `viewer-camera-marker-image-back-${cameraId}`;
  group.add(backImagePlane);

  const frame = createCameraImageFrame(cameraId, size);
  group.add(frame);

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

  const badge = createCameraImageBadge(cameraId, {
    side: THREE.FrontSide,
  });
  badge.name = `viewer-camera-marker-label-${cameraId}`;
  badge.position.set(
    -size.width / 2 + 1.45,
    size.height / 2 - 0.95,
    0.2,
  );
  badge.userData.cameraId = cameraId;
  badge.userData.isCameraMarkerLabel = true;
  group.add(badge);

  const backBadge = createCameraImageBadge(cameraId, {
    flipHorizontal: true,
    side: THREE.BackSide,
  });
  backBadge.name = `viewer-camera-marker-label-back-${cameraId}`;
  backBadge.position.set(size.width / 2 - 1.45, size.height / 2 - 0.95, -0.2);
  backBadge.userData.cameraId = cameraId;
  backBadge.userData.isCameraMarkerLabel = true;
  group.add(backBadge);

  return group;
}

function createCameraImagePlane({
  cameraId,
  flipHorizontal = false,
  side,
  size,
  texture,
}) {
  const geometry = new THREE.PlaneGeometry(size.width, size.height);
  if (flipHorizontal) {
    flipGeometryUvHorizontally(geometry);
  }

  const imagePlane = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
      map: texture,
      opacity: 0.92,
      side,
      transparent: true,
    }),
  );
  imagePlane.userData.cameraId = cameraId;
  imagePlane.userData.isCameraMarkerVisual = true;
  imagePlane.userData.isCameraImageMarker = true;
  imagePlane.raycast = () => {};
  imagePlane.renderOrder = 9;

  return imagePlane;
}

function flipGeometryUvHorizontally(geometry) {
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, 1 - uv.getX(index));
  }
  uv.needsUpdate = true;
}

function createCameraImageFrame(cameraId, size) {
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfWidth, -halfHeight, 0.1),
    new THREE.Vector3(halfWidth, -halfHeight, 0.1),
    new THREE.Vector3(halfWidth, halfHeight, 0.1),
    new THREE.Vector3(-halfWidth, halfHeight, 0.1),
    new THREE.Vector3(-halfWidth, -halfHeight, 0.1),
  ]);
  const frame = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: CAMERA_MARKER_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.84,
      transparent: true,
    }),
  );

  frame.name = `viewer-camera-marker-frame-${cameraId}`;
  frame.userData.cameraId = cameraId;
  frame.userData.isCameraMarkerFrame = true;
  frame.raycast = () => {};
  frame.renderOrder = 10;

  return frame;
}

function getCameraMarkerTexture(camera, cameraId) {
  const imagePath = camera.sampleImagePath;

  if (!imagePath) {
    return createCameraImageFallbackTexture(cameraId);
  }

  const texture = new THREE.TextureLoader().load(
    imagePath,
    (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.needsUpdate = true;
    },
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = `viewer-camera-marker-texture-${cameraId}`;
  return texture;
}

function createCameraImageFallbackTexture(cameraId) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const context = canvas.getContext("2d");

  if (context) {
    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#22d3ee";
    context.lineWidth = 8;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    context.font = "700 48px Arial, sans-serif";
    context.fillStyle = "#cffafe";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`CAM ${cameraId}`, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function getCameraImageMarkerSize(fov = 60) {
  const normalizedFov = THREE.MathUtils.clamp(toFiniteNumber(fov, 60), 25, 95);
  const height = THREE.MathUtils.clamp(
    6.8 + (normalizedFov - 25) * 0.1,
    CAMERA_IMAGE_MARKER_MIN_HEIGHT,
    CAMERA_IMAGE_MARKER_MAX_HEIGHT,
  );

  return {
    height,
    width: height * CAMERA_IMAGE_MARKER_ASPECT,
  };
}

function getCameraImageMarkerKey(camera) {
  return [
    camera.id,
    camera.sampleImagePath ?? "",
    camera.position?.x ?? 0,
    camera.position?.y ?? 0,
    camera.position?.z ?? 0,
    camera.target?.x ?? 0,
    camera.target?.y ?? 0,
    camera.target?.z ?? 0,
    camera.fov ?? 60,
  ].join(":");
}

function applyCameraMarkerTransform(marker, camera, position) {
  marker.position.set(position.x, position.y, position.z);

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

  applyStableImagePlaneRotation(marker, direction);
}

function applyStableImagePlaneRotation(marker, forward) {
  const upSeed =
    Math.abs(forward.dot(WORLD_UP_VECTOR)) > 0.96
      ? FALLBACK_ROLL_UP_VECTOR
      : WORLD_UP_VECTOR;
  const right = new THREE.Vector3().crossVectors(upSeed, forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();
  const rotationMatrix = new THREE.Matrix4().makeBasis(right, up, forward);

  marker.quaternion.setFromRotationMatrix(rotationMatrix);
}

function updateCameraComparisonObjects({
  camera,
  cameraId,
  currentPosition,
  editComparison,
  isSelected,
  isVisible,
  scene,
}) {
  if (
    !isVisible ||
    !isSelected ||
    editComparison?.cameraId !== cameraId ||
    !editComparison.position
  ) {
    return;
  }

  const previousPosition = normalizeVector3(editComparison.position);

  const marker = getOrCreateVisualizationObject({
    createObject: () => createCameraComparisonMarker(cameraId),
    name: `viewer-camera-comparison-marker-${cameraId}`,
    scene,
  });
  marker.position.set(
    previousPosition.x,
    previousPosition.y,
    previousPosition.z,
  );
  marker.visible = true;

  const current = normalizeVector3(currentPosition);
  const deltaKey = [
    previousPosition.x,
    previousPosition.y,
    previousPosition.z,
    current.x,
    current.y,
    current.z,
  ].join(":");
  const deltaLine = getOrReplaceVisualizationObject({
    cacheKey: deltaKey,
    createObject: () =>
      createCameraComparisonDeltaLine(cameraId, previousPosition, current),
    name: `viewer-camera-comparison-delta-${cameraId}`,
    scene,
  });
  deltaLine.visible = getVectorDistance(previousPosition, current) > 0.001;
}

function createCameraComparisonMarker(cameraId) {
  const group = new THREE.Group();
  group.name = `viewer-camera-comparison-marker-${cameraId}`;
  group.userData.cameraId = cameraId;
  group.userData.isCameraComparison = true;
  group.userData.isCameraComparisonMarker = true;
  group.userData.isInteractive = false;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(3.1, 24, 16),
    new THREE.MeshPhongMaterial({
      color: CAMERA_COMPARISON_COLOR,
      emissive: CAMERA_COMPARISON_COLOR,
      emissiveIntensity: 0.95,
      opacity: 0.58,
      transparent: true,
    }),
  );
  sphere.name = `viewer-camera-comparison-marker-sphere-${cameraId}`;
  sphere.userData.cameraId = cameraId;
  sphere.userData.isCameraComparison = true;
  sphere.raycast = () => {};
  group.add(sphere);

  const label = createCameraComparisonLabel();
  label.name = `viewer-camera-comparison-marker-label-${cameraId}`;
  label.position.set(0, 6.1, 0);
  label.userData.cameraId = cameraId;
  label.userData.isCameraComparison = true;
  group.add(label);

  return group;
}

function createCameraComparisonDeltaLine(cameraId, previousPosition, currentPosition) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(previousPosition.x, previousPosition.y, previousPosition.z),
    new THREE.Vector3(currentPosition.x, currentPosition.y, currentPosition.z),
  ]);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: CAMERA_COMPARISON_DELTA_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.92,
      transparent: true,
    }),
  );

  line.name = `viewer-camera-comparison-delta-${cameraId}`;
  line.userData.cameraId = cameraId;
  line.userData.isCameraComparison = true;
  line.raycast = () => {};
  line.renderOrder = 11;
  return line;
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

function removeVisualizationObject(scene, name) {
  const existing = scene.getObjectByName(name);

  if (!existing) {
    return;
  }

  scene.remove(existing);
  disposeObject3D(existing);
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

function applyCameraMarkerVisualState(marker, isSelected, isHovered) {
  const images = marker.children?.filter(
    (child) => child.userData?.isCameraMarkerVisual,
  );
  const frame = marker.children?.find(
    (child) => child.userData?.isCameraMarkerFrame,
  );
  const labels = marker.children?.filter(
    (child) => child.userData?.isCameraMarkerLabel,
  );
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

  marker.scale.setScalar(scale);

  (images?.length ? images : [marker]).forEach((image) => {
    const imageMaterial = image.material;
    if (!imageMaterial) {
      return;
    }

    imageMaterial.opacity = isSelected || isHovered ? 1 : 0.92;
    imageMaterial.color.setHex(0xffffff);
    imageMaterial.needsUpdate = true;
  });

  if (frame?.material) {
    frame.material.color.setHex(color);
    frame.material.opacity = isSelected || isHovered ? 1 : 0.84;
    frame.material.needsUpdate = true;
  }

  const labelScale = isHovered || isSelected ? 1.08 : 1;
  labels?.forEach((label) => {
    label.scale.set(labelScale, labelScale, 1);
  });
}

function createCameraImageBadge(cameraId, { flipHorizontal = false, side } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 96;

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(2, 6, 23, 0.86)";
    context.strokeStyle = "rgba(103, 232, 249, 0.92)";
    context.lineWidth = 5;
    context.beginPath();
    roundRect(context, 14, 20, 164, 56, 14);
    context.fill();
    context.stroke();
    context.font = "700 30px Arial, sans-serif";
    context.fillStyle = "#ecfeff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`CAM ${cameraId}`, 96, 50);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const geometry = new THREE.PlaneGeometry(3.4, 1.7);
  if (flipHorizontal) {
    flipGeometryUvHorizontally(geometry);
  }

  const badge = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      map: texture,
      side,
      transparent: true,
    }),
  );
  badge.raycast = () => {};
  badge.renderOrder = 10;
  return badge;
}

function createCameraComparisonLabel() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 96;

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(124, 45, 18, 0.86)";
    context.strokeStyle = "rgba(251, 191, 36, 0.92)";
    context.lineWidth = 5;
    context.beginPath();
    roundRect(context, 18, 22, 156, 52, 14);
    context.fill();
    context.stroke();
    context.font = "700 28px Arial, sans-serif";
    context.fillStyle = "#fff7ed";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("BEFORE", 96, 49);
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
  sprite.scale.set(7.2, 3.6, 1);
  sprite.renderOrder = 12;
  return sprite;
}

function hideCameraComparisonObjects(scene) {
  findCameraComparisonObjects(scene).forEach((object) => {
    object.visible = false;
  });
}

function findCameraVisualizationObjects(scene) {
  return scene.children.filter((object) =>
    CAMERA_VISUALIZATION_PREFIXES.some((prefix) =>
      object.name?.startsWith(prefix),
    ),
  );
}

function findCameraComparisonObjects(scene) {
  return scene.children.filter((object) =>
    object.name?.startsWith("viewer-camera-comparison-"),
  );
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

function normalizeVector3(vector = {}) {
  return {
    x: toFiniteNumber(vector.x),
    y: toFiniteNumber(vector.y),
    z: toFiniteNumber(vector.z),
  };
}

function getVectorDistance(first, second) {
  return Math.hypot(
    toFiniteNumber(first?.x) - toFiniteNumber(second?.x),
    toFiniteNumber(first?.y) - toFiniteNumber(second?.y),
    toFiniteNumber(first?.z) - toFiniteNumber(second?.z),
  );
}

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function roundRect(context, x, y, width, height, radius) {
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
}
