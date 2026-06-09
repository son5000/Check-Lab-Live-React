import { createThermalCanvasFromFrame } from "@/lib/thermal-mapping";

export function getThermalFrameImageDataUrl(frame) {
  if (!frame) {
    return "";
  }

  const canvas = createThermalCanvasFromFrame(frame, {
    paletteMaxTemperature: frame.maxTemperature,
    paletteMinTemperature: frame.minTemperature,
  });

  return canvas?.toDataURL("image/png") ?? "";
}
