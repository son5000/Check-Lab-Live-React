import * as THREE from "three";
import { DEFAULT_VIEWER_3D_CONFIG } from "../constants";
import { toVector3 } from "./viewerMath";

const WORLD_PREVIEW_CAMERA_FOV = 50;
const WORLD_PREVIEW_CAMERA_BACK_OFFSET_RATIO = 0.6;
const WORLD_PREVIEW_CAMERA_MIN_BACK_OFFSET = 18;
const WORLD_PREVIEW_CAMERA_PADDING = 1.18;
const WORLD_PREVIEW_MIN_RADIUS = 82;
const WORLD_PREVIEW_DEFAULT_BACK_OFFSET_SCALE = 1;
const WORLD_PREVIEW_SELECTED_CAMERA_FOV = 42;
const WORLD_PREVIEW_SELECTED_CAMERA_BACK_OFFSET_RATIO = 0.48;
const WORLD_PREVIEW_SELECTED_CAMERA_MIN_BACK_OFFSET = 24;
const WORLD_PREVIEW_SELECTED_CAMERA_MAX_BACK_OFFSET = 52;
const WORLD_PREVIEW_SELECTED_CAMERA_MIN_RADIUS = 16;
const WORLD_PREVIEW_SELECTED_CAMERA_MAX_RADIUS = 30;

export function getRuntimeCameraConfig(camera, controls) {
  return {
    fov: camera.fov,
    maxDistance: controls.maxDistance,
    minDistance: controls.minDistance,
    position: toVector3(camera.position),
    target: toVector3(controls.target),
  };
}

export function forceRendererSizeToContainer({ camera, container, renderer }) {
  const bounds = getRendererBounds({ container, renderer });
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const drawingBuffer = renderer.getDrawingBufferSize(new THREE.Vector2());
  const nextBufferWidth = Math.round(width * pixelRatio);
  const nextBufferHeight = Math.round(height * pixelRatio);

  renderer.setPixelRatio(pixelRatio);

  if (
    drawingBuffer.x !== nextBufferWidth ||
    drawingBuffer.y !== nextBufferHeight
  ) {
    renderer.setSize(width, height, false);
  }

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function applyRuntimeCameraConfig(camera, controls, config) {
  camera.position.set(config.position.x, config.position.y, config.position.z);
  camera.fov = config.fov ?? camera.fov;
  camera.updateProjectionMatrix();
  controls.target.set(config.target.x, config.target.y, config.target.z);
  controls.minDistance = config.minDistance ?? controls.minDistance;
  controls.maxDistance = config.maxDistance ?? controls.maxDistance;
  controls.update();
}

export function getWorldPreviewCameraConfig({
  backOffsetScale = WORLD_PREVIEW_DEFAULT_BACK_OFFSET_SCALE,
  container,
  model,
  overviewCamera,
  renderer,
  resolvedCamera,
  selectedCamera,
}) {
  const baseCamera = resolvedCamera ?? DEFAULT_VIEWER_3D_CONFIG.camera;
  const overview = overviewCamera ?? DEFAULT_VIEWER_3D_CONFIG.camera;
  const modelBounds = getWorldPreviewModelBounds(model);
  const selectedCameraPosition = selectedCamera?.position
    ? toWorldPreviewVector3(selectedCamera.position)
    : null;
  const target =
    selectedCameraPosition ?? getWorldPreviewTarget(modelBounds, overview);
  const radius = selectedCameraPosition
    ? getSelectedCameraPreviewRadius(selectedCamera)
    : getWorldPreviewRadius({
        modelBounds,
        selectedCamera,
        target,
      });
  const aspect = getRendererAspect({ container, renderer });
  const fov = selectedCameraPosition
    ? WORLD_PREVIEW_SELECTED_CAMERA_FOV
    : Math.max(WORLD_PREVIEW_CAMERA_FOV, baseCamera.fov ?? 0);
  const verticalFov = THREE.MathUtils.degToRad(fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const fitFov = Math.max(
    THREE.MathUtils.degToRad(24),
    Math.min(verticalFov, horizontalFov),
  );
  const fitDistance =
    (radius * WORLD_PREVIEW_CAMERA_PADDING) / Math.sin(fitFov / 2);
  const minDistance =
    baseCamera.minDistance ?? DEFAULT_VIEWER_3D_CONFIG.camera.minDistance;
  const maxDistance = Math.max(
    baseCamera.maxDistance ?? DEFAULT_VIEWER_3D_CONFIG.camera.maxDistance,
    fitDistance * 1.2,
  );
  const selectedDistance = selectedCamera?.position
    ? toWorldPreviewVector3(selectedCamera.position).distanceTo(target)
    : 0;
  const backOffset = selectedCameraPosition
    ? getSelectedCameraBackOffset(selectedCamera, backOffsetScale)
    : Math.max(
        WORLD_PREVIEW_CAMERA_MIN_BACK_OFFSET,
        radius * WORLD_PREVIEW_CAMERA_BACK_OFFSET_RATIO,
      ) * Math.max(WORLD_PREVIEW_DEFAULT_BACK_OFFSET_SCALE, backOffsetScale);
  const distance = selectedCameraPosition
    ? backOffset
    : selectedCamera
      ? selectedDistance + backOffset
      : Math.max(fitDistance, minDistance + radius * 0.35);
  const direction = getWorldPreviewDirection(selectedCamera, overview);
  const position = target.clone().addScaledVector(direction, distance);

  return {
    ...baseCamera,
    fov,
    maxDistance,
    minDistance,
    position: toVector3(position),
    target: toVector3(target),
  };
}

function getWorldPreviewModelBounds(model) {
  if (!model) {
    return undefined;
  }

  model.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(model);

  if (
    !Number.isFinite(bounds.min.x) ||
    !Number.isFinite(bounds.min.y) ||
    !Number.isFinite(bounds.min.z) ||
    !Number.isFinite(bounds.max.x) ||
    !Number.isFinite(bounds.max.y) ||
    !Number.isFinite(bounds.max.z) ||
    bounds.isEmpty()
  ) {
    return undefined;
  }

  return bounds;
}

function getWorldPreviewTarget(modelBounds, overviewCamera) {
  if (modelBounds) {
    return modelBounds.getCenter(new THREE.Vector3());
  }

  const fallbackTarget =
    overviewCamera?.target ?? DEFAULT_VIEWER_3D_CONFIG.camera.target;

  return new THREE.Vector3(
    fallbackTarget.x,
    fallbackTarget.y,
    fallbackTarget.z,
  );
}

function getWorldPreviewRadius({ modelBounds, selectedCamera, target }) {
  const points = [];

  if (modelBounds) {
    points.push(...getBoxCorners(modelBounds));
  }

  if (!points.length && selectedCamera) {
    const cameraPosition = new THREE.Vector3(
      selectedCamera.position.x,
      selectedCamera.position.y,
      selectedCamera.position.z,
    );
    const cameraTarget = new THREE.Vector3(
      selectedCamera.target.x,
      selectedCamera.target.y,
      selectedCamera.target.z,
    );

    points.push(cameraPosition, cameraTarget);
  }

  const radius = points.reduce(
    (currentRadius, point) => Math.max(currentRadius, point.distanceTo(target)),
    WORLD_PREVIEW_MIN_RADIUS,
  );

  return Math.max(WORLD_PREVIEW_MIN_RADIUS, radius);
}

function getSelectedCameraPreviewRadius(selectedCamera) {
  const cameraDistance = getSelectedCameraTargetDistance(selectedCamera);
  return THREE.MathUtils.clamp(
    cameraDistance * 0.34,
    WORLD_PREVIEW_SELECTED_CAMERA_MIN_RADIUS,
    WORLD_PREVIEW_SELECTED_CAMERA_MAX_RADIUS,
  );
}

function getSelectedCameraBackOffset(selectedCamera, backOffsetScale) {
  const cameraDistance = getSelectedCameraTargetDistance(selectedCamera);
  const baseBackOffset = Math.max(
    WORLD_PREVIEW_SELECTED_CAMERA_MIN_BACK_OFFSET,
    cameraDistance * WORLD_PREVIEW_SELECTED_CAMERA_BACK_OFFSET_RATIO,
  );
  const scaledBackOffset =
    baseBackOffset *
    Math.sqrt(Math.max(WORLD_PREVIEW_DEFAULT_BACK_OFFSET_SCALE, backOffsetScale));

  return Math.min(
    WORLD_PREVIEW_SELECTED_CAMERA_MAX_BACK_OFFSET,
    scaledBackOffset,
  );
}

function getSelectedCameraTargetDistance(selectedCamera) {
  if (!selectedCamera?.position || !selectedCamera?.target) {
    return WORLD_PREVIEW_SELECTED_CAMERA_MIN_BACK_OFFSET;
  }

  return toWorldPreviewVector3(selectedCamera.position).distanceTo(
    toWorldPreviewVector3(selectedCamera.target),
  );
}

function getWorldPreviewDirection(selectedCamera, overviewCamera) {
  if (selectedCamera) {
    const cameraPosition = toWorldPreviewVector3(selectedCamera.position);
    const cameraTarget = toWorldPreviewVector3(selectedCamera.target);
    const selectedDirection = cameraPosition.sub(cameraTarget);

    if (selectedDirection.lengthSq() > 0.0001) {
      if (Math.abs(selectedDirection.y) < selectedDirection.length() * 0.16) {
        selectedDirection.y += selectedDirection.length() * 0.22;
      }

      return selectedDirection.normalize();
    }
  }

  const fallbackPosition = DEFAULT_VIEWER_3D_CONFIG.camera.position;
  const fallbackTarget = DEFAULT_VIEWER_3D_CONFIG.camera.target;
  const position = overviewCamera?.position ?? fallbackPosition;
  const target = overviewCamera?.target ?? fallbackTarget;
  const direction = new THREE.Vector3(
    position.x - target.x,
    position.y - target.y,
    position.z - target.z,
  );

  if (direction.lengthSq() <= 0.0001) {
    return new THREE.Vector3(1, 0.72, 1).normalize();
  }

  return direction.normalize();
}

function toWorldPreviewVector3(vector) {
  return new THREE.Vector3(
    Number(vector?.x) || 0,
    Number(vector?.y) || 0,
    Number(vector?.z) || 0,
  );
}

function getRendererAspect({ container, renderer }) {
  const bounds = getRendererBounds({ container, renderer });
  return bounds.height > 0 ? bounds.width / bounds.height : 16 / 9;
}

function getRendererBounds({ container, renderer }) {
  const bounds =
    container?.getBoundingClientRect() ??
    renderer?.domElement?.getBoundingClientRect();

  return {
    height: bounds?.height || 9,
    width: bounds?.width || 16,
  };
}

function getBoxCorners(box) {
  return [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
}
