"use client";
import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import {
  ControlSection,
  RangeField,
  Vector3Fields,
  SegmentedButton,
} from "./control-fields";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

export function CameraPositionControls({
  config,
  onChange,
  renderSection = true,
  showCameraSelector = true,
}) {
  const [selectedId, setSelectedId] = useState(config?.selectedCameraId || "1");
  const selectedCameraId = config?.selectedCameraId;

  useEffect(() => {
    if (selectedCameraId) {
      setSelectedId(selectedCameraId);
    }
  }, [selectedCameraId]);

  const selectedCamera = CAMERA_PRESETS.find((cam) => cam.id === selectedId);
  if (!selectedCamera) {
    return null;
  }

  const customPositions = config?.customPositions || {};
  const customFovs = config?.customFovs || {};
  const currentPosition = customPositions[selectedId] || selectedCamera.position;
  const currentFov = customFovs[selectedId] ?? selectedCamera.fov ?? 60;

  const handleCameraSelect = (cameraId) => {
    setSelectedId(cameraId);
    onChange({
      ...config,
      selectedCameraId: cameraId,
      showAll: false,
    });
  };

  const handlePositionChange = (newPosition) => {
    onChange({
      ...config,
      selectedCameraId: selectedId,
      showAll: false,
      customPositions: {
        ...customPositions,
        [selectedId]: newPosition,
      },
    });
  };

  const handleFovChange = (newFov) => {
    onChange({
      ...config,
      selectedCameraId: selectedId,
      showAll: false,
      customFovs: {
        ...customFovs,
        [selectedId]: newFov,
      },
    });
  };

  const handleResetCamera = () => {
    const { [selectedId]: _, ...restPositions } = customPositions;
    const { [selectedId]: __, ...restFovs } = customFovs;
    onChange({
      ...config,
      customPositions: restPositions,
      customFovs: restFovs,
    });
  };

  const isCustomized =
    customPositions[selectedId] !== undefined ||
    customFovs[selectedId] !== undefined;

  const emptyBody = (
    <div className="rounded-md border border-dashed border-border bg-card px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground">
      카메라를 선택하면 위치와 화각을 조정할 수 있습니다.
    </div>
  );

  if (!showCameraSelector && !selectedCameraId) {
    return renderSection ? (
      <ControlSection icon={Crosshair} title="카메라 위치 / 화각">
        {emptyBody}
      </ControlSection>
    ) : (
      emptyBody
    );
  }

  const body = (
    <>
      {showCameraSelector ? (
      <div className="CameraPositionControls__cameras grid grid-cols-3 gap-1">
        {CAMERA_PRESETS.map((camera) => (
          <SegmentedButton
            key={camera.id}
            active={selectedId === camera.id}
            onClick={() => handleCameraSelect(camera.id)}
            title={camera.name}
          >
            CAM {camera.id}
          </SegmentedButton>
        ))}
      </div>
      ) : null}

      <div className="CameraPositionControls__header flex min-w-0 items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5">
        <span className="text-[11px] font-semibold text-foreground truncate">
          {selectedCamera.name}
        </span>
        {isCustomized && (
          <button
            type="button"
            onClick={handleResetCamera}
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
      <RangeField
        label="FOV"
        max={95}
        min={25}
        onChange={handleFovChange}
        step={1}
        suffix="°"
        value={currentFov}
      />
    </>
  );

  if (!renderSection) {
    return body;
  }

  return (
    <ControlSection icon={Crosshair} title="카메라 위치 / 화각">
      {body}
    </ControlSection>
  );
}
