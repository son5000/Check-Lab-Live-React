"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MOCK_THERMAL_CAMERAS,
  loadThermalCameraFrameFromMockCsv,
} from "@/lib/thermal-mapping";

const EMPTY_FRAMES_BY_CAMERA_ID = {};

export function useMockThermalCameraFrames(cameras = MOCK_THERMAL_CAMERAS) {
  const [framesByCameraId, setFramesByCameraId] = useState(
    EMPTY_FRAMES_BY_CAMERA_ID,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const thermalCameras = useMemo(() => cameras ?? [], [cameras]);

  useEffect(() => {
    let isActive = true;

    if (!thermalCameras.length) {
      setFramesByCameraId(EMPTY_FRAMES_BY_CAMERA_ID);
      setLoading(false);
      setError("");
      return undefined;
    }

    const loadFrames = async () => {
      setLoading(true);
      setError("");

      try {
        const frames = await Promise.all(
          thermalCameras.map((camera) =>
            loadThermalCameraFrameFromMockCsv(camera),
          ),
        );

        if (!isActive) {
          return;
        }

        setFramesByCameraId(
          frames.reduce((nextFramesByCameraId, frame) => {
            nextFramesByCameraId[frame.cameraId] = frame;
            return nextFramesByCameraId;
          }, {}),
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setFramesByCameraId(EMPTY_FRAMES_BY_CAMERA_ID);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load thermal camera frames.",
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadFrames();

    return () => {
      isActive = false;
    };
  }, [thermalCameras]);

  return {
    cameras: thermalCameras,
    error,
    framesByCameraId,
    loading,
  };
}
