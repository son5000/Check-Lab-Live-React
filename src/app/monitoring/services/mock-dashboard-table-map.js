/**
* 역할
* - mock-dashboard-preview.html 기준 DB 테이블과 프론트 화면 영역의 연결 관계를 정리한 맵입니다.
*
* 개요
* - FastAPI mock-dashboard 응답은 하드코딩 화면값이 아니라 mock DB 테이블 값을 집계한 결과입니다.
* - 프론트는 이 집계 응답을 AssetDashboardApiResponse로 받고, adapter에서 화면 props로 변환합니다.
* - 백엔드 테이블/필드가 바뀌었을 때 어떤 프론트 타입과 컴포넌트를 같이 봐야 하는지 빠르게 추적하기 위한 문서형 모듈입니다.
*
* STEP 1. mockDashboardTableMap에서 테이블별 대표 필드와 화면 목적을 봅니다.
* STEP 2. mockDashboardScreenMap에서 화면 영역별 사용 테이블과 프론트 컴포넌트를 봅니다.
* STEP 3. mockDashboardApiMap에서 API별 원천 테이블과 프론트 진입점을 봅니다.
*
* 헬퍼
* - 관련 백엔드 파일은 app/presentation/api/v1/routers/assets.py,
*   app/presentation/api/v1/routers/alerts.py,
*   app/infrastructure/repositories/sqlalchemy_mock.py,
*   app/infrastructure/mock_db/models.py 순서로 읽으면 됩니다.
*/
export const mockDashboardTableMap = {
    alert_read_events: {
        fields: ["alert_id", "read_by", "read_at"],
        purpose: "알림 열람 처리 감사 이력입니다.",
        screenArea: "Recent Alerts 열람 이력",
    },
    alerts: {
        fields: [
            "alert_id",
            "severity",
            "message",
            "created_at",
            "read_at",
            "read_by",
        ],
        purpose: "최근 알림, 미해결 알림 수, 상단 상태 문맥의 원천입니다.",
        screenArea: "Recent Alerts, 글로벌 알림, 상단 상태",
    },
    asset_displays: {
        fields: [
            "breadcrumb",
            "location_label",
            "camera_name",
            "thermal_chart_title",
            "acoustic_chart_title",
        ],
        purpose: "화면에 직접 표시하는 문구와 라벨 메타데이터입니다.",
        screenArea: "브레드크럼, 위치 라벨, 카메라 라벨, 차트 제목",
    },
    asset_thresholds: {
        fields: [
            "asset_id",
            "sensor_type",
            "threshold_level",
            "threshold",
            "updated_by",
            "updated_at",
        ],
        purpose: "온도/초음파 warn, critical 임계치 저장소입니다.",
        screenArea: "Threshold Settings, 차트 임계선, 카드 임계값",
    },
    assets: {
        fields: ["asset_id", "site_id", "name", "location"],
        purpose: "설비 master 정보와 asset lookup 기준입니다.",
        screenArea: "설비명, 설비 상세 라우팅 기준",
    },
    metric_card_configs: {
        fields: ["card_id", "title", "summary_label", "gauge_label", "accent"],
        purpose: "좌측 KPI 카드의 제목, 배지, 요약 문구, 시각 설정입니다.",
        screenArea: "Left Metric Cards",
    },
    observations: {
        fields: ["asset_id", "observed_at", "sensor_type", "value", "unit"],
        purpose: "초음파 시계열, 초음파 카드 값, acoustic part 현재값입니다.",
        screenArea: "Acoustic Trend Chart, 초음파 카드, acoustic monitored part",
    },
    asset_parts: {
        fields: ["part_id", "label", "sensor_type", "unit", "source_metric"],
        purpose: "파트 이름, 센서 타입, 표시 단위, 원천 metric 정의입니다.",
        screenArea: "Monitored Parts",
    },
    roi_values: {
        fields: ["asset_id", "observed_at", "avg", "min", "max", "unit"],
        purpose: "열화상 ROI 시계열, 온도 카드 값, thermal part 현재값입니다.",
        screenArea: "Thermal Trend Chart, 온도 카드, thermal monitored part",
    },
    sites: {
        fields: ["site_id", "name"],
        purpose: "상위 site/factory 정보와 위치 문맥입니다.",
        screenArea: "상단 브레드크럼, 위치 문맥",
    },
    system_events: {
        fields: ["asset_id", "observed_at", "severity", "message"],
        purpose: "백엔드 이벤트 타임라인과 상태 문맥입니다.",
        screenArea: "Event and Status Context",
    },
};
export const mockDashboardScreenMap = [
    {
        apiFields: ["header", "alerts", "event_timeline", "recent_events"],
        components: ["AssetStatusTitlePanel", "DashboardHeader"],
        screenArea: "Top Bar and Hero",
        tables: ["sites", "assets", "asset_displays", "alerts", "system_events"],
    },
    {
        apiFields: ["summary_cards", "threshold_panel"],
        components: [
            "AssetSummaryPanel",
            "TemperatureMetricCard",
            "UltrasoundMetricCard",
        ],
        screenArea: "Left Metric Cards",
        tables: [
            "metric_card_configs",
            "observations",
            "roi_values",
            "asset_thresholds",
        ],
    },
    {
        apiFields: ["trend_charts", "threshold_panel"],
        components: ["AssetTrendPanel", "AssetCombinedTrendChart"],
        screenArea: "Acoustic Trend Chart",
        tables: ["observations", "asset_displays", "asset_thresholds"],
    },
    {
        apiFields: ["trend_charts", "threshold_panel"],
        components: ["AssetTrendPanel", "AssetCombinedTrendChart"],
        screenArea: "Thermal Trend Chart",
        tables: ["roi_values", "asset_displays", "asset_thresholds"],
    },
    {
        apiFields: ["threshold_panel"],
        components: ["ThresholdEditor", "AssetSummaryPanel"],
        screenArea: "Threshold Settings",
        tables: ["asset_thresholds"],
    },
    {
        apiFields: ["alerts"],
        components: ["AssetEventLogPanel", "EventLogBlindDrawer"],
        screenArea: "Recent Alerts",
        tables: ["alerts", "alert_read_events"],
    },
    {
        apiFields: ["monitored_parts", "monitored_regions"],
        components: [
            "AssetCameraPanel",
            "AssetPartList",
            "AssetPartMetricCarousel",
        ],
        screenArea: "Monitored Parts",
        tables: ["asset_parts", "observations", "roi_values"],
    },
    {
        apiFields: ["event_timeline", "alerts", "recent_events"],
        components: ["AssetEventLogPanel", "AssetStatusTitlePanel"],
        screenArea: "Event and Status Context",
        tables: ["system_events", "alerts"],
    },
];
export const mockDashboardApiMap = [
    {
        api: "GET /api/v1/assets/{asset_id}/mock-dashboard",
        frontendEntry: "fetchAssetDashboardSnapshot",
        tables: [
            "sites",
            "assets",
            "asset_displays",
            "metric_card_configs",
            "asset_parts",
            "asset_thresholds",
            "observations",
            "roi_values",
            "system_events",
            "alerts",
        ],
    },
    {
        api: "GET /api/v1/alerts?asset_id=...",
        frontendEntry: "fetchAssetAlerts",
        tables: ["alerts"],
    },
    {
        api: "PUT /api/v1/alerts/{alert_id}/read",
        frontendEntry: "markAlertRead",
        tables: ["alerts", "alert_read_events"],
    },
    {
        api: "GET /api/v1/assets/{asset_id}/thresholds",
        frontendEntry: "fetchAssetThresholds",
        tables: ["asset_thresholds"],
    },
    {
        api: "PUT /api/v1/assets/{asset_id}/thresholds",
        frontendEntry: "updateAssetThresholds",
        tables: ["asset_thresholds"],
    },
];
export const mockDashboardReadingOrder = [
    "mock-dashboard-preview.html",
    "app/presentation/api/v1/routers/assets.py",
    "app/presentation/api/v1/routers/alerts.py",
    "app/infrastructure/repositories/sqlalchemy_mock.py",
    "app/infrastructure/mock_db/models.py",
];
