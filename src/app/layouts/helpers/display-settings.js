export const DISPLAY_SETTINGS_STORAGE_KEY = "checklab-display-settings";
export const DISPLAY_SETTINGS_CHANGE_EVENT = "checklab:display-settings-change";

export const DEFAULT_DISPLAY_SETTINGS = {
  language: "ko",
  temperatureUnit: "celsius",
  theme: "dark",
  timeFormat: "24h",
};

const DISPLAY_LOCALES = {
  en: "en-US",
  ko: "ko-KR",
};

const DISPLAY_HOUR_CYCLES = {
  "12h": "h12",
  "24h": "h23",
};

const SUPPORTED_LANGUAGES = new Set(Object.keys(DISPLAY_LOCALES));
const SUPPORTED_THEMES = new Set(["light", "dark"]);
const SUPPORTED_TIME_FORMATS = new Set(Object.keys(DISPLAY_HOUR_CYCLES));
const SUPPORTED_TEMPERATURE_UNITS = new Set(["celsius", "fahrenheit"]);

export function sanitizeDisplaySettings(settings) {
  const candidate = settings && typeof settings === "object" ? settings : {};
  return {
    language: SUPPORTED_LANGUAGES.has(candidate.language)
      ? candidate.language
      : DEFAULT_DISPLAY_SETTINGS.language,
    temperatureUnit: SUPPORTED_TEMPERATURE_UNITS.has(candidate.temperatureUnit)
      ? candidate.temperatureUnit
      : DEFAULT_DISPLAY_SETTINGS.temperatureUnit,
    theme: SUPPORTED_THEMES.has(candidate.theme)
      ? candidate.theme
      : DEFAULT_DISPLAY_SETTINGS.theme,
    timeFormat: SUPPORTED_TIME_FORMATS.has(candidate.timeFormat)
      ? candidate.timeFormat
      : DEFAULT_DISPLAY_SETTINGS.timeFormat,
  };
}

export function parseDisplaySettings(value) {
  if (!value) {
    return DEFAULT_DISPLAY_SETTINGS;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Failed to load display settings:", error);
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

export function readBrowserDisplaySettings() {
  if (typeof window === "undefined") {
    return DEFAULT_DISPLAY_SETTINGS;
  }

  return sanitizeDisplaySettings(
    parseDisplaySettings(
      window.localStorage.getItem(DISPLAY_SETTINGS_STORAGE_KEY),
    ),
  );
}

export function writeBrowserDisplaySettings(settings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      DISPLAY_SETTINGS_STORAGE_KEY,
      JSON.stringify(sanitizeDisplaySettings(settings)),
    );
  } catch (error) {
    console.warn("Failed to save display settings:", error);
  }
}

export function applyDisplaySettings(settings) {
  if (typeof document === "undefined") {
    return;
  }

  const nextSettings = sanitizeDisplaySettings(settings);
  const isDarkTheme = nextSettings.theme === "dark";
  document.documentElement.classList.toggle("dark", isDarkTheme);
  document.documentElement.style.colorScheme = nextSettings.theme;
  document.documentElement.lang = nextSettings.language;
}

export function getDisplayLocale(settings) {
  const nextSettings = sanitizeDisplaySettings(settings);
  return DISPLAY_LOCALES[nextSettings.language] ?? DISPLAY_LOCALES.ko;
}

export function getDisplayHourCycle(settings) {
  const nextSettings = sanitizeDisplaySettings(settings);
  return DISPLAY_HOUR_CYCLES[nextSettings.timeFormat] ?? DISPLAY_HOUR_CYCLES["24h"];
}

export function getDisplaySettingsFromSearchParams(searchParams) {
  return sanitizeDisplaySettings({
    language: searchParams.get("language"),
    timeFormat: searchParams.get("timeFormat"),
  });
}

export function createDisplaySettingsSearchParams(settings) {
  const nextSettings = sanitizeDisplaySettings(settings);
  return new URLSearchParams({
    language: nextSettings.language,
    timeFormat: nextSettings.timeFormat,
  });
}
