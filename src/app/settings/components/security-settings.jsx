'use client';

import { Lock, LogOut, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { translateText } from '@/app/layouts/helpers/localization';
import { useDisplaySettings } from '@/app/layouts/hooks/use-display-settings';

export function SecuritySettings() {
  const { settings: displaySettings } = useDisplaySettings();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [activeSessions, setActiveSessions] = useState([
    {
      id: 1,
      device: 'Chrome on Windows',
      location: '서울, 대한민국',
      lastActive: '2분 전',
      isCurrent: true,
    },
    {
      id: 2,
      device: 'Safari on iPad',
      location: '서울, 대한민국',
      lastActive: '1시간 전',
      isCurrent: false,
    },
  ]);

  const handlePasswordChange = () => {
    if (
      passwordData.new &&
      passwordData.new === passwordData.confirm &&
      passwordData.current
    ) {
      setPasswordData({ current: '', new: '', confirm: '' });
      setIsChangingPassword(false);
      alert(translateText('비밀번호가 변경되었습니다', displaySettings.language));
    }
  };

  const handleLogoutSession = (sessionId) => {
    setActiveSessions(activeSessions.filter((s) => s.id !== sessionId));
  };

  return (
    <div className="SecuritySettings space-y-6">
      <div className="border-b border-border pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">보안 및 계정</h2>
        </div>

        <div className="space-y-6">
          {/* 비밀번호 변경 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">비밀번호</h3>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="text-xs font-medium text-blue-600 transition hover:underline"
                >
                  변경
                </button>
              )}
            </div>

            {!isChangingPassword ? (
              <p className="text-sm text-muted-foreground">••••••••</p>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
                <input
                  type="password"
                  placeholder="현재 비밀번호"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
                <input
                  type="password"
                  placeholder="새 비밀번호"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
                <input
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
                {passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm && (
                  <p className="text-xs text-red-600">비밀번호가 일치하지 않습니다</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handlePasswordChange}
                    disabled={!passwordData.current || !passwordData.new || passwordData.new !== passwordData.confirm}
                    className="flex-1 rounded-md border border-green-600 bg-green-600/10 px-3 py-2 text-sm font-medium text-green-600 transition hover:bg-green-600/20 disabled:opacity-50"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ current: '', new: '', confirm: '' });
                    }}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 활성 세션 */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">활성 세션</h3>
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {session.device}
                      {session.isCurrent && (
                        <span className="ml-2 inline-block rounded-full bg-green-600/20 px-2 py-0.5 text-xs text-green-600">
                          현재 기기
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleLogoutSession(session.id)}
                      className="rounded-md bg-red-600/10 p-2 text-red-600 transition hover:bg-red-600/20"
                      title="이 세션 로그아웃"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 모든 세션에서 로그아웃 */}
          <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/5 p-3">
            <p className="mb-2 text-sm font-medium text-foreground">
              모든 기기에서 로그아웃
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              현재 기기를 포함한 모든 활성 세션이 종료됩니다
            </p>
            <button className="rounded-md border border-yellow-600 bg-yellow-600/10 px-3 py-2 text-sm font-medium text-yellow-600 transition hover:bg-yellow-600/20">
              모든 세션 로그아웃
            </button>
          </div>

          {/* 계정 삭제 */}
          <div className="rounded-lg border border-red-600/30 bg-red-600/5 p-3">
            <div className="flex items-start gap-2">
              <Trash2 className="mt-0.5 h-4 w-4 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">계정 삭제</p>
                <button className="mt-2 rounded-md border border-red-600 bg-red-600/10 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-600/20">
                  계정 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
