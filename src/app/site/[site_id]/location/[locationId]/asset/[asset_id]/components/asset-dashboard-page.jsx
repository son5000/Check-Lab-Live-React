"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, ChevronLeft, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createDisplaySettingsSearchParams } from "@/app/layouts/helpers/display-settings";
import { formatCheckLabKoreanDateTime } from "@/app/layouts/helpers/time-formatters";
import { useDashboardHeaderStateController } from "@/app/layouts/hooks/use-dashboard-header-state";
import { useDashboardNotificationsController } from "@/app/layouts/hooks/use-dashboard-notifications";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";
import { AssetCameraPanel } from "./panels/asset-camera-panel";
import { AssetEventLogPanel, } from "./panels/asset-event-log-panel";
import { persistAssetReportDraft } from "./asset-report-draft-storage";
import { AssetSummaryPanel } from "./panels/asset-summary-panel";
import { AssetTrendPanel, } from "./panels/asset-trend-panel";
const assetTrendRanges = [
    { id: "1m", label: "1m", points: 13 },
    { id: "1h", label: "1h", points: 13 },
    { id: "24h", label: "24h", points: 13 },
    { id: "7d", label: "7d", points: 8 },
    { id: "30d", label: "30d", points: 16 },
];
const DEFAULT_ULTRASOUND_THRESHOLD_DB = 88;
const DEFAULT_TEMPERATURE_CAUTION_MARGIN_C = 6;
const DEFAULT_TEMPERATURE_CHANGE_DELTA_C = 4;
const DEFAULT_FRONTEND_USER_ID = "frontend-user-id";
const EVENT_DRAWER_HANDLE_DEFAULT_TOP_PERCENT = 50;
const EVENT_DRAWER_HANDLE_MIN_TOP_PERCENT = 12;
const EVENT_DRAWER_HANDLE_MAX_TOP_PERCENT = 88;
const EVENT_DRAWER_HANDLE_DRAG_THRESHOLD_PX = 4;
const DASHBOARD_REFRESH_INTERVAL_MS = 2000;
const REALTIME_TREND_FRAME_INTERVAL_MS = 33;
const REALTIME_TREND_SMOOTHING_DURATION_MS = 900;
const SMOOTHED_TREND_VALUE_KEYS = [
    "average",
    "max",
    "min",
    "peakFrequency",
    "spread",
];
const USE_REMOTE_ASSET_PARTS = false;
const OPEN_ASSET_EVENT_DETAIL_EVENT = "checklab:open-asset-event";
export function AssetDashboardPage({ asset_id, asset, initialEventId, site, location, remoteDashboard, }) {
    const { settings: displaySettings } = useDisplaySettings();
    const { setHeaderState } = useDashboardHeaderStateController();
    const { setNotifications } = useDashboardNotificationsController();
    const [remoteSnapshot, setRemoteSnapshot] = useState(remoteDashboard ?? null);
    const initialRangeId = getSupportedTrendRangeId(remoteDashboard?.trend?.selectedRangeId);
    const [activeCameraId, setActiveCameraId] = useState("default");
    const [cameraSetupRequestId, setCameraSetupRequestId] = useState(0);
    const [activeRangeId, setActiveRangeId] = useState(initialRangeId ?? "1m");
    const [selectedEventId, setSelectedEventId] = useState(initialEventId);
    const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(Boolean(initialEventId));
    const [assetParts, setAssetParts] = useState(() => USE_REMOTE_ASSET_PARTS
        ? remoteDashboard?.initialAssetParts ?? []
        : []);
    const previousRemoteAssetIdRef = useRef(remoteDashboard?.asset_id);
    const dashboardRefreshInFlightRef = useRef(false);
    const latestSavedThresholdsRef = useRef(null);
    const [selectedAssetPartId, setSelectedAssetPartId] = useState();
    const [assetThresholds, setAssetThresholds] = useState(() => remoteDashboard?.initialThresholds ?? null);
    const [isThresholdSaving, setIsThresholdSaving] = useState(false);
    const [thresholdSaveError, setThresholdSaveError] = useState();
    const [isThresholdEditorDirty, setIsThresholdEditorDirty] = useState(false);
    const [eventTick, setEventTick] = useState(0);
    const sample = useMemo(() => buildDashboardSample(asset, remoteSnapshot, {
        assetParts: USE_REMOTE_ASSET_PARTS
            ? remoteSnapshot?.initialAssetParts ?? []
            : assetParts,
        assetPartStates: USE_REMOTE_ASSET_PARTS
            ? remoteSnapshot?.initialAssetPartStates ?? []
            : [],
    }), [asset, assetParts, remoteSnapshot]);
    const displaySettingsQuery = useMemo(() => createDisplaySettingsSearchParams(displaySettings).toString(), [displaySettings]);
    const defaultAssetThresholds = useMemo(() => ({
        temperature: sample.threshold.targetTemperature,
        ultrasoundDb: DEFAULT_ULTRASOUND_THRESHOLD_DB,
    }), [sample.threshold.targetTemperature]);
    useEffect(() => {
        setRemoteSnapshot(remoteDashboard ?? null);
    }, [remoteDashboard]);
    useEffect(() => {
        setIsThresholdEditorDirty(false);
    }, [asset_id]);
    useEffect(() => {
        const nextRangeId = getSupportedTrendRangeId(remoteSnapshot?.trend?.selectedRangeId);
        if (nextRangeId) {
            setActiveRangeId(nextRangeId);
        }
    }, [remoteSnapshot?.trend?.selectedRangeId]);
    useEffect(() => {
        const nextRemoteAssetId = remoteSnapshot?.asset_id;
        const isAssetChanged = previousRemoteAssetIdRef.current !== nextRemoteAssetId;
        if (!USE_REMOTE_ASSET_PARTS) {
            if (isAssetChanged) {
                setAssetParts([]);
                setSelectedAssetPartId(undefined);
            }
            previousRemoteAssetIdRef.current = nextRemoteAssetId;
            return;
        }
        const remoteAssetParts = remoteSnapshot?.initialAssetParts ?? [];
        setAssetParts((currentParts) => isAssetChanged
            ? remoteAssetParts
            : mergeAssetPartConfigs(remoteAssetParts, currentParts));
        if (isAssetChanged) {
            setSelectedAssetPartId(undefined);
        }
        previousRemoteAssetIdRef.current = nextRemoteAssetId;
    }, [remoteSnapshot?.asset_id, remoteSnapshot?.initialAssetParts]);
    useEffect(() => {
        if (isThresholdEditorDirty) {
            return;
        }
        const nextThresholds = remoteSnapshot?.initialThresholds ?? null;
        setAssetThresholds((currentThresholds) => areAssetThresholdsEqual(currentThresholds, nextThresholds)
            ? currentThresholds
            : nextThresholds);
    }, [
        isThresholdEditorDirty,
        remoteSnapshot?.asset_id,
        remoteSnapshot?.initialThresholds,
    ]);
    useEffect(() => {
        setSelectedEventId(initialEventId);
        if (initialEventId) {
            setIsEventDrawerOpen(true);
        }
    }, [initialEventId]);
    useEffect(() => {
        const handleOpenAssetEvent = (event) => {
            const detail = event.detail;
            if (!detail?.eventId) {
                return;
            }
            if (detail.asset_id && asset_id && detail.asset_id !== asset_id) {
                return;
            }
            if (detail.assetId &&
                sample.asset.id &&
                detail.assetId !== sample.asset.id) {
                return;
            }
            setSelectedEventId(detail.eventId);
            setIsEventDrawerOpen(true);
        };
        window.addEventListener(OPEN_ASSET_EVENT_DETAIL_EVENT, handleOpenAssetEvent);
        return () => {
            window.removeEventListener(OPEN_ASSET_EVENT_DETAIL_EVENT, handleOpenAssetEvent);
        };
    }, [asset_id, sample.asset.id]);
    useEffect(() => {
        if (!asset_id) {
            return;
        }
        let isCancelled = false;
        const refreshRemoteSnapshot = async () => {
            if (dashboardRefreshInFlightRef.current) {
                return;
            }
            dashboardRefreshInFlightRef.current = true;
            try {
                const response = await fetch(`/api/asset-dashboard/${encodeURIComponent(asset_id)}?${displaySettingsQuery}`, { cache: "no-store" });
                if (!response.ok) {
                    throw new Error("Failed to refresh asset dashboard.");
                }
                let snapshot = (await response.json());
                if (!isCancelled) {
                    const latestSavedThresholds = latestSavedThresholdsRef.current;
                    if (latestSavedThresholds) {
                        if (areAssetThresholdsEqual(snapshot?.initialThresholds, latestSavedThresholds)) {
                            latestSavedThresholdsRef.current = null;
                        }
                        else {
                            snapshot = applyAssetThresholdsToSnapshot(snapshot, latestSavedThresholds);
                        }
                    }
                    setRemoteSnapshot(snapshot);
                }
            }
            catch (error) {
                console.warn("Failed to refresh asset dashboard.", error);
            }
            finally {
                dashboardRefreshInFlightRef.current = false;
            }
        };
        void refreshRemoteSnapshot();
        const intervalId = window.setInterval(refreshRemoteSnapshot, DASHBOARD_REFRESH_INTERVAL_MS);
        return () => {
            isCancelled = true;
            window.clearInterval(intervalId);
        };
    }, [asset_id, displaySettingsQuery]);
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setEventTick((currentTick) => currentTick + 1);
        }, 5000);
        return () => window.clearInterval(intervalId);
    }, []);
    const temperatureSummary = useMemo(() => getAssetTemperatureSummary(sample), [sample]);
    const changedCoordinates = useMemo(() => extractChangedTemperatureCoordinates(sample.temperatureParts, sample.threshold.changeDetectionDelta), [sample]);
    const ultrasoundSummary = useMemo(() => getUltrasoundSummary(sample.ultrasoundDetections), [sample.ultrasoundDetections]);
    const assetPartStates = useMemo(() => USE_REMOTE_ASSET_PARTS
        ? mergeAssetPartStates(buildAssetPartStates(assetParts, sample), remoteSnapshot?.initialAssetPartStates)
        : buildAssetPartStates(assetParts, sample), [assetParts, remoteSnapshot?.initialAssetPartStates, sample]);
    const requestPreview = useMemo(() => buildUltrasoundDetectionRequest(sample.asset.id, changedCoordinates), [changedCoordinates, sample.asset.id]);
    const activeRange = assetTrendRanges.find((range) => range.id === activeRangeId) ??
        assetTrendRanges[0];
    const rawTemperatureData = useMemo(() => remoteSnapshot?.trend?.temperatureData?.length
        ? remoteSnapshot.trend.temperatureData
        : buildEmptyTrendData(activeRange), [activeRange, remoteSnapshot?.trend?.temperatureData]);
    const rawUltrasonicData = useMemo(() => remoteSnapshot?.trend?.ultrasonicData?.length
        ? remoteSnapshot.trend.ultrasonicData
        : buildEmptyTrendData(activeRange), [activeRange, remoteSnapshot?.trend?.ultrasonicData]);
    const temperatureData = useSmoothedTrendData(rawTemperatureData, activeRange.id);
    const ultrasonicData = useSmoothedTrendData(rawUltrasonicData, activeRange.id);
    const latestTemperaturePoint = getLatestTrendPoint(temperatureData);
    const latestUltrasonicPoint = getLatestTrendPoint(ultrasonicData);
    const averageTemperature = latestTemperaturePoint?.average ??
        roundOne(getAverage(getTemperaturePoints(sample).map((point) => point.temperature)));
    const temperatureMax = latestTemperaturePoint?.max ?? temperatureSummary.maxPoint.temperature;
    const temperatureMin = latestTemperaturePoint?.min ?? temperatureSummary.minPoint.temperature;
    const ultrasoundAverageDb = latestUltrasonicPoint?.average ?? ultrasoundSummary.averageDb;
    const liveUltrasoundMax = useMemo(() => ({
        ...ultrasoundSummary.maxDetection,
        averageDb: ultrasoundAverageDb,
        dominantFrequencyKHz: latestUltrasonicPoint?.peakFrequency ??
            ultrasoundSummary.maxDetection.dominantFrequencyKHz,
        peakDb: latestUltrasonicPoint?.max ?? ultrasoundSummary.maxDetection.peakDb,
    }), [
        latestUltrasonicPoint,
        ultrasoundAverageDb,
        ultrasoundSummary.maxDetection,
    ]);
    const ultrasoundDetectionCount = remoteSnapshot?.summary?.ultrasoundDetectionCount ??
        sample.ultrasoundDetections.length;
    const assetThresholdJudgement = useMemo(() => {
        if (!assetThresholds) {
            return null;
        }
        return buildAssetThresholdJudgement({
            cautionMargin: sample.threshold.cautionMargin,
            assetThresholds,
            temperatureAverage: averageTemperature,
            ultrasoundAverageDb,
        });
    }, [
        averageTemperature,
        assetThresholds,
        sample.threshold.cautionMargin,
        ultrasoundAverageDb,
    ]);
    const assetJudgement = useMemo(() => {
        if (!assetThresholds || !assetThresholdJudgement) {
            return "unconfigured";
        }
        return mergeJudgements([
            assetThresholdJudgement,
            ...assetPartStates.map((partState) => partState.judgement),
        ]);
    }, [assetPartStates, assetThresholdJudgement, assetThresholds]);
    const events = useMemo(() => {
        const liveEvents = buildAssetEvents({
            eventTick,
            requestCoordinateCount: requestPreview.coordinates.length,
            sample,
            ultrasoundAverageDb,
            ultrasoundMax: liveUltrasoundMax,
            assetThresholds,
            assetParts,
            assetPartStates,
            assetJudgement,
            temperatureAverage: averageTemperature,
        });
        return mergeAssetEvents(remoteSnapshot?.recentEvents ?? [], liveEvents);
    }, [
        averageTemperature,
        assetParts,
        assetPartStates,
        assetJudgement,
        assetThresholds,
        eventTick,
        liveUltrasoundMax,
        remoteSnapshot?.recentEvents,
        requestPreview.coordinates.length,
        sample,
        ultrasoundAverageDb,
    ]);
    const globalNotifications = useMemo(() => buildGlobalNotifications({
        asset_id,
        displaySettings,
        events,
        location,
        site,
        sample,
    }), [asset_id, displaySettings, events, location, site, sample]);
    const reportHref = `/site/${encodeURIComponent(site.site_id)}/location/${encodeURIComponent(location.id)}/asset/${encodeURIComponent(asset_id)}/report`;
    const unresolvedAlarmCount = globalNotifications.length;
    const chartReferenceThresholds = assetThresholds ?? defaultAssetThresholds;
    const chartTemperatureReferenceLines = remoteSnapshot?.trend?.temperatureReferenceLines?.length
        ? remoteSnapshot.trend.temperatureReferenceLines
        : [
            {
                label: "온도 임계",
                value: chartReferenceThresholds.temperature,
                stroke: "var(--asset-temperature-maximum-stroke)",
            },
        ];
    const chartUltrasonicReferenceLines = remoteSnapshot?.trend?.ultrasonicReferenceLines?.length
        ? remoteSnapshot.trend.ultrasonicReferenceLines
        : [
            {
                label: "초음파 임계",
                value: chartReferenceThresholds.ultrasoundDb,
                stroke: "var(--asset-ultrasound-maximum-stroke)",
            },
        ];
    const reportDraft = useMemo(() => ({
        assetPartStates,
        assetParts,
        assetThresholds,
        remoteDashboard: buildReportRemoteDashboardSnapshot({
            activeRangeId,
            assetJudgement,
            assetPartStates,
            assetParts,
            assetThresholds,
            averageTemperature,
            chartTemperatureReferenceLines,
            chartUltrasonicReferenceLines,
            liveUltrasoundMax,
            remoteSnapshot,
            sample,
            temperatureData,
            temperatureMax,
            temperatureMin,
            ultrasoundAverageDb,
            ultrasoundDetectionCount,
            ultrasonicData,
        }),
    }), [
        activeRangeId,
        assetJudgement,
        assetPartStates,
        assetParts,
        assetThresholds,
        averageTemperature,
        chartTemperatureReferenceLines,
        chartUltrasonicReferenceLines,
        liveUltrasoundMax,
        remoteSnapshot,
        sample,
        temperatureData,
        temperatureMax,
        temperatureMin,
        ultrasoundAverageDb,
        ultrasoundDetectionCount,
        ultrasonicData,
    ]);
    const persistCurrentReportDraft = useCallback(() => {
        persistAssetReportDraft(asset_id, reportDraft);
    }, [asset_id, reportDraft]);
    const handleCreateAssetPart = (part) => {
        setAssetParts((currentParts) => [part, ...currentParts]);
        setSelectedAssetPartId(part.id);
    };
    const handleUpdateAssetPart = (nextPart) => {
        setAssetParts((currentParts) => currentParts.some((currentPart) => currentPart.id === nextPart.id)
            ? currentParts.map((currentPart) => currentPart.id === nextPart.id ? nextPart : currentPart)
            : [nextPart, ...currentParts]);
        setSelectedAssetPartId(nextPart.id);
    };
    const handleDeleteAssetPart = (partId) => {
        setAssetParts((currentParts) => currentParts.filter((currentPart) => currentPart.id !== partId));
        setSelectedAssetPartId((currentPartId) => currentPartId === partId ? undefined : currentPartId);
    };
    const handleSelectAssetPart = (partId) => {
        setSelectedAssetPartId(partId);
    };
    const handleOpenCameraInterestAreaCreator = useCallback(() => {
        setCameraSetupRequestId((currentRequestId) => currentRequestId + 1);
    }, []);
    const handleAssetThresholdSave = useCallback(async (nextThresholds) => {
        const previousThresholds = assetThresholds ?? defaultAssetThresholds;
        const applyResolvedThresholds = (resolvedThresholds) => {
            latestSavedThresholdsRef.current = resolvedThresholds;
            setAssetThresholds(resolvedThresholds);
            if (resolvedThresholds) {
                setAssetParts((currentParts) => syncAssetPartsWithAssetThresholds(currentParts, previousThresholds, resolvedThresholds));
            }
            setRemoteSnapshot((currentSnapshot) => applyAssetThresholdsToSnapshot(currentSnapshot, resolvedThresholds));
        };
        setThresholdSaveError(undefined);
        if (!nextThresholds) {
            applyResolvedThresholds(null);
            return;
        }
        if (!asset_id) {
            applyResolvedThresholds(nextThresholds);
            return;
        }
        setIsThresholdSaving(true);
        try {
            const response = await fetch(`/api/asset-dashboard/${encodeURIComponent(asset_id)}/thresholds`, {
                body: JSON.stringify(toThresholdUpdatePayload(nextThresholds)),
                headers: { "Content-Type": "application/json" },
                method: "PUT",
            });
            if (!response.ok) {
                throw new Error("Failed to save asset thresholds.");
            }
            const savedThresholds = (await response.json());
            const resolvedThresholds = savedThresholds ?? nextThresholds;
            applyResolvedThresholds(resolvedThresholds);
        }
        catch (error) {
            console.warn("Failed to save asset thresholds.", error);
            setThresholdSaveError("임계치 저장에 실패했습니다.");
            throw error;
        }
        finally {
            setIsThresholdSaving(false);
        }
    }, [assetThresholds, asset_id, defaultAssetThresholds]);
    const handleEventRead = useCallback(async (event) => {
        const alertId = event.alertId ?? event.id;
        if (!alertId || event.source !== "asset-threshold") {
            return;
        }
        try {
            const response = await fetch(`/api/asset-dashboard/alerts/${encodeURIComponent(alertId)}/read`, {
                body: JSON.stringify({ read_by: DEFAULT_FRONTEND_USER_ID }),
                headers: { "Content-Type": "application/json" },
                method: "PUT",
            });
            if (!response.ok) {
                throw new Error("Failed to mark alert as read.");
            }
        }
        catch (error) {
            console.warn("Failed to mark alert as read.", error);
        }
    }, []);
    useEffect(() => {
        setHeaderState((currentState) => ({
            ...currentState,
            assetStatus: toDashboardStatus(assetJudgement),
            assetStatusLabel: judgementLabel[assetJudgement],
            unresolvedAlarmCount,
        }));
    }, [assetJudgement, setHeaderState, unresolvedAlarmCount]);
    useEffect(() => {
        setNotifications(globalNotifications);
    }, [globalNotifications, setNotifications]);
    useEffect(() => {
        return () => setNotifications([]);
    }, [setNotifications]);
    return (<main className="AssetDashboardPage AssetDashboardPage__root-1 h-full min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/35 p-2 md:overflow-hidden">
      <div className="AssetDashboardPage AssetDashboardPage__layout-parts-1">
        <DashboardArea className="AssetDashboardPage__area-title">
          <AssetStatusTitlePanel assetJudgement={assetJudgement} events={events} location={location} reportHref={reportHref} site={site} sample={sample} unresolvedAlarmCount={unresolvedAlarmCount} onReportOpen={persistCurrentReportDraft}/>
        </DashboardArea>

        <DashboardArea className="AssetDashboardPage__area-camera">
          <AssetCameraPanel activeCameraId={activeCameraId} cameraFeeds={remoteSnapshot?.cameraFeeds} defaultAssetThresholds={defaultAssetThresholds} assetParts={assetParts} assetPartStates={assetPartStates} selectedAssetPartId={selectedAssetPartId} assetThresholds={assetThresholds} cameraSetupRequestId={cameraSetupRequestId} onCameraSelect={setActiveCameraId} onCreateAssetPart={handleCreateAssetPart} onDeleteAssetPart={handleDeleteAssetPart} onSelectAssetPart={setSelectedAssetPartId} onUpdateAssetPart={handleUpdateAssetPart} temperatureData={temperatureData} ultrasonicData={ultrasonicData} variant="stream"/>
        </DashboardArea>

        <DashboardArea className="AssetDashboardPage__area-metrics">
          <AssetSummaryPanel averageTemperature={averageTemperature} assetParts={assetParts} assetPartStates={assetPartStates} assetThresholds={assetThresholds} assetJudgement={assetJudgement} asset={sample.asset} isThresholdSaving={isThresholdSaving} temperatureMax={temperatureMax} temperatureMin={temperatureMin} thresholdSaveError={thresholdSaveError} ultrasoundAverageDb={ultrasoundAverageDb} ultrasoundDetectionCount={ultrasoundDetectionCount} ultrasoundMax={liveUltrasoundMax} selectedAssetPartId={selectedAssetPartId} onAssetPartSelect={handleSelectAssetPart} onAssetThresholdSave={handleAssetThresholdSave} onThresholdEditorDirtyChange={setIsThresholdEditorDirty} onCameraInterestAreaCreate={handleOpenCameraInterestAreaCreator} variant="metrics"/>
        </DashboardArea>

        <DashboardArea className="AssetDashboardPage__area-trends">
          <AssetTrendPanel activeRangeId={activeRangeId} ranges={assetTrendRanges} temperatureData={temperatureData} temperatureReferenceLines={chartTemperatureReferenceLines} ultrasonicData={ultrasonicData} ultrasonicReferenceLines={chartUltrasonicReferenceLines} onRangeChange={setActiveRangeId}/>
        </DashboardArea>

        <DashboardArea className="AssetDashboardPage__area-detection">
          <AssetSummaryPanel averageTemperature={averageTemperature} assetParts={assetParts} assetPartStates={assetPartStates} assetThresholds={assetThresholds} assetJudgement={assetJudgement} asset={sample.asset} isThresholdSaving={isThresholdSaving} temperatureMax={temperatureMax} temperatureMin={temperatureMin} thresholdSaveError={thresholdSaveError} ultrasoundAverageDb={ultrasoundAverageDb} ultrasoundDetectionCount={ultrasoundDetectionCount} ultrasoundMax={liveUltrasoundMax} selectedAssetPartId={selectedAssetPartId} onAssetPartSelect={handleSelectAssetPart} onAssetThresholdSave={handleAssetThresholdSave} onThresholdEditorDirtyChange={setIsThresholdEditorDirty} onCameraInterestAreaCreate={handleOpenCameraInterestAreaCreator} variant="detection"/>
        </DashboardArea>
      </div>

      <EventLogBlindDrawer asset_id={asset_id} assetId={sample.asset.id} events={events} initialSelectedEventId={selectedEventId} isOpen={isEventDrawerOpen} onEventRead={handleEventRead} onClose={() => setIsEventDrawerOpen(false)} onOpen={() => setIsEventDrawerOpen(true)}/>
    </main>);
}
function DashboardArea({ children, className, }) {
    return (<div className={cn("AssetDashboardPage AssetDashboardPage__area-1 grid min-h-0 min-w-0 overflow-hidden", className)}>
      {children}
    </div>);
}
function buildReportRemoteDashboardSnapshot({ activeRangeId, assetJudgement, assetPartStates, assetParts, assetThresholds, averageTemperature, chartTemperatureReferenceLines, chartUltrasonicReferenceLines, liveUltrasoundMax, remoteSnapshot, sample, temperatureData, temperatureMax, temperatureMin, ultrasoundAverageDb, ultrasoundDetectionCount, ultrasonicData, }) {
    const reportJudgement = assetJudgement === "unconfigured" ? "normal" : assetJudgement;
    return {
        ...(remoteSnapshot ?? {}),
        header: {
            ...(remoteSnapshot?.header ?? {}),
            assetName: sample.asset.name,
            dashboardStatus: toDashboardStatus(reportJudgement),
            lastCollectedAt: sample.asset.lastCollectedAt,
            statusJudgement: reportJudgement,
        },
        initialAssetParts: assetParts,
        initialAssetPartStates: assetPartStates,
        initialThresholds: assetThresholds,
        summary: {
            ...(remoteSnapshot?.summary ?? {}),
            averageTemperature,
            dominantFrequencyKHz: liveUltrasoundMax.dominantFrequencyKHz,
            frequencyBandKHz: liveUltrasoundMax.frequencyBandKHz ?? remoteSnapshot?.summary?.frequencyBandKHz,
            temperatureMax,
            temperatureMin,
            ultrasoundAverageDb,
            ultrasoundDetectionCount,
            ultrasoundPeakDb: liveUltrasoundMax.peakDb,
        },
        trend: {
            ...(remoteSnapshot?.trend ?? {}),
            selectedRangeId: activeRangeId,
            temperatureData: cloneTrendData(temperatureData),
            temperatureReferenceLines: chartTemperatureReferenceLines.map((line) => ({ ...line })),
            ultrasonicData: cloneTrendData(ultrasonicData),
            ultrasonicReferenceLines: chartUltrasonicReferenceLines.map((line) => ({ ...line })),
        },
    };
}
function useSmoothedTrendData(targetData, resetKey) {
    const [displayData, setDisplayData] = useState(() => cloneTrendData(targetData));
    const displayDataRef = useRef(displayData);
    const animationFrameRef = useRef(0);
    const previousResetKeyRef = useRef(resetKey);
    useEffect(() => {
        displayDataRef.current = displayData;
    }, [displayData]);
    useEffect(() => {
        window.cancelAnimationFrame(animationFrameRef.current);
        const targetSnapshot = cloneTrendData(targetData);
        if (previousResetKeyRef.current !== resetKey ||
            !displayDataRef.current.length ||
            !targetSnapshot.length) {
            previousResetKeyRef.current = resetKey;
            displayDataRef.current = targetSnapshot;
            setDisplayData(targetSnapshot);
            return () => window.cancelAnimationFrame(animationFrameRef.current);
        }
        const startSnapshot = buildTrendAnimationStartData(displayDataRef.current, targetSnapshot);
        const animationStartedAt = window.performance.now();
        let lastPublishedAt = 0;
        const animate = (frameTime) => {
            const elapsed = frameTime - animationStartedAt;
            if (elapsed < REALTIME_TREND_SMOOTHING_DURATION_MS &&
                frameTime - lastPublishedAt < REALTIME_TREND_FRAME_INTERVAL_MS) {
                animationFrameRef.current = window.requestAnimationFrame(animate);
                return;
            }
            lastPublishedAt = frameTime;
            const progress = easeOutCubic(Math.min(elapsed / REALTIME_TREND_SMOOTHING_DURATION_MS, 1));
            const nextDisplayData = interpolateTrendData(startSnapshot, targetSnapshot, progress);
            displayDataRef.current = nextDisplayData;
            setDisplayData(nextDisplayData);
            if (progress < 1) {
                animationFrameRef.current = window.requestAnimationFrame(animate);
                return;
            }
            displayDataRef.current = targetSnapshot;
            setDisplayData(targetSnapshot);
        };
        animationFrameRef.current = window.requestAnimationFrame(animate);
        return () => window.cancelAnimationFrame(animationFrameRef.current);
    }, [resetKey, targetData]);
    return displayData;
}
function cloneTrendData(data) {
    return data.map((point) => ({ ...point }));
}
function buildTrendAnimationStartData(currentData, targetData) {
    return targetData.map((targetPoint, index) => {
        const currentPoint = currentData.find((point) => point.time === targetPoint.time) ??
            currentData[index] ??
            targetPoint;
        return {
            ...targetPoint,
            ...SMOOTHED_TREND_VALUE_KEYS.reduce((values, key) => {
                values[key] = currentPoint[key];
                return values;
            }, {}),
        };
    });
}
function interpolateTrendData(startData, targetData, progress) {
    return targetData.map((targetPoint, index) => {
        const startPoint = startData[index] ?? targetPoint;
        const nextPoint = { ...targetPoint };
        for (const key of SMOOTHED_TREND_VALUE_KEYS) {
            nextPoint[key] = interpolateTrendValue(startPoint[key], targetPoint[key], progress);
        }
        return nextPoint;
    });
}
function interpolateTrendValue(startValue, targetValue, progress) {
    if (!isFiniteNumber(startValue) || !isFiniteNumber(targetValue)) {
        return targetValue;
    }
    return roundRealtimeValue(startValue + (targetValue - startValue) * progress);
}
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
}
function roundRealtimeValue(value) {
    return Math.round(value * 100) / 100;
}
function EventLogBlindDrawer({ asset_id, assetId, events, initialSelectedEventId, isOpen, onEventRead, onClose, onOpen, }) {
    const [handleTopPercent, setHandleTopPercent] = useState(EVENT_DRAWER_HANDLE_DEFAULT_TOP_PERCENT);
    const handleDragStateRef = useRef(null);
    const suppressNextClickRef = useRef(false);
    const handleToggle = () => {
        if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
        }
        if (isOpen) {
            onClose();
            return;
        }
        onOpen();
    };
    const handlePointerDown = (event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        handleDragStateRef.current = {
            didDrag: false,
            pointerId: event.pointerId,
            startTopPercent: handleTopPercent,
            startY: event.clientY,
        };
    };
    const handlePointerMove = (event) => {
        const dragState = handleDragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
        const deltaY = event.clientY - dragState.startY;
        const nextTopPercent = clampHandleTopPercent(dragState.startTopPercent + (deltaY / viewportHeight) * 100);
        if (Math.abs(deltaY) >= EVENT_DRAWER_HANDLE_DRAG_THRESHOLD_PX) {
            dragState.didDrag = true;
            suppressNextClickRef.current = true;
        }
        setHandleTopPercent(nextTopPercent);
    };
    const handlePointerEnd = (event) => {
        const dragState = handleDragStateRef.current;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (dragState?.didDrag) {
            suppressNextClickRef.current = true;
        }
        handleDragStateRef.current = null;
    };
    return (<>
      <button type="button" aria-expanded={isOpen} aria-label={isOpen ? "이벤트 기록 닫기" : "이벤트 기록 열기"} data-global-notification-target="asset-event-blind-handle" className={cn("AssetEventBlindHandle AssetEventBlindHandle__button-1 fixed z-50 flex h-32 w-11 -translate-y-1/2 touch-none select-none flex-col items-center justify-center gap-2 rounded-l-md border border-r-0 border-border bg-card text-card-foreground shadow-xl transition-[right,background,color] duration-300 hover:bg-accent active:cursor-grabbing", isOpen ? "right-[70vw]" : "right-0")} onClick={handleToggle} onPointerCancel={handlePointerEnd} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} style={{ top: `${handleTopPercent}%` }}>
        <ChevronLeft className={cn("AssetEventBlindHandle AssetEventBlindHandle__icon-1 h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} aria-hidden="true"/>
        <BellRing className="AssetEventBlindHandle AssetEventBlindHandle__icon-2 h-4 w-4" aria-hidden="true"/>
        <span className="AssetEventBlindHandle AssetEventBlindHandle__text-1 text-[11px] font-black tracking-normal" style={{ writingMode: "vertical-rl" }}>
          이벤트
        </span>
        <span className="AssetEventBlindHandle AssetEventBlindHandle__count-1 rounded-sm bg-primary px-1 py-0.5 font-mono text-[10px] font-bold leading-none text-primary-foreground">
          {events.length}
        </span>
      </button>

      <div className={cn("AssetEventDrawer AssetEventDrawer__backdrop-1 fixed inset-0 z-40 bg-black/20 transition-opacity duration-300", isOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={onClose}/>

      <aside className={cn("AssetEventDrawer AssetEventDrawer__panel-1 fixed bottom-0 right-0 top-0 z-50 flex w-[70vw] min-w-0 flex-col border-l border-border bg-card p-3 shadow-2xl transition-transform duration-300 ease-out", isOpen ? "translate-x-0" : "translate-x-full")} aria-hidden={!isOpen}>
        <div className="AssetEventDrawer AssetEventDrawer__header-1 mb-2 flex min-w-0 items-center justify-between gap-2">
          <div className="AssetEventDrawer AssetEventDrawer__title-wrap-1 flex min-w-0 items-center gap-2">
            <BellRing className="AssetEventDrawer AssetEventDrawer__icon-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
            <div className="AssetEventDrawer AssetEventDrawer__title-copy-1 min-w-0">
              <p className="AssetEventDrawer AssetEventDrawer__eyebrow-1 truncate text-[11px] font-bold text-muted-foreground">
                실시간 이벤트 기록
              </p>
              <h2 className="AssetEventDrawer AssetEventDrawer__title-1 truncate text-lg font-black text-foreground">
                이벤트 로그
              </h2>
            </div>
          </div>
          <button type="button" aria-label="이벤트 기록 닫기" className="AssetEventDrawer AssetEventDrawer__close-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground" onClick={onClose}>
            <X className="AssetEventDrawer AssetEventDrawer__icon-2 h-4 w-4" aria-hidden="true"/>
          </button>
        </div>

        <div className="AssetEventDrawer AssetEventDrawer__content-1 min-h-0 flex-1">
          <AssetEventLogPanel asset_id={asset_id} assetId={assetId} events={events} initialSelectedEventId={initialSelectedEventId} onEventRead={onEventRead} onRequestClose={onClose} variant="wide"/>
        </div>
      </aside>
    </>);
}
function clampHandleTopPercent(topPercent) {
    return Math.min(Math.max(topPercent, EVENT_DRAWER_HANDLE_MIN_TOP_PERCENT), EVENT_DRAWER_HANDLE_MAX_TOP_PERCENT);
}
function AssetStatusTitlePanel({ assetJudgement, events, location, reportHref, site, sample, unresolvedAlarmCount, onReportOpen, }) {
    const latestEventGrade = events[0]?.grade ?? "normal";
    return (<section className={cn("AssetStatusTitlePanel AssetStatusTitlePanel__section-1 grid min-h-0 min-w-0 grid-cols-1 items-center gap-3 overflow-hidden rounded-md border border-border bg-card px-5 text-card-foreground sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:gap-4", assetStatusTitlePanelClassName[assetJudgement])}>
      <div className="AssetStatusTitlePanel AssetStatusTitlePanel__container-1 min-w-0">
        <p className="AssetStatusTitlePanel AssetStatusTitlePanel__text-1 truncate text-xs font-bold text-muted-foreground">
          {site.name} · {location.name}
        </p>
        <h1 className="AssetStatusTitlePanel AssetStatusTitlePanel__title-1 truncate text-3xl font-black tracking-normal text-foreground xl:text-4xl">
          {sample.asset.name}
        </h1>
      </div>

      <div className="AssetStatusTitlePanel AssetStatusTitlePanel__container-2 flex min-w-36 items-center justify-start gap-3 sm:justify-end">
        <span className="AssetStatusTitlePanel AssetStatusTitlePanel__text-2 text-xs font-bold uppercase text-muted-foreground">
          현재 상태 판정
        </span>
        <span className={cn("AssetStatusTitlePanel AssetStatusTitlePanel__label-1 rounded-md border px-6 py-2.5 text-3xl font-black leading-none shadow-sm xl:text-4xl", judgementClassName[assetJudgement])}>
          {judgementLabel[assetJudgement]}
        </span>
      </div>

      <div className="AssetStatusTitlePanel AssetStatusTitlePanel__container-3 grid min-w-36 justify-items-start gap-1 px-1 py-1 sm:justify-items-end">
        <span className="AssetStatusTitlePanel AssetStatusTitlePanel__text-3 text-[11px] font-semibold text-muted-foreground">
          실시간 이벤트 판정
        </span>
        <span className={cn("AssetStatusTitlePanel AssetStatusTitlePanel__label-2 rounded-sm border px-2 py-0.5 text-xs font-bold", eventGradeClassName[latestEventGrade])}>
          {eventGradeLabel[latestEventGrade]}
        </span>
        <span className="AssetStatusTitlePanel AssetStatusTitlePanel__text-4 font-mono text-[11px] text-muted-foreground">
          {events.length}건 · 미해결 {unresolvedAlarmCount}건
        </span>
      </div>
      <Link aria-label="보고서 생성 화면 열기" className="AssetStatusTitlePanel AssetStatusTitlePanel__report-link-1 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-4 text-xs font-extrabold text-primary shadow-sm transition hover:border-primary/60 hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35" href={reportHref} target="_blank" title="보고서 생성 화면 열기" onAuxClick={onReportOpen} onClick={onReportOpen}>
        <FileText className="AssetStatusTitlePanel AssetStatusTitlePanel__report-icon-1 h-3.5 w-3.5" aria-hidden="true"/>
        보고서 생성
      </Link>
    </section>);
}
function buildDashboardSample(asset, remoteDashboard, { assetParts = remoteDashboard?.initialAssetParts ?? [], assetPartStates = remoteDashboard?.initialAssetPartStates ?? [], } = {}) {
    const threshold = remoteDashboard?.initialThresholds;
    const summary = remoteDashboard?.summary;
    const targetTemperature = threshold?.temperature ?? summary?.temperatureMax ?? 0;
    const averageTemperature = summary?.averageTemperature ?? 0;
    const temperatureMax = summary?.temperatureMax ?? averageTemperature;
    const temperatureMin = summary?.temperatureMin ?? averageTemperature;
    return {
        asset,
        temperatureParts: buildTemperatureParts({
            averageTemperature,
            parts: assetParts,
            states: assetPartStates,
            temperatureMax,
            temperatureMin,
        }),
        threshold: {
            cautionMargin: DEFAULT_TEMPERATURE_CAUTION_MARGIN_C,
            changeDetectionDelta: DEFAULT_TEMPERATURE_CHANGE_DELTA_C,
            targetTemperature,
        },
        ultrasoundDetections: buildUltrasoundDetections({
            parts: assetParts,
            states: assetPartStates,
            summary,
        }),
    };
}
function buildTemperatureParts({ parts, averageTemperature, states, temperatureMax, temperatureMin, }) {
    const remotePoints = states
        .map((state, index) => {
        const temperature = state.temperatureMax || state.temperatureAverage || averageTemperature;
        if (temperature <= 0) {
            return null;
        }
        return {
            id: `${state.partId}-temperature`,
            temperature: roundOne(temperature),
            ...getPartAnchorPoint(parts.find((part) => part.id === state.partId), index),
        };
    })
        .filter(isTemperaturePointSample);
    const hasSummaryTemperature = averageTemperature > 0 || temperatureMax > 0 || temperatureMin > 0;
    let points = remotePoints;
    if (!points.length && hasSummaryTemperature) {
        points = [
            {
                id: "temperature-low",
                temperature: roundOne(temperatureMin),
                x: 24,
                y: 64,
            },
            {
                id: "temperature-average",
                temperature: roundOne(averageTemperature),
                x: 50,
                y: 42,
            },
            {
                id: "temperature-high",
                temperature: roundOne(temperatureMax),
                x: 72,
                y: 34,
            },
        ];
    }
    return [
        {
            id: "thermal-field",
            name: "열화상 영역",
            points,
        },
    ];
}
function buildUltrasoundDetections({ parts, states, summary, }) {
    const frequencyBandKHz = summary?.frequencyBandKHz ?? "35-45";
    const dominantFrequencyKHz = summary?.dominantFrequencyKHz ?? 40;
    const detections = states
        .map((state, index) => {
        const peakDb = state.ultrasoundPeakDb || summary?.ultrasoundPeakDb || 0;
        if (peakDb <= 0) {
            return null;
        }
        const point = getPartAnchorPoint(parts.find((part) => part.id === state.partId), index);
        return {
            averageDb: roundOne(Math.max(summary?.ultrasoundAverageDb ?? peakDb - 8, 0)),
            dominantFrequencyKHz: state.dominantFrequencyKHz || dominantFrequencyKHz,
            frequencyBandKHz,
            id: `${state.partId}-ultrasound`,
            peakDb: roundOne(peakDb),
            sourceCoordinateId: state.partId,
            x: point.x,
            y: point.y,
        };
    })
        .filter(isUltrasoundDetection);
    if (detections.length) {
        return detections;
    }
    const peakDb = summary?.ultrasoundPeakDb ?? 0;
    const averageDb = summary?.ultrasoundAverageDb ?? peakDb;
    if (peakDb <= 0 && averageDb <= 0) {
        return [];
    }
    return [
        {
            averageDb: roundOne(averageDb),
            dominantFrequencyKHz,
            frequencyBandKHz,
            id: "summary-ultrasound",
            peakDb: roundOne(Math.max(peakDb, averageDb)),
            sourceCoordinateId: "summary-ultrasound",
            x: 58,
            y: 36,
        },
    ];
}
function getPartAnchorPoint(part, index) {
    if (part?.roi) {
        return {
            x: part.roi.x + part.roi.width / 2,
            y: part.roi.y + part.roi.height / 2,
        };
    }
    return part?.points[0] ?? { x: 28 + (index % 3) * 22, y: 34 + (index % 2) * 24 };
}
function getAssetTemperatureSummary(sample) {
    const points = getTemperaturePoints(sample);
    const fallbackPoint = {
        id: "temperature-fallback",
        temperature: 0,
        x: 0,
        y: 0,
    };
    if (!points.length) {
        return { maxPoint: fallbackPoint, minPoint: fallbackPoint };
    }
    return {
        maxPoint: points.reduce((currentMax, point) => point.temperature > currentMax.temperature ? point : currentMax),
        minPoint: points.reduce((currentMin, point) => point.temperature < currentMin.temperature ? point : currentMin),
    };
}
function getUltrasoundSummary(detections) {
    const fallbackDetection = {
        averageDb: 0,
        dominantFrequencyKHz: 0,
        frequencyBandKHz: "0-0",
        id: "ultrasound-fallback",
        peakDb: 0,
        sourceCoordinateId: "ultrasound-fallback",
        x: 0,
        y: 0,
    };
    if (!detections.length) {
        return {
            averageDb: 0,
            maxDetection: fallbackDetection,
        };
    }
    return {
        averageDb: roundOne(getAverage(detections.map((detection) => detection.averageDb))),
        maxDetection: detections.reduce((currentMax, detection) => detection.peakDb > currentMax.peakDb ? detection : currentMax),
    };
}
function extractChangedTemperatureCoordinates(parts, changeDetectionDelta) {
    return parts.flatMap((part) => {
        const average = getAverage(part.points.map((point) => point.temperature));
        return part.points
            .filter((point) => Math.abs(point.temperature - average) >= changeDetectionDelta)
            .map((point) => ({
            ...point,
            partId: part.id,
        }));
    });
}
function buildUltrasoundDetectionRequest(assetId, coordinates) {
    return {
        coordinates: coordinates.map((coordinate) => ({
            id: coordinate.id,
            temperature: coordinate.temperature,
            x: coordinate.x,
            y: coordinate.y,
        })),
        assetId,
    };
}
function mergeAssetPartStates(localStates, remoteStates) {
    if (!remoteStates?.length) {
        return localStates;
    }
    const stateByPartId = new Map(localStates.map((state) => [state.partId, state]));
    remoteStates.forEach((state) => {
        const localState = stateByPartId.get(state.partId);
        stateByPartId.set(state.partId, localState
            ? { ...localState, ...state, judgement: localState.judgement }
            : state);
    });
    return Array.from(stateByPartId.values());
}
function mergeAssetPartConfigs(remoteParts, currentParts) {
    const partById = new Map(remoteParts.map((part) => [part.id, part]));
    currentParts.forEach((part) => {
        partById.set(part.id, part);
    });
    return Array.from(partById.values());
}
function syncAssetPartsWithAssetThresholds(parts, previousThresholds, nextThresholds) {
    let hasChanges = false;
    const nextParts = parts.map((part) => {
        if (!part.thresholds ||
            !areAssetThresholdsEqual(part.thresholds, previousThresholds)) {
            return part;
        }
        hasChanges = true;
        return {
            ...part,
            thresholds: { ...nextThresholds },
        };
    });
    return hasChanges ? nextParts : parts;
}
function applyAssetThresholdsToSnapshot(snapshot, thresholds) {
    if (!snapshot) {
        return snapshot;
    }
    return {
        ...snapshot,
        initialThresholds: thresholds,
        trend: thresholds
            ? applyAssetThresholdsToTrendSnapshot(snapshot.trend, thresholds)
            : snapshot.trend,
    };
}
function applyAssetThresholdsToTrendSnapshot(trend, thresholds) {
    if (!trend) {
        return trend;
    }
    return {
        ...trend,
        temperatureReferenceLines: syncThresholdReferenceLineValue(trend.temperatureReferenceLines, thresholds.temperature),
        ultrasonicReferenceLines: syncThresholdReferenceLineValue(trend.ultrasonicReferenceLines, thresholds.ultrasoundDb),
    };
}
function syncThresholdReferenceLineValue(referenceLines, value) {
    if (!referenceLines?.length) {
        return referenceLines;
    }
    const [thresholdLine, ...restLines] = referenceLines;
    return [
        {
            ...thresholdLine,
            value,
        },
        ...restLines,
    ];
}
function mergeAssetEvents(remoteEvents, liveEvents) {
    const eventById = new Map();
    [...remoteEvents, ...liveEvents].forEach((event) => {
        eventById.set(event.id, {
            ...event,
            globalAlert: event.globalAlert ?? event.grade !== "normal",
        });
    });
    return Array.from(eventById.values()).sort(compareEventsByTimeDesc);
}
function compareEventsByTimeDesc(firstEvent, secondEvent) {
    const firstTime = getEventTimeValue(firstEvent);
    const secondTime = getEventTimeValue(secondEvent);
    if (firstTime !== secondTime) {
        return secondTime - firstTime;
    }
    return eventGradeWeight[secondEvent.grade] - eventGradeWeight[firstEvent.grade];
}
function getEventTimeValue(event) {
    if (event.occurredAtIso) {
        return new Date(event.occurredAtIso).getTime();
    }
    const [hour = 0, minute = 0, second = 0] = event.occurredAt
        .split(":")
        .map(Number);
    return hour * 3600 + minute * 60 + second;
}
function getSupportedTrendRangeId(rangeId) {
    return assetTrendRanges.some((range) => range.id === rangeId)
        ? rangeId
        : undefined;
}
function toThresholdUpdatePayload(thresholds) {
    return {
        acoustic_critical_db: thresholds.ultrasoundCriticalDb ?? thresholds.ultrasoundDb,
        acoustic_warn_db: thresholds.ultrasoundDb,
        temperature_critical_c: thresholds.temperatureCritical ?? thresholds.temperature,
        temperature_warn_c: thresholds.temperature,
        updated_by: DEFAULT_FRONTEND_USER_ID,
    };
}
function areAssetThresholdsEqual(firstThresholds, secondThresholds) {
    if (firstThresholds === secondThresholds) {
        return true;
    }
    if (!firstThresholds || !secondThresholds) {
        return false;
    }
    return (firstThresholds.temperature === secondThresholds.temperature &&
        firstThresholds.temperatureCritical === secondThresholds.temperatureCritical &&
        firstThresholds.ultrasoundDb === secondThresholds.ultrasoundDb &&
        firstThresholds.ultrasoundCriticalDb ===
            secondThresholds.ultrasoundCriticalDb);
}
function isTemperaturePointSample(point) {
    return point !== null;
}
function isUltrasoundDetection(detection) {
    return detection !== null;
}
function buildAssetThresholdJudgement({ cautionMargin, assetThresholds, temperatureAverage, ultrasoundAverageDb, }) {
    return mergeJudgements([
        classifyByThreshold(temperatureAverage, assetThresholds.temperature, cautionMargin),
        classifyByThreshold(ultrasoundAverageDb, assetThresholds.ultrasoundDb, 6),
    ]);
}
function buildAssetPartStates(parts, sample) {
    const temperaturePoints = getTemperaturePoints(sample);
    return parts.map((part) => {
        if (part.source === "3d" && part.viewer3DTarget) {
            return buildViewer3DAssetPartState(part, sample);
        }
        const partTemperaturePoints = findPartTemperaturePoints(part, temperaturePoints);
        const partDetections = findPartUltrasoundDetections(part, sample.ultrasoundDetections);
        const temperatures = partTemperaturePoints.map((point) => point.temperature);
        const temperatureMax = temperatures.length ? Math.max(...temperatures) : 0;
        const temperatureAverage = roundOne(getAverage(temperatures));
        const maxDetection = partDetections.reduce((currentMax, detection) => !currentMax || detection.peakDb > currentMax.peakDb
            ? detection
            : currentMax, undefined);
        const ultrasoundPeakDb = maxDetection?.peakDb ?? 0;
        const temperatureJudgement = classifyByThreshold(temperatureMax, part.thresholds.temperature, sample.threshold.cautionMargin);
        const ultrasoundJudgement = classifyByThreshold(ultrasoundPeakDb, part.thresholds.ultrasoundDb, 6);
        return {
            partId: part.id,
            dominantFrequencyKHz: maxDetection?.dominantFrequencyKHz ?? 0,
            judgement: mergeJudgements([temperatureJudgement, ultrasoundJudgement]),
            temperatureAverage,
            temperatureMax,
            ultrasoundPeakDb,
        };
    });
}
function buildViewer3DAssetPartState(part, sample) {
    const temperaturePoints = getTemperaturePoints(sample);
    const ultrasoundDetections = sample.ultrasoundDetections;
    const averageTemperature = getAverage(temperaturePoints.map((point) => point.temperature));
    const maxTemperature = temperaturePoints.length
        ? Math.max(...temperaturePoints.map((point) => point.temperature))
        : 0;
    const maxUltrasoundDetection = ultrasoundDetections.reduce((currentMax, detection) => !currentMax || detection.peakDb > currentMax.peakDb
        ? detection
        : currentMax, undefined);
    const offset = getViewer3DAssetPartOffset(part);
    const temperatureAverage = roundOne(Math.max(0, averageTemperature || Math.max(part.thresholds.temperature - 5, 0)) + offset * 0.35);
    const temperatureMax = roundOne(Math.max(temperatureAverage, maxTemperature || temperatureAverage + 2.4) + Math.max(offset, 0));
    const ultrasoundPeakDb = roundOne(Math.max(0, maxUltrasoundDetection?.peakDb ||
        Math.max(part.thresholds.ultrasoundDb - 8, 0)) + Math.max(offset, 0));
    const dominantFrequencyKHz = roundOne(maxUltrasoundDetection?.dominantFrequencyKHz || 40 + offset);
    const temperatureJudgement = classifyByThreshold(temperatureMax, part.thresholds.temperature, sample.threshold.cautionMargin);
    const ultrasoundJudgement = classifyByThreshold(ultrasoundPeakDb, part.thresholds.ultrasoundDb, 6);
    return {
        dominantFrequencyKHz,
        judgement: mergeJudgements([temperatureJudgement, ultrasoundJudgement]),
        partId: part.id,
        temperatureAverage,
        temperatureMax,
        ultrasoundPeakDb,
    };
}
function getViewer3DAssetPartOffset(part) {
    const vector = part.viewer3DTarget?.worldPosition;
    if (!vector) {
        return 0;
    }
    return roundOne(Math.sin(vector.x * 7.17 + vector.y * 5.31 + vector.z * 3.19) *
        (part.viewer3DTarget?.kind === "area" ? 0.8 : 1.2));
}
function findPartTemperaturePoints(part, points) {
    if (part.mode === "area" && part.roi) {
        const { roi } = part;
        return points.filter((point) => isPointInsideRoi(point, roi));
    }
    if (part.mode === "points") {
        return points.filter((point) => isNearAnyFocusPoint(point, part.points));
    }
    return [];
}
function findPartUltrasoundDetections(part, detections) {
    if (part.mode === "area" && part.roi) {
        const { roi } = part;
        return detections.filter((detection) => isPointInsideRoi(detection, roi));
    }
    if (part.mode === "points") {
        return detections.filter((detection) => isNearAnyFocusPoint(detection, part.points));
    }
    return [];
}
function isPointInsideRoi(point, roi) {
    return (point.x >= roi.x &&
        point.x <= roi.x + roi.width &&
        point.y >= roi.y &&
        point.y <= roi.y + roi.height);
}
function isNearAnyFocusPoint(point, focusPoints) {
    return focusPoints.some((focusPoint) => {
        const distance = Math.hypot(point.x - focusPoint.x, point.y - focusPoint.y);
        return distance <= 7;
    });
}
function buildEmptyTrendData(range) {
    return Array.from({ length: range.points }, (_, index) => ({
        time: formatTrendLabel(range.id, index, range.points),
        average: 0,
        max: 0,
        min: 0,
        peakFrequency: 0,
        spread: 0,
    }));
}
function buildGlobalNotifications({ asset_id, displaySettings, events, location, site, sample, }) {
    const locationLabel = `${site.name} > ${location.name} > ${sample.asset.name}`;
    return events
        .filter((event) => event.globalAlert && event.grade !== "normal")
        .map((event) => ({
        asset_id,
        assetId: sample.asset.id,
        eventId: event.id,
        grade: event.grade === "abnormal" ? "danger" : "caution",
        href: sample.asset.href,
        id: `global-${event.id}`,
        location: locationLabel,
        message: event.message,
        occurredAt: formatCheckLabKoreanDateTime(event.occurredAtIso, displaySettings) ?? event.occurredAt,
        occurredAtIso: event.occurredAtIso,
        title: event.title,
    }));
}
function buildAssetEvents({ assetParts, assetPartStates, assetJudgement, assetThresholds, eventTick, requestCoordinateCount, sample, temperatureAverage, ultrasoundAverageDb, ultrasoundMax, }) {
    const nowLabel = formatClock(sample.asset.lastCollectedAt, eventTick * 5);
    const linkedPartAlerts = assetPartStates
        .map((partState) => ({
        part: assetParts.find((part) => part.id === partState.partId),
        partState,
    }))
        .filter(({ part, partState }) => part?.linkedAlarm && partState.judgement !== "normal");
    const events = [];
    if (assetThresholds) {
        const assetTemperatureGrade = getThresholdEventGrade(temperatureAverage, assetThresholds.temperature, sample.threshold.cautionMargin);
        const assetUltrasoundGrade = getThresholdEventGrade(ultrasoundAverageDb, assetThresholds.ultrasoundDb, 6);
        if (assetTemperatureGrade !== "normal") {
            events.push({
                globalAlert: true,
                id: `asset-${sample.asset.id}-temperature-threshold`,
                grade: assetTemperatureGrade,
                occurredAt: nowLabel,
                source: "asset-threshold",
                title: "설비 온도 임계 판정",
                message: `평균 ${temperatureAverage}℃ / 임계 ${assetThresholds.temperature}℃`,
            });
        }
        if (assetUltrasoundGrade !== "normal") {
            events.push({
                globalAlert: true,
                id: `asset-${sample.asset.id}-ultrasound-threshold`,
                grade: assetUltrasoundGrade,
                occurredAt: formatClock(sample.asset.lastCollectedAt, eventTick * 5 - 8),
                source: "asset-threshold",
                title: "설비 초음파 임계 판정",
                message: `평균 ${ultrasoundAverageDb} dB / 임계 ${assetThresholds.ultrasoundDb} dB · 피크 ${ultrasoundMax.peakDb} dB`,
            });
        }
    }
    if (requestCoordinateCount > 0) {
        events.push({
            id: `event-request-${eventTick}`,
            grade: "caution",
            occurredAt: formatClock(sample.asset.lastCollectedAt, eventTick * 5 - 14),
            source: "system",
            title: "백엔드 분석 요청",
            message: `변화 좌표 ${requestCoordinateCount}개를 초음파 분석 큐에 전달`,
        });
    }
    linkedPartAlerts.forEach(({ part, partState }, index) => {
        if (!part) {
            return;
        }
        events.push({
            globalAlert: true,
            id: `part-${part.id}-threshold`,
            grade: partState.judgement,
            occurredAt: formatClock(sample.asset.lastCollectedAt, eventTick * 5 - 18 - index * 4),
            source: "asset-part-threshold",
            title: "파트 임계 판정",
            message: `${part.name} ${judgementLabel[partState.judgement]} · 온도 ${partState.temperatureMax}℃ / ${part.thresholds.temperature}℃ · 초음파 ${partState.ultrasoundPeakDb} dB / ${part.thresholds.ultrasoundDb} dB`,
        });
    });
    if (assetJudgement !== "unconfigured" &&
        assetJudgement !== "normal") {
        events.push({
            id: `event-fft-${eventTick}`,
            grade: "caution",
            occurredAt: formatClock(sample.asset.lastCollectedAt, eventTick * 5 - 21),
            source: "system",
            title: "FFT 피크 갱신",
            message: `${ultrasoundMax.frequencyBandKHz} 구간에서 피크가 유지됩니다.`,
        });
    }
    return events;
}
function getTemperaturePoints(sample) {
    return sample.temperatureParts.flatMap((part) => part.points);
}
function getAverage(values) {
    if (!values.length) {
        return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function getLatestTrendPoint(points) {
    return points.at(-1);
}
function classifyByThreshold(value, threshold, cautionMargin) {
    if (value <= 0) {
        return "normal";
    }
    if (value >= threshold) {
        return "abnormal";
    }
    if (value >= threshold - cautionMargin) {
        return "caution";
    }
    return "normal";
}
function mergeJudgements(judgements) {
    if (judgements.includes("abnormal")) {
        return "abnormal";
    }
    if (judgements.includes("caution")) {
        return "caution";
    }
    return "normal";
}
function toDashboardStatus(judgement) {
    if (judgement === "abnormal") {
        return "danger";
    }
    if (judgement === "unconfigured") {
        return "normal";
    }
    return judgement;
}
function formatTrendLabel(rangeId, index, total) {
    const distance = total - index - 1;
    return formatRangeOffsetLabel(rangeId, distance, total);
}
function formatRangeOffsetLabel(rangeId, distance, total) {
    if (distance === 0) {
        return "현재";
    }
    const rangeMaxById = {
        "1m": 60,
        "1h": 60,
        "24h": 24,
        "7d": 7,
        "30d": 30,
    };
    const max = rangeMaxById[rangeId];
    const value = Math.round((max * distance) / Math.max(total - 1, 1));
    return `-${value}`;
}
function formatClock(baseTime, secondOffset) {
    const [hour = 0, minute = 0, second = 0] = baseTime.split(":").map(Number);
    const totalSeconds = hour * 3600 + minute * 60 + second + secondOffset;
    const normalizedSeconds = ((totalSeconds % 86400) + 86400) % 86400;
    const nextHour = Math.floor(normalizedSeconds / 3600);
    const nextMinute = Math.floor((normalizedSeconds % 3600) / 60);
    const nextSecond = normalizedSeconds % 60;
    return [nextHour, nextMinute, nextSecond]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
}
function getThresholdEventGrade(value, threshold, cautionMargin) {
    if (value <= 0) {
        return "normal";
    }
    if (value >= threshold) {
        return "abnormal";
    }
    return value >= threshold - cautionMargin ? "caution" : "normal";
}
function roundOne(value) {
    return Number(value.toFixed(1));
}
const judgementLabel = {
    unconfigured: "임계치 미설정",
    normal: "정상",
    caution: "요주의",
    abnormal: "이상",
};
const judgementClassName = {
    unconfigured: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    normal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    caution: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    abnormal: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
const assetStatusTitlePanelClassName = {
    unconfigured: "",
    normal: "",
    caution: "border-amber-500/45 bg-amber-500/10 shadow-[inset_0_1px_0_rgba(245,158,11,0.16),0_0_18px_rgba(245,158,11,0.12)]",
    abnormal: "border-red-500/45 bg-red-500/10 shadow-[inset_0_1px_0_rgba(239,68,68,0.16),0_0_20px_rgba(239,68,68,0.14)]",
};
const eventGradeLabel = {
    normal: "정상",
    caution: "주의",
    abnormal: "이상",
};
const eventGradeWeight = {
    normal: 1,
    caution: 2,
    abnormal: 3,
};
const eventGradeClassName = {
    normal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    caution: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    abnormal: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
