import { useState } from "react";
import { ChevronDown, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import { judgementClassName, judgementLabel } from "./judgement";
export function AssetPartList({ parts, partStates, selectedPartId, onPartSelect, }) {
    const [expandedPartId, setExpandedPartId] = useState(undefined);
    const handleRowClick = (partId) => {
        // 선택 상태 업데이트
        onPartSelect(partId);
        // 같은 항목 재클릭 시 접기, 다른 항목 클릭 시 펼치기
        setExpandedPartId((prev) => (prev === partId ? undefined : partId));
    };
    return (<div className="AssetPartList AssetPartList__container-1 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background p-1.5">
      <div className="AssetPartList AssetPartList__container-2 mb-1.5 flex items-center justify-between gap-2">
        <div className="AssetPartList AssetPartList__container-3 flex min-w-0 items-center gap-1.5">
          <MapPinned className="AssetPartList AssetPartList__icon-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
          <h2 className="AssetPartList AssetPartList__title-1 truncate text-xs font-semibold">
            관심 영역 리스트
          </h2>
        </div>
      </div>

      <ul className="AssetPartList AssetPartList__container-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin]">
        {!parts.length ? (<li className="AssetPartList AssetPartList__item-empty-1 grid min-h-24 shrink-0 place-items-center rounded-md border border-dashed border-border bg-card px-3 text-center text-[11px] text-muted-foreground">
            카메라 크게 보기에서 관심 영역을 등록하면 이 목록에 표시됩니다.
          </li>) : null}
        {parts.map((part) => {
            const partState = partStates.find((state) => state.partId === part.id);
            const judgement = partState?.judgement ?? "normal";
            const isSelected = part.id === selectedPartId;
            const isExpanded = part.id === expandedPartId;
            const isTemperatureExceeded = Boolean(partState) &&
                isCriticalThresholdExceeded(partState?.temperatureMax ?? 0, part.thresholds.temperature, part.thresholds.temperatureCritical);
            const isUltrasoundExceeded = Boolean(partState) &&
                isCriticalThresholdExceeded(partState?.ultrasoundPeakDb ?? 0, part.thresholds.ultrasoundDb, part.thresholds.ultrasoundCriticalDb);
            const hasAlert = isTemperatureExceeded || isUltrasoundExceeded;
            return (<li key={part.id} className="AssetPartList AssetPartList__item-1 min-w-0 shrink-0">
              <div className={cn("AssetPartList AssetPartList__container-5 min-w-0 rounded-md border border-border bg-card transition", isSelected && "border-primary", hasAlert && !isSelected && "border-red-500/30")}>
                {/* ── 접힌 상태: 한 줄 요약 행 (항상 노출) ── */}
                <button type="button" className={cn("AssetPartList AssetPartList__button-2 flex w-full min-w-0 items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-accent/40", isSelected && "bg-primary/10 hover:bg-primary/15", isExpanded ? "rounded-t-md" : "rounded-md")} onClick={() => handleRowClick(part.id)} aria-expanded={isExpanded}>
                  {/* 상태 표시 도트 */}
                  <span className={cn("AssetPartList AssetPartList__dot-1 h-1.5 w-1.5 shrink-0 rounded-full", judgement === "normal" && "bg-emerald-500", judgement === "caution" && "bg-amber-500", judgement === "abnormal" && "bg-red-500")}/>

                  {/* 파트명 */}
                  <p className="AssetPartList AssetPartList__text-1 min-w-0 flex-1 truncate text-xs font-semibold">
                    {part.name}
                  </p>

                  {/* 요약 수치: 초음파 · 평균 온도 */}
                  <span className="AssetPartList AssetPartList__summary-1 shrink-0 font-mono text-[10px] text-muted-foreground">
                    <span className={cn(isUltrasoundExceeded &&
                    "text-red-500 dark:text-red-400")}>
                      {partState?.ultrasoundPeakDb ?? 0} dB
                    </span>
                    {" · "}
                    <span className={cn(isTemperatureExceeded &&
                    "text-red-500 dark:text-red-400")}>
                      {partState?.temperatureAverage ?? 0}℃
                    </span>
                  </span>

                  {/* 판정 배지 */}
                  <span className={cn("AssetPartList AssetPartList__label-1 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", judgementClassName[judgement])}>
                    {judgementLabel[judgement]}
                  </span>

                  {/* 펼침 화살표 */}
                  <ChevronDown className={cn("AssetPartList AssetPartList__icon-3 h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} aria-hidden="true"/>
                </button>

                {/* ── 펼친 상태: 디테일 ── */}
                {isExpanded && (<div className="AssetPartList AssetPartList__container-9 grid min-w-0 gap-1 border-t border-border px-2.5 pb-2 pt-1.5 text-[10px]">
                    {/* 파트 지정 방식 + 범위 */}
                    <p className="AssetPartList AssetPartList__text-2 truncate text-[10px] text-muted-foreground">
                      <span className="rounded-sm border border-border bg-background px-1 py-0.5 font-medium">
                        {getAssetPartModeLabel(part)}
                      </span>
                      {"  "}
                      {formatAssetPartScope(part)}
                    </p>

                    <AssetPartDetailRow label="온도" value={`최고 ${partState?.temperatureMax ?? 0}℃ · 평균 ${partState?.temperatureAverage ?? 0}℃`} detail={`임계 ${part.thresholds.temperature}℃`} highlighted={isTemperatureExceeded}/>
                    <AssetPartDetailRow label="초음파" value={`피크 ${partState?.ultrasoundPeakDb ?? 0} dB · ${partState?.dominantFrequencyKHz ?? 0} kHz`} detail={`임계 ${part.thresholds.ultrasoundDb} dB`} highlighted={isUltrasoundExceeded}/>
                    <AssetPartDetailRow label="알림" value={part.linkedAlarm ? "알림 연동" : "알림 해제"} detail={partState
                        ? `${judgementLabel[judgement]} 판정 기준 적용`
                        : "판정 대기"}/>
                  </div>)}
              </div>
            </li>);
        })}
      </ul>
    </div>);
}
function AssetPartDetailRow({ detail, highlighted, label, value, }) {
    return (<div className={cn("AssetPartDetailRow AssetPartDetailRow__container-1 grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-1 rounded-sm border border-border bg-background px-2 py-1", highlighted && "border-red-500/30 bg-red-500/10")}>
      <span className="AssetPartDetailRow AssetPartDetailRow__label-1 shrink-0 text-muted-foreground">
        {label}
      </span>
      <span className="AssetPartDetailRow AssetPartDetailRow__text-1 min-w-0 truncate font-mono font-semibold text-foreground">
        {value}
      </span>
      <span className="AssetPartDetailRow AssetPartDetailRow__text-2 shrink-0 text-muted-foreground">
        {detail}
      </span>
    </div>);
}
function formatAssetPartScope(part) {
    if (part.source === "3d" && part.viewer3DTarget) {
        const { worldArea, worldPosition } = part.viewer3DTarget;
        if (part.viewer3DTarget.kind === "area" && worldArea) {
            return `3D 범위 ${formatVector3(worldArea.start)} → ${formatVector3(worldArea.end)}`;
        }
        return `3D 좌표 ${formatVector3(worldPosition)}`;
    }
    if (part.mode === "area" && part.roi) {
        return `좌표 ${part.roi.x}, ${part.roi.y} · 크기 ${part.roi.width} × ${part.roi.height}`;
    }
    if (part.mode === "points") {
        return `${part.points.length}개 포인트 · ${part.points.map((point) => `(${point.x}, ${point.y})`).join(" ")}`;
    }
    return "감지 범위 산출 대기";
}
function getAssetPartModeLabel(part) {
    if (part.source === "3d") {
        return part.viewer3DTarget?.kind === "area" ? "3D 영역" : "3D 포인트";
    }
    return part.mode === "area" ? "영역 ROI" : "포인트 지정";
}
function formatVector3(vector) {
    return `${formatCompactNumber(vector.x)}, ${formatCompactNumber(vector.y)}, ${formatCompactNumber(vector.z)}`;
}
function formatCompactNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function isCriticalThresholdExceeded(value, warningThreshold, criticalThreshold) {
    if (value <= 0 || warningThreshold <= 0) {
        return false;
    }
    return isFinitePositiveNumber(criticalThreshold)
        ? value >= criticalThreshold
        : value >= warningThreshold;
}
function isFinitePositiveNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}
