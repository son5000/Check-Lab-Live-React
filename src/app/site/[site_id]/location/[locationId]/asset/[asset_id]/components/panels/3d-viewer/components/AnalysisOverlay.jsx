"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  areOverlayMetricsEqual,
  getCalloutConnectorGeometry,
  getResizeHandleStyle,
  roundOverlayValue,
} from "../utils/analysisOverlayUtils";

const RESIZE_HANDLES = ["nw", "ne", "se", "sw"];

export function AnalysisOverlay({
  analysisSummary,
  analysisTargets,
  isEditing,
  onDelete,
  onSelect,
  onTargetPointerCancel,
  onTargetPointerDown,
  onTargetPointerMove,
  onTargetPointerUp,
  projectedTargets,
  selectedProjectedTarget,
  selectedTargetId,
}) {
  const calloutRef = useRef(null);
  const rootRef = useRef(null);
  const [overlayMetrics, setOverlayMetrics] = useState();
  const projectedTargetById = useMemo(
    () => new Map(projectedTargets.map((target) => [target.id, target])),
    [projectedTargets],
  );
  const connectorGeometry =
    selectedProjectedTarget?.visible && analysisSummary
      ? getCalloutConnectorGeometry(selectedProjectedTarget, overlayMetrics)
      : undefined;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    let frameId = 0;
    const updateMetrics = () => {
      frameId = 0;
      const rootRect = root.getBoundingClientRect();
      const calloutRect = calloutRef.current?.getBoundingClientRect();
      const nextMetrics = {
        calloutRect: calloutRect
          ? {
              bottom: roundOverlayValue(calloutRect.bottom - rootRect.top),
              height: roundOverlayValue(calloutRect.height),
              left: roundOverlayValue(calloutRect.left - rootRect.left),
              right: roundOverlayValue(calloutRect.right - rootRect.left),
              top: roundOverlayValue(calloutRect.top - rootRect.top),
              width: roundOverlayValue(calloutRect.width),
            }
          : undefined,
        height: roundOverlayValue(rootRect.height),
        width: roundOverlayValue(rootRect.width),
      };

      setOverlayMetrics((currentMetrics) =>
        areOverlayMetricsEqual(currentMetrics, nextMetrics)
          ? currentMetrics
          : nextMetrics,
      );
    };
    const scheduleMetricsUpdate = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(updateMetrics);
    };

    scheduleMetricsUpdate();

    const resizeObserver = new ResizeObserver(scheduleMetricsUpdate);
    resizeObserver.observe(root);
    if (calloutRef.current) {
      resizeObserver.observe(calloutRef.current);
    }
    window.addEventListener("resize", scheduleMetricsUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleMetricsUpdate);
      resizeObserver.disconnect();
    };
  }, [analysisSummary, selectedProjectedTarget?.visible, selectedTargetId]);

  if (!analysisTargets.length && !analysisSummary) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="AnalysisOverlay AnalysisOverlay__root-1 pointer-events-none absolute inset-0 z-30"
    >
      <svg
        className="AnalysisOverlay AnalysisOverlay__lines-1 absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${connectorGeometry?.width ?? 1} ${connectorGeometry?.height ?? 1}`}
        aria-hidden="true"
      >
        {connectorGeometry ? (
          <>
            <path
              d={connectorGeometry.path}
              fill="none"
              stroke="rgba(2, 6, 23, 0.68)"
              strokeDasharray="8 5"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth="3.6"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={connectorGeometry.path}
              fill="none"
              stroke="rgba(125, 211, 252, 0.82)"
              strokeDasharray="8 5"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth="1.55"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>

      {analysisTargets.map((target, index) => {
        const projectedTarget = projectedTargetById.get(target.id);
        if (!projectedTarget?.visible) {
          return null;
        }

        const selected = target.id === selectedTargetId;
        const dismissSide = getDismissButtonSide(projectedTarget);

        if (target.kind === "area" && projectedTarget.rect) {
          return (
            <div
              key={target.id}
              role="button"
              tabIndex={0}
              className={cn(
                "AnalysisOverlay AnalysisOverlay__area-1 group pointer-events-auto absolute overflow-hidden rounded-sm border bg-cyan-300/[0.12] text-left shadow-[0_0_18px_rgba(103,232,249,0.2)] transition hover:bg-cyan-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80",
                selected
                  ? "border-lime-200 bg-lime-300/20 shadow-[0_0_24px_rgba(190,242,100,0.36)]"
                  : "border-cyan-200/80",
                isEditing && selected && "cursor-grabbing",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(target.id);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }
                event.preventDefault();
                onSelect?.(target.id);
              }}
              onPointerCancel={onTargetPointerCancel}
              onPointerDown={(event) =>
                onTargetPointerDown?.(event, target, "move-area")
              }
              onPointerMove={onTargetPointerMove}
              onPointerUp={onTargetPointerUp}
              style={{
                height: `${projectedTarget.rect.height}%`,
                left: `${projectedTarget.rect.left}%`,
                minHeight: "2rem",
                minWidth: "2.75rem",
                top: `${projectedTarget.rect.top}%`,
                width: `${projectedTarget.rect.width}%`,
              }}
              title={target.name}
            >
              {onDelete ? (
                <DismissTargetButton
                  side={dismissSide}
                  targetName={target.name}
                  onDelete={() => onDelete(target.id)}
                />
              ) : null}
              {selected
                ? RESIZE_HANDLES.map((handle) => (
                    <span
                      key={handle}
                      className="AnalysisOverlay AnalysisOverlay__resize-handle-1 absolute h-3 w-3 rounded-[2px] border border-neutral-950 bg-lime-200 shadow-[0_0_8px_rgba(190,242,100,0.65)]"
                      onPointerCancel={onTargetPointerCancel}
                      onPointerDown={(event) =>
                        onTargetPointerDown?.(
                          event,
                          target,
                          `resize-area:${handle}`,
                        )
                      }
                      onPointerMove={onTargetPointerMove}
                      onPointerUp={onTargetPointerUp}
                      style={getResizeHandleStyle(handle)}
                      title="Resize area"
                    />
                  ))
                : null}
            </div>
          );
        }

        return (
          <div
            key={target.id}
            role="button"
            tabIndex={0}
            className={cn(
              "AnalysisOverlay AnalysisOverlay__point-1 group pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[10px] font-bold shadow-[0_0_18px_rgba(103,232,249,0.26)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80",
              selected
                ? "border-lime-200 bg-lime-300 text-neutral-950"
                : "border-cyan-200 bg-cyan-300 text-neutral-950",
              isEditing && selected && "cursor-grabbing",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(target.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }
              event.preventDefault();
              onSelect?.(target.id);
            }}
            onPointerCancel={onTargetPointerCancel}
            onPointerDown={(event) =>
              onTargetPointerDown?.(event, target, "move-point")
            }
            onPointerMove={onTargetPointerMove}
            onPointerUp={onTargetPointerUp}
            style={{
              left: `${projectedTarget.left}%`,
              top: `${projectedTarget.top}%`,
            }}
            title={target.name}
          >
            {onDelete ? (
              <DismissTargetButton
                compact
                side={dismissSide}
                targetName={target.name}
                onDelete={() => onDelete(target.id)}
              />
            ) : null}
            {index + 1}
          </div>
        );
      })}

      {selectedProjectedTarget?.visible && analysisSummary ? (
        <div
          ref={calloutRef}
          className="AnalysisOverlay AnalysisOverlay__callout-1 absolute right-3 top-3 z-40 grid w-[min(19rem,calc(100%-1.5rem))] gap-2 rounded-md border border-cyan-200/35 bg-neutral-950/[0.78] p-3 text-white shadow-2xl backdrop-blur-md"
        >
          <div className="AnalysisOverlay AnalysisOverlay__callout-header-1 min-w-0">
            <p className="AnalysisOverlay AnalysisOverlay__callout-title-1 truncate text-xs font-semibold">
              {analysisSummary.title}
            </p>
            <p className="AnalysisOverlay AnalysisOverlay__callout-subtitle-1 truncate font-mono text-[10px] text-cyan-100/80">
              {analysisSummary.subtitle}
            </p>
          </div>

          <div className="AnalysisOverlay AnalysisOverlay__metric-grid-1 grid grid-cols-3 gap-1.5">
            <AnalysisMetric
              label="Max"
              value={`${analysisSummary.temperatureMax} C`}
            />
            <AnalysisMetric
              label="Avg"
              value={`${analysisSummary.temperatureAverage} C`}
            />
            <AnalysisMetric
              label="Min"
              value={`${analysisSummary.temperatureMin} C`}
            />
            <AnalysisMetric
              label="Detected"
              value={`${analysisSummary.ultrasoundDetectedDb} dB`}
            />
            <AnalysisMetric
              label="Peak"
              value={`${analysisSummary.ultrasoundPeakDb} dB`}
            />
            <AnalysisMetric label="Trend" value={analysisSummary.trendLabel} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getDismissButtonSide(projectedTarget) {
  const centerLeft = projectedTarget.rect
    ? projectedTarget.rect.left + projectedTarget.rect.width / 2
    : projectedTarget.left;

  return centerLeft > 50 ? "left" : "right";
}

function DismissTargetButton({ compact = false, onDelete, side, targetName }) {
  return (
    <button
      type="button"
      className={cn(
        "AnalysisOverlay AnalysisOverlay__dismiss-1 absolute z-20 grid place-items-center rounded-full border border-white/70 bg-neutral-950/85 text-white opacity-0 shadow-[0_0_12px_rgba(2,6,23,0.55)] backdrop-blur-sm transition hover:bg-red-500 hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 group-hover:opacity-100 group-focus-within:opacity-100",
        compact
          ? "top-0 h-5 w-5"
          : "top-1 h-5 w-5",
        compact && side === "left" && "left-0 -translate-x-1/2 -translate-y-1/2",
        compact && side !== "left" && "right-0 -translate-y-1/2 translate-x-1/2",
        !compact && side === "left" && "left-1",
        !compact && side !== "left" && "right-1",
      )}
      title={`${targetName} 취소`}
      aria-label={`${targetName} 취소`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete?.();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function AnalysisMetric({ label, value }) {
  return (
    <div className="AnalysisMetric AnalysisMetric__tile-1 min-w-0 rounded-sm border border-white/10 bg-white/[0.08] px-1.5 py-1">
      <p className="AnalysisMetric AnalysisMetric__label-1 truncate text-[9px] font-semibold text-cyan-100/75">
        {label}
      </p>
      <p className="AnalysisMetric AnalysisMetric__value-1 truncate font-mono text-[11px] font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
