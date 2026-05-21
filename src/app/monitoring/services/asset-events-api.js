import { buildCheckLabApiUrl, buildCheckLabAssetUrl, requestCheckLabJson, } from "./checklab-api-client";
/**
 * API
 * - GET /api/v1/assets/{asset_id}/events?limit={limit}
 *
 * 불러오는 값
 * - system_events 테이블의 자산별 센서/엣지 이벤트 타임라인입니다.
 *
 * 사용 컴포넌트
 * - AssetEventLogPanel의 목록/상세와 AssetDashboardPage의 전역 알림 계산에서 사용합니다.
 */
export async function fetchAssetEvents(asset_id, { limit = 100 } = {}) {
    const url = buildCheckLabAssetUrl(asset_id, "events", { limit });
    return requestCheckLabJson(url, {
        context: { asset_id, limit },
        requestName: "asset events",
    });
}
/**
 * API
 * - PUT /api/v1/events/{eventId}/read
 *
 * 저장하는 값
 * - read_by: 이벤트 상세를 열람 처리한 사용자 ID입니다.
 * - 백엔드는 system_events.read_at/read_by/is_read를 갱신하고
 *   system_event_read_events에 감사 row를 추가합니다.
 *
 * 사용 컴포넌트
 * - AssetEventLogPanel에서 일반 system 이벤트를 열었을 때 AssetDashboardPage.handleEventRead가 호출합니다.
 */
export async function markEventRead(eventId, readBy) {
    const url = buildCheckLabApiUrl(`api/v1/events/${encodeURIComponent(eventId)}/read`);
    return requestCheckLabJson(url, {
        body: { read_by: readBy },
        context: { eventId },
        method: "PUT",
        requestName: "event read",
    });
}
