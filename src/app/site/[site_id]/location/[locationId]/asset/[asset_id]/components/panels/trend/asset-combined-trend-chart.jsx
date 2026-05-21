"use client";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Curve,
  Customized,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const PALETTE = {
  axis: "var(--muted-foreground)",
  border: "var(--border)",
  card: "var(--background)",
  foreground: "var(--asset-dashboard-strong-text)",
  grid: "color-mix(in oklch, var(--border) 78%, transparent)",
  muted: "var(--muted-foreground)",
  popover: "var(--popover)",
  refLine: "var(--destructive)",
  temperature: "var(--asset-temperature-average-stroke)",
  ultrasound: "var(--asset-ultrasound-average-stroke)",
};
const DEFAULT_TEMPERATURE_Y_AXIS_MAX = 200;
const EXTENDED_TEMPERATURE_Y_AXIS_MAX = 300;
const TEMPERATURE_EXTENSION_THRESHOLD = 150;
export function AssetCombinedTrendChart({
  temperatureData,
  temperatureReferenceLines,
  temperatureYAxisMax: temperatureYAxisMaxOverride,
  ultrasoundData,
  ultrasoundReferenceLines,
  ultrasoundYAxisMax,
  xAxisMax,
  xAxisTicks,
  xAxisUnitLabel,
}) {
  const data = buildCombinedTrendData(
    temperatureData,
    ultrasoundData,
    xAxisMax,
  );
  const temperatureSignificantRise = buildSignificantRiseSegment(
    data,
    "temperatureAverage",
  );
  const ultrasoundSignificantRise = buildSignificantRiseSegment(
    data,
    "ultrasoundAverage",
  );
  const spotPoints = buildCombinedSpotPoints(data);
  const temperatureYAxisMax = getTemperatureYAxisMax(
    temperatureReferenceLines,
    temperatureYAxisMaxOverride,
  );
  const legendItems = [
    {
      label: "초음파 평균",
      stroke: PALETTE.ultrasound,
      tone: "series",
      unit: "dB",
    },
    {
      label: "온도 평균",
      stroke: PALETTE.temperature,
      tone: "series",
      unit: "℃",
    },
    ...buildReferenceLegendItems("온도 임계", temperatureReferenceLines, "℃"),
    ...buildReferenceLegendItems("초음파 임계", ultrasoundReferenceLines, "dB"),
  ];
  return (
    <div
      className="AssetCombinedTrendChart AssetCombinedTrendChart__container-1"
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
        padding: "10px 12px 8px",
        position: "relative",
      }}
    >
      <div
        className="AssetCombinedTrendChart AssetCombinedTrendChart__accent-1"
        style={{
          background: `linear-gradient(to bottom, ${PALETTE.ultrasound}, ${PALETTE.temperature}, transparent)`,
          borderRadius: "10px 0 0 10px",
          height: "100%",
          left: 0,
          opacity: 0.85,
          position: "absolute",
          top: 0,
          width: 3,
        }}
      />

      <div
        className="AssetCombinedTrendChart AssetCombinedTrendChart__header-1"
        style={{
          alignItems: "center",
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          marginBottom: 6,
          paddingLeft: 4,
        }}
      >
        <div
          className="AssetCombinedTrendChart AssetCombinedTrendChart__title-wrap-1"
          style={{ alignItems: "center", display: "flex", gap: 7 }}
        >
          <span
            aria-hidden="true"
            className="AssetCombinedTrendChart AssetCombinedTrendChart__icon-1"
            style={{
              color: PALETTE.ultrasound,
              display: "flex",
              opacity: 0.9,
            }}
          >
            <IconCombinedTrend />
          </span>
          <span
            className="AssetCombinedTrendChart AssetCombinedTrendChart__title-1"
            style={{
              color: PALETTE.foreground,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            통합(초음파, 온도)
          </span>
        </div>

        <InlineLegend items={legendItems} />
      </div>

      <div
        className="AssetCombinedTrendChart AssetCombinedTrendChart__chart-1"
        style={{ flex: 1, minHeight: 0, position: "relative" }}
      >
        <AxisSideLabel
          align="left"
          color={PALETTE.temperature}
          value="온도 ℃"
        />
        <AxisSideLabel
          align="right"
          color={PALETTE.ultrasound}
          value="초음파 dB"
        />
        <AxisUnitLabel unit={xAxisUnitLabel} />
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart
            data={data}
            margin={{ bottom: 20, left: 16, right: 22, top: 30 }}
          >
            <defs>
              <linearGradient
                id="combined-ultrasound-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={PALETTE.ultrasound}
                  stopOpacity={0.34}
                />
                <stop
                  offset="95%"
                  stopColor={PALETTE.ultrasound}
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id="combined-temperature-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={PALETTE.temperature}
                  stopOpacity={0.34}
                />
                <stop
                  offset="95%"
                  stopColor={PALETTE.temperature}
                  stopOpacity={0.04}
                />
              </linearGradient>
              <linearGradient
                id="combined-temperature-rise-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--asset-temperature-maximum-stroke)"
                  stopOpacity={0.42}
                />
                <stop
                  offset="95%"
                  stopColor="var(--asset-temperature-maximum-stroke)"
                  stopOpacity={0.08}
                />
              </linearGradient>
              <linearGradient
                id="combined-ultrasound-rise-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--asset-ultrasound-maximum-stroke)"
                  stopOpacity={0.42}
                />
                <stop
                  offset="95%"
                  stopColor="var(--asset-ultrasound-maximum-stroke)"
                  stopOpacity={0.08}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={PALETTE.grid}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              axisLine={{ stroke: PALETTE.border }}
              dataKey="time"
              interval="preserveStartEnd"
              minTickGap={20}
              tick={{
                fill: PALETTE.axis,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
              }}
              tickLine={false}
              ticks={xAxisTicks}
            />
            <YAxis
              axisLine={{ stroke: PALETTE.temperature }}
              domain={[0, temperatureYAxisMax]}
              tick={{
                fill: PALETTE.temperature,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 800,
              }}
              tickLine={false}
              ticks={buildYAxisTicks(temperatureYAxisMax)}
              width={46}
              yAxisId="temperature"
            />
            <YAxis
              axisLine={{ stroke: PALETTE.ultrasound }}
              domain={[0, ultrasoundYAxisMax]}
              orientation="right"
              tick={{
                fill: PALETTE.ultrasound,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 800,
              }}
              tickLine={false}
              ticks={buildYAxisTicks(ultrasoundYAxisMax)}
              width={46}
              yAxisId="ultrasound"
            />
            {temperatureReferenceLines.map((referenceLine, index) => (
              <ReferenceLine
                key={`temperature-${referenceLine.label}-${index}`}
                ifOverflow="hidden"
                stroke={referenceLine.stroke || PALETTE.refLine}
                strokeDasharray="6 3"
                strokeWidth={1.8}
                y={referenceLine.value}
                yAxisId="temperature"
              />
            ))}
            {ultrasoundReferenceLines.map((referenceLine, index) => (
              <ReferenceLine
                key={`ultrasound-${referenceLine.label}-${index}`}
                ifOverflow="hidden"
                stroke={referenceLine.stroke || PALETTE.refLine}
                strokeDasharray="3 3"
                strokeWidth={1.8}
                y={referenceLine.value}
                yAxisId="ultrasound"
              />
            ))}
            <Tooltip content={<CombinedTooltip />} />
            <Area
              activeDot={{
                fill: PALETTE.ultrasound,
                r: 4.5,
                stroke: "var(--background)",
                strokeWidth: 2,
                style: {
                  filter: "var(--asset-chart-active-dot-filter, none)",
                },
              }}
              dataKey="ultrasoundAverage"
              dot={false}
              fill="url(#combined-ultrasound-fill)"
              fillOpacity={1}
              isAnimationActive={false}
              name="초음파 평균"
              stroke={PALETTE.ultrasound}
              strokeWidth={2.4}
              style={{ filter: "var(--asset-chart-series-filter, none)" }}
              type="monotone"
              yAxisId="ultrasound"
            />
            <Area
              activeDot={{
                fill: PALETTE.temperature,
                r: 4.5,
                stroke: "var(--background)",
                strokeWidth: 2,
                style: {
                  filter: "var(--asset-chart-active-dot-filter, none)",
                },
              }}
              dataKey="temperatureAverage"
              dot={false}
              fill="url(#combined-temperature-fill)"
              fillOpacity={1}
              isAnimationActive={false}
              name="온도 평균"
              stroke={PALETTE.temperature}
              strokeWidth={2.4}
              style={{ filter: "var(--asset-chart-series-filter, none)" }}
              type="monotone"
              yAxisId="temperature"
            />
            {/* replaced by clip overlays below */}
            {false ? (
              <Area
                activeDot={false}
                dataKey="temperatureRiseHighlight"
                dot={false}
                fill="url(#combined-temperature-rise-fill)"
                fillOpacity={1}
                isAnimationActive={false}
                name="온도 최대 상승"
                stroke="var(--asset-temperature-maximum-stroke)"
                strokeWidth={3}
                style={{ filter: "var(--asset-chart-series-filter, none)" }}
                type="monotone"
                yAxisId="temperature"
              />
            ) : null}
            <Customized
              component={
                <RiseHighlightOverlay
                  clipId="combined-temperature-rise-highlight-clip"
                  dataKey="temperatureAverage"
                  fill="url(#combined-temperature-rise-fill)"
                  segment={temperatureSignificantRise}
                  stroke="var(--asset-temperature-maximum-stroke)"
                  strokeWidth={3}
                />
              }
            />
            <Customized
              component={
                <RiseHighlightOverlay
                  clipId="combined-ultrasound-rise-highlight-clip"
                  dataKey="ultrasoundAverage"
                  fill="url(#combined-ultrasound-rise-fill)"
                  segment={ultrasoundSignificantRise}
                  stroke="var(--asset-ultrasound-maximum-stroke)"
                  strokeWidth={3}
                />
              }
            />
            {spotPoints.map((spotPoint) => (
              <ReferenceDot
                key={`${spotPoint.yAxisId}-${spotPoint.name}`}
                fill={spotPoint.fill}
                ifOverflow="hidden"
                isFront
                shape={<CombinedSpotMarker />}
                x={spotPoint.time}
                y={spotPoint.value}
                yAxisId={spotPoint.yAxisId}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function buildCombinedTrendData(temperatureData, ultrasoundData, xAxisMax) {
  const pointMap = new Map();
  temperatureData
    .filter((point) => isInsideXAxisMax(point, xAxisMax))
    .forEach((point) => {
      pointMap.set(point.time, {
        ...pointMap.get(point.time),
        temperatureAverage: point.average,
        temperatureMax: point.max,
        temperatureMin: point.min,
        time: point.time,
      });
    });
  ultrasoundData
    .filter((point) => isInsideXAxisMax(point, xAxisMax))
    .forEach((point) => {
      pointMap.set(point.time, {
        ...pointMap.get(point.time),
        peakFrequency: point.peakFrequency,
        time: point.time,
        ultrasoundAverage: point.average,
        ultrasoundPeakDb: point.max,
      });
    });
  return Array.from(pointMap.values()).sort(
    (firstPoint, secondPoint) =>
      getTrendSortValue(firstPoint.time) - getTrendSortValue(secondPoint.time),
  );
}
function buildSignificantRiseSegment(data, dataKey) {
  const points = data
    .map((point, index) => ({ index, point }))
    .filter(
      ({ point }) =>
        typeof point[dataKey] === "number" && Number.isFinite(point[dataKey]),
    );
  if (points.length < 2) {
    return null;
  }
  let runStart = points[0];
  let previous = points[0];
  let bestSegment = null;
  for (const current of points.slice(1)) {
    const currentValue = current.point[dataKey];
    const previousValue = previous.point[dataKey];
    const startValue = runStart.point[dataKey];
    if (
      typeof currentValue === "number" &&
      typeof previousValue === "number" &&
      typeof startValue === "number" &&
      currentValue > previousValue
    ) {
      const delta = currentValue - startValue;
      if (!bestSegment || delta > bestSegment.delta) {
        bestSegment = {
          delta: Number(delta.toFixed(2)),
          endIndex: current.index,
          endTime: current.point.time,
          endValue: currentValue,
          startIndex: runStart.index,
          startTime: runStart.point.time,
          startValue,
        };
      }
    } else {
      runStart = current;
    }
    previous = current;
  }
  return bestSegment;
}
function buildCombinedSpotPoints(data) {
  const spotPoints = [];
  const temperaturePoints = data.filter(
    (point) => typeof point.temperatureAverage === "number",
  );
  const ultrasoundPoints = data.filter(
    (point) => typeof point.ultrasoundAverage === "number",
  );
  if (temperaturePoints.length) {
    const temperatureMaxPoint = temperaturePoints.reduce((currentMax, point) =>
      point.temperatureAverage > currentMax.temperatureAverage
        ? point
        : currentMax,
    );
    const temperatureMinPoint = temperaturePoints.reduce((currentMin, point) =>
      point.temperatureAverage < currentMin.temperatureAverage
        ? point
        : currentMin,
    );
    spotPoints.push(
      {
        fill: "var(--asset-temperature-maximum-stroke)",
        name: "temperature-max",
        time: temperatureMaxPoint.time,
        value: temperatureMaxPoint.temperatureAverage,
        yAxisId: "temperature",
      },
      {
        fill: "var(--asset-temperature-minimum-stroke)",
        name: "temperature-min",
        time: temperatureMinPoint.time,
        value: temperatureMinPoint.temperatureAverage,
        yAxisId: "temperature",
      },
    );
  }
  if (ultrasoundPoints.length) {
    const ultrasoundMaxPoint = ultrasoundPoints.reduce((currentMax, point) =>
      point.ultrasoundAverage > currentMax.ultrasoundAverage
        ? point
        : currentMax,
    );
    spotPoints.push({
      fill: "var(--asset-ultrasound-maximum-stroke)",
      name: "ultrasound-max",
      time: ultrasoundMaxPoint.time,
      value: ultrasoundMaxPoint.ultrasoundAverage,
      yAxisId: "ultrasound",
    });
  }
  return spotPoints;
}
function isInsideXAxisMax(point, xAxisMax) {
  const offset = Number(point.time);
  return !Number.isFinite(offset) || Math.abs(offset) <= xAxisMax;
}
function getTrendSortValue(time) {
  const offset = Number(time);
  return Number.isFinite(offset) ? offset : Number.POSITIVE_INFINITY;
}
function getTemperatureYAxisMax(referenceLines, yAxisMaxOverride) {
  if (yAxisMaxOverride && yAxisMaxOverride > 0) {
    return yAxisMaxOverride;
  }
  return referenceLines.some(
    (referenceLine) => referenceLine.value >= TEMPERATURE_EXTENSION_THRESHOLD,
  )
    ? EXTENDED_TEMPERATURE_Y_AXIS_MAX
    : DEFAULT_TEMPERATURE_Y_AXIS_MAX;
}
function buildYAxisTicks(yAxisMax) {
  const step = yAxisMax / 4;
  return [0, 1, 2, 3, 4].map((index) => Number((step * index).toFixed(1)));
}
function CombinedTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }
  const trendPoint = payload[0]?.payload;
  const visiblePayload = payload.filter(
    (entry) => typeof entry.value === "number",
  );
  return (
    <div
      className="AssetCombinedTrendChart AssetCombinedTrendChart__tooltip-1"
      style={{
        backdropFilter: "var(--asset-chart-tooltip-backdrop, none)",
        background: PALETTE.popover,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 8,
        boxShadow: "var(--asset-chart-tooltip-shadow, none)",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minWidth: 220,
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          color: PALETTE.muted,
          fontSize: 11,
          letterSpacing: 0,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ display: "grid", gap: 5 }}>
        {visiblePayload.map((entry) => (
          <div
            key={String(entry.dataKey)}
            style={{
              alignItems: "center",
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                alignItems: "center",
                color: PALETTE.muted,
                display: "flex",
                fontSize: 12,
                fontWeight: 700,
                gap: 6,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  background: entry.color,
                  borderRadius: 1,
                  boxShadow: "var(--asset-chart-line-marker-shadow, none)",
                  display: "inline-block",
                  height: 3,
                  width: 22,
                }}
              />
              {entry.name}
            </span>
            <span
              style={{
                color: entry.color,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0,
              }}
            >
              {formatTooltipNumber(entry.value)}
              <span style={{ fontSize: 11, marginLeft: 2, opacity: 0.72 }}>
                {getEntryUnit(entry.dataKey)}
              </span>
            </span>
          </div>
        ))}

        {trendPoint ? (
          <div
            style={{
              borderTop: `1px solid ${PALETTE.border}`,
              color: PALETTE.muted,
              display: "grid",
              fontSize: 11,
              fontWeight: 700,
              gap: 4,
              marginTop: 4,
              paddingTop: 6,
            }}
          >
            <span>
              온도 최저/최고 {formatTooltipNumber(trendPoint.temperatureMin)}℃ /{" "}
              {formatTooltipNumber(trendPoint.temperatureMax)}℃
            </span>
            <span>
              초음파 피크/주파수{" "}
              {formatTooltipNumber(trendPoint.ultrasoundPeakDb)} dB /{" "}
              {formatTooltipNumber(trendPoint.peakFrequency)} kHz
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
function getEntryUnit(dataKey) {
  return dataKey === "temperatureAverage" ? "℃" : "dB";
}
function formatTooltipNumber(value) {
  return typeof value === "number" ? value.toFixed(1) : "-";
}
function InlineLegend({ items }) {
  return (
    <div
      className="AssetCombinedTrendChart AssetCombinedTrendChart__legend-1"
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: "7px 12px",
        justifyContent: "flex-end",
        minWidth: 0,
      }}
    >
      {items.map((item) => (
        <div
          key={`${item.label}-${item.unit}-${item.stroke}`}
          style={{ alignItems: "center", display: "flex", gap: 5 }}
        >
          <span
            aria-hidden="true"
            style={{
              background:
                item.tone === "reference"
                  ? `repeating-linear-gradient(to right, ${item.stroke} 0 6px, transparent 6px 9px)`
                  : item.stroke,
              borderRadius: 2,
              boxShadow:
                item.tone === "series"
                  ? "var(--asset-chart-line-marker-shadow, none)"
                  : "none",
              display: "inline-block",
              height: item.tone === "series" ? 3 : 2,
              width: item.tone === "series" ? 26 : 24,
            }}
          />
          <span
            style={{
              color: PALETTE.muted,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0,
              whiteSpace: "nowrap",
            }}
          >
            {item.label} ({item.unit})
          </span>
        </div>
      ))}
    </div>
  );
}
function buildReferenceLegendItems(labelPrefix, referenceLines, unit) {
  return referenceLines.map((referenceLine) => ({
    label: `${labelPrefix} ${formatReferenceValue(referenceLine.value)}`,
    stroke: referenceLine.stroke || PALETTE.refLine,
    tone: "reference",
    unit,
  }));
}
function formatReferenceValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function RiseHighlightOverlay({
  clipId,
  dataKey,
  fill,
  formattedGraphicalItems,
  offset,
  segment,
  stroke,
  strokeWidth,
}) {
  if (!segment) {
    return null;
  }
  const graphicalItem = formattedGraphicalItems?.find(
    (item) => item.item?.props?.dataKey === dataKey,
  );
  const points = graphicalItem?.props?.points;
  if (!points?.length) {
    return null;
  }
  const startPoint = points[segment.startIndex];
  const endPoint = points[segment.endIndex];
  if (
    !isFinitePoint(startPoint) ||
    !isFinitePoint(endPoint) ||
    segment.endIndex <= segment.startIndex
  ) {
    return null;
  }
  const clipX = Math.min(startPoint.x, endPoint.x);
  const clipWidth = Math.abs(endPoint.x - startPoint.x);
  if (clipWidth <= 0) {
    return null;
  }
  const clipY = offset?.top ?? 0;
  const clipHeight =
    offset?.height ??
    Math.max(
      ...points.map((point) =>
        typeof point.y === "number" && Number.isFinite(point.y) ? point.y : 0,
      ),
    );
  const baseLine =
    graphicalItem?.props?.baseLine ??
    (offset ? offset.top + offset.height : clipY + clipHeight);
  const curvePoints = points;
  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={clipId}>
          <rect height={clipHeight} width={clipWidth} x={clipX} y={clipY} />
        </clipPath>
      </defs>
      <Curve
        baseLine={baseLine}
        clipPath={`url(#${clipId})`}
        connectNulls={false}
        fill={fill}
        layout="horizontal"
        points={curvePoints}
        stroke="none"
        type="monotone"
      />
      <Curve
        clipPath={`url(#${clipId})`}
        connectNulls={false}
        fill="none"
        layout="horizontal"
        points={curvePoints}
        stroke={stroke}
        strokeLinecap="butt"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        style={{ filter: "var(--asset-chart-series-filter, none)" }}
        type="monotone"
      />
    </g>
  );
}
function isFinitePoint(point) {
  return (
    typeof point?.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  );
}
function CombinedSpotMarker(props) {
  const { cx, cy, fill } = props;
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        fill={fill}
        r={5}
        stroke="var(--background)"
        strokeWidth={2}
      />
      <circle
        cx={cx}
        cy={cy}
        fill="none"
        r={8}
        stroke={fill}
        strokeOpacity={0.38}
        strokeWidth={2}
      />
    </g>
  );
}
function AxisSideLabel({ align, color, value }) {
  return (
    <div
      className={`AssetCombinedTrendChart AssetCombinedTrendChart__axis-side-${align}`}
      style={{
        alignItems: "center",
        background: "color-mix(in oklch, var(--background) 88%, transparent)",
        border: `1px solid ${color}`,
        borderRadius: 6,
        color,
        display: "inline-flex",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 800,
        left: align === "left" ? 0 : "auto",
        letterSpacing: 0,
        padding: "3px 6px",
        position: "absolute",
        right: align === "right" ? 0 : "auto",
        top: 0,
        zIndex: 2,
      }}
    >
      <span>{value}</span>
    </div>
  );
}
function AxisUnitLabel({ unit }) {
  return (
    <span
      className="AssetCombinedTrendChart AssetCombinedTrendChart__axis-unit-x"
      style={{
        bottom: 0,
        color: PALETTE.foreground,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 800,
        left: "50%",
        letterSpacing: 0,
        opacity: 0.9,
        position: "absolute",
        textShadow: "0 1px 2px var(--background)",
        top: "auto",
        transform: "translateX(-50%)",
        zIndex: 2,
      }}
    >
      {`x: ${unit}`}
    </span>
  );
}
function IconCombinedTrend() {
  return (
    <svg
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M3 17l5-6 4 4 5-8 4 5" />
      <path d="M3 7h4l3 5 4-8 3 6h4" opacity={0.58} />
    </svg>
  );
}
