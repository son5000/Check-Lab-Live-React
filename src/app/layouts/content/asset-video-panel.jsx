/**
* 역할
* - 실시간 설비 영상 자리 표시 패널입니다.
*
* 개요
* - 실제 카메라 피드가 연결되기 전까지 실시간 관제 그리드의 영상 영역을 확보합니다.
*
* STEP 1. 패널 헤더와 LIVE 상태를 렌더링합니다.
* STEP 2. 안정적인 어두운 미리보기 영역을 렌더링합니다.
* STEP 3. 자리 표시 영역에 선택 설비 문맥을 표시합니다.
*
* 헬퍼
* - 실제 스트리밍 플레이어가 도입되면 미리보기 본문만 교체합니다.
*/
export function AssetVideoPanel({ assetName }) {
    return (<section className="AssetVideoPanel AssetVideoPanel__section-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background" aria-label="설비 영상">
      <div className="AssetVideoPanel AssetVideoPanel__container-1 flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border px-2">
        <h2 className="AssetVideoPanel AssetVideoPanel__title-1 min-w-0 truncate text-xs font-semibold text-foreground">설비 영상</h2>
        <span className="AssetVideoPanel AssetVideoPanel__label-1 shrink-0 font-mono text-[11px] text-muted-foreground">LIVE</span>
      </div>
      <div className="AssetVideoPanel AssetVideoPanel__container-2 relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-neutral-950">
        <div className="AssetVideoPanel AssetVideoPanel__container-3 absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:36px_36px]"/>
        <div className="AssetVideoPanel AssetVideoPanel__container-4 relative grid h-28 w-44 place-items-center rounded-md border border-white/20 bg-white/10 text-white">
          <p className="AssetVideoPanel AssetVideoPanel__text-1 truncate text-sm font-semibold">{assetName} 영상 영역</p>
        </div>
      </div>
    </section>);
}
