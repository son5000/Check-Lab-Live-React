import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "../constants/status-styles";
export function HeaderStatusSummary({ headerState }) {
    const pathText = headerState.selectedPath.join(" > ");
    return (<>
      <div className="HeaderStatusSummary HeaderStatusSummary__container-1 min-w-0 flex-1">
        <div className="HeaderStatusSummary HeaderStatusSummary__container-2 flex min-w-0 items-center gap-2">
          <span className="HeaderStatusSummary HeaderStatusSummary__label-1 hidden shrink-0 text-[11px] font-medium text-muted-foreground sm:inline">
            현재 위치
          </span>
          <p className="HeaderStatusSummary HeaderStatusSummary__text-1 min-w-0 truncate text-sm font-semibold text-foreground">{pathText}</p>
        </div>
      </div>

      <div className="HeaderStatusSummary HeaderStatusSummary__container-3 hidden min-w-0 shrink-0 items-center gap-1.5 lg:flex">
        <span className={cn("HeaderStatusSummary HeaderStatusSummary__label-2 inline-flex h-8 max-w-24 items-center rounded-md border px-2.5 text-sm font-semibold", dashboardStatusClassName[headerState.assetStatus])} title={`현재 설비 상태 ${headerState.assetStatusLabel}`}>
          <span className="HeaderStatusSummary HeaderStatusSummary__label-3 truncate">{headerState.assetStatusLabel}</span>
        </span>
        <span className="HeaderStatusSummary HeaderStatusSummary__label-4 inline-flex h-8 max-w-28 items-center rounded-md border border-border bg-muted px-2.5 text-sm font-semibold text-foreground" title={`미처리 경보 ${headerState.unresolvedAlarmCount}건`}>
          <span className="HeaderStatusSummary HeaderStatusSummary__label-5 truncate">경보 {headerState.unresolvedAlarmCount}건</span>
        </span>
        <span className="HeaderStatusSummary HeaderStatusSummary__label-6 inline-flex h-8 max-w-44 items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 text-xs font-semibold text-foreground" title={`최근 수집 ${headerState.lastCollectedAt}`}>
          <span className="HeaderStatusSummary HeaderStatusSummary__label-8 shrink-0 text-muted-foreground">
            최근 수집
          </span>
          <span className="HeaderStatusSummary HeaderStatusSummary__label-7 truncate font-mono text-sm text-foreground">
            {headerState.lastCollectedAt}
          </span>
        </span>
      </div>
    </>);
}
