'use client';
import { Bell, Volume2, VolumeX } from 'lucide-react';
export function NotificationSettingsForm({ settings, onSettingsChange, }) {
    const handleToggleNotifications = () => {
        onSettingsChange({ enabled: !settings.enabled });
    };
    const handlePositionChange = (position) => {
        onSettingsChange({ position });
    };
    return (<div className="NotificationSettingsForm NotificationSettingsForm__container-1 space-y-6">
      <div className="NotificationSettingsForm NotificationSettingsForm__section-1 border-b border-border pb-6">
        <div className="NotificationSettingsForm NotificationSettingsForm__header-1 mb-4 flex items-center gap-3">
          <Bell className="NotificationSettingsForm NotificationSettingsForm__icon-1 h-5 w-5 text-foreground"/>
          <h2 className="NotificationSettingsForm NotificationSettingsForm__title-1 text-lg font-semibold text-foreground">
            알림 설정
          </h2>
        </div>

        <div className="NotificationSettingsForm NotificationSettingsForm__toggle-section-1 space-y-3">
          <label className="NotificationSettingsForm NotificationSettingsForm__label-1 flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.enabled} onChange={handleToggleNotifications} className="NotificationSettingsForm NotificationSettingsForm__checkbox-1 h-4 w-4 rounded border-border bg-background cursor-pointer"/>
            <span className="NotificationSettingsForm NotificationSettingsForm__label-text-1 flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                알림 활성화
              </span>
              <span className="text-xs text-muted-foreground">
                {settings.enabled ? '알림이 표시됩니다' : '알림이 비활성화됨'}
              </span>
            </span>
            {settings.enabled ? (<Volume2 className="NotificationSettingsForm NotificationSettingsForm__status-icon-1 ml-auto h-4 w-4 text-green-600"/>) : (<VolumeX className="NotificationSettingsForm NotificationSettingsForm__status-icon-2 ml-auto h-4 w-4 text-muted-foreground"/>)}
          </label>
        </div>
      </div>

      {settings.enabled && (<div className="NotificationSettingsForm NotificationSettingsForm__position-section-1 space-y-3">
          <h3 className="NotificationSettingsForm NotificationSettingsForm__position-title-1 text-sm font-semibold text-foreground">
            알림 위치
          </h3>
          <p className="NotificationSettingsForm NotificationSettingsForm__description-1 text-xs text-muted-foreground">
            알림이 화면에 표시될 위치를 선택하세요.
          </p>

          <div className="NotificationSettingsForm NotificationSettingsForm__radio-group-1 space-y-2">
            <label className="NotificationSettingsForm NotificationSettingsForm__radio-label-1 flex items-start gap-3 p-3 rounded-md border border-border bg-background/50 cursor-pointer transition hover:bg-accent/20">
              <input type="radio" name="position" value="center" checked={settings.position === 'center'} onChange={() => handlePositionChange('center')} className="NotificationSettingsForm NotificationSettingsForm__radio-1 h-4 w-4 mt-0.5 cursor-pointer"/>
              <span className="NotificationSettingsForm NotificationSettingsForm__radio-content-1 flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-foreground">
                  중앙 (기본)
                </span>
                <span className="text-xs text-muted-foreground">
                  화면 중앙에 크게 표시됩니다
                </span>
              </span>
            </label>

            <label className="NotificationSettingsForm NotificationSettingsForm__radio-label-2 flex items-start gap-3 p-3 rounded-md border border-border bg-background/50 cursor-pointer transition hover:bg-accent/20">
              <input type="radio" name="position" value="bottom-right" checked={settings.position === 'bottom-right'} onChange={() => handlePositionChange('bottom-right')} className="NotificationSettingsForm NotificationSettingsForm__radio-2 h-4 w-4 mt-0.5 cursor-pointer"/>
              <span className="NotificationSettingsForm NotificationSettingsForm__radio-content-2 flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-foreground">
                  우측 하단
                </span>
                <span className="text-xs text-muted-foreground">
                  화면 우측 하단에 표시됩니다
                </span>
              </span>
            </label>

            <label className="NotificationSettingsForm NotificationSettingsForm__radio-label-3 flex items-start gap-3 p-3 rounded-md border border-border bg-background/50 cursor-pointer transition hover:bg-accent/20">
              <input type="radio" name="position" value="bottom-right-small" checked={settings.position === 'bottom-right-small'} onChange={() => handlePositionChange('bottom-right-small')} className="NotificationSettingsForm NotificationSettingsForm__radio-3 h-4 w-4 mt-0.5 cursor-pointer"/>
              <span className="NotificationSettingsForm NotificationSettingsForm__radio-content-3 flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-foreground">
                  우측 하단 (작게)
                </span>
                <span className="text-xs text-muted-foreground">
                  화면 우측 하단에 작게 표시됩니다
                </span>
              </span>
            </label>
          </div>
        </div>)}

      <div className="NotificationSettingsForm NotificationSettingsForm__help-section-1 rounded-md bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          💡 알림 설정은 자동으로 저장됩니다. 추후 더 다양한 설정 메뉴가 추가될 예정입니다.
        </p>
      </div>
    </div>);
}
