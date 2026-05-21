"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { dashboardHeaderState, managementMenuItems, } from "./main-layout-data";
import { MainHeader } from "./main-header";
import { MainSideMenu } from "./main-side-menu";
import { GlobalNotifications } from "./global-notifications";
import { getCheckLabTimeValue } from "./helpers/time-formatters";
import { useDashboardClock } from "./hooks/use-dashboard-clock";
import { DashboardHeaderStateProvider } from "./hooks/use-dashboard-header-state";
import { DashboardNotificationsProvider } from "./hooks/use-dashboard-notifications";
import { DashboardShellStateProvider } from "./hooks/use-dashboard-shell-state";
import { useDashboardTheme } from "./hooks/use-dashboard-theme";
import { useGlobalAlertMonitor } from "./hooks/use-global-alert-monitor";
const GLOBAL_ALERT_SUPPRESSION_MS = 3 * 60 * 1000;
const GLOBAL_ALERT_SUPPRESSION_CLEANUP_MS = 30000;
const GLOBAL_ALERT_STACK_LIMIT = 4;
const OPEN_ASSET_EVENT_DETAIL_EVENT = "checklab:open-asset-event";
const EVENT_REVIEW_CONTEXT_EVENT = "checklab:event-review-context";
const emptyMonitoringTree = {
    children: [],
    href: "/site",
    id: "overview",
    label: "전체 현황",
    status: "normal",
    type: "overview",
};
export function MainLayout({ activeNodeId = "overview", children, clockOverride, headerState = dashboardHeaderState, initialMonitoringTree, initialNotifications = [], }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [liveHeaderState, setLiveHeaderState] = useState(headerState);
    const [liveMonitoringTree, setLiveMonitoringTree] = useState(() => initialMonitoringTree ?? emptyMonitoringTree);
    const [pageNotifications, setPageNotifications] = useState(initialNotifications);
    const [dismissedNotificationIds, setDismissedNotificationIds] = useState([]);
    const [suppressedNotificationKeys, setSuppressedNotificationKeys] = useState({});
    const [activeEventReview, setActiveEventReview] = useState();
    const { currentDate, currentTime } = useDashboardClock();
    const { isDarkMode, onThemeToggle } = useDashboardTheme();
    const monitoredNotifications = useGlobalAlertMonitor();
    const notificationsController = useMemo(() => ({ setNotifications: setPageNotifications }), [setPageNotifications]);
    const notifications = useMemo(() => mergeDashboardNotifications(pageNotifications, monitoredNotifications), [monitoredNotifications, pageNotifications]);
    const visibleNotifications = useMemo(() => selectVisibleGlobalNotifications({
        activeEventReview,
        dismissedNotificationIds,
        notifications,
        suppressedNotificationKeys,
    }), [
        activeEventReview,
        dismissedNotificationIds,
        notifications,
        suppressedNotificationKeys,
    ]);
    useEffect(() => {
        setLiveHeaderState(headerState);
    }, [headerState]);
    useEffect(() => {
        if (initialMonitoringTree) {
            setLiveMonitoringTree(initialMonitoringTree);
        }
    }, [initialMonitoringTree]);
    useEffect(() => {
        let isMounted = true;
        const loadMonitoringTree = async () => {
            try {
                const response = await fetch("/api/asset-dashboard/monitoring-tree", {
                    cache: "no-store",
                    headers: {
                        accept: "application/json",
                    },
                });
                if (!response.ok) {
                    throw new Error(`Monitoring tree proxy failed: ${response.status} ${response.statusText}`);
                }
                const nextMonitoringTree = (await response.json());
                if (isMounted) {
                    setLiveMonitoringTree(nextMonitoringTree);
                }
            }
            catch (error) {
                console.warn("[CheckLab API] monitoring tree load failed", { error });
            }
        };
        void loadMonitoringTree();
        const intervalId = window.setInterval(loadMonitoringTree, 30000);
        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);
    useEffect(() => {
        setDismissedNotificationIds((currentIds) => currentIds.filter((id) => notifications.some((notification) => notification.id === id)));
    }, [notifications]);
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setSuppressedNotificationKeys((currentKeys) => pruneExpiredSuppressionKeys(currentKeys));
        }, GLOBAL_ALERT_SUPPRESSION_CLEANUP_MS);
        return () => window.clearInterval(intervalId);
    }, []);
    useEffect(() => {
        const handleEventReviewContext = (event) => {
            const detail = event.detail;
            setActiveEventReview(detail?.isOpen ? detail : undefined);
        };
        window.addEventListener(EVENT_REVIEW_CONTEXT_EVENT, handleEventReviewContext);
        return () => {
            window.removeEventListener(EVENT_REVIEW_CONTEXT_EVENT, handleEventReviewContext);
        };
    }, []);
    const handleMenuToggle = () => {
        if (window.matchMedia("(max-width: 767px)").matches) {
            setIsMobileSidebarOpen((isOpen) => !isOpen);
            return;
        }
        setIsSidebarCollapsed((isCollapsed) => !isCollapsed);
    };
    const handleDismissNotification = (id) => {
        setDismissedNotificationIds((currentIds) => currentIds.includes(id) ? currentIds : [...currentIds, id]);
    };
    const handleSuppressNotification = (notification) => {
        const suppressionKey = getNotificationSuppressionKey(notification);
        setSuppressedNotificationKeys((currentKeys) => ({
            ...currentKeys,
            [suppressionKey]: Date.now() + GLOBAL_ALERT_SUPPRESSION_MS,
        }));
        handleDismissNotification(notification.id);
    };
    const handleOpenNotification = (notification) => {
        if (!notification.eventId) {
            return;
        }
        handleSuppressNotification(notification);
        if (!notification.href) {
            dispatchOpenAssetEvent(notification);
            return;
        }
        const detailHref = buildNotificationDetailHref(notification);
        if (isCurrentPath(pathname, notification.href)) {
            dispatchOpenAssetEvent(notification);
            router.replace(detailHref, { scroll: false });
            return;
        }
        router.push(detailHref, { scroll: false });
    };
    const handleNavigateNotificationDashboard = (notification) => {
        if (!notification.href) {
            return;
        }
        handleSuppressNotification(notification);
        if (!isCurrentPath(pathname, notification.href)) {
            router.push(notification.href, { scroll: false });
        }
    };
    return (<section className="MainLayout MainLayout__section-1 relative flex h-screen max-h-screen min-h-0 overflow-hidden bg-background text-foreground [height:100dvh] [max-height:100dvh]" aria-label="공정 관제 대시보드">
      <div className="MainLayout MainLayout__container-1 MainLayoutFrame flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <MainHeader headerState={liveHeaderState} currentDate={clockOverride?.currentDate ?? currentDate} currentTime={clockOverride?.currentTime ?? currentTime} isDarkMode={isDarkMode} isSidebarCollapsed={isSidebarCollapsed} isMobileSidebarOpen={isMobileSidebarOpen} onMenuToggle={handleMenuToggle} onThemeToggle={onThemeToggle}/>

        <DashboardNotificationsProvider value={notificationsController}>
          <DashboardHeaderStateProvider value={{ setHeaderState: setLiveHeaderState }}>
            <DashboardShellStateProvider value={{
            isSidebarCollapsed,
            isMobileSidebarOpen,
        }}>
              <div className="MainLayout MainLayout__container-2 MainLayoutBody relative flex min-h-0 flex-1 overflow-hidden">
                <MainSideMenu monitoringTree={liveMonitoringTree} activeNodeId={activeNodeId} managementMenuItems={managementMenuItems} isCollapsed={isSidebarCollapsed} isMobileOpen={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)}/>
                {children ?? <DefaultMainContent />}
              </div>
            </DashboardShellStateProvider>
          </DashboardHeaderStateProvider>
        </DashboardNotificationsProvider>
      </div>

      <GlobalNotifications currentPathname={pathname} notifications={visibleNotifications} onDismiss={handleSuppressNotification} onNavigateToDashboard={handleNavigateNotificationDashboard} onOpen={handleOpenNotification}/>
    </section>);
}
function buildNotificationDetailHref(notification) {
    const searchParams = new URLSearchParams();
    if (notification.eventId) {
        searchParams.set("eventId", notification.eventId);
    }
    return `${notification.href}?${searchParams.toString()}`;
}
function dispatchOpenAssetEvent(notification) {
    window.dispatchEvent(new CustomEvent(OPEN_ASSET_EVENT_DETAIL_EVENT, {
        detail: {
            asset_id: notification.asset_id,
            assetId: notification.assetId,
            eventId: notification.eventId,
        },
    }));
}
function isCurrentPath(pathname, href) {
    return normalizePathname(pathname) === normalizePathname(href);
}
function normalizePathname(value) {
    return value.replace(/\/+$/, "") || "/";
}
function mergeDashboardNotifications(pageNotifications, monitoredNotifications) {
    const notificationById = new Map();
    [...pageNotifications, ...monitoredNotifications].forEach((notification) => {
        const currentNotification = notificationById.get(notification.id);
        if (!currentNotification ||
            compareNotifications(notification, currentNotification) < 0) {
            notificationById.set(notification.id, notification);
        }
    });
    return Array.from(notificationById.values()).sort(compareNotifications);
}
function selectVisibleGlobalNotifications({ activeEventReview, dismissedNotificationIds, notifications, suppressedNotificationKeys, }) {
    const notificationBySuppressionKey = new Map();
    const now = Date.now();
    notifications
        .filter((notification) => isGlobalAlertGrade(notification.grade))
        .filter((notification) => shouldShowNotificationDuringEventReview(notification, activeEventReview))
        .filter((notification) => !dismissedNotificationIds.includes(notification.id))
        .filter((notification) => {
        const suppressionKey = getNotificationSuppressionKey(notification);
        return (suppressedNotificationKeys[suppressionKey] ?? 0) <= now;
    })
        .forEach((notification) => {
        const suppressionKey = getNotificationSuppressionKey(notification);
        const currentNotification = notificationBySuppressionKey.get(suppressionKey);
        if (!currentNotification ||
            compareNotifications(notification, currentNotification) < 0) {
            notificationBySuppressionKey.set(suppressionKey, notification);
        }
    });
    return Array.from(notificationBySuppressionKey.values())
        .sort(compareVisibleGlobalNotifications)
        .slice(0, GLOBAL_ALERT_STACK_LIMIT);
}
function shouldShowNotificationDuringEventReview(notification, activeEventReview) {
    if (!activeEventReview?.isOpen) {
        return true;
    }
    if (notification.eventId &&
        activeEventReview.eventId &&
        notification.eventId === activeEventReview.eventId) {
        return false;
    }
    if (notification.asset_id &&
        activeEventReview.asset_id &&
        notification.asset_id === activeEventReview.asset_id) {
        return false;
    }
    if (notification.assetId &&
        activeEventReview.assetId &&
        notification.assetId === activeEventReview.assetId) {
        return false;
    }
    return notification.grade === "danger" || notification.grade === "error";
}
function pruneExpiredSuppressionKeys(keys) {
    const now = Date.now();
    const nextKeys = Object.fromEntries(Object.entries(keys).filter(([, expiresAt]) => expiresAt > now));
    return Object.keys(nextKeys).length === Object.keys(keys).length
        ? keys
        : nextKeys;
}
function getNotificationSuppressionKey(notification) {
    return notification.dedupeKey ?? notification.assetId ?? notification.id;
}
function isGlobalAlertGrade(grade) {
    return (grade === "caution" ||
        grade === "warning" ||
        grade === "danger" ||
        grade === "error");
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
function compareVisibleGlobalNotifications(firstNotification, secondNotification) {
    const firstCanOpen = hasNotificationDetailTarget(firstNotification);
    const secondCanOpen = hasNotificationDetailTarget(secondNotification);
    if (firstCanOpen !== secondCanOpen) {
        return firstCanOpen ? -1 : 1;
    }
    return compareNotifications(firstNotification, secondNotification);
}
function hasNotificationDetailTarget(notification) {
    return Boolean(notification.href && notification.eventId);
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
function DefaultMainContent() {
    return (<main className="MainLayout MainLayout__empty-main-1 grid min-w-0 flex-1 place-items-center bg-muted/35 p-6 text-center">
      <div className="MainLayout MainLayout__empty-content-1 grid gap-2">
        <h1 className="text-base font-semibold text-foreground">선택된 설비가 없습니다</h1>
        <p className="text-sm text-muted-foreground">
          관제 트리에서 공정, 위치, 설비를 선택하세요.
        </p>
      </div>
    </main>);
}
