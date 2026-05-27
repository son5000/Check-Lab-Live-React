"use client";

import Link from "next/link";
import { Bell, ChevronLeft, Info, Monitor, Shield, User } from "lucide-react";
import { useState } from "react";
import { useNotificationSettings } from "../layouts/hooks/use-notification-settings";
import { NotificationSettingsForm } from "./components/notification-settings-form";
import { UserProfileSettings } from "./components/user-profile-settings";
import { DisplaySettings } from "./components/display-settings";
import { SecuritySettings } from "./components/security-settings";
import { SystemInfo } from "./components/system-info";

const SETTINGS_TABS = [
  { id: "profile", label: "프로필", icon: User },
  { id: "display", label: "표시 설정", icon: Monitor },
  { id: "notifications", label: "알림 설정", icon: Bell },
  { id: "security", label: "보안", icon: Shield },
  { id: "system", label: "시스템", icon: Info },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { settings, updateSettings, isLoaded } = useNotificationSettings();

  if (!isLoaded) {
    return (
      <main className="SettingsPage SettingsPage__container-1 min-h-screen bg-background p-4 md:p-6">
        <div className="SettingsPage SettingsPage__loading-1 flex items-center justify-center py-12">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </main>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <UserProfileSettings />;
      case "display":
        return <DisplaySettings />;
      case "notifications":
        return (
          <NotificationSettingsForm
            settings={settings}
            onSettingsChange={updateSettings}
          />
        );
      case "security":
        return <SecuritySettings />;
      case "system":
        return <SystemInfo />;
      default:
        return <UserProfileSettings />;
    }
  };

  return (
    <main className="SettingsPage SettingsPage__container-1 min-h-screen bg-background">
      <div className="SettingsPage SettingsPage__wrapper-1 mx-auto max-w-5xl">
        <header className="SettingsPage SettingsPage__header-1 sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="SettingsPage SettingsPage__header-content-1 flex items-center gap-4 p-4 md:p-6">
            <Link
              href="/"
              className="SettingsPage SettingsPage__back-button-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="돌아가기"
            >
              <ChevronLeft className="SettingsPage SettingsPage__back-icon-1 h-4 w-4" />
            </Link>
            <div className="SettingsPage SettingsPage__title-section-1">
              <h1 className="SettingsPage SettingsPage__title-1 text-xl font-bold text-foreground">
                설정
              </h1>
              <p className="SettingsPage SettingsPage__subtitle-1 text-xs text-muted-foreground">
                계정, 표시, 알림 설정을 관리합니다
              </p>
            </div>
          </div>
        </header>

        <div className="SettingsPage SettingsPage__main-content-1 flex flex-col gap-6 p-4 md:flex-row md:p-6">
          <aside className="SettingsPage SettingsPage__sidebar-1 hidden w-48 flex-shrink-0 md:block">
            <nav className="SettingsPage SettingsPage__nav-1 sticky top-24 space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`SettingsPage SettingsPage__nav-button-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "border border-blue-600/30 bg-blue-600/10 text-blue-600"
                        : "text-muted-foreground hover:bg-accent/50"
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="SettingsPage SettingsPage__mobile-tabs-1 mb-4 flex w-full gap-2 overflow-x-auto pb-2 md:hidden">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`SettingsPage SettingsPage__mobile-tab-1 flex-shrink-0 rounded-md px-3 py-2 text-xs font-medium transition ${
                  activeTab === tab.id
                    ? "border border-blue-600/30 bg-blue-600/10 text-blue-600"
                    : "border border-border bg-background/50 text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="SettingsPage SettingsPage__content-1 min-w-0 flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </main>
  );
}
