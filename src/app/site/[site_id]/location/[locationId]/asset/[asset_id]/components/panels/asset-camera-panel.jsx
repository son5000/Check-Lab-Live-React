"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, Box, Grid3X3, Maximize2, MousePointer2, Play, RotateCcw, SquareDashedMousePointer, Trash2, Upload, X, } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCheckLabKoreanTime } from "@/app/layouts/helpers/time-formatters";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";
import { MOCK_THERMAL_CAMERAS } from "@/lib/thermal-mapping";
import { DEFAULT_MODEL_3D_FILE, DEFAULT_VIEWER_3D_CONFIG, Three3DViewer, Viewer3DOptionBar, } from "./3d-viewer";
import { ThermalAssetViewerOptionContent } from "./3d-viewer/components/ThermalAssetViewerPanel";
import { CameraPositionControls } from "./3d-viewer/controls/CameraPositionControls";
import { CameraVisualizationControls } from "./3d-viewer/controls/CameraVisualizationControls";
import { ControlSection, SegmentedButton } from "./3d-viewer/controls/control-fields";
import { getCameraPreset } from "./3d-viewer/constants/cameraPresets";
import { getModelSourceName, normalizeModelTextures, withUpdatedTextureSlot, } from "./3d-viewer/utils/modelFileUtils";
import { areAssetThresholdsEqual, buildRoi, clampNumber, findAreaPointHit, findAreaRoiHit, findPointHit, getAverage, getPointDelta, getRelativePoint, isPointInsideRoi, movePoint, moveRoi, roundMetric, roundPercent, } from "./asset-camera-geometry";
const EMPTY_VIEWER_3D_MODEL_LABEL = "사용자 PLY 모델";
const VIEWER_3D_ANALYSIS_COLORS = [
    "#67e8f9",
    "#bef264",
    "#fbbf24",
    "#f0abfc",
    "#a5b4fc",
];
const PRESENTATION_CAMERA_IMAGE_URLS = [
    "/cam/cam_sample_1.PNG",
    "/cam/cam_sample_2.PNG",
    "/cam/cam_sample_3.PNG",
    "/cam/cam_sample_4.PNG",
    "/cam/cam_sample_5.PNG",
];
const PRESENTATION_INTEREST_AREA_IMAGES = [
    "/cam/cam_sample_3.PNG",
    "/cam/cam_sample_4.PNG",
];
const CAMERA_ASSET_PART_PREVIEW_SIZE = 480;
const CAMERA_AREA_PREVIEW_MARGIN_RATIO = 0.12;
const CAMERA_POINT_PREVIEW_RADIUS_PERCENT = 15;
function getViewer3DOverviewConfig(config) {
    return {
        ...config,
        autoRotate: DEFAULT_VIEWER_3D_CONFIG.autoRotate,
        camera: {
            ...DEFAULT_VIEWER_3D_CONFIG.camera,
            position: { ...DEFAULT_VIEWER_3D_CONFIG.camera.position },
            target: { ...DEFAULT_VIEWER_3D_CONFIG.camera.target },
        },
        cameraVisualization: {
            ...config.cameraVisualization,
            enabled: config.cameraVisualization?.enabled ?? true,
            selectedCameraId: null,
            showAll: true,
        },
    };
}
function getViewer3DConfigWithoutTransientOptions(config) {
    if (!config?.cameraVisualization?.requireSelection) {
        return config;
    }
    const cameraVisualization = { ...config.cameraVisualization };
    delete cameraVisualization.requireSelection;
    return {
        ...config,
        cameraVisualization,
    };
}
const defaultCameraFeeds = PRESENTATION_CAMERA_IMAGE_URLS.map((presentationImageUrl, index) => ({
    id: `cam-${index + 1}`,
    label: `CAM ${index + 1}`,
    name: `카메라 ${index + 1}`,
    presentationImageUrl,
    streamMessage: "임시 카메라 이미지",
    streamState: "presentation",
    streamUrl: null,
}));
const defaultPresentationInterestAreas = [
    {
        id: "presentation-interest-area-1",
        mode: "area",
        name: "임시 관심 영역 1",
        presentationImageUrl: PRESENTATION_INTEREST_AREA_IMAGES[0],
        presentationOnly: true,
    },
    {
        id: "presentation-interest-area-2",
        mode: "area",
        name: "임시 관심 영역 2",
        presentationImageUrl: PRESENTATION_INTEREST_AREA_IMAGES[1],
        presentationOnly: true,
    },
];
export function AssetCameraPanel({ activeCameraId, cameraFeeds = defaultCameraFeeds, defaultAssetThresholds, assetParts, assetPartStates = [], assetThresholds, selectedAssetPartId, cameraSetupRequestId = 0, onCreateAssetPart, onDeleteAssetPart, onSelectAssetPart, onUpdateAssetPart, onViewer3DConfigChange, onViewer3DModelFileChange, temperatureData = [], ultrasonicData = [], viewer3DConfig, viewer3DModelFile, }) {
    const { settings: displaySettings } = useDisplaySettings();
    const availableCameraFeeds = useMemo(() => buildPresentationCameraFeeds(cameraFeeds), [cameraFeeds]);
    const selectedCamera = useMemo(() => availableCameraFeeds.find((camera) => camera.id === activeCameraId) ??
        availableCameraFeeds[0], [activeCameraId, availableCameraFeeds]);
    const activeAssetThresholds = assetThresholds ?? defaultAssetThresholds;
    const cameraAssetParts = useMemo(() => assetParts.filter((part) => part.source !== "3d"), [assetParts]);
    const [draftName, setDraftName] = useState("단자부");
    const [selectionMode, setSelectionMode] = useState("area");
    const [cameraSetupMode, setCameraSetupMode] = useState();
    const [draftThresholds, setDraftThresholds] = useState(activeAssetThresholds);
    const [areDraftThresholdsDirty, setAreDraftThresholdsDirty] = useState(false);
    const [draftRoi, setDraftRoi] = useState();
    const [draftPoints, setDraftPoints] = useState([]);
    const [dragInteraction, setDragInteraction] = useState();
    const dragInteractionRef = useRef();
    const previousCameraSetupRequestIdRef = useRef(cameraSetupRequestId);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [canRenderPreviewPortal, setCanRenderPreviewPortal] = useState(false);
    const viewMode = "3d";
    const [viewer3DWorldRenderKey, setViewer3DWorldRenderKey] = useState(0);
    const [currentViewer3DConfig, setCurrentViewer3DConfig] = useState(viewer3DConfig ?? DEFAULT_VIEWER_3D_CONFIG);
    const [currentViewer3DModelFile, setCurrentViewer3DModelFile] = useState(viewer3DModelFile ?? null);
    const [viewer3DPanelTab, setViewer3DPanelTab] = useState("analysis");
    const [viewer3DAnalysisViewMode, setViewer3DAnalysisViewMode] = useState("viewer");
    const [viewer3DCameraSettingsType, setViewer3DCameraSettingsType] = useState("visual");
    const [viewer3DAnalysisMode, setViewer3DAnalysisMode] = useState();
    const [viewer3DAnalysisTargets, setViewer3DAnalysisTargets] = useState([]);
    const [selectedViewer3DAnalysisTargetId, setSelectedViewer3DAnalysisTargetId,] = useState();
    const viewer3DPreviewRef = useRef(null);
    const viewer3DThermalMaterialRecordsRef = useRef(new Map());
    const [isViewer3DThermalMeshPicking, setIsViewer3DThermalMeshPicking] = useState(false);
    const [viewer3DThermalMesh, setViewer3DThermalMesh] = useState(null);
    const [selectedViewer3DThermalCameraId, setSelectedViewer3DThermalCameraId] = useState(null);
    const [hoveredViewer3DThermalCameraId, setHoveredViewer3DThermalCameraId] = useState(null);
    const [selectedViewer3DThermalFramePreview, setSelectedViewer3DThermalFramePreview,] = useState(null);
    const canSave = Boolean(cameraSetupMode) &&
        draftName.trim().length > 0 &&
        (selectionMode === "area"
            ? Boolean(draftRoi && draftRoi.width >= 2 && draftRoi.height >= 2)
            : draftPoints.length > 0);
    const isDraggingRoi = dragInteraction?.type === "move-area-roi" ||
        dragInteraction?.type === "move-draft-roi";
    const readyViewer3DModelFile = hasCompleteViewer3DModelFile(currentViewer3DModelFile)
        ? currentViewer3DModelFile
        : null;
    const isViewer3DAnalysisEnabled =
        viewer3DPanelTab === "analysis" || viewer3DPanelTab === "thermal";
    const isViewer3DCameraSettingsThermal =
        viewer3DPanelTab === "camera-settings" &&
            viewer3DCameraSettingsType === "thermal";
    const isViewer3DThermalOverlayActive =
        viewer3DPanelTab === "thermal" || isViewer3DCameraSettingsThermal;
    const isViewer3DCameraSettingsVisual =
        viewer3DPanelTab === "camera-settings" &&
            viewer3DCameraSettingsType !== "thermal";
    const isViewer3DCameraSettingsCameraSelected =
        viewer3DPanelTab === "camera-settings" &&
            (viewer3DCameraSettingsType === "thermal"
                ? Boolean(selectedViewer3DThermalCameraId)
                : Boolean(currentViewer3DConfig.cameraVisualization?.selectedCameraId));
    const viewer3DPreviewConfig = useMemo(() => {
        if (!isViewer3DCameraSettingsVisual) {
            return currentViewer3DConfig;
        }
        return {
            ...currentViewer3DConfig,
            cameraVisualization: {
                ...(currentViewer3DConfig.cameraVisualization ?? {}),
                requireSelection: true,
                showAll: false,
            },
        };
    }, [currentViewer3DConfig, isViewer3DCameraSettingsVisual]);
    const viewer3DAnalysisItems = useMemo(() => viewer3DAnalysisTargets.map((target, index) => ({
        summary: buildViewer3DAnalysisSummary({
            assetParts,
            assetPartStates,
            defaultThresholds: activeAssetThresholds,
            index,
            target,
            temperatureData,
            ultrasonicData,
        }),
        target,
    })), [
        activeAssetThresholds,
        assetPartStates,
        assetParts,
        temperatureData,
        ultrasonicData,
        viewer3DAnalysisTargets,
    ]);
    const selectedViewer3DAnalysisItem = selectedViewer3DAnalysisTargetId
        ? viewer3DAnalysisItems.find((item) => item.target.id === selectedViewer3DAnalysisTargetId)
        : undefined;
    const selectedCameraAssetPart = selectedAssetPartId
        ? cameraAssetParts.find((part) => part.id === selectedAssetPartId)
        : undefined;
    const selectedCameraAssetPartState = selectedCameraAssetPart
        ? assetPartStates.find((partState) => partState.partId === selectedCameraAssetPart.id)
        : undefined;
    const isCameraSetupActive = viewMode === "camera" && isPreviewOpen && Boolean(cameraSetupMode);
    useEffect(() => {
        if (selectedAssetPartId &&
            viewer3DAnalysisTargets.some((target) => target.id === selectedAssetPartId)) {
            setSelectedViewer3DAnalysisTargetId(selectedAssetPartId);
        }
    }, [selectedAssetPartId, viewer3DAnalysisTargets]);
    useEffect(() => {
        setCanRenderPreviewPortal(true);
    }, []);
    useEffect(() => {
        if (viewer3DConfig) {
            setCurrentViewer3DConfig(viewer3DConfig);
        }
    }, [viewer3DConfig]);
    useEffect(() => {
        if (viewer3DModelFile) {
            setCurrentViewer3DModelFile(viewer3DModelFile);
        }
    }, [viewer3DModelFile]);
    useEffect(() => {
        setViewer3DThermalMesh(null);
        setSelectedViewer3DThermalFramePreview(null);
        setIsViewer3DThermalMeshPicking(false);
    }, [readyViewer3DModelFile]);
    useEffect(() => {
        if (!cameraSetupMode) {
            return;
        }
        if (areDraftThresholdsDirty) {
            return;
        }
        setDraftThresholds((currentThresholds) => areAssetThresholdsEqual(currentThresholds, activeAssetThresholds)
            ? currentThresholds
            : activeAssetThresholds);
    }, [
        activeAssetThresholds,
        areDraftThresholdsDirty,
        cameraSetupMode,
    ]);
    useEffect(() => {
        if (!isPreviewOpen) {
            setViewer3DPanelTab("analysis");
            setViewer3DAnalysisMode(undefined);
            setCameraSetupMode(undefined);
            resetDraft(activeAssetThresholds);
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                handlePreviewClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPreviewOpen]);
    useEffect(() => {
        if (!isViewer3DThermalOverlayActive) {
            setHoveredViewer3DThermalCameraId(null);
        }
    }, [isViewer3DThermalOverlayActive]);
    useEffect(() => {
        if (!isViewer3DCameraSettingsCameraSelected ||
            viewer3DAnalysisViewMode === "viewer") {
            return;
        }
        setViewer3DAnalysisViewMode("viewer");
    }, [isViewer3DCameraSettingsCameraSelected, viewer3DAnalysisViewMode]);
    useEffect(() => {
        if (previousCameraSetupRequestIdRef.current === cameraSetupRequestId) {
            return;
        }
        previousCameraSetupRequestIdRef.current = cameraSetupRequestId;
        if (!cameraSetupRequestId) {
            return;
        }
        dragInteractionRef.current = undefined;
        setDragInteraction(undefined);
        setViewer3DAnalysisMode(undefined);
        setIsPreviewOpen(true);
        setCameraSetupMode("area");
        setSelectionMode("area");
        setDraftThresholds(activeAssetThresholds);
        setAreDraftThresholdsDirty(false);
        setDraftRoi(undefined);
        setDraftPoints([]);
        onSelectAssetPart(undefined);
    }, [activeAssetThresholds, cameraSetupRequestId, onSelectAssetPart]);
    const startDragInteraction = (interaction) => {
        dragInteractionRef.current = interaction;
        setDragInteraction(interaction);
    };
    const clearDragInteraction = () => {
        dragInteractionRef.current = undefined;
        setDragInteraction(undefined);
    };
    const capturePointer = (event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const releasePointer = (event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };
    const handlePointerDown = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        const point = getRelativePoint(event);
        if (!isCameraSetupActive) {
            const hitPoint = findAreaPointHit(point, cameraAssetParts, selectedAssetPartId);
            if (hitPoint) {
                capturePointer(event);
                onSelectAssetPart(hitPoint.area.id);
                startDragInteraction({
                    partId: hitPoint.area.id,
                    pointId: hitPoint.point.id,
                    startPointer: point,
                    startPoint: hitPoint.point,
                    type: "move-area-point",
                });
                return;
            }
            const hitRoi = findAreaRoiHit(point, cameraAssetParts, selectedAssetPartId);
            if (hitRoi?.roi) {
                capturePointer(event);
                onSelectAssetPart(hitRoi.area.id);
                startDragInteraction({
                    partId: hitRoi.area.id,
                    startPointer: point,
                    startRoi: hitRoi.roi,
                    type: "move-area-roi",
                });
            }
            return;
        }
        if (selectionMode === "points") {
            const hitDraftPoint = findPointHit(point, draftPoints);
            if (hitDraftPoint) {
                capturePointer(event);
                startDragInteraction({
                    pointId: hitDraftPoint.id,
                    startPointer: point,
                    startPoint: hitDraftPoint,
                    type: "move-draft-point",
                });
                return;
            }
            setDraftPoints((currentPoints) => [
                ...currentPoints,
                {
                    id: `point-${Date.now()}`,
                    x: point.x,
                    y: point.y,
                },
            ].slice(-8));
            return;
        }
        capturePointer(event);
        if (draftRoi && isPointInsideRoi(point, draftRoi)) {
            startDragInteraction({
                startPointer: point,
                startRoi: draftRoi,
                type: "move-draft-roi",
            });
            return;
        }
        startDragInteraction({
            startPointer: point,
            type: "draw-roi",
        });
        setDraftRoi({
            height: 0,
            width: 0,
            x: point.x,
            y: point.y,
        });
    };
    const handlePointerMove = (event) => {
        const activeInteraction = dragInteractionRef.current;
        if (!activeInteraction) {
            return;
        }
        const point = getRelativePoint(event);
        const delta = getPointDelta(activeInteraction.startPointer, point);
        if (activeInteraction.type === "draw-roi") {
            setDraftRoi(buildRoi(activeInteraction.startPointer, point));
            return;
        }
        if (activeInteraction.type === "move-draft-roi") {
            setDraftRoi(moveRoi(activeInteraction.startRoi, delta));
            return;
        }
        if (activeInteraction.type === "move-draft-point") {
            setDraftPoints((currentPoints) => currentPoints.map((currentPoint) => currentPoint.id === activeInteraction.pointId
                ? {
                    ...currentPoint,
                    ...movePoint(activeInteraction.startPoint, delta),
                }
                : currentPoint));
            return;
        }
        const targetArea = cameraAssetParts.find((area) => area.id === activeInteraction.partId);
        if (!targetArea) {
            return;
        }
        if (activeInteraction.type === "move-area-roi") {
            onUpdateAssetPart({
                ...targetArea,
                roi: moveRoi(activeInteraction.startRoi, delta),
            });
            return;
        }
        onUpdateAssetPart({
            ...targetArea,
            points: targetArea.points.map((currentPoint) => currentPoint.id === activeInteraction.pointId
                ? {
                    ...currentPoint,
                    ...movePoint(activeInteraction.startPoint, delta),
                }
                : currentPoint),
        });
    };
    const handlePointerUp = (event) => {
        const activeInteraction = dragInteractionRef.current;
        if (!activeInteraction) {
            return;
        }
        if (activeInteraction.type === "draw-roi") {
            setDraftRoi(buildRoi(activeInteraction.startPointer, getRelativePoint(event)));
        }
        releasePointer(event);
        clearDragInteraction();
    };
    const handlePointerCancel = (event) => {
        releasePointer(event);
        clearDragInteraction();
    };
    const handleDraftThresholdChange = (nextThresholds) => {
        setAreDraftThresholdsDirty(true);
        setDraftThresholds(nextThresholds);
    };
    const handleViewer3DConfigChange = (nextConfig) => {
        const nextStableConfig = getViewer3DConfigWithoutTransientOptions(nextConfig);
        setCurrentViewer3DConfig(nextStableConfig);
        onViewer3DConfigChange?.(nextStableConfig);
    };
    const showViewer3DCameraLaserBeams =
        currentViewer3DConfig.cameraVisualization?.showLaserBeams !== false;
    const handleViewer3DCameraLaserToggle = (showLaserBeams) => {
        handleViewer3DConfigChange({
            ...currentViewer3DConfig,
            cameraVisualization: {
                ...(currentViewer3DConfig.cameraVisualization ?? {}),
                showLaserBeams,
            },
        });
    };
    const handleViewer3DAnalysisViewModeChange = (nextViewMode) => {
        if (isViewer3DCameraSettingsCameraSelected) {
            setViewer3DAnalysisViewMode("viewer");
            return;
        }
        setViewer3DAnalysisViewMode(nextViewMode);
    };
    const handleViewer3DPanelTabChange = (nextPanelTab) => {
        setViewer3DPanelTab(nextPanelTab);
        if (nextPanelTab === "thermal" && currentViewer3DConfig.autoRotate) {
            handleViewer3DConfigChange({
                ...currentViewer3DConfig,
                autoRotate: false,
            });
        }
    };
    function handlePreviewClose() {
        if (viewMode === "3d") {
            handleViewer3DConfigChange(getViewer3DOverviewConfig(currentViewer3DConfig));
        }
        setIsPreviewOpen(false);
    }
    const handleViewer3DWorldReset = () => {
        setViewer3DWorldRenderKey((currentKey) => currentKey + 1);
    };
    const handleViewer3DModelFileChange = (nextModelFile) => {
        setCurrentViewer3DModelFile(nextModelFile);
        onViewer3DModelFileChange?.(nextModelFile);
    };
    const handleViewer3DPlyFileChange = (file) => {
        const nextModelFile = {
            ...createViewer3DModelDraft(currentViewer3DModelFile),
            label: file.name,
            plyUrl: file,
        };
        setCurrentViewer3DModelFile(nextModelFile);
        if (hasCompleteViewer3DModelFile(nextModelFile)) {
            onViewer3DModelFileChange?.(nextModelFile);
        }
    };
    const handleViewer3DTextureFileChange = (file) => {
        const nextModelFile = withUpdatedTextureSlot(createViewer3DModelDraft(currentViewer3DModelFile), 0, file);
        setCurrentViewer3DModelFile(nextModelFile);
        if (hasCompleteViewer3DModelFile(nextModelFile)) {
            onViewer3DModelFileChange?.(nextModelFile);
        }
    };
    const handleUseSampleViewer3DModel = () => {
        handleViewer3DModelFileChange({
            ...DEFAULT_MODEL_3D_FILE,
            textures: DEFAULT_MODEL_3D_FILE.textures?.map((texture) => ({
                ...texture,
            })),
        });
    };
    const handleViewer3DAnalysisModeChange = (mode) => {
        setViewer3DAnalysisMode(mode);
    };
    const handleCameraSetupModeChange = (mode) => {
        setCameraSetupMode(mode);
        clearDragInteraction();
        if (!mode) {
            resetDraft(activeAssetThresholds);
            return;
        }
        setSelectionMode(mode);
        onSelectAssetPart(undefined);
        if (mode === "area") {
            setDraftPoints([]);
        }
        else {
            setDraftRoi(undefined);
        }
    };
    const handleViewer3DAnalysisTargetCreate = (draft) => {
        const nextIndex = viewer3DAnalysisTargets.length;
        const nextTarget = {
            ...draft,
            color: VIEWER_3D_ANALYSIS_COLORS[nextIndex % VIEWER_3D_ANALYSIS_COLORS.length],
            createdAt: new Date().toISOString(),
            id: `viewer-3d-analysis-${Date.now()}`,
            linkedAlarm: true,
            name: draft.kind === "area"
                ? `3D 영역 ${nextIndex + 1}`
                : `3D 포인트 ${nextIndex + 1}`,
            sensitivity: 75,
            thresholds: { ...activeAssetThresholds },
        };
        setViewer3DAnalysisTargets((currentTargets) => [
            ...currentTargets,
            nextTarget,
        ]);
        setSelectedViewer3DAnalysisTargetId(nextTarget.id);
        onCreateAssetPart(toAssetPartFromViewer3DAnalysisTarget(nextTarget));
    };
    const handleViewer3DAnalysisTargetUpdate = (nextTarget) => {
        setViewer3DAnalysisTargets((currentTargets) => currentTargets.map((currentTarget) => currentTarget.id === nextTarget.id ? nextTarget : currentTarget));
        setSelectedViewer3DAnalysisTargetId(nextTarget.id);
        onUpdateAssetPart(toAssetPartFromViewer3DAnalysisTarget(nextTarget));
    };
    const handleViewer3DAnalysisTargetSelect = (targetId) => {
        setSelectedViewer3DAnalysisTargetId(targetId);
        onSelectAssetPart(targetId);
    };
    const handleViewer3DAnalysisTargetDelete = (targetId) => {
        setViewer3DAnalysisTargets((currentTargets) => {
            const nextTargets = currentTargets.filter((currentTarget) => currentTarget.id !== targetId);
            if (selectedViewer3DAnalysisTargetId === targetId) {
                setSelectedViewer3DAnalysisTargetId(nextTargets.at(-1)?.id);
            }
            return nextTargets;
        });
        onDeleteAssetPart?.(targetId);
        if (selectedViewer3DAnalysisTargetId === targetId) {
            onSelectAssetPart(undefined);
        }
    };
    const handleSave = async () => {
        if (!canSave) {
            return;
        }
        const nextPart = {
            id: `interest-area-${Date.now()}`,
            linkedAlarm: true,
            mode: selectionMode,
            name: draftName.trim(),
            points: selectionMode === "points"
                ? draftPoints.map((point) => ({ ...point }))
                : [],
            roi: selectionMode === "area" && draftRoi ? { ...draftRoi } : undefined,
            source: "camera",
            thresholds: draftThresholds,
        };
        const preview = await captureCameraAssetPartPreview({
            imageUrl: selectedCamera.presentationImageUrl,
            mode: selectionMode,
            points: nextPart.points,
            roi: nextPart.roi,
        });
        onCreateAssetPart(preview
            ? {
                ...nextPart,
                previewCropRect: preview.cropRect,
                previewImageDataUrl: preview.dataUrl,
            }
            : nextPart);
        setCameraSetupMode(undefined);
        resetDraft(activeAssetThresholds);
    };
    const handleCancel = () => {
        setCameraSetupMode(undefined);
        resetDraft(activeAssetThresholds);
    };
    const handleCameraAssetPartSelect = (partId) => {
        setCameraSetupMode(undefined);
        resetDraft(activeAssetThresholds);
        onSelectAssetPart(partId);
    };
    const isViewer3DAutoRotateActive = currentViewer3DConfig.autoRotate ?? DEFAULT_VIEWER_3D_CONFIG.autoRotate;
    const handleViewer3DAutoRotateToggle = () => {
        handleViewer3DConfigChange({
            ...currentViewer3DConfig,
            autoRotate: !isViewer3DAutoRotateActive,
        });
    };
    return (<section className="AssetCameraPanel AssetCameraPanel__section-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-1 text-card-foreground">
      <div className="AssetCameraPanel AssetCameraPanel__container-1 mb-1 flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5">
        <div className="AssetCameraPanel AssetCameraPanel__container-2 flex min-w-0 items-center gap-2">
          <span className="AssetCameraPanel AssetCameraPanel__viewer-icon-1 grid h-7 w-7 shrink-0 place-items-center rounded-sm border border-cyan-200/30 bg-cyan-300/10 text-cyan-500">
            <Box className="AssetCameraPanel AssetCameraPanel__icon-1 h-3.5 w-3.5" aria-hidden="true"/>
          </span>
          <div className="AssetCameraPanel AssetCameraPanel__viewer-title-wrap-1 min-w-0">
            <p className="AssetCameraPanel AssetCameraPanel__viewer-title-1 truncate text-xs font-semibold text-foreground">
              3D 월드 뷰어
            </p>
            <p className="AssetCameraPanel AssetCameraPanel__viewer-subtitle-1 truncate text-[10px] font-semibold text-muted-foreground">
              {readyViewer3DModelFile ? "PLY 모델 연결됨" : "PLY 모델 업로드 필요"}
            </p>
          </div>
        </div>
        <div className="AssetCameraPanel AssetCameraPanel__viewer-actions-1 flex shrink-0 items-center gap-1">
          <Viewer3DAutoRotateToggle active={isViewer3DAutoRotateActive} disabled={!readyViewer3DModelFile} onClick={handleViewer3DAutoRotateToggle}/>
          <button type="button" className="AssetCameraPanel AssetCameraPanel__world-reset-1 grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45" disabled={!readyViewer3DModelFile} onClick={handleViewer3DWorldReset} title="월드만 초기화" aria-label="월드만 초기화">
            <RotateCcw className="AssetCameraPanel AssetCameraPanel__icon-5 h-3.5 w-3.5" aria-hidden="true"/>
          </button>
          <button type="button" className="AssetCameraPanel AssetCameraPanel__preview-button-1 grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45" disabled={!readyViewer3DModelFile} onClick={() => setIsPreviewOpen(true)} title="3D 크게 보기" aria-label="3D 크게 보기">
            <Maximize2 className="AssetCameraPanel AssetCameraPanel__icon-2 h-3.5 w-3.5" aria-hidden="true"/>
          </button>
        </div>
      </div>
      <div className={cn("AssetCameraPanel AssetCameraPanel__container-5 relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden rounded-md border border-border bg-neutral-950/85", viewMode === "camera" &&
            isCameraSetupActive &&
            "cursor-crosshair border-primary/70", viewMode === "camera" && isDraggingRoi && "cursor-move")} onPointerDown={viewMode === "camera" ? handlePointerDown : undefined} onPointerMove={viewMode === "camera" ? handlePointerMove : undefined} onPointerCancel={viewMode === "camera" ? handlePointerCancel : undefined} onPointerUp={viewMode === "camera" ? handlePointerUp : undefined}>
          {viewMode === "3d" ? (<>
              {readyViewer3DModelFile ? (<Three3DViewer key={`dashboard-${viewer3DWorldRenderKey}`} allowOptionBar={false} className="AssetCameraPanel AssetCameraPanel__viewer-1 h-full w-full rounded-none border-0" config={currentViewer3DConfig} modelFile={readyViewer3DModelFile} showCameraOverlays={false} onConfigChange={handleViewer3DConfigChange} onModelFileChange={handleViewer3DModelFileChange}/>) : (<Viewer3DModelUploadPanel modelFile={currentViewer3DModelFile} onPlyFileChange={handleViewer3DPlyFileChange} onTextureFileChange={handleViewer3DTextureFileChange} onUseSample={handleUseSampleViewer3DModel}/>)}
            </>) : (<>
              <div className="AssetCameraPanel AssetCameraPanel__container-7 absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:34px_34px]"/>
              <CameraViewport focused={selectedCamera.id !== "default"} imageUrl={selectedCamera.presentationImageUrl} streamMessage={selectedCamera.streamMessage} streamState={selectedCamera.streamState} streamUrl={selectedCamera.streamUrl} onOpenPreview={() => setIsPreviewOpen(true)}>
                <DetectionOverlays parts={cameraAssetParts} draftPoints={draftPoints} draftRoi={draftRoi} isDraftVisible={isCameraSetupActive} selectedPartId={selectedAssetPartId}/>
              </CameraViewport>
            </>)}
      </div>

      {isPreviewOpen && canRenderPreviewPortal
            ? createPortal(<div className="AssetCameraPanel AssetCameraPanel__container-15 fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={viewMode === "3d" ? "3D 크게 보기" : "캠 크게 보기"} onClick={handlePreviewClose}>
              <div className="AssetCameraPanel AssetCameraPanel__container-16 flex h-[min(92dvh,56rem)] max-h-[calc(100dvh-2rem)] w-[min(98dvw,104rem)] max-w-[calc(100dvw-2rem)] min-w-0 flex-col overflow-hidden rounded-md border border-white/15 bg-neutral-950 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="AssetCameraPanel AssetCameraPanel__container-17 flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/15 px-3">
                  <div className="AssetCameraPanel AssetCameraPanel__container-18 flex min-w-0 items-center gap-2">
                    {viewMode === "3d" ? (<Box className="AssetCameraPanel AssetCameraPanel__icon-3 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true"/>) : (<Camera className="AssetCameraPanel AssetCameraPanel__icon-3 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true"/>)}
                    <p className="AssetCameraPanel AssetCameraPanel__text-3 truncate text-sm font-semibold">
                      {viewMode === "3d"
                    ? "3D 월드 · PLY 뷰어"
                    : `${selectedCamera.label} · ${selectedCamera.name}`}
                    </p>
                  </div>
                  <div className="AssetCameraPanel AssetCameraPanel__preview-actions-1 flex shrink-0 items-center gap-1">
                    {viewMode === "3d" ? (<>
                        <Viewer3DHeaderSharedSettingsControls analysisViewMode={viewer3DAnalysisViewMode} showCameraLaserBeams={showViewer3DCameraLaserBeams} onAnalysisViewModeChange={handleViewer3DAnalysisViewModeChange} onCameraLaserToggle={handleViewer3DCameraLaserToggle}/>
                        <Viewer3DAutoRotateToggle active={isViewer3DAutoRotateActive} disabled={!readyViewer3DModelFile} onClick={handleViewer3DAutoRotateToggle}/>
                        <button type="button" className="AssetCameraPanel AssetCameraPanel__preview-world-reset-1 grid h-7 w-7 place-items-center rounded-md border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!readyViewer3DModelFile} onClick={handleViewer3DWorldReset} title="월드만 초기화" aria-label="월드만 초기화">
                          <RotateCcw className="AssetCameraPanel AssetCameraPanel__icon-5 h-3.5 w-3.5" aria-hidden="true"/>
                        </button>
                      </>) : null}
                    <button type="button" className="AssetCameraPanel AssetCameraPanel__button-2 grid h-7 w-7 place-items-center rounded-md border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white" onClick={handlePreviewClose} title="닫기">
                      <X className="AssetCameraPanel AssetCameraPanel__icon-4 h-3.5 w-3.5" aria-hidden="true"/>
                    </button>
                  </div>
                </div>
                {viewMode === "3d" ? (<div className="AssetCameraPanel AssetCameraPanel__container-19 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_16rem] gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:grid-rows-[minmax(0,1fr)]">
                    <div className="AssetCameraPanel AssetCameraPanel__viewer-wrap-1 h-full min-h-0 min-w-0">
                      {readyViewer3DModelFile ? (<Three3DViewer ref={viewer3DPreviewRef} key={`preview-${viewer3DWorldRenderKey}`} activeAnalysisMode={isViewer3DAnalysisEnabled ? viewer3DAnalysisMode : undefined} allowOptionBar={false} analysisSummary={isViewer3DAnalysisEnabled ? selectedViewer3DAnalysisItem?.summary : undefined} analysisTargets={isViewer3DAnalysisEnabled ? viewer3DAnalysisTargets : []} analysisViewMode={viewer3DPanelTab === "analysis" || viewer3DPanelTab === "camera-settings" ? viewer3DAnalysisViewMode : "viewer"} className="AssetCameraPanel AssetCameraPanel__viewer-1 h-full" config={viewer3DPreviewConfig} hideCameraVisualization={isViewer3DThermalOverlayActive} isThermalMeshPicking={isViewer3DThermalMeshPicking} modelFile={readyViewer3DModelFile} selectedAnalysisTargetId={isViewer3DAnalysisEnabled ? selectedViewer3DAnalysisTargetId : undefined} thermalCameraOverlay={isViewer3DThermalOverlayActive
                            ? {
                                cameras: MOCK_THERMAL_CAMERAS,
                                selectedFramePreview: selectedViewer3DThermalFramePreview,
                                selectedCameraId: selectedViewer3DThermalCameraId,
                                hoveredCameraId: hoveredViewer3DThermalCameraId,
                                requireSelection: isViewer3DCameraSettingsThermal,
                                onCameraHover: setHoveredViewer3DThermalCameraId,
                                onCameraSelect: setSelectedViewer3DThermalCameraId,
                            }
                            : undefined} onAnalysisModeChange={isViewer3DAnalysisEnabled ? handleViewer3DAnalysisModeChange : undefined} onAnalysisTargetCreate={isViewer3DAnalysisEnabled ? handleViewer3DAnalysisTargetCreate : undefined} onAnalysisTargetDelete={isViewer3DAnalysisEnabled ? handleViewer3DAnalysisTargetDelete : undefined} onAnalysisTargetSelect={isViewer3DAnalysisEnabled ? handleViewer3DAnalysisTargetSelect : undefined} onAnalysisTargetUpdate={isViewer3DAnalysisEnabled ? handleViewer3DAnalysisTargetUpdate : undefined} onConfigChange={handleViewer3DConfigChange} onModelFileChange={handleViewer3DModelFileChange} onThermalMeshPicked={(mesh) => { setViewer3DThermalMesh(mesh); setIsViewer3DThermalMeshPicking(false); }}/>) : (<Viewer3DModelUploadPanel modelFile={currentViewer3DModelFile} onPlyFileChange={handleViewer3DPlyFileChange} onTextureFileChange={handleViewer3DTextureFileChange} onUseSample={handleUseSampleViewer3DModel}/>)}
                    </div>

                    <Viewer3DAnalysisPanel activeMode={viewer3DAnalysisMode} activePanelTab={viewer3DPanelTab} analysisViewMode={viewer3DAnalysisViewMode} cameraSettingsType={viewer3DCameraSettingsType} config={currentViewer3DConfig} displaySettings={displaySettings} hoveredThermalCameraId={hoveredViewer3DThermalCameraId} isThermalMeshPicking={isViewer3DThermalMeshPicking} items={viewer3DAnalysisItems} modelFile={currentViewer3DModelFile ?? createViewer3DModelDraft()} selectedItem={selectedViewer3DAnalysisItem} selectedTargetId={selectedViewer3DAnalysisTargetId} selectedThermalCameraId={selectedViewer3DThermalCameraId} thermalMaterialRecordsRef={viewer3DThermalMaterialRecordsRef} thermalMesh={viewer3DThermalMesh} viewerRef={viewer3DPreviewRef} onAnalysisViewModeChange={handleViewer3DAnalysisViewModeChange} onCameraSettingsTypeChange={setViewer3DCameraSettingsType} onConfigChange={handleViewer3DConfigChange} onDelete={handleViewer3DAnalysisTargetDelete} onModelFileChange={handleViewer3DModelFileChange} onPanelTabChange={handleViewer3DPanelTabChange} onSelect={handleViewer3DAnalysisTargetSelect} onThermalCameraHover={setHoveredViewer3DThermalCameraId} onThermalCameraSelect={setSelectedViewer3DThermalCameraId} onThermalFramePreviewChange={setSelectedViewer3DThermalFramePreview} onThermalMeshPickStart={() => setIsViewer3DThermalMeshPicking((isPicking) => !isPicking)} onUpdate={handleViewer3DAnalysisTargetUpdate} onItemCameraFocus={(cameraId) => { if (cameraId) viewer3DPreviewRef.current?.switchToCamera(cameraId); }}/>
                  </div>) : (<div className="AssetCameraPanel AssetCameraPanel__container-19 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_16rem] gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:grid-rows-[minmax(0,1fr)]">
                    <div className="AssetCameraPanel AssetCameraPanel__camera-preview-wrap-1 grid min-h-0 min-w-0 place-items-center overflow-hidden rounded-md border border-cyan-200/25 bg-neutral-950/90 p-2 [container-type:size]">
                      <div className={cn("AssetCameraPanel AssetCameraPanel__container-20 relative h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] touch-none overflow-hidden rounded-md border border-cyan-200/25 bg-neutral-950 shadow-[0_0_42px_rgba(34,211,238,0.2)]", isCameraSetupActive &&
                        "cursor-crosshair border-primary/70", isDraggingRoi && "cursor-move")} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerCancel={handlePointerCancel} onPointerUp={handlePointerUp}>
                        <div className="AssetCameraPanel AssetCameraPanel__container-21 absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:34px_34px]"/>
                        <CameraViewport focused={selectedCamera.id !== "default"} imageUrl={selectedCamera.presentationImageUrl} streamMessage={selectedCamera.streamMessage} streamState={selectedCamera.streamState} streamUrl={selectedCamera.streamUrl}>
                          <DetectionOverlays parts={cameraAssetParts} draftPoints={draftPoints} draftRoi={draftRoi} isDraftVisible={isCameraSetupActive} selectedPartId={selectedAssetPartId}/>
                        </CameraViewport>
                      </div>
                    </div>

                    <CameraInterestAreaPanel activeMode={cameraSetupMode} canSave={canSave} draftName={draftName} draftPoints={draftPoints} draftRoi={draftRoi} draftThresholds={draftThresholds} items={cameraAssetParts} partStates={assetPartStates} selectedPart={selectedCameraAssetPart} selectedPartState={selectedCameraAssetPartState} selectedPartId={selectedAssetPartId} selectionMode={selectionMode} onCancelDraft={handleCancel} onDelete={onDeleteAssetPart} onDraftNameChange={setDraftName} onDraftThresholdChange={handleDraftThresholdChange} onModeChange={handleCameraSetupModeChange} onSave={handleSave} onSelect={handleCameraAssetPartSelect} onUpdate={onUpdateAssetPart}/>
                  </div>)}
              </div>
            </div>, document.body)
            : null}
    </section>);
    function resetDraft(thresholds) {
        setDraftName("단자부");
        setDraftThresholds(thresholds);
        setAreDraftThresholdsDirty(false);
        setDraftRoi(undefined);
        setDraftPoints([]);
        clearDragInteraction();
        setSelectionMode("area");
    }
}
function Viewer3DModelUploadPanel({ modelFile, onPlyFileChange, onTextureFileChange, onUseSample, }) {
    const textureSource = getPrimaryTextureSource(modelFile);
    return (<div className="Viewer3DModelUploadPanel Viewer3DModelUploadPanel__root-1 relative grid h-full min-h-0 w-full place-items-center overflow-hidden bg-neutral-950 px-2 pb-2 pt-11 text-white">
      <button type="button" className="Viewer3DModelUploadPanel Viewer3DModelUploadPanel__sample-button-1 absolute right-2 top-2 z-20 inline-flex h-7 max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md border border-cyan-200/35 bg-cyan-300/15 px-2 text-[11px] font-semibold text-cyan-50 backdrop-blur transition hover:bg-cyan-300/25" onClick={onUseSample} title="샘플 모델 생성하기">
        <Box className="Viewer3DModelUploadPanel Viewer3DModelUploadPanel__icon-1 h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
        <span className="Viewer3DModelUploadPanel Viewer3DModelUploadPanel__sample-label-1 min-w-0 truncate">
          샘플 모델 생성하기
        </span>
      </button>

      <div className="Viewer3DModelUploadPanel Viewer3DModelUploadPanel__form-1 grid w-full max-w-[19rem] gap-1.5">
        <Viewer3DFilePicker accept=".ply" label="PLY 모델" name={getModelSourceName(modelFile?.plyUrl)} onFile={onPlyFileChange}/>
        <Viewer3DFilePicker accept="image/png,.png" label="PNG 텍스처" name={getModelSourceName(textureSource)} onFile={onTextureFileChange}/>
      </div>
    </div>);
}
function Viewer3DFilePicker({ accept, label, name, onFile, }) {
    return (<label className="Viewer3DFilePicker Viewer3DFilePicker__field-1 grid min-w-0 cursor-pointer">
      <span className="Viewer3DFilePicker Viewer3DFilePicker__button-1 flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-dashed border-white/25 bg-white/10 px-2 text-xs font-semibold text-white transition hover:border-cyan-200/70 hover:bg-white/15">
        <Upload className="Viewer3DFilePicker Viewer3DFilePicker__icon-1 h-3.5 w-3.5 shrink-0 text-cyan-100" aria-hidden="true"/>
        <span className="Viewer3DFilePicker Viewer3DFilePicker__label-1 shrink-0 text-[10px] font-semibold text-white/70">
          {label}
        </span>
        <span className="Viewer3DFilePicker Viewer3DFilePicker__name-1 min-w-0 truncate">
          {name}
        </span>
      </span>
      <input accept={accept} className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
                onFile(file);
            }
            event.target.value = "";
        }} type="file"/>
    </label>);
}
function Viewer3DAutoRotateToggle({ active, disabled, onClick, }) {
    return (<button type="button" className="Viewer3DAutoRotateToggle Viewer3DAutoRotateToggle__button-1 inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45" disabled={disabled} onClick={onClick} title="자동 회전" aria-label="자동 회전" aria-pressed={active}>
      <Play className={cn("Viewer3DAutoRotateToggle Viewer3DAutoRotateToggle__icon-1 h-3.5 w-3.5 shrink-0", active && "fill-cyan-300 text-cyan-500 dark:text-cyan-300")} aria-hidden="true"/>
      <span className={cn("Viewer3DAutoRotateToggle Viewer3DAutoRotateToggle__track-1 relative h-4 w-8 rounded-full border transition-colors", active
        ? "border-cyan-300/70 bg-cyan-300/25 dark:border-cyan-300/70 dark:bg-cyan-300/20"
        : "border-border bg-muted dark:bg-zinc-800")}>
        <span className={cn("Viewer3DAutoRotateToggle Viewer3DAutoRotateToggle__thumb-1 absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full shadow-sm transition-transform", active
        ? "translate-x-4 bg-cyan-300"
        : "translate-x-0 bg-muted-foreground/80 dark:bg-zinc-300")}/>
      </span>
    </button>);
}
function Viewer3DAnalysisPanel({ activeMode, activePanelTab = "analysis", analysisViewMode = "viewer", cameraSettingsType = "visual", config, displaySettings, hoveredThermalCameraId, isThermalMeshPicking, items, modelFile, onAnalysisViewModeChange, onCameraSettingsTypeChange, onConfigChange, onDelete, onModelFileChange, onPanelTabChange, onSelect, onThermalCameraHover, onThermalCameraSelect, onThermalFramePreviewChange, onThermalMeshPickStart, onUpdate, selectedItem, selectedTargetId, selectedThermalCameraId, thermalMaterialRecordsRef, thermalMesh, viewerRef, onItemCameraFocus, }) {
    const selectedTarget = selectedItem?.target;
    const selectedSummary = selectedItem?.summary;
    const selectedCamera = config.cameraVisualization?.selectedCameraId
        ? getCameraPreset(config.cameraVisualization.selectedCameraId)
        : undefined;
    const cameraVisualizationConfig = config.cameraVisualization ?? {};
    const showCameraLaserBeams = cameraVisualizationConfig.showLaserBeams !== false;
    const handleCameraVisualizationChange = (cameraVisualization) => {
        onConfigChange({ ...config, cameraVisualization });
    };
    const handleCameraLaserToggle = (showLaserBeams) => {
        handleCameraVisualizationChange({
            ...cameraVisualizationConfig,
            showLaserBeams,
        });
    };
    const thermalTargetObject = thermalMesh ?? viewerRef?.current?.getThermalModel?.();
    const thermalTargetLabel = thermalMesh
        ? getViewer3DThermalMeshLabel(thermalMesh)
        : getViewer3DThermalModelLabel(modelFile);
    const thermalAlignmentStorageKey = `checklab:asset-3d-viewer:${getViewer3DThermalStorageKey(modelFile)}:thermal-alignment:v1`;
    const handleResetCameraView = () => {
        onConfigChange(getViewer3DOverviewConfig(config));
    };
    return (<aside className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__aside-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground">
      <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__tabs-1 mb-2 grid shrink-0 grid-cols-4 gap-1 rounded-md border border-border bg-background p-1" role="tablist" aria-label="3D 패널">
        <PanelTabButton active={activePanelTab === "analysis"} label="실화상" onClick={() => onPanelTabChange?.("analysis")}/>
        <PanelTabButton active={activePanelTab === "thermal"} label="열화상" onClick={() => onPanelTabChange?.("thermal")}/>
        <PanelTabButton active={activePanelTab === "camera-settings"} label="카메라 설정" onClick={() => onPanelTabChange?.("camera-settings")}/>
        <PanelTabButton active={activePanelTab === "world-settings"} label="월드 설정" onClick={() => onPanelTabChange?.("world-settings")}/>
      </div>
      {activePanelTab === "analysis" ? (<div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__stack-1 grid min-h-0 gap-2 overflow-y-auto pr-1">
        <ControlSection icon={SquareDashedMousePointer} title="분석 상태">
          <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__status-1 grid grid-cols-2 gap-1.5">
            <DetectionSetupStatusRow label="대상" value={`${items.length}개`}/>
            <DetectionSetupStatusRow label="모드" value={activeMode === "area" ? "영역" : activeMode === "point" ? "포인트" : "탐색"}/>
          </div>
        </ControlSection>

        <ControlSection icon={Box} title="대상 목록">
          <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__list-1 grid gap-1.5">
            {items.length ? (items.map((item) => (<div key={item.target.id} role="button" tabIndex={0} className={cn("Viewer3DAnalysisPanel Viewer3DAnalysisPanel__item-1 grid min-w-0 cursor-pointer gap-1 rounded-md border bg-card px-2 py-2 text-left transition hover:bg-accent", item.target.id === selectedTargetId
                ? "border-primary"
                : "border-border")} onClick={() => { onSelect(item.target.id); onItemCameraFocus?.(item.target.cameraId); }} onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                    return;
                }
                event.preventDefault();
                onSelect(item.target.id);
                onItemCameraFocus?.(item.target.cameraId);
            }} style={{
                borderColor: item.target.id === selectedTargetId
                    ? item.target.color
                    : undefined,
            }}>
                  <span className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__item-title-1 flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold">
                      {item.target.name}
                    </span>
                    <button type="button" className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__item-delete-1 grid h-5 w-5 shrink-0 place-items-center rounded-sm border border-destructive/70 bg-background text-destructive transition hover:border-destructive hover:bg-destructive/10" onClick={(event) => {
                event.stopPropagation();
                onDelete(item.target.id);
            }} title="삭제" aria-label={`${item.target.name} 삭제`}>
                      <Trash2 className="h-3 w-3" aria-hidden="true"/>
                    </button>
                  </span>
                  <span className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__item-value-1 truncate font-mono text-[11px] text-muted-foreground">
                    최고 {item.summary.temperatureMax}℃ · Peak{" "}
                    {item.summary.ultrasoundPeakDb} dB
                  </span>
                </div>))) : (<div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__empty-1 rounded-md border border-dashed border-border bg-background px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground">
                분석 대상 없음
              </div>)}
          </div>
        </ControlSection>

        {selectedTarget ? (<ControlSection icon={MousePointer2} title="대상 설정">
            <label className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__field-1 grid min-w-0 gap-1">
              <span className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__label-1 text-[10px] font-semibold text-muted-foreground">
                이름
              </span>
              <input className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__input-1 h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs font-semibold outline-none focus:border-primary" value={selectedTarget.name} onChange={(event) => onUpdate({ ...selectedTarget, name: event.target.value })}/>
            </label>

            <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__thresholds-1 grid grid-cols-2 gap-1.5">
              <ThresholdField label="온도" suffix="℃" value={selectedTarget.thresholds.temperature} onChange={(temperature) => onUpdate({
                ...selectedTarget,
                thresholds: {
                    ...selectedTarget.thresholds,
                    temperature,
                },
            })}/>
              <ThresholdField label="초음파" suffix="dB" value={selectedTarget.thresholds.ultrasoundDb} onChange={(ultrasoundDb) => onUpdate({
                ...selectedTarget,
                thresholds: {
                    ...selectedTarget.thresholds,
                    ultrasoundDb,
                },
            })}/>
            </div>

            <label className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__range-1 grid gap-1">
              <span className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__range-label-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
                <span className="truncate">민감도</span>
                <span className="shrink-0 font-mono text-foreground">
                  {selectedTarget.sensitivity}%
                </span>
              </span>
              <input className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__range-input-1 h-2 w-full accent-primary" max={100} min={10} onChange={(event) => onUpdate({
                ...selectedTarget,
                sensitivity: Number(event.target.value),
            })} step={5} type="range" value={selectedTarget.sensitivity}/>
            </label>

            <label className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__check-1 flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
              <span className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__check-label-1 truncate text-[11px] font-semibold text-muted-foreground">
                알림 연동
              </span>
              <input checked={selectedTarget.linkedAlarm} className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__check-input-1 h-4 w-4 shrink-0 accent-primary" onChange={(event) => onUpdate({
                ...selectedTarget,
                linkedAlarm: event.target.checked,
            })} type="checkbox"/>
            </label>

            <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__setting-status-1 grid gap-1.5">
              <DetectionSetupStatusRow label="좌표" value={formatViewer3DTargetPosition(selectedTarget)}/>
              <DetectionSetupStatusRow label="등록 시각" value={formatCreatedTime(selectedTarget.createdAt, displaySettings)}/>
            </div>

          </ControlSection>) : null}

        {selectedSummary ? (<ControlSection icon={Box} title="측정값">
            <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__metrics-1 grid gap-1.5">
              <DetectionSetupStatusRow label="최고온도" value={`${selectedSummary.temperatureMax}℃`}/>
              <DetectionSetupStatusRow label="평균온도" value={`${selectedSummary.temperatureAverage}℃`}/>
              <DetectionSetupStatusRow label="최저온도" value={`${selectedSummary.temperatureMin}℃`}/>
              <DetectionSetupStatusRow label="검출 dB" value={`${selectedSummary.ultrasoundDetectedDb} dB`}/>
              <DetectionSetupStatusRow label="Peak" value={`${selectedSummary.ultrasoundPeakDb} dB · ${selectedSummary.dominantFrequencyKHz} kHz`}/>
              <DetectionSetupStatusRow label="추이" value={selectedSummary.trendLabel}/>
            </div>
          </ControlSection>) : null}
      </div>) : activePanelTab === "thermal" ? (<Viewer3DOptionBar className="h-full flex-1 border-0 bg-transparent p-0 md:border-0" config={config} modelFile={modelFile} onConfigChange={onConfigChange} onModelFileChange={onModelFileChange}>
        <ThermalAssetViewerOptionContent captureTargetRef={viewerRef?.current?.getThermalRenderer?.()} hoveredCameraId={hoveredThermalCameraId} isPickingMesh={isThermalMeshPicking} materialRecordsRef={thermalMaterialRecordsRef} projectionCamera={viewerRef?.current?.getThermalCamera?.()} projectionRenderer={viewerRef?.current?.getThermalRenderer?.()} projectionScene={viewerRef?.current?.getThermalScene?.()} selectedCameraId={selectedThermalCameraId} selectedTargetLabel={thermalTargetLabel} selectedTargetObject={thermalTargetObject} showLaserGuide={showCameraLaserBeams} storageKey={thermalAlignmentStorageKey} viewMode={analysisViewMode} viewerRef={viewerRef} worldOverlayHost={viewerRef?.current?.getThermalStageElement?.()} onCameraHover={onThermalCameraHover} onPickMesh={onThermalMeshPickStart} onSelectedCameraChange={onThermalCameraSelect} onSelectedFramePreviewChange={onThermalFramePreviewChange} onShowLaserGuideChange={handleCameraLaserToggle} onViewModeChange={onAnalysisViewModeChange}/>
      </Viewer3DOptionBar>) : activePanelTab === "camera-settings" ? (<Viewer3DOptionBar className="h-full flex-1 border-0 bg-transparent p-0 md:border-0" config={config} modelFile={modelFile} onConfigChange={onConfigChange} onModelFileChange={onModelFileChange}>
        <Viewer3DCameraSettingsControls analysisViewMode={analysisViewMode} cameraSettingsType={cameraSettingsType} cameraVisualizationConfig={cameraVisualizationConfig} hoveredThermalCameraId={hoveredThermalCameraId} isThermalMeshPicking={isThermalMeshPicking} materialRecordsRef={thermalMaterialRecordsRef} selectedCamera={selectedCamera} selectedThermalCameraId={selectedThermalCameraId} showCameraLaserBeams={showCameraLaserBeams} thermalAlignmentStorageKey={thermalAlignmentStorageKey} thermalTargetLabel={thermalTargetLabel} thermalTargetObject={thermalTargetObject} viewerRef={viewerRef} onAnalysisViewModeChange={onAnalysisViewModeChange} onCameraLaserToggle={handleCameraLaserToggle} onCameraSettingsTypeChange={onCameraSettingsTypeChange} onCameraVisualizationChange={handleCameraVisualizationChange} onResetCameraView={handleResetCameraView} onThermalCameraHover={onThermalCameraHover} onThermalCameraSelect={onThermalCameraSelect} onThermalFramePreviewChange={onThermalFramePreviewChange} onThermalMeshPickStart={onThermalMeshPickStart}/>
      </Viewer3DOptionBar>) : (<Viewer3DOptionBar className="h-full flex-1 border-0 bg-transparent p-0 md:border-0" config={config} modelFile={modelFile} onConfigChange={onConfigChange} onModelFileChange={onModelFileChange} showCameraControls={false}/>)}
    </aside>);
}
function Viewer3DCameraSettingsControls({ analysisViewMode, cameraSettingsType, cameraVisualizationConfig, hoveredThermalCameraId, isThermalMeshPicking, materialRecordsRef, onAnalysisViewModeChange, onCameraLaserToggle, onCameraSettingsTypeChange, onCameraVisualizationChange, onResetCameraView, onThermalCameraHover, onThermalCameraSelect, onThermalFramePreviewChange, onThermalMeshPickStart, selectedCamera, selectedThermalCameraId, showCameraLaserBeams, thermalAlignmentStorageKey, thermalTargetLabel, thermalTargetObject, viewerRef, }) {
    const isThermalCameraSettings = cameraSettingsType === "thermal";
    const handleCameraSettingsTypeChange = (nextCameraSettingsType) => {
        onCameraSettingsTypeChange?.(nextCameraSettingsType);
        if ((nextCameraSettingsType === "thermal" && selectedThermalCameraId) ||
            (nextCameraSettingsType !== "thermal" &&
                cameraVisualizationConfig?.selectedCameraId)) {
            onAnalysisViewModeChange?.("viewer");
        }
    };
    const handleVisualCameraChange = (nextCameraVisualization) => {
        onCameraVisualizationChange?.(nextCameraVisualization);
        if (nextCameraVisualization?.selectedCameraId) {
            onAnalysisViewModeChange?.("viewer");
        }
    };
    const handleThermalCameraSelect = (cameraId) => {
        onThermalCameraSelect?.(cameraId);
        if (cameraId) {
            onAnalysisViewModeChange?.("viewer");
        }
    };
    return (<div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__camera-settings-stack-1 grid gap-2">
      <ControlSection icon={Camera} title="카메라 선택">
        <Viewer3DCameraTypeSwitch value={cameraSettingsType} onChange={handleCameraSettingsTypeChange}/>
        {isThermalCameraSettings ? (<ThermalAssetViewerOptionContent cameraListRenderSection={false} captureTargetRef={viewerRef?.current?.getThermalRenderer?.()} hoveredCameraId={hoveredThermalCameraId} isPickingMesh={isThermalMeshPicking} materialRecordsRef={materialRecordsRef} panelMode="settings" projectionCamera={viewerRef?.current?.getThermalCamera?.()} projectionRenderer={viewerRef?.current?.getThermalRenderer?.()} projectionScene={viewerRef?.current?.getThermalScene?.()} requireCameraSelection selectedCameraId={selectedThermalCameraId} selectedTargetLabel={thermalTargetLabel} selectedTargetObject={thermalTargetObject} showLaserGuide={showCameraLaserBeams} showViewSettings={false} storageKey={thermalAlignmentStorageKey} viewMode={analysisViewMode} viewerRef={viewerRef} worldOverlayHost={viewerRef?.current?.getThermalStageElement?.()} onCameraHover={onThermalCameraHover} onPickMesh={onThermalMeshPickStart} onSelectedCameraChange={handleThermalCameraSelect} onSelectedFramePreviewChange={onThermalFramePreviewChange} onShowLaserGuideChange={onCameraLaserToggle} onViewModeChange={onAnalysisViewModeChange}/>) : (<>
            <CameraVisualizationControls config={cameraVisualizationConfig} onChange={handleVisualCameraChange} onResetView={onResetCameraView} renderSection={false} requireSelection selectedCamera={selectedCamera}/>
            <CameraPositionControls config={cameraVisualizationConfig} onChange={onCameraVisualizationChange} renderSection={false} showCameraSelector={false}/>
          </>)}
      </ControlSection>
    </div>);
}
function Viewer3DCameraTypeSwitch({ onChange, value }) {
    return (<div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__camera-type-switch-1 grid grid-cols-2 gap-1 rounded-md border border-border bg-background p-1" role="toolbar" aria-label="카메라 종류">
      <SegmentedButton active={value !== "thermal"} onClick={() => onChange?.("visual")} title="실화상 카메라 설정">
        실화상
      </SegmentedButton>
      <SegmentedButton active={value === "thermal"} onClick={() => onChange?.("thermal")} title="열화상 카메라 설정">
        열화상
      </SegmentedButton>
    </div>);
}
function PanelTabButton({ active, label, onClick }) {
    return (<button type="button" className={cn("Viewer3DAnalysisPanel Viewer3DAnalysisPanel__tab-1 h-7 rounded-sm px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground", active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")} aria-pressed={active} onClick={onClick}>
      {label}
    </button>);
}
function Viewer3DHeaderSharedSettingsControls({ analysisViewMode = "viewer", onAnalysisViewModeChange, onCameraLaserToggle, showCameraLaserBeams, }) {
    return (<div className="AssetCameraPanel AssetCameraPanel__header-camera-options-1 flex h-7 shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/10 p-0.5">
      <Viewer3DHeaderModeButton active={analysisViewMode !== "tiles"} icon={Box} label="Viewer" onClick={() => onAnalysisViewModeChange?.("viewer")}/>
      <Viewer3DHeaderModeButton active={analysisViewMode === "tiles"} icon={Grid3X3} label="Tile" onClick={() => onAnalysisViewModeChange?.("tiles")}/>
      <span className="AssetCameraPanel AssetCameraPanel__header-options-divider-1 h-4 w-px bg-white/15" aria-hidden="true"/>
      <button type="button" className={cn("AssetCameraPanel AssetCameraPanel__header-laser-switch-1 inline-flex h-6 min-w-0 items-center gap-1 rounded-sm px-1.5 text-[10px] font-semibold transition", showCameraLaserBeams
        ? "bg-cyan-300 text-slate-950"
        : "text-white/64 hover:bg-white/10 hover:text-white")} aria-pressed={showCameraLaserBeams} onClick={() => onCameraLaserToggle?.(!showCameraLaserBeams)} title="레이저 표시">
        <span className="truncate">Laser</span>
        <span className={cn("AssetCameraPanel AssetCameraPanel__header-laser-track-1 relative h-3 w-5 rounded-full border transition", showCameraLaserBeams
        ? "border-slate-950/30 bg-slate-950/20"
        : "border-white/25 bg-black/20")} aria-hidden="true">
          <span className={cn("AssetCameraPanel AssetCameraPanel__header-laser-thumb-1 absolute left-0.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full transition-transform", showCameraLaserBeams
        ? "translate-x-2 bg-slate-950"
        : "translate-x-0 bg-white/70")}/>
        </span>
      </button>
    </div>);
}
function Viewer3DHeaderModeButton({ active, icon: Icon, label, onClick }) {
    return (<button type="button" className={cn("AssetCameraPanel AssetCameraPanel__header-mode-button-1 inline-flex h-6 min-w-0 items-center gap-1 rounded-sm px-1.5 text-[10px] font-semibold transition", active
        ? "bg-cyan-300 text-slate-950"
        : "text-white/64 hover:bg-white/10 hover:text-white")} aria-pressed={active} onClick={onClick} title={label}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true"/>
      <span className="truncate">{label}</span>
    </button>);
}
function getViewer3DThermalModelLabel(modelFile) {
    return (modelFile?.label ||
        modelFile?.name ||
        modelFile?.id ||
        getModelSourceName(modelFile?.plyUrl) ||
        "전체 3D 모델");
}
function getViewer3DThermalMeshLabel(mesh) {
    return mesh?.name || mesh?.userData?.id || mesh?.uuid || "선택된 mesh";
}
function getViewer3DThermalStorageKey(modelFile) {
    return encodeURIComponent(modelFile?.id || modelFile?.plyUrl || modelFile?.label || "default-model");
}
function createViewer3DModelDraft(modelFile) {
    return {
        label: modelFile?.label ?? EMPTY_VIEWER_3D_MODEL_LABEL,
        normalizeSize: modelFile?.normalizeSize ?? DEFAULT_MODEL_3D_FILE.normalizeSize,
        plyUrl: modelFile?.plyUrl ?? "",
        textureUrl: modelFile?.textureUrl,
        textureUrls: modelFile?.textureUrls,
        textures: modelFile?.textures ? [...modelFile.textures] : [],
    };
}
function hasCompleteViewer3DModelFile(modelFile) {
    if (!modelFile?.plyUrl) {
        return false;
    }
    return Boolean(getPrimaryTextureSource(modelFile));
}
function getPrimaryTextureSource(modelFile) {
    if (!modelFile) {
        return undefined;
    }
    return normalizeModelTextures(modelFile).find((texture) => Boolean(texture.source))?.source;
}
function toAssetPartFromViewer3DAnalysisTarget(target) {
    const targetPoint = getViewer3DTargetPercentPoint(target);
    const mode = target.kind === "area" ? "area" : "points";
    return {
        id: target.id,
        linkedAlarm: target.linkedAlarm,
        mode,
        name: target.name,
        points: mode === "points"
            ? [
                {
                    id: `${target.id}-point`,
                    x: targetPoint.x,
                    y: targetPoint.y,
                },
            ]
            : [],
        roi: mode === "area" ? getViewer3DTargetPercentRoi(target) : undefined,
        source: "3d",
        thresholds: target.thresholds,
        viewer3DTarget: {
            cameraId: target.cameraId,
            color: target.color,
            imageAreaPixel: target.imageAreaPixel,
            imageAreaUv: target.imageAreaUv,
            imagePixel: target.imagePixel,
            imageUv: target.imageUv,
            interactionMode: target.interactionMode,
            kind: target.kind,
            previewImageDataUrl: target.previewImageDataUrl,
            worldArea: target.worldArea,
            worldPosition: target.worldPosition,
        },
    };
}
async function captureCameraAssetPartPreview({ imageUrl, mode, points, roi, }) {
    const cropRect = getCameraAssetPartPreviewCropRect({ mode, points, roi });
    if (!imageUrl || !cropRect) {
        return undefined;
    }
    try {
        const image = await loadCameraPreviewImage(imageUrl);
        const sourceCrop = getObjectCoverSourceCrop(image, cropRect);
        const canvas = document.createElement("canvas");
        const outputScale = CAMERA_ASSET_PART_PREVIEW_SIZE / Math.max(sourceCrop.width, sourceCrop.height);
        const outputWidth = Math.max(1, Math.round(sourceCrop.width * outputScale));
        const outputHeight = Math.max(1, Math.round(sourceCrop.height * outputScale));
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const context = canvas.getContext("2d");
        if (!context) {
            return undefined;
        }
        context.drawImage(image, sourceCrop.x, sourceCrop.y, sourceCrop.width, sourceCrop.height, 0, 0, outputWidth, outputHeight);
        return {
            cropRect,
            dataUrl: canvas.toDataURL("image/png"),
        };
    }
    catch {
        return undefined;
    }
}
function loadCameraPreviewImage(imageUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
        if (image.complete && image.naturalWidth > 0) {
            resolve(image);
        }
    });
}
function getCameraAssetPartPreviewCropRect({ mode, points, roi, }) {
    if (mode === "area" && roi) {
        const margin = clampNumber(Math.max(roi.width, roi.height) * CAMERA_AREA_PREVIEW_MARGIN_RATIO, 2.5, 7);
        return toBoundedPercentRect({
            height: roi.height + margin * 2,
            left: roi.x - margin,
            top: roi.y - margin,
            width: roi.width + margin * 2,
        });
    }
    if (!points.length) {
        return undefined;
    }
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const span = Math.max(maxX - minX, maxY - minY);
    const margin = points.length > 1
        ? clampNumber(span * 0.45, 8, 18)
        : CAMERA_POINT_PREVIEW_RADIUS_PERCENT;
    return toSquarePercentRect({
        height: maxY - minY + margin * 2,
        left: minX - margin,
        top: minY - margin,
        width: maxX - minX + margin * 2,
    });
}
function toBoundedPercentRect(rect) {
    const width = clampNumber(rect.width, 1, 100);
    const height = clampNumber(rect.height, 1, 100);
    return {
        height,
        left: clampNumber(rect.left, 0, 100 - width),
        top: clampNumber(rect.top, 0, 100 - height),
        width,
    };
}
function toSquarePercentRect(rect) {
    const side = clampNumber(Math.max(rect.width, rect.height, 18), 1, 100);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return toBoundedPercentRect({
        height: side,
        left: centerX - side / 2,
        top: centerY - side / 2,
        width: side,
    });
}
function getObjectCoverSourceCrop(image, cropRect) {
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    const scale = Math.max(100 / naturalWidth, 100 / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const offsetX = (100 - renderedWidth) / 2;
    const offsetY = (100 - renderedHeight) / 2;
    const sourceWidth = clampNumber(cropRect.width / scale, 1, naturalWidth);
    const sourceHeight = clampNumber(cropRect.height / scale, 1, naturalHeight);
    return {
        height: sourceHeight,
        width: sourceWidth,
        x: clampNumber((cropRect.left - offsetX) / scale, 0, naturalWidth - sourceWidth),
        y: clampNumber((cropRect.top - offsetY) / scale, 0, naturalHeight - sourceHeight),
    };
}
function getViewer3DTargetPercentRoi(target) {
    if (target.imageAreaUv?.start && target.imageAreaUv?.end) {
        const start = {
            x: roundPercent(target.imageAreaUv.start.x * 100),
            y: roundPercent(target.imageAreaUv.start.y * 100),
        };
        const end = {
            x: roundPercent(target.imageAreaUv.end.x * 100),
            y: roundPercent(target.imageAreaUv.end.y * 100),
        };
        const left = Math.min(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const width = Math.max(1, Math.abs(end.x - start.x));
        const height = Math.max(1, Math.abs(end.y - start.y));
        return {
            height: roundPercent(height),
            width: roundPercent(width),
            x: roundPercent(clampNumber(left, 0, 100 - width)),
            y: roundPercent(clampNumber(top, 0, 100 - height)),
        };
    }
    const center = getViewer3DTargetPercentPoint(target);
    if (!target.worldArea) {
        return getCenteredPercentRoi(center, 14, 14);
    }
    const start = getViewer3DVectorPercentPoint(target.worldArea.start);
    const end = getViewer3DVectorPercentPoint(target.worldArea.end);
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const width = Math.min(42, Math.max(10, Math.abs(end.x - start.x)));
    const height = Math.min(42, Math.max(10, Math.abs(end.y - start.y)));
    return {
        height: roundPercent(height),
        width: roundPercent(width),
        x: roundPercent(clampNumber(left, 0, 100 - width)),
        y: roundPercent(clampNumber(top, 0, 100 - height)),
    };
}
function getCenteredPercentRoi(center, width, height) {
    return {
        height,
        width,
        x: roundPercent(clampNumber(center.x - width / 2, 0, 100 - width)),
        y: roundPercent(clampNumber(center.y - height / 2, 0, 100 - height)),
    };
}
function buildViewer3DAnalysisSummary({ assetParts, assetPartStates, defaultThresholds, index, target, temperatureData, ultrasonicData, }) {
    const latestTemperature = getLatestAnalysisTrendPoint(temperatureData);
    const latestUltrasound = getLatestAnalysisTrendPoint(ultrasonicData);
    const nearestPartState = findNearestAssetPartState(target, assetParts, assetPartStates) ??
        assetPartStates[index % Math.max(assetPartStates.length, 1)];
    const targetOffset = getViewer3DTargetOffset(target);
    const fallbackAverageTemperature = defaultThresholds.temperature > 0
        ? Math.max(0, defaultThresholds.temperature - 5)
        : 0;
    const baseAverageTemperature = nearestPartState?.temperatureAverage ||
        latestTemperature?.average ||
        fallbackAverageTemperature;
    const temperatureAverage = roundMetric(Math.max(0, baseAverageTemperature + targetOffset * 0.35));
    const temperatureMax = roundMetric(Math.max(temperatureAverage, nearestPartState?.temperatureMax ||
        latestTemperature?.max ||
        temperatureAverage + 2.4 + target.sensitivity / 100));
    const temperatureMin = roundMetric(Math.max(0, Math.min(temperatureAverage, latestTemperature?.min ??
        temperatureAverage - 1.8 - target.sensitivity / 120)));
    const fallbackPeakDb = defaultThresholds.ultrasoundDb > 0
        ? Math.max(0, defaultThresholds.ultrasoundDb - 8)
        : 0;
    const ultrasoundPeakDb = roundMetric(Math.max(0, nearestPartState?.ultrasoundPeakDb ||
        latestUltrasound?.max ||
        fallbackPeakDb + Math.max(targetOffset, 0)));
    const ultrasoundDetectedDb = roundMetric(Math.max(0, latestUltrasound?.average ?? ultrasoundPeakDb - 6 + targetOffset * 0.4));
    const dominantFrequencyKHz = roundMetric(nearestPartState?.dominantFrequencyKHz ||
        latestUltrasound?.peakFrequency ||
        40 + targetOffset);
    return {
        dominantFrequencyKHz,
        subtitle: `${target.kind === "area" ? "영역" : "포인트"} · ${formatViewer3DTargetPosition(target)}`,
        temperatureAverage,
        temperatureMax,
        temperatureMin,
        title: target.name,
        trendLabel: buildAnalysisTrendLabel(temperatureData, ultrasonicData),
        ultrasoundDetectedDb,
        ultrasoundPeakDb,
    };
}
function findNearestAssetPartState(target, assetParts, assetPartStates) {
    if (!assetParts.length || !assetPartStates.length) {
        return undefined;
    }
    const targetPoint = getViewer3DTargetPercentPoint(target);
    const nearestPart = assetParts.reduce((nearest, part, index) => {
        const anchorPoint = getAssetPartAnchorPoint(part, index);
        const distance = Math.hypot(targetPoint.x - anchorPoint.x, targetPoint.y - anchorPoint.y);
        if (!nearest || distance < nearest.distance) {
            return { distance, part };
        }
        return nearest;
    }, undefined);
    return nearestPart
        ? assetPartStates.find((state) => state.partId === nearestPart.part.id)
        : undefined;
}
function getAssetPartAnchorPoint(part, index) {
    if (part.roi) {
        return {
            x: part.roi.x + part.roi.width / 2,
            y: part.roi.y + part.roi.height / 2,
        };
    }
    if (part.points.length) {
        return {
            x: getAverage(part.points.map((point) => point.x)),
            y: getAverage(part.points.map((point) => point.y)),
        };
    }
    return {
        x: 24 + ((index * 19) % 52),
        y: 28 + ((index * 23) % 48),
    };
}
function getViewer3DTargetPercentPoint(target) {
    if (target.imageUv) {
        return {
            x: roundPercent(target.imageUv.x * 100),
            y: roundPercent(target.imageUv.y * 100),
        };
    }
    return getViewer3DVectorPercentPoint(target.worldPosition);
}
function getViewer3DVectorPercentPoint(vector) {
    return {
        x: roundPercent(clampNumber(50 + vector.x * 28, 0, 100)),
        y: roundPercent(clampNumber(50 - vector.y * 28, 0, 100)),
    };
}
function getViewer3DTargetOffset(target) {
    const vector = target.worldPosition;
    const wave = Math.sin(vector.x * 7.17 + vector.y * 5.31 + vector.z * 3.19);
    return roundMetric(wave * (target.kind === "area" ? 0.8 : 1.2));
}
function getLatestAnalysisTrendPoint(points) {
    return [...points].reverse().find((point) => point.average > 0 || point.max > 0 || (point.min ?? 0) > 0);
}
function buildAnalysisTrendLabel(temperatureData, ultrasonicData) {
    const temperatureDelta = getTrendDelta(temperatureData, "average");
    const ultrasoundDelta = getTrendDelta(ultrasonicData, "average");
    if (temperatureDelta === 0 && ultrasoundDelta === 0) {
        return "변화 없음";
    }
    return `T ${formatTrendDelta(temperatureDelta, "℃")} · dB ${formatTrendDelta(ultrasoundDelta, "")}`;
}
function getTrendDelta(points, key) {
    const validPoints = points.filter((point) => point[key] > 0);
    const firstPoint = validPoints.at(0);
    const lastPoint = validPoints.at(-1);
    if (!firstPoint || !lastPoint) {
        return 0;
    }
    return roundMetric(lastPoint[key] - firstPoint[key]);
}
function formatTrendDelta(value, suffix) {
    if (value === 0) {
        return `0${suffix}`;
    }
    return `${value > 0 ? "+" : ""}${value}${suffix}`;
}
function formatViewer3DVector(vector) {
    return `${roundMetric(vector.x)}, ${roundMetric(vector.y)}, ${roundMetric(vector.z)}`;
}
function formatViewer3DTargetPosition(target) {
    if (target.imageUv) {
        return `UV ${roundMetric(target.imageUv.x * 100)}, ${roundMetric(target.imageUv.y * 100)}%`;
    }
    return formatViewer3DVector(target.worldPosition);
}
function formatCreatedTime(value, displaySettings) {
    return formatCheckLabKoreanTime(value, displaySettings, { includeSeconds: false }) ?? "-";
}
function ModeButton({ active, icon: Icon, label, onClick, }) {
    return (<button type="button" className={cn("ModeButton ModeButton__button-1 inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-semibold", active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground")} onClick={onClick}>
      <Icon className="ModeButton ModeButton__icon-1 h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
      <span className="ModeButton ModeButton__label-1 truncate">{label}</span>
    </button>);
}
function IconButton({ disabled, icon: Icon, label, onClick, showLabel = false, variant = "default", }) {
    return (<button type="button" className={cn("IconButton IconButton__button-1 inline-flex h-8 items-center justify-center rounded-md border px-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45", variant === "primary" &&
            "border-primary bg-primary text-primary-foreground", variant === "danger" &&
            "border-red-500/35 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-300", variant === "default" &&
            "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground")} disabled={disabled} onClick={onClick} title={label}>
      {showLabel ? (<span className="IconButton IconButton__label-1">{label}</span>) : (<Icon className="IconButton IconButton__icon-1 h-3.5 w-3.5" aria-hidden="true"/>)}
    </button>);
}
function buildPresentationCameraFeeds(cameraFeeds) {
    const incomingFeeds = cameraFeeds?.length ? cameraFeeds : [];
    const mergedFeeds = incomingFeeds.map((camera, index) => ({
        ...camera,
        label: camera.label ?? `CAM ${index + 1}`,
        name: camera.name ?? `카메라 ${index + 1}`,
        presentationImageUrl: camera.presentationImageUrl ?? PRESENTATION_CAMERA_IMAGE_URLS[index % PRESENTATION_CAMERA_IMAGE_URLS.length],
        streamMessage: camera.streamMessage ?? "임시 카메라 이미지",
        streamState: camera.streamState ?? "presentation",
    }));
    for (let index = mergedFeeds.length; index < defaultCameraFeeds.length; index += 1) {
        mergedFeeds.push(defaultCameraFeeds[index]);
    }
    return mergedFeeds;
}
function buildPresentationInterestAreaItems(items) {
    const nextItems = items.map((item, index) => ({
        ...item,
        presentationImageUrl: item.presentationImageUrl ?? PRESENTATION_INTEREST_AREA_IMAGES[index % PRESENTATION_INTEREST_AREA_IMAGES.length],
    }));
    for (let index = nextItems.length; index < defaultPresentationInterestAreas.length; index += 1) {
        nextItems.push(defaultPresentationInterestAreas[index]);
    }
    return nextItems;
}
function CameraInterestAreaPanel({ activeMode, canSave, draftName, draftPoints, draftRoi, draftThresholds, items, onCancelDraft, onDelete, onDraftNameChange, onDraftThresholdChange, onModeChange, onSave, onSelect, onUpdate, partStates, selectedPart, selectedPartState, selectedPartId, selectionMode, }) {
    const presentationItems = buildPresentationInterestAreaItems(items);
    const draftScopeLabel = selectionMode === "area"
        ? draftRoi
            ? `${Math.round(draftRoi.width)}×${Math.round(draftRoi.height)}%`
            : "ROI 미지정"
        : `${draftPoints.length}개 포인트`;
    const modeLabel = activeMode === "area"
        ? "영역"
        : activeMode === "points"
            ? "포인트"
            : "탐색";
    return (<aside className="CameraInterestAreaPanel CameraInterestAreaPanel__aside-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground">
      <div className="CameraInterestAreaPanel CameraInterestAreaPanel__stack-1 grid min-h-0 gap-2 overflow-y-auto pr-1">
        <ControlSection icon={SquareDashedMousePointer} title="관심 영역">
          <div className="CameraInterestAreaPanel CameraInterestAreaPanel__modes-1 grid grid-cols-3 gap-1.5" role="group" aria-label="카메라 관심 영역 추가">
            <ModeButton active={!activeMode} icon={RotateCcw} label="탐색" onClick={() => onModeChange(undefined)}/>
            <ModeButton active={activeMode === "points"} icon={MousePointer2} label="포인트" onClick={() => onModeChange("points")}/>
            <ModeButton active={activeMode === "area"} icon={SquareDashedMousePointer} label="영역" onClick={() => onModeChange("area")}/>
          </div>

          <div className="CameraInterestAreaPanel CameraInterestAreaPanel__status-1 grid grid-cols-2 gap-1.5">
            <DetectionSetupStatusRow label="대상" value={`${items.length}개`}/>
            <DetectionSetupStatusRow label="모드" value={modeLabel}/>
          </div>
        </ControlSection>

        <ControlSection icon={Camera} title="관심 영역 리스트">
          <div className="CameraInterestAreaPanel CameraInterestAreaPanel__list-1 grid gap-1.5">
            {presentationItems.map((item) => {
            const itemState = partStates.find((partState) => partState.partId === item.id);
            return (<button key={item.id} type="button" className={cn("CameraInterestAreaPanel CameraInterestAreaPanel__item-1 grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-2 rounded-md border bg-card px-2 py-2 text-left transition hover:bg-accent", item.id === selectedPartId
                    ? "border-primary"
                    : "border-border")} onClick={() => {
                        if (!item.presentationOnly) {
                            onSelect(item.id);
                        }
                    }}>
                  <img alt={`${item.name} 임시 카메라 이미지`} className="CameraInterestAreaPanel CameraInterestAreaPanel__item-image-1 h-12 w-full rounded-sm object-cover" src={item.presentationImageUrl}/>
                  <span className="CameraInterestAreaPanel CameraInterestAreaPanel__item-body-1 grid min-w-0 gap-1">
                    <span className="CameraInterestAreaPanel CameraInterestAreaPanel__item-title-1 flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-semibold">
                        {item.name}
                      </span>
                      <span className="shrink-0 rounded-sm border border-border bg-background px-1 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {getCameraPartModeLabel(item)}
                      </span>
                    </span>
                    <span className="CameraInterestAreaPanel CameraInterestAreaPanel__item-value-1 truncate font-mono text-[11px] text-muted-foreground">
                      최고 {itemState?.temperatureMax ?? 0}℃ · Peak{" "}
                      {itemState?.ultrasoundPeakDb ?? 0} dB
                    </span>
                  </span>
                </button>);
        })}
          </div>
        </ControlSection>

        {activeMode ? (<ControlSection icon={MousePointer2} title="새 관심 영역">
            <label className="CameraInterestAreaPanel CameraInterestAreaPanel__field-1 grid min-w-0 gap-1">
              <span className="CameraInterestAreaPanel CameraInterestAreaPanel__label-1 text-[10px] font-semibold text-muted-foreground">
                이름
              </span>
              <input className="CameraInterestAreaPanel CameraInterestAreaPanel__input-1 h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs font-semibold outline-none focus:border-primary" value={draftName} onChange={(event) => onDraftNameChange(event.target.value)}/>
            </label>

            <div className="CameraInterestAreaPanel CameraInterestAreaPanel__thresholds-1 grid grid-cols-2 gap-1.5">
              <ThresholdField label="온도" suffix="℃" value={draftThresholds.temperature} onChange={(temperature) => onDraftThresholdChange({
                ...draftThresholds,
                temperature,
            })}/>
              <ThresholdField label="초음파" suffix="dB" value={draftThresholds.ultrasoundDb} onChange={(ultrasoundDb) => onDraftThresholdChange({
                ...draftThresholds,
                ultrasoundDb,
            })}/>
            </div>

            <div className="CameraInterestAreaPanel CameraInterestAreaPanel__draft-status-1 grid gap-1.5">
              <DetectionSetupStatusRow label="방식" value={selectionMode === "area" ? "영역 ROI" : "포인트"}/>
              <DetectionSetupStatusRow label="지정" value={draftScopeLabel}/>
              <DetectionSetupStatusRow label="알림" value={`온도 ${draftThresholds.temperature}℃ · 초음파 ${draftThresholds.ultrasoundDb} dB`}/>
            </div>

            <div className="CameraInterestAreaPanel CameraInterestAreaPanel__actions-1 grid grid-cols-2 gap-1.5">
              <IconButton disabled={!canSave} icon={Check} label="저장" onClick={onSave} showLabel variant="primary"/>
              <IconButton icon={X} label="취소" onClick={onCancelDraft} showLabel/>
            </div>
          </ControlSection>) : null}

        {!activeMode && selectedPart ? (<ControlSection icon={MousePointer2} title="선택 영역 설정">
            <label className="CameraInterestAreaPanel CameraInterestAreaPanel__field-2 grid min-w-0 gap-1">
              <span className="CameraInterestAreaPanel CameraInterestAreaPanel__label-2 text-[10px] font-semibold text-muted-foreground">
                이름
              </span>
              <input className="CameraInterestAreaPanel CameraInterestAreaPanel__input-2 h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs font-semibold outline-none focus:border-primary" value={selectedPart.name} onChange={(event) => onUpdate({ ...selectedPart, name: event.target.value })}/>
            </label>

            <div className="CameraInterestAreaPanel CameraInterestAreaPanel__thresholds-2 grid grid-cols-2 gap-1.5">
              <ThresholdField label="온도" suffix="℃" value={selectedPart.thresholds.temperature} onChange={(temperature) => onUpdate({
                ...selectedPart,
                thresholds: {
                    ...selectedPart.thresholds,
                    temperature,
                },
            })}/>
              <ThresholdField label="초음파" suffix="dB" value={selectedPart.thresholds.ultrasoundDb} onChange={(ultrasoundDb) => onUpdate({
                ...selectedPart,
                thresholds: {
                    ...selectedPart.thresholds,
                    ultrasoundDb,
                },
            })}/>
            </div>

            <label className="CameraInterestAreaPanel CameraInterestAreaPanel__check-1 flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
              <span className="CameraInterestAreaPanel CameraInterestAreaPanel__check-label-1 truncate text-[11px] font-semibold text-muted-foreground">
                알림 연동
              </span>
              <input checked={selectedPart.linkedAlarm !== false} className="CameraInterestAreaPanel CameraInterestAreaPanel__check-input-1 h-4 w-4 shrink-0 accent-primary" onChange={(event) => onUpdate({
                ...selectedPart,
                linkedAlarm: event.target.checked,
            })} type="checkbox"/>
            </label>

            <div className="CameraInterestAreaPanel CameraInterestAreaPanel__setting-status-1 grid gap-1.5">
              <DetectionSetupStatusRow label="방식" value={getCameraPartModeLabel(selectedPart)}/>
              <DetectionSetupStatusRow label="범위" value={formatCameraPartScope(selectedPart)}/>
            </div>

            <IconButton icon={X} label="삭제" onClick={() => onDelete?.(selectedPart.id)} showLabel variant="danger"/>
          </ControlSection>) : null}

        {!activeMode && selectedPartState ? (<ControlSection icon={Box} title="측정값">
            <div className="CameraInterestAreaPanel CameraInterestAreaPanel__metrics-1 grid gap-1.5">
              <DetectionSetupStatusRow label="최고온도" value={`${selectedPartState.temperatureMax ?? 0}℃`}/>
              <DetectionSetupStatusRow label="평균온도" value={`${selectedPartState.temperatureAverage ?? 0}℃`}/>
              <DetectionSetupStatusRow label="검출 dB" value={`${selectedPartState.ultrasoundPeakDb ?? 0} dB`}/>
              <DetectionSetupStatusRow label="주파수" value={`${selectedPartState.dominantFrequencyKHz ?? 0} kHz`}/>
            </div>
          </ControlSection>) : null}
      </div>
    </aside>);
}
function getCameraPartModeLabel(part) {
    return part.mode === "area" ? "영역" : "포인트";
}
function formatCameraPartScope(part) {
    if (part.mode === "area" && part.roi) {
        return `${roundMetric(part.roi.x)}, ${roundMetric(part.roi.y)} · ${roundMetric(part.roi.width)}×${roundMetric(part.roi.height)}%`;
    }
    if (part.points.length) {
        return `${part.points.length}개 · ${part.points.map((point) => `(${roundMetric(point.x)}, ${roundMetric(point.y)})`).join(" ")}`;
    }
    return "미지정";
}
function DetectionSetupStatusRow({ label, value, }) {
    return (<div className="DetectionSetupStatusRow DetectionSetupStatusRow__row-1 flex min-w-0 items-center justify-between gap-2 rounded-sm border border-border/60 bg-background px-2 py-1.5">
      <span className="DetectionSetupStatusRow DetectionSetupStatusRow__label-1 shrink-0 text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="DetectionSetupStatusRow DetectionSetupStatusRow__value-1 min-w-0 truncate text-right font-mono text-[11px] font-semibold">
        {value}
      </span>
    </div>);
}
function ThresholdField({ label, onChange, suffix, value, }) {
    return (<label className="ThresholdField ThresholdField__field-1 flex h-8 min-w-[5.75rem] flex-[1_1_5.75rem] items-center gap-1 rounded-md border border-border bg-card px-2">
      <input className="ThresholdField ThresholdField__input-1 w-0 min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold outline-none" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))}/>
    </label>);
}
function CameraViewport({ children, focused, imageUrl, onOpenPreview, streamMessage = "스트림 대기", streamState = "idle", streamUrl, }) {
    const hasStream = Boolean(streamUrl);
    const hasImage = Boolean(imageUrl);
    return (<div className="CameraViewport CameraViewport__container-1 relative h-full min-h-0 overflow-hidden bg-white/10">
      <div className="CameraViewport CameraViewport__container-4 relative grid h-full place-items-center text-white/80">
        {onOpenPreview ? (<button type="button" className="AssetCameraPanel AssetCameraPanel__button-1 absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-md border border-white/20 bg-black/45 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white" onClick={(event) => {
                event.stopPropagation();
                onOpenPreview();
            }} onPointerDown={(event) => event.stopPropagation()} title="캠 크게 보기">
            <Maximize2 className="AssetCameraPanel AssetCameraPanel__icon-2 h-4 w-4" aria-hidden="true"/>
          </button>) : null}
        {hasImage ? (<img alt="임시 카메라 영상" className="CameraViewport CameraViewport__image-1 h-full w-full object-cover" src={imageUrl}/>) : hasStream ? (<video className="CameraViewport CameraViewport__video-1 h-full w-full object-cover" src={streamUrl ?? undefined} autoPlay muted playsInline controls={streamState !== "live"}/>) : (<div className="CameraViewport CameraViewport__container-5 grid place-items-center gap-2">
            <Maximize2 className={cn("CameraViewport CameraViewport__icon-1 h-6 w-6", focused && "h-7 w-7")} aria-hidden="true"/>
            <p className={cn("CameraViewport CameraViewport__text-1 font-mono text-xs", focused && "text-sm")}>
              {streamMessage}
            </p>
          </div>)}
      </div>
      {children}
    </div>);
}
function DetectionOverlays({ parts, draftPoints, draftRoi, isDraftVisible, selectedPartId, }) {
    return (<div className="DetectionOverlays DetectionOverlays__container-1 pointer-events-none absolute inset-0 z-10">
      {parts.map((area) => (<AssetPartOverlay key={area.id} area={area} selected={area.id === selectedPartId}/>))}
      {isDraftVisible && draftRoi ? (<RoiBox className="border-white bg-white/10 outline outline-1 outline-black shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_0_18px_rgba(255,255,255,0.28)]" label="신규 영역" roi={draftRoi}/>) : null}
      {isDraftVisible
            ? draftPoints.map((point, index) => (<PointMarker key={point.id} index={index + 1} point={point} className="border-primary bg-primary text-primary-foreground"/>))
            : null}
    </div>);
}
function AssetPartOverlay({ area, selected, }) {
    return (<>
      {area.roi ? (<RoiBox className={selected
                ? "border-lime-300 bg-lime-300/15 shadow-[0_0_20px_rgba(190,242,100,0.34)]"
                : "border-cyan-300 bg-cyan-300/10"} label={area.name} roi={area.roi}/>) : null}
      {area.points.map((point, index) => (<PointMarker key={point.id} className={selected
                ? "border-lime-200 bg-lime-300 text-neutral-950 shadow-[0_0_14px_rgba(190,242,100,0.42)]"
                : "border-cyan-200 bg-cyan-300 text-neutral-950"} index={index + 1} point={point}/>))}
    </>);
}
function RoiBox({ className, label, roi, }) {
    return (<div className={cn("RoiBox RoiBox__container-1 pointer-events-auto absolute cursor-move rounded-sm border-2", className)} style={{
            height: `${roi.height}%`,
            left: `${roi.x}%`,
            top: `${roi.y}%`,
            width: `${roi.width}%`,
        }}>
      <span className="RoiBox RoiBox__label-1 absolute left-1 top-1 rounded-sm bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white">
        {label}
      </span>
    </div>);
}
function PointMarker({ className, index, point, }) {
    return (<span className={cn("PointMarker PointMarker__label-1 absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[10px] font-bold", className)} style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
        }}>
      {index}
    </span>);
}
