"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";
import { ControlSection } from "./control-fields";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

export function CameraVisualizationControls({
  className,
  config,
  onChange,
  onResetView,
  selectedCamera,
}) {
  const { settings } = useDisplaySettings();
  const language = settings.language;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedCameraId = config?.selectedCameraId;
  const showAll = config?.showAll !== false;
  const selectedCameraOption = useMemo(
    () => CAMERA_PRESETS.find((camera) => camera.id === selectedCameraId),
    [selectedCameraId],
  );
  const selectedLabel = showAll
    ? getAllCameraLabel(language)
    : getCameraDisplayName(selectedCameraOption, language) ??
      getCameraSelectFallbackLabel(language);
  const selectedDescription = showAll
    ? getAllCameraDescription(CAMERA_PRESETS.length, language)
    : selectedCameraOption
      ? getCameraDescription(selectedCameraOption, language)
      : getCameraSelectDescription(language);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const handleCameraChange = (cameraId) => {
    if (cameraId === "all") {
      onChange({
        ...config,
        showAll: true,
        selectedCameraId: null,
      });
    } else {
      onChange({
        ...config,
        showAll: false,
        selectedCameraId: cameraId,
      });
    }

    setOpen(false);
  };

  return (
    <ControlSection icon={Camera} title="카메라 시점" className={className}>
      <div className="grid gap-3">
        <div ref={rootRef} className="relative min-w-0">
          <button
            type="button"
            className="CameraVisualizationControls__select-trigger-1 flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition hover:border-cyan-300/60 hover:bg-cyan-300/5"
            aria-expanded={open}
            onClick={() => setOpen((currentOpen) => !currentOpen)}
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-sm font-semibold">
                {selectedLabel}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {selectedDescription}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition",
                open ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
          </button>

          {open ? (
            <div className="CameraVisualizationControls__dropdown-1 absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 grid max-h-80 gap-1 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl">
              <CameraVisualizationOption
                active={showAll}
                description={getAllCameraDescription(
                  CAMERA_PRESETS.length,
                  language,
                )}
                label={getAllCameraLabel(language)}
                onSelect={() => handleCameraChange("all")}
              />
              {CAMERA_PRESETS.map((camera) => (
                <CameraVisualizationOption
                  key={camera.id}
                  active={!showAll && camera.id === selectedCameraId}
                  description={getCameraDescription(camera, language)}
                  label={getCameraOptionLabel(camera, language)}
                  onSelect={() => handleCameraChange(camera.id)}
                />
              ))}
            </div>
          ) : null}
        </div>

        {selectedCamera && !showAll ? (
          <div className="rounded-md border border-border/50 bg-muted/30 p-2">
            <p className="text-xs font-semibold text-foreground">
              {getCameraDisplayName(selectedCamera, language)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {getPositionLabel(language)}: (
              {selectedCamera.position.x.toFixed(1)},{" "}
              {selectedCamera.position.y.toFixed(1)},{" "}
              {selectedCamera.position.z.toFixed(1)})
            </p>
            <p className="text-[10px] text-muted-foreground">
              {getFovLabel(language)}: {selectedCamera.fov}°
            </p>
          </div>
        ) : null}

        {selectedCamera && !showAll && onResetView ? (
          <button
            className={cn(
              "CameraVisualizationControls__reset-1 h-8 rounded-md border border-border bg-card px-2",
              "text-xs font-semibold text-foreground transition-colors hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-primary",
            )}
            onClick={onResetView}
            type="button"
          >
            {getResetViewLabel(language)}
          </button>
        ) : null}

        {showAll ? (
          <div className="rounded-md border border-border/50 bg-muted/30 p-2">
            <p className="text-xs font-semibold text-foreground">
              {getAllCameraVisibleTitle(language)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {getAllCameraVisibleDescription(CAMERA_PRESETS.length, language)}
            </p>
          </div>
        ) : null}
      </div>
    </ControlSection>
  );
}

function getAllCameraLabel(language) {
  return language === "en" ? "All cameras" : "모든 카메라 보기";
}

function getAllCameraDescription(count, language) {
  return language === "en"
    ? `${count} camera views`
    : `${count}개 카메라 시야`;
}

function getAllCameraVisibleTitle(language) {
  return language === "en" ? "All cameras visible" : "모든 카메라 표시";
}

function getAllCameraVisibleDescription(count, language) {
  return language === "en"
    ? `${count} camera fields of view are visible.`
    : `${count}개의 카메라 화각이 모두 표시됩니다.`;
}

function getCameraDescription(camera, language) {
  return language === "en"
    ? `${getCameraDisplayName(camera, language)} · FOV ${camera.fov}°`
    : `${getCameraDisplayName(camera, language)} · 화각 ${camera.fov}°`;
}

function getCameraDisplayName(camera, language) {
  if (!camera?.name) {
    return undefined;
  }

  const englishName = camera.name.match(/\(([^)]+)\)/)?.[1];

  if (language === "en") {
    return englishName ?? camera.name;
  }

  return camera.name.replace(/\s*\([^)]*\)/g, "").trim();
}

function getCameraOptionLabel(camera, language) {
  return language === "en" ? `CAM ${camera.id}` : `카메라 ${camera.id}`;
}

function getCameraSelectFallbackLabel(language) {
  return language === "en" ? "Select camera" : "카메라 선택";
}

function getCameraSelectDescription(language) {
  return language === "en" ? "Select a camera" : "카메라를 선택하세요";
}

function getPositionLabel(language) {
  return language === "en" ? "Position" : "위치";
}

function getFovLabel(language) {
  return language === "en" ? "FOV" : "화각";
}

function getResetViewLabel(language) {
  return language === "en" ? "Show overview" : "전체 시점 보기";
}

function CameraVisualizationOption({
  active,
  description,
  label,
  onSelect,
}) {
  return (
    <button
      type="button"
      className={cn(
        "CameraVisualizationControls__option-1 grid min-h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2 py-2 text-left transition",
        active ? "bg-cyan-300/12 text-foreground" : "hover:bg-accent",
      )}
      aria-selected={active}
      onClick={onSelect}
    >
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="grid h-4 w-4 shrink-0 place-items-center">
        {active ? <Check className="h-3.5 w-3.5 text-cyan-300" /> : null}
      </span>
    </button>
  );
}
