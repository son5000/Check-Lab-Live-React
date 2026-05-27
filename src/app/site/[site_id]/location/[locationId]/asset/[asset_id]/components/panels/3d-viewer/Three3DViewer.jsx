"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL_3D_FILE, DEFAULT_VIEWER_3D_CONFIG, } from "./constants";
import { Viewer3DOptionBar } from "./controls/Viewer3DOptionBar";
import { ViewerToolbar } from "./controls/ViewerToolbar";
import { useThreeBackground } from "./hooks/useThreeBackground";
import { useThreeCamera } from "./hooks/useThreeCamera";
import { useThreeLighting } from "./hooks/useThreeLighting";
import { useThreeModel } from "./hooks/useThreeModel";
import { useThreeScene } from "./hooks/useThreeScene";
const EMPTY_ANALYSIS_TARGETS = [];
export function Three3DViewer({ activeAnalysisMode, allowOptionBar = true, analysisSummary, analysisTargets = EMPTY_ANALYSIS_TARGETS, className, config, initialConfig = DEFAULT_VIEWER_3D_CONFIG, modelFile, onAnalysisTargetCreate, onAnalysisTargetSelect, onConfigChange, onModelFileChange, selectedAnalysisTargetId, }) {
    const containerRef = useRef(null);
    const projectedTargetsKeyRef = useRef("");
    const raycasterRef = useRef(new THREE.Raycaster());
    const [internalConfig, setInternalConfig] = useState(initialConfig);
    const [internalModelFile, setInternalModelFile] = useState(modelFile ?? DEFAULT_MODEL_3D_FILE);
    const [analysisPointerState, setAnalysisPointerState] = useState();
    const [projectedTargets, setProjectedTargets] = useState([]);
    const resolvedConfig = config ?? internalConfig;
    const resolvedModelFile = modelFile ?? internalModelFile;
    const { cameraRef, controlsRef, rendererRef, sceneRef } = useThreeScene(containerRef, resolvedConfig);
    const { loadState, modelRef } = useThreeModel(sceneRef, resolvedModelFile, resolvedConfig.model);
    useThreeCamera(cameraRef, controlsRef, resolvedConfig.camera, resolvedConfig.controls);
    useThreeLighting(sceneRef, resolvedConfig.lighting);
    useThreeBackground(sceneRef, resolvedConfig.background);
    useEffect(() => {
        if (modelFile) {
            setInternalModelFile(modelFile);
        }
    }, [modelFile]);
    const handleConfigChange = (nextConfig) => {
        if (!config) {
            setInternalConfig(nextConfig);
        }
        onConfigChange?.(nextConfig);
    };
    const handleModelFileChange = (nextModelFile) => {
        if (!modelFile) {
            setInternalModelFile(nextModelFile);
        }
        onModelFileChange?.(nextModelFile);
    };
    const handleReset = () => {
        handleConfigChange(initialConfig);
    };
    const showOptionBar = allowOptionBar && (resolvedConfig.controls?.showOptionBar ?? true);
    const canCreateAnalysisTarget = Boolean(activeAnalysisMode &&
        onAnalysisTargetCreate &&
        !loadState.isLoading &&
        !loadState.error);
    const selectedProjectedTarget = selectedAnalysisTargetId
        ? projectedTargets.find((target) => target.id === selectedAnalysisTargetId)
        : undefined;
    const analysisDragRect = useMemo(() => analysisPointerState?.mode === "area"
        ? getAnalysisDragRect(analysisPointerState, rendererRef.current?.domElement.getBoundingClientRect())
        : undefined, [analysisPointerState, rendererRef]);
    useEffect(() => {
        if (!analysisTargets.length) {
            if (projectedTargetsKeyRef.current) {
                projectedTargetsKeyRef.current = "";
                setProjectedTargets([]);
            }
            return;
        }
        let animationFrameId = 0;
        const projectTargets = () => {
            const camera = cameraRef.current;
            const renderer = rendererRef.current;
            if (!camera || !renderer) {
                animationFrameId = window.requestAnimationFrame(projectTargets);
                return;
            }
            const nextTargets = analysisTargets.map((target) => projectAnalysisTarget(target, camera));
            const nextKey = getProjectedTargetsKey(nextTargets);
            if (projectedTargetsKeyRef.current !== nextKey) {
                projectedTargetsKeyRef.current = nextKey;
                setProjectedTargets(nextTargets);
            }
            animationFrameId = window.requestAnimationFrame(projectTargets);
        };
        projectTargets();
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [analysisTargets, cameraRef, rendererRef]);
    const getWorldHit = (clientPoint) => {
        const camera = cameraRef.current;
        const model = modelRef.current;
        const renderer = rendererRef.current;
        if (!camera || !model || !renderer) {
            return undefined;
        }
        return getWorldHitFromClientPoint({
            camera,
            clientPoint,
            model,
            raycaster: raycasterRef.current,
            renderer,
        });
    };
    const restoreControls = () => {
        if (controlsRef.current) {
            controlsRef.current.enabled = true;
        }
    };
    const handleAnalysisPointerDown = (event) => {
        if (!canCreateAnalysisTarget || !activeAnalysisMode) {
            return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        if (controlsRef.current) {
            controlsRef.current.enabled = false;
        }
        const clientPoint = { x: event.clientX, y: event.clientY };
        setAnalysisPointerState({
            currentClient: clientPoint,
            mode: activeAnalysisMode,
            pointerId: event.pointerId,
            startClient: clientPoint,
            startHit: getWorldHit(clientPoint),
        });
    };
    const handleAnalysisPointerMove = (event) => {
        if (!analysisPointerState || event.pointerId !== analysisPointerState.pointerId) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        setAnalysisPointerState({
            ...analysisPointerState,
            currentClient: { x: event.clientX, y: event.clientY },
        });
    };
    const handleAnalysisPointerUp = (event) => {
        if (!analysisPointerState || event.pointerId !== analysisPointerState.pointerId) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        const draft = buildAnalysisDraft(analysisPointerState, { x: event.clientX, y: event.clientY }, getWorldHit);
        restoreControls();
        setAnalysisPointerState(undefined);
        if (draft) {
            const previewImageDataUrl = captureAnalysisPreviewImage({
                camera: cameraRef.current,
                endClient: { x: event.clientX, y: event.clientY },
                renderer: rendererRef.current,
                scene: sceneRef.current,
                state: analysisPointerState,
            });
            onAnalysisTargetCreate?.(previewImageDataUrl ? { ...draft, previewImageDataUrl } : draft);
        }
    };
    const handleAnalysisPointerCancel = (event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        restoreControls();
        setAnalysisPointerState(undefined);
    };
    return (<div className={cn("Three3DViewer Three3DViewer__root-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground", className)}>
      <ViewerToolbar allowOptionBar={allowOptionBar} config={resolvedConfig} modelFile={resolvedModelFile} onChange={handleConfigChange} onReset={handleReset}/>

      <div className={cn("Three3DViewer Three3DViewer__body-1 grid min-h-0 min-w-0 flex-1 grid-cols-1", showOptionBar &&
            "grid-rows-[minmax(10rem,1fr)_minmax(0,16rem)] md:grid-cols-[minmax(0,1fr)_18rem] md:grid-rows-[minmax(0,1fr)]")}>
        <div className="Three3DViewer Three3DViewer__stage-1 relative min-h-0 min-w-0 overflow-hidden bg-neutral-950 md:min-h-[14rem]">
          <div ref={containerRef} className="Three3DViewer Three3DViewer__canvas-host-1 h-full min-h-0 w-full"/>
          <AnalysisOverlay analysisSummary={analysisSummary} analysisTargets={analysisTargets} projectedTargets={projectedTargets} selectedProjectedTarget={selectedProjectedTarget} selectedTargetId={selectedAnalysisTargetId} onSelect={onAnalysisTargetSelect}/>
          {canCreateAnalysisTarget ? (<div className={cn("Three3DViewer Three3DViewer__analysis-capture-1 absolute inset-0 z-20 touch-none", activeAnalysisMode === "point" && "cursor-crosshair", activeAnalysisMode === "area" && "cursor-crosshair")} onPointerCancel={handleAnalysisPointerCancel} onPointerDown={handleAnalysisPointerDown} onPointerMove={handleAnalysisPointerMove} onPointerUp={handleAnalysisPointerUp}>
              {analysisDragRect ? (<div className="Three3DViewer Three3DViewer__analysis-drag-1 pointer-events-none absolute rounded-sm border border-cyan-200 bg-cyan-300/15 shadow-[0_0_18px_rgba(103,232,249,0.26)]" style={{
                    height: `${analysisDragRect.height}%`,
                    left: `${analysisDragRect.left}%`,
                    top: `${analysisDragRect.top}%`,
                    width: `${analysisDragRect.width}%`,
                }}/>) : null}
            </div>) : null}
          {loadState.isLoading || loadState.error ? (<ViewerLoadState error={loadState.error} isLoading={loadState.isLoading}/>) : null}
        </div>

        {showOptionBar ? (<Viewer3DOptionBar config={resolvedConfig} modelFile={resolvedModelFile} onConfigChange={handleConfigChange} onModelFileChange={handleModelFileChange}/>) : null}
      </div>
    </div>);
}
function AnalysisOverlay({ analysisSummary, analysisTargets, onSelect, projectedTargets, selectedProjectedTarget, selectedTargetId, }) {
    const calloutRef = useRef(null);
    const rootRef = useRef(null);
    const [overlayMetrics, setOverlayMetrics] = useState();
    const projectedTargetById = useMemo(() => new Map(projectedTargets.map((target) => [target.id, target])), [projectedTargets]);
    const connectorGeometry = selectedProjectedTarget?.visible && analysisSummary
        ? getCalloutConnectorGeometry(selectedProjectedTarget, overlayMetrics)
        : undefined;
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return undefined;
        }
        let frameId = 0;
        const updateMetrics = () => {
            frameId = 0;
            const rootRect = root.getBoundingClientRect();
            const calloutRect = calloutRef.current?.getBoundingClientRect();
            const nextMetrics = {
                calloutRect: calloutRect
                    ? {
                        bottom: roundOverlayValue(calloutRect.bottom - rootRect.top),
                        height: roundOverlayValue(calloutRect.height),
                        left: roundOverlayValue(calloutRect.left - rootRect.left),
                        right: roundOverlayValue(calloutRect.right - rootRect.left),
                        top: roundOverlayValue(calloutRect.top - rootRect.top),
                        width: roundOverlayValue(calloutRect.width),
                    }
                    : undefined,
                height: roundOverlayValue(rootRect.height),
                width: roundOverlayValue(rootRect.width),
            };
            setOverlayMetrics((currentMetrics) => areOverlayMetricsEqual(currentMetrics, nextMetrics)
                ? currentMetrics
                : nextMetrics);
        };
        const scheduleMetricsUpdate = () => {
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
            frameId = window.requestAnimationFrame(updateMetrics);
        };
        scheduleMetricsUpdate();
        const resizeObserver = new ResizeObserver(scheduleMetricsUpdate);
        resizeObserver.observe(root);
        if (calloutRef.current) {
            resizeObserver.observe(calloutRef.current);
        }
        window.addEventListener("resize", scheduleMetricsUpdate);
        return () => {
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
            window.removeEventListener("resize", scheduleMetricsUpdate);
            resizeObserver.disconnect();
        };
    }, [analysisSummary, selectedProjectedTarget?.visible, selectedTargetId]);
    if (!analysisTargets.length && !analysisSummary) {
        return null;
    }
    return (<div ref={rootRef} className="AnalysisOverlay AnalysisOverlay__root-1 pointer-events-none absolute inset-0 z-30">
      <svg className="AnalysisOverlay AnalysisOverlay__lines-1 absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${connectorGeometry?.width ?? 1} ${connectorGeometry?.height ?? 1}`} aria-hidden="true">
        {connectorGeometry ? (<>
            <path d={connectorGeometry.path} fill="none" stroke="rgba(2, 6, 23, 0.68)" strokeDasharray="8 5" strokeLinecap="butt" strokeLinejoin="miter" strokeWidth="3.6" vectorEffect="non-scaling-stroke"/>
            <path d={connectorGeometry.path} fill="none" stroke="rgba(125, 211, 252, 0.82)" strokeDasharray="8 5" strokeLinecap="butt" strokeLinejoin="miter" strokeWidth="1.55" vectorEffect="non-scaling-stroke"/>
          </>) : null}
      </svg>

      {analysisTargets.map((target, index) => {
            const projectedTarget = projectedTargetById.get(target.id);
            if (!projectedTarget?.visible) {
                return null;
            }
            const selected = target.id === selectedTargetId;
            if (target.kind === "area" && projectedTarget.rect) {
                return (<button key={target.id} type="button" className={cn("AnalysisOverlay AnalysisOverlay__area-1 pointer-events-auto absolute overflow-hidden rounded-sm border bg-cyan-300/[0.12] text-left shadow-[0_0_18px_rgba(103,232,249,0.2)] transition hover:bg-cyan-300/20", selected
                        ? "border-lime-200 bg-lime-300/20 shadow-[0_0_24px_rgba(190,242,100,0.36)]"
                        : "border-cyan-200/80")} onClick={(event) => {
                        event.stopPropagation();
                        onSelect?.(target.id);
                    }} onPointerDown={(event) => event.stopPropagation()} style={{
                        height: `${projectedTarget.rect.height}%`,
                        left: `${projectedTarget.rect.left}%`,
                        minHeight: "2rem",
                        minWidth: "2.75rem",
                        top: `${projectedTarget.rect.top}%`,
                        width: `${projectedTarget.rect.width}%`,
                    }} title={target.name}>
              <span className="AnalysisOverlay AnalysisOverlay__area-label-1 absolute left-1 top-1 max-w-[calc(100%-0.5rem)] truncate rounded-sm bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white">
                {target.name}
              </span>
            </button>);
            }
            return (<button key={target.id} type="button" className={cn("AnalysisOverlay AnalysisOverlay__point-1 pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[10px] font-bold shadow-[0_0_18px_rgba(103,232,249,0.26)] transition hover:scale-105", selected
                    ? "border-lime-200 bg-lime-300 text-neutral-950"
                    : "border-cyan-200 bg-cyan-300 text-neutral-950")} onClick={(event) => {
                    event.stopPropagation();
                    onSelect?.(target.id);
                }} onPointerDown={(event) => event.stopPropagation()} style={{
                    left: `${projectedTarget.left}%`,
                    top: `${projectedTarget.top}%`,
                }} title={target.name}>
            {index + 1}
          </button>);
        })}

      {selectedProjectedTarget?.visible && analysisSummary ? (<div ref={calloutRef} className="AnalysisOverlay AnalysisOverlay__callout-1 absolute right-3 top-3 z-40 grid w-[min(19rem,calc(100%-1.5rem))] gap-2 rounded-md border border-cyan-200/35 bg-neutral-950/[0.78] p-3 text-white shadow-2xl backdrop-blur-md">
          <div className="AnalysisOverlay AnalysisOverlay__callout-header-1 min-w-0">
            <p className="AnalysisOverlay AnalysisOverlay__callout-title-1 truncate text-xs font-semibold">
              {analysisSummary.title}
            </p>
            <p className="AnalysisOverlay AnalysisOverlay__callout-subtitle-1 truncate font-mono text-[10px] text-cyan-100/80">
              {analysisSummary.subtitle}
            </p>
          </div>

          <div className="AnalysisOverlay AnalysisOverlay__metric-grid-1 grid grid-cols-3 gap-1.5">
            <AnalysisMetric label="최고" value={`${analysisSummary.temperatureMax}℃`}/>
            <AnalysisMetric label="평균" value={`${analysisSummary.temperatureAverage}℃`}/>
            <AnalysisMetric label="최저" value={`${analysisSummary.temperatureMin}℃`}/>
            <AnalysisMetric label="검출" value={`${analysisSummary.ultrasoundDetectedDb} dB`}/>
            <AnalysisMetric label="Peak" value={`${analysisSummary.ultrasoundPeakDb} dB`}/>
            <AnalysisMetric label="추이" value={analysisSummary.trendLabel}/>
          </div>
        </div>) : null}
    </div>);
}
function AnalysisMetric({ label, value }) {
    return (<div className="AnalysisMetric AnalysisMetric__tile-1 min-w-0 rounded-sm border border-white/10 bg-white/[0.08] px-1.5 py-1">
      <p className="AnalysisMetric AnalysisMetric__label-1 truncate text-[9px] font-semibold text-cyan-100/75">
        {label}
      </p>
      <p className="AnalysisMetric AnalysisMetric__value-1 truncate font-mono text-[11px] font-semibold text-white">
        {value}
      </p>
    </div>);
}
function ViewerLoadState({ error, isLoading, }) {
    return (<div className="ViewerLoadState ViewerLoadState__overlay-1 pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/30 text-white">
      <div className="ViewerLoadState ViewerLoadState__content-1 grid min-w-0 place-items-center gap-2 rounded-md border border-white/15 bg-black/50 px-3 py-2 text-center backdrop-blur-sm">
        {isLoading ? (<Loader2 className="ViewerLoadState ViewerLoadState__icon-1 h-5 w-5 animate-spin" aria-hidden="true"/>) : (<AlertTriangle className="ViewerLoadState ViewerLoadState__icon-2 h-5 w-5 text-amber-200" aria-hidden="true"/>)}
        <p className="ViewerLoadState ViewerLoadState__text-1 max-w-[14rem] text-xs font-semibold">
          {isLoading ? "3D 모델 로드 중" : error}
        </p>
      </div>
    </div>);
}
function getWorldHitFromClientPoint({ camera, clientPoint, model, raycaster, renderer, }) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientPoint.x - rect.left) / rect.width) * 2 - 1, -(((clientPoint.y - rect.top) / rect.height) * 2 - 1));
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(model, true).at(0)?.point.clone();
}
function buildAnalysisDraft(state, endClient, getWorldHit) {
    const travelDistance = getClientDistance(state.startClient, endClient);
    const endHit = getWorldHit(endClient) ?? state.startHit;
    if (!endHit) {
        return undefined;
    }
    if (state.mode === "point") {
        return {
            kind: "point",
            worldPosition: toVector3(endHit),
        };
    }
    if (travelDistance < 18) {
        return undefined;
    }
    const startHit = state.startHit ?? getWorldHit(state.startClient);
    const centerClient = {
        x: (state.startClient.x + endClient.x) / 2,
        y: (state.startClient.y + endClient.y) / 2,
    };
    const centerHit = getWorldHit(centerClient) ?? endHit;
    return {
        kind: "area",
        worldArea: startHit
            ? {
                end: toVector3(endHit),
                start: toVector3(startHit),
            }
            : undefined,
        worldPosition: toVector3(centerHit),
    };
}
function captureAnalysisPreviewImage({ camera, endClient, renderer, scene, state, }) {
    if (!camera || !renderer || !scene) {
        return undefined;
    }
    const sourceCanvas = renderer.domElement;
    const bounds = sourceCanvas.getBoundingClientRect();
    if (!bounds.width ||
        !bounds.height ||
        !sourceCanvas.width ||
        !sourceCanvas.height) {
        return undefined;
    }
    const captureRect = getAnalysisCaptureClientRect(state, endClient, bounds);
    const scaleX = sourceCanvas.width / bounds.width;
    const scaleY = sourceCanvas.height / bounds.height;
    const sourceX = Math.round((captureRect.left - bounds.left) * scaleX);
    const sourceY = Math.round((captureRect.top - bounds.top) * scaleY);
    const sourceWidth = Math.max(1, Math.round(captureRect.width * scaleX));
    const sourceHeight = Math.max(1, Math.round(captureRect.height * scaleY));
    const outputScale = Math.min(1, 480 / Math.max(sourceWidth, sourceHeight));
    const outputCanvas = document.createElement("canvas");
    const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale));
    renderer.render(scene, camera);
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    const context = outputCanvas.getContext("2d");
    if (!context) {
        return undefined;
    }
    context.drawImage(sourceCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
    drawAnalysisCaptureOverlay(context, {
        captureRect,
        endClient,
        outputHeight,
        outputWidth,
        state,
    });
    try {
        return outputCanvas.toDataURL("image/png");
    }
    catch {
        return undefined;
    }
}
function getAnalysisCaptureClientRect(state, endClient, bounds) {
    if (state.mode === "point") {
        const minSide = Math.min(bounds.width, bounds.height);
        const size = clamp(minSide * 0.3, 96, 180);
        return clampCaptureClientRect(endClient.x - size / 2, endClient.y - size / 2, size, size, bounds);
    }
    const left = Math.min(state.startClient.x, endClient.x);
    const top = Math.min(state.startClient.y, endClient.y);
    const width = Math.abs(endClient.x - state.startClient.x);
    const height = Math.abs(endClient.y - state.startClient.y);
    const margin = clamp(Math.max(width, height) * 0.32, 32, 96);
    return clampCaptureClientRect(left - margin, top - margin, width + margin * 2, height + margin * 2, bounds);
}
function clampCaptureClientRect(left, top, width, height, bounds) {
    const clampedWidth = Math.min(Math.max(width, 1), bounds.width);
    const clampedHeight = Math.min(Math.max(height, 1), bounds.height);
    return {
        height: clampedHeight,
        left: clamp(left, bounds.left, bounds.right - clampedWidth),
        top: clamp(top, bounds.top, bounds.bottom - clampedHeight),
        width: clampedWidth,
    };
}
function drawAnalysisCaptureOverlay(context, { captureRect, endClient, outputHeight, outputWidth, state, }) {
    const scaleX = outputWidth / captureRect.width;
    const scaleY = outputHeight / captureRect.height;
    if (state.mode === "point") {
        const x = (endClient.x - captureRect.left) * scaleX;
        const y = (endClient.y - captureRect.top) * scaleY;
        const radius = Math.max(8, Math.min(outputWidth, outputHeight) * 0.055);
        context.save();
        context.fillStyle = "rgba(34, 211, 238, 0.9)";
        context.strokeStyle = "rgba(255, 255, 255, 0.92)";
        context.lineWidth = Math.max(2, radius * 0.28);
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
        return;
    }
    const left = (Math.min(state.startClient.x, endClient.x) - captureRect.left) * scaleX;
    const top = (Math.min(state.startClient.y, endClient.y) - captureRect.top) * scaleY;
    const width = Math.abs(endClient.x - state.startClient.x) * scaleX;
    const height = Math.abs(endClient.y - state.startClient.y) * scaleY;
    const lineWidth = Math.max(2, Math.min(outputWidth, outputHeight) * 0.014);
    context.save();
    context.fillStyle = "rgba(103, 232, 249, 0.14)";
    context.strokeStyle = "rgba(165, 243, 252, 0.95)";
    context.lineWidth = lineWidth;
    context.shadowColor = "rgba(34, 211, 238, 0.45)";
    context.shadowBlur = lineWidth * 4;
    context.fillRect(left, top, width, height);
    context.strokeRect(left, top, width, height);
    context.restore();
}
function getAnalysisDragRect(state, bounds) {
    if (!bounds) {
        return undefined;
    }
    const start = clientToPercentPoint(state.startClient, bounds);
    const current = clientToPercentPoint(state.currentClient, bounds);
    const left = Math.min(start.x, current.x);
    const top = Math.min(start.y, current.y);
    return {
        height: Math.abs(current.y - start.y),
        left,
        top,
        width: Math.abs(current.x - start.x),
    };
}
function projectAnalysisTarget(target, camera) {
    const center = projectVector(target.worldPosition, camera);
    const rect = target.kind === "area" ? projectAnalysisArea(target, camera, center) : undefined;
    return {
        id: target.id,
        left: center.left,
        rect,
        top: center.top,
        visible: center.visible,
    };
}
function projectAnalysisArea(target, camera, center) {
    if (!center.visible) {
        return undefined;
    }
    if (!target.worldArea) {
        return getCenteredRect(center, 10, 10);
    }
    const start = projectVector(target.worldArea.start, camera);
    const end = projectVector(target.worldArea.end, camera);
    const visiblePoints = [start, end, center].filter((point) => point.visible);
    if (!visiblePoints.length) {
        return getCenteredRect(center, 10, 10);
    }
    const minLeft = Math.min(...visiblePoints.map((point) => point.left));
    const maxLeft = Math.max(...visiblePoints.map((point) => point.left));
    const minTop = Math.min(...visiblePoints.map((point) => point.top));
    const maxTop = Math.max(...visiblePoints.map((point) => point.top));
    const width = Math.min(42, Math.max(7, maxLeft - minLeft));
    const height = Math.min(42, Math.max(7, maxTop - minTop));
    return {
        height,
        left: clamp(minLeft, 0, 100 - width),
        top: clamp(minTop, 0, 100 - height),
        width,
    };
}
function projectVector(vector, camera) {
    const projected = new THREE.Vector3(vector.x, vector.y, vector.z).project(camera);
    return {
        id: "",
        left: clamp((projected.x + 1) * 50, 0, 100),
        top: clamp((1 - projected.y) * 50, 0, 100),
        visible: projected.z >= -1 && projected.z <= 1,
    };
}
function getCenteredRect(center, width, height) {
    return {
        height,
        left: clamp(center.left - width / 2, 0, 100 - width),
        top: clamp(center.top - height / 2, 0, 100 - height),
        width,
    };
}
function getCalloutConnectorGeometry(target, overlayMetrics) {
    if (!overlayMetrics?.width ||
        !overlayMetrics.height ||
        !overlayMetrics.calloutRect) {
        return undefined;
    }
    const start = {
        x: roundOverlayValue((target.left / 100) * overlayMetrics.width),
        y: roundOverlayValue((target.top / 100) * overlayMetrics.height),
    };
    const anchor = getNearestRectAnchor(start, overlayMetrics.calloutRect);
    return {
        anchor,
        height: overlayMetrics.height,
        path: getConnectorPath(start, anchor),
        start,
        width: overlayMetrics.width,
    };
}
function getNearestRectAnchor(point, rect) {
    const padding = Math.min(18, Math.max(8, Math.min(rect.width, rect.height) * 0.12));
    const safeLeft = rect.left + padding;
    const safeRight = rect.right - padding;
    const safeTop = rect.top + padding;
    const safeBottom = rect.bottom - padding;
    const candidates = [
        {
            x: rect.left,
            y: clamp(point.y, safeTop, safeBottom),
        },
        {
            x: rect.right,
            y: clamp(point.y, safeTop, safeBottom),
        },
        {
            x: clamp(point.x, safeLeft, safeRight),
            y: rect.top,
        },
        {
            x: clamp(point.x, safeLeft, safeRight),
            y: rect.bottom,
        },
    ];
    const anchor = candidates.reduce((nearest, candidate) => getPointDistance(point, candidate) < getPointDistance(point, nearest)
        ? candidate
        : nearest);
    return {
        x: roundOverlayValue(anchor.x),
        y: roundOverlayValue(anchor.y),
    };
}
function getConnectorPath(start, anchor) {
    const elbowX = start.x + (anchor.x - start.x) * 0.55;
    return [
        "M",
        roundOverlayValue(start.x),
        roundOverlayValue(start.y),
        "L",
        roundOverlayValue(elbowX),
        roundOverlayValue(start.y),
        "L",
        roundOverlayValue(elbowX),
        roundOverlayValue(anchor.y),
        "L",
        roundOverlayValue(anchor.x),
        roundOverlayValue(anchor.y),
    ].join(" ");
}
function getPointDistance(firstPoint, secondPoint) {
    return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}
function areOverlayMetricsEqual(currentMetrics, nextMetrics) {
    if (!currentMetrics) {
        return false;
    }
    return currentMetrics.width === nextMetrics.width &&
        currentMetrics.height === nextMetrics.height &&
        areOverlayRectsEqual(currentMetrics.calloutRect, nextMetrics.calloutRect);
}
function areOverlayRectsEqual(currentRect, nextRect) {
    if (!currentRect || !nextRect) {
        return currentRect === nextRect;
    }
    return currentRect.bottom === nextRect.bottom &&
        currentRect.height === nextRect.height &&
        currentRect.left === nextRect.left &&
        currentRect.right === nextRect.right &&
        currentRect.top === nextRect.top &&
        currentRect.width === nextRect.width;
}
function roundOverlayValue(value) {
    return Number(value.toFixed(2));
}
function getProjectedTargetsKey(targets) {
    return targets
        .map((target) => [
        target.id,
        target.visible ? 1 : 0,
        target.left.toFixed(1),
        target.top.toFixed(1),
        target.rect?.left.toFixed(1) ?? "",
        target.rect?.top.toFixed(1) ?? "",
        target.rect?.width.toFixed(1) ?? "",
        target.rect?.height.toFixed(1) ?? "",
    ].join(":"))
        .join("|");
}
function clientToPercentPoint(point, bounds) {
    return {
        x: clamp(((point.x - bounds.left) / bounds.width) * 100, 0, 100),
        y: clamp(((point.y - bounds.top) / bounds.height) * 100, 0, 100),
    };
}
function getClientDistance(firstPoint, secondPoint) {
    return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}
function toVector3(vector) {
    return {
        x: round(vector.x),
        y: round(vector.y),
        z: round(vector.z),
    };
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function round(value) {
    return Number(value.toFixed(3));
}
