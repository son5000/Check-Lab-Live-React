"use client";
import { Box } from "lucide-react";
import { ColorField, ControlSection, RangeField, ToggleField, Vector3Fields, } from "./control-fields";
export function ModelControls({ config, onChange, }) {
    return (<ControlSection icon={Box} title="오브젝트">
      <ColorField label="색상 보정" onChange={(color) => onChange({ ...config, color })} value={config.color}/>

      <RangeField label="텍스처 비율" max={1} min={0} onChange={(textureBlend) => onChange({ ...config, textureBlend })} step={0.05} value={config.textureBlend ?? 1}/>

      <RangeField label="불투명도" max={1} min={0.1} onChange={(opacity) => onChange({ ...config, opacity })} step={0.05} value={config.opacity}/>

      <RangeField label="스케일" max={4} min={0.05} onChange={(scale) => onChange({ ...config, scale })} step={0.05} value={config.scale}/>

      <div className="ModelControls ModelControls__surface-1 grid grid-cols-2 gap-1.5">
        <RangeField label="거칠기" max={1} min={0} onChange={(roughness) => onChange({ ...config, roughness })} step={0.05} value={config.roughness ?? 0.72}/>
        <RangeField label="금속성" max={1} min={0} onChange={(metalness) => onChange({ ...config, metalness })} step={0.05} value={config.metalness ?? 0.1}/>
      </div>

      <div className="ModelControls ModelControls__rotation-1 grid gap-1">
        <span className="ModelControls ModelControls__label-1 text-[10px] font-semibold text-muted-foreground">
          회전
        </span>
        <Vector3Fields labels={["Pitch", "Yaw", "Roll"]} onChange={(rotation) => onChange({ ...config, rotation })} value={config.rotation}/>
      </div>

      <div className="ModelControls ModelControls__toggles-1 grid grid-cols-2 gap-1.5">
        <ToggleField checked={config.wireframe ?? false} label="와이어" onChange={(wireframe) => onChange({ ...config, wireframe })}/>
        <ToggleField checked={config.castShadow ?? false} label="그림자" onChange={(castShadow) => onChange({ ...config, castShadow, receiveShadow: castShadow })}/>
      </div>
    </ControlSection>);
}
