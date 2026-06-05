"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";

export function ThermalCameraList({
  cameras,
  onCameraHover,
  onSelectCamera,
  requireSelection = false,
  renderSection = true,
  selectedCameraId,
}) {
  const { settings } = useDisplaySettings();
  const language = settings.language;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.cameraId === selectedCameraId),
    [cameras, selectedCameraId],
  );

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

  useEffect(() => {
    if (!open) {
      onCameraHover?.(null);
    }
  }, [onCameraHover, open]);

  if (!cameras.length) {
    const emptyBody = (
      <div className="rounded-md border border-dashed border-border bg-card px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground">
        {getEmptyThermalCameraMessage(language)}
      </div>
    );

    return renderSection ? (
      <section className="min-h-0 rounded-md border border-border bg-card p-4 text-card-foreground">
        <h2 className="text-sm font-semibold">
          {getThermalCameraListTitle(language)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {getEmptyThermalCameraMessage(language)}
        </p>
      </section>
    ) : (
      emptyBody
    );
  }

  const selectedLabel =
    getThermalCameraName(selectedCamera, language) ??
    (requireSelection
      ? getThermalCameraSelectLabel(language)
      : getAllCameraLabel(language));

  const handleSelect = (cameraId) => {
    if (!cameraId && requireSelection) {
      return;
    }

    onCameraHover?.(null);
    onSelectCamera?.(cameraId);
    setOpen(false);
  };

  const body = (
    <>
      {renderSection ? (
        <div className="mb-3 min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {getThermalCameraListTitle(language)}
          </h2>
        </div>
      ) : null}

      <button
        type="button"
        className="ThermalCameraList__select-trigger-1 flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition hover:border-cyan-300/60 hover:bg-cyan-300/5"
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
        <div
          className={cn(
            "ThermalCameraList__dropdown-1 absolute z-50 grid max-h-80 gap-1 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl",
            renderSection
              ? "left-3 right-3 top-[calc(100%-0.5rem)]"
              : "left-0 right-0 top-[calc(100%+0.25rem)]",
          )}
        >
          {!requireSelection ? (<CameraOption
            active={!selectedCameraId}
            label={getAllCameraLabel(language)}
            onMouseEnter={() => onCameraHover?.(null)}
            onMouseLeave={() => onCameraHover?.(null)}
            onSelect={() => handleSelect(null)}
          />) : null}

          {cameras.map((camera) => (
            <CameraOption
              key={camera.cameraId}
              active={camera.cameraId === selectedCameraId}
              label={getThermalCameraName(camera, language)}
              onMouseEnter={() => onCameraHover?.(camera.cameraId)}
              onMouseLeave={() => onCameraHover?.(null)}
              onSelect={() => handleSelect(camera.cameraId)}
            />
          ))}
        </div>
      ) : null}
    </>
  );

  if (!renderSection) {
    return (
      <div ref={rootRef} className="relative min-w-0">
        {body}
      </div>
    );
  }

  return (
    <section
      ref={rootRef}
      className="relative min-h-0 rounded-md border border-border bg-card p-3 text-card-foreground"
    >
      {body}
    </section>
  );
}

function CameraOption({
  active,
  label,
  onMouseEnter,
  onMouseLeave,
  onSelect,
}) {
  return (
    <button
      type="button"
      className={cn(
        "ThermalCameraList__option-1 grid min-h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2 py-2 text-left transition",
        active ? "bg-cyan-300/12 text-foreground" : "hover:bg-accent",
      )}
      aria-selected={active}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-sm font-semibold">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {active ? <Check className="h-3.5 w-3.5 text-cyan-300" /> : null}
      </span>
    </button>
  );
}

function getAllCameraLabel(language) {
  return language === "en" ? "All cameras" : "모든 카메라 보기";
}

function getThermalCameraSelectLabel(language) {
  return language === "en" ? "Select thermal camera" : "열화상 카메라 선택";
}

function getEmptyThermalCameraMessage(language) {
  return language === "en"
    ? "No mock thermal cameras are connected to this asset."
    : "이 설비에 연결된 모의 열화상 카메라가 없습니다.";
}

function getThermalCameraListTitle(language) {
  return language === "en" ? "Mock thermal cameras" : "모의 열화상 카메라";
}


function getThermalCameraName(camera) {
  if (!camera) {
    return undefined;
  }

  if (camera.cameraIndex !== undefined && camera.cameraIndex !== null) {
    return `${camera.cameraIndex}`.trim();
  }

  const cameraName = `${camera.cameraName ?? ""}`.trim();
  return cameraName
    .replace(/^(?:열화상 카메라|Thermal camera)\s+/i, "")
    .trim();
}
