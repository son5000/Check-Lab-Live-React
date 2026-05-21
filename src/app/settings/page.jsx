'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useNotificationSettings } from '../layouts/hooks/use-notification-settings';
import { NotificationSettingsForm } from './components/notification-settings-form';
export default function SettingsPage() {
    const { settings, updateSettings, isLoaded } = useNotificationSettings();
    if (!isLoaded) {
        return (<main className="SettingsPage SettingsPage__container-1 min-h-screen bg-background p-4 md:p-6">
        <div className="SettingsPage SettingsPage__loading-1 flex items-center justify-center py-12">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </main>);
    }
    return (<main className="SettingsPage SettingsPage__container-1 min-h-screen bg-background">
      <div className="SettingsPage SettingsPage__wrapper-1 mx-auto max-w-2xl">
        <header className="SettingsPage SettingsPage__header-1 sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="SettingsPage SettingsPage__header-content-1 flex items-center gap-4 p-4 md:p-6">
            <Link href="/" className="SettingsPage SettingsPage__back-button-1 inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label="뒤로가기">
              <ChevronLeft className="SettingsPage SettingsPage__back-icon-1 h-4 w-4"/>
            </Link>
            <div className="SettingsPage SettingsPage__title-section-1">
              <h1 className="SettingsPage SettingsPage__title-1 text-xl font-bold text-foreground">
                설정
              </h1>
              <p className="SettingsPage SettingsPage__subtitle-1 text-xs text-muted-foreground">
                앱 설정을 관리하세요
              </p>
            </div>
          </div>
        </header>

        <div className="SettingsPage SettingsPage__content-1 p-4 md:p-6">
          <NotificationSettingsForm settings={settings} onSettingsChange={updateSettings}/>
        </div>
      </div>
    </main>);
}
