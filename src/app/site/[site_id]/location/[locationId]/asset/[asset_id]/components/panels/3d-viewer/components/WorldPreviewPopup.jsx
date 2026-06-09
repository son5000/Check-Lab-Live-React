"use client";

import { Box, Loader2, X } from "lucide-react";

export function WorldPreviewPopup({
  onClose,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  popupRef,
  position,
  preview,
  snapshot,
  snapshotFailed,
}) {
  if (!preview) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      className="Three3DViewer Three3DViewer__world-host-1 pointer-events-auto absolute z-40 w-[min(38%,416px)] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-md border border-cyan-200/50 bg-neutral-950/90 p-2 shadow-2xl backdrop-blur-sm"
      style={
        position
          ? { left: position.left, top: position.top }
          : { left: "0.75rem", top: "0.75rem" }
      }
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="Three3DViewer Three3DViewer__world-preview-header-1 mb-2 flex min-w-0 cursor-grab select-none items-start justify-between gap-2 text-cyan-100 active:cursor-grabbing">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{preview.label}</p>
          <p className="sr-only">Live 3D world</p>
          <p className="truncate font-mono text-[10px] text-cyan-100/70">
            {formatWorldPreviewSubtitle(preview)}
          </p>
        </div>
        <button
          type="button"
          className="Three3DViewer Three3DViewer__world-preview-close-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-cyan-200/20 bg-white/5 p-0 text-cyan-100/70 transition hover:bg-cyan-300/15 hover:text-cyan-50"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          title="Close camera preview"
          aria-label="Close camera preview"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="Three3DViewer Three3DViewer__world-snapshot-frame-1 flex max-h-full items-center justify-center overflow-hidden rounded-sm border border-cyan-200/30 bg-neutral-950">
        {snapshot ? (
          <img
            alt={`${preview.label} world snapshot`}
            className="Three3DViewer Three3DViewer__world-snapshot-1 block max-h-full max-w-full object-contain"
            src={snapshot}
          />
        ) : snapshotFailed ? (
          <div
            className="Three3DViewer Three3DViewer__world-snapshot-fallback-1 flex aspect-video w-full items-center justify-center text-cyan-100/55"
            aria-label="World snapshot unavailable"
            role="img"
          >
            <Box className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : (
          <div className="Three3DViewer Three3DViewer__world-snapshot-loader-frame-1 flex aspect-video w-full items-center justify-center">
            <Loader2
              className="Three3DViewer Three3DViewer__world-snapshot-loader-1 h-5 w-5 animate-spin text-cyan-100/70"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatWorldPreviewSubtitle(preview) {
  const fov = Number(preview?.fov);

  if (Number.isFinite(fov)) {
    return `World snapshot / FOV ${Math.round(fov * 10) / 10} deg`;
  }

  return "World snapshot";
}
