import { fetchAssetAlerts } from "./asset-alerts-api";
import { fetchAssetEvents } from "./asset-events-api";
import { fetchAssetThresholds } from "./asset-threshold-api";
import { buildCheckLabAssetUrl, requestCheckLabJson, } from "./checklab-api-client";
/**
 * API
 * - GET /api/v1/assets/{asset_id}/mock-dashboard
 * - GET /api/v1/assets/{asset_id}/thresholds
 * - GET /api/v1/alerts?asset_id={asset_id}&limit=20
 * - GET /api/v1/assets/{asset_id}/events?limit=100
 *
 * 불러오는 값
 * - 대시보드 기본 snapshot에 최신 임계치, 알림, 이벤트 타임라인을 합칩니다.
 *
 * 사용 컴포넌트
 * - AssetDashboardPage가 서버 초기값과 클라이언트 갱신값으로 사용합니다.
 */
export async function fetchAssetDashboard(asset_id) {
    const [dashboard, thresholdPanel, alerts, eventTimeline] = await Promise.all([
        fetchAssetDashboardSnapshot(asset_id),
        fetchAssetThresholds(asset_id).catch((error) => {
            console.warn("[CheckLab API] asset thresholds unavailable", {
                asset_id,
                error,
            });
            return null;
        }),
        fetchAssetAlerts(asset_id).catch((error) => {
            console.warn("[CheckLab API] asset alerts unavailable", {
                asset_id,
                error,
            });
            return null;
        }),
        fetchAssetEvents(asset_id).catch((error) => {
            console.warn("[CheckLab API] asset events unavailable", {
                asset_id,
                error,
            });
            return null;
        }),
    ]);
    return {
        ...dashboard,
        alerts: alerts ?? dashboard.alerts,
        event_timeline: eventTimeline ?? dashboard.event_timeline,
        threshold_panel: thresholdPanel
            ? {
                ...dashboard.threshold_panel,
                ...thresholdPanel,
            }
            : dashboard.threshold_panel,
    };
}
async function fetchAssetDashboardSnapshot(asset_id) {
    return requestCheckLabJson(buildCheckLabAssetUrl(asset_id, "mock-dashboard"), {
        context: { asset_id },
        requestName: "asset dashboard",
    });
}
