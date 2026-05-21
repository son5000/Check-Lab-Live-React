import { buildCheckLabApiUrl, requestCheckLabJson, } from "./checklab-api-client";
export async function fetchAlerts({ asset_id, isRead, limit = 20, severity, } = {}) {
    const url = buildCheckLabApiUrl("api/v1/alerts", {
        asset_id: asset_id,
        is_read: isRead,
        limit,
        severity: severity?.length ? severity.join(",") : undefined,
    });
    return requestCheckLabJson(url, {
        context: { asset_id, isRead, limit, severity },
        requestName: asset_id ? "asset alerts" : "global alerts",
    });
}
/**
 * API
 * - GET /api/v1/alerts?asset_id={asset_id}&limit={limit}
 *
 * 불러오는 값
 * - alerts 테이블의 설비 기준 최신 알림 목록입니다.
 *
 * 사용 컴포넌트
 * - AssetEventLogPanel의 이벤트 목록과 HeaderStatusSummary의 미해결 알림 수 계산에 사용합니다.
 */
export async function fetchAssetAlerts(asset_id, { limit = 20 } = {}) {
    return fetchAlerts({ asset_id, limit });
}
/**
 * API
 * - GET /api/v1/alerts?is_read=false&limit={limit}
 *
 * 불러오는 값
 * - 글로벌 알럿에 필요한 미열람 알림 목록입니다.
 *
 * 사용 컴포넌트
 * - useGlobalAlertMonitor가 폴링할 때 전체 알림 대신 활성 알림만 받도록 백엔드가 지원해야 하는 API입니다.
 */
export async function fetchActiveAlerts({ asset_id, limit = 100, } = {}) {
    return fetchAlerts({ asset_id, isRead: false, limit });
}
/**
 * API
 * - GET /api/v1/alerts/summary?asset_id={asset_id}&is_read={isRead}
 *
 * 불러오는 값
 * - 미열람/등급별 알림 수와 최신 알림 시각입니다.
 *
 * 사용 컴포넌트
 * - HeaderStatusSummary, 글로벌 알림 배지, 설비 목록 카운터에서 목록 전체를 받지 않고 카운트만 쓸 때 사용합니다.
 */
export async function fetchAlertSummary({ asset_id, isRead, } = {}) {
    const url = buildCheckLabApiUrl("api/v1/alerts/summary", {
        asset_id: asset_id,
        is_read: isRead,
    });
    return requestCheckLabJson(url, {
        context: { asset_id, isRead },
        requestName: asset_id ? "asset alert summary" : "global alert summary",
    });
}
/**
 * API
 * - PUT /api/v1/alerts/{alertId}/read
 *
 * 저장하는 값
 * - read_by: 열람 처리한 사용자 ID입니다.
 * - 백엔드는 alerts.read_at/read_by를 갱신하고 alert_read_events에 감사 row를 추가합니다.
 *
 * 사용 컴포넌트
 * - AssetEventLogPanel에서 알림 이벤트를 열었을 때 AssetDashboardPage.handleEventRead가 호출합니다.
 */
export async function markAlertRead(alertId, readBy) {
    const url = buildCheckLabApiUrl(`api/v1/alerts/${encodeURIComponent(alertId)}/read`);
    return requestCheckLabJson(url, {
        body: { read_by: readBy },
        context: { alertId },
        method: "PUT",
        requestName: "alert read",
    });
}
/**
 * API
 * - PUT /api/v1/alerts/read
 *
 * 저장하는 값
 * - alert_ids: 지정 알림들을 열람 처리합니다.
 * - asset_id: 지정 설비의 알림들을 열람 처리합니다.
 * - read_by/read_at: 백엔드가 alerts와 alert_read_events에 반영합니다.
 *
 * 사용 컴포넌트
 * - 사용자가 설비 상세를 보고 조치에 들어간 뒤, 같은 설비의 미열람 알림을 한 번에 열람 처리할 때 사용합니다.
 */
export async function markAlertsRead(request) {
    const url = buildCheckLabApiUrl("api/v1/alerts/read");
    return requestCheckLabJson(url, {
        body: {
            only_unread: true,
            ...request,
        },
        context: {
            alertCount: request.alert_ids?.length,
            asset_id: request.asset_id,
            onlyUnread: request.only_unread ?? true,
        },
        method: "PUT",
        requestName: "bulk alert read",
    });
}
/**
 * API
 * - POST /api/v1/alert-suppressions
 *
 * 저장하는 값
 * - asset_id/suppressed_by/suppressed_until/reason을 alert_suppressions에 저장합니다.
 *
 * 사용 컴포넌트
 * - 글로벌 알럿을 열람한 뒤 같은 설비 반복 알림을 몇 분간 서버 기준으로 숨길 때 사용합니다.
 */
export async function createAlertSuppression(request) {
    const url = buildCheckLabApiUrl("api/v1/alert-suppressions");
    return requestCheckLabJson(url, {
        body: request,
        context: {
            asset_id: request.asset_id,
            durationSeconds: request.duration_seconds,
            suppressedBy: request.suppressed_by,
        },
        method: "POST",
        requestName: "alert suppression",
    });
}
