import { cn } from "@/lib/utils";
import { assetJudgementClassName } from "../constants/status-styles";
import { AnalysisPanel } from "./analysis-panel";
import { AssetVideoPanel } from "./asset-video-panel";
export function RealtimeStatusPanel({ currentDataJudgement, currentAssetJudgement, assetName, exceededMetricCount, thresholdMetrics, waveformData, onThresholdChange, }) {
    return (<div className="RealtimeStatusPanel RealtimeStatusPanel__container-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-3 text-card-foreground">
      <div className="RealtimeStatusPanel RealtimeStatusPanel__container-2 flex min-w-0 items-center justify-between gap-2">
        <p className="RealtimeStatusPanel RealtimeStatusPanel__text-1 min-w-0 truncate text-sm font-semibold text-foreground">
          {assetName} 실시간 현황
        </p>
        <span className={cn("RealtimeStatusPanel RealtimeStatusPanel__label-1 shrink-0 rounded-md border px-2 py-1 text-xs font-semibold", assetJudgementClassName[currentAssetJudgement])}>
          {currentAssetJudgement}
        </span>
      </div>
      <div className="RealtimeStatusPanel RealtimeStatusPanel__container-3 mt-2 grid min-h-0 flex-1 gap-2 md:grid-cols-2">
        <AssetVideoPanel assetName={assetName}/>
        <AnalysisPanel currentDataJudgement={currentDataJudgement} exceededMetricCount={exceededMetricCount} thresholdMetrics={thresholdMetrics} waveformData={waveformData} onThresholdChange={onThresholdChange}/>
      </div>
    </div>);
}
