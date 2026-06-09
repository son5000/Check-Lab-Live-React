"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TileOverlayPageControls({ className, onPageChange, pageInfo }) {
  if (!pageInfo || pageInfo.pageCount <= 1) {
    return null;
  }

  const page = pageInfo.page;
  const pageCount = pageInfo.pageCount;
  const canMove = typeof onPageChange === "function";

  return (
    <div
      className={cn(
        "Three3DViewer Three3DViewer__tile-page-controls-1 pointer-events-auto absolute bottom-3 right-3 z-[85] inline-grid grid-cols-[1.75rem_auto_1.75rem] items-center gap-1 rounded-md border border-cyan-100/35 bg-neutral-950/86 p-1 text-cyan-50 shadow-2xl backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-sm text-cyan-50/72 transition hover:bg-cyan-300/16 hover:text-cyan-50 disabled:pointer-events-none disabled:opacity-35"
        disabled={!canMove || page <= 0}
        onClick={() => onPageChange?.(page - 1)}
        title="이전 페이지"
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-12 text-center font-mono text-[11px] font-bold leading-none text-cyan-50">
        {page + 1}/{pageCount}
      </span>
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-sm text-cyan-50/72 transition hover:bg-cyan-300/16 hover:text-cyan-50 disabled:pointer-events-none disabled:opacity-35"
        disabled={!canMove || page >= pageCount - 1}
        onClick={() => onPageChange?.(page + 1)}
        title="다음 페이지"
        aria-label="다음 페이지"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
