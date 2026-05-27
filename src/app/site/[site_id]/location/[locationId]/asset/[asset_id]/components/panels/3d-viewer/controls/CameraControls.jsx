"use client";
import { Camera } from "lucide-react";
import { translateText } from "@/app/layouts/helpers/localization";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";
import { ControlSection, RangeField } from "./control-fields";
const TEXT = {
  cameraLoad: "\uCE74\uBA54\uB77C \uC815\uBCF4 \uBD88\uB7EC\uC624\uAE30",
  cameraRequired:
    "\uCE74\uBA54\uB77C \uB4F1\uB85D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4",
  maxDistance: "\uCD5C\uB300 \uAC70\uB9AC",
  minDistance: "\uCD5C\uC18C \uAC70\uB9AC",
  noCameraInfo:
    "\uBD88\uB7EC\uC62C \uCE74\uBA54\uB77C \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
};
export function CameraControls({ config, onChange }) {
  const { settings: displaySettings } = useDisplaySettings();
  const translate = (value) => translateText(value, displaySettings.language);
  const handleLoadCameraInfo = () => {
    window.alert(translate(TEXT.noCameraInfo));
  };
  return (
    <ControlSection icon={Camera} title={translate("카메라")}>
      <div className="CameraControls CameraControls__dev-panel-1 grid gap-2 rounded-md border border-dashed border-border bg-card px-2 py-2">
        <p className="CameraControls CameraControls__message-1 text-[11px] font-semibold text-muted-foreground">
          {translate(TEXT.cameraRequired)}
        </p>
        <button
          className="CameraControls CameraControls__load-1 h-8 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground transition hover:bg-accent"
          onClick={handleLoadCameraInfo}
          type="button"
        >
          {translate(TEXT.cameraLoad)}
        </button>
      </div>

      <div className="CameraControls CameraControls__limits-1 grid grid-cols-2 gap-1.5">
        <RangeField
          label={translate(TEXT.minDistance)}
          max={120}
          min={1}
          onChange={(minDistance) => onChange({ ...config, minDistance })}
          value={config.minDistance ?? 18}
        />
        <RangeField
          label={translate(TEXT.maxDistance)}
          max={1200}
          min={80}
          onChange={(maxDistance) => onChange({ ...config, maxDistance })}
          step={10}
          value={config.maxDistance ?? 640}
        />
      </div>
    </ControlSection>
  );
}
