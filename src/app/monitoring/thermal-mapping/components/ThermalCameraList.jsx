"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";

export function ThermalCameraList({
  cameras,
  framesByCameraId = {},
  loading = false,
  selectedCameraId,
  onSelectCamera,
}) {
  const { settings } = useDisplaySettings();
  const language = settings.language;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const readyFrameCount = useMemo(
    () =>
      cameras.reduce(
        (count, camera) => count + (framesByCameraId[camera.cameraId] ? 1 : 0),
        0,
      ),
    [cameras, framesByCameraId],
  );
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

  if (!cameras.length) {
    return (
      <section className="min-h-0 rounded-md border border-border bg-card p-4 text-card-foreground">
        <h2 className="text-sm font-semibold">
          {getThermalCameraListTitle(language)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {getEmptyThermalCameraMessage(language)}
        </p>
      </section>
    );
  }

  const selectedLabel =
    getThermalCameraName(selectedCamera, language) ??
    getAllCameraLabel(language);
  const selectedDescription = selectedCamera
    ? `${getThermalPoseLabel(selectedCamera, language)} · ${getDataSourceLabel(
        selectedCamera,
        language,
      )}`
    : getThermalFrameCountLabel(readyFrameCount, cameras.length, language);

  const handleSelect = (cameraId) => {
    onSelectCamera?.(cameraId);
    setOpen(false);
  };

  return (
    <section
      ref={rootRef}
      className="relative min-h-0 rounded-md border border-border bg-card p-3 text-card-foreground"
    >
      <div className="mb-3 min-w-0">
        <h2 className="truncate text-sm font-semibold">
          {getThermalCameraListTitle(language)}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {getThermalCameraListDescription(language)}
        </p>
      </div>

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
        <div className="ThermalCameraList__dropdown-1 absolute left-3 right-3 top-[calc(100%-0.5rem)] z-50 grid max-h-80 gap-1 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          <CameraOption
            active={!selectedCameraId}
            description={getThermalFrameCountLabel(
              readyFrameCount,
              cameras.length,
              language,
            )}
            label={getAllCameraLabel(language)}
            language={language}
            status={getThermalStatusLabel(loading ? "loading" : "all", language)}
            onSelect={() => handleSelect(null)}
          />

          {cameras.map((camera) => {
            const frame = framesByCameraId[camera.cameraId];

            return (
              <CameraOption
                key={camera.cameraId}
                active={camera.cameraId === selectedCameraId}
                description={`${getThermalPoseLabel(
                  camera,
                  language,
                )} · ${getMockSourceLabel(camera, language)}`}
                label={getThermalCameraName(camera, language)}
                language={language}
                status={getThermalStatusLabel(
                  frame ? "ready" : loading ? "loading" : "pending",
                  language,
                )}
                onSelect={() => handleSelect(camera.cameraId)}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function CameraOption({
  active,
  description,
  label,
  language,
  onSelect,
  status,
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
    >
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
            isReadyStatus(status, language)
              ? "border-lime-300/45 text-lime-200"
              : "border-white/15 text-muted-foreground",
          )}
        >
          {status}
        </span>
        {active ? <Check className="h-3.5 w-3.5 text-cyan-300" /> : null}
      </span>
    </button>
  );
}

function getAllCameraLabel(language) {
  return language === "en" ? "All cameras" : "모든 카메라 보기";
}

function getDataSourceLabel(camera, language) {
  if (language === "en") {
    return camera?.dataSourceType ?? "Mock data";
  }

  return "모의 데이터";
}

function getEmptyThermalCameraMessage(language) {
  return language === "en"
    ? "No mock thermal cameras are connected to this asset."
    : "이 설비에 연결된 모의 열화상 카메라가 없습니다.";
}

function getMockSourceLabel(camera, language) {
  if (language === "en") {
    return camera?.mockCsvPath ?? "Mock source";
  }

  return "모의 열화상 데이터";
}

function getThermalCameraListTitle(language) {
  return language === "en" ? "Mock thermal cameras" : "모의 열화상 카메라";
}

function getThermalCameraListDescription(language) {
  return language === "en"
    ? "Backend realtime data substitute using connected thermal camera mock sources."
    : "연결된 모의 열화상 카메라 데이터로 실시간 데이터를 대체합니다.";
}

function getThermalCameraName(camera, language) {
  if (!camera) {
    return undefined;
  }

  return language === "en"
    ? `Thermal camera ${camera.cameraIndex ?? ""}`.trim()
    : camera.cameraName;
}

function getThermalFrameCountLabel(readyFrameCount, totalCount, language) {
  return language === "en"
    ? `${readyFrameCount}/${totalCount} frames ready`
    : `${readyFrameCount}/${totalCount}개 프레임 준비`;
}

function getThermalPoseLabel(camera, language) {
  if (language === "en") {
    return camera?.worldPose?.poseLabel?.includes("sample")
      ? camera.worldPose.poseLabel
      : "Connected camera";
  }

  return "설비 연결 카메라";
}

function getThermalStatusLabel(status, language) {
  const labels = {
    all: language === "en" ? "All" : "전체",
    loading: language === "en" ? "Loading" : "로딩 중",
    pending: language === "en" ? "Pending" : "대기",
    ready: language === "en" ? "Frame ready" : "프레임 준비",
  };

  return labels[status] ?? status;
}

function isReadyStatus(status, language) {
  return (
    status === getThermalStatusLabel("all", language) ||
    status === getThermalStatusLabel("ready", language)
  );
}
