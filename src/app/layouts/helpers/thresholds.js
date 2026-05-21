/**
 * 역할
 * - 텔레메트리 카드와 차트를 위한 임계치 계산 파이프라인입니다.
 *
 * 개요
 * - 원본 설비 지표와 편집 가능한 임계치를 화면용 뷰 모델로 변환합니다.
 *
 * STEP 1. 숫자 편집기에 표시할 임계치 행을 만듭니다.
 * STEP 2. 초과 행 수를 세고 대시보드 판정 라벨을 계산합니다.
 * STEP 3. 추이 차트에 사용할 기준선 설정을 만듭니다.
 *
 * 헬퍼
 * - 이 헬퍼들은 순수 함수라 화면 변경 없이 조회 선택자로 옮길 수 있습니다.
 */
export function buildThresholdMetrics(assetMetrics, thresholds) {
    return [
        {
            id: "soundDb",
            group: "초음파",
            label: "평균 dB",
            value: assetMetrics.soundDb,
            threshold: thresholds.soundDb,
            unit: "dB",
        },
        {
            id: "peakDb",
            group: "초음파",
            label: "Peak dB",
            value: assetMetrics.peakDb,
            threshold: thresholds.peakDb,
            unit: "dB",
        },
        {
            id: "averageTemperature",
            group: "열화상",
            label: "평균 온도",
            value: assetMetrics.averageTemperature,
            threshold: thresholds.averageTemperature,
            unit: "℃",
        },
        {
            id: "maxTemperature",
            group: "열화상",
            label: "최고 온도",
            value: assetMetrics.maxTemperature,
            threshold: thresholds.maxTemperature,
            unit: "℃",
        },
    ];
}
export function countExceededMetrics(thresholdMetrics) {
    return thresholdMetrics.filter((thresholdMetric) => thresholdMetric.value > thresholdMetric.threshold).length;
}
export function getDataJudgement(exceededMetricCount) {
    return exceededMetricCount > 0 ? "이상 데이터 감지" : "현재 데이터 정상";
}
export function getAssetJudgement(exceededMetricCount) {
    return exceededMetricCount > 0 ? "이상" : "정상";
}
export function buildUltrasonicReferenceLines(thresholds) {
    return [
        { label: "평균 임계", value: thresholds.soundDb, stroke: "var(--chart-2)" },
        { label: "Peak 임계", value: thresholds.peakDb, stroke: "var(--chart-4)" },
    ];
}
export function buildTemperatureReferenceLines(thresholds) {
    return [
        { label: "평균 임계", value: thresholds.averageTemperature, stroke: "var(--chart-2)" },
        { label: "최고 임계", value: thresholds.maxTemperature, stroke: "var(--chart-4)" },
    ];
}
