"use client";
import { useState } from "react";
import { Crosshair } from "lucide-react";
import { ControlSection, Vector3Fields, SegmentedButton } from "./control-fields";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

export function CameraPositionControls({ config, onChange }) {
  const [selectedId, setSelectedId] = useState(config?.selectedCameraId || "1");

  const selectedCamera = CAMERA_PRESETS.find((cam) => cam.id === selectedId);
  if (!selectedCamera) {
    return null;
  }

  const customPositions = config?.customPositions || {};
  const currentPosition = customPositions[selectedId] || selectedCamera.position;

  const handlePositionChange = (newPosition) => {
    onChange({
      ...config,
      customPositions: {
        ...customPositions,
        [selectedId]: newPosition,
      },
    });
  };

  const handleResetPosition = () => {
    const { [selectedId]: _, ...restPositions } = customPositions;
    onChange({
      ...config,
      customPositions: restPositions,
    });
  };

  const isCustomized = customPositions[selectedId] !== undefined;

  return (
    <ControlSection icon={Crosshair} title="카메라 위치">
      <div className="CameraPositionControls__cameras grid grid-cols-3 gap-1">
        {CAMERA_PRESETS.map((camera) => (
          <SegmentedButton
            key={camera.id}
            active={selectedId === camera.id}
            onClick={() => setSelectedId(camera.id)}
            title={camera.name}
          >
            CAM {camera.id}
          </SegmentedButton>
        ))}
      </div>

      <div className="CameraPositionControls__header flex min-w-0 items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5">
        <span className="text-[11px] font-semibold text-foreground truncate">
          {selectedCamera.name}
        </span>
        {isCustomized && (
          <button
            type="button"
            onClick={handleResetPosition}
            className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition shrink-0"
            title="기본값으로 리셋"
          >
            리셋
          </button>
        )}
      </div>

      <Vector3Fields
        labels={["X", "Y", "Z"]}
        value={currentPosition}
        onChange={handlePositionChange}
      />

      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <div>기본값: {formatVector(selectedCamera.position)}</div>
        {isCustomized && (
          <div className="text-cyan-400">현재: {formatVector(currentPosition)}</div>
        )}
      </div>
    </ControlSection>
  );
}

function formatVector(vec) {
  return `(${Math.round(vec.x * 100) / 100}, ${Math.round(vec.y * 100) / 100}, ${Math.round(vec.z * 100) / 100})`;
}

