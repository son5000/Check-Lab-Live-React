"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { createThermalCanvasFromFrame } from "@/lib/thermal-mapping";
import { cn } from "@/lib/utils";

export function ThermalCalibrationOverlay({
  alignment,
  captureResult,
  description = "기존 3D Viewer canvas 위에 열화상 Mock 이미지를 정합합니다.",
  error,
  frame,
  loading,
  onAlignmentChange,
  onRefreshCapture,
  paletteRange,
  title = "3D Viewer capture overlay",
}) {
  const canvasHostRef = useRef(null);
  const dragStateRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const safeAlignment = useMemo(
    () => ({
      opacity: toFiniteNumber(alignment?.opacity, 0.6),
      positionX: toFiniteNumber(alignment?.positionX, 0),
      positionY: toFiniteNumber(alignment?.positionY, 0),
      rotation: toFiniteNumber(alignment?.rotation, 0),
      scaleX: toFiniteNumber(alignment?.scaleX, 1),
      scaleY: toFiniteNumber(alignment?.scaleY, 1),
    }),
    [alignment],
  );

  useEffect(() => {
    const host = canvasHostRef.current;

    if (!host) {
      return undefined;
    }

    host.replaceChildren();

    if (!frame) {
      return undefined;
    }

    const canvas = createThermalCanvasFromFrame(frame, paletteRange);

    if (!canvas) {
      return undefined;
    }

    canvas.className = "block h-full w-full";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.setAttribute("aria-label", `${frame.cameraName} thermal overlay`);
    host.appendChild(canvas);

    return () => {
      if (canvas.parentNode === host) {
        host.removeChild(canvas);
      }
    };
  }, [frame, paletteRange]);

  const captureAspectRatio =
    captureResult?.width && captureResult?.height
      ? `${captureResult.width} / ${captureResult.height}`
      : "16 / 9";
  const thermalAspectRatio =
    frame?.width && frame?.height ? `${frame.width} / ${frame.height}` : "4 / 3";

  const handlePointerDown = (event) => {
    if (!frame || !captureResult?.ok || !onAlignmentChange) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      originX: safeAlignment.positionX,
      originY: safeAlignment.positionY,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    onAlignmentChange?.({
      positionX: Math.round(dragState.originX + event.clientX - dragState.startX),
      positionY: Math.round(dragState.originY + event.clientY - dragState.startY),
    });
  };

  const handlePointerEnd = (event) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);
  };

  return (
    <section className="grid min-h-0 gap-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-semibold text-white">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-white/55">
            {description}
          </p>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-white/75 transition hover:bg-white/[0.12] hover:text-white"
          onClick={onRefreshCapture}
          title="3D Viewer 다시 캡처"
          aria-label="3D Viewer 다시 캡처"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="relative grid min-h-[18rem] overflow-hidden rounded-md border border-white/12 bg-neutral-950"
        style={{ aspectRatio: captureAspectRatio }}
      >
        {captureResult?.ok ? (
          <img
            src={captureResult.dataUrl}
            alt="Captured existing 3D Viewer"
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <OverlayState
            icon="warning"
            text={
              captureResult?.error ??
              "기존 3D Viewer canvas 캡처가 아직 준비되지 않았습니다."
            }
            onRefreshCapture={onRefreshCapture}
          />
        )}

        {loading ? <OverlayState icon="loading" text="열화상 frame 로딩 중" /> : null}
        {!loading && error ? <OverlayState icon="warning" text={error} /> : null}

        {captureResult?.ok && frame ? (
          <div
            className={cn(
              "absolute left-1/2 top-1/2 touch-none overflow-hidden rounded-sm border border-white/25 shadow-2xl shadow-black/45",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{
              aspectRatio: thermalAspectRatio,
              opacity: Math.max(0, Math.min(1, safeAlignment.opacity)),
              transform: `translate(-50%, -50%) translate(${safeAlignment.positionX}px, ${safeAlignment.positionY}px) scale(${safeAlignment.scaleX}, ${safeAlignment.scaleY}) rotate(${safeAlignment.rotation}deg)`,
              transformOrigin: "center",
              width: "min(64%, 32rem)",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <div ref={canvasHostRef} className="h-full w-full bg-neutral-950" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OverlayState({ icon, onRefreshCapture, text }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 p-4 text-center backdrop-blur-sm">
      <div className="grid max-w-sm place-items-center gap-2">
        {icon === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
        ) : null}
        {icon === "warning" ? (
          <AlertTriangle className="h-5 w-5 text-amber-200" />
        ) : null}
        <p className="text-xs font-semibold text-white/78">{text}</p>
        {onRefreshCapture ? (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.08] px-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/[0.14] hover:text-white"
            onClick={onRefreshCapture}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            다시 캡처
          </button>
        ) : null}
      </div>
    </div>
  );
}

function toFiniteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}
