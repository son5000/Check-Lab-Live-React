"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Thermometer } from "lucide-react";
import { createThermalCanvasFromFrame } from "@/lib/thermal-mapping";

export function ThermalCameraPreviewPanel({
  error,
  frame,
  loading,
  selectedCamera,
}) {
  const canvasHostRef = useRef(null);
  const [paletteRange, setPaletteRange] = useState({
    paletteMaxTemperature: null,
    paletteMinTemperature: null,
  });

  useEffect(() => {
    if (!frame) {
      setPaletteRange({
        paletteMaxTemperature: null,
        paletteMinTemperature: null,
      });
      return;
    }

    setPaletteRange({
      paletteMaxTemperature: frame.maxTemperature,
      paletteMinTemperature: frame.minTemperature,
    });
  }, [frame?.cameraId, frame?.maxTemperature, frame?.minTemperature]);

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

    canvas.className =
      "block h-auto w-full max-w-full rounded-sm bg-neutral-950";
    canvas.setAttribute("aria-label", `${frame.cameraName} thermal preview`);
    host.appendChild(canvas);

    return () => {
      if (canvas.parentNode === host) {
        host.removeChild(canvas);
      }
    };
  }, [frame, paletteRange]);

  return (
    <section className="grid min-h-0 rounded-md border border-border bg-card text-card-foreground">
      <header className="flex min-w-0 items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {selectedCamera?.cameraName ?? "Thermal camera preview"}
          </h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {selectedCamera?.dataSourceType ?? "csv-mock"} thermal frame
          </p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
          <Thermometer className="h-4 w-4" aria-hidden="true" />
        </div>
      </header>

      <div className="grid min-h-0 gap-4 p-4">
        {loading ? <PreviewState icon="loading" text="Loading thermal frame" /> : null}
        {!loading && error ? <PreviewState icon="error" text={error} /> : null}
        {!loading && !error && !selectedCamera ? (
          <PreviewState text="No thermal camera selected" />
        ) : null}

        {!loading && !error && selectedCamera && !frame ? (
          <PreviewState text="Thermal frame is not ready" />
        ) : null}

        {frame ? (
          <>
            <div className="overflow-hidden rounded-md border border-border bg-neutral-950 p-2">
              <div
                ref={canvasHostRef}
                className="flex min-h-[16rem] items-center justify-center"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Width" value={frame.width} />
              <Metric label="Height" value={frame.height} />
              <Metric
                label="Min temperature"
                value={`${formatTemperature(frame.minTemperature)} C`}
              />
              <Metric
                label="Max temperature"
                value={`${formatTemperature(frame.maxTemperature)} C`}
              />
              <Metric
                label="Palette min"
                value={`${formatTemperature(paletteRange.paletteMinTemperature)} C`}
              />
              <Metric
                label="Palette max"
                value={`${formatTemperature(paletteRange.paletteMaxTemperature)} C`}
              />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function PreviewState({ icon, text }) {
  return (
    <div className="grid min-h-[18rem] place-items-center rounded-md border border-dashed border-border bg-background p-6 text-center">
      <div className="grid place-items-center gap-2">
        {icon === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        ) : null}
        {icon === "error" ? (
          <AlertTriangle className="h-5 w-5 text-amber-300" />
        ) : null}
        <p className="max-w-md text-sm font-semibold text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-3 py-2">
      <p className="truncate text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatTemperature(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}
