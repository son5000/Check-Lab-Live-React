"use client";

import { memo, useCallback, useMemo } from "react";
import { Box, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllCameraPresets } from "../constants/cameraPresets";
import {
  buildTileCells,
  getTileGridStyle,
  getTilePageInfo,
  normalizeTileLayoutConfig,
} from "../utils/tileLayoutUtils";
import { CameraImageCanvas } from "./CameraImageCanvas";
import { TileOverlayPageControls } from "./TileOverlayPageControls";

export function AnalysisCameraTileOverlay({
  analysisCaptureLayer,
  analysisOverlay,
  canvasRef,
  expandedCamera,
  imageElementRef,
  onCameraImageFrameChange,
  onCameraSelect,
  onExpandedCameraChange,
  onTileLayoutChange,
  selectedCameraId,
  tileLayoutConfig,
  worldSnapshot,
}) {
  const normalizedTileLayoutConfig = useMemo(
    () => normalizeTileLayoutConfig(tileLayoutConfig),
    [tileLayoutConfig],
  );
  const cameras = useMemo(() => getAllCameraPresets(), []);
  const cells = useMemo(
    () =>
      buildTileCells(cameras, normalizedTileLayoutConfig, {
        getEntryId: (camera) => camera?.id,
        selectedEntryId: selectedCameraId,
      }),
    [cameras, normalizedTileLayoutConfig, selectedCameraId],
  );
  const pageInfo = useMemo(
    () =>
      getTilePageInfo(cameras, normalizedTileLayoutConfig, {
        getEntryId: (camera) => camera?.id,
        selectedEntryId: selectedCameraId,
      }),
    [cameras, normalizedTileLayoutConfig, selectedCameraId],
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
    <div className="Three3DViewer Three3DViewer__analysis-tile-overlay-1 pointer-events-none absolute inset-0 z-[45] grid min-h-0 min-w-0 p-3">
      <TileOverlayPageControls
        pageInfo={pageInfo}
        onPageChange={handlePageChange}
      />
      <div
        className="Three3DViewer Three3DViewer__analysis-tile-grid-1 grid min-h-0 min-w-0 gap-2"
        style={gridStyle}
      >
        {cells.map((cell, index) =>
          cell?.type === "world" ? (
            <AnalysisWorldTile key="world" snapshot={worldSnapshot} />
          ) : (
            <AnalysisCameraImageTile
              key={cell?.id ?? `analysis-camera-empty-${index}`}
              active={Boolean(cell?.id && cell.id === selectedCameraId)}
              camera={cell}
              onExpand={(camera) => onExpandedCameraChange?.(camera?.id)}
              onSelect={onCameraSelect}
            />
          ),
        )}
      </div>
      {expandedCamera ? (
        <AnalysisExpandedCameraTile
          analysisCaptureLayer={analysisCaptureLayer}
          analysisOverlay={analysisOverlay}
          canvasRef={canvasRef}
          camera={expandedCamera}
          imageElementRef={imageElementRef}
          onCameraImageFrameChange={onCameraImageFrameChange}
          onClose={() => onExpandedCameraChange?.(null)}
        />
      ) : null}
    </div>
  );
}

export function AnalysisExpandedThermalFramePreview({
  analysisCaptureLayer,
  analysisOverlay,
  canvasRef,
  framePreview,
  imageElementRef,
  onCameraImageFrameChange,
  onClose,
}) {
  return (
    <div
      className="Three3DViewer Three3DViewer__thermal-analysis-expanded-preview-1 pointer-events-auto absolute inset-0 z-[80] grid place-items-center bg-black/76 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={framePreview?.cameraName ?? "Thermal frame preview"}
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[calc(100dvh-1.5rem)] w-[min(96vw,68rem)] max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-cyan-200/35 bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {framePreview?.cameraName ?? "Thermal camera"}
            </p>
            <p className="truncate font-mono text-[11px] text-white/55">
              {framePreview?.width && framePreview?.height
                ? `${framePreview.width}x${framePreview.height}`
                : "No frame"}
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
            title="Close"
            aria-label="Close expanded thermal frame"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative h-[min(64dvh,34rem)] min-h-[14rem] overflow-hidden bg-black md:h-[min(74dvh,40rem)]">
          {framePreview?.imageUrl ? (
            <>
              <CameraImageCanvas
                canvasRef={canvasRef}
                imageElementRef={imageElementRef}
                imageUrl={framePreview.imageUrl}
                label={framePreview.cameraName}
                onFrameChange={onCameraImageFrameChange}
              />
              {analysisOverlay}
              {analysisCaptureLayer}
            </>
          ) : (
            <div className="grid min-h-[16rem] place-items-center text-sm font-semibold text-white/50">
              No frame
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const AnalysisWorldTile = memo(function AnalysisWorldTile({ snapshot }) {
  return (
    <div className="Three3DViewer Three3DViewer__analysis-world-tile-1 pointer-events-none relative min-h-0 min-w-0 overflow-hidden rounded-md border-2 border-cyan-200/70 bg-cyan-950/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_0_26px_rgba(34,211,238,0.22)]">
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

const AnalysisCameraImageTile = memo(function AnalysisCameraImageTile({
  active,
  camera,
  onExpand,
  onSelect,
}) {
  const handleSelect = () => {
    if (camera?.id) {
      onSelect?.(active ? null : camera.id);
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
      className={cn(
        "Three3DViewer Three3DViewer__analysis-camera-tile-1 pointer-events-auto relative min-h-0 min-w-0 overflow-hidden rounded-md border bg-neutral-950/88 text-left shadow-2xl outline-none transition",
        camera
          ? "cursor-pointer hover:border-cyan-200/55 hover:shadow-[0_0_24px_rgba(103,232,249,0.2)] focus-visible:ring-2 focus-visible:ring-cyan-200/60"
          : "cursor-default opacity-70",
        active
          ? "border-red-400 ring-2 ring-red-400/80 shadow-[0_0_24px_rgba(248,113,113,0.32)]"
          : "border-white/15",
      )}
      title={camera?.name ?? "Camera"}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {camera?.sampleImagePath ? (
        <img
          alt={camera.name}
          className="h-full w-full object-cover"
          draggable={false}
          src={camera.sampleImagePath}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-neutral-950 text-[11px] font-semibold text-white/45">
          No camera
        </div>
      )}
      <div className="absolute left-2 top-2 rounded-sm border border-white/15 bg-black/72 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        {camera?.id ?? "-"}
      </div>
      <button
        type="button"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-sm border border-white/20 bg-black/72 text-white/80 backdrop-blur-sm transition hover:border-cyan-200/50 hover:bg-cyan-300/20 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!camera?.sampleImagePath}
        title="Expand camera frame"
        aria-label={`${camera?.name ?? "Camera"} expand`}
        onClick={(event) => {
          event.stopPropagation();
          onExpand?.(camera);
        }}
      >
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
});

const AnalysisExpandedCameraTile = memo(function AnalysisExpandedCameraTile({
  analysisCaptureLayer,
  analysisOverlay,
  camera,
  canvasRef,
  imageElementRef,
  onCameraImageFrameChange,
  onClose,
}) {
  return (
    <div
      className="Three3DViewer Three3DViewer__analysis-expanded-preview-1 pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-black/76 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={camera?.name ?? "Camera preview"}
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[calc(100dvh-1.5rem)] w-[min(96vw,68rem)] max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-cyan-200/35 bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {camera?.name ?? "Camera"}
            </p>
            <p className="truncate font-mono text-[11px] text-white/55">
              FOV {camera?.fov ?? "-"} deg
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
            title="Close"
            aria-label="Close expanded camera frame"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative h-[min(64dvh,34rem)] min-h-[14rem] overflow-hidden bg-black md:h-[min(74dvh,40rem)]">
          {camera?.sampleImagePath ? (
            <>
              <CameraImageCanvas
                canvasRef={canvasRef}
                imageElementRef={imageElementRef}
                imageUrl={camera.sampleImagePath}
                label={camera.name}
                onFrameChange={onCameraImageFrameChange}
              />
              {analysisOverlay}
              {analysisCaptureLayer}
            </>
          ) : (
            <div className="grid min-h-[16rem] place-items-center text-sm font-semibold text-white/50">
              No camera frame
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
