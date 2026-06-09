"use client";

import { memo, useCallback, useMemo } from "react";
import { Box, Maximize2 } from "lucide-react";
import {
  buildTileCells,
  getTileGridStyle,
  getTilePageInfo,
  normalizeTileLayoutConfig,
} from "../utils/tileLayoutUtils";
import { getThermalFrameImageDataUrl } from "../utils/thermalFrameImageUtils";
import { TileOverlayPageControls } from "./TileOverlayPageControls";

export function ThermalCameraTileOverlay({
  entries,
  loading,
  onCameraSelect,
  onExpandedEntryChange,
  onTileLayoutChange,
  selectedCameraId,
  tileLayoutConfig,
  worldSnapshot,
}) {
  const normalizedTileLayoutConfig = useMemo(
    () => normalizeTileLayoutConfig(tileLayoutConfig),
    [tileLayoutConfig],
  );
  const cells = useMemo(
    () =>
      buildTileCells(entries, normalizedTileLayoutConfig, {
        getEntryId: (entry) => entry?.camera?.cameraId,
        selectedEntryId: selectedCameraId,
      }),
    [entries, normalizedTileLayoutConfig, selectedCameraId],
  );
  const pageInfo = useMemo(
    () =>
      getTilePageInfo(entries, normalizedTileLayoutConfig, {
        getEntryId: (entry) => entry?.camera?.cameraId,
        selectedEntryId: selectedCameraId,
      }),
    [entries, normalizedTileLayoutConfig, selectedCameraId],
  );
  const gridStyle = getTileGridStyle(normalizedTileLayoutConfig);
  const handlePageChange = useCallback(
    (page) => {
      if (selectedCameraId) {
        onCameraSelect?.(null);
      }

      onTileLayoutChange?.(
        normalizeTileLayoutConfig({
          ...normalizedTileLayoutConfig,
          page,
        }),
      );
    },
    [
      normalizedTileLayoutConfig,
      onCameraSelect,
      onTileLayoutChange,
      selectedCameraId,
    ],
  );

  return (
    <div className="Three3DViewer__thermal-tile-overlay-1 pointer-events-none absolute inset-0 z-[55] grid min-h-0 min-w-0 p-3">
      <TileOverlayPageControls
        pageInfo={pageInfo}
        onPageChange={handlePageChange}
      />
      <div
        className="Three3DViewer__thermal-tile-grid-1 grid min-h-0 min-w-0 gap-2"
        style={gridStyle}
      >
        {cells.map((cell, index) =>
          cell?.type === "world" ? (
            <ThermalWorldTile key="world" snapshot={worldSnapshot} />
          ) : (
            <ThermalCameraImageTile
              key={cell?.camera?.cameraId ?? `thermal-empty-${index}`}
              active={cell?.camera?.cameraId === selectedCameraId}
              entry={cell}
              loading={loading}
              onExpand={(entry) => onExpandedEntryChange?.(entry)}
              onSelect={onCameraSelect}
            />
          ),
        )}
      </div>
    </div>
  );
}

const ThermalWorldTile = memo(function ThermalWorldTile({ snapshot }) {
  return (
    <div className="Three3DViewer__thermal-world-tile-1 pointer-events-none relative min-h-0 min-w-0 overflow-hidden rounded-md border-2 border-cyan-200/70 bg-cyan-950/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_0_26px_rgba(34,211,238,0.22)]">
      {snapshot ? (
        <img
          alt="3D viewer world"
          className="absolute inset-0 h-full w-full bg-neutral-950 object-contain"
          draggable={false}
          src={snapshot}
        />
      ) : null}
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,rgba(103,232,249,0.22)_0,rgba(103,232,249,0.22)_1px,transparent_1px,transparent_12px)]" />
      <div className="absolute inset-2 rounded-sm border border-dashed border-cyan-100/50" />
      <div className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-sm border border-cyan-100/50 bg-neutral-950/82 px-2 py-1 text-[10px] font-bold text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)] backdrop-blur-sm">
        <Box className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">3D VIEWER</span>
      </div>
      <div className="absolute inset-x-7 top-1/2 h-px -translate-y-1/2 bg-cyan-100/40" />
      <div className="absolute inset-y-7 left-1/2 w-px -translate-x-1/2 bg-cyan-100/40" />
      <div className="absolute bottom-2 right-2 rounded-sm border border-cyan-100/35 bg-neutral-950/72 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-100/80 backdrop-blur-sm">
        WORLD
      </div>
    </div>
  );
});

const ThermalCameraImageTile = memo(function ThermalCameraImageTile({
  active,
  entry,
  loading,
  onExpand,
  onSelect,
}) {
  const imageDataUrl = useMemo(
    () => getThermalFrameImageDataUrl(entry?.frame),
    [entry?.frame],
  );
  const camera = entry?.camera;
  const frame = entry?.frame;
  const cameraLabel =
    camera?.cameraIndex ?? (Number.isFinite(entry?.index) ? entry.index + 1 : "-");
  const handleSelect = () => {
    if (camera?.cameraId) {
      onSelect?.(active ? null : camera.cameraId);
    }
  };
  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleSelect();
  };

  return (
    <div
      role="button"
      tabIndex={camera ? 0 : -1}
      aria-pressed={active}
      className={[
        "Three3DViewer__thermal-image-tile-1 pointer-events-auto relative min-h-0 min-w-0 overflow-hidden rounded-md border bg-neutral-950/88 text-left shadow-2xl outline-none transition",
        camera
          ? "cursor-pointer hover:border-cyan-200/55 hover:shadow-[0_0_24px_rgba(103,232,249,0.2)] focus-visible:ring-2 focus-visible:ring-cyan-200/60"
          : "cursor-default opacity-70",
        active
          ? "border-red-400 ring-2 ring-red-400/80 shadow-[0_0_24px_rgba(248,113,113,0.32)]"
          : "border-white/15",
      ].join(" ")}
      title={camera?.cameraName ?? "Thermal camera"}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {imageDataUrl ? (
        <img
          alt={camera?.cameraName ?? "Thermal frame"}
          className="h-full w-full object-cover"
          draggable={false}
          src={imageDataUrl}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-neutral-950 text-[11px] font-semibold text-white/45">
          {loading ? "Loading" : "No frame"}
        </div>
      )}
      <div className="absolute left-2 top-2 rounded-sm border border-white/15 bg-black/72 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        {cameraLabel}
      </div>
      <button
        type="button"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-sm border border-white/20 bg-black/72 text-white/80 backdrop-blur-sm transition hover:border-cyan-200/50 hover:bg-cyan-300/20 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!imageDataUrl}
        title="Expand thermal frame"
        aria-label={`${camera?.cameraName ?? "Thermal camera"} expand`}
        onClick={(event) => {
          event.stopPropagation();
          onExpand?.(entry);
        }}
      >
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {frame ? (
        <div className="absolute bottom-2 right-2 rounded-sm border border-white/15 bg-black/72 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/80 backdrop-blur-sm">
          {frame.width}x{frame.height}
        </div>
      ) : null}
    </div>
  );
});
