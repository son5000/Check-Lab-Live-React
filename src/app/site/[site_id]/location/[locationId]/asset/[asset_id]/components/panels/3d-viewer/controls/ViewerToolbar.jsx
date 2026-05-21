"use client";
import { MousePointer2, Settings2, } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModelSourceName } from "../utils/modelFileUtils";
export function ViewerToolbar({ allowOptionBar = true, config, modelFile, onChange, }) {
    const showOptionBar = config.controls?.showOptionBar ?? true;
    return (<div className="ViewerToolbar ViewerToolbar__bar-1 flex h-10 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2">
      <div className="ViewerToolbar ViewerToolbar__title-1 flex min-w-0 items-center gap-2">
        <MousePointer2 className="ViewerToolbar ViewerToolbar__icon-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
        <div className="ViewerToolbar ViewerToolbar__copy-1 min-w-0">
          <p className="ViewerToolbar ViewerToolbar__name-1 truncate text-xs font-semibold">
            3D 월드
          </p>
          <p className="ViewerToolbar ViewerToolbar__source-1 truncate text-[10px] text-muted-foreground">
            {getModelSourceName(modelFile.plyUrl)}
          </p>
        </div>
      </div>

      <div className="ViewerToolbar ViewerToolbar__actions-1 flex shrink-0 items-center gap-1">
        <ToolbarSkeletonToggle active={config.autoRotate} label="자동 회전" onClick={() => onChange({ ...config, autoRotate: !config.autoRotate })}/>
        {allowOptionBar ? (<ToolbarIconButton active={showOptionBar} icon={Settings2} label="옵션" onClick={() => onChange({
                ...config,
                controls: {
                    ...config.controls,
                    showOptionBar: !showOptionBar,
                },
            })}/>) : null}
      </div>
    </div>);
}
function ToolbarSkeletonToggle({ active, label, onClick, }) {
    return (<button className="ToolbarSkeletonToggle ToolbarSkeletonToggle__button-1 inline-flex h-7 items-center gap-2 rounded-md border border-border bg-background px-2 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/60 hover:bg-accent/60 hover:text-foreground" onClick={onClick} title={label} type="button" aria-pressed={active}>
      <span className="ToolbarSkeletonToggle ToolbarSkeletonToggle__label-1 shrink-0">
        애니메이션
      </span>
      <span className={cn("ToolbarSkeletonToggle ToolbarSkeletonToggle__track-1 relative h-4 w-8 rounded-full border transition-colors", active
        ? "border-cyan-300/70 bg-cyan-300/25 dark:border-cyan-300/70 dark:bg-cyan-300/20"
        : "border-border bg-muted dark:bg-zinc-800")}>
        <span className={cn("ToolbarSkeletonToggle ToolbarSkeletonToggle__thumb-1 absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full shadow-sm transition-transform", active
        ? "translate-x-4 bg-cyan-300"
        : "translate-x-0 bg-muted-foreground/80 dark:bg-zinc-300")}/>
      </span>
      <span className={cn("ToolbarSkeletonToggle ToolbarSkeletonToggle__state-1 w-5 shrink-0 text-left text-[10px]", active
        ? "text-cyan-700 dark:text-cyan-300"
        : "text-muted-foreground")}>
        {active ? "ON" : "OFF"}
      </span>
    </button>);
}
function ToolbarIconButton({ active, icon: Icon, label, onClick, }) {
    return (<button className={cn("ToolbarIconButton ToolbarIconButton__button-1 grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-primary/60 hover:text-foreground", active && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground")} onClick={onClick} title={label} type="button">
      <Icon className="ToolbarIconButton ToolbarIconButton__icon-1 h-3.5 w-3.5" aria-hidden="true"/>
    </button>);
}
