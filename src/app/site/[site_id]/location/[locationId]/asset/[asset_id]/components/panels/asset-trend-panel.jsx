import { useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";
import { AssetCombinedTrendChart } from "./trend/asset-combined-trend-chart";
import { AssetTemperatureTrendChart } from "./trend/asset-temperature-trend-chart";
import { AssetUltrasoundTrendChart } from "./trend/asset-ultrasound-trend-chart";
const PANEL_STYLE = {
    axis: "var(--muted-foreground)",
    bg: "var(--card)",
    border: "var(--border)",
    foreground: "var(--foreground)",
};
const DEFAULT_AUTO_RANGE_INTERVAL_SECONDS = 30;
const DEFAULT_ULTRASOUND_Y_AXIS_MAX = 120;
const trendDisplayModeOptions = [
    { id: "separate", label: "개별" },
    { id: "combined", label: "통합" },
];
const rangeAxisConfig = {
    "1m": {
        max: 60,
        ticks: ["-60", "-50", "-40", "-30", "-20", "-10", "현재"],
        unitLabel: "초",
    },
    "1h": {
        max: 60,
        ticks: ["-60", "-50", "-40", "-30", "-20", "-10", "현재"],
        unitLabel: "분",
    },
    "24h": {
        max: 24,
        ticks: ["-24", "-18", "-12", "-6", "현재"],
        unitLabel: "시간",
    },
    "7d": {
        max: 7,
        ticks: ["-7", "-6", "-5", "-4", "-3", "-2", "-1", "현재"],
        unitLabel: "일",
    },
    "30d": {
        max: 30,
        ticks: ["-30", "-20", "-10", "현재"],
        unitLabel: "일",
    },
};
export function AssetTrendPanel({ activeRangeId, ranges, temperatureData, temperatureReferenceLines, ultrasonicData, ultrasonicReferenceLines, onRangeChange, }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAutoRangeEnabled, setIsAutoRangeEnabled] = useState(true);
    const [autoRangeIntervalSeconds, setAutoRangeIntervalSeconds] = useState(DEFAULT_AUTO_RANGE_INTERVAL_SECONDS);
    const [displayMode, setDisplayMode] = useState("separate");
    const activeRangeConfig = rangeAxisConfig[activeRangeId];
    const isCombinedDisplay = displayMode === "combined";
    useEffect(() => {
        if (!isAutoRangeEnabled ||
            autoRangeIntervalSeconds <= 0 ||
            !ranges.length) {
            return;
        }
        const intervalId = window.setInterval(() => {
            const activeIndex = ranges.findIndex((range) => range.id === activeRangeId);
            const nextRange = ranges[(activeIndex + 1) % ranges.length] ?? ranges[0];
            onRangeChange(nextRange.id);
        }, autoRangeIntervalSeconds * 1000);
        return () => window.clearInterval(intervalId);
    }, [
        activeRangeId,
        autoRangeIntervalSeconds,
        isAutoRangeEnabled,
        onRangeChange,
        ranges,
    ]);
    return (<section className="AssetTrendPanel AssetTrendPanel__section-1" style={{
            background: PANEL_STYLE.bg,
            border: `1px solid ${PANEL_STYLE.border}`,
            borderRadius: 12,
            boxShadow: "var(--asset-chart-panel-shadow, none)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
            padding: "12px 12px 10px",
            position: "relative",
        }}>
      <div className="AssetTrendPanel AssetTrendPanel__container-1" style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "space-between",
        }}>
        <div className="AssetTrendPanel AssetTrendPanel__container-2" style={{ alignItems: "center", display: "flex", gap: 10 }}>
          <h2 className="AssetTrendPanel AssetTrendPanel__title-1" style={{
            color: PANEL_STYLE.foreground,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0,
            margin: 0,
            textTransform: "uppercase",
        }}>
            변화 추이 그래프
          </h2>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: 6 }}>
          <div className="AssetTrendPanel AssetTrendPanel__range-1" style={{
            background: "var(--background)",
            border: `1px solid ${PANEL_STYLE.border}`,
            borderRadius: 8,
            display: "flex",
            gap: 3,
            padding: "3px",
        }}>
            {ranges.map((range) => {
            const isActive = activeRangeId === range.id;
            return (<button key={range.id} className="AssetTrendPanel AssetTrendPanel__button-1" onClick={() => onRangeChange(range.id)} style={{
                    background: isActive ? "var(--chart-1)" : "transparent",
                    border: "none",
                    borderRadius: 5,
                    boxShadow: isActive
                        ? "var(--asset-chart-active-range-shadow, none)"
                        : "none",
                    color: isActive ? "var(--background)" : PANEL_STYLE.axis,
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    height: 26,
                    letterSpacing: 0,
                    minWidth: 36,
                    padding: "0 8px",
                    transition: "all 0.18s ease",
                }} type="button">
                  {range.label}
                </button>);
        })}
          </div>
          <button className="AssetTrendPanel AssetTrendPanel__button-settings-1" onClick={() => setIsSettingsOpen((isOpen) => !isOpen)} style={{
            alignItems: "center",
            background: "var(--background)",
            border: `1px solid ${PANEL_STYLE.border}`,
            borderRadius: 8,
            color: PANEL_STYLE.axis,
            cursor: "pointer",
            display: "grid",
            height: 32,
            placeItems: "center",
            width: 32,
        }} title="추이 그래프 설정" type="button">
            <Settings2 aria-hidden="true" size={15}/>
          </button>
        </div>
      </div>

      {isSettingsOpen ? (<TrendSettingsPopover autoRangeIntervalSeconds={autoRangeIntervalSeconds} displayMode={displayMode} isAutoRangeEnabled={isAutoRangeEnabled} onAutoRangeIntervalSecondsChange={setAutoRangeIntervalSeconds} onClose={() => setIsSettingsOpen(false)} onDisplayModeChange={setDisplayMode} onIsAutoRangeEnabledChange={setIsAutoRangeEnabled}/>) : null}

      <div className="AssetTrendPanel AssetTrendPanel__container-4" style={{
            display: "grid",
            flex: 1,
            gap: 8,
            gridTemplateRows: isCombinedDisplay ? "minmax(0,1fr)" : "1fr 1fr",
            minHeight: 0,
        }}>
        {isCombinedDisplay ? (<AssetCombinedTrendChart temperatureData={temperatureData} temperatureReferenceLines={temperatureReferenceLines} ultrasoundData={ultrasonicData} ultrasoundReferenceLines={ultrasonicReferenceLines} ultrasoundYAxisMax={DEFAULT_ULTRASOUND_Y_AXIS_MAX} xAxisMax={activeRangeConfig.max} xAxisTicks={activeRangeConfig.ticks} xAxisUnitLabel={activeRangeConfig.unitLabel}/>) : (<>
            <AssetUltrasoundTrendChart data={ultrasonicData} referenceLines={ultrasonicReferenceLines} xAxisMax={activeRangeConfig.max} xAxisTicks={activeRangeConfig.ticks} xAxisUnitLabel={activeRangeConfig.unitLabel} yAxisMax={DEFAULT_ULTRASOUND_Y_AXIS_MAX}/>

            <AssetTemperatureTrendChart data={temperatureData} referenceLines={temperatureReferenceLines} xAxisMax={activeRangeConfig.max} xAxisTicks={activeRangeConfig.ticks} xAxisUnitLabel={activeRangeConfig.unitLabel}/>
          </>)}
      </div>
    </section>);
}
function TrendSettingsPopover({ autoRangeIntervalSeconds, displayMode, isAutoRangeEnabled, onAutoRangeIntervalSecondsChange, onClose, onDisplayModeChange, onIsAutoRangeEnabledChange, }) {
    return (<div className="AssetTrendPanel AssetTrendPanel__settings-1" style={{
            background: "var(--popover)",
            border: `1px solid ${PANEL_STYLE.border}`,
            borderRadius: 8,
            boxShadow: "0 16px 36px color-mix(in oklch, var(--foreground) 16%, transparent)",
            display: "grid",
            gap: 8,
            maxHeight: "calc(100% - 64px)",
            minWidth: 300,
            overflowY: "auto",
            padding: 10,
            position: "absolute",
            right: 12,
            top: 52,
            zIndex: 20,
        }}>
      <div style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
        }}>
        <strong style={{ color: PANEL_STYLE.foreground, fontSize: 12 }}>
          그래프 설정
        </strong>
        <button onClick={onClose} style={{
            background: "transparent",
            border: "none",
            color: PANEL_STYLE.axis,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
        }} type="button">
          <X aria-hidden="true" size={14}/>
        </button>
      </div>
      <SettingSegmentedControl label="표시 방식" options={trendDisplayModeOptions} value={displayMode} onChange={onDisplayModeChange}/>
      <SettingNumberInput disabled={!isAutoRangeEnabled} label="Range 전환 interval" max={300} min={5} suffix="초" value={autoRangeIntervalSeconds} onChange={onAutoRangeIntervalSecondsChange}/>
      <SettingSwitch checked={isAutoRangeEnabled} label="Range 자동 전환" onChange={onIsAutoRangeEnabledChange}/>
    </div>);
}
function SettingSegmentedControl({ label, options, value, onChange, }) {
    return (<div style={{ display: "grid", gap: 3, minWidth: 0 }}>
      <span style={{ color: PANEL_STYLE.axis, fontSize: 10, fontWeight: 700 }}>
        {label}
      </span>
      <span aria-label={label} role="group" style={{
            background: "var(--background)",
            border: `1px solid ${PANEL_STYLE.border}`,
            borderRadius: 6,
            display: "grid",
            gap: 3,
            gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            padding: 3,
        }}>
        {options.map((option) => {
            const isActive = value === option.id;
            return (<button key={option.id} type="button" aria-pressed={isActive} onClick={() => onChange(option.id)} style={{
                    background: isActive ? "var(--chart-1)" : "transparent",
                    border: "none",
                    borderRadius: 4,
                    color: isActive ? "var(--background)" : PANEL_STYLE.axis,
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 800,
                    height: 26,
                    letterSpacing: 0,
                }}>
              {option.label}
            </button>);
        })}
      </span>
    </div>);
}
function SettingNumberInput({ disabled, label, max, min, placeholder, suffix, value, onChange, }) {
    return (<label style={{ display: "grid", gap: 3, minWidth: 0 }}>
      <span style={{ color: PANEL_STYLE.axis, fontSize: 10, fontWeight: 700 }}>
        {label}
      </span>
      <span style={{
            alignItems: "center",
            background: "var(--background)",
            border: `1px solid ${PANEL_STYLE.border}`,
            borderRadius: 6,
            display: "flex",
            gap: 4,
            height: 30,
            padding: "0 7px",
        }}>
        <input disabled={disabled} max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} placeholder={placeholder} style={{
            background: "transparent",
            border: "none",
            color: PANEL_STYLE.foreground,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            minWidth: 0,
            outline: "none",
            opacity: disabled ? 0.55 : 1,
            width: "100%",
        }} type="number" value={value || ""}/>
        <span style={{ color: PANEL_STYLE.axis, fontSize: 10 }}>{suffix}</span>
      </span>
    </label>);
}
function SettingSwitch({ checked, label, onChange, }) {
    return (<button type="button" onClick={() => onChange(!checked)} style={{
            alignItems: "center",
            background: "transparent",
            border: "none",
            color: PANEL_STYLE.foreground,
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            padding: "2px 0",
        }}>
      <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
      <span aria-hidden="true" style={{
            alignItems: "center",
            background: checked ? "var(--chart-1)" : "var(--muted)",
            border: `1px solid ${PANEL_STYLE.border}`,
            borderRadius: 999,
            display: "flex",
            height: 18,
            justifyContent: checked ? "flex-end" : "flex-start",
            padding: 2,
            width: 34,
        }}>
        <span style={{
            background: checked ? "var(--background)" : PANEL_STYLE.axis,
            borderRadius: "50%",
            display: "block",
            height: 12,
            width: 12,
        }}/>
      </span>
    </button>);
}
