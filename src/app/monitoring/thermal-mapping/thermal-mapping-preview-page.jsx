"use client";

import { useEffect, useMemo, useState } from "react";
import { MOCK_THERMAL_CAMERAS } from "@/lib/thermal-mapping";
import { ThermalCameraList } from "./components/ThermalCameraList";
import { ThermalCameraPreviewPanel } from "./components/ThermalCameraPreviewPanel";
import { useMockThermalCameraFrames } from "./hooks/useMockThermalCameraFrames";

export function ThermalMappingPreviewPage({
  cameras = MOCK_THERMAL_CAMERAS,
}) {
  const { error, framesByCameraId, loading } =
    useMockThermalCameraFrames(cameras);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.cameraId === selectedCameraId),
    [cameras, selectedCameraId],
  );
  const selectedFrame = selectedCameraId
    ? framesByCameraId[selectedCameraId]
    : undefined;

  useEffect(() => {
    if (!cameras.length) {
      setSelectedCameraId(null);
      return;
    }

    setSelectedCameraId((currentCameraId) =>
      currentCameraId &&
      cameras.some((camera) => camera.cameraId === currentCameraId)
        ? currentCameraId
        : null,
    );
  }, [cameras]);

  return (
    <main className="ThermalMappingPreviewPage ThermalMappingPreviewPage__root-1 grid min-h-0 gap-4 p-4 md:grid-cols-[20rem_minmax(0,1fr)]">
      <ThermalCameraList
        cameras={cameras}
        framesByCameraId={framesByCameraId}
        loading={loading}
        selectedCameraId={selectedCameraId}
        onSelectCamera={setSelectedCameraId}
      />
      <ThermalCameraPreviewPanel
        error={error}
        frame={selectedFrame}
        loading={loading}
        selectedCamera={selectedCamera}
      />
    </main>
  );
}
