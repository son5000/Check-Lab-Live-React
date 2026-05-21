import { cn } from "@/lib/utils";
import { assetJudgementClassName, operationClassName, } from "../constants/status-styles";
export function AssetStatusSection({ assetMetrics, judgementItems, normalCount, cautionCount, abnormalCount, }) {
    return (<section className="AssetStatusSection AssetStatusSection__section-1 min-h-0 overflow-hidden" aria-label="설비 운전 상태">
      <div className="AssetStatusSection AssetStatusSection__container-1 mb-2 flex min-w-0 items-start justify-between gap-2">
        <div className="AssetStatusSection AssetStatusSection__container-2 min-w-0">
          <h2 className="AssetStatusSection AssetStatusSection__title-1 truncate text-sm font-semibold text-foreground">
            {assetMetrics.assetName}
          </h2>
          <p className="AssetStatusSection AssetStatusSection__text-1 truncate text-[11px] text-muted-foreground">
            압축 공정 · 전기실
          </p>
        </div>
        <span className={cn("AssetStatusSection AssetStatusSection__label-1 shrink-0 rounded-md border px-2 py-1 text-xs font-semibold", operationClassName[assetMetrics.operationState])}>
          {assetMetrics.operationState}
        </span>
      </div>
      <div className="AssetStatusSection AssetStatusSection__container-3 mb-2 grid min-h-0 grid-cols-2 gap-1" aria-label="설비 데이터 판정">
        {judgementItems.map((judgementItem) => (<div key={judgementItem.id} className="AssetStatusSection AssetStatusSection__container-4 flex h-7 min-w-0 items-center justify-between gap-1 rounded-md border border-border bg-background px-2 text-left text-xs" title={`${judgementItem.name} ${judgementItem.judgement}`}>
            <span className="AssetStatusSection AssetStatusSection__label-2 min-w-0 truncate font-medium">{judgementItem.name}</span>
            <span className={cn("AssetStatusSection AssetStatusSection__label-3 shrink-0 rounded-sm border px-1 py-0.5 text-[10px] font-semibold", assetJudgementClassName[judgementItem.judgement])}>
              {judgementItem.judgement}
            </span>
          </div>))}
      </div>
      <div className="AssetStatusSection AssetStatusSection__container-5 grid grid-cols-3 gap-1">
        <div className="AssetStatusSection AssetStatusSection__container-6 min-w-0 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1">
          <p className="AssetStatusSection AssetStatusSection__text-2 truncate text-[11px] text-emerald-700 dark:text-emerald-300">정상</p>
          <p className="AssetStatusSection AssetStatusSection__text-3 truncate text-sm font-semibold text-foreground">{normalCount}</p>
        </div>
        <div className="AssetStatusSection AssetStatusSection__container-7 min-w-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1">
          <p className="AssetStatusSection AssetStatusSection__text-4 truncate text-[11px] text-amber-700 dark:text-amber-300">요주의</p>
          <p className="AssetStatusSection AssetStatusSection__text-5 truncate text-sm font-semibold text-foreground">{cautionCount}</p>
        </div>
        <div className="AssetStatusSection AssetStatusSection__container-8 min-w-0 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1">
          <p className="AssetStatusSection AssetStatusSection__text-6 truncate text-[11px] text-red-700 dark:text-red-300">이상</p>
          <p className="AssetStatusSection AssetStatusSection__text-7 truncate text-sm font-semibold text-foreground">{abnormalCount}</p>
        </div>
      </div>
    </section>);
}
