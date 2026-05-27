"use client";
import { useDisplaySettings } from "./use-display-settings";
export function useDashboardTheme() {
    const { settings, updateSettings } = useDisplaySettings();
    const themeMode = settings.theme;
    const isDarkMode = themeMode === "dark";
    const handleThemeToggle = () => {
        updateSettings({ theme: isDarkMode ? "light" : "dark" });
    };
    return {
        isDarkMode,
        themeMode,
        onThemeToggle: handleThemeToggle,
    };
}
