"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";

const THEME_OPTIONS = [
  {
    description: "밝은 배경과 높은 대비로 표시합니다.",
    icon: Sun,
    label: "라이트",
    value: "light",
  },
  {
    description: "어두운 배경으로 대시보드를 표시합니다.",
    icon: Moon,
    label: "다크",
    value: "dark",
  },
];

const LANGUAGE_OPTIONS = [
  { label: "한국어", value: "ko" },
  { label: "English", value: "en" },
];

export function DisplaySettings() {
  const { settings, updateSettings } = useDisplaySettings();

  return (
    <div className="DisplaySettings space-y-6">
      <section className="border-b border-border pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Monitor className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">표시 설정</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">
              테마 설정
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = settings.theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSettings({ theme: option.value })}
                    className={`flex items-start gap-3 rounded-md border-2 p-3 text-left transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-600/10 text-foreground"
                        : "border-border bg-background/50 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <span className="grid gap-1">
                      <span className="text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="text-xs">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="display-language"
            >
              언어
            </label>
            <select
              id="display-language"
              value={settings.language}
              onChange={(event) =>
                updateSettings({ language: event.target.value })
              }
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="display-time-format"
            >
              시간 형식
            </label>
            <select
              id="display-time-format"
              value={settings.timeFormat}
              onChange={(event) =>
                updateSettings({ timeFormat: event.target.value })
              }
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="24h">24시간</option>
              <option value="12h">12시간</option>
            </select>
          </div>

          {/* <div>
            <label className="text-sm font-medium text-foreground" htmlFor="display-temperature-unit">
              온도 단위
            </label>
            <select
              id="display-temperature-unit"
              value={settings.temperatureUnit}
              onChange={(event) => updateSettings({ temperatureUnit: event.target.value })}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="celsius">섭씨 (°C)</option>
              <option value="fahrenheit">화씨 (°F)</option>
            </select>
          </div> */}
        </div>
      </section>
    </div>
  );
}
