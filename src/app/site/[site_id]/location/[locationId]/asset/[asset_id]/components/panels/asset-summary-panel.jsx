import { useEffect, useRef, useState } from "react";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Gauge,
  GripVertical,
  MapPinned,
  Pause,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetPartList } from "./summary/asset-part-list";
import { judgementClassName, judgementLabel } from "./summary/judgement";
import {
  TemperatureMetricCard,
  UltrasoundMetricCard,
} from "./summary/value-metrics";
import { ThresholdEditor } from "./summary/threshold-editor";
const DETECTION_AREA_SLIDE_INTERVAL_MS = 5000;
const DEFAULT_SUMMARY_METRIC_ORDER = ["ultrasound", "temperature", "assetPart"];
const SUMMARY_METRIC_ORDER_STORAGE_KEY =
  "checklab.assetDetailSummary.metricOrder.v1";
const SUMMARY_METRIC_POINTER_DRAG_THRESHOLD_PX = 4;
const summaryMetricCardLabels = {
  assetPart: "파트",
  temperature: "온도",
  ultrasound: "초음파",
};
function readSummaryMetricOrderFromStorage() {
  if (typeof window === "undefined") {
    return [...DEFAULT_SUMMARY_METRIC_ORDER];
  }
  try {
    const storedValue = window.localStorage.getItem(
      SUMMARY_METRIC_ORDER_STORAGE_KEY,
    );
    return storedValue
      ? normalizeSummaryMetricOrder(JSON.parse(storedValue))
      : [...DEFAULT_SUMMARY_METRIC_ORDER];
  } catch {
    return [...DEFAULT_SUMMARY_METRIC_ORDER];
  }
}
function writeSummaryMetricOrderToStorage(order) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      SUMMARY_METRIC_ORDER_STORAGE_KEY,
      JSON.stringify(normalizeSummaryMetricOrder(order)),
    );
  } catch {
    // Local storage can be unavailable in constrained browser modes.
  }
}
function normalizeSummaryMetricOrder(order) {
  const nextOrder = [];
  if (Array.isArray(order)) {
    for (const metricId of order) {
      if (
        DEFAULT_SUMMARY_METRIC_ORDER.includes(metricId) &&
        !nextOrder.includes(metricId)
      ) {
        nextOrder.push(metricId);
      }
    }
  }
  for (const metricId of DEFAULT_SUMMARY_METRIC_ORDER) {
    if (!nextOrder.includes(metricId)) {
      nextOrder.push(metricId);
    }
  }
  return nextOrder;
}
function reorderSummaryMetricOrder(
  order,
  sourceMetricId,
  targetMetricId,
  placement,
) {
  if (!sourceMetricId || !targetMetricId || sourceMetricId === targetMetricId) {
    return order;
  }
  const nextOrder = normalizeSummaryMetricOrder(order);
  const sourceIndex = nextOrder.indexOf(sourceMetricId);
  const targetIndex = nextOrder.indexOf(targetMetricId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return nextOrder;
  }
  const [movedMetricId] = nextOrder.splice(sourceIndex, 1);
  const adjustedTargetIndex = nextOrder.indexOf(targetMetricId);
  nextOrder.splice(
    placement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex,
    0,
    movedMetricId,
  );
  return nextOrder;
}
export function AssetSummaryPanel({
  averageTemperature,
  assetParts,
  assetPartStates,
  assetThresholds,
  assetJudgement,
  asset,
  isSimplified = false,
  isThresholdSaving = false,
  temperatureMax,
  temperatureMin,
  thresholdSaveError,
  ultrasoundAverageDb,
  ultrasoundDetectionCount,
  ultrasoundMax,
  selectedAssetPartId,
  onAssetPartSelect,
  onAssetThresholdSave,
  onCameraInterestAreaCreate,
  onThresholdEditorDirtyChange,
  variant = "full",
}) {
  const [isThresholdEditorOpen, setIsThresholdEditorOpen] = useState(false);
  const [activeDetectionMetricIndex, setActiveDetectionMetricIndex] =
    useState(0);
  const [isDetectionMetricPlaying, setIsDetectionMetricPlaying] =
    useState(true);
  const [summaryMetricOrder, setSummaryMetricOrder] = useState(
    DEFAULT_SUMMARY_METRIC_ORDER,
  );
  const [isSummaryMetricOrderLoaded, setIsSummaryMetricOrderLoaded] =
    useState(false);
  const [draggingSummaryMetricId, setDraggingSummaryMetricId] = useState();
  const [dropTargetSummaryMetricId, setDropTargetSummaryMetricId] = useState();
  const summaryMetricCardsRef = useRef(null);
  const summaryMetricDragStateRef = useRef(null);
  const isTemperatureExceeded = assetThresholds
    ? isCriticalThresholdExceeded(
        averageTemperature,
        assetThresholds.temperature,
        assetThresholds.temperatureCritical,
      )
    : false;
  const isUltrasoundExceeded = assetThresholds
    ? isCriticalThresholdExceeded(
        ultrasoundAverageDb,
        assetThresholds.ultrasoundDb,
        assetThresholds.ultrasoundCriticalDb,
      )
    : false;
  useEffect(() => {
    setSummaryMetricOrder(readSummaryMetricOrderFromStorage());
    setIsSummaryMetricOrderLoaded(true);
  }, []);
  useEffect(() => {
    if (!isSummaryMetricOrderLoaded) {
      return;
    }
    writeSummaryMetricOrderToStorage(summaryMetricOrder);
  }, [isSummaryMetricOrderLoaded, summaryMetricOrder]);
  useEffect(() => {
    if (!assetParts.length) {
      setActiveDetectionMetricIndex(0);
      return;
    }
    setActiveDetectionMetricIndex(
      (currentIndex) => currentIndex % assetParts.length,
    );
    if (assetParts.length === 1 || !isDetectionMetricPlaying) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setActiveDetectionMetricIndex(
        (currentIndex) => (currentIndex + 1) % assetParts.length,
      );
    }, DETECTION_AREA_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [assetParts.length, isDetectionMetricPlaying]);
  if (variant === "metrics") {
    const handlePreviousDetectionMetric = () => {
      if (!assetParts.length) {
        return;
      }
      setIsDetectionMetricPlaying(false);
      setActiveDetectionMetricIndex(
        (currentIndex) =>
          (currentIndex - 1 + assetParts.length) % assetParts.length,
      );
    };
    const handleNextDetectionMetric = () => {
      if (!assetParts.length) {
        return;
      }
      setIsDetectionMetricPlaying(false);
      setActiveDetectionMetricIndex(
        (currentIndex) => (currentIndex + 1) % assetParts.length,
      );
    };
    const detectionSlideOptions = {
      activeIndex: activeDetectionMetricIndex,
      isPlaying: isDetectionMetricPlaying,
      total: assetParts.length,
      onNext: handleNextDetectionMetric,
      onPrevious: handlePreviousDetectionMetric,
      onTogglePlaying: () =>
        setIsDetectionMetricPlaying((isPlaying) => !isPlaying),
    };
    const renderSummaryMetricCard = (metricId) => {
      if (metricId === "ultrasound") {
        return (
          <UltrasoundMetricCard
            key={metricId}
            averageDb={ultrasoundAverageDb}
            peakDb={ultrasoundMax.peakDb}
            dominantFrequencyKHz={ultrasoundMax.dominantFrequencyKHz}
            frequencyBandKHz={ultrasoundMax.frequencyBandKHz}
            detectionCount={ultrasoundDetectionCount}
            threshold={assetThresholds?.ultrasoundDb}
            isExceeded={isUltrasoundExceeded}
            reserveHeaderActionSpace
          />
        );
      }
      if (metricId === "temperature") {
        return (
          <TemperatureMetricCard
            key={metricId}
            averageTemperature={averageTemperature}
            temperatureMax={temperatureMax}
            temperatureMin={temperatureMin}
            threshold={assetThresholds?.temperature}
            isExceeded={isTemperatureExceeded}
            reserveHeaderActionSpace
          />
        );
      }
      return (
        <AssetPartMetricCarousel
          key={metricId}
          activeIndex={activeDetectionMetricIndex}
          partStates={assetPartStates}
          parts={assetParts}
          reserveHeaderActionSpace
          slideOptions={detectionSlideOptions}
          onAddInterestArea={onCameraInterestAreaCreate}
        />
      );
    };
    const moveSummaryMetric = (sourceMetricId, targetMetricId, placement) => {
      setSummaryMetricOrder((currentOrder) =>
        reorderSummaryMetricOrder(
          currentOrder,
          sourceMetricId,
          targetMetricId,
          placement,
        ),
      );
    };
    const handleSummaryMetricDragStart = (event, metricId) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", metricId);
      setDraggingSummaryMetricId(metricId);
      setDropTargetSummaryMetricId(metricId);
    };
    const handleSummaryMetricDragOver = (event, metricId) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTargetSummaryMetricId((currentMetricId) =>
        currentMetricId === metricId ? currentMetricId : metricId,
      );
    };
    const handleSummaryMetricDrop = (event, targetMetricId) => {
      event.preventDefault();
      const sourceMetricId =
        event.dataTransfer.getData("text/plain") || draggingSummaryMetricId;
      const targetBounds = event.currentTarget.getBoundingClientRect();
      const placement =
        event.clientY > targetBounds.top + targetBounds.height / 2
          ? "after"
          : "before";
      moveSummaryMetric(sourceMetricId, targetMetricId, placement);
      setDraggingSummaryMetricId(undefined);
      setDropTargetSummaryMetricId(undefined);
    };
    const handleSummaryMetricDragEnd = () => {
      setDraggingSummaryMetricId(undefined);
      setDropTargetSummaryMetricId(undefined);
    };
    const getSummaryMetricCardById = (metricId) => {
      if (!summaryMetricCardsRef.current) {
        return null;
      }
      return summaryMetricCardsRef.current.querySelector(
        `[data-summary-metric-id="${metricId}"]`,
      );
    };
    const getSummaryMetricIdAtY = (clientY) => {
      if (!summaryMetricCardsRef.current) {
        return undefined;
      }
      const cardElements = Array.from(
        summaryMetricCardsRef.current.querySelectorAll(
          "[data-summary-metric-id]",
        ),
      );
      if (!cardElements.length) {
        return undefined;
      }
      let best;
      let bestDistance = Infinity;
      for (const card of cardElements) {
        const bounds = card.getBoundingClientRect();
        const centerY = bounds.top + bounds.height / 2;
        const distance = Math.abs(clientY - centerY);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = card.getAttribute("data-summary-metric-id");
        }
      }
      return best;
    };
    const moveSummaryMetricByPointer = (
      sourceMetricId,
      targetMetricId,
      clientY,
    ) => {
      if (!sourceMetricId || !targetMetricId || sourceMetricId === targetMetricId) {
        return;
      }
      const targetCard = getSummaryMetricCardById(targetMetricId);
      const targetBounds = targetCard?.getBoundingClientRect();
      if (!targetBounds) {
        return;
      }
      const placement =
        clientY > targetBounds.top + targetBounds.height / 2
          ? "after"
          : "before";
      moveSummaryMetric(sourceMetricId, targetMetricId, placement);
    };
    const handleSummaryMetricHandlePointerDown = (event, metricId) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      summaryMetricDragStateRef.current = {
        sourceMetricId: metricId,
        targetMetricId: metricId,
        pointerId: event.pointerId,
        startY: event.clientY,
        moved: false,
      };
      setDraggingSummaryMetricId(metricId);
      setDropTargetSummaryMetricId(metricId);
    };
    const handleSummaryMetricHandlePointerMove = (event) => {
      const dragState = summaryMetricDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }
      if (
        !dragState.moved &&
        Math.abs(event.clientY - dragState.startY) <
          SUMMARY_METRIC_POINTER_DRAG_THRESHOLD_PX
      ) {
        return;
      }
      dragState.moved = true;
      const targetMetricId = getSummaryMetricIdAtY(event.clientY);
      if (!targetMetricId) {
        return;
      }
      dragState.targetMetricId = targetMetricId;
      setDropTargetSummaryMetricId(targetMetricId);
    };
    const handleSummaryMetricHandlePointerUp = (event) => {
      const dragState = summaryMetricDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }
      if (dragState.moved && dragState.targetMetricId) {
        moveSummaryMetricByPointer(
          dragState.sourceMetricId,
          dragState.targetMetricId,
          event.clientY,
        );
      }
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      summaryMetricDragStateRef.current = null;
      setDraggingSummaryMetricId(undefined);
      setDropTargetSummaryMetricId(undefined);
    };
    const handleSummaryMetricHandleKeyDown = (event, metricId) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }
      event.preventDefault();
      const currentIndex = summaryMetricOrder.indexOf(metricId);
      const targetMetricId =
        summaryMetricOrder[currentIndex + (event.key === "ArrowUp" ? -1 : 1)];
      if (!targetMetricId) {
        return;
      }
      moveSummaryMetric(
        metricId,
        targetMetricId,
        event.key === "ArrowUp" ? "before" : "after",
      );
    };
    const renderDraggableSummaryMetricCard = (metricId) => (
      <div
        key={metricId}
        data-summary-metric-id={metricId}
        className={cn(
          "AssetDetailSummaryPanel AssetDetailSummaryPanel__metric-card-wrap-1 relative min-h-0 min-w-0 overflow-hidden rounded-md transition",
          draggingSummaryMetricId === metricId && "opacity-70",
          dropTargetSummaryMetricId === metricId &&
            draggingSummaryMetricId !== metricId &&
            "ring-2 ring-primary/45 ring-offset-1 ring-offset-background",
        )}
        onDragEnter={(event) => handleSummaryMetricDragOver(event, metricId)}
        onDragOver={(event) => handleSummaryMetricDragOver(event, metricId)}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDropTargetSummaryMetricId(undefined);
          }
        }}
        onDrop={(event) => handleSummaryMetricDrop(event, metricId)}
      >
        {renderSummaryMetricCard(metricId)}
        <button
          type="button"
          draggable={false}
          onPointerCancel={handleSummaryMetricHandlePointerUp}
          onPointerDown={(event) =>
            handleSummaryMetricHandlePointerDown(event, metricId)
          }
          onPointerMove={handleSummaryMetricHandlePointerMove}
          onPointerUp={handleSummaryMetricHandlePointerUp}
          className={cn(
            "AssetDetailSummaryPanel AssetDetailSummaryPanel__drag-handle-1 absolute right-2 top-2 z-10 grid h-6 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-sm border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-accent hover:text-foreground active:cursor-grabbing",
            draggingSummaryMetricId === metricId &&
              "cursor-grabbing border-primary text-primary",
          )}
          aria-label={`${summaryMetricCardLabels[metricId]} 카드 순서 변경`}
          title="드래그해서 순서 변경"
          onDragStart={(event) => handleSummaryMetricDragStart(event, metricId)}
          onDragEnd={handleSummaryMetricDragEnd}
          onKeyDown={(event) =>
            handleSummaryMetricHandleKeyDown(event, metricId)
          }
        >
          <GripVertical
            className="AssetDetailSummaryPanel AssetDetailSummaryPanel__drag-icon-1 h-3.5 w-3.5"
            aria-hidden="true"
          />
        </button>
      </div>
    );
    return (
      <section className="AssetDetailSummaryPanel AssetDetailSummaryPanel__section-1 relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground">
        <div className="AssetDetailSummaryPanel AssetDetailSummaryPanel__container-1 mb-2 flex min-w-0 items-center justify-between gap-2">
          <div className="AssetDetailSummaryPanel AssetDetailSummaryPanel__container-2 min-w-0">
            <Gauge
              aria-hidden="true"
              className="AssetDetailSummaryPanel AssetDetailSummaryPanel__title-1 h-4 w-4 text-muted-foreground"
            />
          </div>
          <div className="AssetDetailSummaryPanel AssetDetailSummaryPanel__container-6 flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className={cn(
                "AssetDetailSummaryPanel AssetDetailSummaryPanel__button-1 grid h-7 w-7 shrink-0 place-items-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground",
                isThresholdEditorOpen
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background",
              )}
              aria-label="설비 요약 설정"
              aria-expanded={isThresholdEditorOpen}
              aria-controls="asset-threshold-popover"
              title="설비 요약 설정"
              onClick={() => setIsThresholdEditorOpen((isOpen) => !isOpen)}
            >
              <SlidersHorizontal
                className="AssetDetailSummaryPanel AssetDetailSummaryPanel__icon-1 h-3.5 w-3.5"
                aria-hidden="true"
              />
            </button>
            <span
              className={cn(
                "AssetDetailSummaryPanel AssetDetailSummaryPanel__label-1 shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold",
                judgementClassName[assetJudgement],
              )}
            >
              {judgementLabel[assetJudgement]}
            </span>
          </div>
        </div>
        {isThresholdEditorOpen ? (
          <div
            id="asset-threshold-popover"
            className="AssetDetailSummaryPanel AssetDetailSummaryPanel__popover-1 absolute right-2 top-10 z-20 grid max-h-[calc(100%-2.75rem)] w-[min(22rem,calc(100%-1rem))] gap-2 overflow-y-auto overscroll-contain rounded-md shadow-2xl [scrollbar-width:thin]"
          >
            <ThresholdEditor
              isSaving={isThresholdSaving}
              onDirtyChange={onThresholdEditorDirtyChange}
              saveError={thresholdSaveError}
              thresholds={assetThresholds}
              temperatureExceeded={isTemperatureExceeded}
              ultrasoundExceeded={isUltrasoundExceeded}
              onClose={() => setIsThresholdEditorOpen(false)}
              onSave={onAssetThresholdSave}
            />
          </div>
        ) : null}
        <div
          ref={summaryMetricCardsRef}
          className="AssetDetailSummaryPanel AssetDetailSummaryPanel__container-3 grid min-h-0 flex-1 grid-rows-3 gap-2 overflow-hidden"
        >
          {summaryMetricOrder.map(renderDraggableSummaryMetricCard)}
        </div>
      </section>
    );
  }
  if (variant === "detection") {
    return (
      <section className="AssetDetailSummaryPanel AssetDetailSummaryPanel__section-1 grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-2 overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground">
        <div className="AssetDetailSummaryPanel AssetDetailSummaryPanel__container-5 min-h-0 min-w-0 overflow-hidden">
          <AssetPartList
            parts={assetParts}
            partStates={assetPartStates}
            selectedPartId={selectedAssetPartId}
            onPartSelect={onAssetPartSelect}
          />
        </div>
        <AssetAssetInfoSection asset={asset} />
      </section>
    );
  }
  return (
    <section
      className={cn(
        "AssetDetailSummaryPanel AssetDetailSummaryPanel__section-1 min-h-0 min-w-0 overflow-hidden rounded-md border border-border bg-card text-card-foreground",
        !isSimplified ? "grid h-full grid-rows-3" : "flex flex-col",
      )}
    >
      {/* ── 1/3: 초음파 카드 ── */}
      <div className="AssetDetailSummaryPanel AssetDetailSummaryPanel__row-1 min-h-0 overflow-hidden border-b border-border p-2">
        <UltrasoundMetricCard
          averageDb={ultrasoundAverageDb}
          peakDb={ultrasoundMax.peakDb}
          dominantFrequencyKHz={ultrasoundMax.dominantFrequencyKHz}
          frequencyBandKHz={ultrasoundMax.frequencyBandKHz}
          detectionCount={ultrasoundDetectionCount}
          threshold={assetThresholds?.ultrasoundDb}
          isExceeded={isUltrasoundExceeded}
        />
      </div>

      {/* ── 2/3: 온도 카드 ── */}
      <div className="AssetDetailSummaryPanel AssetDetailSummaryPanel__row-2 min-h-0 overflow-hidden border-b border-border p-2">
        <TemperatureMetricCard
          averageTemperature={averageTemperature}
          temperatureMax={temperatureMax}
          temperatureMin={temperatureMin}
          threshold={assetThresholds?.temperature}
          isExceeded={isTemperatureExceeded}
        />
      </div>

      {/* ── 3/3: 빈 공간 (추후 활용) ── */}
      <div className="AssetDetailSummaryPanel AssetDetailSummaryPanel__row-3 min-h-0 overflow-hidden p-2">
        <AssetPartMetricCarousel
          activeIndex={activeDetectionMetricIndex}
          partStates={assetPartStates}
          parts={assetParts}
          onAddInterestArea={onCameraInterestAreaCreate}
        />
      </div>
    </section>
  );
}
function AssetAssetInfoSection({ asset }) {
  const operationState = getOperationState(asset.operationState, asset.status);
  const assetInfoItems = [
    {
      label: "설비 코드 / 자산 번호",
      value: `${asset.assetCode ?? formatFallbackAssetCode(asset.id)} / ${asset.assetNumber ?? "미등록"}`,
    },
    { label: "모델명", value: asset.modelName ?? "미등록" },
    { label: "시리얼 번호", value: asset.serialNumber ?? "미등록" },
    { label: "가동 여부", value: formatOperationState(operationState) },
    { label: "담당자", value: asset.manager ?? "미지정" },
    { label: "비상 연락처", value: asset.emergencyContact ?? "미등록" },
    { label: "마지막 점검일", value: asset.lastInspectionDate ?? "미등록" },
  ];
  return (
    <section
      className="AssetAssetInfoSection AssetAssetInfoSection__section-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background p-1.5"
      aria-label="설비 기본 정보"
    >
      <div className="AssetAssetInfoSection AssetAssetInfoSection__header-1 mb-1.5 flex min-w-0 items-center justify-between gap-2">
        <div className="AssetAssetInfoSection AssetAssetInfoSection__title-wrap-1 min-w-0">
          <h2 className="AssetAssetInfoSection AssetAssetInfoSection__title-1 truncate text-xs font-semibold">
            설비 기본 정보
          </h2>
          <p className="AssetAssetInfoSection AssetAssetInfoSection__subtitle-1 truncate text-[10px] font-medium text-muted-foreground">
            {asset.name}
          </p>
        </div>
        <span
          className={cn(
            "AssetAssetInfoSection AssetAssetInfoSection__status-1 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
            operationStateClassName[operationState],
          )}
        >
          {formatOperationState(operationState)}
        </span>
      </div>

      <dl className="AssetAssetInfoSection AssetAssetInfoSection__list-1 grid min-h-0 flex-1 auto-rows-min gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin]">
        {assetInfoItems.map((item) => (
          <div
            key={item.label}
            className="AssetAssetInfoSection AssetAssetInfoSection__row-1 grid min-w-0 grid-cols-[minmax(6.75rem,7.75rem)_minmax(0,1fr)] items-center gap-2 rounded-sm border border-border/70 bg-card px-2 py-1.5"
          >
            <dt className="AssetAssetInfoSection AssetAssetInfoSection__label-1 min-w-0 truncate text-[10px] font-semibold text-muted-foreground">
              {item.label}
            </dt>
            <dd
              className="AssetAssetInfoSection AssetAssetInfoSection__value-1 min-w-0 truncate text-right font-mono text-[11px] font-bold text-foreground"
              title={item.value}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
function MetricSlideControls({ slideOptions }) {
  const hasMultipleSlides = slideOptions.total > 1;
  return (
    <div className="ThresholdEditor ThresholdEditor__slide-controls-1 inline-grid h-7 shrink-0 grid-cols-3 items-center overflow-hidden rounded-md border border-border/70 bg-background/80 shadow-sm">
      <button
        type="button"
        className="ThresholdEditor ThresholdEditor__slide-button-1 grid h-7 w-7 place-items-center border-r border-border/60 text-muted-foreground transition hover:bg-accent/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="이전 슬라이드"
        title="이전"
        disabled={!hasMultipleSlides}
        onClick={slideOptions.onPrevious}
      >
        <ChevronLeft
          className="ThresholdEditor ThresholdEditor__slide-icon-1 h-3.5 w-3.5"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        className="ThresholdEditor ThresholdEditor__slide-button-2 grid h-7 w-7 place-items-center border-r border-border/60 text-muted-foreground transition hover:bg-accent/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={
          slideOptions.isPlaying ? "슬라이드 일시정지" : "슬라이드 재생"
        }
        title={slideOptions.isPlaying ? "일시정지" : "재생"}
        disabled={!hasMultipleSlides}
        onClick={slideOptions.onTogglePlaying}
      >
        {slideOptions.isPlaying ? (
          <Pause
            className="ThresholdEditor ThresholdEditor__slide-icon-2 h-3.5 w-3.5"
            aria-hidden="true"
          />
        ) : (
          <Play
            className="ThresholdEditor ThresholdEditor__slide-icon-2 h-3.5 w-3.5"
            aria-hidden="true"
          />
        )}
      </button>
      <button
        type="button"
        className="ThresholdEditor ThresholdEditor__slide-button-3 grid h-7 w-7 place-items-center text-muted-foreground transition hover:bg-accent/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="다음 슬라이드"
        title="다음"
        disabled={!hasMultipleSlides}
        onClick={slideOptions.onNext}
      >
        <ChevronRight
          className="ThresholdEditor ThresholdEditor__slide-icon-3 h-3.5 w-3.5"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
function AssetPartMetricCarousel({
  activeIndex,
  onAddInterestArea,
  parts,
  partStates,
  reserveHeaderActionSpace = false,
  slideOptions,
}) {
  const activePart = parts.length
    ? parts[activeIndex % parts.length]
    : undefined;
  const activePartState = activePart
    ? partStates.find((partState) => partState.partId === activePart.id)
    : undefined;
  if (!activePart) {
    return (
      <div className="UltrasoundMetricCard MetricPlaceholderCard relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border/60 bg-background/80">
        <div className="h-[3px] w-full shrink-0 bg-muted-foreground/25" />
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border/40 px-3 py-1.5">
          <p className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            관심 영역
          </p>
          {slideOptions ? (
            <MetricSlideControls slideOptions={slideOptions} />
          ) : null}
          <span className="flex min-w-0 justify-end">
            <MapPinned
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </span>
        </div>
        <div className="grid min-h-0 flex-1 place-items-center px-3 text-center">
          <button
            type="button"
            className="inline-flex h-8 max-w-full items-center justify-center rounded-md border border-primary/35 bg-primary/10 px-3 text-[11px] font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={onAddInterestArea}
          >
            관심 영역 추가하기
          </button>
        </div>
      </div>
    );
  }
  const judgement = activePartState?.judgement ?? "normal";
  const temperatureValue = activePartState?.temperatureMax ?? 0;
  const ultrasoundValue = activePartState?.ultrasoundPeakDb ?? 0;
  const isTemperatureExceeded = isCriticalThresholdExceeded(
    temperatureValue,
    activePart.thresholds.temperature,
    activePart.thresholds.temperatureCritical,
  );
  const isUltrasoundExceeded = isCriticalThresholdExceeded(
    ultrasoundValue,
    activePart.thresholds.ultrasoundDb,
    activePart.thresholds.ultrasoundCriticalDb,
  );
  const accentClassName =
    judgement === "abnormal"
      ? "bg-red-500"
      : judgement === "caution"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <article className="UltrasoundMetricCard MetricPlaceholderCard relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border/60 bg-background/80">
      <div className={cn("h-[3px] w-full shrink-0", accentClassName)} />
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border/40 px-3 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            관심 영역
          </p>
          <p className="truncate text-xs font-semibold">{activePart.name}</p>
        </div>
        {slideOptions ? (
          <MetricSlideControls slideOptions={slideOptions} />
        ) : null}
        <span className="flex min-w-0 justify-end">
          <span className="shrink-0 rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {(activeIndex % parts.length) + 1}/{parts.length}
          </span>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden">
        <div className="relative isolate flex min-h-0 min-w-0 flex-col justify-between overflow-hidden border-r border-border/40 p-2">
          <AssetPartMiniMap part={activePart} />
          <div className="mt-1 flex min-w-0 items-center justify-between gap-1">
            <span className="truncate text-[10px] font-semibold text-muted-foreground">
              {getAssetPartModeLabel(activePart)}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
                judgementClassName[judgement],
              )}
            >
              {judgementLabel[judgement]}
            </span>
          </div>
        </div>

        <dl className="grid h-full min-h-0 min-w-0 grid-rows-4 gap-1 px-2 py-2">
          <DetectionMetricInfoRow
            highlighted={isTemperatureExceeded}
            label="온도"
            value={`${roundOne(temperatureValue)} / ${roundOne(activePart.thresholds.temperature)} ℃`}
          />
          <DetectionMetricInfoRow
            highlighted={isUltrasoundExceeded}
            label="초음파"
            value={`${roundOne(ultrasoundValue)} / ${roundOne(activePart.thresholds.ultrasoundDb)} dB`}
          />
          <DetectionMetricInfoRow
            label="주파수"
            value={`${activePartState?.dominantFrequencyKHz ?? 0} kHz`}
          />
          <DetectionMetricInfoRow
            label="지점"
            value={formatAssetPartScope(activePart)}
          />
        </dl>
      </div>
    </article>
  );
}
function AssetPartMiniMap({ part }) {
  if (part.source === "3d" && part.viewer3DTarget) {
    return <AssetPart3DMiniMap part={part} />;
  }
  const imageUrl = part.previewImageDataUrl;
  const previewRoi = getAssetPartMiniMapRoi(part);
  const previewPoints = getAssetPartMiniMapPoints(part);
  return (
    <div className="AssetPartMiniMap AssetPartMiniMap__container-1 relative min-h-0 flex-1 overflow-hidden rounded-md border border-border/60 bg-card [background-image:linear-gradient(90deg,color-mix(in_oklch,var(--muted-foreground)_18%,transparent)_1px,transparent_1px),linear-gradient(color-mix(in_oklch,var(--muted-foreground)_18%,transparent)_1px,transparent_1px)] [background-size:18px_18px]">
      {imageUrl ? (
        <>
          <img
            alt={`${part.name} 미니맵`}
            className="AssetPartMiniMap AssetPartMiniMap__image-1 absolute inset-0 h-full w-full object-fill"
            src={imageUrl}
          />
          <div className="AssetPartMiniMap AssetPartMiniMap__image-vignette-1 pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.12),transparent_36%,rgba(2,6,23,0.38))]" />
          <div className="AssetPartMiniMap AssetPartMiniMap__grid-1 pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,color-mix(in_oklch,var(--muted-foreground)_22%,transparent)_1px,transparent_1px),linear-gradient(color-mix(in_oklch,var(--muted-foreground)_22%,transparent)_1px,transparent_1px)] [background-size:18px_18px]" />
        </>
      ) : null}
      {previewRoi ? (
        <span
          className="AssetPartMiniMap AssetPartMiniMap__roi-1 absolute rounded-sm border-2 border-cyan-500 bg-cyan-500/15"
          style={{
            height: `${previewRoi.height}%`,
            left: `${previewRoi.x}%`,
            top: `${previewRoi.y}%`,
            width: `${previewRoi.width}%`,
          }}
        />
      ) : null}
      {previewPoints.map((point, index) => (
        <span
          key={point.id}
          className="AssetPartMiniMap AssetPartMiniMap__point-1 absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-200 bg-cyan-500 text-[9px] font-bold text-white shadow-sm"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
          }}
        >
          {index + 1}
        </span>
      ))}
    </div>
  );
}
function getAssetPartMiniMapRoi(part) {
  if (!part.roi) {
    return undefined;
  }
  if (!part.previewImageDataUrl || !part.previewCropRect) {
    return part.roi;
  }
  return {
    height: toPreviewPercent(part.roi.height, part.previewCropRect.height),
    width: toPreviewPercent(part.roi.width, part.previewCropRect.width),
    x: toPreviewPercent(part.roi.x - part.previewCropRect.left, part.previewCropRect.width),
    y: toPreviewPercent(part.roi.y - part.previewCropRect.top, part.previewCropRect.height),
  };
}
function getAssetPartMiniMapPoints(part) {
  if (!part.previewImageDataUrl || !part.previewCropRect) {
    return part.points;
  }
  return part.points.map((point) => ({
    ...point,
    x: toPreviewPercent(point.x - part.previewCropRect.left, part.previewCropRect.width),
    y: toPreviewPercent(point.y - part.previewCropRect.top, part.previewCropRect.height),
  }));
}
function toPreviewPercent(value, span) {
  if (!span) {
    return 0;
  }
  return Math.min(100, Math.max(0, (value / span) * 100));
}
function AssetPart3DMiniMap({ part }) {
  const target = part.viewer3DTarget;
  const point = part.points[0] ?? getRoiCenterPoint(part.roi);
  const targetColor = target?.color ?? "var(--primary)";
  if (target?.previewImageDataUrl) {
    return (
      <div className="AssetPart3DMiniMap AssetPart3DMiniMap__container-1 relative min-h-0 flex-1 overflow-hidden rounded-md border border-cyan-500/30 bg-slate-950">
        <img
          alt={`${part.name} 3D 캡쳐`}
          className="AssetPart3DMiniMap AssetPart3DMiniMap__image-1 absolute inset-0 h-full w-full object-contain"
          src={target.previewImageDataUrl}
        />
        <div className="AssetPart3DMiniMap AssetPart3DMiniMap__image-vignette-1 pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.18),transparent_32%,rgba(2,6,23,0.48))]" />
        <div className="AssetPart3DMiniMap AssetPart3DMiniMap__badge-1 absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm border border-cyan-200/25 bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-cyan-50">
          <Box className="h-3 w-3" aria-hidden="true" />
          {target.kind === "area" ? "3D 영역" : "3D 포인트"}
        </div>
        <span className="AssetPart3DMiniMap AssetPart3DMiniMap__coord-1 absolute bottom-1 left-1 right-1 truncate rounded-sm bg-black/45 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-cyan-50/90">
          {formatViewer3DVector(target.worldPosition)}
        </span>
      </div>
    );
  }
  return (
    <div className="AssetPart3DMiniMap AssetPart3DMiniMap__container-1 relative min-h-0 flex-1 overflow-hidden rounded-md border border-cyan-500/30 bg-slate-950">
      <div className="AssetPart3DMiniMap AssetPart3DMiniMap__grid-1 absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(125,211,252,0.26)_1px,transparent_1px),linear-gradient(rgba(125,211,252,0.2)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="AssetPart3DMiniMap AssetPart3DMiniMap__object-1 absolute left-[13%] top-[18%] h-[64%] w-[74%] -skew-x-6 rounded-md border border-cyan-200/25 bg-gradient-to-br from-cyan-300/20 via-slate-700/35 to-slate-950 shadow-[inset_0_0_22px_rgba(125,211,252,0.16)]" />
      <div className="AssetPart3DMiniMap AssetPart3DMiniMap__edge-1 absolute left-[20%] top-[12%] h-[58%] w-[66%] -skew-x-6 rounded-md border border-white/10" />
      <div className="AssetPart3DMiniMap AssetPart3DMiniMap__badge-1 absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm border border-cyan-200/25 bg-black/35 px-1.5 py-0.5 text-[9px] font-bold text-cyan-50">
        <Box className="h-3 w-3" aria-hidden="true" />
        3D
      </div>
      {part.roi ? (
        <span
          className="AssetPart3DMiniMap AssetPart3DMiniMap__roi-1 absolute rounded-sm border-2 bg-cyan-300/15 shadow-[0_0_14px_rgba(34,211,238,0.32)]"
          style={{
            borderColor: targetColor,
            height: `${part.roi.height}%`,
            left: `${part.roi.x}%`,
            top: `${part.roi.y}%`,
            width: `${part.roi.width}%`,
          }}
        />
      ) : null}
      {point ? (
        <span
          className="AssetPart3DMiniMap AssetPart3DMiniMap__point-1 absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 text-[9px] font-bold text-white shadow-[0_0_16px_rgba(34,211,238,0.42)]"
          style={{
            background: targetColor,
            left: `${point.x}%`,
            top: `${point.y}%`,
          }}
        >
          {target?.kind === "area" ? "A" : "P"}
        </span>
      ) : null}
      <span className="AssetPart3DMiniMap AssetPart3DMiniMap__coord-1 absolute bottom-1 left-1 right-1 truncate rounded-sm bg-black/35 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-cyan-50/90">
        {target ? formatViewer3DVector(target.worldPosition) : "3D 좌표 대기"}
      </span>
    </div>
  );
}
function DetectionMetricInfoRow({ highlighted, label, value }) {
  return (
    <div
      className={cn(
        "DetectionMetricInfoRow DetectionMetricInfoRow__row-1 flex min-h-0 min-w-0 items-center justify-between gap-1 overflow-hidden rounded-[4px] border border-border/45 border-l-2 bg-background/55 px-1.5 py-1.5",
        highlighted ? "border-l-red-500 bg-red-500/10" : "border-l-cyan-500",
      )}
    >
      <dt className="DetectionMetricInfoRow DetectionMetricInfoRow__label-1 min-w-0 shrink-0 truncate font-mono text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "DetectionMetricInfoRow DetectionMetricInfoRow__value-1 min-w-0 truncate text-right font-mono text-[12px] font-black leading-none text-foreground",
          highlighted && "text-red-500 dark:text-red-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
function formatAssetPartScope(part) {
  if (part.source === "3d" && part.viewer3DTarget) {
    return formatViewer3DVector(part.viewer3DTarget.worldPosition);
  }
  if (part.mode === "area" && part.roi) {
    return `${Math.round(part.roi.width)}×${Math.round(part.roi.height)}%`;
  }
  return `${part.points.length}개`;
}
function getAssetPartModeLabel(part) {
  if (part.source === "3d") {
    return part.viewer3DTarget?.kind === "area" ? "3D 영역" : "3D 포인트";
  }
  return part.mode === "area" ? "영역 ROI" : "포인트";
}
function getRoiCenterPoint(roi) {
  if (!roi) {
    return undefined;
  }
  return {
    x: roi.x + roi.width / 2,
    y: roi.y + roi.height / 2,
  };
}
function formatViewer3DVector(vector) {
  return `${roundOne(vector.x)}, ${roundOne(vector.y)}, ${roundOne(vector.z)}`;
}
function roundOne(value) {
  return Math.round(value * 10) / 10;
}
function isCriticalThresholdExceeded(
  value,
  warningThreshold,
  criticalThreshold,
) {
  if (value <= 0 || warningThreshold <= 0) {
    return false;
  }
  return isFinitePositiveNumber(criticalThreshold)
    ? value >= criticalThreshold
    : value >= warningThreshold;
}
function isFinitePositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function getOperationState(operationState, status) {
  if (operationState) {
    return operationState;
  }
  return status === "error" ? "비가동" : "가동중";
}
function formatOperationState(operationState) {
  return operationState === "가동중" ? "가동 중" : "비가동";
}
function formatFallbackAssetCode(assetId) {
  return assetId.toUpperCase().replace(/[^0-9A-Z]+/g, "-");
}
const operationStateClassName = {
  가동중:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  비가동:
    "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};
