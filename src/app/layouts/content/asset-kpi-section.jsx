import { MetricTile } from "./metric-tile";
export function AssetKpiSection({ assetMetrics }) {
    return (<section className="AssetKpiSection AssetKpiSection__section-1 min-h-0 overflow-hidden" aria-label="설비 계측 KPI">
      <div className="AssetKpiSection AssetKpiSection__container-1 mb-1 flex min-w-0 items-center justify-between gap-2">
        <h2 className="AssetKpiSection AssetKpiSection__title-1 min-w-0 truncate text-xs font-semibold text-foreground">설비 KPI</h2>
        <span className="AssetKpiSection AssetKpiSection__label-1 shrink-0 truncate text-[11px] text-muted-foreground">
          {assetMetrics.powerStatus}
        </span>
      </div>
      <div className="AssetKpiSection AssetKpiSection__container-2 grid grid-cols-3 gap-1">
        <MetricTile label="dB" value={assetMetrics.soundDb}/>
        <MetricTile label="peak dB" value={assetMetrics.peakDb}/>
        <MetricTile label="kHz" value={assetMetrics.frequencyKHz}/>
        <MetricTile label="평균 온도" value={assetMetrics.averageTemperature} unit="℃"/>
        <MetricTile label="최고 온도" value={assetMetrics.maxTemperature} unit="℃"/>
        <MetricTile label="최저 온도" value={assetMetrics.minTemperature} unit="℃"/>
      </div>
      <div className="AssetKpiSection AssetKpiSection__container-3 mt-1 grid grid-cols-2 gap-1">
        <MetricTile label="입력 전압" value={assetMetrics.inputVoltage}/>
        <MetricTile label="전력 사용량" value={assetMetrics.powerUsage}/>
      </div>
    </section>);
}
