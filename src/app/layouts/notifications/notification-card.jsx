import { forwardRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationGradeIcon } from "../constants/dashboard-icons";
import { notificationGradeClassName, notificationGradeLabel, } from "../constants/status-styles";
export const NotificationCard = forwardRef(function NotificationCard({ canNavigateToDashboard = false, className, isInteractive = true, notification, onAnimationEnd, onDismiss, onNavigateToDashboard, onOpen, style, }, ref) {
    const GradeIcon = notificationGradeIcon[notification.grade];
    const canOpen = Boolean(notification.href && notification.eventId);
    return (<article ref={ref} role={isInteractive ? "alertdialog" : undefined} aria-hidden={!isInteractive} aria-label={`${notification.title} 글로벌 경고 알림`} className={cn("NotificationCard NotificationCard__item-1 w-[min(70vw,64rem)] min-w-[min(34rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border p-4 shadow-2xl backdrop-blur md:p-5", isInteractive ? "pointer-events-auto" : "pointer-events-none", notificationGradeClassName[notification.grade], className)} onAnimationEnd={onAnimationEnd} style={style}>
      <div className="NotificationCard NotificationCard__container-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 md:gap-4">
        <span className="NotificationCard NotificationCard__icon-wrap-1 grid h-11 w-11 shrink-0 place-items-center rounded-md border border-current/25 bg-background/55 shadow-sm md:h-12 md:w-12">
          <GradeIcon className="NotificationCard NotificationCard__icon-1 h-6 w-6 shrink-0 md:h-7 md:w-7" aria-hidden="true"/>
        </span>
        <div className="NotificationCard NotificationCard__container-2 min-w-0">
          <div className="NotificationCard NotificationCard__container-3 flex min-w-0 flex-wrap items-center gap-2">
            <span className="NotificationCard NotificationCard__label-1 shrink-0 rounded-sm bg-background/65 px-2 py-1 text-xs font-black">
              {notificationGradeLabel[notification.grade]}
            </span>
            <h2 className="NotificationCard NotificationCard__title-1 min-w-0 break-words text-lg font-black leading-tight md:text-2xl">{notification.title}</h2>
          </div>
          <p className="NotificationCard NotificationCard__text-1 mt-2 break-words text-sm font-semibold opacity-85 md:text-base">{notification.location}</p>
          <p className="NotificationCard NotificationCard__text-2 mt-3 break-words text-base font-bold leading-7 md:text-lg">{notification.message}</p>
          <div className="NotificationCard NotificationCard__container-4 mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="NotificationCard NotificationCard__label-2 min-w-0 font-mono text-sm font-semibold opacity-80">
              {notification.occurredAt}
            </span>
            <span className="NotificationCard NotificationCard__actions-1 flex shrink-0 items-center gap-2">
              {canNavigateToDashboard ? (<button type="button" className="NotificationCard NotificationCard__button-3 inline-flex h-9 shrink-0 items-center rounded-md border border-current/20 bg-background/60 px-3 text-sm font-bold transition hover:bg-background/80" onClick={() => {
                if (isInteractive) {
                    onNavigateToDashboard?.(notification);
                }
            }} tabIndex={isInteractive ? undefined : -1}>
                  설비 대시보드
                </button>) : null}
              <button type="button" className="NotificationCard NotificationCard__button-1 inline-flex h-9 shrink-0 items-center rounded-md border border-current/20 bg-background/60 px-3 text-sm font-bold transition hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canOpen} onClick={() => {
            if (isInteractive) {
                onOpen(notification);
            }
        }} tabIndex={isInteractive ? undefined : -1}>
                상세 보기
              </button>
              <button type="button" className="NotificationCard NotificationCard__button-4 inline-flex h-9 shrink-0 items-center rounded-md border border-current/20 bg-background/40 px-3 text-sm font-bold transition hover:bg-background/70" onClick={() => {
            if (isInteractive) {
                onDismiss(notification);
            }
        }} tabIndex={isInteractive ? undefined : -1}>
                3분 숨김
              </button>
            </span>
          </div>
        </div>
        <button type="button" className="NotificationCard NotificationCard__button-2 grid h-7 w-7 shrink-0 place-items-center rounded-md transition hover:bg-background/70" title="3분간 숨김" aria-label={`${notification.title} 3분간 숨김`} onClick={() => {
            if (isInteractive) {
                onDismiss(notification);
            }
        }} tabIndex={isInteractive ? undefined : -1}>
          <X className="NotificationCard NotificationCard__icon-2 h-3.5 w-3.5" aria-hidden="true"/>
        </button>
      </div>
    </article>);
});
