/**
 * 역할
 * - 대시보드 헤더의 반응형 시계 표시 컴포넌트입니다.
 *
 * 개요
 * - 대시보드 시계 훅이 만든 날짜/시간 라벨을 표시합니다.
 *
 * STEP 1. 미리 포맷된 라벨을 전달받습니다.
 * STEP 2. 초광폭 레이아웃에서만 간결한 시계 그룹을 보여줍니다.
 *
 * 헬퍼
 * - 포맷팅은 훅에 남겨 이 컴포넌트는 레이아웃만 담당합니다.
 */
export function HeaderClock({ currentDate, currentTime }) {
    const displayDate = removeWeekdayFromDateLabel(currentDate);
    return (<div className="HeaderClock HeaderClock__container-1 hidden h-10 w-[clamp(16rem,34vw,21rem)] min-w-0 shrink-0 items-center justify-center gap-3 px-2 text-foreground md:flex xl:gap-4" aria-label={`현재 날짜 ${displayDate}, 현재 시간 ${currentTime}`}>
      <div className="HeaderClock HeaderClock__container-2 flex min-w-0 items-baseline gap-2">
        <span className="HeaderClock HeaderClock__label-3 shrink-0 whitespace-nowrap text-[10px] font-semibold leading-none text-muted-foreground">
          날짜
        </span>
        <span className="HeaderClock HeaderClock__label-1 max-w-48 truncate text-sm font-bold leading-tight text-foreground" title={displayDate}>
          {displayDate}
        </span>
      </div>
      <span className="HeaderClock HeaderClock__divider-1 h-6 w-px shrink-0 bg-border" aria-hidden="true"/>
      <div className="HeaderClock HeaderClock__container-3 flex min-w-0 items-baseline gap-2 text-right">
        <span className="HeaderClock HeaderClock__label-4 shrink-0 whitespace-nowrap text-[10px] font-semibold leading-none text-muted-foreground">
          현재 시각
        </span>
        <span className="HeaderClock HeaderClock__label-2 w-[6.25rem] font-mono text-lg font-bold leading-tight text-foreground tabular-nums" title={currentTime}>
          {currentTime}
        </span>
      </div>
    </div>);
}
function removeWeekdayFromDateLabel(value) {
    return String(value ?? "")
        .replace(/\s*\([^)]*\)\s*$/, "")
        .replace(/^[A-Za-z]{3,},\s*/, "")
        .replace(/,\s*[A-Za-z]{3,}\s*$/, "")
        .replace(/\s*\.\s*$/, "")
        .trim();
}
