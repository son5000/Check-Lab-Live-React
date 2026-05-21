"use client";
import { useEffect, useState } from "react";
export function useDashboardTheme() {
    const [themeMode, setThemeMode] = useState("dark");
    const isDarkMode = themeMode === "dark";
    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDarkMode);
        document.documentElement.style.colorScheme = themeMode;
    }, [isDarkMode, themeMode]);
    const handleThemeToggle = () => {
        setThemeMode((mode) => (mode === "dark" ? "light" : "dark"));
    };
    return {
        isDarkMode,
        themeMode,
        onThemeToggle: handleThemeToggle,
    };
}
