"use client";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackgroundControls } from "./BackgroundControls";
import { ControlSection, RangeField, } from "./control-fields";
import { LightingControls } from "./LightingControls";
import { ModelControls } from "./ModelControls";
import { ModelFileControls } from "./ModelFileControls";
import { CameraPositionControls } from "./CameraPositionControls";
const TEXT = {
    animation: "\uC560\uB2C8\uBA54\uC774\uC158",
    rotationSpeed: "\uD68C\uC804 \uC18D\uB3C4",
};
export function Viewer3DOptionBar({ afterCameraControls, afterWorldControls, beforeControls, beforeWorldControls, children, className, config, modelFile, onConfigChange, onModelFileChange, showCameraControls = true, showWorldControls = true, }) {
    const controls = config.controls ?? {};
    return (<aside className={cn("Viewer3DOptionBar Viewer3DOptionBar__aside-1 min-h-0 min-w-0 overflow-y-auto border-t border-border bg-card/95 p-2 md:border-l md:border-t-0", className)}>
      {children ?? (<div className="Viewer3DOptionBar Viewer3DOptionBar__stack-1 grid gap-2">
        {showWorldControls && controls.enableFileInputs !== false ? (<ModelFileControls modelFile={modelFile} onChange={onModelFileChange}/>) : null}
        {showCameraControls ? beforeControls : null}

        {showCameraControls ? (<CameraPositionControls config={config.cameraVisualization} onChange={(cameraVisualization) => onConfigChange({ ...config, cameraVisualization })}/>) : null}
        {showCameraControls ? afterCameraControls : null}

        {showWorldControls ? beforeWorldControls : null}
        {showWorldControls ? (<>
        <ControlSection icon={SlidersHorizontal} title={TEXT.animation}>
          <RangeField label={TEXT.rotationSpeed} max={4} min={0.1} onChange={(autoRotateSpeed) => onConfigChange({
            ...config,
            controls: { ...controls, autoRotateSpeed },
        })} step={0.1} value={controls.autoRotateSpeed ?? 0.7}/>
        </ControlSection>

        <ModelControls config={config.model} onChange={(model) => onConfigChange({ ...config, model })}/>
        <LightingControls config={config.lighting} onChange={(lighting) => onConfigChange({ ...config, lighting })}/>
        <BackgroundControls config={config.background} onChange={(background) => onConfigChange({ ...config, background })}/>
        </>) : null}
        {showWorldControls ? afterWorldControls : null}
      </div>)}
    </aside>);
}
