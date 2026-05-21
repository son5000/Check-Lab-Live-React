"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Factory,
  MapPin,
  Pencil,
  Plus,
  Save,
  SkipForward,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";
import {
  ImageUploadField,
  OperationStateSelect,
  TextAreaField,
  TextField,
} from "@/app/site/components/site-form-fields";

const EDITOR_STEPS = [
  { id: "site", icon: Factory, label: "공정", number: "01" },
  { id: "location", icon: MapPin, label: "위치", number: "02" },
  { id: "asset", icon: Cpu, label: "설비", number: "03" },
];

export function SiteEditor({
  activeLocation,
  activeLocationIndex,
  activeSite,
  activeSiteIndex,
  canSaveAsset,
  canSaveLocation,
  canSaveSite,
  draftAsset,
  draftLocation,
  draftSite,
  editingAssetId,
  editorStep,
  isMutating,
  pendingAction,
  onAssetChange,
  onEditAsset,
  onGoBack,
  onLocationChange,
  onRemoveAsset,
  onRemoveLocation,
  onRemoveSite,
  onSaveAsset,
  onSaveLocation,
  onSaveLocationAndStartAsset,
  onSaveSite,
  onSelectLocation,
  onSiteChange,
  onSkip,
  onStartAsset,
  onStartLocation,
}) {
  return (
    <div className="SiteEditor SiteIndexPage__editor-1 flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground">
      <EditorHeader editorStep={editorStep} onGoBack={onGoBack} onSkip={onSkip} />
      <div className="SiteEditor SiteIndexPage__editor-body-1 flex-1 overflow-y-auto p-5">
        {editorStep === "site" ? (
          <SiteEditForm
            activeSiteIndex={activeSiteIndex}
            canSaveSite={canSaveSite}
            draftSite={draftSite}
            isMutating={isMutating}
            pendingAction={pendingAction}
            onRemoveSite={onRemoveSite}
            onSaveSite={onSaveSite}
            onSiteChange={onSiteChange}
          />
        ) : null}
        {editorStep === "location" ? (
          <LocationEditForm
            activeLocationIndex={activeLocationIndex}
            activeSite={activeSite}
            canSaveLocation={canSaveLocation}
            draftLocation={draftLocation}
            isMutating={isMutating}
            pendingAction={pendingAction}
            onLocationChange={onLocationChange}
            onRemoveLocation={onRemoveLocation}
            onSaveLocation={onSaveLocation}
            onSaveLocationAndStartAsset={onSaveLocationAndStartAsset}
            onSelectLocation={onSelectLocation}
            onStartLocation={onStartLocation}
          />
        ) : null}
        {editorStep === "asset" ? (
          <AssetEditForm
            activeLocation={activeLocation}
            activeLocationIndex={activeLocationIndex}
            activeSite={activeSite}
            canSaveAsset={canSaveAsset}
            draftAsset={draftAsset}
            editingAssetId={editingAssetId}
            isMutating={isMutating}
            pendingAction={pendingAction}
            onAssetChange={onAssetChange}
            onEditAsset={onEditAsset}
            onRemoveAsset={onRemoveAsset}
            onSaveAsset={onSaveAsset}
            onSelectLocation={onSelectLocation}
            onStartAsset={onStartAsset}
          />
        ) : null}
      </div>
    </div>
  );
}

function EditorHeader({ editorStep, onGoBack, onSkip }) {
  return (
    <div className="SiteEditor SiteIndexPage__editor-header-1 flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
      {editorStep !== "site" ? (
        <button
          type="button"
          className="SiteEditor SiteIndexPage__back-btn-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          onClick={onGoBack}
        >
          <ArrowLeft className="SiteEditor h-4 w-4" aria-hidden="true" />
          이전으로
        </button>
      ) : null}

      <div className="SiteEditor flex min-w-0 flex-1 items-center gap-2">
        {EDITOR_STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = editorStep === step.id;
          const isPast =
            (step.id === "site" && (editorStep === "location" || editorStep === "asset")) ||
            (step.id === "location" && editorStep === "asset");

          return (
            <span
              key={step.id}
              className={cn(
                "SiteEditor SiteIndexPage__step-tab-1 inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
                isActive
                  ? "border-cyan-300/50 bg-cyan-300/10 text-foreground"
                  : isPast
                    ? "border-border bg-background text-muted-foreground"
                    : "border-transparent text-muted-foreground/40",
              )}
            >
              <span className="SiteEditor grid h-5 w-6 shrink-0 place-items-center rounded-sm border border-border bg-card text-[10px] font-bold text-muted-foreground">
                {step.number}
              </span>
              <Icon className="SiteEditor h-4 w-4 shrink-0" aria-hidden="true" />
              {step.label}
            </span>
          );
        })}
      </div>

      {editorStep === "location" || editorStep === "asset" ? (
        <button
          type="button"
          className="SiteEditor SiteIndexPage__skip-btn-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          onClick={onSkip}
        >
          건너뛰기
          <SkipForward className="SiteEditor h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function SiteEditForm({
  activeSiteIndex,
  canSaveSite,
  draftSite,
  isMutating,
  pendingAction,
  onRemoveSite,
  onSaveSite,
  onSiteChange,
}) {
  return (
    <div className="SiteEditor SiteIndexPage__site-form-1 grid max-w-lg gap-5">
      <FormHeading title="공정 등록" description="공정 기본 정보를 입력하세요." />
      <TextField
        label="공정명 (name)"
        onChange={(value) => onSiteChange((site) => ({ ...site, name: value }))}
        placeholder="압축 공정"
        value={draftSite.name}
      />
      <TextAreaField
        label="설명 (description)"
        onChange={(value) => onSiteChange((site) => ({ ...site, description: value }))}
        placeholder="공정 설명"
        value={draftSite.description}
      />
      <ImageUploadField
        label="대표 이미지"
        onChange={(value) => onSiteChange((site) => ({ ...site, imageUrl: value }))}
        value={draftSite.imageUrl}
        onRemove={() => onSiteChange((site) => ({ ...site, imageUrl: undefined }))}
      />
      <div className="SiteEditor SiteIndexPage__actions-1 flex justify-between gap-3">
        {activeSiteIndex !== undefined ? (
          <DeleteButton
            disabled={isMutating}
            isPending={pendingAction === "site-delete"}
            onClick={() => onRemoveSite(activeSiteIndex)}
          />
        ) : (
          <span />
        )}
        <button
          type="button"
          className="SiteEditor SiteIndexPage__save-1 inline-flex h-10 items-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSaveSite || isMutating}
          onClick={onSaveSite}
        >
          <Save className="SiteEditor h-4 w-4" aria-hidden="true" />
          {pendingAction === "site-save" ? "저장 중" : "저장 후 위치 등록"}
        </button>
      </div>
    </div>
  );
}

function LocationEditForm({
  activeLocationIndex,
  activeSite,
  canSaveLocation,
  draftLocation,
  isMutating,
  pendingAction,
  onLocationChange,
  onRemoveLocation,
  onSaveLocation,
  onSaveLocationAndStartAsset,
  onSelectLocation,
  onStartLocation,
}) {
  return (
    <div className="SiteEditor SiteIndexPage__location-form-1 grid max-w-lg gap-5">
      <FormHeading
        title="위치 등록"
        description={
          <>
            공정 <span className="SiteEditor font-medium text-foreground">{activeSite?.name}</span> 에
            위치를 추가합니다.
          </>
        }
      />
      <LocationChipList
        activeLocationIndex={activeLocationIndex}
        locations={activeSite?.locations ?? []}
        onSelectLocation={onSelectLocation}
        onStartLocation={onStartLocation}
        showAddButton
      />
      <div className="SiteEditor grid gap-5 sm:grid-cols-2">
        <TextField
          disabled={!activeSite}
          label="위치명 (name)"
          onChange={(value) => onLocationChange((loc) => ({ ...loc, name: value }))}
          placeholder="1층 기계실"
          value={draftLocation.name}
        />
        <TextField
          disabled={!activeSite}
          label="층 (floor)"
          onChange={(value) => onLocationChange((loc) => ({ ...loc, floor: value }))}
          placeholder="1F"
          value={draftLocation.floor}
        />
      </div>
      <TextAreaField
        disabled={!activeSite}
        label="설명 (summary)"
        onChange={(value) => onLocationChange((loc) => ({ ...loc, summary: value }))}
        placeholder="위치 설명"
        value={draftLocation.summary}
      />
      <ImageUploadField
        disabled={!activeSite}
        label="대표 이미지"
        onChange={(value) => onLocationChange((loc) => ({ ...loc, imageUrl: value }))}
        value={draftLocation.imageUrl}
        onRemove={() => onLocationChange((loc) => ({ ...loc, imageUrl: undefined }))}
      />
      <div className="SiteEditor SiteIndexPage__actions-2 flex flex-wrap justify-between gap-3">
        {activeLocationIndex !== undefined ? (
          <DeleteButton
            disabled={isMutating}
            isPending={pendingAction === "location-delete"}
            onClick={() => onRemoveLocation(activeLocationIndex)}
          />
        ) : (
          <span />
        )}
        <div className="SiteEditor flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="SiteEditor SiteIndexPage__save-location-1 inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSaveLocation || isMutating}
            onClick={onSaveLocation}
          >
            <CheckCircle2 className="SiteEditor h-4 w-4" aria-hidden="true" />
            {pendingAction === "location-save" ? "저장 중" : "위치 저장"}
          </button>
          <button
            type="button"
            className="SiteEditor SiteIndexPage__save-2 inline-flex h-10 items-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSaveLocation || isMutating}
            onClick={onSaveLocationAndStartAsset}
          >
            <CheckCircle2 className="SiteEditor h-4 w-4" aria-hidden="true" />
            {pendingAction === "location-save" ? "저장 중" : "저장 후 설비 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetEditForm({
  activeLocation,
  activeLocationIndex,
  activeSite,
  canSaveAsset,
  draftAsset,
  editingAssetId,
  isMutating,
  pendingAction,
  onAssetChange,
  onEditAsset,
  onRemoveAsset,
  onSaveAsset,
  onSelectLocation,
  onStartAsset,
}) {
  return (
    <div className="SiteEditor SiteIndexPage__asset-form-1 grid gap-5">
      <div className="SiteEditor flex min-w-0 items-start justify-between gap-3">
        <div className="SiteEditor min-w-0">
          <h3 className="SiteEditor text-base font-semibold text-foreground">
            {editingAssetId ? "설비 수정" : "설비 등록"}
          </h3>
          <p className="SiteEditor mt-1 text-sm text-muted-foreground">
            위치{" "}
            <span className="SiteEditor font-medium text-foreground">
              {activeLocation?.name ?? "—"}
            </span>{" "}
            에 설비를 추가합니다.
          </p>
        </div>
        {editingAssetId ? (
          <button
            type="button"
            className="SiteEditor SiteIndexPage__asset-new-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isMutating}
            onClick={onStartAsset}
          >
            <Plus className="SiteEditor h-3.5 w-3.5" aria-hidden="true" />
            새 설비
          </button>
        ) : null}
      </div>

      <LocationChipList
        activeLocationIndex={activeLocationIndex}
        label="위치 선택"
        locations={activeSite?.locations ?? []}
        onSelectLocation={onSelectLocation}
      />

      <div className="SiteEditor grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AssetFields
          activeLocation={activeLocation}
          canSaveAsset={canSaveAsset}
          draftAsset={draftAsset}
          editingAssetId={editingAssetId}
          isMutating={isMutating}
          pendingAction={pendingAction}
          onAssetChange={onAssetChange}
          onSaveAsset={onSaveAsset}
        />
        <AssetList
          activeLocation={activeLocation}
          editingAssetId={editingAssetId}
          isMutating={isMutating}
          onEditAsset={onEditAsset}
          onRemoveAsset={onRemoveAsset}
        />
      </div>
    </div>
  );
}

function AssetFields({
  activeLocation,
  canSaveAsset,
  draftAsset,
  editingAssetId,
  isMutating,
  pendingAction,
  onAssetChange,
  onSaveAsset,
}) {
  return (
    <div className="SiteEditor grid content-start gap-5">
      <div className="SiteEditor grid gap-5 sm:grid-cols-2">
        <TextField
          disabled={!activeLocation}
          label="설비명 (name)"
          onChange={(value) => onAssetChange((asset) => ({ ...asset, name: value }))}
          placeholder="압축기 1호기"
          value={draftAsset.name}
        />
        <TextField
          disabled={!activeLocation}
          label="설비 코드 (asset_code)"
          onChange={(value) =>
            onAssetChange((asset) => ({ ...asset, asset_code: value }))
          }
          placeholder="EQ-CP-001"
          value={draftAsset.asset_code}
        />
      </div>
      <div className="SiteEditor grid gap-5 sm:grid-cols-2">
        <TextField
          disabled={!activeLocation}
          label="자산 번호 (asset_number)"
          onChange={(value) =>
            onAssetChange((asset) => ({ ...asset, asset_number: value }))
          }
          placeholder="ASSET-COMPRESSOR-01"
          value={draftAsset.asset_number}
        />
        <TextField
          disabled={!activeLocation}
          label="모델명 (model_name)"
          onChange={(value) =>
            onAssetChange((asset) => ({ ...asset, model_name: value }))
          }
          placeholder="모델명"
          value={draftAsset.model_name}
        />
      </div>
      <div className="SiteEditor grid gap-5 sm:grid-cols-2">
        <TextField
          disabled={!activeLocation}
          label="시리얼 번호 (serial_number)"
          onChange={(value) =>
            onAssetChange((asset) => ({ ...asset, serial_number: value }))
          }
          placeholder="시리얼 번호"
          value={draftAsset.serial_number}
        />
        {editingAssetId ? (
          <OperationStateSelect
            disabled={!activeLocation}
            label="가동 여부 (operation_state)"
            onChange={(value) =>
              onAssetChange((asset) => ({ ...asset, operation_state: value }))
            }
            value={draftAsset.operation_state}
          />
        ) : (
          <TextField
            disabled={!activeLocation}
            label="유형 (type)"
            onChange={(value) => onAssetChange((asset) => ({ ...asset, type: value }))}
            placeholder="회전 설비"
            value={draftAsset.type}
          />
        )}
      </div>
      <div className="SiteEditor grid gap-5 sm:grid-cols-2">
        {editingAssetId ? (
          <TextField
            disabled={!activeLocation}
            label="유형 (type)"
            onChange={(value) => onAssetChange((asset) => ({ ...asset, type: value }))}
            placeholder="회전 설비"
            value={draftAsset.type}
          />
        ) : null}
        <TextField
          disabled={!activeLocation}
          label="담당자 (manager)"
          onChange={(value) => onAssetChange((asset) => ({ ...asset, manager: value }))}
          placeholder="담당자"
          value={draftAsset.manager}
        />
      </div>
      <div className="SiteEditor grid gap-5 sm:grid-cols-2">
        <TextField
          disabled={!activeLocation}
          label="비상 연락처 (emergency_contact)"
          onChange={(value) =>
            onAssetChange((asset) => ({ ...asset, emergency_contact: value }))
          }
          placeholder="010-0000-0000"
          value={draftAsset.emergency_contact}
        />
        <TextField
          disabled={!activeLocation}
          label="마지막 점검일 (last_inspection_date)"
          onChange={(value) =>
            onAssetChange((asset) => ({ ...asset, last_inspection_date: value }))
          }
          type="date"
          value={draftAsset.last_inspection_date}
        />
      </div>
      <TextAreaField
        disabled={!activeLocation}
        label="설명 (description)"
        onChange={(value) =>
          onAssetChange((asset) => ({ ...asset, description: value }))
        }
        placeholder="설비 설명"
        value={draftAsset.description}
      />
      <ImageUploadField
        disabled={!activeLocation}
        label="대표 이미지"
        onChange={(value) => onAssetChange((asset) => ({ ...asset, imageUrl: value }))}
        value={draftAsset.imageUrl}
        onRemove={() => onAssetChange((asset) => ({ ...asset, imageUrl: undefined }))}
      />
      <div className="SiteEditor flex justify-end">
        <button
          type="button"
          className="SiteEditor SiteIndexPage__save-3 inline-flex h-10 items-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSaveAsset || isMutating}
          onClick={onSaveAsset}
        >
          {editingAssetId ? (
            <Save className="SiteEditor h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="SiteEditor h-4 w-4" aria-hidden="true" />
          )}
          {pendingAction === "asset-save"
            ? "저장 중"
            : editingAssetId
              ? "설비 수정"
              : "설비 등록"}
        </button>
      </div>
    </div>
  );
}

function AssetList({
  activeLocation,
  editingAssetId,
  isMutating,
  onEditAsset,
  onRemoveAsset,
}) {
  return (
    <div className="SiteEditor SiteIndexPage__asset-list-1 flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background">
      <div className="SiteEditor SiteIndexPage__asset-head-1 grid h-11 shrink-0 grid-cols-[minmax(0,1fr)_8rem_8rem_5rem] items-center gap-2 border-b border-border px-4 text-xs font-semibold text-muted-foreground">
        <span>설비명</span>
        <span>asset_id</span>
        <span>상태</span>
        <span />
      </div>
      <div className="SiteEditor SiteIndexPage__asset-body-1 flex-1 space-y-1 overflow-y-auto p-2">
        {activeLocation?.assets.length ? (
          activeLocation.assets.map((asset) => (
            <AssetListRow
              key={asset.asset_id}
              asset={asset}
              isMutating={isMutating}
              isSelected={editingAssetId === asset.asset_id}
              onEditAsset={onEditAsset}
              onRemoveAsset={onRemoveAsset}
            />
          ))
        ) : (
          <div className="SiteEditor rounded-md border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            등록된 설비 없음
          </div>
        )}
      </div>
    </div>
  );
}

function AssetListRow({ asset, isMutating, isSelected, onEditAsset, onRemoveAsset }) {
  return (
    <div
      className={cn(
        "SiteEditor SiteIndexPage__asset-row-1 grid min-h-11 grid-cols-[minmax(0,1fr)_8rem_8rem_5rem] items-center gap-2 rounded-md border border-border bg-card px-3 text-sm",
        isSelected && "border-cyan-300/50 bg-cyan-300/10",
      )}
    >
      <div className="SiteEditor min-w-0">
        <p className="SiteEditor truncate font-medium">{asset.name}</p>
        <p className="SiteEditor truncate text-xs text-muted-foreground">
          {asset.description || asset.type || "—"}
        </p>
      </div>
      <span className="SiteEditor truncate text-xs text-muted-foreground">{asset.asset_id}</span>
      <span
        className={cn(
          "SiteEditor SiteIndexPage__status-1 truncate rounded-sm border px-1.5 py-0.5 text-center text-[11px] font-semibold",
          dashboardStatusClassName[asset.status],
        )}
      >
        {asset.status}
      </span>
      <div className="SiteEditor flex items-center justify-end gap-1">
        <button
          type="button"
          className="SiteEditor grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isMutating}
          title="수정"
          aria-label="설비 수정"
          onClick={() => onEditAsset(asset)}
        >
          <Pencil className="SiteEditor h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="SiteEditor grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isMutating}
          title="삭제"
          aria-label="설비 삭제"
          onClick={() => onRemoveAsset(asset.asset_id)}
        >
          <Trash2 className="SiteEditor h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function LocationChipList({
  activeLocationIndex,
  label,
  locations,
  onSelectLocation,
  onStartLocation,
  showAddButton = false,
}) {
  if (!locations.length && !showAddButton) return null;

  return (
    <div>
      {label ? <p className="SiteEditor mb-2 text-xs font-semibold text-muted-foreground">{label}</p> : null}
      <div className="SiteEditor flex flex-wrap gap-2">
        {locations.map((location, locationIndex) => (
          <button
            key={location.location_id}
            type="button"
            className={cn(
              "SiteEditor SiteIndexPage__location-chip-1 inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-foreground transition hover:bg-accent",
              activeLocationIndex === locationIndex &&
                "border-cyan-300/50 bg-cyan-300/10 text-cyan-100",
            )}
            onClick={() => onSelectLocation(locationIndex)}
          >
            <MapPin className="SiteEditor h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="SiteEditor truncate">{location.name}</span>
          </button>
        ))}
        {showAddButton ? (
          <button
            type="button"
            className="SiteEditor SiteIndexPage__location-add-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-border bg-background px-3 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
            onClick={onStartLocation}
          >
            <Plus className="SiteEditor h-3.5 w-3.5" aria-hidden="true" />
            위치 추가
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FormHeading({ description, title }) {
  return (
    <div>
      <h3 className="SiteEditor text-base font-semibold text-foreground">{title}</h3>
      <p className="SiteEditor mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function DeleteButton({ disabled, isPending, onClick }) {
  return (
    <button
      type="button"
      className="SiteEditor SiteIndexPage__delete-1 inline-flex h-10 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-4 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      <Trash2 className="SiteEditor h-4 w-4" aria-hidden="true" />
      {isPending ? "삭제 중" : "삭제"}
    </button>
  );
}
