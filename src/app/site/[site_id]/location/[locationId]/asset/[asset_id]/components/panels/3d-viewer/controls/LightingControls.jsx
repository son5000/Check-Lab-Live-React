"use client";
import { Sun } from "lucide-react";
import { ColorField, ControlSection, RangeField, ToggleField, Vector3Fields, } from "./control-fields";
const DEFAULT_POINT_LIGHT = {
    color: "#67e8f9",
    distance: 420,
    enabled: true,
    intensity: 0.65,
    position: { x: -115, y: 86, z: -90 },
};
const DEFAULT_HEMISPHERE_LIGHT = {
    color: "#dbeafe",
    groundColor: "#1e293b",
    intensity: 0.35,
};
export function LightingControls({ config, onChange, }) {
    const pointLight = config.pointLight ?? DEFAULT_POINT_LIGHT;
    const hemisphereLight = config.hemisphereLight ?? DEFAULT_HEMISPHERE_LIGHT;
    return (<ControlSection icon={Sun} title="조명">
      <div className="LightingControls LightingControls__ambient-1 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-1.5">
        <RangeField label="환경광" max={2} min={0} onChange={(intensity) => onChange({
            ...config,
            ambientLight: { ...config.ambientLight, intensity },
        })} step={0.05} value={config.ambientLight.intensity}/>
        <ColorField label="색" onChange={(color) => onChange({
            ...config,
            ambientLight: { ...config.ambientLight, color },
        })} value={config.ambientLight.color}/>
      </div>

      <div className="LightingControls LightingControls__directional-1 grid gap-1">
        <span className="LightingControls LightingControls__label-1 text-[10px] font-semibold text-muted-foreground">
          방향광
        </span>
        <RangeField label="강도" max={4} min={0} onChange={(intensity) => onChange({
            ...config,
            directionalLight: { ...config.directionalLight, intensity },
        })} step={0.05} value={config.directionalLight.intensity}/>
        <ColorField label="색상" onChange={(color) => onChange({
            ...config,
            directionalLight: { ...config.directionalLight, color },
        })} value={config.directionalLight.color}/>
        <Vector3Fields onChange={(position) => onChange({
            ...config,
            directionalLight: { ...config.directionalLight, position },
        })} value={config.directionalLight.position}/>
      </div>

      <ToggleField checked={Boolean(config.hemisphereLight)} label="반구광" onChange={(enabled) => onChange({
            ...config,
            hemisphereLight: enabled ? hemisphereLight : undefined,
        })}/>

      {config.hemisphereLight ? (<RangeField label="반구광 강도" max={2} min={0} onChange={(intensity) => onChange({
                ...config,
                hemisphereLight: { ...hemisphereLight, intensity },
            })} step={0.05} value={hemisphereLight.intensity}/>) : null}

      <ToggleField checked={pointLight.enabled !== false} label="포인트 라이트" onChange={(enabled) => onChange({
            ...config,
            pointLight: { ...pointLight, enabled },
        })}/>

      {pointLight.enabled !== false ? (<div className="LightingControls LightingControls__point-1 grid gap-1">
          <RangeField label="포인트 강도" max={3} min={0} onChange={(intensity) => onChange({
                ...config,
                pointLight: { ...pointLight, intensity },
            })} step={0.05} value={pointLight.intensity}/>
          <RangeField label="도달 거리" max={900} min={40} onChange={(distance) => onChange({
                ...config,
                pointLight: { ...pointLight, distance },
            })} step={10} value={pointLight.distance}/>
          <ColorField label="포인트 색상" onChange={(color) => onChange({
                ...config,
                pointLight: { ...pointLight, color },
            })} value={pointLight.color}/>
          <Vector3Fields onChange={(position) => onChange({
                ...config,
                pointLight: { ...pointLight, position },
            })} value={pointLight.position}/>
        </div>) : null}
    </ControlSection>);
}
