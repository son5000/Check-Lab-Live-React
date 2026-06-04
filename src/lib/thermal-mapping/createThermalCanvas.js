import { jetColorMap, normalizeTemperature } from "./thermalPalette.js";

export function createThermalCanvasFromFrame(frame, options = {}) {
  if (typeof document === "undefined" || !frame) {
    return null;
  }

  const width = normalizeCanvasSize(frame.width);
  const height = normalizeCanvasSize(frame.height);
  const { paletteMinTemperature, paletteMaxTemperature } =
    getThermalPaletteRange(frame, options);

  if (!width || !height || !Array.isArray(frame.temperatureMatrix)) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const imageData = context.createImageData(width, height);
  const pixels = imageData.data;

  for (let y = 0; y < height; y += 1) {
    const row = Array.isArray(frame.temperatureMatrix[y])
      ? frame.temperatureMatrix[y]
      : [];

    for (let x = 0; x < width; x += 1) {
      const value = row[x];
      const normalized = normalizeTemperature(
        value,
        paletteMinTemperature,
        paletteMaxTemperature,
      );
      const color = jetColorMap(normalized);
      const pixelIndex = (y * width + x) * 4;

      pixels[pixelIndex] = color.r;
      pixels[pixelIndex + 1] = color.g;
      pixels[pixelIndex + 2] = color.b;
      pixels[pixelIndex + 3] = color.a;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function normalizeCanvasSize(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

function getThermalPaletteRange(frame, options) {
  const paletteMinTemperature = Number.isFinite(
    options?.paletteMinTemperature,
  )
    ? options.paletteMinTemperature
    : frame.minTemperature;
  const paletteMaxTemperature = Number.isFinite(
    options?.paletteMaxTemperature,
  )
    ? options.paletteMaxTemperature
    : frame.maxTemperature;

  return {
    paletteMinTemperature,
    paletteMaxTemperature,
  };
}
