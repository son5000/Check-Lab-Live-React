import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
export function TrendChart({ title, rangeLabel, data, variant, referenceLines, }) {
    return (<section className="TrendChart TrendChart__section-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground">
      <div className="TrendChart TrendChart__container-1 mb-1 flex min-w-0 items-center justify-between gap-2">
        <h3 className="TrendChart TrendChart__title-1 min-w-0 truncate text-xs font-semibold text-foreground">{title}</h3>
        <span className="TrendChart TrendChart__label-1 shrink-0 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {rangeLabel}
        </span>
      </div>
      <div className="TrendChart TrendChart__container-2 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 2, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/>
            <XAxis dataKey="time" interval="preserveStartEnd" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false}/>
            <YAxis width={44} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false}/>
            {referenceLines.map((referenceLine) => (<ReferenceLine key={referenceLine.label} y={referenceLine.value} stroke={referenceLine.stroke} strokeDasharray="5 4" strokeWidth={1.5} ifOverflow="extendDomain" label={{
                value: `${referenceLine.label} ${referenceLine.value}`,
                position: "insideTopRight",
                fill: referenceLine.stroke,
                fontSize: 10,
            }}/>))}
            <Tooltip contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--popover-foreground)",
            fontSize: 12,
        }} labelStyle={{ color: "var(--popover-foreground)" }}/>
            <Line type="monotone" dataKey="average" name={variant === "ultrasonic" ? "평균 dB" : "평균 온도"} stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false}/>
            <Line type="monotone" dataKey="max" name={variant === "ultrasonic" ? "최대 dB" : "최고 온도"} stroke="var(--chart-4)" strokeWidth={2} dot={false} isAnimationActive={false}/>
            {variant === "temperature" ? (<Line type="monotone" dataKey="min" name="최저 온도" stroke="var(--chart-5)" strokeWidth={2} dot={false} isAnimationActive={false}/>) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
