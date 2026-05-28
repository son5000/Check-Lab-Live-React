"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

export function CameraListOverlay({ selectedCameraId, onCameraHover, onCameraSelect }) {
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
      aria-label="카메라 목록"
    >
      <div className="CameraListOverlay CameraListOverlay__list-1 grid gap-1">
        {CAMERA_PRESETS.map((camera) => {
          const isSelected = camera.id === selectedCameraId;
          const isHovered = camera.id === hoveredCameraId;

          return (
            <button
              key={camera.id}
              type="button"
              className={cn(
                "CameraListOverlay CameraListOverlay__button-1 grid h-8 w-8 place-items-center rounded-sm border text-white/75 text-xs font-semibold transition",
                isSelected
                  ? "border-lime-200 bg-lime-300/20 text-lime-50 shadow-[0_0_18px_rgba(190,242,100,0.22)]"
                  : isHovered
                  ? "border-yellow-200 bg-yellow-300/20 text-yellow-50 shadow-[0_0_14px_rgba(250,204,21,0.25)]"
                  : "border-transparent hover:border-cyan-200/60 hover:bg-white/10"
              )}
              onClick={() => handleCameraClick(camera.id)}
              onMouseEnter={() => handleCameraMouseEnter(camera.id)}
              onMouseLeave={handleCameraMouseLeave}
              title={camera.name}
              aria-label={`카메라 ${camera.id}: ${camera.name}`}
            >
              {camera.id}
            </button>
          );
        })}
      </div>
    </div>
  );
}
