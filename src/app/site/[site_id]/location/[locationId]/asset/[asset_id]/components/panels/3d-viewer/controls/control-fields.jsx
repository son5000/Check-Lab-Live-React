"use client";
import { cn } from "@/lib/utils";
export function ControlSection({ children, icon: Icon, title, }) {
    return (<section className="ControlSection ControlSection__section-1 grid gap-2 rounded-md border border-border bg-background p-2.5">
      <div className="ControlSection ControlSection__header-1 flex min-w-0 items-center gap-2">
        <Icon className="ControlSection ControlSection__icon-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/>
        <h3 className="ControlSection ControlSection__title-1 truncate text-xs font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <div className="ControlSection ControlSection__body-1 grid gap-2">
        {children}
      </div>
    </section>);
}
export function RangeField({ label, max, min, onChange, step = 1, suffix = "", value, }) {
    return (<label className="RangeField RangeField__field-1 grid gap-1">
      <span className="RangeField RangeField__label-1 flex min-w-0 items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-mono text-foreground">
          {formatNumber(value)}
          {suffix}
        </span>
      </span>
      <input className="RangeField RangeField__input-1 h-2 w-full accent-primary" max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value}/>
    </label>);
}
export function NumberField({ label, onChange, step = 1, value, }) {
    return (<label className="NumberField NumberField__field-1 grid min-w-0 gap-1">
      <span className="NumberField NumberField__label-1 truncate text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <input className="NumberField NumberField__input-1 h-8 min-w-0 rounded-md border border-border bg-card px-2 font-mono text-xs font-semibold outline-none focus:border-primary" onChange={(event) => onChange(Number(event.target.value))} step={step} type="number" value={Number.isFinite(value) ? round(value) : 0}/>
    </label>);
}
export function ColorField({ label, onChange, value, }) {
    return (<label className="ColorField ColorField__field-1 grid min-w-0 gap-1">
      <span className="ColorField ColorField__label-1 truncate text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="ColorField ColorField__input-wrap-1 flex h-8 min-w-0 items-center gap-1 rounded-md border border-border bg-card px-1.5">
        <input className="ColorField ColorField__swatch-1 h-5 w-7 shrink-0 cursor-pointer rounded-sm border border-border bg-transparent p-0" onChange={(event) => onChange(event.target.value)} type="color" value={value}/>
        <input className="ColorField ColorField__input-1 min-w-0 flex-1 bg-transparent font-mono text-[11px] font-semibold outline-none" onChange={(event) => onChange(event.target.value)} value={value}/>
      </span>
    </label>);
}
export function ToggleField({ checked, label, onChange, }) {
    return (<label className="ToggleField ToggleField__field-1 flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
      <span className="ToggleField ToggleField__label-1 truncate text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      <input checked={checked} className="ToggleField ToggleField__input-1 h-4 w-4 shrink-0 accent-primary" onChange={(event) => onChange(event.target.checked)} type="checkbox"/>
    </label>);
}
export function Vector3Fields({ labels = ["X", "Y", "Z"], onChange, value, }) {
    return (<div className="Vector3Fields Vector3Fields__grid-1 grid grid-cols-3 gap-1.5">
      {["x", "y", "z"].map((axis, index) => (<NumberField key={axis} label={labels[index]} onChange={(axisValue) => onChange({ ...value, [axis]: axisValue })} value={value[axis]}/>))}
    </div>);
}
export function SegmentedButton({ active, children, onClick, title, }) {
    return (<button className={cn("SegmentedButton SegmentedButton__button-1 h-7 min-w-0 rounded-sm border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground", active && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground")} onClick={onClick} title={title} type="button">
      {children}
    </button>);
}
function formatNumber(value) {
    return Number.isInteger(value) ? value : value.toFixed(2);
}
function round(value) {
    return Number(value.toFixed(2));
}
