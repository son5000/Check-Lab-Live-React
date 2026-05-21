import { formatCheckLabKoreanDate, formatCheckLabKoreanTime, getCheckLabTimeValue, } from "@/app/layouts/helpers/time-formatters";
import { getAcousticWarningThreshold, getTemperatureWarningThreshold, toAssetThresholdConfig, toThresholdFallback, } from "./asset-threshold-api";
/**
 * 역할
 * - CheckLab API 원본 응답을 설비 대시보드 화면이 바로 쓰는 snapshot으로 변환합니다.
 *
 * 개요
 * - 백엔드 필드명(asset_id, summary_cards 등)을 화면 타입(asset_id, summary 등)으로 정리합니다.
 * - mock DB의 sites/assets/asset_displays/metric_card_configs/asset_parts 같은 원천 테이블이
 *   mock-dashboard 응답 안에서는 header, summary_cards, monitored_parts 같은 화면 단위로 이미 집계되어 옵니다.
 * - 온도/초음파 카드, 추이 차트, 파트, 이벤트를 각 패널 props 형태에 맞게 가공합니다.
 * - API가 일부 값을 비워 보내도 화면에서 빈 상태/기본값으로 안전하게 표시되도록 fallback을 만듭니다.
 *
 * STEP 1. summary_cards를 요약 KPI로 변환합니다.
 * STEP 2. threshold_panel과 monitored_parts로 파트/판정 상태를 만듭니다.
 * STEP 3. trend_charts와 alerts/event_timeline/recent_events를 차트/이벤트 패널용 데이터로 변환합니다.
 *
 * 사용처
 * - 서버 page.tsx와 /api/asset-dashboard/[asset_id] 프록시 route가 호출합니다.
 * - 변환 결과는 AssetDashboardPage를 거쳐 AssetCameraPanel, AssetSummaryPanel,
 *   AssetTrendPanel, AssetEventLogPanel, DashboardHeader에서 사용됩니다.
 */
/**
 * 변환 결과
 * - asset_id: 현재 snapshot의 CheckLab 자산 ID입니다.
 * - clock: HeaderClock 날짜/시간 override 값입니다.
 * - header: 설비명, 위치, 전체 판정, 이벤트 판정, 미해결 알림 수입니다.
 * - cameraFeeds: 카메라 스트림 목록입니다.
 * - initialThresholds: 설비 온도/초음파 임계치입니다.
 * - initialAssetParts/States: 파트 설정과 현재 판정 상태입니다.
 * - summary: 온도/초음파 요약 KPI입니다.
 * - trend: 온도/초음파 추이 데이터와 임계 기준선입니다.
 * - recentEvents: 알림과 이벤트 타임라인을 합친 이벤트 로그입니다.
 */
export function toAssetDashboardRemoteSnapshot(response) {
    const summary = toSummarySnapshot(response.summary_cards ?? []);
    const initialThresholds = toAssetThresholdConfig(response.threshold_panel);
    const thresholdFallback = initialThresholds ?? toThresholdFallback(response.threshold_panel);
    const monitoredParts = response.monitored_parts ?? response.monitored_regions ?? [];
    const initialAssetParts = toAssetParts(monitoredParts, thresholdFallback);
    const initialAssetPartStates = toAssetPartStates(monitoredParts, response.threshold_panel);
    const trend = toTrendSnapshot(response.trend_charts ?? [], response.threshold_panel);
    return {
        asset_id: response.asset_id,
        cameraFeeds: response.camera ? [toCameraFeed(response.camera)] : undefined,
        clock: {
            currentDate: formatCheckLabKoreanDate(response.header?.latest_updated_at) ??
                response.header?.reference_date_text ??
                undefined,
            currentTime: formatCheckLabKoreanTime(response.header?.current_time_text ??
                response.header?.latest_updated_at) ?? undefined,
        },
        header: toHeaderSnapshot(response.header),
        initialAssetParts,
        initialAssetPartStates,
        initialThresholds,
        recentEvents: toRecentEvents({
            alerts: response.alerts,
            eventTimeline: response.event_timeline,
            recentEvents: response.recent_events,
        }),
        summary,
        trend,
    };
}
/**
 * 헤더 변환
 * - 원천 테이블: sites, assets, asset_displays, alerts, system_events
 * - AssetStatusTitlePanel: 설비명, 위치, 현재 상태 판정, 이벤트 판정에 사용합니다.
 * - DashboardHeader/HeaderStatusSummary: 선택 경로, 상태 라벨, 최근 수집 시각, 미해결 알림 수에 사용합니다.
 */
function toHeaderSnapshot(header) {
    if (!header) {
        return undefined;
    }
    const dashboardStatus = toDashboardStatus(header.overall_status);
    const eventJudgmentGrade = toEventGrade(header.event_judgment_label);
    return {
        assetName: header.asset_name ?? undefined,
        dashboardStatus,
        eventJudgmentGrade,
        eventJudgmentLabel: header.event_judgment_label ?? undefined,
        lastCollectedAt: formatCheckLabKoreanTime(header.current_time_text ?? header.latest_updated_at) ?? undefined,
        locationLabel: header.location_label ?? undefined,
        overallStatusLabel: header.overall_status_label ?? undefined,
        path: splitBreadcrumb(header.breadcrumb),
        recentAlertCount: header.recent_alert_count ?? undefined,
        statusJudgement: toTemperatureJudgement(header.overall_status),
    };
}
/**
 * 카메라 변환
 * - 원천 테이블: asset_displays
 * - AssetCameraPanel의 카메라 선택 탭, 스트림 상태 메시지, 실제 영상 URL로 사용합니다.
 */
function toCameraFeed(camera) {
    const label = camera.camera_name ?? camera.camera_id ?? "CAM";
    return {
        id: camera.camera_id ?? "camera",
        label,
        name: camera.camera_name ?? label,
        streamMessage: camera.stream_message ?? undefined,
        streamState: camera.stream_state ?? undefined,
        streamUrl: camera.stream_url ?? null,
    };
}
/**
 * 요약 KPI 변환
 * - 원천 테이블: metric_card_configs, observations, roi_values, asset_thresholds
 * - 평균 온도, 온도 최대/최소, 초음파 평균/피크, 검출 개수, 주파수 대역을 뽑습니다.
 * - AssetSummaryPanel의 TemperatureMetricCard, UltrasoundMetricCard에서 사용합니다.
 */
function toSummarySnapshot(summaryCards) {
    const averageTemperatureCard = findSummaryCard(summaryCards, [
        "avg-temperature",
        "temperature",
    ]);
    const averageAcousticCard = findSummaryCard(summaryCards, [
        "avg-acoustic",
        "acoustic",
        "ultrasound",
    ]);
    const thermalRangeCard = findSummaryCard(summaryCards, [
        "thermal-range",
        "temperature-range",
    ]);
    const peakAcousticCard = findSummaryCard(summaryCards, [
        "peak-acoustic",
        "peak-ultrasound",
    ]);
    const dominantFrequencyKHz = parseFirstNumber(peakAcousticCard?.summary_label);
    return {
        averageTemperature: toFiniteNumber(averageTemperatureCard?.display_value),
        dominantFrequencyKHz,
        frequencyBandKHz: parseFrequencyBand(peakAcousticCard?.summary_label),
        temperatureMax: toFiniteNumber(thermalRangeCard?.secondary_value ?? thermalRangeCard?.max_value),
        temperatureMin: toFiniteNumber(thermalRangeCard?.display_value ?? thermalRangeCard?.min_value),
        ultrasoundAverageDb: toFiniteNumber(averageAcousticCard?.display_value),
        ultrasoundDetectionCount: parseDetectionCount(averageAcousticCard?.summary_label),
        ultrasoundPeakDb: toFiniteNumber(peakAcousticCard?.display_value ?? averageAcousticCard?.max_value),
    };
}
/**
 * 추이 차트 변환
 * - 원천 테이블: observations, roi_values, asset_displays, asset_thresholds
 * - 온도/초음파 차트를 찾아 AssetTrendPanel의 라인 데이터와 임계 기준선으로 바꿉니다.
 */
function toTrendSnapshot(trendCharts, thresholdPanel) {
    const acousticChart = findTrendChart(trendCharts, [
        "acoustic",
        "ultrasound",
    ]);
    const thermalChart = findTrendChart(trendCharts, ["thermal", "temperature"]);
    const selectedRangeId = acousticChart?.selected_window ?? thermalChart?.selected_window ?? undefined;
    return {
        selectedRangeId,
        temperatureData: thermalChart ? toTrendPoints(thermalChart) : undefined,
        temperatureReferenceLines: thermalChart
            ? toReferenceLines(thermalChart, "var(--asset-temperature-maximum-stroke)", getTemperatureWarningThreshold(thresholdPanel))
            : undefined,
        ultrasonicData: acousticChart ? toTrendPoints(acousticChart) : undefined,
        ultrasonicReferenceLines: acousticChart
            ? toReferenceLines(acousticChart, "var(--asset-ultrasound-maximum-stroke)", getAcousticWarningThreshold(thresholdPanel))
            : undefined,
    };
}
function toTrendPoints(chart) {
    const points = chart.points?.filter((point) => isFiniteNumber(point.value));
    if (!points?.length) {
        return [];
    }
    return points.map((point, index) => {
        const value = roundOne(point.value ?? 0);
        return {
            average: value,
            max: value,
            min: value,
            peakFrequency: undefined,
            time: formatCheckLabKoreanTime(point.observed_at) ??
                formatTrendPointLabel(chart.selected_window, index, points.length),
        };
    });
}
function toReferenceLines(chart, stroke, thresholdValue) {
    const value = thresholdValue ?? chart.threshold_value;
    if (!isFiniteNumber(value)) {
        return [];
    }
    return [
        {
            label: `${chart.metric_label ?? chart.title ?? "임계"} 임계`,
            value,
            stroke,
        },
    ];
}
/**
 * 파트 변환
 * - 원천 테이블: asset_parts, observations, roi_values
 * - CheckLab monitored_parts를 화면의 AssetPartConfig로 바꿉니다.
 * - AssetCameraPanel 오버레이와 AssetPartList 항목으로 사용합니다.
 */
function toAssetParts(parts, thresholdFallback) {
    return parts.map((part, index) => {
        const partId = getApiPartId(part, index);
        const isAcoustic = part.sensor_type === "acoustic";
        const threshold = part.threshold_value ?? 0;
        return {
            id: partId,
            linkedAlarm: true,
            mode: "points",
            name: part.label ?? `파트 ${index + 1}`,
            points: [
                {
                    id: `${partId}-point`,
                    x: 28 + (index % 3) * 22,
                    y: 34 + (index % 2) * 24,
                },
            ],
            thresholds: {
                ...thresholdFallback,
                temperature: isAcoustic
                    ? thresholdFallback.temperature
                    : threshold || thresholdFallback.temperature,
                ultrasoundDb: isAcoustic
                    ? threshold || thresholdFallback.ultrasoundDb
                    : thresholdFallback.ultrasoundDb,
            },
        };
    });
}
/**
 * 파트 상태 변환
 * - 원천 테이블: asset_parts, observations, roi_values, asset_thresholds
 * - part.display_value를 sensor_type에 따라 온도 또는 초음파 현재값으로 해석합니다.
 * - SummaryPanel의 감지 데이터 카드와 AssetPartList의 판정 배지에서 사용합니다.
 */
function toAssetPartStates(parts, thresholdPanel) {
    return parts.map((part, index) => {
        const id = getApiPartId(part, index);
        const value = part.display_value ?? 0;
        const judgement = toPartJudgement(part, thresholdPanel);
        if (part.sensor_type === "acoustic") {
            return {
                partId: id,
                dominantFrequencyKHz: 0,
                judgement,
                temperatureAverage: 0,
                temperatureMax: 0,
                ultrasoundPeakDb: roundOne(value),
            };
        }
        return {
            partId: id,
            dominantFrequencyKHz: 0,
            judgement,
            temperatureAverage: roundOne(value),
            temperatureMax: roundOne(value),
            ultrasoundPeakDb: 0,
        };
    });
}
/**
 * 이벤트 변환
 * - 원천 테이블: alerts, alert_read_events, system_events
 * - alerts와 event_timeline이 있으면 두 목록을 합쳐 최신순으로 정렬합니다.
 * - 둘 다 없으면 mock-dashboard의 recent_events를 fallback으로 사용합니다.
 * - AssetEventLogPanel, EventLogBlindDrawer, 전역 알림 목록에서 사용합니다.
 */
function toRecentEvents({ alerts, eventTimeline, recentEvents, }) {
    if (alerts || eventTimeline) {
        return dedupeEventsById([
            ...(alerts ?? []).map(toAlertEvent),
            ...(eventTimeline ?? []).map(toTimelineEvent),
        ]).sort(compareEventsByTimestampDesc);
    }
    return dedupeEventsById((recentEvents ?? []).map((event, index) => {
        const grade = toEventGrade(event.severity);
        const isAlert = event.event_type === "alert" || event.source_type === "alert";
        return {
            globalAlert: grade !== "normal",
            grade,
            id: event.event_id ?? `remote-event-${index + 1}`,
            message: event.message ?? "이벤트 메시지가 없습니다.",
            occurredAt: formatCheckLabKoreanTime(event.observed_at) ?? "--:--:--",
            occurredAtIso: event.observed_at ?? undefined,
            source: isAlert ? "asset-threshold" : "system",
            sourceType: event.source_type ?? undefined,
            title: isAlert ? "임계 알림" : "시스템 이벤트",
        };
    })).sort(compareEventsByTimestampDesc);
}
function toAlertEvent(alert, index) {
    const grade = toEventGrade(alert.severity);
    const id = alert.alert_id ?? `remote-alert-${index + 1}`;
    return {
        alertId: alert.alert_id ?? undefined,
        asset_id: alert.asset_id ?? undefined,
        globalAlert: grade !== "normal",
        grade,
        id,
        isRead: Boolean(alert.is_read),
        message: alert.message ?? "알림 메시지가 없습니다.",
        occurredAt: formatCheckLabKoreanTime(alert.created_at) ?? "--:--:--",
        occurredAtIso: alert.created_at ?? undefined,
        readAt: formatCheckLabKoreanTime(alert.read_at) ?? undefined,
        readBy: alert.read_by ?? undefined,
        source: "asset-threshold",
        sourceType: "alert",
        title: "임계 알림",
    };
}
function toTimelineEvent(event, index) {
    const grade = toEventGrade(event.severity);
    return {
        edgeId: event.edge_id ?? undefined,
        eventType: event.event_type ?? undefined,
        globalAlert: grade !== "normal",
        grade,
        id: event.event_id ?? `remote-timeline-event-${index + 1}`,
        isRead: Boolean(event.is_read),
        message: event.message ?? "이벤트 메시지가 없습니다.",
        occurredAt: formatCheckLabKoreanTime(event.observed_at) ?? "--:--:--",
        occurredAtIso: event.observed_at ?? undefined,
        readAt: formatCheckLabKoreanTime(event.read_at) ?? undefined,
        readBy: event.read_by ?? undefined,
        roiId: event.roi_id ?? undefined,
        source: "system",
        sourceType: event.source_type ?? undefined,
        title: toEventTitle(event),
        xNorm: toFiniteNumber(event.x_norm),
        yNorm: toFiniteNumber(event.y_norm),
    };
}
function dedupeEventsById(events) {
    const eventById = new Map();
    events.forEach((event) => {
        const currentEvent = eventById.get(event.id);
        eventById.set(event.id, currentEvent ? mergeDuplicateEvent(currentEvent, event) : event);
    });
    return Array.from(eventById.values());
}
function mergeDuplicateEvent(currentEvent, nextEvent) {
    const preferredEvent = getDuplicateEventPriority(nextEvent) > getDuplicateEventPriority(currentEvent)
        ? nextEvent
        : currentEvent;
    const fallbackEvent = preferredEvent === currentEvent ? nextEvent : currentEvent;
    return {
        ...fallbackEvent,
        ...preferredEvent,
        alertId: preferredEvent.alertId ?? fallbackEvent.alertId,
        asset_id: preferredEvent.asset_id ?? fallbackEvent.asset_id,
        globalAlert: Boolean(preferredEvent.globalAlert || fallbackEvent.globalAlert),
        isRead: Boolean(preferredEvent.isRead || fallbackEvent.isRead),
        occurredAtIso: preferredEvent.occurredAtIso ?? fallbackEvent.occurredAtIso,
        readAt: preferredEvent.readAt ?? fallbackEvent.readAt,
        readBy: preferredEvent.readBy ?? fallbackEvent.readBy,
        sourceType: preferredEvent.sourceType ?? fallbackEvent.sourceType,
    };
}
function getDuplicateEventPriority(event) {
    return ((event.source === "asset-threshold" ? 100 : 0) +
        (event.alertId ? 50 : 0) +
        (event.isRead ? 10 : 0) +
        (event.readAt ? 5 : 0) +
        getCheckLabTimeValue(event.occurredAtIso) / 10000000000000);
}
function toPartJudgement(part, thresholdPanel) {
    const value = part.display_value ?? 0;
    const warning = getPartWarningThreshold(part, thresholdPanel);
    const critical = part.sensor_type === "acoustic"
        ? thresholdPanel?.acoustic_critical_db
        : thresholdPanel?.temperature_critical_c;
    if (isFiniteNumber(critical) && value >= critical) {
        return "abnormal";
    }
    if (isFiniteNumber(warning) && warning > 0 && value >= warning) {
        return "caution";
    }
    return toTemperatureJudgement(part.status_label);
}
function getPartWarningThreshold(part, thresholdPanel) {
    if (isFiniteNumber(part.threshold_value) && part.threshold_value > 0) {
        return part.threshold_value;
    }
    return part.sensor_type === "acoustic"
        ? getAcousticWarningThreshold(thresholdPanel)
        : getTemperatureWarningThreshold(thresholdPanel);
}
function getApiPartId(part, index) {
    return part.part_id ?? part.region_id ?? `remote-part-${index + 1}`;
}
function findSummaryCard(cards, ids) {
    return cards.find((card) => {
        const cardId = card.card_id?.toLowerCase() ?? "";
        const title = card.title?.toLowerCase() ?? "";
        return ids.some((id) => cardId.includes(id) || title.includes(id));
    });
}
function findTrendChart(charts, ids) {
    return charts.find((chart) => {
        const chartId = chart.chart_id?.toLowerCase() ?? "";
        const title = chart.title?.toLowerCase() ?? "";
        const metricLabel = chart.metric_label?.toLowerCase() ?? "";
        return ids.some((id) => chartId.includes(id) ||
            title.includes(id) ||
            metricLabel.includes(id));
    });
}
function splitBreadcrumb(breadcrumb) {
    return breadcrumb
        ?.split(">")
        .map((part) => part.trim())
        .filter(Boolean);
}
function toDashboardStatus(status) {
    const normalizedStatus = normalize(status);
    if (normalizedStatus === "critical" ||
        normalizedStatus === "danger" ||
        normalizedStatus === "high" ||
        normalizedStatus === "abnormal" ||
        normalizedStatus === "위험" ||
        normalizedStatus === "이상") {
        return "danger";
    }
    if (normalizedStatus === "warning" ||
        normalizedStatus === "medium" ||
        normalizedStatus === "caution" ||
        normalizedStatus === "주의" ||
        normalizedStatus === "요주의") {
        return "warning";
    }
    if (normalizedStatus === "error") {
        return "error";
    }
    return "normal";
}
function toTemperatureJudgement(status) {
    const normalizedStatus = normalize(status);
    if (normalizedStatus === "critical" ||
        normalizedStatus === "danger" ||
        normalizedStatus === "high" ||
        normalizedStatus === "abnormal" ||
        normalizedStatus === "위험" ||
        normalizedStatus === "이상") {
        return "abnormal";
    }
    if (normalizedStatus === "warning" ||
        normalizedStatus === "medium" ||
        normalizedStatus === "caution" ||
        normalizedStatus === "높음" ||
        normalizedStatus === "주의" ||
        normalizedStatus === "요주의") {
        return "caution";
    }
    return "normal";
}
function toEventGrade(status) {
    return toTemperatureJudgement(status);
}
function toEventTitle(event) {
    const normalizedType = normalize(event.event_type ?? event.source_type);
    if (normalizedType.includes("alert")) {
        return "임계 알림";
    }
    if (normalizedType.includes("system")) {
        return "시스템 이벤트";
    }
    return "이벤트 타임라인";
}
function compareEventsByTimestampDesc(firstEvent, secondEvent) {
    return (getCheckLabTimeValue(secondEvent.occurredAtIso) -
        getCheckLabTimeValue(firstEvent.occurredAtIso));
}
function formatTrendPointLabel(rangeId, index, total) {
    const distance = total - index - 1;
    if (distance === 0) {
        return "현재";
    }
    const maxByRangeId = {
        "1m": 60,
        "1h": 60,
        "24h": 24,
        "7d": 7,
        "30d": 30,
    };
    const max = maxByRangeId[rangeId ?? "1m"] ?? 60;
    const value = Math.round((max * distance) / Math.max(total - 1, 1));
    return `-${value}`;
}
function parseFrequencyBand(value) {
    const match = value?.match(/(\d+(?:\.\d+)?\s*[-~]\s*\d+(?:\.\d+)?)/);
    return match ? `${match[1].replace(/\s+/g, "")} kHz` : undefined;
}
function parseDetectionCount(value) {
    const match = value?.match(/(\d+)\s*개/);
    return match ? Number(match[1]) : undefined;
}
function parseFirstNumber(value) {
    const match = value?.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : undefined;
}
function toFiniteNumber(value) {
    return isFiniteNumber(value) ? value : undefined;
}
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function normalize(value) {
    return value?.trim().toLowerCase() ?? "";
}
function roundOne(value) {
    return Number(value.toFixed(1));
}
