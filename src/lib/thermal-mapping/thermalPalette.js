export function normalizeTemperature(value, minTemperature, maxTemperature) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (
    !Number.isFinite(minTemperature) ||
    !Number.isFinite(maxTemperature) ||
    maxTemperature === minTemperature
  ) {
    return 0.5;
  }

  const normalized =
    (value - minTemperature) / (maxTemperature - minTemperature);

  return clamp01(normalized);
}

export function jetColorMap(t) {
  const clamped = clamp01(Number.isFinite(t) ? t : 0);
  const r = Math.round(
    255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * clamped - 3))),
  );
  const g = Math.round(
    255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * clamped - 2))),
  );
  const b = Math.round(
    255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * clamped - 1))),
  );

  return { r, g, b, a: 255 };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
