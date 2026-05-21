"use client";
import { Upload } from "lucide-react";
import { getModelSourceName, normalizeModelTextures, withUpdatedTextureMeta, withUpdatedTextureSlot, } from "../utils/modelFileUtils";
import { ControlSection, RangeField } from "./control-fields";
const TEXT = {
    mapPurpose: "\uB9F5 \uC6A9\uB3C4",
};
const TEXTURE_ROLES = [
    { label: "베이직", value: "baseColor" },
    { label: "발광", value: "emissive" },
    { label: "투명", value: "alpha" },
    { label: "거칠기", value: "roughness" },
];
export function ModelFileControls({ modelFile, onChange, }) {
    const texture = normalizeModelTextures(modelFile)[0];
    return (<ControlSection icon={Upload} title="PLY / PNG">
      <FilePicker accept=".ply" label="PLY 모델" name={getModelSourceName(modelFile.plyUrl)} onFile={(file) => onChange({
            ...modelFile,
            label: file.name,
            plyUrl: file,
        })}/>

      <RangeField label="자동 맞춤 크기" max={260} min={20} onChange={(normalizeSize) => onChange({ ...modelFile, normalizeSize })} step={10} value={modelFile.normalizeSize ?? 120}/>

      <TextureSlotControls label="PNG 텍스처" modelFile={modelFile} onChange={onChange} texture={texture}/>
    </ControlSection>);
}
function TextureSlotControls({ label, modelFile, onChange, texture, }) {
    const slotIndex = 0;
    return (<div className="TextureSlotControls TextureSlotControls__container-1 grid gap-1.5 rounded-md border border-border/70 bg-card p-2">
      <FilePicker accept="image/png,.png" label={label} name={getModelSourceName(texture?.source)} onFile={(file) => onChange(withUpdatedTextureSlot(modelFile, slotIndex, file))}/>

      <label className="TextureSlotControls TextureSlotControls__select-field-1 grid min-w-0 gap-1">
        <span className="TextureSlotControls TextureSlotControls__label-1 text-[10px] font-semibold text-muted-foreground">
          {TEXT.mapPurpose}
        </span>
        <select className="TextureSlotControls TextureSlotControls__select-1 h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs font-semibold outline-none" onChange={(event) => onChange(withUpdatedTextureMeta(modelFile, slotIndex, {
            role: event.target.value,
        }))} value={texture?.role ?? "baseColor"}>
          {TEXTURE_ROLES.map((role) => (<option key={role.value} value={role.value}>
              {role.label}
            </option>))}
        </select>
      </label>

      <RangeField label="텍스처 강도" max={1.5} min={0} onChange={(strength) => onChange(withUpdatedTextureMeta(modelFile, slotIndex, { strength }))} step={0.05} value={texture?.strength ?? 1}/>
    </div>);
}
function FilePicker({ accept, label, name, onFile, }) {
    return (<label className="FilePicker FilePicker__field-1 grid min-w-0 cursor-pointer gap-1">
      <span className="FilePicker FilePicker__label-1 text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="FilePicker FilePicker__button-1 flex h-8 min-w-0 items-center gap-2 rounded-md border border-dashed border-border bg-background px-2 text-xs font-semibold text-foreground transition hover:border-primary/60">
        <Upload className="FilePicker FilePicker__icon-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/>
        <span className="FilePicker FilePicker__name-1 min-w-0 truncate">
          {name}
        </span>
      </span>
      <input accept={accept} className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
                onFile(file);
            }
            event.target.value = "";
        }} type="file"/>
    </label>);
}
