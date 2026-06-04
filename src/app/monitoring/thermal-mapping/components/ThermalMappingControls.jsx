"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";

const CONTROL_FIELDS = [
  {
    key: "positionX",
    label: "X 위치",
    max: 500,
    min: -500,
    step: 1,
    suffix: "px",
  },
  {
    key: "positionY",
    label: "Y 위치",
    max: 500,
    min: -500,
    step: 1,
    suffix: "px",
  },
  {
    key: "scaleX",
    label: "가로 배율",
    max: 4,
    min: 0.1,
    step: 0.01,
    suffix: "x",
  },
  {
    key: "scaleY",
    label: "세로 배율",
    max: 4,
    min: 0.1,
    step: 0.01,
    suffix: "x",
  },
  {
    key: "rotation",
    label: "회전",
    max: 180,
    min: -180,
    step: 1,
    suffix: "deg",
  },
  {
    key: "opacity",
    label: "투명도",
    max: 1,
    min: 0,
    step: 0.01,
    suffix: "",
  },
];

export function ThermalMappingControls({
  alignment,
  disabled = false,
  onApply,
  onChange,
  onReset,
}) {
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setStatusMessage(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  const handleApply = () => {
    onApply?.(alignment);
    setStatusMessage(
      "현재 정합값 기준으로 열화상 texture 적용을 요청했습니다.",
    );
  };

  return (
    <section className="grid min-w-0 gap-3">
      <div className="min-w-0">
        <h3 className="truncate text-xs font-semibold text-white">
          수동 정합값
        </h3>
        <p className="mt-0.5 text-[11px] text-white/55">
          현재 overlay 정합값을 기준으로 3D 오브젝트에 열화상 texture를 적용합니다.
        </p>
      </div>

      <div className="grid gap-2">
        {CONTROL_FIELDS.map((field) => (
          <AlignmentField
            key={field.key}
            disabled={disabled}
            field={field}
            value={alignment?.[field.key]}
            onChange={(value) => onChange?.({ [field.key]: value })}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-2 text-xs font-semibold text-white/72 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          초기화
        </button>
        <button
          type="button"
          className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-cyan-300/35 bg-cyan-300 px-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onClick={handleApply}
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          정합 적용
        </button>
      </div>

      {statusMessage ? (
        <p className="rounded-md border border-lime-300/25 bg-lime-300/10 px-2 py-1.5 text-[11px] font-semibold text-lime-100">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}

function AlignmentField({ disabled, field, onChange, value }) {
  const numericValue = Number.isFinite(Number(value))
    ? Number(value)
    : field.min;

  return (
    <label className="grid min-w-0 gap-1 rounded-md border border-white/10 bg-white/[0.045] p-2">
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white/66">
        <span>{field.label}</span>
        <span className="font-mono text-white/80">
          {formatControlValue(numericValue, field)}
        </span>
      </span>
      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-2">
        <input
          type="range"
          className="min-w-0 accent-cyan-300"
          disabled={disabled}
          max={field.max}
          min={field.min}
          step={field.step}
          value={numericValue}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          className="h-8 min-w-0 rounded-md border border-white/10 bg-black/35 px-2 text-right font-mono text-xs text-white outline-none transition focus:border-cyan-300/45"
          disabled={disabled}
          max={field.max}
          min={field.min}
          step={field.step}
          value={numericValue}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </label>
  );
}

function formatControlValue(value, field) {
  const decimals = field.step < 1 ? 2 : 0;
  return `${value.toFixed(decimals)}${field.suffix ? ` ${field.suffix}` : ""}`;
}
