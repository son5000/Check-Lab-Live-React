import { clamp } from "./viewerMath";

export function getResizeHandleStyle(handle) {
  const vertical = handle.includes("n") ? "top" : "bottom";
  const horizontal = handle.includes("w") ? "left" : "right";

  return {
    [horizontal]: "-0.375rem",
    [vertical]: "-0.375rem",
    cursor: `${handle}-resize`,
  };
}

export function getCalloutConnectorGeometry(target, overlayMetrics) {
  if (
    !overlayMetrics?.width ||
    !overlayMetrics.height ||
    !overlayMetrics.calloutRect
  ) {
    return undefined;
  }

  const start = {
    x: roundOverlayValue((target.left / 100) * overlayMetrics.width),
    y: roundOverlayValue((target.top / 100) * overlayMetrics.height),
  };
  const anchor = getNearestRectAnchor(start, overlayMetrics.calloutRect);

  return {
    anchor,
    height: overlayMetrics.height,
    path: getConnectorPath(start, anchor),
    start,
    width: overlayMetrics.width,
  };
}

export function areOverlayMetricsEqual(currentMetrics, nextMetrics) {
  if (!currentMetrics) {
    return false;
  }

  return (
    currentMetrics.width === nextMetrics.width &&
    currentMetrics.height === nextMetrics.height &&
    areOverlayRectsEqual(currentMetrics.calloutRect, nextMetrics.calloutRect)
  );
}

export function roundOverlayValue(value) {
  return Number(value.toFixed(2));
}

function getNearestRectAnchor(point, rect) {
  const padding = Math.min(
    18,
    Math.max(8, Math.min(rect.width, rect.height) * 0.12),
  );
  const safeLeft = rect.left + padding;
  const safeRight = rect.right - padding;
  const safeTop = rect.top + padding;
  const safeBottom = rect.bottom - padding;
  const candidates = [
    {
      x: rect.left,
      y: clamp(point.y, safeTop, safeBottom),
    },
    {
      x: rect.right,
      y: clamp(point.y, safeTop, safeBottom),
    },
    {
      x: clamp(point.x, safeLeft, safeRight),
      y: rect.top,
    },
    {
      x: clamp(point.x, safeLeft, safeRight),
      y: rect.bottom,
    },
  ];
  const anchor = candidates.reduce((nearest, candidate) =>
    getPointDistance(point, candidate) < getPointDistance(point, nearest)
      ? candidate
      : nearest,
  );

  return {
    x: roundOverlayValue(anchor.x),
    y: roundOverlayValue(anchor.y),
  };
}

function getConnectorPath(start, anchor) {
  const elbowX = start.x + (anchor.x - start.x) * 0.55;

  return [
    "M",
    roundOverlayValue(start.x),
    roundOverlayValue(start.y),
    "L",
    roundOverlayValue(elbowX),
    roundOverlayValue(start.y),
    "L",
    roundOverlayValue(elbowX),
    roundOverlayValue(anchor.y),
    "L",
    roundOverlayValue(anchor.x),
    roundOverlayValue(anchor.y),
  ].join(" ");
}

function getPointDistance(firstPoint, secondPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function areOverlayRectsEqual(currentRect, nextRect) {
  if (!currentRect || !nextRect) {
    return currentRect === nextRect;
  }

  return (
    currentRect.bottom === nextRect.bottom &&
    currentRect.height === nextRect.height &&
    currentRect.left === nextRect.left &&
    currentRect.right === nextRect.right &&
    currentRect.top === nextRect.top &&
    currentRect.width === nextRect.width
  );
}
