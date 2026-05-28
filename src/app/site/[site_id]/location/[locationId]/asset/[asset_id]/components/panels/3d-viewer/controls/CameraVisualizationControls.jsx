"use client";

import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlSection, ToggleField } from "./control-fields";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

export function CameraVisualizationControls({
  className,
  config,
  onChange,
  onResetView,
  selectedCamera,
}) {
  const selectedCameraId = config?.selectedCameraId;
  const showAll = config?.showAll !== false;
  const showLaserBeams = config?.showLaserBeams !== false;

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
  };

  const handleLaserBeamChange = (checked) => {
    onChange({
      ...config,
      showLaserBeams: checked,
    });
  };

  return (
    <ControlSection icon={Camera} title="카메라 시점" className={className}>
      <div className="grid gap-3">
        {/* 카메라 선택 드롭다운 */}
        <div className="grid gap-1">
          <label className="text-xs font-semibold text-muted-foreground">
            카메라 선택
          </label>
          <select
            value={showAll ? "all" : selectedCameraId || "all"}
            onChange={(e) => handleCameraChange(e.target.value)}
            className={cn(
              "CameraVisualizationControls__select-1 rounded-md border border-border bg-background px-3 py-2 text-sm",
              "transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            )}
          >
            <option value="all">모든 카메라 (전체 보기)</option>
            {CAMERA_PRESETS.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.id}. {camera.name}
              </option>
            ))}
          </select>
        </div>

        <ToggleField
          checked={showLaserBeams}
          label="레이저 빔 표시"
          onChange={handleLaserBeamChange}
        />

        {/* 선택된 카메라 정보 표시 */}
        {selectedCamera && !showAll && (
          <div className="rounded-md border border-border/50 bg-muted/30 p-2">
            <p className="text-xs font-semibold text-foreground">
              {selectedCamera.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              위치: ({selectedCamera.position.x.toFixed(1)},
              {selectedCamera.position.y.toFixed(1)},
              {selectedCamera.position.z.toFixed(1)})
            </p>
            <p className="text-[10px] text-muted-foreground">
              화각: {selectedCamera.fov}°
            </p>
          </div>
        )}

        {selectedCamera && !showAll && onResetView && (
          <button
            className={cn(
              "CameraVisualizationControls__reset-1 h-8 rounded-md border border-border bg-card px-2",
              "text-xs font-semibold text-foreground transition-colors hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-primary"
            )}
            onClick={onResetView}
            type="button"
          >
            전체 시점 보기
          </button>
        )}

        {/* 전체 보기 정보 */}
        {showAll && (
          <div className="rounded-md border border-border/50 bg-muted/30 p-2">
            <p className="text-xs font-semibold text-foreground">
              모든 카메라 표시
            </p>
            <p className="text-[10px] text-muted-foreground">
              9개의 카메라 화각이 모두 표시됩니다
            </p>
          </div>
        )}

      </div>
    </ControlSection>
  );
}
