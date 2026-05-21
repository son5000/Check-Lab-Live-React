"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BellRing, Box, Camera, Clock3, Cpu, ExternalLink, Plus, Save, Settings2, SlidersHorizontal, Thermometer, Trash2, X, } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";
import { DASHBOARD_TIME_ZONE } from "@/app/layouts/helpers/time-formatters";
import { createAsset as createManagedAsset } from "@/app/site/services/site-management-client";
import { toCreateAssetPayload } from "@/app/site/components/site-builder-model";
const dashboardStatusOptions = [
    "normal",
    "caution",
    "warning",
    "danger",
    "error",
];
const statusLabel = {
    normal: "정상",
    caution: "요주의",
    warning: "경고",
    danger: "이상",
    error: "오류",
};
const assetTypeOptions = [
    "회전 설비",
    "전기 설비",
    "배관 설비",
    "가열 설비",
    "냉각 설비",
    "기타 설비",
];
const cameraOptions = ["CAM 1", "CAM 2", "열화상 CAM", "복합 센서"];
const defaultDraft = {
    alarmLinked: true,
    cameraId: cameraOptions[0],
    collectionCycleSec: 5,
    description: "",
    lastCollectedAt: "수집 대기",
    name: "",
    status: "normal",
    temperatureThreshold: 65,
    type: assetTypeOptions[0],
    ultrasoundThresholdDb: 70,
};
export function LocationSummaryPage({ site, location, assets, }) {
    const initialAssets = useMemo(() => assets.map((asset) => toManagedAsset(asset)), [assets]);
    const [managedAssets, setManagedAssets] = useState(initialAssets);
    const [selectedAssetId, setSelectedAssetId] = useState(initialAssets[0]?.id ?? "");
    const [draft, setDraft] = useState(defaultDraft);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isCreatingAsset, setIsCreatingAsset] = useState(false);
    const [createAssetMessage, setCreateAssetMessage] = useState();
    useEffect(() => {
        setManagedAssets(initialAssets);
        setSelectedAssetId(initialAssets[0]?.id ?? "");
    }, [initialAssets]);
    useEffect(() => {
        if (!managedAssets.length) {
            setSelectedAssetId("");
            return;
        }
        if (selectedAssetId &&
            managedAssets.some((asset) => asset.id === selectedAssetId)) {
            return;
        }
        setSelectedAssetId(managedAssets[0].id);
    }, [managedAssets, selectedAssetId]);
    const selectedAsset = managedAssets.find((asset) => asset.id === selectedAssetId);
    const abnormalCount = managedAssets.filter((asset) => asset.status === "danger" || asset.status === "error").length;
    const watchCount = managedAssets.filter((asset) => asset.status === "warning" || asset.status === "caution").length;
    const alarmLinkedCount = managedAssets.filter((asset) => asset.alarmLinked).length;
    const canRegister = draft.name.trim().length > 0;
    const handleRegisterAsset = async (event) => {
        event.preventDefault();
        if (!canRegister || isCreatingAsset) {
            return;
        }
        setIsCreatingAsset(true);
        setCreateAssetMessage(undefined);
        let response;
        try {
            response = await createManagedAsset(toCreateAssetPayload(site.site_id, location.id, {
                ...draft,
                description: draft.description.trim(),
                name: draft.name.trim(),
            }));
        }
        catch (error) {
            setCreateAssetMessage({
                tone: "error",
                text: error instanceof Error && error.message
                    ? error.message
                    : "설비 등록에 실패했습니다.",
            });
            setIsCreatingAsset(false);
            return;
        }
        setIsCreatingAsset(false);
        const asset_id = readCreatedAssetId(response);
        if (!asset_id) {
            setCreateAssetMessage({
                tone: "error",
                text: "백엔드 응답에 설비 ID가 없습니다.",
            });
            return;
        }
        const nextAsset = {
            asset_id,
            id: asset_id,
            alarmLinked: draft.alarmLinked,
            cameraId: draft.cameraId,
            collectionCycleSec: draft.collectionCycleSec,
            description: draft.description.trim(),
            href: `${location.href}/asset/${asset_id}`,
            isUserDefined: true,
            lastCollectedAt: draft.lastCollectedAt,
            locationId: location.id,
            name: draft.name.trim(),
            site_id: site.site_id,
            status: draft.status,
            temperatureThreshold: draft.temperatureThreshold,
            type: draft.type.trim(),
            ultrasoundThresholdDb: draft.ultrasoundThresholdDb,
        };
        setManagedAssets((currentAssets) => [
            nextAsset,
            ...currentAssets,
        ]);
        setSelectedAssetId(nextAsset.id);
        setCreateAssetMessage({ tone: "success", text: "설비가 등록되었습니다." });
        setDraft({
            ...defaultDraft,
            lastCollectedAt: getCurrentClockLabel(),
        });
        setIsRegistering(false);
    };
    const handleRemoveAsset = (assetId) => {
        setManagedAssets((currentAssets) => currentAssets.filter((asset) => asset.id !== assetId));
    };
    const handleRestoreBackendAssets = () => {
        setManagedAssets(initialAssets);
        setSelectedAssetId(initialAssets[0]?.id ?? "");
    };
    const handleAssetChange = (assetId, patch) => {
        setManagedAssets((currentAssets) => currentAssets.map((asset) => asset.id === assetId ? { ...asset, ...patch } : asset));
    };
    const worldHref = `/site/${encodeURIComponent(site.site_id)}/location/${encodeURIComponent(location.id)}/world`;
    return (<main className="LocationSummaryPage LocationSummaryPage__root-1 min-w-0 flex-1 overflow-auto bg-muted/35 p-3 md:p-4">
      <div className="LocationSummaryPage LocationSummaryPage__container-1 mx-auto flex max-w-6xl flex-col gap-3">
        <section className="LocationSummaryPage LocationSummaryPage__section-1 rounded-md border border-border bg-card p-3 text-card-foreground">
          <div className="LocationSummaryPage LocationSummaryPage__container-2 flex min-w-0 items-start justify-between gap-3">
            <div className="LocationSummaryPage LocationSummaryPage__container-3 min-w-0">
              <p className="LocationSummaryPage LocationSummaryPage__text-1 truncate text-xs font-medium text-muted-foreground">
                {site.name} · {location.floor}
              </p>
              <h1 className="LocationSummaryPage LocationSummaryPage__title-1 mt-1 truncate text-xl font-semibold">
                {location.name}
              </h1>
              <p className="LocationSummaryPage LocationSummaryPage__text-2 mt-1 text-sm text-muted-foreground">
                {location.summary}
              </p>
            </div>
            <div className="LocationSummaryPage LocationSummaryPage__container-10 flex shrink-0 items-center gap-1.5">
              <Link href={worldHref} target="_blank" rel="noreferrer" className="LocationSummaryPage LocationSummaryPage__world-link-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition hover:bg-accent">
                <Box className="LocationSummaryPage LocationSummaryPage__world-icon-1 h-3.5 w-3.5" aria-hidden="true"/>
                3D 뷰어로 한눈에 보기
                <ExternalLink className="LocationSummaryPage LocationSummaryPage__world-icon-2 h-3 w-3 text-muted-foreground" aria-hidden="true"/>
              </Link>
              <button type="button" className="LocationSummaryPage LocationSummaryPage__button-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-primary bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90" onClick={() => setIsRegistering((current) => !current)}>
                {isRegistering ? (<X className="LocationSummaryPage LocationSummaryPage__icon-2 h-3.5 w-3.5" aria-hidden="true"/>) : (<Plus className="LocationSummaryPage LocationSummaryPage__icon-3 h-3.5 w-3.5" aria-hidden="true"/>)}
                {isRegistering ? "취소" : "설비 등록"}
              </button>
              <span className={cn("LocationSummaryPage LocationSummaryPage__label-1 shrink-0 rounded-md border px-2 py-1 text-xs font-semibold", dashboardStatusClassName[location.status])}>
                {statusLabel[location.status]}
              </span>
            </div>
          </div>
          <div className="LocationSummaryPage LocationSummaryPage__container-4 mt-3 grid gap-2 sm:grid-cols-4">
            <Metric icon={Cpu} label="하위 설비" value={`${managedAssets.length}대`}/>
            <Metric icon={Thermometer} label="이상 설비" value={`${abnormalCount}대`}/>
            <Metric icon={Activity} label="관찰 대상" value={`${watchCount}대`}/>
            <Metric icon={BellRing} label="알림 연동" value={`${alarmLinkedCount}대`}/>
          </div>
        </section>

        {isRegistering ? (<section className="LocationSummaryPage LocationSummaryPage__section-3 rounded-md border border-border bg-card p-3 text-card-foreground">
            <div className="LocationSummaryPage LocationSummaryPage__container-11 mb-3 flex min-w-0 items-center justify-between gap-2">
              <div className="LocationSummaryPage LocationSummaryPage__container-12 flex min-w-0 items-center gap-1.5">
                <Plus className="LocationSummaryPage LocationSummaryPage__icon-4 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
                <h2 className="LocationSummaryPage LocationSummaryPage__title-4 truncate text-sm font-semibold">
                  설비 등록
                </h2>
              </div>
              <span className="LocationSummaryPage LocationSummaryPage__label-4 shrink-0 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {location.name}
              </span>
            </div>

            {createAssetMessage ? (<p className={cn("LocationSummaryPage LocationSummaryPage__message-1 mb-3 rounded-md border px-3 py-2 text-xs font-semibold", createAssetMessage.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300")}>
                {createAssetMessage.text}
              </p>) : null}

            <form className="LocationSummaryPage LocationSummaryPage__form-1 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleRegisterAsset}>
              <div className="LocationSummaryPage LocationSummaryPage__container-13 grid gap-2">
                <TextField label="설비명" value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name }))}/>
                <TextAreaField label="설명" value={draft.description} onChange={(description) => setDraft((current) => ({ ...current, description }))}/>
              </div>

              <button type="submit" disabled={!canRegister || isCreatingAsset} className={cn("LocationSummaryPage LocationSummaryPage__button-2 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-end rounded-md border px-3 text-xs font-semibold transition", canRegister && !isCreatingAsset
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed border-border bg-muted text-muted-foreground")}>
                <Save className="LocationSummaryPage LocationSummaryPage__icon-5 h-3.5 w-3.5" aria-hidden="true"/>
                {isCreatingAsset ? "등록 중" : "등록"}
              </button>
            </form>
          </section>) : null}

        <section className="LocationSummaryPage LocationSummaryPage__section-2 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <div className="LocationSummaryPage LocationSummaryPage__container-5 rounded-md border border-border bg-card p-3 text-card-foreground">
            <div className="LocationSummaryPage LocationSummaryPage__container-15 flex min-w-0 items-center justify-between gap-2">
              <h2 className="LocationSummaryPage LocationSummaryPage__title-2 truncate text-sm font-semibold">
                하위 설비 현상 요약
              </h2>
              <button type="button" className="LocationSummaryPage LocationSummaryPage__button-3 inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground" onClick={handleRestoreBackendAssets}>
                <X className="LocationSummaryPage LocationSummaryPage__icon-6 h-3 w-3" aria-hidden="true"/>
                백엔드 값 복원
              </button>
            </div>

            <div className="LocationSummaryPage LocationSummaryPage__container-6 mt-2 grid gap-2 md:grid-cols-2">
              {managedAssets.length ? (managedAssets.map((asset) => (<AssetCard key={asset.id} asset={asset} selected={asset.id === selectedAssetId} onRemove={handleRemoveAsset} onSelect={setSelectedAssetId}/>))) : (<div className="LocationSummaryPage LocationSummaryPage__empty-1 grid min-h-40 place-items-center rounded-md border border-dashed border-border bg-background px-4 text-center text-sm text-muted-foreground md:col-span-2">
                  등록된 설비가 없습니다.
                </div>)}
            </div>
          </div>

          <AssetOptionPanel asset={selectedAsset} onChange={handleAssetChange} onRemove={handleRemoveAsset}/>
        </section>
      </div>
    </main>);
}
function AssetCard({ asset, selected, onRemove, onSelect, }) {
    return (<article className={cn("LocationSummaryPage LocationSummaryPage__card-1 flex min-h-44 min-w-0 flex-col justify-between rounded-md border border-border bg-background p-3 transition", selected && "border-primary bg-primary/5")}>
      <button type="button" className="LocationSummaryPage LocationSummaryPage__button-card-1 min-w-0 text-left" onClick={() => onSelect(asset.id)}>
        <div className="LocationSummaryPage LocationSummaryPage__container-7 mb-2 flex min-w-0 items-start justify-between gap-2">
          <div className="LocationSummaryPage LocationSummaryPage__container-8 min-w-0">
            <p className="LocationSummaryPage LocationSummaryPage__text-3 truncate text-[11px] text-muted-foreground">
              {asset.type}
            </p>
            <h3 className="LocationSummaryPage LocationSummaryPage__title-3 truncate text-sm font-semibold">
              {asset.name}
            </h3>
          </div>
          <span className={cn("LocationSummaryPage LocationSummaryPage__label-2 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", dashboardStatusClassName[asset.status])}>
            {statusLabel[asset.status]}
          </span>
        </div>

        <div className="LocationSummaryPage LocationSummaryPage__container-16 grid gap-1.5 text-xs text-muted-foreground">
          <AssetOptionRow icon={Clock3} label="최근 수집" value={asset.lastCollectedAt}/>
          <AssetOptionRow icon={Camera} label="카메라" value={asset.cameraId}/>
          <AssetOptionRow icon={SlidersHorizontal} label="임계" value={`${asset.temperatureThreshold}℃ · ${asset.ultrasoundThresholdDb} dB`}/>
        </div>
      </button>

      <div className="LocationSummaryPage LocationSummaryPage__container-9 mt-3 flex items-center justify-between gap-2 text-xs font-medium">
        {asset.isUserDefined ? (<span className="LocationSummaryPage LocationSummaryPage__label-3 inline-flex h-7 items-center rounded-md border border-border bg-muted px-2 text-[11px] text-muted-foreground">
            대시보드 대기
          </span>) : (<Link href={asset.href} className="LocationSummaryPage LocationSummaryPage__link-1 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold transition hover:bg-accent">
            설비 대시보드
            <ArrowRight className="LocationSummaryPage LocationSummaryPage__icon-1 h-3.5 w-3.5" aria-hidden="true"/>
          </Link>)}

        <div className="LocationSummaryPage LocationSummaryPage__container-17 flex shrink-0 items-center gap-1">
          <button type="button" className="LocationSummaryPage LocationSummaryPage__button-4 grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground" onClick={() => onSelect(asset.id)} title="옵션 설정">
            <Settings2 className="LocationSummaryPage LocationSummaryPage__icon-7 h-3.5 w-3.5" aria-hidden="true"/>
          </button>
          <button type="button" className="LocationSummaryPage LocationSummaryPage__button-5 grid h-7 w-7 place-items-center rounded-md border border-red-500/35 bg-red-500/10 text-red-700 transition hover:bg-red-500/15 dark:text-red-300" onClick={() => onRemove(asset.id)} title="설비 제거">
            <Trash2 className="LocationSummaryPage LocationSummaryPage__icon-8 h-3.5 w-3.5" aria-hidden="true"/>
          </button>
        </div>
      </div>
    </article>);
}
function AssetOptionPanel({ asset, onChange, onRemove, }) {
    if (!asset) {
        return (<aside className="LocationSummaryPage LocationSummaryPage__aside-1 grid min-h-72 place-items-center rounded-md border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
        설비를 선택하면 옵션을 설정할 수 있습니다.
      </aside>);
    }
    return (<aside className="LocationSummaryPage LocationSummaryPage__aside-2 min-w-0 rounded-md border border-border bg-card p-3 text-card-foreground">
      <div className="LocationSummaryPage LocationSummaryPage__container-18 mb-3 flex min-w-0 items-start justify-between gap-2">
        <div className="LocationSummaryPage LocationSummaryPage__container-19 min-w-0">
          <p className="LocationSummaryPage LocationSummaryPage__text-5 truncate text-[11px] text-muted-foreground">
            설비 옵션 설정
          </p>
          <h2 className="LocationSummaryPage LocationSummaryPage__title-5 truncate text-sm font-semibold">
            {asset.name}
          </h2>
        </div>
        <span className={cn("LocationSummaryPage LocationSummaryPage__label-5 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", dashboardStatusClassName[asset.status])}>
          {statusLabel[asset.status]}
        </span>
      </div>

      <div className="LocationSummaryPage LocationSummaryPage__container-20 grid gap-2">
        <TextField label="설비명" value={asset.name} onChange={(name) => onChange(asset.id, { name })}/>
        <SelectField label="설비 유형" value={asset.type} options={assetTypeOptions} onChange={(type) => onChange(asset.id, { type })}/>
        <SelectField label="상태" value={asset.status} options={dashboardStatusOptions} getOptionLabel={(status) => statusLabel[status]} onChange={(status) => onChange(asset.id, { status })}/>
        <SelectField label="연동 카메라" value={asset.cameraId} options={cameraOptions} onChange={(cameraId) => onChange(asset.id, { cameraId })}/>

        <div className="LocationSummaryPage LocationSummaryPage__container-21 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <NumberField label="수집 주기" suffix="초" min={1} value={asset.collectionCycleSec} onChange={(collectionCycleSec) => onChange(asset.id, { collectionCycleSec })}/>
          <NumberField label="온도 임계" suffix="℃" min={0} value={asset.temperatureThreshold} onChange={(temperatureThreshold) => onChange(asset.id, { temperatureThreshold })}/>
          <NumberField label="초음파 임계" suffix="dB" min={0} value={asset.ultrasoundThresholdDb} onChange={(ultrasoundThresholdDb) => onChange(asset.id, { ultrasoundThresholdDb })}/>
        </div>

        <label className="LocationSummaryPage LocationSummaryPage__field-5 flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium">
          <span className="LocationSummaryPage LocationSummaryPage__label-6 min-w-0 truncate">
            알림 연동
          </span>
          <input className="LocationSummaryPage LocationSummaryPage__checkbox-2 h-3.5 w-3.5 accent-primary" type="checkbox" checked={asset.alarmLinked} onChange={(event) => onChange(asset.id, { alarmLinked: event.target.checked })}/>
        </label>

        <button type="button" className="LocationSummaryPage LocationSummaryPage__button-6 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/10 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-500/15 dark:text-red-300" onClick={() => onRemove(asset.id)}>
          <Trash2 className="LocationSummaryPage LocationSummaryPage__icon-9 h-3.5 w-3.5" aria-hidden="true"/>
          설비 제거
        </button>
      </div>
    </aside>);
}
function Metric({ icon: Icon, label, value, }) {
    return (<div className="LocationMetric LocationMetric__container-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
      <Icon className="LocationMetric LocationMetric__icon-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
      <div className="LocationMetric LocationMetric__container-2 min-w-0">
        <p className="LocationMetric LocationMetric__text-1 truncate text-[11px] text-muted-foreground">
          {label}
        </p>
        <p className="LocationMetric LocationMetric__text-2 truncate text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>);
}
function AssetOptionRow({ icon: Icon, label, value, }) {
    return (<p className="LocationSummaryPage LocationSummaryPage__text-6 flex min-w-0 items-center gap-1.5">
      <Icon className="LocationSummaryPage LocationSummaryPage__icon-10 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/>
      <span className="LocationSummaryPage LocationSummaryPage__label-7 shrink-0 text-muted-foreground">
        {label}
      </span>
      <span className="LocationSummaryPage LocationSummaryPage__value-1 min-w-0 truncate font-medium text-foreground">
        {value}
      </span>
    </p>);
}
function TextField({ label, onChange, value, }) {
    return (<label className="LocationSummaryPage LocationSummaryPage__field-1 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-8 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <input className="LocationSummaryPage LocationSummaryPage__input-1 h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs font-semibold outline-none transition focus:border-primary" value={value} onChange={(event) => onChange(event.target.value)}/>
    </label>);
}
function TextAreaField({ label, onChange, value, }) {
    return (<label className="LocationSummaryPage LocationSummaryPage__field-6 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-12 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <textarea className="LocationSummaryPage LocationSummaryPage__textarea-1 min-h-20 min-w-0 resize-none rounded-md border border-border bg-background px-2 py-2 text-xs font-semibold outline-none transition focus:border-primary" value={value} onChange={(event) => onChange(event.target.value)}/>
    </label>);
}
function SelectField({ getOptionLabel, label, onChange, options, value, }) {
    return (<label className="LocationSummaryPage LocationSummaryPage__field-2 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-9 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <select className="LocationSummaryPage LocationSummaryPage__select-1 h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs font-semibold outline-none transition focus:border-primary" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (<option key={option} value={option}>
            {getOptionLabel ? getOptionLabel(option) : option}
          </option>))}
      </select>
    </label>);
}
function NumberField({ label, min, onChange, suffix, value, }) {
    return (<label className="LocationSummaryPage LocationSummaryPage__field-3 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-10 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="LocationSummaryPage LocationSummaryPage__container-22 flex h-8 min-w-0 items-center gap-1 rounded-md border border-border bg-background px-2 transition focus-within:border-primary">
        <input className="LocationSummaryPage LocationSummaryPage__input-2 min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold outline-none" type="number" min={min} value={value} onChange={(event) => onChange(readBoundedNumber(event.target.value, value, min))}/>
        <span className="LocationSummaryPage LocationSummaryPage__label-11 shrink-0 text-[10px] text-muted-foreground">
          {suffix}
        </span>
      </span>
    </label>);
}
function toManagedAsset(asset) {
    return {
        ...asset,
        alarmLinked: asset.status !== "normal",
        cameraId: asset.type === "전기 설비" ? "열화상 CAM" : cameraOptions[0],
        collectionCycleSec: asset.status === "normal" ? 5 : 2,
        temperatureThreshold: asset.type === "전기 설비" ? 65 : 70,
        ultrasoundThresholdDb: asset.type === "배관 설비" ? 68 : 72,
    };
}
function readCreatedAssetId(response) {
    if (!response || typeof response !== "object")
        return undefined;
    const record = response.asset && typeof response.asset === "object"
        ? response.asset
        : response.data && typeof response.data === "object"
            ? response.data
            : response;
    const value = record.asset_id ?? record.id;
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function getCurrentClockLabel() {
    return new Date().toLocaleTimeString("ko-KR", {
        timeZone: DASHBOARD_TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        second: "2-digit",
    });
}
function readBoundedNumber(value, fallback, min) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
        return fallback;
    }
    return Math.max(min, parsedValue);
}
