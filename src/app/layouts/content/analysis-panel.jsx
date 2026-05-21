import { cn } from "@/lib/utils";
import { thresholdStatusClassName } from "../constants/status-styles";
import { ThresholdMetricRow } from "./threshold-metric-row";
import { WaveformChart } from "./waveform-chart";
export function AnalysisPanel({ currentDataJudgement, exceededMetricCount, thresholdMetrics, waveformData, onThresholdChange, }) {
    return (<section className="AnalysisPanel AnalysisPanel__section-1 grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1.05fr)_minmax(0,0.95fr)] gap-2 overflow-hidden rounded-md border border-border bg-background p-2" aria-label="초음파 열화상 분석 패널">
      <div className="AnalysisPanel AnalysisPanel__container-1 flex min-w-0 items-center justify-between gap-2">
        <h2 className="AnalysisPanel AnalysisPanel__title-1 min-w-0 truncate text-xs font-semibold text-foreground">
          초음파 · 열화상 분석
        </h2>
        <span className={cn("AnalysisPanel AnalysisPanel__label-1 shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold", exceededMetricCount > 0
            ? thresholdStatusClassName.exceeded
            : thresholdStatusClassName.normal)}>
          {currentDataJudgement}
        </span>
      </div>

      <div className="AnalysisPanel AnalysisPanel__container-2 AnalysisPanelMetrics flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-2">
        <div className="AnalysisPanel AnalysisPanel__container-3 mb-1 flex min-w-0 items-center justify-between gap-2">
          <h3 className="AnalysisPanel AnalysisPanel__title-2 min-w-0 truncate text-xs font-semibold text-foreground">
            수치 데이터 · 임계치 설정
          </h3>
          <span className="AnalysisPanel AnalysisPanel__label-2 shrink-0 text-[11px] text-muted-foreground">
            초과 {exceededMetricCount}건
          </span>
        </div>
        <div className="AnalysisPanel AnalysisPanel__container-4 grid min-h-0 gap-1">
          {thresholdMetrics.map((thresholdMetric) => (<ThresholdMetricRow key={thresholdMetric.id} metric={thresholdMetric} onThresholdChange={onThresholdChange}/>))}
        </div>
      </div>

      <WaveformChart data={waveformData}/>
    </section>);
}
