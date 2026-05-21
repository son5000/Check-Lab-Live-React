/**
 * 역할
 * - 대시보드 상태 표면에 쓰는 스타일 토큰 맵입니다.
 *
 * 개요
 * - 컴포넌트는 의미 키만 사용하고 테일윈드 클래스 문자열은 비즈니스 로직 밖에 둡니다.
 *
 * STEP 1. 데이터나 헬퍼 모듈에서 의미 상태를 계산합니다.
 * STEP 2. 렌더링 맥락에 맞는 클래스 맵을 선택합니다.
 * STEP 3. 최종 컴포넌트 경계에서 클래스 문자열을 `cn`에 전달합니다.
 *
 * 헬퍼
 * - 새 상태를 추가할 때 타입 안내를 받을 수 있도록 단순 객체 맵으로 유지합니다.
 */
export const dashboardStatusClassName = {
    normal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    caution: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    warning: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    error: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};
export const assetJudgementClassName = {
    정상: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    요주의: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    이상: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
export const operationClassName = {
    가동중: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    비가동: "border-muted bg-muted text-muted-foreground",
};
export const thresholdStatusClassName = {
    normal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    exceeded: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
export const notificationGradeClassName = {
    info: "border-sky-500/35 bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
    success: "border-emerald-500/35 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
    caution: "border-amber-500/35 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
    warning: "border-orange-500/35 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200",
    danger: "border-red-500/35 bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200",
    error: "border-rose-500/35 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
};
export const notificationGradeLabel = {
    info: "정보",
    success: "성공",
    caution: "주의",
    warning: "경고",
    danger: "위험",
    error: "오류",
};
