import {
  clamp,
  clientToPercentPoint,
  round,
  roundUv,
} from "./viewerMath";

export function drawCameraImageFrame(canvas, image) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.max(1, Math.round(width * pixelRatio));
  const nextHeight = Math.max(1, Math.round(height * pixelRatio));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#020617";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) {
    return `${canvas.width}:${canvas.height}:pending`;
  }

  const crop = getObjectCoverDrawRect({
    destinationHeight: canvas.height,
    destinationWidth: canvas.width,
    sourceHeight: image.naturalHeight,
    sourceWidth: image.naturalWidth,
  });

  context.drawImage(image, crop.x, crop.y, crop.width, crop.height);
  return `${canvas.width}:${canvas.height}:${image.naturalWidth}:${image.naturalHeight}`;
}

export function drawFallbackFrame(canvas) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.fillStyle = "#020617";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

export function getCameraImageInteractionPoint({
  cameraId,
  canvas,
  clientPoint,
  image,
}) {
  if (!cameraId || !canvas) {
    return undefined;
  }

  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return undefined;
  }

  const canvasScaleX = canvas.width / bounds.width || 1;
  const canvasScaleY = canvas.height / bounds.height || 1;
  const canvasPoint = {
    x: clamp(clientPoint.x - bounds.left, 0, bounds.width) * canvasScaleX,
    y: clamp(clientPoint.y - bounds.top, 0, bounds.height) * canvasScaleY,
  };
  const naturalWidth = image?.naturalWidth || canvas.width;
  const naturalHeight = image?.naturalHeight || canvas.height;
  const crop = getObjectCoverDrawRect({
    destinationHeight: canvas.height,
    destinationWidth: canvas.width,
    sourceHeight: naturalHeight,
    sourceWidth: naturalWidth,
  });
  const pixel = {
    x: clamp((canvasPoint.x - crop.x) / crop.scale, 0, naturalWidth),
    y: clamp((canvasPoint.y - crop.y) / crop.scale, 0, naturalHeight),
  };
  const uv = {
    x: clamp(pixel.x / naturalWidth, 0, 1),
    y: clamp(pixel.y / naturalHeight, 0, 1),
  };

  return {
    cameraId,
    clientPoint,
    displayPercent: clientToPercentPoint(clientPoint, bounds),
    mode: "camera",
    pixel: {
      x: round(pixel.x),
      y: round(pixel.y),
    },
    sourceSize: {
      height: naturalHeight,
      width: naturalWidth,
    },
    uv: {
      x: roundUv(uv.x),
      y: roundUv(uv.y),
    },
  };
}

export function projectImageUv(uv, { cameraCanvas, image }) {
  const canvas = cameraCanvas;
  const bounds = canvas?.getBoundingClientRect();

  if (!bounds?.width || !bounds.height) {
    return {
      left: clamp((uv?.x ?? 0.5) * 100, 0, 100),
      top: clamp((uv?.y ?? 0.5) * 100, 0, 100),
      visible: Boolean(uv),
    };
  }

  const naturalWidth = image?.naturalWidth || canvas.width || bounds.width;
  const naturalHeight = image?.naturalHeight || canvas.height || bounds.height;
  const crop = getObjectCoverDrawRect({
    destinationHeight: bounds.height,
    destinationWidth: bounds.width,
    sourceHeight: naturalHeight,
    sourceWidth: naturalWidth,
  });
  const left =
    ((crop.x + uv.x * naturalWidth * crop.scale) / bounds.width) * 100;
  const top =
    ((crop.y + uv.y * naturalHeight * crop.scale) / bounds.height) * 100;

  return {
    left: clamp(left, 0, 100),
    top: clamp(top, 0, 100),
    visible: left >= 0 && left <= 100 && top >= 0 && top <= 100,
  };
}

export function getObjectCoverDrawRect({
  destinationHeight,
  destinationWidth,
  sourceHeight,
  sourceWidth,
}) {
  const scale = Math.max(
    destinationWidth / sourceWidth,
    destinationHeight / sourceHeight,
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    height,
    scale,
    width,
    x: (destinationWidth - width) / 2,
    y: (destinationHeight - height) / 2,
  };
}
