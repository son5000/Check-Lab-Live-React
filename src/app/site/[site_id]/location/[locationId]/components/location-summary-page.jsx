"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Box,
  Camera,
  Clock3,
  Cpu,
  ExternalLink,
  Plus,
  Save,
  Settings2,
  SlidersHorizontal,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";
import {
  createDashboardDateTimeFormatter,
  formatCurrentDashboardDateTime,
  formatCurrentDashboardTime,
  formatCheckLabDateTime,
} from "@/app/layouts/helpers/time-formatters";
import {
  createAsset as createManagedAsset,
  updateAsset as updateManagedAsset,
} from "@/app/site/services/site-management-client";
import { toCreateAssetPayload } from "@/app/site/components/site-builder-model";
const statusLabel = {
  normal: "정상",
  caution: "요주의",
  warning: "경고",
  danger: "이상",
  error: "오류",
};
const defaultDraft = {
  cameraId: "",
  description: "",
  lastCollectedAt: "수집 대기",
  name: "",
  temperatureThreshold: 65,
  type: "",
  ultrasoundThresholdDb: 70,
};
const optionComparisonFields = [
  { key: "name", label: "설비명" },
  { key: "type", label: "설비 유형" },
  { key: "cameraId", label: "연동 카메라" },
  { key: "temperatureThreshold", label: "온도 임계" },
  { key: "ultrasoundThresholdDb", label: "초음파 임계" },
  { key: "manager", label: "담당자 이름" },
  { key: "managerEmail", label: "담당자 이메일" },
  { key: "managerContact", label: "담당자 연락처" },
  { key: "maintenanceCompany", label: "유지보수 업체" },
  { key: "lastInspectionDate", label: "마지막 점검일" },
];
const editableOptionFields = optionComparisonFields;
export function LocationSummaryPage({ site, location, assets }) {
  const initialAssets = useMemo(
    () => assets.map((asset) => toManagedAsset(asset)),
    [assets],
  );
  const [managedAssets, setManagedAssets] = useState(initialAssets);
  const [savedAssetsById, setSavedAssetsById] = useState(() =>
    createAssetSnapshotMap(initialAssets),
  );
  const [assetDraftsById, setAssetDraftsById] = useState(() =>
    createAssetSnapshotMap(initialAssets),
  );
  const [selectedAssetId, setSelectedAssetId] = useState(
    initialAssets[0]?.id ?? "",
  );
  const [draft, setDraft] = useState(defaultDraft);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [createAssetMessage, setCreateAssetMessage] = useState();
  const [pendingSaveComparison, setPendingSaveComparison] = useState();
  const [isSavingAssetOptions, setIsSavingAssetOptions] = useState(false);
  const [assetSaveMessage, setAssetSaveMessage] = useState();
  const [assetSaveError, setAssetSaveError] = useState("");
  useEffect(() => {
    setManagedAssets(initialAssets);
    setSavedAssetsById(createAssetSnapshotMap(initialAssets));
    setAssetDraftsById(createAssetSnapshotMap(initialAssets));
    setSelectedAssetId(initialAssets[0]?.id ?? "");
  }, [initialAssets]);
  useEffect(() => {
    if (!managedAssets.length) {
      setSelectedAssetId("");
      return;
    }
    if (
      selectedAssetId &&
      managedAssets.some((asset) => asset.id === selectedAssetId)
    ) {
      return;
    }
    setSelectedAssetId(managedAssets[0].id);
  }, [managedAssets, selectedAssetId]);
  const selectedAsset = managedAssets.find(
    (asset) => asset.id === selectedAssetId,
  );
  const abnormalCount = managedAssets.filter(
    (asset) => asset.status === "danger" || asset.status === "error",
  ).length;
  const watchCount = managedAssets.filter(
    (asset) => asset.status === "warning" || asset.status === "caution",
  ).length;
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
      response = await createManagedAsset(
        toCreateAssetPayload(site.site_id, location.id, {
          ...draft,
          description: draft.description.trim(),
          name: draft.name.trim(),
        }),
      );
    } catch (error) {
      setCreateAssetMessage({
        tone: "error",
        text:
          error instanceof Error && error.message
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
      cameraId: readCreatedAssetCameraId(response) ?? draft.cameraId.trim(),
      description: draft.description.trim(),
      href: `${location.href}/asset/${asset_id}`,
      isUserDefined: true,
      lastCollectedAt: draft.lastCollectedAt,
      lastInspectionDate: "",
      locationId: location.id,
      maintenanceCompany: "",
      manager: "",
      managerContact: "",
      managerEmail: "",
      name: draft.name.trim(),
      optionUpdatedAt: getCurrentDateTimeLabel(),
      site_id: site.site_id,
      status: readCreatedAssetStatus(response) ?? "normal",
      temperatureThreshold: draft.temperatureThreshold,
      type: draft.type.trim() || "설비",
      ultrasoundThresholdDb: draft.ultrasoundThresholdDb,
    };
    setManagedAssets((currentAssets) => [nextAsset, ...currentAssets]);
    setSavedAssetsById((currentAssets) => ({
      ...currentAssets,
      [nextAsset.id]: { ...nextAsset },
    }));
    setAssetDraftsById((currentAssets) => ({
      ...currentAssets,
      [nextAsset.id]: { ...nextAsset },
    }));
    setSelectedAssetId(nextAsset.id);
    setCreateAssetMessage({ tone: "success", text: "설비가 등록되었습니다." });
    setDraft({
      ...defaultDraft,
      lastCollectedAt: getCurrentClockLabel(),
    });
    setIsRegistering(false);
  };
  const handleRemoveAsset = (assetId) => {
    setManagedAssets((currentAssets) =>
      currentAssets.filter((asset) => asset.id !== assetId),
    );
    setSavedAssetsById((currentAssets) => {
      const { [assetId]: _removedAsset, ...nextAssets } = currentAssets;
      return nextAssets;
    });
    setAssetDraftsById((currentAssets) => {
      const { [assetId]: _removedAsset, ...nextAssets } = currentAssets;
      return nextAssets;
    });
    setPendingSaveComparison((currentComparison) =>
      currentComparison?.assetId === assetId ? undefined : currentComparison,
    );
  };
  const handleAssetChange = (assetId, patch) => {
    setAssetDraftsById((currentAssets) => ({
      ...currentAssets,
      [assetId]: {
        ...(currentAssets[assetId] ??
          managedAssets.find((asset) => asset.id === assetId)),
        ...patch,
      },
    }));
    setAssetSaveMessage(undefined);
  };
  const handleRequestAssetOptionSave = (assetId) => {
    const savedAsset =
      savedAssetsById[assetId] ??
      managedAssets.find((asset) => asset.id === assetId);
    const draftAsset = assetDraftsById[assetId] ?? savedAsset;
    if (!savedAsset || !draftAsset) {
      return;
    }
    if (
      !getChangedOptionRows(savedAsset, draftAsset, editableOptionFields)
        .length
    ) {
      return;
    }
    setAssetSaveError("");
    setPendingSaveComparison({
      after: { ...draftAsset, optionUpdatedAt: getCurrentDateTimeLabel() },
      assetId,
      before: { ...savedAsset },
    });
  };
  const handleCancelAssetOptionSave = () => {
    if (isSavingAssetOptions) {
      return;
    }
    setAssetSaveError("");
    setPendingSaveComparison(undefined);
  };
  const handleConfirmAssetOptionSave = async () => {
    if (!pendingSaveComparison || isSavingAssetOptions) {
      return;
    }
    setIsSavingAssetOptions(true);
    setAssetSaveError("");
    setAssetSaveMessage(undefined);
    try {
      await updateManagedAsset(
        pendingSaveComparison.after.asset_id ?? pendingSaveComparison.assetId,
        toAssetOptionSavePayload(pendingSaveComparison.after),
      );
    } catch (error) {
      setAssetSaveError(
        error instanceof Error && error.message
          ? error.message
          : "설비 옵션 저장에 실패했습니다.",
      );
      setIsSavingAssetOptions(false);
      return;
    }
    setManagedAssets((currentAssets) =>
      currentAssets.map((asset) =>
        asset.id === pendingSaveComparison.assetId
          ? { ...pendingSaveComparison.after }
          : asset,
      ),
    );
    setSavedAssetsById((currentAssets) => ({
      ...currentAssets,
      [pendingSaveComparison.assetId]: { ...pendingSaveComparison.after },
    }));
    setAssetDraftsById((currentAssets) => ({
      ...currentAssets,
      [pendingSaveComparison.assetId]: { ...pendingSaveComparison.after },
    }));
    setAssetSaveMessage({
      tone: "success",
      text: "설비 옵션이 서버에 저장되었습니다.",
    });
    setPendingSaveComparison(undefined);
    setIsSavingAssetOptions(false);
  };
  const worldHref = `/site/${encodeURIComponent(site.site_id)}/location/${encodeURIComponent(location.id)}/world`;
  const selectedSavedAsset = selectedAsset
    ? savedAssetsById[selectedAsset.id]
    : undefined;
  const selectedDraftAsset = selectedAsset
    ? assetDraftsById[selectedAsset.id] ?? selectedAsset
    : undefined;
  const selectedHasUnsavedChanges = Boolean(
    selectedAsset &&
    getChangedOptionRows(
      selectedSavedAsset ?? selectedAsset,
      selectedDraftAsset ?? selectedAsset,
      editableOptionFields,
    ).length,
  );
  return (
    <main className="LocationSummaryPage LocationSummaryPage__root-1 min-h-0 min-w-0 flex-1 overflow-hidden bg-muted/35 p-3 md:p-4">
      <div className="LocationSummaryPage LocationSummaryPage__container-1 mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-3">
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
              <Link
                href={worldHref}
                target="_blank"
                rel="noreferrer"
                className="LocationSummaryPage LocationSummaryPage__world-link-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition hover:bg-accent"
              >
                <Box
                  className="LocationSummaryPage LocationSummaryPage__world-icon-1 h-3.5 w-3.5"
                  aria-hidden="true"
                />
                3D 뷰어로 한눈에 보기
                <ExternalLink
                  className="LocationSummaryPage LocationSummaryPage__world-icon-2 h-3 w-3 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
              <button
                type="button"
                className="LocationSummaryPage LocationSummaryPage__button-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-primary bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                onClick={() => setIsRegistering((current) => !current)}
              >
                {isRegistering ? (
                  <X
                    className="LocationSummaryPage LocationSummaryPage__icon-2 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                ) : (
                  <Plus
                    className="LocationSummaryPage LocationSummaryPage__icon-3 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                )}
                {isRegistering ? "취소" : "설비 등록"}
              </button>
              <span
                className={cn(
                  "LocationSummaryPage LocationSummaryPage__label-1 shrink-0 rounded-md border px-2 py-1 text-xs font-semibold",
                  dashboardStatusClassName[location.status],
                )}
              >
                {statusLabel[location.status]}
              </span>
            </div>
          </div>
          <div className="LocationSummaryPage LocationSummaryPage__container-4 mt-3 grid gap-2 sm:grid-cols-3">
            <Metric
              icon={Cpu}
              label="하위 설비"
              value={managedAssets.length}
            />
            <Metric
              icon={Thermometer}
              label="이상 설비"
              value={abnormalCount}
            />
            <Metric
              icon={Activity}
              label="관찰 대상"
              value={watchCount}
            />
          </div>
        </section>

        {isRegistering ? (
          <section className="LocationSummaryPage LocationSummaryPage__section-3 rounded-md border border-border bg-card p-3 text-card-foreground">
            <div className="LocationSummaryPage LocationSummaryPage__container-11 mb-3 flex min-w-0 items-center justify-between gap-2">
              <div className="LocationSummaryPage LocationSummaryPage__container-12 flex min-w-0 items-center gap-1.5">
                <Plus
                  className="LocationSummaryPage LocationSummaryPage__icon-4 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="LocationSummaryPage LocationSummaryPage__title-4 truncate text-sm font-semibold">
                  설비 등록
                </h2>
              </div>
              <span className="LocationSummaryPage LocationSummaryPage__label-4 shrink-0 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {location.name}
              </span>
            </div>

            {createAssetMessage ? (
              <p
                className={cn(
                  "LocationSummaryPage LocationSummaryPage__message-1 mb-3 rounded-md border px-3 py-2 text-xs font-semibold",
                  createAssetMessage.tone === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
                )}
              >
                {createAssetMessage.text}
              </p>
            ) : null}

            <form
              className="LocationSummaryPage LocationSummaryPage__form-1 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={handleRegisterAsset}
            >
              <div className="LocationSummaryPage LocationSummaryPage__container-13 grid gap-2">
                <TextField
                  label="설비명"
                  value={draft.name}
                  onChange={(name) =>
                    setDraft((current) => ({ ...current, name }))
                  }
                />
                <TextField
                  label="설비 유형"
                  value={draft.type}
                  onChange={(type) =>
                    setDraft((current) => ({ ...current, type }))
                  }
                />
                <TextAreaField
                  label="설명"
                  value={draft.description}
                  onChange={(description) =>
                    setDraft((current) => ({ ...current, description }))
                  }
                />
              </div>

              <button
                type="submit"
                disabled={!canRegister || isCreatingAsset}
                className={cn(
                  "LocationSummaryPage LocationSummaryPage__button-2 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-end rounded-md border px-3 text-xs font-semibold transition",
                  canRegister && !isCreatingAsset
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "cursor-not-allowed border-border bg-muted text-muted-foreground",
                )}
              >
                <Save
                  className="LocationSummaryPage LocationSummaryPage__icon-5 h-3.5 w-3.5"
                  aria-hidden="true"
                />
                {isCreatingAsset ? "등록 중" : "등록"}
              </button>
            </form>
          </section>
        ) : null}

        <section className="LocationSummaryPage LocationSummaryPage__section-2 grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <div className="LocationSummaryPage LocationSummaryPage__container-5 min-h-0 overflow-y-auto rounded-md border border-border bg-card p-3 text-card-foreground">
            <div className="LocationSummaryPage LocationSummaryPage__container-15 flex min-w-0 items-center justify-between gap-2">
              <h2 className="LocationSummaryPage LocationSummaryPage__title-2 truncate text-sm font-semibold">
                하위 설비 현상 요약
              </h2>
            </div>

            <div className="LocationSummaryPage LocationSummaryPage__container-6 mt-2 grid gap-2 md:grid-cols-2">
              {managedAssets.length ? (
                managedAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={asset.id === selectedAssetId}
                    onRemove={handleRemoveAsset}
                    onSelect={setSelectedAssetId}
                  />
                ))
              ) : (
                <div className="LocationSummaryPage LocationSummaryPage__empty-1 grid min-h-40 place-items-center rounded-md border border-dashed border-border bg-background px-4 text-center text-sm text-muted-foreground md:col-span-2">
                  등록된 설비가 없습니다.
                </div>
              )}
            </div>
          </div>

          <AssetOptionPanel
            asset={selectedAsset}
            draftAsset={selectedDraftAsset}
            hasUnsavedChanges={selectedHasUnsavedChanges}
            saveMessage={assetSaveMessage}
            onChange={handleAssetChange}
            onRemove={handleRemoveAsset}
            onRequestSave={handleRequestAssetOptionSave}
          />
        </section>
      </div>
      {pendingSaveComparison ? (
        <AssetOptionSaveDialog
          comparison={pendingSaveComparison}
          errorMessage={assetSaveError}
          isSaving={isSavingAssetOptions}
          onCancel={handleCancelAssetOptionSave}
          onConfirm={handleConfirmAssetOptionSave}
        />
      ) : null}
    </main>
  );
}
function AssetCard({ asset, selected, onRemove, onSelect }) {
  return (
    <article
      className={cn(
        "LocationSummaryPage LocationSummaryPage__card-1 flex min-h-44 min-w-0 flex-col justify-between rounded-md border border-border bg-background p-3 transition",
        selected && "border-primary bg-primary/5",
      )}
    >
      <button
        type="button"
        className="LocationSummaryPage LocationSummaryPage__button-card-1 min-w-0 text-left"
        onClick={() => onSelect(asset.id)}
      >
        <div className="LocationSummaryPage LocationSummaryPage__container-7 mb-2 flex min-w-0 items-start justify-between gap-2">
          <div className="LocationSummaryPage LocationSummaryPage__container-8 min-w-0">
            <p className="LocationSummaryPage LocationSummaryPage__text-3 truncate text-[11px] text-muted-foreground">
              {asset.type}
            </p>
            <h3 className="LocationSummaryPage LocationSummaryPage__title-3 truncate text-sm font-semibold">
              {asset.name}
            </h3>
          </div>
          <span
            className={cn(
              "LocationSummaryPage LocationSummaryPage__label-2 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
              dashboardStatusClassName[asset.status],
            )}
          >
            {statusLabel[asset.status]}
          </span>
        </div>

        <div className="LocationSummaryPage LocationSummaryPage__container-16 grid gap-1.5 text-xs text-muted-foreground">
          <AssetOptionRow
            icon={Clock3}
            label="최근 수집"
            value={asset.lastCollectedAt}
          />
          <AssetOptionRow
            icon={Camera}
            label="카메라"
            value={asset.cameraId || "미등록"}
          />
          <AssetOptionRow
            icon={SlidersHorizontal}
            label="임계"
            value={`${asset.temperatureThreshold}℃ · ${asset.ultrasoundThresholdDb} dB`}
          />
        </div>
      </button>

      <div className="LocationSummaryPage LocationSummaryPage__container-9 mt-3 flex items-center justify-between gap-2 text-xs font-medium">
        {asset.isUserDefined ? (
          <span className="LocationSummaryPage LocationSummaryPage__label-3 inline-flex h-7 items-center rounded-md border border-border bg-muted px-2 text-[11px] text-muted-foreground">
            대시보드 대기
          </span>
        ) : (
          <Link
            href={asset.href}
            className="LocationSummaryPage LocationSummaryPage__link-1 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold transition hover:bg-accent"
          >
            설비 대시보드
            <ArrowRight
              className="LocationSummaryPage LocationSummaryPage__icon-1 h-3.5 w-3.5"
              aria-hidden="true"
            />
          </Link>
        )}

        <div className="LocationSummaryPage LocationSummaryPage__container-17 flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="LocationSummaryPage LocationSummaryPage__button-4 grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground"
            onClick={() => onSelect(asset.id)}
            title="옵션 설정"
          >
            <Settings2
              className="LocationSummaryPage LocationSummaryPage__icon-7 h-3.5 w-3.5"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="LocationSummaryPage LocationSummaryPage__button-5 grid h-7 w-7 place-items-center rounded-md border border-red-500/35 bg-red-500/10 text-red-700 transition hover:bg-red-500/15 dark:text-red-300"
            onClick={() => onRemove(asset.id)}
            title="설비 제거"
          >
            <Trash2
              className="LocationSummaryPage LocationSummaryPage__icon-8 h-3.5 w-3.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </article>
  );
}
function AssetOptionPanel({
  asset,
  draftAsset,
  hasUnsavedChanges,
  saveMessage,
  onChange,
  onRemove,
  onRequestSave,
}) {
  if (!asset) {
    return (
      <aside className="LocationSummaryPage LocationSummaryPage__aside-1 grid min-h-72 place-items-center rounded-md border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
        설비를 선택하면 옵션을 설정할 수 있습니다.
      </aside>
    );
  }
  const optionAsset = draftAsset ?? asset;
  return (
    <aside className="LocationSummaryPage LocationSummaryPage__aside-2 min-h-0 min-w-0 overflow-y-auto rounded-md border border-border bg-card p-3 text-card-foreground">
      <div className="LocationSummaryPage LocationSummaryPage__container-18 mb-3 flex min-w-0 items-start justify-between gap-2">
        <div className="LocationSummaryPage LocationSummaryPage__container-19 min-w-0">
          <p className="LocationSummaryPage LocationSummaryPage__text-5 truncate text-[11px] text-muted-foreground">
            설비 옵션 설정
          </p>
          <h2 className="LocationSummaryPage LocationSummaryPage__title-5 truncate text-sm font-semibold">
            {asset.name}
          </h2>
        </div>
        <div className="LocationSummaryPage LocationSummaryPage__container-25 flex shrink-0 flex-col items-end gap-1 text-right">
          <span
            className={cn(
              "LocationSummaryPage LocationSummaryPage__label-5 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
              dashboardStatusClassName[asset.status],
            )}
          >
            {statusLabel[asset.status]}
          </span>
          <span className="LocationSummaryPage LocationSummaryPage__label-15 max-w-36 truncate text-[10px] font-medium text-muted-foreground">
            최근 수정일 {formatOptionUpdatedAt(asset.optionUpdatedAt)}
          </span>
        </div>
      </div>

      <div className="LocationSummaryPage LocationSummaryPage__container-20 grid gap-2">
        {saveMessage ? (
          <p
            className={cn(
              "LocationSummaryPage LocationSummaryPage__message-2 rounded-md border px-3 py-2 text-xs font-semibold",
              saveMessage.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
            )}
          >
            {saveMessage.text}
          </p>
        ) : null}
        <TextField
          label="설비명"
          value={optionAsset.name}
          onChange={(name) => onChange(asset.id, { name })}
        />
        <TextField
          label="설비 유형"
          value={optionAsset.type}
          onChange={(type) => onChange(asset.id, { type })}
        />
        <CameraRegistrationField
          value={optionAsset.cameraId}
          onChange={(cameraId) => onChange(asset.id, { cameraId })}
        />

        <div className="LocationSummaryPage LocationSummaryPage__container-21 grid gap-2 rounded-md border border-border bg-background p-2">
          <div className="LocationSummaryPage LocationSummaryPage__container-26 flex min-w-0 items-center gap-1.5">
            <SlidersHorizontal
              className="LocationSummaryPage LocationSummaryPage__icon-12 h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="LocationSummaryPage LocationSummaryPage__title-6 truncate text-xs font-semibold">
              임계치
            </h3>
          </div>
          <div className="LocationSummaryPage LocationSummaryPage__container-27 grid grid-cols-2 gap-2">
            <NumberField
              label="온도"
              suffix="℃"
              min={0}
              value={optionAsset.temperatureThreshold}
              onChange={(temperatureThreshold) =>
                onChange(asset.id, { temperatureThreshold })
              }
            />
            <NumberField
              label="초음파"
              suffix="dB"
              min={0}
              value={optionAsset.ultrasoundThresholdDb}
              onChange={(ultrasoundThresholdDb) =>
                onChange(asset.id, { ultrasoundThresholdDb })
              }
            />
          </div>
        </div>

        <div className="LocationSummaryPage LocationSummaryPage__container-23 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <TextField
            label="담당자 이름"
            value={optionAsset.manager}
            onChange={(manager) => onChange(asset.id, { manager })}
          />
          <TextField
            label="담당자 이메일"
            value={optionAsset.managerEmail}
            onChange={(managerEmail) => onChange(asset.id, { managerEmail })}
          />
          <TextField
            label="담당자 연락처"
            value={optionAsset.managerContact}
            onChange={(managerContact) =>
              onChange(asset.id, {
                emergencyContact: managerContact,
                managerContact,
              })
            }
          />
          <TextField
            label="유지보수 업체"
            value={optionAsset.maintenanceCompany}
            onChange={(maintenanceCompany) =>
              onChange(asset.id, { maintenanceCompany })
            }
          />
        </div>

        <div className="LocationSummaryPage LocationSummaryPage__container-24 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <DateField
            label="마지막 점검일"
            value={optionAsset.lastInspectionDate}
            onChange={(lastInspectionDate) =>
              onChange(asset.id, { lastInspectionDate })
            }
          />
        </div>

        {hasUnsavedChanges ? (
          <button
            type="button"
            className="LocationSummaryPage LocationSummaryPage__button-7 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            onClick={() => onRequestSave(asset.id)}
          >
            <Save
              className="LocationSummaryPage LocationSummaryPage__icon-11 h-3.5 w-3.5"
              aria-hidden="true"
            />
            변경사항 저장
          </button>
        ) : null}

        <button
          type="button"
          className="LocationSummaryPage LocationSummaryPage__button-6 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/10 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-500/15 dark:text-red-300"
          onClick={() => onRemove(asset.id)}
        >
          <Trash2
            className="LocationSummaryPage LocationSummaryPage__icon-9 h-3.5 w-3.5"
            aria-hidden="true"
          />
          설비 제거
        </button>
      </div>
    </aside>
  );
}
function AssetOptionSaveDialog({
  comparison,
  errorMessage,
  isSaving,
  onCancel,
  onConfirm,
}) {
  const changedRows = getChangedOptionRows(
    comparison.before,
    comparison.after,
    optionComparisonFields,
  );
  return (
    <div
      className="LocationSummaryPage LocationSummaryPage__save-overlay-1 fixed inset-0 z-[80] grid place-items-center bg-black/55 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="설비 옵션 저장 확인"
      onClick={onCancel}
    >
      <div
        className="LocationSummaryPage LocationSummaryPage__save-dialog-1 grid h-[min(88dvh,46rem)] w-[min(58rem,calc(100dvw-1.5rem))] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="LocationSummaryPage LocationSummaryPage__save-header-1 flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="LocationSummaryPage LocationSummaryPage__save-header-text-1 min-w-0">
            <p className="LocationSummaryPage LocationSummaryPage__save-eyebrow-1 truncate text-[11px] font-medium text-muted-foreground">
              설비 옵션 저장 확인
            </p>
            <h3 className="LocationSummaryPage LocationSummaryPage__save-title-1 truncate text-base font-semibold">
              {comparison.after.name}
            </h3>
          </div>
          <button
            type="button"
            className="LocationSummaryPage LocationSummaryPage__save-close-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onCancel}
            title="닫기"
          >
            <X
              className="LocationSummaryPage LocationSummaryPage__save-close-icon-1 h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </header>

        <div className="LocationSummaryPage LocationSummaryPage__save-body-1 grid min-h-0 gap-3 overflow-y-auto p-4">
          <section className="LocationSummaryPage LocationSummaryPage__save-changes-1 rounded-md border border-border bg-background p-3">
            <div className="LocationSummaryPage LocationSummaryPage__save-section-header-1 mb-2 flex min-w-0 items-center justify-between gap-2">
              <h4 className="LocationSummaryPage LocationSummaryPage__save-section-title-1 truncate text-sm font-semibold">
                변경된 항목
              </h4>
            </div>
            <div className="LocationSummaryPage LocationSummaryPage__save-change-list-1 grid gap-1.5">
              {changedRows.map((row) => (
                <div
                  key={row.key}
                  className="LocationSummaryPage LocationSummaryPage__save-change-row-1 grid gap-1 rounded-sm border border-border/70 bg-card px-2 py-1.5 text-xs sm:grid-cols-[7rem_minmax(0,1fr)]"
                >
                  <span className="LocationSummaryPage LocationSummaryPage__save-change-label-1 font-semibold text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="LocationSummaryPage LocationSummaryPage__save-change-value-1 flex min-w-0 flex-wrap items-center gap-1.5 break-words font-semibold">
                    <span className="LocationSummaryPage LocationSummaryPage__save-before-value-1 text-red-700 line-through decoration-red-500 decoration-2 dark:text-red-300">
                      {row.previousValue}
                    </span>
                    <span className="LocationSummaryPage LocationSummaryPage__save-arrow-1 text-muted-foreground">
                      →
                    </span>
                    <span className="LocationSummaryPage LocationSummaryPage__save-after-value-1 rounded-sm bg-emerald-500/10 px-1 font-bold text-emerald-700 dark:text-emerald-300">
                      {row.nextValue}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="LocationSummaryPage LocationSummaryPage__save-compare-1 grid min-h-0 gap-3 lg:grid-cols-2">
            <OptionSnapshot
              title="변경 전"
              asset={comparison.before}
              compareAsset={comparison.after}
              variant="before"
            />
            <OptionSnapshot
              title="변경 후"
              asset={comparison.after}
              compareAsset={comparison.before}
              variant="after"
            />
          </section>

          {errorMessage ? (
            <p className="LocationSummaryPage LocationSummaryPage__save-error-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer className="LocationSummaryPage LocationSummaryPage__save-footer-1 flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            className="LocationSummaryPage LocationSummaryPage__save-cancel-1 inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="LocationSummaryPage LocationSummaryPage__save-confirm-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onConfirm}
          >
            <Save
              className="LocationSummaryPage LocationSummaryPage__save-confirm-icon-1 h-4 w-4"
              aria-hidden="true"
            />
            {isSaving ? "저장 중" : "서버에 저장"}
          </button>
        </footer>
      </div>
    </div>
  );
}
function OptionSnapshot({ asset, compareAsset, title, variant }) {
  return (
    <article className="LocationSummaryPage LocationSummaryPage__snapshot-1 min-w-0 rounded-md border border-border bg-background p-3">
      <h4 className="LocationSummaryPage LocationSummaryPage__snapshot-title-1 mb-2 truncate text-sm font-semibold">
        {title}
      </h4>
      <div className="LocationSummaryPage LocationSummaryPage__snapshot-list-1 grid gap-1.5">
        {optionComparisonFields.map((field) => {
          const isChanged = isOptionFieldChanged(
            field.key,
            asset,
            compareAsset,
          );
          return (
            <div
              key={field.key}
              className={cn(
                "LocationSummaryPage LocationSummaryPage__snapshot-row-1 grid gap-1 rounded-sm border px-2 py-1.5 text-xs",
                isChanged && variant === "before"
                  ? "border-red-500/30 bg-red-500/10"
                  : isChanged
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-border/70 bg-card",
              )}
            >
              <span
                className={cn(
                  "LocationSummaryPage LocationSummaryPage__snapshot-label-1 text-[10px] font-semibold",
                  isChanged
                    ? variant === "before"
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground",
                )}
              >
                {field.label}
              </span>
              <span
                className={cn(
                  "LocationSummaryPage LocationSummaryPage__snapshot-value-1 min-w-0 break-words font-semibold",
                  isChanged && variant === "before"
                    ? "text-red-700 line-through decoration-red-500 decoration-2 dark:text-red-300"
                    : isChanged
                      ? "font-bold text-emerald-700 dark:text-emerald-300"
                      : "text-foreground",
                )}
              >
                {formatOptionValue(field.key, asset?.[field.key])}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
function Metric({ icon: Icon, label, value }) {
  return (
    <div className="LocationMetric LocationMetric__container-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
      <Icon
        className="LocationMetric LocationMetric__icon-1 h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="LocationMetric LocationMetric__container-2 min-w-0">
        <p className="LocationMetric LocationMetric__text-1 truncate text-[11px] text-muted-foreground">
          {label}
        </p>
        <p className="LocationMetric LocationMetric__text-2 truncate text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>
  );
}
function AssetOptionRow({ icon: Icon, label, value }) {
  return (
    <p className="LocationSummaryPage LocationSummaryPage__text-6 flex min-w-0 items-center gap-1.5">
      <Icon
        className="LocationSummaryPage LocationSummaryPage__icon-10 h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="LocationSummaryPage LocationSummaryPage__label-7 shrink-0 text-muted-foreground">
        {label}
      </span>
      <span className="LocationSummaryPage LocationSummaryPage__value-1 min-w-0 truncate font-medium text-foreground">
        {value}
      </span>
    </p>
  );
}
function TextField({ label, onChange, value }) {
  return (
    <label className="LocationSummaryPage LocationSummaryPage__field-1 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-8 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <input
        className="LocationSummaryPage LocationSummaryPage__input-1 h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs font-semibold outline-none transition focus:border-primary"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function DateField({ label, onChange, value }) {
  return (
    <label className="LocationSummaryPage LocationSummaryPage__field-7 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-13 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <input
        className="LocationSummaryPage LocationSummaryPage__input-3 h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs font-semibold outline-none transition focus:border-primary"
        type="date"
        value={toDateInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CameraRegistrationField({ onChange, value }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cameraKey, setCameraKey] = useState(value ?? "");

  useEffect(() => {
    if (!isOpen) {
      setCameraKey(value ?? "");
    }
  }, [isOpen, value]);

  const trimmedCameraKey = cameraKey.trim();
  const canRegisterCamera = trimmedCameraKey.length > 0;
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canRegisterCamera) {
      return;
    }
    onChange(trimmedCameraKey);
    setIsOpen(false);
  };

  return (
    <div className="LocationSummaryPage LocationSummaryPage__field-8 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-14 truncate text-[10px] font-medium text-muted-foreground">
        연동 카메라
      </span>
      <div className="LocationSummaryPage LocationSummaryPage__camera-field-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
        <Camera
          className="LocationSummaryPage LocationSummaryPage__camera-icon-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="LocationSummaryPage LocationSummaryPage__camera-value-1 min-w-0 flex-1 truncate text-xs font-semibold">
          {value || "미등록"}
        </span>
        <button
          type="button"
          className="LocationSummaryPage LocationSummaryPage__camera-button-1 inline-flex h-7 shrink-0 items-center rounded-sm border border-border bg-card px-2 text-[11px] font-semibold text-foreground transition hover:bg-accent"
          onClick={() => setIsOpen(true)}
        >
          카메라 등록
        </button>
      </div>

      {isOpen ? (
        <div
          className="LocationSummaryPage LocationSummaryPage__camera-overlay-1 fixed inset-0 z-[70] grid place-items-center bg-black/50 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="연동 카메라 등록"
          onClick={() => setIsOpen(false)}
        >
          <form
            className="LocationSummaryPage LocationSummaryPage__camera-dialog-1 w-[min(24rem,calc(100dvw-1.5rem))] rounded-md border border-border bg-card p-4 text-card-foreground shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="LocationSummaryPage LocationSummaryPage__camera-header-1 mb-3 flex min-w-0 items-start justify-between gap-3">
              <div className="LocationSummaryPage LocationSummaryPage__camera-copy-1 min-w-0">
                <p className="LocationSummaryPage LocationSummaryPage__camera-eyebrow-1 truncate text-[11px] font-medium text-muted-foreground">
                  연동 카메라
                </p>
                <h3 className="LocationSummaryPage LocationSummaryPage__camera-title-1 truncate text-sm font-semibold">
                  카메라 고유 키 등록
                </h3>
              </div>
              <button
                type="button"
                className="LocationSummaryPage LocationSummaryPage__camera-close-1 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
                onClick={() => setIsOpen(false)}
                title="닫기"
              >
                <X
                  className="LocationSummaryPage LocationSummaryPage__camera-close-icon-1 h-3.5 w-3.5"
                  aria-hidden="true"
                />
              </button>
            </div>

            <label className="LocationSummaryPage LocationSummaryPage__camera-key-field-1 grid min-w-0 gap-1">
              <span className="LocationSummaryPage LocationSummaryPage__camera-key-label-1 truncate text-[10px] font-medium text-muted-foreground">
                카메라 고유 키
              </span>
              <input
                autoFocus
                className="LocationSummaryPage LocationSummaryPage__camera-key-input-1 h-9 min-w-0 rounded-md border border-border bg-background px-3 font-mono text-sm font-semibold outline-none transition focus:border-primary"
                placeholder="CAM-KEY-0001"
                value={cameraKey}
                onChange={(event) => setCameraKey(event.target.value)}
              />
            </label>

            <div className="LocationSummaryPage LocationSummaryPage__camera-actions-1 mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="LocationSummaryPage LocationSummaryPage__camera-cancel-1 inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                취소
              </button>
              <button
                type="submit"
                className={cn(
                  "LocationSummaryPage LocationSummaryPage__camera-submit-1 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition",
                  canRegisterCamera
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "cursor-not-allowed border-border bg-muted text-muted-foreground",
                )}
                disabled={!canRegisterCamera}
              >
                <Save
                  className="LocationSummaryPage LocationSummaryPage__camera-submit-icon-1 h-3.5 w-3.5"
                  aria-hidden="true"
                />
                등록
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function TextAreaField({ label, onChange, value }) {
  return (
    <label className="LocationSummaryPage LocationSummaryPage__field-6 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-12 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <textarea
        className="LocationSummaryPage LocationSummaryPage__textarea-1 min-h-20 min-w-0 resize-none rounded-md border border-border bg-background px-2 py-2 text-xs font-semibold outline-none transition focus:border-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function NumberField({ label, min, onChange, suffix, value }) {
  return (
    <label className="LocationSummaryPage LocationSummaryPage__field-3 grid min-w-0 gap-1">
      <span className="LocationSummaryPage LocationSummaryPage__label-10 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="LocationSummaryPage LocationSummaryPage__container-22 flex h-8 min-w-0 items-center gap-1 rounded-md border border-border bg-background px-2 transition focus-within:border-primary">
        <input
          className="LocationSummaryPage LocationSummaryPage__input-2 min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold outline-none"
          type="number"
          min={min}
          value={value}
          onChange={(event) =>
            onChange(readBoundedNumber(event.target.value, value, min))
          }
        />
      </span>
    </label>
  );
}
function toManagedAsset(asset) {
  return {
    ...asset,
    cameraId: readAssetCameraId(asset) ?? "",
    emergencyContact: asset.emergencyContact ?? asset.managerContact ?? "",
    lastInspectionDate: asset.lastInspectionDate ?? "",
    maintenanceCompany: asset.maintenanceCompany ?? "",
    manager: asset.manager ?? "",
    managerContact: asset.managerContact ?? asset.emergencyContact ?? "",
    managerEmail: asset.managerEmail ?? "",
    optionUpdatedAt: asset.optionUpdatedAt ?? "",
    temperatureThreshold: asset.type === "전기 설비" ? 65 : 70,
    ultrasoundThresholdDb: asset.type === "배관 설비" ? 68 : 72,
  };
}
function readAssetCameraId(record) {
  return readRecordString(record, [
    "cameraId",
    "camera_id",
    "cameraKey",
    "camera_key",
    "primaryCameraId",
    "primary_camera_id",
  ]);
}
function readRecordString(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}
function createAssetSnapshotMap(assets) {
  return Object.fromEntries(assets.map((asset) => [asset.id, { ...asset }]));
}
function getChangedOptionRows(previousAsset, nextAsset, fields) {
  if (!previousAsset || !nextAsset) {
    return [];
  }
  return fields
    .map((field) => {
      const previousValue = formatOptionValue(
        field.key,
        previousAsset[field.key],
      );
      const nextValue = formatOptionValue(field.key, nextAsset[field.key]);
      return {
        key: field.key,
        label: field.label,
        nextValue,
        previousValue,
      };
    })
    .filter((row) => row.previousValue !== row.nextValue);
}
function isOptionFieldChanged(key, asset, compareAsset) {
  if (!asset || !compareAsset) {
    return false;
  }
  return (
    formatOptionValue(key, asset[key]) !==
    formatOptionValue(key, compareAsset[key])
  );
}
function formatOptionValue(key, value) {
  if (key === "status") {
    return statusLabel[value] ?? readDisplayValue(value);
  }
  if (key === "temperatureThreshold") {
    return `${readDisplayValue(value)}℃`;
  }
  if (key === "ultrasoundThresholdDb") {
    return `${readDisplayValue(value)} dB`;
  }
  return readDisplayValue(value);
}
function readDisplayValue(value) {
  if (value === undefined || value === null || value === "") {
    return "미지정";
  }
  return String(value);
}
function toAssetOptionSavePayload(asset) {
  return removeUndefinedValues({
    asset_code: asset.assetCode ?? asset.asset_code,
    asset_number: asset.assetNumber ?? asset.asset_number,
    camera_id: asset.cameraId,
    description: asset.description,
    emergency_contact: asset.managerContact ?? asset.emergencyContact,
    last_inspection_date: asset.lastInspectionDate,
    location_id: asset.locationId,
    maintenance_company: asset.maintenanceCompany,
    manager: asset.manager,
    manager_contact: asset.managerContact ?? asset.emergencyContact,
    manager_email: asset.managerEmail,
    model_name: asset.modelName ?? asset.model_name,
    name: asset.name,
    operation_state: asset.operationState,
    option_updated_at: asset.optionUpdatedAt,
    primary_camera_id: asset.cameraId,
    serial_number: asset.serialNumber ?? asset.serial_number,
    site_id: asset.site_id,
    temperature_threshold: asset.temperatureThreshold,
    type: asset.type,
    ultrasound_threshold_db: asset.ultrasoundThresholdDb,
  });
}
function removeUndefinedValues(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}
function readCreatedAssetId(response) {
  const record = readAssetResponseRecord(response);
  const value = record?.asset_id ?? record?.id;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function readCreatedAssetCameraId(response) {
  return readAssetCameraId(readAssetResponseRecord(response));
}
function readCreatedAssetStatus(response) {
  const status = readRecordString(readAssetResponseRecord(response), ["status"]);
  return status && statusLabel[status] ? status : undefined;
}
function readAssetResponseRecord(response) {
  if (!response || typeof response !== "object") return undefined;
  return (
    response.asset && typeof response.asset === "object"
      ? response.asset
      : response.data && typeof response.data === "object"
        ? response.data
        : response
  );
}
function getCurrentClockLabel() {
  return formatCurrentDashboardTime();
}
function getCurrentDateTimeLabel() {
  return formatCurrentDashboardDateTime(undefined, { includeSeconds: false });
}
function formatOptionUpdatedAt(value) {
  if (!value) {
    return "기록 없음";
  }
  const formattedValue = formatCheckLabDateTime(value, undefined, {
    includeSeconds: false,
  });
  if (formattedValue) {
    return formattedValue.replace(/\s*KST$/, "");
  }
  const parsedTime = Date.parse(value);
  if (Number.isFinite(parsedTime)) {
    return createDashboardDateTimeFormatter(undefined, {
      includeSeconds: false,
    }).format(new Date(parsedTime));
  }
  return value;
}
function toDateInputValue(value) {
  if (typeof value !== "string") {
    return "";
  }
  const match = value.trim().match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}
function readBoundedNumber(value, fallback, min) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }
  return Math.max(min, parsedValue);
}
