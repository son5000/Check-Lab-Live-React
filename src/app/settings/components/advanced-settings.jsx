'use client';

import { Settings, Database, HardDrive, Zap } from 'lucide-react';
import { useState } from 'react';
import { translateText } from '@/app/layouts/helpers/localization';
import { useDisplaySettings } from '@/app/layouts/hooks/use-display-settings';

export function AdvancedSettings() {
  const { settings: displaySettings } = useDisplaySettings();
  const [settings, setSettings] = useState({
    logLevel: 'info',
    enableDebugMode: false,
    enableCaching: true,
    cacheExpiration: 3600,
    maxDataPoints: 1000,
    enableApiLogging: false,
    performanceMonitoring: true,
    analyticsEnabled: true,
  });

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleClearCache = () => {
    alert(translateText('캐시가 삭제되었습니다', displaySettings.language));
  };

  const handleExportData = () => {
    alert(translateText('데이터 내보내기가 시작되었습니다', displaySettings.language));
  };

  return (
    <div className="AdvancedSettings space-y-6">
      <div className="border-b border-border pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Settings className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">고급 설정</h2>
        </div>

        <div className="space-y-6">
          {/* 로그 레벨 */}
          <div>
            <label className="text-sm font-medium text-foreground">로그 레벨</label>
            <select
              value={settings.logLevel}
              onChange={(e) => handleChange('logLevel', e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="error">오류 (Error)</option>
              <option value="warn">경고 (Warn)</option>
              <option value="info">정보 (Info)</option>
              <option value="debug">디버그 (Debug)</option>
              <option value="trace">상세 (Trace)</option>
            </select>
          </div>

          {/* 디버그 모드 */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enableDebugMode}
                onChange={(e) => handleChange('enableDebugMode', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              <span className="text-sm font-medium text-foreground">디버그 모드</span>
            </label>
          </div>

          {/* 캐시 설정 */}
          <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <label className="text-sm font-medium text-foreground">캐싱 활성화</label>
              </div>
              <input
                type="checkbox"
                checked={settings.enableCaching}
                onChange={(e) => handleChange('enableCaching', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
            </div>

            {settings.enableCaching && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">캐시 만료 시간 (초)</label>
                  <input
                    type="number"
                    min="60"
                    max="86400"
                    value={settings.cacheExpiration}
                    onChange={(e) => handleChange('cacheExpiration', parseInt(e.target.value))}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <button
                  onClick={handleClearCache}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  캐시 삭제
                </button>
              </>
            )}
          </div>

          {/* 데이터 설정 */}
          <div>
            <label className="text-sm font-medium text-foreground">최대 데이터 포인트</label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={settings.maxDataPoints}
              onChange={(e) => handleChange('maxDataPoints', parseInt(e.target.value))}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* API 로깅 */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enableApiLogging}
                onChange={(e) => handleChange('enableApiLogging', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              <span className="text-sm font-medium text-foreground">API 요청 로깅</span>
            </label>
          </div>

          {/* 성능 모니터링 */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.performanceMonitoring}
                onChange={(e) => handleChange('performanceMonitoring', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground">성능 모니터링</span>
                <Zap className="h-4 w-4 text-yellow-600" />
              </div>
            </label>
          </div>

          {/* 분석 */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.analyticsEnabled}
                onChange={(e) => handleChange('analyticsEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              <span className="text-sm font-medium text-foreground">분석 활성화</span>
            </label>
          </div>

          {/* 저장소 정보 */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-foreground" />
              <h3 className="text-sm font-medium text-foreground">저장소</h3>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">사용 중</p>
                <p className="text-sm font-medium text-foreground">2.3 GB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">가능</p>
                <p className="text-sm font-medium text-foreground">7.7 GB</p>
              </div>
            </div>
            <button
              onClick={handleExportData}
              className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              데이터 내보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
