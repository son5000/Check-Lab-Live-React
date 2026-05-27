import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationCard } from "./notifications/notification-card";
import { useNotificationSettings } from "./hooks/use-notification-settings";
const ASSET_EVENT_BLIND_HANDLE_SELECTOR = '[data-global-notification-target="asset-event-blind-handle"], .AssetEventBlindHandle__button-1';
/** 힌트 이동 애니메이션 지속시간 (ms) */
const GLOBAL_NOTIFICATION_EXIT_MS = 220;
const GLOBAL_NOTIFICATION_STACK_LIMIT = 4;
const GLOBAL_NOTIFICATION_POSITION_CONFIG = {
    center: {
        cardClassName: "",
        cardDensity: "default",
        containerClassName: "inset-0 grid place-items-center px-3 py-6",
        exitLayerClassName: "absolute inset-0 grid place-items-center px-3 py-6",
        stackDirection: 1,
        stackShellClassName: "relative grid place-items-center",
    },
    top: {
        cardClassName: "w-full min-w-0 max-w-full",
        cardDensity: "compact",
        containerClassName: "left-1/2 top-4 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2",
        exitLayerClassName: "absolute left-1/2 top-0 grid w-full -translate-x-1/2 justify-items-center",
        stackDirection: 1,
        stackShellClassName: "relative grid justify-items-center",
    },
    "bottom-right": {
        cardClassName: "w-full min-w-0 max-w-full",
        cardDensity: "compact",
        containerClassName: "bottom-4 right-4 w-[min(24rem,calc(100vw-2rem))]",
        exitLayerClassName: "absolute bottom-0 right-0 grid w-full justify-items-end",
        stackDirection: -1,
        stackShellClassName: "relative grid justify-items-end",
    },
    "bottom-right-small": {
        cardClassName: "w-full min-w-0 max-w-full",
        cardDensity: "small",
        containerClassName: "bottom-4 right-4 w-[min(20rem,calc(100vw-2rem))]",
        exitLayerClassName: "absolute bottom-0 right-0 grid w-full justify-items-end",
        stackDirection: -1,
        stackShellClassName: "relative grid justify-items-end",
    },
};
export function GlobalNotifications({ currentPathname = "", notifications, onDismiss, onNavigateToDashboard, onOpen, }) {
    const { settings } = useNotificationSettings();
    const visibleNotifications = settings.enabled
        ? notifications.slice(0, GLOBAL_NOTIFICATION_STACK_LIMIT)
        : [];
    const firstVisibleNotification = visibleNotifications[0] ?? null;
    const stackedNotifications = visibleNotifications
        .slice(1)
        .map((notification, index) => ({
        notification,
        stackIndex: index + 1,
    }))
        .reverse();
    const [exitingNotifications, setExitingNotifications] = useState([]);
    const previousVisibleNotificationRef = useRef(firstVisibleNotification);
    const exitSequenceRef = useRef(0);
    useLayoutEffect(() => {
        if (!settings.enabled) {
            previousVisibleNotificationRef.current = null;
            setExitingNotifications((currentNotifications) => currentNotifications.length ? [] : currentNotifications);
            return;
        }
        const previousNotification = previousVisibleNotificationRef.current;
        const isPreviousNotificationStillVisible = previousNotification
            ? notifications.some((notification) => notification.id === previousNotification.id)
            : false;
        if (previousNotification &&
            previousNotification.id !== firstVisibleNotification?.id &&
            !isPreviousNotificationStillVisible) {
            const targetElement = document.querySelector(ASSET_EVENT_BLIND_HANDLE_SELECTOR);
            const isDrawerOpen = isEventDrawerOpen(targetElement);
            exitSequenceRef.current += 1;
            setExitingNotifications((currentNotifications) => [
                ...currentNotifications,
                {
                    instanceId: exitSequenceRef.current,
                    notification: previousNotification,
                    instant: isDrawerOpen,
                },
            ].slice(-GLOBAL_NOTIFICATION_STACK_LIMIT));
        }
        previousVisibleNotificationRef.current = firstVisibleNotification;
    }, [firstVisibleNotification, notifications, settings.enabled]);
    if (!settings.enabled) {
        return null;
    }
    if (!firstVisibleNotification && !exitingNotifications.length) {
        return null;
    }
    const positionConfig = GLOBAL_NOTIFICATION_POSITION_CONFIG[settings.position] ?? GLOBAL_NOTIFICATION_POSITION_CONFIG.center;
    return (<div className={cn("GlobalNotifications GlobalNotifications__container-1 pointer-events-none fixed z-50", positionConfig.containerClassName)} aria-live="polite" aria-label="글로벌 경고 알림">
      {firstVisibleNotification ? (<div className={cn("GlobalNotifications GlobalNotifications__stack-shell-1", positionConfig.stackShellClassName)}>
          {stackedNotifications.map(({ notification, stackIndex }) => (<NotificationCard key={notification.id} className={cn("GlobalNotifications__stack-card-1", positionConfig.cardClassName)} density={positionConfig.cardDensity} isInteractive={false} notification={notification} onDismiss={() => undefined} onOpen={() => undefined} style={buildStackCardStyle(stackIndex, positionConfig.stackDirection)}/>))}
          <NotificationCard canNavigateToDashboard={canNavigateToDashboard(firstVisibleNotification, currentPathname)} key={firstVisibleNotification.id} className={cn("GlobalNotifications__front-card-1", positionConfig.cardClassName)} density={positionConfig.cardDensity} notification={firstVisibleNotification} onDismiss={onDismiss} onNavigateToDashboard={onNavigateToDashboard} onOpen={onOpen}/>
        </div>) : null}
      {exitingNotifications.map((exitingNotification) => (<ExitingNotificationCard key={exitingNotification.instanceId} cardClassName={positionConfig.cardClassName} density={positionConfig.cardDensity} exitingNotification={exitingNotification} exitLayerClassName={positionConfig.exitLayerClassName} onExitComplete={(instanceId) => {
                setExitingNotifications((currentNotifications) => currentNotifications.filter((notification) => notification.instanceId !== instanceId));
            }}/>))}
    </div>);
}
function ExitingNotificationCard({ cardClassName, density, exitingNotification, exitLayerClassName, onExitComplete, }) {
    const cardRef = useRef(null);
    const onExitCompleteRef = useRef(onExitComplete);
    const [motionStyle, setMotionStyle] = useState(() => buildFallbackExitMotionStyle());
    const [isAnimating, setIsAnimating] = useState(false);
    useLayoutEffect(() => {
        onExitCompleteRef.current = onExitComplete;
    }, [onExitComplete]);
    useLayoutEffect(() => {
        // Drawer가 열린 상태에서 닫힌 경우 → 즉시 제거, 애니메이션 없음
        if (exitingNotification.instant) {
            onExitCompleteRef.current(exitingNotification.instanceId);
            return;
        }
        let measureFrame = 0;
        let animateFrame = 0;
        let targetElement = null;
        const timeoutId = window.setTimeout(() => {
            onExitCompleteRef.current(exitingNotification.instanceId);
        }, GLOBAL_NOTIFICATION_EXIT_MS + 80);
        measureFrame = window.requestAnimationFrame(() => {
            const cardElement = cardRef.current;
            if (!cardElement) {
                onExitCompleteRef.current(exitingNotification.instanceId);
                return;
            }
            targetElement = document.querySelector(ASSET_EVENT_BLIND_HANDLE_SELECTOR);
            const sourceRect = cardElement.getBoundingClientRect();
            const targetRect = targetElement?.getBoundingClientRect() ?? null;
            setMotionStyle(buildExitMotionStyle(sourceRect, targetRect));
            targetElement?.classList.add("GlobalNotifications__target-absorbing");
            animateFrame = window.requestAnimationFrame(() => {
                setIsAnimating(true);
            });
        });
        return () => {
            window.clearTimeout(timeoutId);
            window.cancelAnimationFrame(measureFrame);
            window.cancelAnimationFrame(animateFrame);
            targetElement?.classList.remove("GlobalNotifications__target-absorbing");
        };
    }, [exitingNotification.instanceId, exitingNotification.instant]);
    // instant 모드는 아무것도 렌더링하지 않음
    if (exitingNotification.instant) {
        return null;
    }
    return (<div className={cn("GlobalNotifications GlobalNotifications__exit-layer-1 pointer-events-none z-[30]", exitLayerClassName)}>
      <NotificationCard ref={cardRef} className={cn(isAnimating
            ? "GlobalNotifications__exit-card-1 GlobalNotifications__exit-card--running"
            : "GlobalNotifications__exit-card-1", cardClassName)} density={density} isInteractive={false} notification={exitingNotification.notification} onAnimationEnd={(event) => {
            if (event.currentTarget === event.target) {
                onExitCompleteRef.current(exitingNotification.instanceId);
            }
        }} onDismiss={() => undefined} onOpen={() => undefined} style={motionStyle}/>
    </div>);
}
function buildStackCardStyle(stackIndex, stackDirection = 1) {
    const cappedStackIndex = Math.min(stackIndex, GLOBAL_NOTIFICATION_STACK_LIMIT);
    const stackOffsetY = cappedStackIndex * 14 * stackDirection;
    return {
        "--global-notification-stack-index": cappedStackIndex,
        "--global-notification-stack-offset-y": formatPixels(stackOffsetY),
        "--global-notification-stack-opacity": Math.max(0.42, 0.78 - cappedStackIndex * 0.12),
        "--global-notification-stack-scale": Math.max(0.9, 1 - cappedStackIndex * 0.035),
        "--global-notification-stack-origin": stackDirection < 0 ? "center bottom" : "center top",
        "--global-notification-stack-z": GLOBAL_NOTIFICATION_STACK_LIMIT - cappedStackIndex,
    };
}
function canNavigateToDashboard(notification, currentPathname) {
    return Boolean(notification.href && !isCurrentPath(currentPathname, notification.href));
}
function isCurrentPath(pathname, href) {
    return normalizePathname(pathname) === normalizePathname(href);
}
function normalizePathname(value) {
    return value.replace(/\/+$/, "") || "/";
}
function buildExitMotionStyle(sourceRect, targetRect) {
    if (!targetRect || !sourceRect.width || !sourceRect.height) {
        return buildFallbackExitMotionStyle();
    }
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const deltaX = targetCenterX - sourceCenterX;
    const deltaY = targetCenterY - sourceCenterY;
    const distance = Math.hypot(deltaX, deltaY);
    if (!distance) {
        return buildFallbackExitMotionStyle();
    }
    // 실제 핸들 위치까지 이동하지 않음 — 방향 힌트만 짧게 (최대 48px)
    const directionX = deltaX / distance;
    const directionY = deltaY / distance;
    const hintDistance = clampNumber(distance * 0.06, 16, 48);
    return {
        "--global-notification-exit-x": formatPixels(directionX * hintDistance),
        "--global-notification-exit-y": formatPixels(directionY * hintDistance),
        "--global-notification-exit-scale": 0.9,
    };
}
function buildFallbackExitMotionStyle() {
    return {
        "--global-notification-exit-x": "0px",
        "--global-notification-exit-y": "-20px",
        "--global-notification-exit-scale": 0.9,
    };
}
function isEventDrawerOpen(targetElement) {
    return targetElement?.getAttribute("aria-expanded") === "true";
}
function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function formatPixels(value) {
    return `${Math.round(value)}px`;
}
