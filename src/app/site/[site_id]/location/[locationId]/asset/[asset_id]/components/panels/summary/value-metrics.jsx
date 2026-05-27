import { cn } from "@/lib/utils";
const VALUE_METRIC_ICON_CLASS_NAME = "text-slate-400 dark:text-slate-500";
export { UltrasoundMetricCard, TemperatureMetricCard };
/* ─────────────────────────────────────────────
   초음파 카드 — ARC 게이지 시각화
───────────────────────────────────────────── */
function UltrasoundMetricCard({ averageDb, peakDb, dominantFrequencyKHz, frequencyBandKHz, detectionCount, threshold, isExceeded, reserveHeaderActionSpace = false, }) {
    const accentColor = isExceeded
        ? "rgb(239 68 68)"
        : threshold && averageDb / threshold >= 0.82
            ? "rgb(245 158 11)"
            : "rgb(14 165 233)";
    const gaugeMax = threshold
        ? Math.max(threshold * 1.25, peakDb * 1.1, averageDb * 1.12)
        : Math.max(peakDb * 1.5, averageDb * 1.5, 60);
    const gaugeProgress = clamp(averageDb / gaugeMax, 0, 1);
    const thresholdProgress = threshold
        ? clamp(threshold / gaugeMax, 0, 1)
        : undefined;
    const thresholdDelta = buildThresholdDelta({
        threshold,
        unit: "dB",
        value: averageDb,
    });
    const statusLabel = getMetricStatusLabel({
        isExceeded,
        threshold,
        value: averageDb,
    });
    return (<div className="UltrasoundMetricCard relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border/60 bg-background/80" style={{ "--accent": accentColor }}>
      {/* 상단 액센트 바 */}
      <div className="h-[3px] w-full shrink-0" style={{ background: accentColor, opacity: 0.7 }}/>

      {/* 헤더 */}
      <div className={cn("flex min-w-0 items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5", reserveHeaderActionSpace && "pr-10")}>
        <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">초음파</p>
        <UltrasoundIcon className={cn("h-3.5 w-3.5 shrink-0 opacity-60", VALUE_METRIC_ICON_CLASS_NAME)} aria-hidden="true"/>
      </div>

      {/* 바디 */}
      <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden">
        <div className="relative isolate flex min-h-0 min-w-0 flex-col justify-center overflow-hidden border-r border-border/40 px-2 py-2">
          <MetricArcValue accentColor={accentColor} delta={thresholdDelta} progress={gaugeProgress} statusLabel={statusLabel} thresholdProgress={thresholdProgress} unit="dB" value={roundOne(averageDb)}/>
        </div>

        {/* 세부 항목 */}
        <dl className="grid h-full min-h-0 min-w-0 grid-rows-4 gap-1 px-2 py-2">
          <MetricInfoRow label="피크" value={`${roundOne(peakDb)} dB`}/>
          <MetricInfoRow label="주파수" value={`${dominantFrequencyKHz} kHz`}/>
          <MetricInfoRow label="대역" value={frequencyBandKHz}/>
          <MetricInfoRow label="감지" value={`${detectionCount}개`}/>
        </dl>
      </div>
    </div>);
}
/* ─────────────────────────────────────────────
   온도 카드 — ARC 게이지 시각화
───────────────────────────────────────────── */
function TemperatureMetricCard({ averageTemperature, temperatureMax, temperatureMin, threshold, isExceeded, reserveHeaderActionSpace = false, }) {
    const accentColor = isExceeded
        ? "rgb(239 68 68)"
        : threshold && averageTemperature / threshold >= 0.82
            ? "rgb(245 158 11)"
            : "rgb(14 165 233)";
    // ARC 게이지용 비율 (0~1)
    const scaleMax = threshold ? Math.max(threshold * 1.2, temperatureMax * 1.1) : Math.max(temperatureMax * 1.3, 80);
    const scaleMin = Math.min(0, temperatureMin);
    const scaleSpan = Math.max(scaleMax - scaleMin, 1);
    const gaugeProgress = clamp((averageTemperature - scaleMin) / scaleSpan, 0, 1);
    const thresholdProgress = threshold !== undefined
        ? clamp((threshold - scaleMin) / scaleSpan, 0, 1)
        : undefined;
    const thresholdDelta = buildThresholdDelta({
        threshold,
        unit: "℃",
        value: averageTemperature,
    });
    const statusLabel = getMetricStatusLabel({
        isExceeded,
        threshold,
        value: averageTemperature,
    });
    return (<div className="TemperatureMetricCard relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border/60 bg-background/80" style={{ "--accent": accentColor }}>
      {/* 상단 액센트 바 */}
      <div className="h-[3px] w-full shrink-0" style={{ background: accentColor, opacity: 0.7 }}/>

      {/* 헤더 */}
      <div className={cn("flex min-w-0 items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5", reserveHeaderActionSpace && "pr-10")}>
        <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">온도</p>
        <AvgTemperatureIcon className={cn("h-3.5 w-3.5 shrink-0 opacity-60", VALUE_METRIC_ICON_CLASS_NAME)} aria-hidden="true"/>
      </div>

      {/* 바디 */}
      <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden">
        <div className="relative isolate flex min-h-0 min-w-0 flex-col justify-center overflow-hidden border-r border-border/40 px-2 py-2">
          <MetricArcValue accentColor={accentColor} delta={thresholdDelta} progress={gaugeProgress} statusLabel={statusLabel} thresholdProgress={thresholdProgress} unit="℃" value={roundOne(averageTemperature)}/>
        </div>

        {/* 세부 항목 */}
        <dl className="grid h-full min-h-0 min-w-0 grid-rows-3 gap-1 px-2 py-2">
          <MetricInfoRow label="최고" value={`${roundOne(temperatureMax)} ℃`}/>
          <MetricInfoRow label="최저" value={`${roundOne(temperatureMin)} ℃`}/>
          <MetricInfoRow label="임계" value={threshold !== undefined ? `${roundOne(threshold)} ℃` : "미설정"}/>
        </dl>
      </div>
    </div>);
}
function MetricInfoRow({ label, tone, value }) {
    return (<div className="ValueMetric ValueMetric__info-row-1 flex min-h-0 min-w-0 items-center justify-between gap-1 overflow-hidden rounded-[4px] border border-border/45 border-l-2 bg-background/55 px-1.5 py-1.5" style={{
            background: "linear-gradient(90deg, color-mix(in oklch, var(--accent) 9%, transparent), color-mix(in oklch, var(--background) 82%, transparent) 72%)",
            borderLeftColor: "var(--accent)",
        }}>
      <dt className="ValueMetric ValueMetric__info-label-1 min-w-0 shrink-0 truncate font-mono text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("ValueMetric ValueMetric__info-value-1 min-w-0 truncate text-right font-mono text-[15px] font-black leading-none text-foreground", tone === "above" && "text-red-500 dark:text-red-400", tone === "below" && "text-emerald-500 dark:text-emerald-400", tone === "same" && "text-muted-foreground")}>
        {value}
      </dd>
    </div>);
}
function MetricArcValue({ accentColor, delta, progress, statusLabel, thresholdProgress, unit, value, }) {
    return (<div className="relative z-10 grid h-full min-h-0 w-full place-items-center overflow-hidden">
      <MetricStatusBadge accentColor={accentColor} delta={delta} label={statusLabel}/>
      <MetricArcGauge accentColor={accentColor} progress={progress} thresholdProgress={thresholdProgress}/>
      <p className="relative z-10 flex max-w-full translate-y-[0.333em] items-baseline justify-center whitespace-nowrap text-center font-mono text-[clamp(1.72rem,5.5cqw,2.46rem)] font-black leading-none text-foreground">
        <span className="shrink-0">
          {value}
          <span className="ml-0.5 text-[0.4em] font-extrabold opacity-75">
            {unit}
          </span>
        </span>
      </p>
    </div>);
}
function MetricStatusBadge({ accentColor, delta, label, }) {
    return (<div className="absolute right-1 top-1 z-20 grid max-w-[5.9rem] justify-items-end gap-1">
      <span className="inline-flex max-w-full items-center gap-1 rounded-sm border border-border/60 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-black leading-none shadow-sm backdrop-blur" style={{ color: accentColor }} title={label}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accentColor }}/>
        <span className="min-w-0 truncate">{label}</span>
      </span>
      {delta ? <ThresholdDeltaLine delta={delta}/> : null}
    </div>);
}
function MetricArcGauge({ accentColor, progress, thresholdProgress, }) {
    const safeProgress = clamp(progress, 0, 1);
    const trackPath = buildMetricArcPath(1);
    const activePath = safeProgress > 0 ? buildMetricArcPath(Math.max(safeProgress, 0.01)) : null;
    const progressPoint = getMetricArcPoint(safeProgress, METRIC_ARC_RADIUS);
    const thresholdMarker = thresholdProgress === undefined
        ? undefined
        : getMetricArcMarker(thresholdProgress, 48, 70);
    return (<svg aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(11.2rem,122%)] w-[min(11.8rem,128%)] -translate-x-1/2 -translate-y-1/2 overflow-visible" focusable="false" viewBox="0 0 160 132">
      <path d={trackPath} fill="none" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" strokeLinecap="round" strokeWidth={23}/>
      <path d={trackPath} fill="none" stroke="color-mix(in oklch, var(--foreground) 11%, transparent)" strokeLinecap="round" strokeWidth={17}/>
      <path d={trackPath} fill="none" stroke="color-mix(in oklch, var(--background) 70%, transparent)" strokeLinecap="round" strokeWidth={9}/>
      <path d={trackPath} fill="none" stroke="color-mix(in oklch, var(--muted-foreground) 24%, transparent)" strokeLinecap="round" strokeWidth={5}/>
      {METRIC_ARC_TICKS.map((tick) => {
            const marker = getMetricArcMarker(tick, 49, tick % 0.5 === 0 ? 69 : 64);
            return (<line key={tick} x1={marker.innerX} x2={marker.outerX} y1={marker.innerY} y2={marker.outerY} stroke="color-mix(in oklch, var(--foreground) 48%, transparent)" strokeLinecap="round" strokeWidth={tick % 0.5 === 0 ? 1.8 : 1.1}/>);
        })}
      {activePath ? (<>
          <path d={activePath} fill="none" stroke={accentColor} strokeLinecap="round" strokeWidth={22} opacity={0.12}/>
          <path d={activePath} fill="none" stroke={accentColor} strokeLinecap="round" strokeWidth={13} opacity={0.24}/>
          <path d={activePath} fill="none" stroke={accentColor} strokeLinecap="round" strokeWidth={7}/>
          <path d={activePath} fill="none" stroke="color-mix(in oklch, white 45%, transparent)" strokeLinecap="round" strokeWidth={2} opacity={0.34}/>
          <circle cx={roundTwo(progressPoint.x)} cy={roundTwo(progressPoint.y)} fill="var(--background)" r={6} stroke={accentColor} strokeWidth={3}/>
          <circle cx={roundTwo(progressPoint.x)} cy={roundTwo(progressPoint.y)} fill={accentColor} r={2.2}/>
        </>) : null}
      {thresholdMarker ? (<g>
          <line x1={thresholdMarker.innerX} x2={thresholdMarker.outerX} y1={thresholdMarker.innerY} y2={thresholdMarker.outerY} stroke="var(--background)" strokeLinecap="round" strokeWidth={5}/>
          <line x1={thresholdMarker.innerX} x2={thresholdMarker.outerX} y1={thresholdMarker.innerY} y2={thresholdMarker.outerY} stroke="rgb(245 158 11)" strokeLinecap="round" strokeWidth={2}/>
        </g>) : null}
    </svg>);
}
const METRIC_ARC_CENTER_X = 80;
const METRIC_ARC_CENTER_Y = 78;
const METRIC_ARC_RADIUS = 58;
const METRIC_ARC_START_DEG = 150;
const METRIC_ARC_SWEEP_DEG = 240;
const METRIC_ARC_TICKS = [0, 0.25, 0.5, 0.75, 1];
function buildMetricArcPath(progress) {
    const start = getMetricArcPoint(0, METRIC_ARC_RADIUS);
    const endProgress = clamp(progress, 0, 1);
    const end = getMetricArcPoint(endProgress, METRIC_ARC_RADIUS);
    const largeArcFlag = endProgress * METRIC_ARC_SWEEP_DEG > 180 ? 1 : 0;
    return [
        `M ${roundTwo(start.x)} ${roundTwo(start.y)}`,
        `A ${METRIC_ARC_RADIUS} ${METRIC_ARC_RADIUS} 0 ${largeArcFlag} 1 ${roundTwo(end.x)} ${roundTwo(end.y)}`,
    ].join(" ");
}
function getMetricArcMarker(progress, innerRadius, outerRadius) {
    const inner = getMetricArcPoint(progress, innerRadius);
    const outer = getMetricArcPoint(progress, outerRadius);
    return {
        innerX: roundTwo(inner.x),
        innerY: roundTwo(inner.y),
        outerX: roundTwo(outer.x),
        outerY: roundTwo(outer.y),
    };
}
function getMetricArcPoint(progress, radius) {
    const angle = (METRIC_ARC_START_DEG + METRIC_ARC_SWEEP_DEG * clamp(progress, 0, 1)) *
        (Math.PI / 180);
    return {
        x: METRIC_ARC_CENTER_X + radius * Math.cos(angle),
        y: METRIC_ARC_CENTER_Y + radius * Math.sin(angle),
    };
}
function ThresholdDeltaLine({ delta }) {
    return (<span className={cn("max-w-full truncate rounded-sm border border-border/50 bg-background/85 px-1.5 py-0.5 text-right font-mono text-[9px] font-black leading-none shadow-sm backdrop-blur", delta.direction === "above" && "text-red-500 dark:text-red-400", delta.direction === "below" && "text-emerald-500 dark:text-emerald-400", delta.direction === "same" && "text-muted-foreground")} title={delta.title}>
      {delta.label}
    </span>);
}
function buildThresholdDelta({ threshold, unit, value, }) {
    if (threshold === undefined) {
        return undefined;
    }
    const difference = roundOne(Math.abs(value - threshold));
    if (value > threshold) {
        return {
            direction: "above",
            label: `+${difference}${unit} 높음`,
            title: `임계치보다 ${difference}${unit} 높음`,
        };
    }
    if (value < threshold) {
        return {
            direction: "below",
            label: `-${difference}${unit} 낮음`,
            title: `임계치보다 ${difference}${unit} 낮음`,
        };
    }
    return {
        direction: "same",
        label: `0${unit} 동일`,
        title: "임계치와 동일",
    };
}
function getMetricStatusLabel({ isExceeded, threshold, value, }) {
    if (isExceeded) {
        return "임계 초과";
    }
    if (threshold && value / threshold >= 0.82) {
        return "주의";
    }
    return "안정";
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function AvgTemperatureIcon({ className, ...props }) {
    return (<svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" viewBox="0 0 24 24" {...props}>
      {/* 온도계 몸체 */}
      <path d="M12 2a2 2 0 0 0-2 2v9.382a4 4 0 1 0 4 0V4a2 2 0 0 0-2-2z"/>
      {/* 수은주 */}
      <line x1="12" y1="13" x2="12" y2="6" strokeWidth="2.5"/>
      {/* 오른쪽 눈금선 */}
      <line x1="14" y1="5" x2="16" y2="5" strokeWidth="1.5"/>
      <line x1="14" y1="8" x2="15.5" y2="8" strokeWidth="1.5"/>
      <line x1="14" y1="11" x2="16" y2="11" strokeWidth="1.5"/>
    </svg>);
}
/** 초음파 — 음파 방사 원형 + 중심 진동 도트 */
function UltrasoundIcon({ className, ...props }) {
    return (<svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" viewBox="0 0 24 24" {...props}>
      {/* 중심 진동자 */}
      <rect x="10" y="8" width="4" height="8" rx="2"/>
      {/* 왼쪽 음파 */}
      <path d="M7 9.5a5 5 0 0 0 0 5"/>
      <path d="M4.5 7.5a8 8 0 0 0 0 9"/>
      {/* 오른쪽 음파 */}
      <path d="M17 9.5a5 5 0 0 1 0 5"/>
      <path d="M19.5 7.5a8 8 0 0 1 0 9"/>
    </svg>);
}
function roundOne(value) {
    return Number(value.toFixed(1));
}
function roundTwo(value) {
    return Number(value.toFixed(2));
}
