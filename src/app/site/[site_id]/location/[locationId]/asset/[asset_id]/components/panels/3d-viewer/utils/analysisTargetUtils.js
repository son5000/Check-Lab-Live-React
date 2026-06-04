import * as THREE from "three";
import { projectImageUv } from "./cameraCanvasUtils";
import {
  clamp,
  clientToPercentPoint,
  getClientDistance,
  round,
  toImagePixel,
  toThreeVector,
  toUvPoint,
  toVector3,
} from "./viewerMath";

export function getWorldHitFromClientPoint({
  camera,
  clientPoint,
  model,
  raycaster,
  renderer,
}) {
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientPoint.x - rect.left) / rect.width) * 2 - 1,
    -(((clientPoint.y - rect.top) / rect.height) * 2 - 1),
  );

  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(model, true).at(0)?.point.clone();
}

export function buildAnalysisDraft(state, endClient, getInteractionPoint) {
  const travelDistance = getClientDistance(state.startClient, endClient);
  const endInteraction =
    getInteractionPoint(endClient) ?? state.startInteraction;

  if (!endInteraction) {
    return undefined;
  }

  if (state.interactionMode === "camera") {
    return buildCameraAnalysisDraft(state, endInteraction, travelDistance);
  }

  const endHit =
    endInteraction.worldPoint ?? state.startInteraction?.worldPoint;
  const cameraId =
    endInteraction.cameraId ?? state.startInteraction?.cameraId;

  if (!endHit) {
    return undefined;
  }

  if (state.mode === "point") {
    return {
      cameraId,
      interactionMode: "world",
      kind: "point",
      worldPosition: toVector3(endHit),
    };
  }

  if (travelDistance < 18) {
    return undefined;
  }

  const startHit = state.startInteraction?.worldPoint;
  const centerClient = {
    x: (state.startClient.x + endClient.x) / 2,
    y: (state.startClient.y + endClient.y) / 2,
  };
  const centerHit = getInteractionPoint(centerClient)?.worldPoint ?? endHit;

  return {
    cameraId,
    interactionMode: "world",
    kind: "area",
    worldArea: startHit
      ? {
          end: toVector3(endHit),
          start: toVector3(startHit),
        }
      : undefined,
    worldPosition: toVector3(centerHit),
  };
}

export function buildEditedAnalysisTarget(
  state,
  currentClient,
  getInteractionPoint,
) {
  const currentInteraction = getInteractionPoint(currentClient);

  if (!currentInteraction) {
    return undefined;
  }

  if (
    state.interactionMode === "camera" ||
    isCameraAnalysisTarget(state.target)
  ) {
    return buildEditedCameraTarget(state, currentInteraction);
  }

  return buildEditedWorldTarget(state, currentInteraction);
}

export function captureAnalysisPreviewImage({
  camera,
  cameraCanvas,
  endClient,
  renderer,
  scene,
  state,
}) {
  const sourceCanvas =
    state.interactionMode === "camera" ? cameraCanvas : renderer?.domElement;

  if (!sourceCanvas) {
    return undefined;
  }

  if (state.interactionMode !== "camera") {
    if (!camera || !renderer || !scene) {
      return undefined;
    }

    renderer.render(scene, camera);
  }

  const bounds = sourceCanvas.getBoundingClientRect();

  if (
    !bounds.width ||
    !bounds.height ||
    !sourceCanvas.width ||
    !sourceCanvas.height
  ) {
    return undefined;
  }

  const captureRect = getAnalysisCaptureClientRect(state, endClient, bounds);
  const scaleX = sourceCanvas.width / bounds.width;
  const scaleY = sourceCanvas.height / bounds.height;
  const sourceX = Math.round((captureRect.left - bounds.left) * scaleX);
  const sourceY = Math.round((captureRect.top - bounds.top) * scaleY);
  const sourceWidth = Math.max(1, Math.round(captureRect.width * scaleX));
  const sourceHeight = Math.max(1, Math.round(captureRect.height * scaleY));
  const outputScale = Math.min(1, 480 / Math.max(sourceWidth, sourceHeight));
  const outputCanvas = document.createElement("canvas");
  const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale));

  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;

  const context = outputCanvas.getContext("2d");
  if (!context) {
    return undefined;
  }

  context.drawImage(
    sourceCanvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  drawAnalysisCaptureOverlay(context, {
    captureRect,
    endClient,
    outputHeight,
    outputWidth,
    state,
  });

  try {
    return outputCanvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

export function getAnalysisDragRect(state, bounds) {
  if (!bounds) {
    return undefined;
  }

  const start = clientToPercentPoint(state.startClient, bounds);
  const current = clientToPercentPoint(state.currentClient, bounds);
  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);

  return {
    height: Math.abs(current.y - start.y),
    left,
    top,
    width: Math.abs(current.x - start.x),
  };
}

export function projectAnalysisTarget(target, context) {
  if (context.mode === "camera") {
    return projectCameraAnalysisTarget(target, context);
  }

  return projectWorldAnalysisTarget(target, context.camera);
}

export function getInteractionSurfaceBounds({ cameraCanvas, mode, renderer }) {
  const element = mode === "camera" ? cameraCanvas : renderer?.domElement;
  return element?.getBoundingClientRect();
}

export function getProjectedTargetsKey(targets) {
  return targets
    .map((target) =>
      [
        target.id,
        target.visible ? 1 : 0,
        target.left.toFixed(1),
        target.top.toFixed(1),
        target.rect?.left.toFixed(1) ?? "",
        target.rect?.top.toFixed(1) ?? "",
        target.rect?.width.toFixed(1) ?? "",
        target.rect?.height.toFixed(1) ?? "",
      ].join(":"),
    )
    .join("|");
}

function buildCameraAnalysisDraft(state, endInteraction, travelDistance) {
  const startInteraction =
    state.startInteraction?.mode === "camera"
      ? state.startInteraction
      : endInteraction;

  if (!startInteraction || endInteraction.mode !== "camera") {
    return undefined;
  }

  if (state.mode === "point") {
    return {
      ...toCameraTargetFields({
        cameraId: endInteraction.cameraId,
        imagePoint: endInteraction,
      }),
      interactionMode: "camera",
      kind: "point",
    };
  }

  if (travelDistance < 18) {
    return undefined;
  }

  return {
    ...toCameraAreaTargetFields({
      cameraId: endInteraction.cameraId,
      endPoint: endInteraction,
      startPoint: startInteraction,
    }),
    interactionMode: "camera",
    kind: "area",
  };
}

function buildEditedCameraTarget(state, currentInteraction) {
  if (currentInteraction.mode !== "camera") {
    return undefined;
  }

  if (state.target.kind !== "area" || state.editMode === "move-point") {
    return {
      ...state.target,
      ...toCameraTargetFields({
        cameraId: currentInteraction.cameraId ?? state.target.cameraId,
        imagePoint: currentInteraction,
      }),
    };
  }

  if (state.editMode === "move-area") {
    const startInteraction =
      state.startInteraction?.mode === "camera"
        ? state.startInteraction
        : currentInteraction;
    const area = getTargetImageAreaUv(state.target);
    const delta = {
      x: currentInteraction.uv.x - startInteraction.uv.x,
      y: currentInteraction.uv.y - startInteraction.uv.y,
    };
    const movedArea = moveUvArea(area, delta);

    return {
      ...state.target,
      ...toCameraAreaTargetFields({
        cameraId: currentInteraction.cameraId ?? state.target.cameraId,
        endPoint: getCameraPointFromUv(movedArea.end, currentInteraction),
        startPoint: getCameraPointFromUv(movedArea.start, currentInteraction),
      }),
    };
  }

  const handle = state.editMode.startsWith("resize-area:")
    ? state.editMode.replace("resize-area:", "")
    : "se";
  const resizedArea = resizeUvArea(
    getTargetImageAreaUv(state.target),
    handle,
    currentInteraction.uv,
  );

  return {
    ...state.target,
    ...toCameraAreaTargetFields({
      cameraId: currentInteraction.cameraId ?? state.target.cameraId,
      endPoint: getCameraPointFromUv(resizedArea.end, currentInteraction),
      startPoint: getCameraPointFromUv(resizedArea.start, currentInteraction),
    }),
  };
}

function buildEditedWorldTarget(state, currentInteraction) {
  const currentHit = currentInteraction.worldPoint;

  if (!currentHit) {
    return undefined;
  }

  if (state.target.kind !== "area" || state.editMode === "move-point") {
    return {
      ...state.target,
      interactionMode: "world",
      worldPosition: toVector3(currentHit),
    };
  }

  if (state.editMode === "move-area") {
    const startHit = state.startInteraction?.worldPoint;
    if (!startHit) {
      return undefined;
    }

    const delta = currentHit.clone().sub(startHit);

    return {
      ...state.target,
      interactionMode: "world",
      worldArea: state.target.worldArea
        ? {
            end: toVector3(
              toThreeVector(state.target.worldArea.end).add(delta),
            ),
            start: toVector3(
              toThreeVector(state.target.worldArea.start).add(delta),
            ),
          }
        : state.target.worldArea,
      worldPosition: toVector3(
        toThreeVector(state.target.worldPosition).add(delta),
      ),
    };
  }

  if (!state.target.worldArea) {
    return {
      ...state.target,
      interactionMode: "world",
      worldArea: {
        end: toVector3(currentHit),
        start: state.target.worldPosition,
      },
      worldPosition: toVector3(currentHit),
    };
  }

  const handle = state.editMode.startsWith("resize-area:")
    ? state.editMode.replace("resize-area:", "")
    : "se";
  const nextArea = resizeWorldArea(state.target.worldArea, handle, currentHit);

  return {
    ...state.target,
    interactionMode: "world",
    worldArea: nextArea,
    worldPosition: getWorldAreaCenter(nextArea),
  };
}

function getAnalysisCaptureClientRect(state, endClient, bounds) {
  if (state.mode === "point") {
    const minSide = Math.min(bounds.width, bounds.height);
    const size = clamp(minSide * 0.3, 96, 180);

    return clampCaptureClientRect(
      endClient.x - size / 2,
      endClient.y - size / 2,
      size,
      size,
      bounds,
    );
  }

  const left = Math.min(state.startClient.x, endClient.x);
  const top = Math.min(state.startClient.y, endClient.y);
  const width = Math.abs(endClient.x - state.startClient.x);
  const height = Math.abs(endClient.y - state.startClient.y);
  const margin = clamp(Math.max(width, height) * 0.32, 32, 96);

  return clampCaptureClientRect(
    left - margin,
    top - margin,
    width + margin * 2,
    height + margin * 2,
    bounds,
  );
}

function clampCaptureClientRect(left, top, width, height, bounds) {
  const clampedWidth = Math.min(Math.max(width, 1), bounds.width);
  const clampedHeight = Math.min(Math.max(height, 1), bounds.height);

  return {
    height: clampedHeight,
    left: clamp(left, bounds.left, bounds.right - clampedWidth),
    top: clamp(top, bounds.top, bounds.bottom - clampedHeight),
    width: clampedWidth,
  };
}

function drawAnalysisCaptureOverlay(
  context,
  { captureRect, endClient, outputHeight, outputWidth, state },
) {
  const scaleX = outputWidth / captureRect.width;
  const scaleY = outputHeight / captureRect.height;

  if (state.mode === "point") {
    const x = (endClient.x - captureRect.left) * scaleX;
    const y = (endClient.y - captureRect.top) * scaleY;
    const radius = Math.max(8, Math.min(outputWidth, outputHeight) * 0.055);

    context.save();
    context.fillStyle = "rgba(34, 211, 238, 0.9)";
    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    context.lineWidth = Math.max(2, radius * 0.28);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
    return;
  }

  const left =
    (Math.min(state.startClient.x, endClient.x) - captureRect.left) * scaleX;
  const top =
    (Math.min(state.startClient.y, endClient.y) - captureRect.top) * scaleY;
  const width = Math.abs(endClient.x - state.startClient.x) * scaleX;
  const height = Math.abs(endClient.y - state.startClient.y) * scaleY;
  const lineWidth = Math.max(2, Math.min(outputWidth, outputHeight) * 0.014);

  context.save();
  context.fillStyle = "rgba(103, 232, 249, 0.14)";
  context.strokeStyle = "rgba(165, 243, 252, 0.95)";
  context.lineWidth = lineWidth;
  context.shadowColor = "rgba(34, 211, 238, 0.45)";
  context.shadowBlur = lineWidth * 4;
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);
  context.restore();
}

function projectCameraAnalysisTarget(target, context) {
  if (
    !isCameraAnalysisTarget(target) ||
    target.cameraId !== context.selectedCameraId
  ) {
    return {
      id: target.id,
      left: 0,
      top: 0,
      visible: false,
    };
  }

  const center = projectImageUv(target.imageUv, context);
  const rect =
    target.kind === "area"
      ? projectCameraAnalysisArea(target, context, center)
      : undefined;

  return {
    id: target.id,
    left: center.left,
    rect,
    top: center.top,
    visible: center.visible,
  };
}

function projectWorldAnalysisTarget(target, camera) {
  const center = projectVector(target.worldPosition, camera);
  const rect =
    target.kind === "area"
      ? projectWorldAnalysisArea(target, camera, center)
      : undefined;

  return {
    id: target.id,
    left: center.left,
    rect,
    top: center.top,
    visible: center.visible,
  };
}

function projectCameraAnalysisArea(target, context, center) {
  if (!center.visible) {
    return undefined;
  }

  const area = getTargetImageAreaUv(target);
  const start = projectImageUv(area.start, context);
  const end = projectImageUv(area.end, context);
  const visiblePoints = [start, end, center].filter((point) => point.visible);

  if (!visiblePoints.length) {
    return getCenteredRect(center, 10, 10);
  }

  const minLeft = Math.min(...visiblePoints.map((point) => point.left));
  const maxLeft = Math.max(...visiblePoints.map((point) => point.left));
  const minTop = Math.min(...visiblePoints.map((point) => point.top));
  const maxTop = Math.max(...visiblePoints.map((point) => point.top));
  const width = Math.min(100, Math.max(4, maxLeft - minLeft));
  const height = Math.min(100, Math.max(4, maxTop - minTop));

  return {
    height,
    left: clamp(minLeft, 0, 100 - width),
    top: clamp(minTop, 0, 100 - height),
    width,
  };
}

function projectWorldAnalysisArea(target, camera, center) {
  if (!center.visible) {
    return undefined;
  }

  if (!target.worldArea) {
    return getCenteredRect(center, 10, 10);
  }

  const start = projectVector(target.worldArea.start, camera);
  const end = projectVector(target.worldArea.end, camera);
  const visiblePoints = [start, end, center].filter((point) => point.visible);

  if (!visiblePoints.length) {
    return getCenteredRect(center, 10, 10);
  }

  const minLeft = Math.min(...visiblePoints.map((point) => point.left));
  const maxLeft = Math.max(...visiblePoints.map((point) => point.left));
  const minTop = Math.min(...visiblePoints.map((point) => point.top));
  const maxTop = Math.max(...visiblePoints.map((point) => point.top));
  const width = Math.min(42, Math.max(7, maxLeft - minLeft));
  const height = Math.min(42, Math.max(7, maxTop - minTop));

  return {
    height,
    left: clamp(minLeft, 0, 100 - width),
    top: clamp(minTop, 0, 100 - height),
    width,
  };
}

function projectVector(vector, camera) {
  const projected = new THREE.Vector3(vector.x, vector.y, vector.z).project(
    camera,
  );

  return {
    id: "",
    left: clamp((projected.x + 1) * 50, 0, 100),
    top: clamp((1 - projected.y) * 50, 0, 100),
    visible: projected.z >= -1 && projected.z <= 1,
  };
}

function getCenteredRect(center, width, height) {
  return {
    height,
    left: clamp(center.left - width / 2, 0, 100 - width),
    top: clamp(center.top - height / 2, 0, 100 - height),
    width,
  };
}

function toCameraTargetFields({ cameraId, imagePoint }) {
  const imageUv = toUvPoint(imagePoint.uv);

  return {
    cameraId,
    imagePixel: toImagePixel(imagePoint.pixel),
    imageUv,
    worldPosition: imageUvToWorldVector(imageUv),
  };
}

function toCameraAreaTargetFields({ cameraId, endPoint, startPoint }) {
  const start = toUvPoint(startPoint.uv);
  const end = toUvPoint(endPoint.uv);
  const center = getUvAreaCenter({ start, end });

  return {
    cameraId,
    imageAreaPixel: {
      end: toImagePixel(endPoint.pixel),
      start: toImagePixel(startPoint.pixel),
    },
    imageAreaUv: { end, start },
    imagePixel: getPixelAreaCenter(startPoint.pixel, endPoint.pixel),
    imageUv: center,
    worldArea: {
      end: imageUvToWorldVector(end),
      start: imageUvToWorldVector(start),
    },
    worldPosition: imageUvToWorldVector(center),
  };
}

function getCameraPointFromUv(uv, referencePoint) {
  const naturalWidth = referencePoint.sourceSize?.width ?? 1;
  const naturalHeight = referencePoint.sourceSize?.height ?? 1;

  return {
    ...referencePoint,
    pixel: {
      x: round(uv.x * naturalWidth),
      y: round(uv.y * naturalHeight),
    },
    uv: toUvPoint(uv),
  };
}

function getTargetImageAreaUv(target) {
  if (target.imageAreaUv?.start && target.imageAreaUv?.end) {
    return {
      end: toUvPoint(target.imageAreaUv.end),
      start: toUvPoint(target.imageAreaUv.start),
    };
  }

  const center = toUvPoint(target.imageUv ?? { x: 0.5, y: 0.5 });

  return {
    end: {
      x: clamp(center.x + 0.06, 0, 1),
      y: clamp(center.y + 0.06, 0, 1),
    },
    start: {
      x: clamp(center.x - 0.06, 0, 1),
      y: clamp(center.y - 0.06, 0, 1),
    },
  };
}

function moveUvArea(area, delta) {
  const minX = Math.min(area.start.x, area.end.x);
  const maxX = Math.max(area.start.x, area.end.x);
  const minY = Math.min(area.start.y, area.end.y);
  const maxY = Math.max(area.start.y, area.end.y);
  const width = maxX - minX;
  const height = maxY - minY;
  const nextMinX = clamp(minX + delta.x, 0, 1 - width);
  const nextMinY = clamp(minY + delta.y, 0, 1 - height);
  const offsetX = nextMinX - minX;
  const offsetY = nextMinY - minY;

  return {
    end: toUvPoint({ x: area.end.x + offsetX, y: area.end.y + offsetY }),
    start: toUvPoint({ x: area.start.x + offsetX, y: area.start.y + offsetY }),
  };
}

function resizeUvArea(area, handle, uv) {
  const nextArea = {
    end: { ...area.end },
    start: { ...area.start },
  };

  if (handle.includes("w")) {
    nextArea.start.x = uv.x;
  }

  if (handle.includes("e")) {
    nextArea.end.x = uv.x;
  }

  if (handle.includes("n")) {
    nextArea.start.y = uv.y;
  }

  if (handle.includes("s")) {
    nextArea.end.y = uv.y;
  }

  return {
    end: toUvPoint(nextArea.end),
    start: toUvPoint(nextArea.start),
  };
}

function resizeWorldArea(area, handle, worldPoint) {
  const nextArea = {
    end: toThreeVector(area.end),
    start: toThreeVector(area.start),
  };

  if (handle === "nw" || handle === "sw") {
    nextArea.start = worldPoint.clone();
  } else {
    nextArea.end = worldPoint.clone();
  }

  return {
    end: toVector3(nextArea.end),
    start: toVector3(nextArea.start),
  };
}

function isCameraAnalysisTarget(target) {
  return (
    target.interactionMode === "camera" ||
    Boolean(target.imageUv && target.cameraId)
  );
}

function imageUvToWorldVector(uv) {
  return {
    x: round((uv.x * 100 - 50) / 28),
    y: round((50 - uv.y * 100) / 28),
    z: 0,
  };
}

function getUvAreaCenter(area) {
  return toUvPoint({
    x: (area.start.x + area.end.x) / 2,
    y: (area.start.y + area.end.y) / 2,
  });
}

function getPixelAreaCenter(start, end) {
  return {
    x: round((start.x + end.x) / 2),
    y: round((start.y + end.y) / 2),
  };
}

function getWorldAreaCenter(area) {
  return toVector3(
    toThreeVector(area.start).add(toThreeVector(area.end)).multiplyScalar(0.5),
  );
}
