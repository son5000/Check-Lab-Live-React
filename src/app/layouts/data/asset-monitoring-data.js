/**
 * 역할
 * - 선택 설비 관제 페이지의 샘플 데이터입니다.
 *
 * 개요
 * - 대시보드 본문 섹션은 인라인 샘플 데이터 대신 이 파일을 참조합니다.
 *
 * STEP 1. 정적 설비 판정과 핵심 지표 값을 가까운 위치에 둡니다.
 * STEP 2. 임계치 기본값은 비교 대상 값과 함께 관리합니다.
 * STEP 3. 테이블/목록 레코드는 생성형 차트 시리즈와 분리합니다.
 *
 * 헬퍼
 * - 차트 배열은 시간과 갱신값에 의존하므로 헬퍼 모듈에서 생성합니다.
 */
export const assetJudgementItems = [
    { id: "ultrasonic", name: "초음파", judgement: "정상" },
    { id: "thermal", name: "열화상", judgement: "요주의" },
    { id: "power", name: "전력", judgement: "정상" },
    { id: "temperature", name: "온도", judgement: "이상" },
];
export const assetMetrics = {
    assetName: "배전반 1호기",
    soundDb: 72.4,
    peakDb: 88.7,
    frequencyKHz: 31.5,
    averageTemperature: 48.2,
    maxTemperature: 62.8,
    minTemperature: 35.9,
    operationState: "가동중",
    powerStatus: "전력 공급 정상",
    inputVoltage: "380 V",
    powerUsage: "42.8 kW",
};
export const defaultThresholds = {
    soundDb: 78,
    peakDb: 92,
    averageTemperature: 55,
    maxTemperature: 70,
};
export const temperatureAreas = [
    { id: "A1", name: "단자부", average: 52.1, max: 61.4, min: 44.2, points: "P1 59.2 / P2 47.8" },
    { id: "A2", name: "케이블 인입부", average: 45.8, max: 53.6, min: 39.4, points: "P1 51.0 / P2 41.6" },
    { id: "L1", name: "좌측 포커스", average: 49.5, max: 57.2, min: 42.1, points: "P1 57.2 / P2 43.0" },
    { id: "L2", name: "상단 포커스", average: 47.3, max: 55.0, min: 40.8, points: "P1 52.8 / P2 44.2" },
];
export const alarmRecords = [
    { id: "alarm-1", type: "온도 이상", occurredAt: "05.07 19:32", code: "TMP-402", isConfirmed: false },
    { id: "alarm-2", type: "초음파 상승", occurredAt: "05.07 19:18", code: "US-231", isConfirmed: true },
    { id: "alarm-3", type: "전력 변동", occurredAt: "05.07 18:54", code: "PWR-118", isConfirmed: false },
];
export const trendRanges = [
    { id: "1m", label: "1m", points: 12 },
    { id: "30m", label: "30m", points: 15 },
    { id: "1h", label: "1h", points: 12 },
    { id: "24h", label: "24h", points: 12 },
    { id: "7d", label: "7d", points: 14 },
];
