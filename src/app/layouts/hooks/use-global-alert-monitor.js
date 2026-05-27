"use client";
import { useEffect, useMemo, useState } from "react";
import { formatCheckLabKoreanDateTime, formatCheckLabKoreanTime, getCheckLabTimeValue, } from "@/app/layouts/helpers/time-formatters";
import { useDisplaySettings } from "./use-display-settings";
/**
 * 역할
 * - 현재 보고 있는 페이지와 무관하게 CheckLab 전체 알림을 감시하는 클라이언트 훅입니다.
 *
 * 개요
 * - 설비 상세 페이지의 이벤트 리스트는 모든 이벤트를 기록하고, 이 훅은 글로벌 팝업 후보만 따로 만듭니다.
 * - 같은 설비에서 알림이 여러 개 들어오면 최신 미열람 알림 1개만 글로벌 알림 후보로 유지합니다.
 *
 * STEP 1. 전체 알림 프록시를 주기적으로 호출합니다.
 * STEP 2. 읽지 않은 주의/경고/위험 알림만 글로벌 알림 후보로 변환합니다.
 * STEP 3. 백엔드가 보강해 준 설비 문맥과 상세 이동 링크를 붙입니다.
 *
 * 헬퍼
 * - 글로벌 알림 표시/3분 숨김 정책은 DashboardLayout에서 최종 적용합니다.
 */
const GLOBAL_ALERT_POLL_INTERVAL_MS = 5000;
export function useGlobalAlertMonitor() {
    const { settings } = useDisplaySettings();
    const [alerts, setAlerts] = useState([]);
    useEffect(() => {
        let isMounted = true;
        const loadGlobalAlerts = async () => {
            try {
                const response = await fetch("/api/asset-dashboard/alerts?limit=100&is_read=false", {
                    cache: "no-store",
                    headers: {
                        accept: "application/json",
                    },
                });
                if (!response.ok) {
                    throw new Error(`Global alerts proxy failed: ${response.status} ${response.statusText}`);
                }
                const alerts = (await response.json());
                if (isMounted) {
                    setAlerts(alerts);
                }
            }
            catch (error) {
                console.warn("[CheckLab API] global alert monitor failed", { error });
                if (isMounted) {
                    setAlerts([]);
                }
            }
        };
        void loadGlobalAlerts();
        const intervalId = window.setInterval(loadGlobalAlerts, GLOBAL_ALERT_POLL_INTERVAL_MS);
        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);
    const notifications = useMemo(() => toGlobalAlertNotifications(alerts, settings), [alerts, settings]);
    return notifications;
}
function toGlobalAlertNotifications(alerts, displaySettings) {
    const latestAlertByAsset = new Map();
    alerts
        .filter((alert) => !alert.is_read)
        .map((alert) => toGlobalAlertNotification(alert, displaySettings))
        .filter((notification) => Boolean(notification))
        .forEach((notification) => {
        const dedupeKey = getNotificationDedupeKey(notification);
        const currentNotification = latestAlertByAsset.get(dedupeKey);
        if (!currentNotification ||
            compareNotifications(notification, currentNotification) < 0) {
            latestAlertByAsset.set(dedupeKey, notification);
        }
    });
    return Array.from(latestAlertByAsset.values()).sort(compareNotifications);
}
function toGlobalAlertNotification(alert, displaySettings) {
    const grade = toNotificationGrade(alert.severity);
    if (!grade) {
        return null;
    }
    const dedupeKey = alert.asset_id ?? alert.alert_id;
    const assetId = alert.asset_id;
    const assetName = alert.asset_name ?? alert.asset_id;
    const href = alert.dashboard_href;
    if (!dedupeKey) {
        return null;
    }
    return {
        asset_id: alert.asset_id ?? undefined,
        dedupeKey,
        assetId: assetId ?? undefined,
        eventId: alert.alert_id ?? undefined,
        grade,
        href: href ?? undefined,
        id: `global-alert-${alert.alert_id ?? dedupeKey}`,
        location: alert.location_label ??
            assetName ??
            (alert.asset_id ? `CheckLab 자산 ${alert.asset_id}` : "CheckLab"),
        message: alert.message ?? "알림 메시지가 없습니다.",
        occurredAt: formatCheckLabKoreanDateTime(alert.created_at, displaySettings) ??
            formatCheckLabKoreanTime(alert.created_at, displaySettings) ??
            "--:--:--",
        occurredAtIso: alert.created_at ?? undefined,
        title: assetName ? `${assetName} 임계 알림` : "임계 알림",
    };
}
function toNotificationGrade(status) {
    const normalizedStatus = status?.trim().toLowerCase() ?? "";
    if (normalizedStatus === "critical" ||
        normalizedStatus === "danger" ||
        normalizedStatus === "high" ||
        normalizedStatus === "abnormal" ||
        normalizedStatus === "위험" ||
        normalizedStatus === "이상") {
        return "danger";
    }
    if (normalizedStatus === "warning" || normalizedStatus === "medium") {
        return "warning";
    }
    if (normalizedStatus === "caution" ||
        normalizedStatus === "주의" ||
        normalizedStatus === "요주의" ||
        normalizedStatus === "높음") {
        return "caution";
    }
    return null;
}
function compareNotifications(firstNotification, secondNotification) {
    const gradeDelta = notificationGradePriority[secondNotification.grade] -
        notificationGradePriority[firstNotification.grade];
    if (gradeDelta !== 0) {
        return gradeDelta;
    }
    return (getNotificationTime(secondNotification) -
        getNotificationTime(firstNotification));
}
function getNotificationDedupeKey(notification) {
    return notification.dedupeKey ?? notification.assetId ?? notification.id;
}
function getNotificationTime(notification) {
    return getCheckLabTimeValue(notification.occurredAtIso);
}
const notificationGradePriority = {
    error: 5,
    danger: 4,
    warning: 3,
    caution: 2,
    info: 1,
    success: 0,
};
