import { AlertTriangle, BellRing, Building2, Camera, CheckCircle2, CircleAlert, CircleX, Cpu, Factory, Gauge, Info, ListTree, MapPin, OctagonAlert, ScanLine, SlidersHorizontal, UserCog, Wrench, } from "lucide-react";
/**
 * 역할
 * - 대시보드 내비게이션과 글로벌 알림에서 공유하는 아이콘 저장소입니다.
 *
 * 개요
 * - 사이드메뉴와 알림 모듈은 아이콘을 직접 가져오지 않고 의미 키를 참조합니다.
 *
 * STEP 1. 데이터 레벨의 아이콘 키를 루시드 컴포넌트에 매핑합니다.
 * STEP 2. 크기, 제목, 접근성 동작은 말단 컴포넌트가 결정하게 둡니다.
 *
 * 헬퍼
 * - 브랜드 아이콘 상수는 전역 사이드메뉴 브랜드 영역과 제품 표시를 맞춰 줍니다.
 */
export const brandIcon = Factory;
export const treeIconMap = {
    overview: ListTree,
    site: Factory,
    place: Building2,
    asset: Cpu,
};
export const managementIconMap = {
    alarm: AlertTriangle,
    asset: Wrench,
    site: Factory,
    place: MapPin,
    camera: Camera,
    roi: ScanLine,
    threshold: Gauge,
    rule: SlidersHorizontal,
    notification: BellRing,
    user: UserCog,
};
export const notificationGradeIcon = {
    info: Info,
    success: CheckCircle2,
    caution: CircleAlert,
    warning: AlertTriangle,
    danger: OctagonAlert,
    error: CircleX,
};
