"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

const ALL_CAMERA_HOVER_ID = "__all__";

export function CameraListOverlay({
  ariaLabel = "카메라 목록",
  cameras = CAMERA_PRESETS,
  getCameraId = (camera) => camera.id,
  getCameraLabel = (camera) => camera.id,
  getCameraName = (camera) => camera.name,
  selectedCameraId,
  showAllOption = false,
  allOptionLabel = "ALL",
  allOptionTitle = "모든 카메라 보기",
  onCameraHover,
  onCameraSelect,
}) {
  const [hoveredCameraId, setHoveredCameraId] = useState(null);

  const handleCameraMouseEnter = (cameraId) => {
    setHoveredCameraId(cameraId);
    onCameraHover?.(cameraId);
  };

  const handleCameraMouseLeave = () => {
    setHoveredCameraId(null);
    onCameraHover?.(null);
  };

  const handleCameraClick = (cameraId) => {
    onCameraSelect?.(cameraId);
  };

  return (
    <div
      className="CameraListOverlay CameraListOverlay__root-1 pointer-events-auto rounded-md border border-white/15 bg-neutral-950/80 p-1.5 text-white shadow-2xl backdrop-blur-md"
      role="toolbar"
      aria-label={ariaLabel}
    >
      <div className="CameraListOverlay CameraListOverlay__list-1 grid gap-1">
        {showAllOption ? (
          <CameraListOverlayButton
            active={!selectedCameraId}
            hovered={hoveredCameraId === ALL_CAMERA_HOVER_ID}
            label={allOptionLabel}
            title={allOptionTitle}
            onClick={() => handleCameraClick(null)}
            onMouseEnter={() => {
              setHoveredCameraId(ALL_CAMERA_HOVER_ID);
              onCameraHover?.(null);
            }}
            onMouseLeave={handleCameraMouseLeave}
          />
        ) : null}
        {cameras.map((camera, index) => {
          const cameraId = getCameraId(camera, index);
          const cameraName = getCameraName(camera, index);
          const cameraLabel = getCameraLabel(camera, index);

          return (
            <CameraListOverlayButton
              key={cameraId}
              active={cameraId === selectedCameraId}
              hovered={cameraId === hoveredCameraId}
              label={cameraLabel}
              title={cameraName}
              onClick={() => handleCameraClick(cameraId)}
              onMouseEnter={() => handleCameraMouseEnter(cameraId)}
              onMouseLeave={handleCameraMouseLeave}
            />
          );
        })}
      </div>
    </div>
  );
}

function CameraListOverlayButton({
  active,
  hovered,
  label,
  onClick,
  onMouseEnter,
  onMouseLeave,
  title,
}) {
  return (
    <button
      type="button"
      className={cn(
        "CameraListOverlay CameraListOverlay__button-1 grid h-8 w-8 place-items-center rounded-sm border text-xs font-semibold text-white/75 transition",
        active
          ? "border-lime-200 bg-lime-300/20 text-lime-50 shadow-[0_0_18px_rgba(190,242,100,0.22)]"
          : hovered
            ? "border-yellow-200 bg-yellow-300/20 text-yellow-50 shadow-[0_0_14px_rgba(250,204,21,0.25)]"
            : "border-transparent hover:border-cyan-200/60 hover:bg-white/10",
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  );
}
