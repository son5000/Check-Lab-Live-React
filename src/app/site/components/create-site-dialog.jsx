"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Factory,
  MapPin,
  Plus,
  Save,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeAsset,
  normalizeLocation,
  normalizeSite,
} from "@/app/site/components/site-builder-model";
import {
  ImageUploadField,
  TextAreaField,
  TextField,
} from "@/app/site/components/site-form-fields";

export function buildCreatePreviewSite({
  asset,
  assetLocationKey,
  assets = [],
  isAssetSkipped,
  isLocationSkipped,
  location,
  locations = [],
  site,
}) {
  const normalizedLocations = appendCurrentLocation(locations, location);
  const targetLocationKey =
    assetLocationKey ?? normalizedLocations[0]?._clientId;
  const normalizedAssets = appendCurrentAsset(assets, asset, targetLocationKey);
  const assetsByLocationKey = normalizedAssets.reduce(
    (groupedAssets, nextAsset) => {
      const locationKey = nextAsset._locationKey;
      if (!locationKey) return groupedAssets;
      return {
        ...groupedAssets,
        [locationKey]: [
          ...(groupedAssets[locationKey] ?? []),
          stripAssetMeta(nextAsset),
        ],
      };
    },
    {},
  );

  return normalizeSite({
    ...site,
    locations: isLocationSkipped
      ? []
      : normalizedLocations.map((nextLocation) =>
          stripLocationMeta({
            ...nextLocation,
            assets: isAssetSkipped
              ? []
              : (assetsByLocationKey[nextLocation._clientId] ?? []),
          }),
        ),
  });
}

function appendCurrentLocation(locations, location) {
  const normalizedLocations = locations.map(normalizeLocation);
  if (!location.name.trim()) return normalizedLocations;

  return [
    ...normalizedLocations,
    {
      ...normalizeLocation(location),
      _clientId: "pending-location",
    },
  ];
}

function appendCurrentAsset(assets, asset, locationKey) {
  const normalizedAssets = assets.map(normalizeAsset);
  if (!asset.name.trim() || !locationKey) return normalizedAssets;

  return [
    ...normalizedAssets,
    {
      ...normalizeAsset(asset),
      _clientId: "pending-asset",
      _locationKey: locationKey,
    },
  ];
}

function stripLocationMeta(location) {
  const publicLocation = { ...location };
  delete publicLocation._clientId;
  return publicLocation;
}

function stripAssetMeta(asset) {
  const publicAsset = { ...asset };
  delete publicAsset._clientId;
  delete publicAsset._locationKey;
  return publicAsset;
}

export function CreateSiteDialog({
  asset,
  assetLocationKey,
  assets,
  canContinueAsset,
  canContinueLocation,
  canContinueSite,
  isAssetSkipped,
  isLocationSkipped,
  isMutating,
  location,
  locations,
  pendingAction,
  previewSite,
  site,
  step,
  onAddAsset,
  onAddLocation,
  onAssetChange,
  onAssetLocationChange,
  onBack,
  onClose,
  onCreate,
  onLocationChange,
  onNext,
  onRemoveAsset,
  onRemoveLocation,
  onSiteChange,
  onSkipAsset,
  onSkipLocation,
}) {
  const steps = [
    { id: "site", icon: Factory, label: "공정" },
    { id: "location", icon: MapPin, label: "위치" },
    { id: "asset", icon: Cpu, label: "설비" },
    { id: "summary", icon: CheckCircle2, label: "요약" },
  ];
  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <div
      className="CreateSiteDialog CreateSiteDialog__overlay-1 fixed inset-0 z-[80] grid place-items-center bg-black/55 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="공정 생성"
    >
      <div className="CreateSiteDialog CreateSiteDialog__panel-1 grid h-[min(90dvh,46rem)] w-[min(56rem,calc(100dvw-1.5rem))] min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-2xl">
        <header className="CreateSiteDialog CreateSiteDialog__header-1 flex h-14 min-w-0 items-center justify-between gap-3 border-b border-border px-4">
          <div className="CreateSiteDialog min-w-0">
            <h2 className="CreateSiteDialog truncate text-base font-semibold">
              공정 생성
            </h2>
            <p className="CreateSiteDialog truncate text-xs text-muted-foreground">
              입력한 구성은 마지막 요약 단계에서 한 번에 저장됩니다.
            </p>
          </div>
          <button
            type="button"
            className="CreateSiteDialog grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isMutating}
            onClick={onClose}
            title="닫기"
          >
            <X className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="CreateSiteDialog CreateSiteDialog__steps-1 flex min-w-0 gap-2 overflow-x-auto border-b border-border px-4 py-3">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.id === step;
            const isPast = index < activeIndex;

            return (
              <span
                key={item.id}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-semibold",
                  isActive
                    ? "border-cyan-300/50 bg-cyan-300/10 text-foreground"
                    : isPast
                      ? "border-border bg-background text-muted-foreground"
                      : "border-transparent text-muted-foreground/45",
                )}
              >
                <Icon className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
                {item.label}
              </span>
            );
          })}
        </div>

        <div className="CreateSiteDialog CreateSiteDialog__body-1 min-h-0 overflow-y-auto p-5">
          {step === "site" ? (
            <SiteCreateStep site={site} onSiteChange={onSiteChange} />
          ) : null}
          {step === "location" ? (
            <LocationCreateStep
              location={location}
              locations={locations}
              onAddLocation={onAddLocation}
              onLocationChange={onLocationChange}
              onRemoveLocation={onRemoveLocation}
            />
          ) : null}
          {step === "asset" ? (
            <AssetCreateStep
              asset={asset}
              assetLocationKey={assetLocationKey}
              assets={assets}
              locations={locations}
              onAddAsset={onAddAsset}
              onAssetChange={onAssetChange}
              onAssetLocationChange={onAssetLocationChange}
              onRemoveAsset={onRemoveAsset}
            />
          ) : null}
          {step === "summary" ? (
            <CreateSummaryStep
              isAssetSkipped={isAssetSkipped}
              isLocationSkipped={isLocationSkipped}
              previewSite={previewSite}
            />
          ) : null}
        </div>

        <CreateDialogFooter
          canContinueAsset={canContinueAsset}
          canContinueLocation={canContinueLocation}
          canContinueSite={canContinueSite}
          isMutating={isMutating}
          pendingAction={pendingAction}
          step={step}
          onBack={onBack}
          onCreate={onCreate}
          onNext={onNext}
          onSkipAsset={onSkipAsset}
          onSkipLocation={onSkipLocation}
        />
      </div>
    </div>
  );
}

function SiteCreateStep({ site, onSiteChange }) {
  return (
    <div className="CreateSiteDialog grid max-w-2xl gap-5">
      <StepHeading
        title="1. 공정 정보"
        description="공정명만 입력하면 다음 단계로 이동할 수 있습니다."
      />
      <TextField
        label="공정명 *"
        onChange={(value) =>
          onSiteChange((current) => ({ ...current, name: value }))
        }
        placeholder="압축 공정"
        value={site.name}
      />
      <TextAreaField
        label="공정 설명"
        onChange={(value) =>
          onSiteChange((current) => ({ ...current, description: value }))
        }
        placeholder="공정 설명"
        value={site.description}
      />
      <ImageUploadField
        label="대표 이미지"
        onChange={(value) =>
          onSiteChange((current) => ({ ...current, imageUrl: value }))
        }
        value={site.imageUrl}
        onRemove={() =>
          onSiteChange((current) => ({ ...current, imageUrl: undefined }))
        }
      />
    </div>
  );
}

function LocationCreateStep({
  location,
  locations,
  onAddLocation,
  onLocationChange,
  onRemoveLocation,
}) {
  return (
    <div className="CreateSiteDialog grid max-w-2xl gap-5">
      <StepHeading
        title="2. 위치 등록"
        description="위치명만 필수입니다. 여러 위치를 추가한 뒤 설비 단계로 이동할 수 있습니다."
      />
      <DraftLocationList
        locations={locations}
        onRemoveLocation={onRemoveLocation}
      />
      <div className="CreateSiteDialog grid gap-5 sm:grid-cols-2">
        <TextField
          label="위치명 *"
          onChange={(value) =>
            onLocationChange((current) => ({ ...current, name: value }))
          }
          placeholder="1층 기계실"
          value={location.name}
        />
        <TextField
          label="층/구역"
          onChange={(value) =>
            onLocationChange((current) => ({ ...current, floor: value }))
          }
          placeholder="1F"
          value={location.floor}
        />
      </div>
      <TextAreaField
        label="위치 설명"
        onChange={(value) =>
          onLocationChange((current) => ({ ...current, summary: value }))
        }
        placeholder="위치 설명"
        value={location.summary}
      />
      <ImageUploadField
        label="위치 이미지"
        onChange={(value) =>
          onLocationChange((current) => ({ ...current, imageUrl: value }))
        }
        value={location.imageUrl}
        onRemove={() =>
          onLocationChange((current) => ({ ...current, imageUrl: undefined }))
        }
      />
      <div className="CreateSiteDialog flex justify-end">
        <button
          type="button"
          className="CreateSiteDialog inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!location.name.trim()}
          onClick={onAddLocation}
        >
          <Plus className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
          위치 추가
        </button>
      </div>
    </div>
  );
}

function AssetCreateStep({
  asset,
  assetLocationKey,
  assets,
  locations,
  onAddAsset,
  onAssetChange,
  onAssetLocationChange,
  onRemoveAsset,
}) {
  const selectedLocationKey = assetLocationKey ?? locations[0]?._clientId ?? "";

  return (
    <div className="CreateSiteDialog grid max-w-2xl gap-5">
      <StepHeading
        title="3. 설비 등록"
        description="설비명만 필수입니다. 위치가 여러 개이면 먼저 하위 위치를 선택하세요."
      />
      <DraftAssetList
        assets={assets}
        locations={locations}
        onRemoveAsset={onRemoveAsset}
      />
      <label className="CreateSiteDialog grid gap-2 text-sm font-semibold text-muted-foreground">
        하위 위치
        <select
          className="CreateSiteDialog h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!locations.length}
          onChange={(event) => onAssetLocationChange(event.target.value)}
          value={selectedLocationKey}
        >
          {locations.map((location) => (
            <option key={location._clientId} value={location._clientId}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
      <div className="CreateSiteDialog grid gap-5 sm:grid-cols-2">
        <TextField
          label="설비명 *"
          onChange={(value) =>
            onAssetChange((current) => ({ ...current, name: value }))
          }
          placeholder="압축기 1호기"
          value={asset.name}
        />
        <TextField
          label="설비 코드"
          onChange={(value) =>
            onAssetChange((current) => ({ ...current, asset_code: value }))
          }
          placeholder="EQ-CP-001"
          value={asset.asset_code}
        />
      </div>
      <div className="CreateSiteDialog grid gap-5 sm:grid-cols-2">
        <TextField
          label="자산 번호"
          onChange={(value) =>
            onAssetChange((current) => ({ ...current, asset_number: value }))
          }
          placeholder="ASSET-COMPRESSOR-01"
          value={asset.asset_number}
        />
        <TextField
          label="모델명"
          onChange={(value) =>
            onAssetChange((current) => ({ ...current, model_name: value }))
          }
          placeholder="모델명"
          value={asset.model_name}
        />
      </div>
      <div className="CreateSiteDialog grid gap-5 sm:grid-cols-2">
        <TextField
          label="시리얼 번호"
          onChange={(value) =>
            onAssetChange((current) => ({ ...current, serial_number: value }))
          }
          placeholder="시리얼 번호"
          value={asset.serial_number}
        />
        <TextField
          label="유형"
          onChange={(value) =>
            onAssetChange((current) => ({ ...current, type: value }))
          }
          placeholder="회전 설비"
          value={asset.type}
        />
      </div>
      <div className="CreateSiteDialog grid gap-5 sm:grid-cols-2">
        <TextField
          label="담당자"
          onChange={(value) =>
            onAssetChange((current) => ({ ...current, manager: value }))
          }
          placeholder="담당자"
          value={asset.manager}
        />
      </div>
      <div className="CreateSiteDialog grid gap-5 sm:grid-cols-2">
        <TextField
          label="비상 연락처"
          onChange={(value) =>
            onAssetChange((current) => ({
              ...current,
              emergency_contact: value,
            }))
          }
          placeholder="010-0000-0000"
          value={asset.emergency_contact}
        />
        <TextField
          label="마지막 점검일"
          onChange={(value) =>
            onAssetChange((current) => ({
              ...current,
              last_inspection_date: value,
            }))
          }
          type="date"
          value={asset.last_inspection_date}
        />
      </div>
      <TextAreaField
        label="설비 설명"
        onChange={(value) =>
          onAssetChange((current) => ({ ...current, description: value }))
        }
        placeholder="설비 설명"
        value={asset.description}
      />
      <ImageUploadField
        label="설비 이미지"
        onChange={(value) =>
          onAssetChange((current) => ({ ...current, imageUrl: value }))
        }
        value={asset.imageUrl}
        onRemove={() =>
          onAssetChange((current) => ({ ...current, imageUrl: undefined }))
        }
      />
      <div className="CreateSiteDialog flex justify-end">
        <button
          type="button"
          className="CreateSiteDialog inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!asset.name.trim() || !selectedLocationKey}
          onClick={onAddAsset}
        >
          <Plus className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
          설비 추가
        </button>
      </div>
    </div>
  );
}

function DraftLocationList({ locations, onRemoveLocation }) {
  if (!locations.length) return null;

  return (
    <div className="CreateSiteDialog grid gap-2">
      <p className="CreateSiteDialog text-xs font-semibold text-muted-foreground">
        추가된 위치
      </p>
      <div className="CreateSiteDialog grid gap-2">
        {locations.map((location, index) => (
          <div
            key={location._clientId}
            className="CreateSiteDialog grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
          >
            <div className="CreateSiteDialog min-w-0">
              <p className="CreateSiteDialog truncate text-sm font-semibold text-foreground">
                {index + 1}. {location.name}
              </p>
              <p className="CreateSiteDialog truncate text-xs text-muted-foreground">
                {location.floor || location.summary || "추가 정보 없음"}
              </p>
            </div>
            <button
              type="button"
              className="CreateSiteDialog grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
              title="위치 제거"
              aria-label="위치 제거"
              onClick={() => onRemoveLocation(location._clientId)}
            >
              <Trash2 className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftAssetList({ assets, locations, onRemoveAsset }) {
  if (!assets.length) return null;

  const locationNameByKey = Object.fromEntries(
    locations.map((location) => [location._clientId, location.name]),
  );

  return (
    <div className="CreateSiteDialog grid gap-2">
      <p className="CreateSiteDialog text-xs font-semibold text-muted-foreground">
        추가된 설비
      </p>
      <div className="CreateSiteDialog grid gap-2">
        {assets.map((asset, index) => (
          <div
            key={asset._clientId}
            className="CreateSiteDialog grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
          >
            <div className="CreateSiteDialog min-w-0">
              <p className="CreateSiteDialog truncate text-sm font-semibold text-foreground">
                {index + 1}. {asset.name}
              </p>
              <p className="CreateSiteDialog truncate text-xs text-muted-foreground">
                하위 위치: {locationNameByKey[asset._locationKey] ?? "미지정"}
              </p>
            </div>
            <button
              type="button"
              className="CreateSiteDialog grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
              title="설비 제거"
              aria-label="설비 제거"
              onClick={() => onRemoveAsset(asset._clientId)}
            >
              <Trash2 className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateSummaryStep({ isAssetSkipped, isLocationSkipped, previewSite }) {
  const locationRows = previewSite.locations.length
    ? previewSite.locations.flatMap((location, index) => [
        [`위치 ${index + 1}`, location.name],
        ["층/구역", location.floor],
        ["설명", location.summary],
      ])
    : [["등록 여부", "건너뜀"]];
  const assetRows = previewSite.locations.flatMap((location) =>
    location.assets.map((asset) => [
      `${location.name || "위치"} 하위`,
      [
        asset.name,
        asset.asset_code ? `코드 ${asset.asset_code}` : "",
        asset.asset_number ? `자산 ${asset.asset_number}` : "",
      ]
        .filter(Boolean)
        .join(" / "),
    ]),
  );

  return (
    <div className="CreateSiteDialog grid gap-4">
      <StepHeading
        title="생성 요약"
        description="아래 내용으로 공정을 생성합니다."
      />
      <div className="CreateSiteDialog grid gap-3 md:grid-cols-3">
        <SummaryBlock
          icon={Factory}
          title="공정"
          rows={[
            ["공정명", previewSite.name],
            ["설명", previewSite.description],
          ]}
        />
        <SummaryBlock
          icon={MapPin}
          title="위치"
          rows={isLocationSkipped ? [["등록 여부", "건너뜀"]] : locationRows}
        />
        <SummaryBlock
          icon={Cpu}
          title="설비"
          rows={
            isLocationSkipped || isAssetSkipped || !assetRows.length
              ? [["등록 여부", "건너뜀"]]
              : assetRows
          }
        />
      </div>
    </div>
  );
}

function CreateDialogFooter({
  canContinueAsset,
  canContinueLocation,
  canContinueSite,
  isMutating,
  pendingAction,
  step,
  onBack,
  onCreate,
  onNext,
  onSkipAsset,
  onSkipLocation,
}) {
  return (
    <footer className="CreateSiteDialog CreateSiteDialog__footer-1 flex min-w-0 items-center justify-between gap-3 border-t border-border px-4 py-3">
      <button
        type="button"
        className="CreateSiteDialog inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isMutating || step === "site"}
        onClick={onBack}
      >
        <ArrowLeft className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
        이전
      </button>
      <div className="CreateSiteDialog flex items-center gap-2">
        {step === "location" ? (
          <SkipButton label="위치 건너뛰기" onClick={onSkipLocation} />
        ) : null}
        {step === "asset" ? (
          <SkipButton label="설비 건너뛰기" onClick={onSkipAsset} />
        ) : null}
        {step === "site" && canContinueSite ? (
          <NextButton label="다음" onClick={onNext} />
        ) : null}
        {step === "location" && canContinueLocation ? (
          <NextButton label="다음 항목" onClick={onNext} />
        ) : null}
        {step === "asset" && canContinueAsset ? (
          <NextButton label="요약 보기" onClick={onNext} />
        ) : null}
        {step === "summary" ? (
          <button
            type="button"
            className="CreateSiteDialog inline-flex h-10 items-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isMutating}
            onClick={onCreate}
          >
            <Save className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
            {pendingAction === "site-create" ? "생성 중" : "생성"}
          </button>
        ) : null}
      </div>
    </footer>
  );
}

function StepHeading({ description, title }) {
  return (
    <div>
      <h3 className="CreateSiteDialog text-sm font-semibold text-foreground">
        {title}
      </h3>
    </div>
  );
}

function SkipButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="CreateSiteDialog inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
      onClick={onClick}
    >
      {label}
      <SkipForward className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function NextButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="CreateSiteDialog inline-flex h-10 items-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
      onClick={onClick}
    >
      {label}
      <ChevronRight className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function SummaryBlock({ icon: Icon, rows, title }) {
  return (
    <section className="CreateSiteDialog SummaryBlock SummaryBlock__section-1 min-w-0 rounded-md border border-border bg-background p-3">
      <div className="CreateSiteDialog mb-3 flex items-center gap-2">
        <span className="CreateSiteDialog grid h-8 w-8 place-items-center rounded-md border border-border bg-card">
          <Icon className="CreateSiteDialog h-4 w-4" aria-hidden="true" />
        </span>
        <h4 className="CreateSiteDialog truncate text-sm font-semibold">
          {title}
        </h4>
      </div>
      <div className="CreateSiteDialog grid gap-2">
        {rows.map(([label, value], index) => (
          <div
            key={`${label}-${index}`}
            className="CreateSiteDialog grid gap-1 rounded-sm border border-border/60 bg-card px-2 py-1.5"
          >
            <span className="CreateSiteDialog text-[10px] font-semibold text-muted-foreground">
              {label}
            </span>
            <span className="CreateSiteDialog min-w-0 truncate text-xs font-semibold text-foreground">
              {value || "-"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
