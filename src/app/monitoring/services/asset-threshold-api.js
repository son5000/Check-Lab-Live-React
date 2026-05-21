import { buildCheckLabAssetUrl, requestCheckLabJson, } from "./checklab-api-client";
/**
 * API
 * - GET /api/v1/assets/{asset_id}/thresholds
 *
 * 불러오는 값
 * - asset_thresholds의 temperature/acoustic warn·critical 임계치와 설정 여부입니다.
 *
 * 사용 컴포넌트
 * - ThresholdEditor의 초기값, AssetTrendPanel 기준선, SummaryPanel/AssetPartList 판정 계산에 사용합니다.
 */
export async function fetchAssetThresholds(asset_id) {
    const url = buildCheckLabAssetUrl(asset_id, "thresholds");
    const data = await requestCheckLabJson(url, {
        context: { asset_id },
        requestName: "asset thresholds",
    });
    warnIfAssetMismatch(data.asset_id, asset_id, url);
    return toThresholdPanel(data);
}
/**
 * API
 * - PUT /api/v1/assets/{asset_id}/thresholds
 *
 * 저장하는 값
 * - temperature_warn_c/temperature_critical_c: 온도 경고·위험 임계치입니다.
 * - acoustic_warn_db/acoustic_critical_db: 초음파 경고·위험 임계치입니다.
 * - updated_by: 저장자 ID입니다.
 * - 백엔드는 이 값을 asset_thresholds의 sensor_type, threshold_level별 row로 저장합니다.
 *
 * 사용 컴포넌트
 * - ThresholdEditor 저장 버튼을 누르면 AssetDashboardPage.handleAssetThresholdSave가 호출합니다.
 */
export async function updateAssetThresholds(asset_id, thresholds) {
    const url = buildCheckLabAssetUrl(asset_id, "thresholds");
    const data = await requestCheckLabJson(url, {
        body: thresholds,
        context: { asset_id },
        method: "PUT",
        requestName: "asset thresholds update",
    });
    warnIfAssetMismatch(data.asset_id, asset_id, url);
    return toThresholdPanel(data);
}
/**
 * 역할
 * - 백엔드 threshold_panel을 화면 공통 AssetThresholdConfig로 변환합니다.
 *
 * 사용처
 * - AssetSummaryPanel, AssetCameraPanel, AssetTrendPanel이 같은 임계치 구조를 공유합니다.
 */
export function toAssetThresholdConfig(thresholdPanel) {
    if (!thresholdPanel) {
        return undefined;
    }
    if (thresholdPanel.is_configured === false) {
        return null;
    }
    const temperature = thresholdPanel.temperature_warn_c ?? thresholdPanel.temperature_critical_c;
    const ultrasoundDb = thresholdPanel.acoustic_warn_db ?? thresholdPanel.acoustic_critical_db;
    if (!isFiniteNumber(temperature) || !isFiniteNumber(ultrasoundDb)) {
        return undefined;
    }
    return {
        temperature,
        temperatureCritical: toFiniteNumber(thresholdPanel.temperature_critical_c),
        ultrasoundDb,
        ultrasoundCriticalDb: toFiniteNumber(thresholdPanel.acoustic_critical_db),
    };
}
/**
 * 역할
 * - 임계치가 일부만 오거나 미설정인 경우 파트 생성에 쓸 안전한 기본값을 만듭니다.
 */
export function toThresholdFallback(thresholdPanel) {
    if (!thresholdPanel || thresholdPanel.is_configured === false) {
        return {
            temperature: 0,
            ultrasoundDb: 0,
        };
    }
    return {
        temperature: getTemperatureWarningThreshold(thresholdPanel) ??
            thresholdPanel.temperature_critical_c ??
            0,
        temperatureCritical: toFiniteNumber(thresholdPanel.temperature_critical_c),
        ultrasoundDb: getAcousticWarningThreshold(thresholdPanel) ??
            thresholdPanel.acoustic_critical_db ??
            0,
        ultrasoundCriticalDb: toFiniteNumber(thresholdPanel.acoustic_critical_db),
    };
}
export function getTemperatureWarningThreshold(thresholdPanel) {
    return toFiniteNumber(thresholdPanel?.temperature_warn_c);
}
export function getAcousticWarningThreshold(thresholdPanel) {
    return toFiniteNumber(thresholdPanel?.acoustic_warn_db);
}
function toThresholdPanel(data) {
    return {
        acoustic_critical_db: data.acoustic_critical_db,
        acoustic_warn_db: data.acoustic_warn_db,
        is_configured: data.is_configured,
        needs_attention: data.needs_attention,
        temperature_critical_c: data.temperature_critical_c,
        temperature_warn_c: data.temperature_warn_c,
        updated_at: data.updated_at,
        updated_by: data.updated_by,
    };
}
function warnIfAssetMismatch(responseAssetId, asset_id, url) {
    if (!responseAssetId || responseAssetId === asset_id) {
        return;
    }
    console.warn("[CheckLab API] asset thresholds asset mismatch", {
        asset_id,
        responseAssetId,
        url: String(url),
    });
}
function toFiniteNumber(value) {
    return isFiniteNumber(value) ? value : undefined;
}
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
