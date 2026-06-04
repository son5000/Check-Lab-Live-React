"use client";

import {
  MousePointer2,
  RotateCcw,
  SquareDashedMousePointer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODES = [
  {
    icon: RotateCcw,
    label: "Navigate",
    value: undefined,
  },
  {
    icon: MousePointer2,
    label: "Point",
    value: "point",
  },
  {
    icon: SquareDashedMousePointer,
    label: "Area",
    value: "area",
  },
];

export function AnalysisModeToolbar({ activeMode, onChange }) {
  return (
    <div
      className="AnalysisModeToolbar AnalysisModeToolbar__root-1 pointer-events-auto rounded-md border border-white/15 bg-neutral-950/80 p-1 text-white shadow-2xl backdrop-blur-md"
      role="toolbar"
      aria-label="3D analysis mouse mode"
    >
      <div className="AnalysisModeToolbar AnalysisModeToolbar__list-1 grid gap-1">
        {MODES.map(({ icon: Icon, label, value }) => {
          const active =
            activeMode === value || (!activeMode && value === undefined);

          return (
            <button
              key={label}
              type="button"
              className={cn(
                "AnalysisModeToolbar AnalysisModeToolbar__button-1 grid h-8 w-8 place-items-center rounded-sm border text-white/75 transition hover:border-cyan-200/60 hover:bg-white/10 hover:text-white",
                active
                  ? "border-cyan-200 bg-cyan-300/20 text-cyan-50 shadow-[0_0_18px_rgba(103,232,249,0.22)]"
                  : "border-transparent",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onChange(value);
              }}
              title={label}
              aria-label={label}
              aria-pressed={active}
            >
              <Icon
                className="AnalysisModeToolbar AnalysisModeToolbar__icon-1 h-4 w-4"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
