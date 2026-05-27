'use client';

import { FileText, Mail } from 'lucide-react';
import { useState } from 'react';

export function ReportSettings() {
  const [settings, setSettings] = useState({
    autoGenerateReport: false,
    reportFrequency: 'weekly',
    includeCharts: true,
    includeAnalysis: true,
    autoEmailReport: false,
    reportRecipients: 'admin@example.com',
    reportFormat: 'pdf',
    reportTimeZone: 'Asia/Seoul',
  });

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="ReportSettings space-y-6">
      <div className="border-b border-border pb-6">
        <div className="mb-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">보고서 설정</h2>
        </div>

        <div className="space-y-6">
          {/* 자동 보고서 생성 */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoGenerateReport}
                onChange={(e) => handleChange('autoGenerateReport', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              <span className="text-sm font-medium text-foreground">자동 보고서 생성</span>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              설정된 주기에 따라 설비 보고서를 자동으로 생성합니다
            </p>
          </div>

          {settings.autoGenerateReport && (
            <>
              {/* 생성 주기 */}
              <div>
                <label className="text-sm font-medium text-foreground">생성 주기</label>
                <select
                  value={settings.reportFrequency}
                  onChange={(e) => handleChange('reportFrequency', e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                  <option value="quarterly">분기별</option>
                </select>
              </div>

              {/* 보고서 내용 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">포함 항목</p>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.includeCharts}
                    onChange={(e) => handleChange('includeCharts', e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  <span className="text-sm text-foreground">차트 및 그래프</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.includeAnalysis}
                    onChange={(e) => handleChange('includeAnalysis', e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  <span className="text-sm text-foreground">분석 및 의견</span>
                </label>
              </div>

              {/* 보고서 형식 */}
              <div>
                <label className="text-sm font-medium text-foreground">보고서 형식</label>
                <select
                  value={settings.reportFormat}
                  onChange={(e) => handleChange('reportFormat', e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="html">HTML</option>
                </select>
              </div>
            </>
          )}

          {/* 이메일 발송 */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoEmailReport}
                onChange={(e) => handleChange('autoEmailReport', e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background"
              />
              <span className="text-sm font-medium text-foreground">보고서 이메일 자동 발송</span>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              생성된 보고서를 자동으로 이메일로 발송합니다
            </p>
          </div>

          {settings.autoEmailReport && (
            <>
              {/* 이메일 수신자 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4" />
                  수신자 이메일
                </label>
                <textarea
                  value={settings.reportRecipients}
                  onChange={(e) => handleChange('reportRecipients', e.target.value)}
                  placeholder="여러 이메일은 쉼표로 구분하세요&#10;예: admin@example.com, manager@example.com"
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  rows="3"
                />
              </div>

              {/* 시간대 */}
              <div>
                <label className="text-sm font-medium text-foreground">시간대</label>
                <select
                  value={settings.reportTimeZone}
                  onChange={(e) => handleChange('reportTimeZone', e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="Asia/Seoul">서울 (KST)</option>
                  <option value="Asia/Tokyo">도쿄 (JST)</option>
                  <option value="Asia/Shanghai">상하이 (CST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
