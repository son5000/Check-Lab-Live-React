'use client';

import { Gauge, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export function MonitoringSettings() {
  const [settings, setSettings] = useState({
    alarmEnabled: true,
    temperatureThreshold: 80,
    ultrasoundThreshold: 88,
    criticalTemperature: 100,
    criticalUltrasound: 95,
    sensorCheckInterval: 30,
    dataRetentionDays: 90,
  });

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="MonitoringSettings space-y-6">
      <div className="border-b border-border pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Gauge className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">모니터링 설정</h2>
        </div>

        <div className="space-y-6">
          {/* 알람 활성화 */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.alarmEnabled}
                onChange={(e) => handleChange('alarmEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              <span className="text-sm font-medium text-foreground">알람 활성화</span>
            </label>
          </div>

          {/* 온도 임계치 */}
          <div className="space-y-3 rounded-lg border border-yellow-600/30 bg-yellow-600/5 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <label className="text-sm font-medium text-foreground">온도 주의 임계치</label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">주의 (°C)</p>
                <input
                  type="number"
                  value={settings.temperatureThreshold}
                  onChange={(e) => handleChange('temperatureThreshold', parseInt(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">위험 (°C)</p>
                <input
                  type="number"
                  value={settings.criticalTemperature}
                  onChange={(e) => handleChange('criticalTemperature', parseInt(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          {/* 초음파 임계치 */}
          <div className="space-y-3 rounded-lg border border-red-600/30 bg-red-600/5 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <label className="text-sm font-medium text-foreground">초음파 주의 임계치</label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">주의 (dB)</p>
                <input
                  type="number"
                  value={settings.ultrasoundThreshold}
                  onChange={(e) => handleChange('ultrasoundThreshold', parseInt(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">위험 (dB)</p>
                <input
                  type="number"
                  value={settings.criticalUltrasound}
                  onChange={(e) => handleChange('criticalUltrasound', parseInt(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          {/* 센서 확인 간격 */}
          <div>
            <label className="text-sm font-medium text-foreground">센서 확인 간격</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="300"
                value={settings.sensorCheckInterval}
                onChange={(e) => handleChange('sensorCheckInterval', parseInt(e.target.value))}
                className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">초</span>
            </div>
          </div>

          {/* 데이터 보관 기간 */}
          <div>
            <label className="text-sm font-medium text-foreground">데이터 보관 기간</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="30"
                max="365"
                value={settings.dataRetentionDays}
                onChange={(e) => handleChange('dataRetentionDays', parseInt(e.target.value))}
                className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">일</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
