"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function CameraPreviewOverlay({
  selectedCamera,
  onClose,
  screenshotData = null,
}) {
  if (!selectedCamera) {
    return null;
  }

  return (
    <div className={cn(
      "CameraPreviewOverlay CameraPreviewOverlay__root-1",
      "pointer-events-auto absolute left-3 top-3 z-40",
      "w-[min(25%,280px)] rounded-md border border-cyan-200/50",
      "bg-neutral-950/90 p-2 shadow-lg backdrop-blur-sm"
    )}>
      {/* 헤더 - 카메라 이름 및 닫기 버튼 */}
      <div className="CameraPreviewOverlay CameraPreviewOverlay__header-1 mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-cyan-100">
          {selectedCamera.name}
        </p>
        <button
          onClick={onClose}
          className={cn(
            "CameraPreviewOverlay CameraPreviewOverlay__close-btn-1",
            "inline-flex h-5 w-5 items-center justify-center rounded",
            "text-cyan-100/60 hover:bg-cyan-500/20 hover:text-cyan-100",
            "transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400"
          )}
          title="닫기"
        >
          <X size={14} />
        </button>
      </div>

      {/* 카메라 정보 */}
      <div className="CameraPreviewOverlay CameraPreviewOverlay__info-1 mb-2 space-y-0.5 text-[10px] text-cyan-100/70">
        <p>화각: {selectedCamera.fov}°</p>
        <p>
          위치: ({selectedCamera.position.x.toFixed(0)},
          {selectedCamera.position.y.toFixed(0)},
          {selectedCamera.position.z.toFixed(0)})
        </p>
      </div>

      {/* 미리보기 이미지 */}
      <div className="CameraPreviewOverlay CameraPreviewOverlay__image-container-1 overflow-hidden rounded-sm border border-cyan-200/30">
        <img
          src={screenshotData || selectedCamera.sampleImagePath}
          alt={selectedCamera.name}
          className={cn(
            "CameraPreviewOverlay CameraPreviewOverlay__image-1",
            "w-full aspect-video object-cover"
          )}
          onError={(e) => {
            e.target.src = "";
            e.target.style.background = "#0f172a";
            e.target.textContent = "이미지 로드 실패";
          }}
        />
      </div>
    </div>
  );
}
