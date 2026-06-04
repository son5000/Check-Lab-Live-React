"use client";

import { useEffect } from "react";
import {
  drawCameraImageFrame,
  drawFallbackFrame,
} from "../utils/cameraCanvasUtils";

export function CameraImageCanvas({
  canvasRef,
  imageElementRef,
  imageUrl,
  label,
  onFrameChange,
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) {
      return undefined;
    }

    let animationFrameId = 0;
    let isActive = true;
    let lastFrameKey = "";
    const image = new Image();

    const drawFrame = () => {
      if (!isActive) {
        return;
      }

      const frameKey = drawCameraImageFrame(canvas, image);
      if (frameKey && frameKey !== lastFrameKey) {
        lastFrameKey = frameKey;
        onFrameChange?.();
      }
    };

    const scheduleDraw = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        drawFrame();
      });
    };

    image.decoding = "async";
    image.onload = () => {
      imageElementRef.current = image;
      drawFrame();
    };
    image.onerror = () => {
      imageElementRef.current = null;
      drawFallbackFrame(canvas);
      onFrameChange?.();
    };
    image.src = imageUrl;

    const resizeObserver = new ResizeObserver(scheduleDraw);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", scheduleDraw);
    scheduleDraw();

    return () => {
      isActive = false;
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", scheduleDraw);
      resizeObserver.disconnect();
      if (imageElementRef.current === image) {
        imageElementRef.current = null;
      }
    };
  }, [canvasRef, imageElementRef, imageUrl, onFrameChange]);

  return (
    <canvas
      ref={canvasRef}
      className="CameraImageCanvas CameraImageCanvas__canvas-1 absolute inset-0 z-0 h-full w-full bg-neutral-950"
      aria-label={label ? `${label} camera image` : "Camera image"}
    />
  );
}
