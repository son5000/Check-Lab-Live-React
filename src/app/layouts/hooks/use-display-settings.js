"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_CHANGE_EVENT,
  DISPLAY_SETTINGS_STORAGE_KEY,
  parseDisplaySettings,
  readBrowserDisplaySettings,
  sanitizeDisplaySettings,
  writeBrowserDisplaySettings,
} from "@/app/layouts/helpers/display-settings";

export { DEFAULT_DISPLAY_SETTINGS, DISPLAY_SETTINGS_STORAGE_KEY };

export function useDisplaySettings() {
  const [settings, setSettingsState] = useState(DEFAULT_DISPLAY_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const nextSettings = readBrowserDisplaySettings();
    setSettingsState(nextSettings);
    applyDisplaySettings(nextSettings);
    setIsLoaded(true);

    const handleStorage = (event) => {
      if (event.key !== DISPLAY_SETTINGS_STORAGE_KEY) {
        return;
      }
      const syncedSettings = sanitizeDisplaySettings(
        parseDisplaySettings(event.newValue),
      );
      setSettingsState(syncedSettings);
      applyDisplaySettings(syncedSettings);
    };

    const handleSettingsChange = (event) => {
      const syncedSettings = sanitizeDisplaySettings(event.detail);
      setSettingsState(syncedSettings);
      applyDisplaySettings(syncedSettings);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(DISPLAY_SETTINGS_CHANGE_EVENT, handleSettingsChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DISPLAY_SETTINGS_CHANGE_EVENT, handleSettingsChange);
    };
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettingsState((currentSettings) => {
      const nextSettings = sanitizeDisplaySettings({
        ...currentSettings,
        ...patch,
      });
      writeBrowserDisplaySettings(nextSettings);
      applyDisplaySettings(nextSettings);
      window.dispatchEvent(
        new CustomEvent(DISPLAY_SETTINGS_CHANGE_EVENT, {
          detail: nextSettings,
        }),
      );
      return nextSettings;
    });
  }, []);

  return { isLoaded, settings, updateSettings };
}
