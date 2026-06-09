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
  requireSelection = false,
  renderSection = true,
  selectedCamera,
}) {
  const { settings } = useDisplaySettings();
  const language = settings.language;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedCameraId = config?.selectedCameraId;
  const showAll = requireSelection ? false : config?.showAll !== false;
  const selectedCameraOption = useMemo(
    () => CAMERA_PRESETS.find((camera) => camera.id === selectedCameraId),
    [selectedCameraId],
  );
  const selectedLabel = showAll
    ? getAllCameraLabel(language)
    : getCameraDisplayName(selectedCameraOption, language) ??
      getCameraSelectFallbackLabel(language);

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
      if (requireSelection) {
        return;
      }

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

  const body = (
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
              {!requireSelection ? (<CameraVisualizationOption
                active={showAll}
                label={getAllCameraLabel(language)}
                onSelect={() => handleCameraChange("all")}
              />) : null}
              {CAMERA_PRESETS.map((camera) => (
                <CameraVisualizationOption
                  key={camera.id}
                  active={!showAll && camera.id === selectedCameraId}
                  label={getCameraOptionLabel(camera, language)}
                  onSelect={() => handleCameraChange(camera.id)}
                />
              ))}
            </div>
          ) : null}
        </div>

        {selectedCamera && !showAll && onResetView && !requireSelection ? (
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

        {requireSelection && !selectedCamera ? (
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground">
            {getCameraRequiredMessage(language)}
          </div>
        ) : null}
      </div>
  );

  if (!renderSection) {
    return body;
  }

  return (
    <ControlSection icon={Camera} title="실화상 카메라 선택" className={className}>
      {body}
    </ControlSection>
  );
}

function getAllCameraLabel(language) {
  return language === "en" ? "All cameras" : "모든 카메라";
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
  return String(camera.id);
}

function getCameraSelectFallbackLabel(language) {
  return language === "en" ? "Select camera" : "카메라 선택";
}

function getCameraRequiredMessage(language) {
  return language === "en"
    ? "Select a camera to edit its position and FOV."
    : "카메라를 선택하면 위치와 화각을 설정할 수 있습니다.";
}



function getResetViewLabel(language) {
  return language === "en" ? "Show overview" : "전체 시점 보기";
}

function CameraVisualizationOption({
  active,
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
      </span>
      <span className="grid h-4 w-4 shrink-0 place-items-center">
        {active ? <Check className="h-3.5 w-3.5 text-cyan-300" /> : null}
      </span>
    </button>
  );
}
