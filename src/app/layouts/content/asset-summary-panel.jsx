import { AlarmRecordSection } from "./alarm-record-section";
import { AssetKpiSection } from "./asset-kpi-section";
import { AssetStatusSection } from "./asset-status-section";
import { TemperatureAreaSection } from "./temperature-area-section";
export function AssetSummaryPanel({ alarmRecords, cautionCount, abnormalCount, assetMetrics, judgementItems, normalCount, temperatureAreas, }) {
    return (<aside className="DashboardContentAssetSummaryPanel DashboardContentAssetSummaryPanel__panel-1 grid h-full min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_minmax(40%,1.15fr)] gap-2 overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground md:p-3">
      <AssetStatusSection assetMetrics={assetMetrics} judgementItems={judgementItems} normalCount={normalCount} cautionCount={cautionCount} abnormalCount={abnormalCount}/>
      <AssetKpiSection assetMetrics={assetMetrics}/>
      <TemperatureAreaSection parts={temperatureAreas}/>
      <AlarmRecordSection records={alarmRecords}/>
    </aside>);
}
