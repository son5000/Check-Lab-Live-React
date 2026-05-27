"use client";

import { Bell, Volume2, VolumeX } from "lucide-react";

const NOTIFICATION_POSITION_OPTIONS = [
  {
    description: "화면 중앙에 크게 표시합니다.",
    label: "가운데",
    value: "center",
  },
  {
    description: "화면 상단 중앙에 표시합니다.",
    label: "상단",
    value: "top",
  },
  {
    description: "화면 우측 하단에 표시합니다.",
    label: "우측하단",
    value: "bottom-right",
  },
  {
    description: "우측 하단에 작은 카드로 표시합니다.",
    label: "우측하단 작게",
    value: "bottom-right-small",
  },
];

export function NotificationSettingsForm({ settings, onSettingsChange }) {
  const isEnabled = settings.enabled;

  return (
    <div className="NotificationSettingsForm NotificationSettingsForm__container-1 space-y-6">
      <section className="NotificationSettingsForm NotificationSettingsForm__section-1 border-b border-border pb-6">
        <div className="NotificationSettingsForm NotificationSettingsForm__header-1 mb-4 flex items-center gap-3">
          <Bell className="NotificationSettingsForm NotificationSettingsForm__icon-1 h-5 w-5 text-foreground" />
          <h2 className="NotificationSettingsForm NotificationSettingsForm__title-1 text-lg font-semibold text-foreground">
            알림 설정
          </h2>
        </div>

        <div className="NotificationSettingsForm NotificationSettingsForm__toggle-section-1 rounded-md border border-border bg-background/50 p-3">
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={() => onSettingsChange({ enabled: !isEnabled })}
            className="NotificationSettingsForm NotificationSettingsForm__switch-1 flex w-full items-center gap-3 text-left"
          >
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                isEnabled
                  ? "border-blue-600 bg-blue-600"
                  : "border-border bg-muted"
              }`}
            >
              <span
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition ${
                  isEnabled ? "left-6" : "left-1"
                }`}
              />
            </span>
            <span className="NotificationSettingsForm NotificationSettingsForm__label-text-1 flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                알림 {isEnabled ? "활성화" : "비활성화"}
              </span>
              <span className="text-xs text-muted-foreground">
                {isEnabled
                  ? "전역 경고 알림을 표시합니다."
                  : "전역 경고 알림을 숨깁니다."}
              </span>
            </span>
            {isEnabled ? (
              <Volume2 className="NotificationSettingsForm NotificationSettingsForm__status-icon-1 ml-auto h-4 w-4 text-green-600" />
            ) : (
              <VolumeX className="NotificationSettingsForm NotificationSettingsForm__status-icon-2 ml-auto h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </section>

      <section className="NotificationSettingsForm NotificationSettingsForm__position-section-1 space-y-3">
        <h3 className="NotificationSettingsForm NotificationSettingsForm__position-title-1 text-sm font-semibold text-foreground">
          알림 표시 방법
        </h3>
        <div className="NotificationSettingsForm NotificationSettingsForm__radio-group-1 grid gap-2 sm:grid-cols-2">
          {NOTIFICATION_POSITION_OPTIONS.map((option) => {
            const isSelected = settings.position === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSettingsChange({ position: option.value })}
                className={`rounded-md border p-3 text-left transition ${
                  isSelected
                    ? "border-blue-600 bg-blue-600/10 text-foreground"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                }`}
                aria-pressed={isSelected}
              >
                <span className="block text-sm font-semibold">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
