export function captureThreeViewerCanvas(source) {
  const canvas = resolveThreeViewerCanvas(source);

  if (!canvas) {
    return createCaptureFailure("Existing 3D World canvas was not found.");
  }

  try {
    const dataUrl = canvas.toDataURL("image/png");

    if (!dataUrl || dataUrl === "data:,") {
      return createCaptureFailure("Existing 3D World canvas is empty.");
    }

    return {
      ok: true,
      dataUrl,
      width: canvas.width || canvas.clientWidth || 0,
      height: canvas.height || canvas.clientHeight || 0,
      error: null,
    };
  } catch (error) {
    return createCaptureFailure(
      error instanceof Error
        ? error.message
        : "Failed to capture existing 3D World canvas.",
    );
  }
}

function resolveThreeViewerCanvas(source) {
  if (!source || typeof window === "undefined") {
    return null;
  }

  if (source.current) {
    return resolveThreeViewerCanvas(source.current);
  }

  if (
    typeof HTMLCanvasElement !== "undefined" &&
    source instanceof HTMLCanvasElement
  ) {
    return source;
  }

  if (
    source.domElement &&
    typeof HTMLCanvasElement !== "undefined" &&
    source.domElement instanceof HTMLCanvasElement
  ) {
    return source.domElement;
  }

  if (typeof source.querySelector === "function") {
    return source.querySelector("canvas");
  }

  return null;
}

function createCaptureFailure(error) {
  return {
    ok: false,
    dataUrl: "",
    width: 0,
    height: 0,
    error,
  };
}
