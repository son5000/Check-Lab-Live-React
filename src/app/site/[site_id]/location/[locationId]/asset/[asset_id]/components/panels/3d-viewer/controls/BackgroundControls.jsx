"use client";
import { Grid3X3 } from "lucide-react";
import { ColorField, ControlSection, RangeField, ToggleField, } from "./control-fields";
export function BackgroundControls({ config, onChange, }) {
    return (<ControlSection icon={Grid3X3} title="월드">
      <ColorField label="배경색" onChange={(color) => onChange({ ...config, color })} value={config.color}/>

      <div className="BackgroundControls BackgroundControls__toggles-1 grid grid-cols-3 gap-1.5">
        <ToggleField checked={config.showGrid} label="그리드" onChange={(showGrid) => onChange({ ...config, showGrid })}/>
        <ToggleField checked={config.showAxes ?? true} label="축" onChange={(showAxes) => onChange({ ...config, showAxes })}/>
        <ToggleField checked={config.showGround ?? false} label="바닥" onChange={(showGround) => onChange({ ...config, showGround })}/>
      </div>

      {config.showGrid ? (<div className="BackgroundControls BackgroundControls__grid-1 grid gap-1">
          <RangeField label="그리드 크기" max={420} min={40} onChange={(gridSize) => onChange({ ...config, gridSize })} step={10} value={config.gridSize}/>
          <RangeField label="분할" max={80} min={4} onChange={(gridDivisions) => onChange({ ...config, gridDivisions })} step={2} value={config.gridDivisions ?? 24}/>
          <ColorField label="그리드색" onChange={(gridColor) => onChange({ ...config, gridColor })} value={config.gridColor ?? "#475569"}/>
        </div>) : null}

      {config.showGround ? (<ColorField label="바닥색" onChange={(groundColor) => onChange({ ...config, groundColor })} value={config.groundColor ?? "#0f172a"}/>) : null}
    </ControlSection>);
}
