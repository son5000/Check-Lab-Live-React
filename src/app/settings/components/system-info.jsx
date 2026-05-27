'use client';

import { Info, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export function SystemInfo() {
  const [copied, setCopied] = useState(null);

  const systemInfo = {
    appVersion: '1.0.0-beta.1',
    apiVersion: 'v2.0',
    buildDate: '2026-05-26',
    environment: 'Production',
    browser: 'Chrome 127.0',
    os: 'Windows 10',
    nodeId: 'checklab-node-01',
    updateDate: '2026-05-20',
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="SystemInfo space-y-6">
      <div className="border-b border-border pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Info className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">시스템 정보</h2>
        </div>

        <div className="space-y-3">
          {/* 버전 정보 */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">버전 정보</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">앱 버전</p>
                  <p className="text-sm font-medium text-foreground">{systemInfo.appVersion}</p>
                </div>
                <button
                  onClick={() => handleCopy(systemInfo.appVersion, 'app-version')}
                  className="rounded-md p-1 hover:bg-accent"
                  title="복사"
                >
                  {copied === 'app-version' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">API 버전</p>
                  <p className="text-sm font-medium text-foreground">{systemInfo.apiVersion}</p>
                </div>
                <button
                  onClick={() => handleCopy(systemInfo.apiVersion, 'api-version')}
                  className="rounded-md p-1 hover:bg-accent"
                  title="복사"
                >
                  {copied === 'api-version' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">빌드 날짜</p>
                  <p className="text-sm font-medium text-foreground">{systemInfo.buildDate}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">마지막 업데이트</p>
                  <p className="text-sm font-medium text-foreground">{systemInfo.updateDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 환경 정보 */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">환경 정보</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">환경</span>
                <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs font-medium text-green-600">
                  {systemInfo.environment}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">브라우저</span>
                <span className="text-sm font-medium text-foreground">{systemInfo.browser}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">운영 체제</span>
                <span className="text-sm font-medium text-foreground">{systemInfo.os}</span>
              </div>
            </div>
          </div>

          {/* 노드 정보 */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">노드 정보</p>
            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">노드 ID</p>
                <p className="text-sm font-medium text-foreground">{systemInfo.nodeId}</p>
              </div>
              <button
                onClick={() => handleCopy(systemInfo.nodeId, 'node-id')}
                className="rounded-md p-1 hover:bg-accent"
                title="복사"
              >
                {copied === 'node-id' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* 도움말 */}
          <div className="rounded-lg bg-blue-600/5 p-3 border border-blue-600/30">
            <p className="text-xs text-muted-foreground">
              💡 <strong>팁:</strong> 문제가 발생하면 시스템 정보를 기술 지원팀에 전달해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
