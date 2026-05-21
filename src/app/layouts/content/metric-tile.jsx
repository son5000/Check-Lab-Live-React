/**
 * 역할
 * - 간결한 핵심 지표 값 타일입니다.
 *
 * 개요
 * - 설비 지표 섹션에서 라벨/값/단위를 표시할 때 사용합니다.
 *
 * STEP 1. 지표 라벨을 렌더링합니다.
 * STEP 2. 선택적 단위 접미사와 함께 값을 렌더링합니다.
 *
 * 헬퍼
 * - 숫자 값이 변해도 핵심 지표 그리드가 흔들리지 않도록 타일 크기를 안정적으로 유지합니다.
 */
export function MetricTile({ label, value, unit }) {
    return (<div className="MetricTile MetricTile__container-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5">
      <p className="MetricTile MetricTile__text-1 truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="MetricTile MetricTile__text-2 truncate text-sm font-semibold text-foreground">
        {value}
        {unit ? <span className="MetricTile MetricTile__label-1 ml-1 text-[11px] font-medium text-muted-foreground">{unit}</span> : null}
      </p>
    </div>);
}
