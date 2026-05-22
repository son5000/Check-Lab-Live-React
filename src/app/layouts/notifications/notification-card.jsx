import { forwardRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationGradeIcon } from "../constants/dashboard-icons";
import { notificationGradeClassName, notificationGradeLabel, } from "../constants/status-styles";
const notificationCardDensityClassName = {
    default: {
        root: "w-[min(70vw,64rem)] min-w-[min(34rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-4 md:p-5",
        layout: "grid-cols-[auto_minmax(0,1fr)_auto] gap-3 md:gap-4",
        iconWrap: "h-11 w-11 md:h-12 md:w-12",
        icon: "h-6 w-6 md:h-7 md:w-7",
        grade: "px-2 py-1 text-xs",
        title: "text-lg md:text-2xl",
        location: "mt-2 text-sm md:text-base",
        message: "mt-3 text-base leading-7 md:text-lg",
        footer: "mt-4",
        timestamp: "text-sm",
        actions: "gap-2",
        button: "h-9 px-3 text-sm",
        closeButton: "h-7 w-7",
    },
    compact: {
        root: "w-full min-w-0 max-w-full p-3",
        layout: "grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5",
        iconWrap: "h-9 w-9",
        icon: "h-5 w-5",
        grade: "px-1.5 py-0.5 text-[10px]",
        title: "text-sm",
        location: "mt-1.5 text-xs",
        message: "mt-2 text-sm leading-5",
        footer: "mt-3",
        timestamp: "text-xs",
        actions: "gap-1.5",
        button: "h-8 px-2 text-xs",
        closeButton: "h-7 w-7",
    },
    small: {
        root: "w-full min-w-0 max-w-full p-2.5",
        layout: "grid-cols-[auto_minmax(0,1fr)_auto] gap-2",
        iconWrap: "h-8 w-8",
        icon: "h-4 w-4",
        grade: "px-1.5 py-0.5 text-[10px]",
        title: "text-xs",
        location: "mt-1 text-[11px]",
        message: "mt-1.5 text-xs leading-5",
        footer: "mt-2",
        timestamp: "text-[11px]",
        actions: "gap-1.5",
        button: "h-7 px-2 text-[11px]",
        closeButton: "h-6 w-6",
    },
};
export const NotificationCard = forwardRef(function NotificationCard({ canNavigateToDashboard = false, className, density = "default", isInteractive = true, notification, onAnimationEnd, onDismiss, onNavigateToDashboard, onOpen, style, }, ref) {
    const densityClassName = notificationCardDensityClassName[density] ?? notificationCardDensityClassName.default;
    const GradeIcon = notificationGradeIcon[notification.grade];
    const canOpen = Boolean(notification.href && notification.eventId);
    return (<article ref={ref} role={isInteractive ? "alertdialog" : undefined} aria-hidden={!isInteractive} aria-label={`${notification.title} 글로벌 경고 알림`} className={cn("NotificationCard NotificationCard__item-1 overflow-hidden rounded-md border shadow-2xl backdrop-blur", densityClassName.root, isInteractive ? "pointer-events-auto" : "pointer-events-none", notificationGradeClassName[notification.grade], className)} onAnimationEnd={onAnimationEnd} style={style}>
      <div className={cn("NotificationCard NotificationCard__container-1 grid min-w-0 items-start", densityClassName.layout)}>
        <span className={cn("NotificationCard NotificationCard__icon-wrap-1 grid shrink-0 place-items-center rounded-md border border-current/25 bg-background/55 shadow-sm", densityClassName.iconWrap)}>
          <GradeIcon className={cn("NotificationCard NotificationCard__icon-1 shrink-0", densityClassName.icon)} aria-hidden="true"/>
        </span>
        <div className="NotificationCard NotificationCard__container-2 min-w-0">
          <div className="NotificationCard NotificationCard__container-3 flex min-w-0 flex-wrap items-center gap-2">
            <span className={cn("NotificationCard NotificationCard__label-1 shrink-0 rounded-sm bg-background/65 font-black", densityClassName.grade)}>
              {notificationGradeLabel[notification.grade]}
            </span>
            <h2 className={cn("NotificationCard NotificationCard__title-1 min-w-0 break-words font-black leading-tight", densityClassName.title)}>{notification.title}</h2>
          </div>
          <p className={cn("NotificationCard NotificationCard__text-1 break-words font-semibold opacity-85", densityClassName.location)}>{notification.location}</p>
          <p className={cn("NotificationCard NotificationCard__text-2 break-words font-bold", densityClassName.message)}>{notification.message}</p>
          <div className={cn("NotificationCard NotificationCard__container-4 flex min-w-0 flex-wrap items-center justify-between gap-2", densityClassName.footer)}>
            <span className={cn("NotificationCard NotificationCard__label-2 min-w-0 font-mono font-semibold opacity-80", densityClassName.timestamp)}>
              {notification.occurredAt}
            </span>
            <span className={cn("NotificationCard NotificationCard__actions-1 flex max-w-full shrink-0 flex-wrap items-center justify-end", densityClassName.actions)}>
              {canNavigateToDashboard ? (<button type="button" className={cn("NotificationCard NotificationCard__button-3 inline-flex shrink-0 items-center rounded-md border border-current/20 bg-background/60 font-bold transition hover:bg-background/80", densityClassName.button)} onClick={() => {
                if (isInteractive) {
                    onNavigateToDashboard?.(notification);
                }
            }} tabIndex={isInteractive ? undefined : -1}>
                  설비 대시보드
                </button>) : null}
              <button type="button" className={cn("NotificationCard NotificationCard__button-1 inline-flex shrink-0 items-center rounded-md border border-current/20 bg-background/60 font-bold transition hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50", densityClassName.button)} disabled={!canOpen} onClick={() => {
            if (isInteractive) {
                onOpen(notification);
            }
        }} tabIndex={isInteractive ? undefined : -1}>
                상세 보기
              </button>
              <button type="button" className={cn("NotificationCard NotificationCard__button-4 inline-flex shrink-0 items-center rounded-md border border-current/20 bg-background/40 font-bold transition hover:bg-background/70", densityClassName.button)} onClick={() => {
            if (isInteractive) {
                onDismiss(notification);
            }
        }} tabIndex={isInteractive ? undefined : -1}>
                3분 숨김
              </button>
            </span>
          </div>
        </div>
        <button type="button" className={cn("NotificationCard NotificationCard__button-2 grid shrink-0 place-items-center rounded-md transition hover:bg-background/70", densityClassName.closeButton)} title="3분간 숨김" aria-label={`${notification.title} 3분간 숨김`} onClick={() => {
            if (isInteractive) {
                onDismiss(notification);
            }
        }} tabIndex={isInteractive ? undefined : -1}>
          <X className="NotificationCard NotificationCard__icon-2 h-3.5 w-3.5" aria-hidden="true"/>
        </button>
      </div>
    </article>);
});
