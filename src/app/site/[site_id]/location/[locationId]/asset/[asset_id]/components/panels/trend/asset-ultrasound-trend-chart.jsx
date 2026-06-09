"use client";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Curve,
  Customized,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const PALETTE = {
  axis: "var(--muted-foreground)",
  average: "var(--asset-ultrasound-average-stroke)",
  border: "var(--border)",
  card: "var(--background)",
  foreground: "var(--asset-dashboard-strong-text)",
  grid: "color-mix(in oklch, var(--border) 78%, transparent)",
  max: "var(--asset-ultrasound-maximum-stroke)",
  min: "var(--asset-ultrasound-minimum-stroke)",
  muted: "var(--muted-foreground)",
  popover: "var(--popover)",
  refLine: "var(--destructive)",
  rise: "#f97316",
};
export function AssetUltrasoundTrendChart({
  data,
  referenceLines,
  xAxisMax,
  xAxisTicks,
  xAxisUnitLabel,
  yAxisMax,
}) {
  const displayedData = filterTrendDataByXAxisMax(data, xAxisMax);
  const significantRise = buildSignificantRiseSegment(
    displayedData,
    xAxisUnitLabel,
  );
  const chartData = applyRiseHighlight(displayedData, significantRise);
  return (
    <TrendChartCard
      accentColor={PALETTE.average}
      data={chartData}
      icon={<IconWave />}
      referenceLines={referenceLines}
      series={[
        {
          dataKey: "average",
          name: "초음파",
          stroke: PALETTE.average,
        },
      ]}
      significantRise={significantRise}
      spotPoints={buildUltrasoundSpotPoints(displayedData)}
      title="초음파"
      xAxisTicks={xAxisTicks}
      xAxisUnitLabel={xAxisUnitLabel}
      unit="dB"
      yAxisDomain={[0, yAxisMax]}
      yAxisTicks={buildYAxisTicks(yAxisMax)}
    />
  );
}
function TrendChartCard({
  accentColor,
  data,
  icon,
  referenceLines,
  series,
  significantRise,
  spotPoints,
  title,
  unit,
  yAxisDomain,
  yAxisTicks,
  xAxisTicks,
  xAxisUnitLabel,
}) {
  return (
    <div
      className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__container-1"
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
        className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__accent-1"
        style={{
          background: `linear-gradient(to bottom, ${accentColor}, transparent)`,
          borderRadius: "10px 0 0 10px",
          height: "100%",
          left: 0,
          opacity: 0.8,
          position: "absolute",
          top: 0,
          width: 3,
        }}
      />

      <div
        className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__container-2"
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        <div
          className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__container-3"
          style={{ alignItems: "center", display: "flex", gap: 7 }}
        >
          <span
            className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__icon-1"
            style={{
              alignItems: "center",
              color: accentColor,
              display: "flex",
              opacity: 0.9,
            }}
          >
            {icon}
          </span>
          <span
            className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__title-1"
            style={{
              color: PALETTE.foreground,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            {title}
          </span>
        </div>
        <InlineLegend series={series} />

        <div
          className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__container-4"
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            justifyContent: "flex-end",
          }}
        >
          {referenceLines.map((referenceLine) => (
            <div
              key={referenceLine.label}
              className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__reference-1"
              title={`${referenceLine.label} ${formatReferenceValue(referenceLine.value)}${unit}`}
              style={{
                alignItems: "center",
                color: PALETTE.muted,
                display: "inline-flex",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                gap: 4,
                letterSpacing: 0,
                lineHeight: 1,
                padding: "1px 2px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__reference-dot-1"
                style={{
                  background: referenceLine.stroke,
                  borderRadius: 999,
                  flexShrink: 0,
                  height: 6,
                  width: 6,
                }}
              />
              {formatReferenceChipLabel(referenceLine, unit)}
            </div>
          ))}
        </div>
      </div>

      <div
        className="AssetUltrasoundTrend3D AssetUltrasoundTrend3D__chart-1"
        data-asset-ultrasound-3d-chart="true"
        style={{ flex: 1, minHeight: 0, position: "relative" }}
      >
        <AxisUnitLabel axis="y" unit={unit} />
        <AxisUnitLabel axis="x" unit={xAxisUnitLabel} />
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart
            data={data}
            margin={{ bottom: 18, left: 12, right: 12, top: 8 }}
          >
            <defs>
              <linearGradient
                id="ultrasound-area-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={PALETTE.average}
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor={PALETTE.average}
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id="ultrasound-rise-highlight-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="5%" stopColor={PALETTE.rise} stopOpacity={0.58} />
                <stop
                  offset="95%"
                  stopColor={PALETTE.rise}
                  stopOpacity={0.12}
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
              axisLine={false}
              domain={yAxisDomain}
              tick={{
                fill: PALETTE.axis,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
              }}
              tickLine={false}
              ticks={yAxisTicks}
              width={46}
              yAxisId="left"
            />
            {referenceLines.map((referenceLine) => (
              <ReferenceLine
                key={referenceLine.label}
                ifOverflow="hidden"
                stroke={referenceLine.stroke || PALETTE.refLine}
                strokeDasharray="6 3"
                strokeWidth={1.75}
                y={referenceLine.value}
                yAxisId="left"
              />
            ))}
            <Tooltip
              content={
                <CustomTooltip significantRise={significantRise} unit={unit} />
              }
            />
            {series.map((currentSeries) => (
              <Area
                key={String(currentSeries.dataKey)}
                activeDot={{
                  fill: currentSeries.stroke,
                  r: 4.5,
                  stroke: "var(--background)",
                  strokeWidth: 2,
                  style: {
                    filter: "var(--asset-chart-active-dot-filter, none)",
                  },
                }}
                dataKey={currentSeries.dataKey}
                dot={false}
                fill="url(#ultrasound-area-fill)"
                fillOpacity={1}
                isAnimationActive={false}
                name={currentSeries.name}
                stroke={currentSeries.stroke}
                strokeWidth={2.2}
                style={{ filter: "var(--asset-chart-series-filter, none)" }}
                type="monotone"
                yAxisId="left"
              />
            ))}
            {significantRise ? (
              <Area
                activeDot={false}
                baseValue={0}
                connectNulls={false}
                dataKey="riseHighlight"
                dot={false}
                fill="url(#ultrasound-rise-highlight-fill)"
                fillOpacity={0}
                isAnimationActive={false}
                name="최대 상승 구간"
                stroke="none"
                strokeWidth={0}
                type="monotone"
                yAxisId="left"
              />
            ) : null}
            {significantRise ? (
              <Line
                activeDot={false}
                connectNulls={false}
                dataKey="riseHighlight"
                dot={false}
                isAnimationActive={false}
                stroke="transparent"
                strokeWidth={2.8}
                style={{
                  filter: "var(--asset-chart-series-filter, none)",
                }}
                type="monotone"
                yAxisId="left"
              />
            ) : null}
            {significantRise ? (
              <Customized
                component={
                  <RiseHighlightOverlay
                    clipId="ultrasound-rise-highlight-clip"
                    dataKey="average"
                    fill="url(#ultrasound-rise-highlight-fill)"
                    segment={significantRise}
                    stroke={PALETTE.rise}
                    strokeWidth={2.8}
                  />
                }
              />
            ) : null}
            {spotPoints.map((spotPoint) => (
              <ReferenceDot
                key={spotPoint.name}
                fill={spotPoint.fill}
                ifOverflow="hidden"
                isFront
                shape={<UltrasoundSpotMarker />}
                x={spotPoint.time}
                y={spotPoint.value}
                yAxisId="left"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
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
function CustomTooltip({ active, label, payload, significantRise, unit }) {
  if (!active || !payload?.length) {
    return null;
  }
  const trendPoint =
    payload.find((entry) => entry.dataKey === "average")?.payload ??
    payload[0]?.payload;
  const visiblePayload = payload.filter(
    (entry) =>
      entry.dataKey !== "riseHighlight" && typeof entry.value === "number",
  );
  const isRisePoint =
    Boolean(significantRise) && typeof trendPoint?.riseHighlight === "number";
  return (
    <div
      className="CustomTooltip CustomTooltip__container-1"
      style={{
        backdropFilter: "var(--asset-chart-tooltip-backdrop, none)",
        background: PALETTE.popover,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 8,
        boxShadow: "var(--asset-chart-tooltip-shadow, none)",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minWidth: 180,
        padding: "10px 14px",
      }}
    >
      <div
        className="CustomTooltip CustomTooltip__label-1"
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
      <div
        className="CustomTooltip CustomTooltip__container-2"
        style={{ display: "flex", flexDirection: "column", gap: 5 }}
      >
        {visiblePayload.map((entry) => (
          <div
            key={entry.name}
            className="CustomTooltip CustomTooltip__row-1"
            style={{
              alignItems: "center",
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
            }}
          >
            <div
              className="CustomTooltip CustomTooltip__container-3"
              style={{ alignItems: "center", display: "flex", gap: 6 }}
            >
              <span
                className="CustomTooltip CustomTooltip__mark-1"
                style={{
                  background: entry.color,
                  borderRadius: 1,
                  boxShadow: "var(--asset-chart-line-marker-shadow, none)",
                  color: entry.color,
                  display: "inline-block",
                  height: 2,
                  width: 20,
                }}
              />
              <span
                className="CustomTooltip CustomTooltip__name-1"
                style={{
                  color: PALETTE.muted,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {entry.name}
              </span>
            </div>
            <span
              className="CustomTooltip CustomTooltip__value-1"
              style={{
                color: entry.color,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              {typeof entry.value === "number"
                ? entry.value.toFixed(2)
                : entry.value}
              <span
                className="CustomTooltip CustomTooltip__unit-1"
                style={{ fontSize: 11, marginLeft: 2, opacity: 0.72 }}
              >
                {unit}
              </span>
            </span>
          </div>
        ))}
        {significantRise && isRisePoint ? (
          <div
            className="CustomTooltip CustomTooltip__row-rise-1"
            style={{
              borderTop: `1px solid ${PALETTE.border}`,
              display: "grid",
              gap: 5,
              marginTop: 4,
              paddingTop: 7,
            }}
          >
            <div
              className="CustomTooltip CustomTooltip__row-rise-title-1"
              style={{
                alignItems: "center",
                color: PALETTE.rise,
                display: "flex",
                fontSize: 11,
                fontWeight: 800,
                justifyContent: "space-between",
              }}
            >
              <span>최대 상승 구간</span>
              <span>
                +{formatTooltipNumber(significantRise.delta)}
                {unit}
              </span>
            </div>
            <div
              className="CustomTooltip CustomTooltip__row-rise-detail-1"
              style={{
                color: PALETTE.muted,
                display: "grid",
                fontSize: 11,
                fontWeight: 700,
                gap: 3,
              }}
            >
              <span>
                {significantRise.startTime} - {significantRise.endTime}
              </span>
              <span>
                {significantRise.durationLabel} 동안{" "}
                {formatTooltipNumber(significantRise.startValue)}
                {unit} - {formatTooltipNumber(significantRise.endValue)}
                {unit}
              </span>
            </div>
          </div>
        ) : null}
        {trendPoint ? (
          <div
            className="CustomTooltip CustomTooltip__row-2"
            style={{
              borderTop: `1px solid ${PALETTE.border}`,
              color: PALETTE.muted,
              display: "flex",
              fontSize: 11,
              fontWeight: 700,
              justifyContent: "space-between",
              marginTop: 4,
              paddingTop: 6,
            }}
          >
            <span>피크 / 주파수</span>
            <span>
              {formatTooltipNumber(trendPoint.max)} dB /{" "}
              {formatTooltipNumber(trendPoint.peakFrequency)} kHz
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
function InlineLegend({ series }) {
  return (
    <div
      className="CustomLegend CustomLegend__container-1 AssetUltrasoundTrend3D__legend-1"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "flex-start",
        alignItems: "center",
      }}
    >
      {series.map((entry) => (
        <div
          key={String(entry.dataKey)}
          className="CustomLegend CustomLegend__item-1"
          style={{ alignItems: "center", display: "flex", gap: 5 }}
        >
          <span
            className="CustomLegend CustomLegend__mark-1"
            style={{
              background: entry.stroke,
              borderRadius: 2,
              boxShadow: "var(--asset-chart-line-marker-shadow, none)",
              color: entry.stroke,
              display: "inline-block",
              height: 3,
              width: 26,
            }}
          />
          <span
            className="CustomLegend CustomLegend__label-1"
            style={{
              color: PALETTE.muted,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0,
            }}
          >
            {entry.name}
          </span>
        </div>
      ))}
    </div>
  );
}
function formatReferenceChipLabel(referenceLine, unit) {
  return `${getCompactReferenceLabel(referenceLine.label)} ${formatReferenceValue(referenceLine.value)}${unit}`;
}
function getCompactReferenceLabel(label) {
  if (label === "초음파 임계" || label === "온도 임계") {
    return "임계치";
  }
  if (label === "요주의 기준") {
    return "주의";
  }
  if (label === "이상 기준") {
    return "이상";
  }
  if (label === "설비 임계") {
    return "임계";
  }
  return label.replace(/\s*기준$/, "");
}
function formatReferenceValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function formatTooltipNumber(value) {
  return typeof value === "number" ? value.toFixed(1) : "-";
}
function buildSignificantRiseSegment(data, xAxisUnitLabel) {
  const points = data
    .map((point, index) => ({ index, point }))
    .filter(({ point }) => Number.isFinite(point.average));
  if (points.length < 2) {
    return null;
  }
  let runStart = points[0];
  let previous = points[0];
  let bestSegment = null;
  for (const current of points.slice(1)) {
    if (current.point.average > previous.point.average) {
      const delta = current.point.average - runStart.point.average;
      if (!bestSegment || delta > bestSegment.delta) {
        bestSegment = {
          delta,
          endIndex: current.index,
          endTime: current.point.time,
          endValue: current.point.average,
          startIndex: runStart.index,
          startTime: runStart.point.time,
          startValue: runStart.point.average,
        };
      }
    } else {
      runStart = current;
    }
    previous = current;
  }
  if (!bestSegment) {
    return null;
  }
  return {
    ...bestSegment,
    delta: Number(bestSegment.delta.toFixed(2)),
    durationLabel: formatRiseDurationLabel(
      bestSegment.startTime,
      bestSegment.endTime,
      xAxisUnitLabel,
    ),
  };
}
function applyRiseHighlight(data, significantRise) {
  if (!significantRise) {
    return data;
  }
  return data.map((point, index) => ({
    ...point,
    riseHighlight:
      index >= significantRise.startIndex && index <= significantRise.endIndex
        ? point.average
        : null,
  }));
}
function formatRiseDurationLabel(startTime, endTime, unitLabel) {
  const duration = Math.abs(
    getTrendOffsetValue(endTime) - getTrendOffsetValue(startTime),
  );
  if (duration > 0) {
    return `${formatCompactNumber(duration)}${unitLabel}`;
  }
  return "1구간";
}
function getTrendOffsetValue(time) {
  const offset = Number(time);
  return Number.isFinite(offset) ? offset : 0;
}
function formatCompactNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function filterTrendDataByXAxisMax(data, xAxisMax) {
  return data.filter((point) => {
    if (point.time === "현재") {
      return true;
    }
    return Math.abs(Number(point.time)) <= xAxisMax;
  });
}
function buildYAxisTicks(yAxisMax) {
  const step = yAxisMax / 4;
  return [0, 1, 2, 3, 4].map((index) => Number((step * index).toFixed(1)));
}
function buildUltrasoundSpotPoints(data) {
  const points = data.filter((point) => typeof point.average === "number");
  if (!points.length) {
    return [];
  }
  const peakPoint = points.reduce((currentPeak, point) =>
    point.average > currentPeak.average ? point : currentPeak,
  );
  return [
    {
      fill: PALETTE.max,
      name: "peak",
      time: peakPoint.time,
      value: peakPoint.average,
    },
  ];
}
function UltrasoundSpotMarker(props) {
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
        strokeOpacity={0.35}
        strokeWidth={2}
      />
    </g>
  );
}
function AxisUnitLabel({ axis, unit }) {
  return (
    <span
      className={`AssetUltrasoundTrend3D AssetUltrasoundTrend3D__axis-unit-${axis}`}
      style={{
        bottom: axis === "x" ? 0 : "auto",
        color: PALETTE.foreground,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 800,
        left: axis === "x" ? "50%" : 0,
        letterSpacing: 0,
        position: "absolute",
        right: "auto",
        top: axis === "y" ? "50%" : "auto",
        transform:
          axis === "x" ? "translateX(-50%)" : "translateY(-50%) rotate(-90deg)",
        zIndex: 2,
        opacity: 0.9,
        textShadow: "0 1px 2px var(--background)",
      }}
    >
      {axis === "x" ? `x: ${unit}` : `y: ${unit}`}
    </span>
  );
}
function IconWave() {
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
      <path d="M2 12h2l3-8 4 16 3-10 3 4h5" />
    </svg>
  );
}
