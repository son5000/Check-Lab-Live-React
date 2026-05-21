export const DASHBOARD_TIME_ZONE = "Asia/Seoul";
const backendTimeOnlyPattern = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const backendDateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const backendDateTimePattern = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
const explicitTimeZonePattern = /(?:z|[+-]\d{2}:?\d{2})$/i;
/**
 * 역할
 * - 대시보드에서 쓰는 모든 날짜/시간 표시를 한국 시간(KST) 기준으로 맞춥니다.
 *
 * 개요
 * - DB/API가 `02:07:35`, `2026-05-15T02:07:35`처럼 UTC 기준 값을 보내면
 *   화면에서는 `11:07:35`처럼 Asia/Seoul 기준으로 변환해서 보여줍니다.
 * - 이미 `Z`, `+00:00` 같은 타임존이 붙은 값은 그 기준을 그대로 존중합니다.
 *
 * 헬퍼
 * - 정렬이나 최신순 비교도 같은 파서(getCheckLabTimeValue)를 사용해야 표시 시간과 어긋나지 않습니다.
 */
export function createDashboardDateFormatter() {
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: DASHBOARD_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
    });
}
export function createDashboardTimeFormatter() {
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: DASHBOARD_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });
}
const dashboardDateFormatter = createDashboardDateFormatter();
const dashboardTimeFormatter = createDashboardTimeFormatter();
const dashboardDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});
export function formatCheckLabKoreanDate(value) {
    const date = parseCheckLabUtcDate(value);
    return date ? dashboardDateFormatter.format(date) : undefined;
}
export function formatCheckLabKoreanTime(value) {
    const date = parseCheckLabUtcDate(value);
    return date ? dashboardTimeFormatter.format(date) : undefined;
}
export function formatCheckLabKoreanDateTime(value) {
    const date = parseCheckLabUtcDate(value);
    return date ? `${dashboardDateTimeFormatter.format(date)} KST` : undefined;
}
export function getCheckLabTimeValue(value) {
    return parseCheckLabUtcDate(value)?.getTime() ?? 0;
}
function parseCheckLabUtcDate(value) {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
        return null;
    }
    const timeOnlyMatch = trimmedValue.match(backendTimeOnlyPattern);
    if (timeOnlyMatch) {
        const [, hour, minute, second = "0"] = timeOnlyMatch;
        return createValidDate(Date.UTC(1970, 0, 1, Number(hour), Number(minute), Number(second)));
    }
    const dateOnlyMatch = trimmedValue.match(backendDateOnlyPattern);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return createValidDate(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
    const normalizedValue = normalizeBackendDateTime(trimmedValue);
    const parsedTime = Date.parse(normalizedValue);
    return createValidDate(parsedTime);
}
function normalizeBackendDateTime(value) {
    const normalizedValue = value.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
    if (backendDateTimePattern.test(normalizedValue) &&
        !explicitTimeZonePattern.test(normalizedValue)) {
        return `${normalizedValue}Z`;
    }
    return normalizedValue;
}
function createValidDate(time) {
    return Number.isFinite(time) ? new Date(time) : null;
}
