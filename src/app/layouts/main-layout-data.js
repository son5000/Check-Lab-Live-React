/**
 * Layout-level static menu items.
 *
 * The monitoring tree is intentionally not exported from here. Runtime tree
 * data must come from the backend `/api/v1/monitoring-tree` contract.
 */
export const managementMenuItems = [
    { id: "alarm-status", label: "경보 현황", icon: "alarm" },
    { id: "asset-management", label: "설비 관리", icon: "asset" },
    { id: "site-management", label: "공정 관리", icon: "site" },
    { id: "place-management", label: "장소 관리", icon: "place" },
    { id: "camera-management", label: "촬영장치 관리", icon: "camera" },
    { id: "roi-management", label: "관심영역 관리", icon: "roi" },
    { id: "threshold-setting", label: "임계값 설정", icon: "threshold" },
    { id: "rule-setting", label: "판정 규칙 설정", icon: "rule" },
    { id: "notification-setting", label: "알림 설정", icon: "notification" },
    { id: "user-setting", label: "사용자 설정", icon: "user" },
];
export const dashboardHeaderState = {
    assetStatus: "normal",
    assetStatusLabel: "정상",
    lastCollectedAt: "수집 대기",
    selectedPath: ["공정 선택"],
    unresolvedAlarmCount: 0,
    userName: "관제 관리자",
};
export const dashboardNotifications = [];
