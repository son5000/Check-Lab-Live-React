"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

export function ViewerLoadState({ error, isLoading }) {
  return (
    <div className="ViewerLoadState ViewerLoadState__overlay-1 pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/30 text-white">
      <div className="ViewerLoadState ViewerLoadState__content-1 grid min-w-0 place-items-center gap-2 rounded-md border border-white/15 bg-black/50 px-3 py-2 text-center backdrop-blur-sm">
        {isLoading ? (
          <Loader2
            className="ViewerLoadState ViewerLoadState__icon-1 h-5 w-5 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <AlertTriangle
            className="ViewerLoadState ViewerLoadState__icon-2 h-5 w-5 text-amber-200"
            aria-hidden="true"
          />
        )}
        <p className="ViewerLoadState ViewerLoadState__text-1 max-w-[14rem] text-xs font-semibold">
          {isLoading ? "Loading 3D model" : error}
        </p>
      </div>
    </div>
  );
}
