import * as THREE from "three";

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

// FOV 콘 기하학 생성 - 카메라의 화각 범위를 시각화
export const createCameraFOVCone = (camera, cameraId, isSelected = false) => {
  const fov = camera.fov || 60;
  const far = 100;

  const vFOV = (fov * Math.PI) / 180;
  const coneHeight = far;
  const coneRadiusBottom = Math.tan(vFOV / 2) * far;

  const coneGeometry = new THREE.ConeGeometry(
    coneRadiusBottom,
    coneHeight,
    32,
    1,
    true
  );

  // 콘을 앞쪽을 향하도록 회전 (기본 방향은 Y축)
  coneGeometry.rotateX(-Math.PI / 2);
  coneGeometry.translate(0, 0, coneHeight / 2);

  const material = new THREE.MeshPhongMaterial({
    color: isSelected ? CAMERA_FOV_SELECTED_COLOR : CAMERA_FOV_COLOR,
    transparent: true,
    opacity: isSelected ? 0.3 : 0.15,
    emissive: isSelected ? CAMERA_FOV_SELECTED_COLOR : 0x0088ff,
    emissiveIntensity: 0.5,
    side: THREE.FrontSide,
    wireframe: false,
  });

  const cone = new THREE.Mesh(coneGeometry, material);
  cone.name = `viewer-camera-fov-${cameraId}`;
  cone.userData.cameraId = cameraId;
  cone.userData.isVisualization = true;
  cone.userData.isCameraFOV = true;
  cone.userData.isInteractive = false;
  cone.raycast = () => {};
  cone.castShadow = false;
  cone.receiveShadow = false;
  applyCameraFOVVisualState(cone, isSelected, false);

  return cone;
};

// 카메라 위치 마커 생성 - 카메라의 정확한 위치를 표시
export const createCameraMarker = (cameraId, isSelected = false) => {
  const group = new THREE.Group();
  group.name = `viewer-camera-marker-${cameraId}`;
  group.userData.cameraId = cameraId;
  group.userData.isCameraMarker = true;
  group.userData.isInteractive = true;

  const geometry = new THREE.SphereGeometry(2.4, 24, 16);
  const material = new THREE.MeshPhongMaterial({
    color: isSelected ? CAMERA_MARKER_SELECTED_COLOR : CAMERA_MARKER_COLOR,
    transparent: true,
    opacity: isSelected ? 1 : 0.88,
    emissive: isSelected ? CAMERA_MARKER_SELECTED_COLOR : 0x0891b2,
    emissiveIntensity: isSelected ? 1.25 : 0.85,
  });

  const sphere = new THREE.Mesh(geometry, material);
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
    })
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
};

// 카메라 FOV 가시성 업데이트
export const updateCameraFOVVisibility = (
  scene,
  visibleCameraIds,
  selectedCameraId
) => {
  const cones = scene.children.filter(
    (obj) =>
      obj.name &&
      obj.name.startsWith("viewer-camera-fov-") &&
      obj.userData.isVisualization
  );

  cones.forEach((cone) => {
    const cameraId = cone.userData.cameraId;
    const isVisible = visibleCameraIds.includes(cameraId);
    const isSelected = cameraId === selectedCameraId;

    cone.visible = isVisible;
    applyCameraFOVVisualState(cone, isSelected, false);
  });

  // 마커 가시성 업데이트
  const markers = scene.children.filter(
    (obj) => obj.name && obj.name.startsWith("viewer-camera-marker-")
  );

  markers.forEach((marker) => {
    const cameraId = marker.userData.cameraId;
    const isVisible = visibleCameraIds.includes(cameraId);
    const isSelected = cameraId === selectedCameraId;

    marker.visible = isVisible;

    applyCameraMarkerVisualState(marker, isSelected, false);
  });
};

// 씬에서 모든 카메라 시각화 객체 제거
export const removeAllCameraVisualizations = (scene) => {
  const objectsToRemove = scene.children.filter(
    (obj) =>
      (obj.name && obj.name.startsWith("viewer-camera-fov-")) ||
      (obj.name && obj.name.startsWith("viewer-camera-marker-"))
  );

  objectsToRemove.forEach((obj) => {
    scene.remove(obj);
    disposeObject(obj);
  });
};

// 레이캐스트로 카메라 위치 마커 구체만 충돌 검사
export const raycastCameraMarkers = (raycaster, scene) => {
  const hitTargets = [];
  scene.traverse((obj) => {
    if (obj.userData?.isCameraHitTarget && isVisibleInHierarchy(obj)) {
      hitTargets.push(obj);
    }
  });

  if (hitTargets.length === 0) return null;

  const intersects = raycaster.intersectObjects(hitTargets, false);

  if (intersects.length > 0) {
    return intersects[0].object.userData.cameraId;
  }

  return null;
};

export const pickCameraMarkerFromClientPoint = ({
  camera,
  clientPoint,
  previousCameraId,
  renderer,
  scene,
}) => {
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
  const cameraRight = new THREE.Vector3();

  camera.updateMatrixWorld();
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();

  scene.traverse((obj) => {
    if (!obj.userData?.isCameraMarker || !isVisibleInHierarchy(obj)) {
      return;
    }

    obj.getWorldPosition(worldPosition);
    const projected = worldPosition.clone().project(camera);

    if (projected.z < -1 || projected.z > 1) {
      return;
    }

    const screenPosition = getScreenPositionFromProjectedPoint(projected, bounds);
    const projectedRadiusPosition = worldPosition
      .clone()
      .addScaledVector(cameraRight, CAMERA_MARKER_HIT_RADIUS)
      .project(camera);
    const radiusScreenPosition = getScreenPositionFromProjectedPoint(
      projectedRadiusPosition,
      bounds
    );
    const projectedRadiusPx = Math.hypot(
      screenPosition.x - radiusScreenPosition.x,
      screenPosition.y - radiusScreenPosition.y
    );
    const pickRadius = Math.max(
      CAMERA_MARKER_PICK_RADIUS_PX,
      Number.isFinite(projectedRadiusPx) ? projectedRadiusPx : 0
    );
    const stickyRadius = Math.max(
      CAMERA_MARKER_STICKY_RADIUS_PX,
      pickRadius + 34
    );
    const distance = Math.hypot(
      pointer.x - screenPosition.x,
      pointer.y - screenPosition.y
    );

    candidates.push({
      distance,
      id: obj.userData.cameraId,
      pickRadius,
      score: distance / pickRadius,
      stickyRadius,
      z: projected.z,
    });
  });

  if (!candidates.length) {
    return null;
  }

  const previous = candidates.find((candidate) => candidate.id === previousCameraId);
  if (previous && previous.distance <= previous.stickyRadius) {
    return previous.id;
  }

  const nearest = candidates.sort((first, second) => first.score - second.score || first.distance - second.distance || first.z - second.z)[0];

  return nearest.distance <= nearest.pickRadius ? nearest.id : null;
};

// FOV 콘은 시각 표시 전용이며 클릭 판정 대상이 아니다.
export const raycastCameraFOVCones = () => null;

export const updateCameraMarkerInteractionState = (
  scene,
  selectedCameraId,
  hoveredCameraId
) => {
  scene.traverse((obj) => {
    const cameraId = obj.userData?.cameraId;
    if (!cameraId) {
      return;
    }

    const isSelected = cameraId === selectedCameraId;
    const isHovered = cameraId === hoveredCameraId;

    if (obj.userData?.isCameraMarker) {
      applyCameraMarkerVisualState(obj, isSelected, isHovered);
    }

    if (obj.userData?.isCameraFOV) {
      applyCameraFOVVisualState(obj, isSelected, isHovered);
    }
  });
};

// 카메라 FOV 콘을 업데이트하면서 씬에 추가/제거
export const updateCameraVisualizationObjects = (
  scene,
  cameras,
  selectedCameraId,
  visibleCameraIds
) => {
  // 기존 객체 제거
  removeAllCameraVisualizations(scene);

  // 새로운 카메라 객체 생성 및 추가
  cameras.forEach((camera) => {
    const isSelected = camera.id === selectedCameraId;

    // FOV 콘 생성
    const cone = createCameraFOVCone(camera, camera.id, isSelected);
    cone.position.copy(
      new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
    );

    // 콘이 카메라를 향하도록 회전
    const direction = new THREE.Vector3(
      camera.target.x - camera.position.x,
      camera.target.y - camera.position.y,
      camera.target.z - camera.position.z
    ).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    cone.quaternion.copy(quaternion);

    cone.visible = visibleCameraIds.includes(camera.id);
    scene.add(cone);

    // 마커 생성 및 추가
    const marker = createCameraMarker(camera.id, isSelected);
    marker.position.copy(
      new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
    );
    marker.visible = visibleCameraIds.includes(camera.id);
    scene.add(marker);
  });
};

function applyCameraMarkerVisualState(marker, isSelected, isHovered) {
  const sphere = marker.children?.find((child) => child.userData?.isCameraMarkerVisual) ?? marker;
  const label = marker.children?.find((child) => child.userData?.isCameraMarkerLabel);
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
    label.scale.set(isHovered || isSelected ? 4.9 : 4.3, isHovered || isSelected ? 4.9 : 4.3, 1);
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

function getScreenPositionFromProjectedPoint(projected, bounds) {
  return {
    x: ((projected.x + 1) / 2) * bounds.width,
    y: ((1 - projected.y) / 2) * bounds.height,
  };
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
  const material = new THREE.SpriteMaterial({
    depthTest: false,
    depthWrite: false,
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.3, 4.3, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => {
        if (material.map) {
          material.map.dispose();
        }
        material.dispose();
      });
    }
  });
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
