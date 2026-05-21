"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, Box, Maximize2, MousePointer2, RotateCcw, SquareDashedMousePointer, Upload, X, } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL_3D_FILE, DEFAULT_VIEWER_3D_CONFIG, Three3DViewer, } from "./3d-viewer";
import { ControlSection } from "./3d-viewer/controls/control-fields";
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
const defaultCameraFeeds = [
    {
        id: "cam-1",
        label: "CAM 1",
        name: "카메라 1",
        streamMessage: "스트림 대기",
        streamState: "idle",
        streamUrl: null,
    },
];
export function AssetCameraPanel({ activeCameraId, cameraFeeds = defaultCameraFeeds, defaultAssetThresholds, assetParts, assetPartStates = [], assetThresholds, isAddingAssetPart, selectedAssetPartId, onCameraSelect, onCancelAssetPart, onCreateAssetPart, onDeleteAssetPart, onSelectAssetPart, onUpdateAssetPart, initialViewMode = "3d", onViewer3DConfigChange, onViewer3DModelFileChange, temperatureData = [], ultrasonicData = [], viewer3DConfig, viewer3DModelFile, }) {
    const availableCameraFeeds = cameraFeeds.length
        ? cameraFeeds
        : defaultCameraFeeds;
    const selectedCamera = useMemo(() => availableCameraFeeds.find((camera) => camera.id === activeCameraId) ??
        availableCameraFeeds[0], [activeCameraId, availableCameraFeeds]);
    const activeAssetThresholds = assetThresholds ?? defaultAssetThresholds;
    const [draftName, setDraftName] = useState("단자부");
    const [selectionMode, setSelectionMode] = useState("area");
    const [draftThresholds, setDraftThresholds] = useState(activeAssetThresholds);
    const [areDraftThresholdsDirty, setAreDraftThresholdsDirty] = useState(false);
    const [draftRoi, setDraftRoi] = useState();
    const [draftPoints, setDraftPoints] = useState([]);
    const [dragInteraction, setDragInteraction] = useState();
    const dragInteractionRef = useRef();
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [canRenderPreviewPortal, setCanRenderPreviewPortal] = useState(false);
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [currentViewer3DConfig, setCurrentViewer3DConfig] = useState(viewer3DConfig ?? DEFAULT_VIEWER_3D_CONFIG);
    const [currentViewer3DModelFile, setCurrentViewer3DModelFile] = useState(viewer3DModelFile ?? null);
    const [viewer3DAnalysisMode, setViewer3DAnalysisMode] = useState();
    const [viewer3DAnalysisTargets, setViewer3DAnalysisTargets] = useState([]);
    const [selectedViewer3DAnalysisTargetId, setSelectedViewer3DAnalysisTargetId,] = useState();
    const canSave = draftName.trim().length > 0 &&
        (selectionMode === "area"
            ? Boolean(draftRoi && draftRoi.width >= 2 && draftRoi.height >= 2)
            : draftPoints.length > 0);
    const isDraggingRoi = dragInteraction?.type === "move-area-roi" ||
        dragInteraction?.type === "move-draft-roi";
    const readyViewer3DModelFile = hasCompleteViewer3DModelFile(currentViewer3DModelFile)
        ? currentViewer3DModelFile
        : null;
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
        if (!isAddingAssetPart) {
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
        isAddingAssetPart,
    ]);
    useEffect(() => {
        if (!isPreviewOpen) {
            setViewer3DAnalysisMode(undefined);
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsPreviewOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPreviewOpen]);
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
        if (!isAddingAssetPart) {
            const hitPoint = findAreaPointHit(point, assetParts, selectedAssetPartId);
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
            const hitRoi = findAreaRoiHit(point, assetParts, selectedAssetPartId);
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
        const targetArea = assetParts.find((area) => area.id === activeInteraction.partId);
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
        setCurrentViewer3DConfig(nextConfig);
        onViewer3DConfigChange?.(nextConfig);
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
    const handleSave = () => {
        if (!canSave) {
            return;
        }
        onCreateAssetPart({
            id: `detection-${Date.now()}`,
            linkedAlarm: true,
            mode: selectionMode,
            name: draftName.trim(),
            points: selectionMode === "points" ? draftPoints : [],
            roi: selectionMode === "area" ? draftRoi : undefined,
            thresholds: draftThresholds,
        });
        resetDraft(activeAssetThresholds);
    };
    const handleCancel = () => {
        resetDraft(activeAssetThresholds);
        onCancelAssetPart();
    };
    return (<section className="AssetCameraPanel AssetCameraPanel__section-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-1 text-card-foreground">
      <div className="AssetCameraPanel AssetCameraPanel__container-1 mb-1 flex min-w-0 items-center justify-between gap-2">
        <div className="AssetCameraPanel AssetCameraPanel__container-2 flex min-w-0 items-center gap-1.5 ml-3">
          <div className="AssetCameraPanel AssetCameraPanel__view-toggle-1 flex items-center gap-1 rounded-md border border-border bg-background p-0.5" role="group" aria-label="패널 보기">
            <PanelModeButton active={viewMode === "camera"} icon={Camera} label="카메라" onClick={() => setViewMode("camera")}/>
            <PanelModeButton active={viewMode === "3d"} icon={Box} label="3D" onClick={() => setViewMode("3d")}/>
          </div>
        </div>
        <div className="AssetCameraPanel AssetCameraPanel__container-4 mb-1 flex justify-end mr-1">
          {viewMode === "camera" ? (<label className="AssetCameraPanel AssetCameraPanel__field-1 flex min-w-[8.5rem] items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-semibold text-muted-foreground">
              <span className="AssetCameraPanel AssetCameraPanel__label-2 shrink-0">
                카메라
              </span>
              <select className="AssetCameraPanel AssetCameraPanel__select-1 h-7 min-w-0 flex-1 bg-transparent text-xs font-semibold text-foreground outline-none" value={selectedCamera.id} onChange={(event) => onCameraSelect(event.target.value)}>
                {availableCameraFeeds.map((camera) => (<option key={camera.id} value={camera.id}>
                    {camera.label}
                  </option>))}
              </select>
            </label>) : null}
        </div>
      </div>
      <div className="AssetCameraPanel AssetCameraPanel__container-5 grid min-h-0 flex-1 place-items-center overflow-hidden rounded-md border border-border bg-neutral-950/85 p-1 [container-type:size]">
        <div className={cn("AssetCameraPanel AssetCameraPanel__container-6 relative h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] touch-none overflow-hidden rounded-md border border-white/15 bg-neutral-950 shadow-[0_0_28px_rgba(34,211,238,0.16)]", viewMode === "camera" &&
            isAddingAssetPart &&
            "cursor-crosshair border-primary/70", viewMode === "camera" && isDraggingRoi && "cursor-move")} onPointerDown={viewMode === "camera" ? handlePointerDown : undefined} onPointerMove={viewMode === "camera" ? handlePointerMove : undefined} onPointerCancel={viewMode === "camera" ? handlePointerCancel : undefined} onPointerUp={viewMode === "camera" ? handlePointerUp : undefined}>
          {viewMode === "3d" ? (<>
              {readyViewer3DModelFile ? (<>
                  <Three3DViewer allowOptionBar={false} config={currentViewer3DConfig} modelFile={readyViewer3DModelFile} onConfigChange={handleViewer3DConfigChange} onModelFileChange={handleViewer3DModelFileChange}/>
                  <button type="button" className="AssetCameraPanel AssetCameraPanel__button-1 absolute right-2 top-12 z-20 grid h-8 w-8 place-items-center rounded-md border border-white/20 bg-black/45 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white" onClick={(event) => {
                    event.stopPropagation();
                    setIsPreviewOpen(true);
                }} title="3D 크게 보기">
                    <Maximize2 className="AssetCameraPanel AssetCameraPanel__icon-2 h-4 w-4" aria-hidden="true"/>
                  </button>
                </>) : (<Viewer3DModelUploadPanel modelFile={currentViewer3DModelFile} onPlyFileChange={handleViewer3DPlyFileChange} onTextureFileChange={handleViewer3DTextureFileChange} onUseSample={handleUseSampleViewer3DModel}/>)}
            </>) : (<>
              <div className="AssetCameraPanel AssetCameraPanel__container-7 absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:34px_34px]"/>
              <CameraViewport focused={selectedCamera.id !== "default"} streamMessage={selectedCamera.streamMessage} streamState={selectedCamera.streamState} streamUrl={selectedCamera.streamUrl} onOpenPreview={() => setIsPreviewOpen(true)}>
                <DetectionOverlays parts={assetParts} draftPoints={draftPoints} draftRoi={draftRoi} isDraftVisible={isAddingAssetPart} selectedPartId={selectedAssetPartId}/>
              </CameraViewport>
            </>)}
        </div>
      </div>

      {isAddingAssetPart && canRenderPreviewPortal
            ? createPortal(<DetectionSetupDialog canSave={canSave} assetParts={assetParts} draftName={draftName} draftPoints={draftPoints} draftRoi={draftRoi} draftThresholds={draftThresholds} isDraggingRoi={isDraggingRoi} selectedCamera={selectedCamera} selectedPartId={selectedAssetPartId} selectionMode={selectionMode} onCancel={handleCancel} onDraftNameChange={setDraftName} onDraftThresholdChange={handleDraftThresholdChange} onPointerCancel={handlePointerCancel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onSave={handleSave} onSelectionModeChange={(mode) => {
                    setSelectionMode(mode);
                    if (mode === "area") {
                        setDraftPoints([]);
                    }
                    else {
                        setDraftRoi(undefined);
                    }
                }}/>, document.body)
            : null}

      {isPreviewOpen && canRenderPreviewPortal
            ? createPortal(<div className="AssetCameraPanel AssetCameraPanel__container-15 fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={viewMode === "3d" ? "3D 크게 보기" : "캠 크게 보기"} onClick={() => setIsPreviewOpen(false)}>
              <div className={cn("AssetCameraPanel AssetCameraPanel__container-16 flex max-h-[calc(100dvh-2rem)] max-w-[calc(100dvw-2rem)] min-w-0 flex-col overflow-hidden rounded-md border border-white/15 bg-neutral-950 text-white shadow-2xl", viewMode === "3d"
                    ? "h-[min(92dvh,56rem)] w-[min(98dvw,104rem)]"
                    : "h-[min(92dvh,92dvw)] w-[min(92dvh,92dvw)]")} onClick={(event) => event.stopPropagation()}>
                <div className="AssetCameraPanel AssetCameraPanel__container-17 flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/15 px-3">
                  <div className="AssetCameraPanel AssetCameraPanel__container-18 flex min-w-0 items-center gap-2">
                    {viewMode === "3d" ? (<Box className="AssetCameraPanel AssetCameraPanel__icon-3 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true"/>) : (<Camera className="AssetCameraPanel AssetCameraPanel__icon-3 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true"/>)}
                    <p className="AssetCameraPanel AssetCameraPanel__text-3 truncate text-sm font-semibold">
                      {viewMode === "3d"
                    ? "3D 월드 · PLY 뷰어"
                    : `${selectedCamera.label} · ${selectedCamera.name}`}
                    </p>
                  </div>
                  <button type="button" className="AssetCameraPanel AssetCameraPanel__button-2 grid h-7 w-7 place-items-center rounded-md border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white" onClick={() => setIsPreviewOpen(false)} title="닫기">
                    <X className="AssetCameraPanel AssetCameraPanel__icon-4 h-3.5 w-3.5" aria-hidden="true"/>
                  </button>
                </div>
                {viewMode === "3d" ? (<div className="AssetCameraPanel AssetCameraPanel__container-19 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_16rem] gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:grid-rows-[minmax(0,1fr)]">
                    <div className="AssetCameraPanel AssetCameraPanel__viewer-wrap-1 h-full min-h-0 min-w-0">
                      {readyViewer3DModelFile ? (<Three3DViewer activeAnalysisMode={viewer3DAnalysisMode} allowOptionBar analysisSummary={selectedViewer3DAnalysisItem?.summary} analysisTargets={viewer3DAnalysisTargets} className="AssetCameraPanel AssetCameraPanel__viewer-1 h-full" config={currentViewer3DConfig} modelFile={readyViewer3DModelFile} selectedAnalysisTargetId={selectedViewer3DAnalysisTargetId} onAnalysisTargetCreate={handleViewer3DAnalysisTargetCreate} onAnalysisTargetSelect={handleViewer3DAnalysisTargetSelect} onConfigChange={handleViewer3DConfigChange} onModelFileChange={handleViewer3DModelFileChange}/>) : (<Viewer3DModelUploadPanel modelFile={currentViewer3DModelFile} onPlyFileChange={handleViewer3DPlyFileChange} onTextureFileChange={handleViewer3DTextureFileChange} onUseSample={handleUseSampleViewer3DModel}/>)}
                    </div>

                    <Viewer3DAnalysisPanel activeMode={viewer3DAnalysisMode} items={viewer3DAnalysisItems} selectedItem={selectedViewer3DAnalysisItem} selectedTargetId={selectedViewer3DAnalysisTargetId} onDelete={handleViewer3DAnalysisTargetDelete} onModeChange={handleViewer3DAnalysisModeChange} onSelect={handleViewer3DAnalysisTargetSelect} onUpdate={handleViewer3DAnalysisTargetUpdate}/>
                  </div>) : (<div className="AssetCameraPanel AssetCameraPanel__container-19 grid min-h-0 flex-1 place-items-center p-3 [container-type:size]">
                    <div className={cn("AssetCameraPanel AssetCameraPanel__container-20 relative h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] touch-none overflow-hidden rounded-md border border-cyan-200/25 bg-neutral-950 shadow-[0_0_42px_rgba(34,211,238,0.2)]", isAddingAssetPart &&
                        "cursor-crosshair border-primary/70", isDraggingRoi && "cursor-move")} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerCancel={handlePointerCancel} onPointerUp={handlePointerUp}>
                      <div className="AssetCameraPanel AssetCameraPanel__container-21 absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:34px_34px]"/>
                      <CameraViewport focused={selectedCamera.id !== "default"} streamMessage={selectedCamera.streamMessage} streamState={selectedCamera.streamState} streamUrl={selectedCamera.streamUrl}>
                        <DetectionOverlays parts={assetParts} draftPoints={draftPoints} draftRoi={draftRoi} isDraftVisible={isAddingAssetPart} selectedPartId={selectedAssetPartId}/>
                      </CameraViewport>
                    </div>
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
function Viewer3DAnalysisPanel({ activeMode, items, onDelete, onModeChange, onSelect, onUpdate, selectedItem, selectedTargetId, }) {
    const selectedTarget = selectedItem?.target;
    const selectedSummary = selectedItem?.summary;
    return (<aside className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__aside-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground">
      <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__stack-1 grid min-h-0 gap-2 overflow-y-auto pr-1">
        <ControlSection icon={SquareDashedMousePointer} title="정밀 분석">
          <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__modes-1 grid grid-cols-3 gap-1.5" role="group" aria-label="3D 분석 대상 추가">
            <ModeButton active={!activeMode} icon={RotateCcw} label="탐색" onClick={() => onModeChange(undefined)}/>
            <ModeButton active={activeMode === "point"} icon={MousePointer2} label="포인트" onClick={() => onModeChange("point")}/>
            <ModeButton active={activeMode === "area"} icon={SquareDashedMousePointer} label="영역" onClick={() => onModeChange("area")}/>
          </div>

          <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__status-1 grid grid-cols-2 gap-1.5">
            <DetectionSetupStatusRow label="대상" value={`${items.length}개`}/>
            <DetectionSetupStatusRow label="모드" value={activeMode === "area" ? "영역" : activeMode === "point" ? "포인트" : "탐색"}/>
          </div>
        </ControlSection>

        <ControlSection icon={Box} title="대상 목록">
          <div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__list-1 grid gap-1.5">
            {items.length ? (items.map((item) => (<button key={item.target.id} type="button" className={cn("Viewer3DAnalysisPanel Viewer3DAnalysisPanel__item-1 grid min-w-0 gap-1 rounded-md border bg-card px-2 py-2 text-left transition hover:bg-accent", item.target.id === selectedTargetId
                ? "border-primary"
                : "border-border")} onClick={() => onSelect(item.target.id)} style={{
                borderColor: item.target.id === selectedTargetId
                    ? item.target.color
                    : undefined,
            }}>
                  <span className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__item-title-1 flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold">
                      {item.target.name}
                    </span>
                    <span className="shrink-0 rounded-sm border border-border bg-background px-1 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.target.kind === "area" ? "영역" : "포인트"}
                    </span>
                  </span>
                  <span className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__item-value-1 truncate font-mono text-[11px] text-muted-foreground">
                    최고 {item.summary.temperatureMax}℃ · Peak{" "}
                    {item.summary.ultrasoundPeakDb} dB
                  </span>
                </button>))) : (<div className="Viewer3DAnalysisPanel Viewer3DAnalysisPanel__empty-1 rounded-md border border-dashed border-border bg-background px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground">
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
              <DetectionSetupStatusRow label="좌표" value={formatViewer3DVector(selectedTarget.worldPosition)}/>
              <DetectionSetupStatusRow label="등록" value={formatCreatedTime(selectedTarget.createdAt)}/>
            </div>

            <IconButton icon={X} label="삭제" onClick={() => onDelete(selectedTarget.id)} showLabel variant="danger"/>
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
      </div>
    </aside>);
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
            color: target.color,
            kind: target.kind,
            previewImageDataUrl: target.previewImageDataUrl,
            worldArea: target.worldArea,
            worldPosition: target.worldPosition,
        },
    };
}
function getViewer3DTargetPercentRoi(target) {
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
        subtitle: `${target.kind === "area" ? "영역" : "포인트"} · ${formatViewer3DVector(target.worldPosition)}`,
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
function formatCreatedTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}
function PanelModeButton({ active, icon: Icon, label, onClick, }) {
    return (<button type="button" className={cn("PanelModeButton PanelModeButton__button-1 inline-flex h-7 min-w-[2.25rem] items-center justify-center gap-1 rounded-sm px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground", active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")} onClick={onClick} title={label}>
      <Icon className="PanelModeButton PanelModeButton__icon-1 h-3.5 w-3.5" aria-hidden="true"/>
      <span className="PanelModeButton PanelModeButton__label-1 hidden sm:inline">
        {label}
      </span>
    </button>);
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
function DetectionSetupDialog({ canSave, assetParts, draftName, draftPoints, draftRoi, draftThresholds, isDraggingRoi, selectedPartId, selectedCamera, selectionMode, onCancel, onDraftNameChange, onDraftThresholdChange, onPointerCancel, onPointerDown, onPointerMove, onPointerUp, onSave, onSelectionModeChange, }) {
    const draftScopeLabel = selectionMode === "area"
        ? draftRoi
            ? `${Math.round(draftRoi.width)}×${Math.round(draftRoi.height)}%`
            : "ROI 미지정"
        : `${draftPoints.length}개 포인트`;
    return (<div className="AssetCameraPanel AssetCameraPanel__setup-dialog-overlay-1 fixed inset-0 z-[90] grid place-items-center bg-black/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="감지 데이터 설정">
      <div className="AssetCameraPanel AssetCameraPanel__setup-dialog-1 grid h-[min(86dvh,48rem)] w-[min(72rem,calc(100dvw-1.5rem))] min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-2xl">
        <div className="AssetCameraPanel AssetCameraPanel__setup-header-1 flex h-11 min-w-0 items-center justify-between gap-3 border-b border-border px-3">
          <div className="AssetCameraPanel AssetCameraPanel__setup-title-1 flex min-w-0 items-center gap-2">
            <SquareDashedMousePointer className="AssetCameraPanel AssetCameraPanel__setup-icon-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
            <div className="AssetCameraPanel AssetCameraPanel__setup-title-copy-1 min-w-0">
              <h2 className="AssetCameraPanel AssetCameraPanel__setup-heading-1 truncate text-sm font-semibold">
                감지 데이터 설정
              </h2>
              <p className="AssetCameraPanel AssetCameraPanel__setup-text-1 truncate text-[11px] text-muted-foreground">
                {selectedCamera.label} · {draftScopeLabel}
              </p>
            </div>
          </div>
          <button type="button" className="AssetCameraPanel AssetCameraPanel__setup-close-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground" onClick={onCancel} title="닫기">
            <X className="AssetCameraPanel AssetCameraPanel__setup-icon-2 h-4 w-4" aria-hidden="true"/>
          </button>
        </div>

        <div className="AssetCameraPanel AssetCameraPanel__setup-body-1 grid min-h-0 min-w-0 gap-3 p-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <div className="AssetCameraPanel AssetCameraPanel__setup-stream-1 grid min-h-0 min-w-0 place-items-center overflow-hidden rounded-md border border-border bg-neutral-950/90 p-2 [container-type:size]">
            <div className={cn("AssetCameraPanel AssetCameraPanel__setup-stream-frame-1 relative h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] touch-none overflow-hidden rounded-md border border-primary/60 bg-neutral-950 shadow-[0_0_42px_rgba(34,211,238,0.2)]", "cursor-crosshair", isDraggingRoi && "cursor-move")} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerCancel={onPointerCancel} onPointerUp={onPointerUp}>
              <div className="AssetCameraPanel AssetCameraPanel__setup-stream-grid-1 absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:34px_34px]"/>
              <CameraViewport focused={selectedCamera.id !== "default"} streamMessage={selectedCamera.streamMessage} streamState={selectedCamera.streamState} streamUrl={selectedCamera.streamUrl}>
                <DetectionOverlays parts={assetParts} draftPoints={draftPoints} draftRoi={draftRoi} isDraftVisible selectedPartId={selectedPartId}/>
              </CameraViewport>
            </div>
          </div>

          <aside className="AssetCameraPanel AssetCameraPanel__setup-side-1 flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-md border border-border bg-background p-3">
            <label className="AssetCameraPanel AssetCameraPanel__setup-field-1 grid min-w-0 gap-1">
              <span className="AssetCameraPanel AssetCameraPanel__setup-label-1 text-[11px] font-semibold text-muted-foreground">
                이름
              </span>
              <input className="AssetCameraPanel AssetCameraPanel__setup-input-1 h-9 min-w-0 rounded-md border border-border bg-card px-2 text-sm font-semibold outline-none" value={draftName} onChange={(event) => onDraftNameChange(event.target.value)}/>
            </label>

            <div className="AssetCameraPanel AssetCameraPanel__setup-group-1 grid gap-1" role="group" aria-label="지정 방식">
              <span className="AssetCameraPanel AssetCameraPanel__setup-label-2 text-[11px] font-semibold text-muted-foreground">
                지정 방식
              </span>
              <div className="AssetCameraPanel AssetCameraPanel__setup-modes-1 grid grid-cols-2 gap-1.5">
                <ModeButton active={selectionMode === "area"} icon={SquareDashedMousePointer} label="영역" onClick={() => onSelectionModeChange("area")}/>
                <ModeButton active={selectionMode === "points"} icon={MousePointer2} label="포인트" onClick={() => onSelectionModeChange("points")}/>
              </div>
            </div>

            <div className="AssetCameraPanel AssetCameraPanel__setup-group-2 grid gap-1" role="group" aria-label="임계치">
              <span className="AssetCameraPanel AssetCameraPanel__setup-label-3 text-[11px] font-semibold text-muted-foreground">
                임계치
              </span>
              <div className="AssetCameraPanel AssetCameraPanel__setup-thresholds-1 grid grid-cols-2 gap-1.5">
                <ThresholdField label="온도" suffix="℃" value={draftThresholds.temperature} onChange={(temperature) => onDraftThresholdChange({
            ...draftThresholds,
            temperature,
        })}/>
                <ThresholdField label="초음파" suffix="dB" value={draftThresholds.ultrasoundDb} onChange={(ultrasoundDb) => onDraftThresholdChange({
            ...draftThresholds,
            ultrasoundDb,
        })}/>
              </div>
            </div>

            <div className="AssetCameraPanel AssetCameraPanel__setup-status-1 grid gap-1.5 rounded-md border border-border bg-card p-2">
              <DetectionSetupStatusRow label="방식" value={selectionMode === "area" ? "영역 ROI" : "포인트"}/>
              <DetectionSetupStatusRow label="지정" value={draftScopeLabel}/>
              <DetectionSetupStatusRow label="알림" value={`온도 ${draftThresholds.temperature}℃ · 초음파 ${draftThresholds.ultrasoundDb} dB`}/>
            </div>

            <div className="AssetCameraPanel AssetCameraPanel__setup-actions-1 mt-auto grid grid-cols-2 gap-1.5">
              <IconButton disabled={!canSave} icon={Check} label="저장" onClick={onSave} variant="primary"/>
              <IconButton icon={X} label="취소" onClick={onCancel}/>
            </div>
          </aside>
        </div>
      </div>
    </div>);
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
      <span className="ThresholdField ThresholdField__label-1 shrink-0 text-[10px] text-muted-foreground">
        {label}
      </span>
      <input className="ThresholdField ThresholdField__input-1 w-0 min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold outline-none" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))}/>
      <span className="ThresholdField ThresholdField__label-2 shrink-0 text-[10px] text-muted-foreground">
        {suffix}
      </span>
    </label>);
}
function CameraViewport({ children, focused, onOpenPreview, streamMessage = "스트림 대기", streamState = "idle", streamUrl, }) {
    const hasStream = Boolean(streamUrl);
    return (<div className="CameraViewport CameraViewport__container-1 relative h-full min-h-0 overflow-hidden bg-white/10">
      <div className="CameraViewport CameraViewport__container-4 relative grid h-full place-items-center text-white/80">
        {onOpenPreview ? (<button type="button" className="AssetCameraPanel AssetCameraPanel__button-1 absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-md border border-white/20 bg-black/45 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white" onClick={(event) => {
                event.stopPropagation();
                onOpenPreview();
            }} onPointerDown={(event) => event.stopPropagation()} title="캠 크게 보기">
            <Maximize2 className="AssetCameraPanel AssetCameraPanel__icon-2 h-4 w-4" aria-hidden="true"/>
          </button>) : null}
        {hasStream ? (<video className="CameraViewport CameraViewport__video-1 h-full w-full object-cover" src={streamUrl ?? undefined} autoPlay muted playsInline controls={streamState !== "live"}/>) : (<div className="CameraViewport CameraViewport__container-5 grid place-items-center gap-2">
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
