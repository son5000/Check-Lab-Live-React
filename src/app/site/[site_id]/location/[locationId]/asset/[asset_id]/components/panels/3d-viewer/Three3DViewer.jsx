"use client";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import {
  AlertTriangle,
  Loader2,
  MousePointer2,
  RotateCcw,
  SquareDashedMousePointer,
} from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL_3D_FILE, DEFAULT_VIEWER_3D_CONFIG } from "./constants";
import { Viewer3DOptionBar } from "./controls/Viewer3DOptionBar";
import { ViewerToolbar } from "./controls/ViewerToolbar";
import { useThreeBackground } from "./hooks/useThreeBackground";
import { useThreeCamera } from "./hooks/useThreeCamera";
import { useThreeLighting } from "./hooks/useThreeLighting";
import { useThreeModel } from "./hooks/useThreeModel";
import { useThreeScene } from "./hooks/useThreeScene";
import { useThreeCameraVisualization } from "./hooks/useThreeCameraVisualization";
import { CameraListOverlay } from "./components/CameraListOverlay";
import { getCameraPreset } from "./constants/cameraPresets";
const EMPTY_ANALYSIS_TARGETS = [];
const RESIZE_HANDLES = ["nw", "ne", "se", "sw"];
const WORLD_PREVIEW_CAMERA_FOV = 50;
const WORLD_PREVIEW_CAMERA_BACK_OFFSET_RATIO = 0.6;
const WORLD_PREVIEW_CAMERA_MIN_BACK_OFFSET = 18;
const WORLD_PREVIEW_CAMERA_PADDING = 1.18;
const WORLD_PREVIEW_MIN_RADIUS = 82;
const WORLD_POPUP_POS_KEY = "three3d_world_popup_pos";
export const Three3DViewer = forwardRef(function Three3DViewer(
  {
    activeAnalysisMode,
    allowOptionBar = true,
    analysisSummary,
    analysisTargets = EMPTY_ANALYSIS_TARGETS,
    className,
    config,
    initialConfig = DEFAULT_VIEWER_3D_CONFIG,
    modelFile,
    onAnalysisModeChange,
    onAnalysisTargetCreate,
    onAnalysisTargetSelect,
    onAnalysisTargetUpdate,
    onConfigChange,
    onModelFileChange,
    selectedAnalysisTargetId,
    showCameraOverlays = true,
    onAnalysisItemCameraFocus,
  },
  ref,
) {
  const containerRef = useRef(null);
  const cameraImageCanvasRef = useRef(null);
  const cameraImageElementRef = useRef(null);
  const analysisEditStateRef = useRef();
  const projectedTargetsKeyRef = useRef("");
  const raycasterRef = useRef(new THREE.Raycaster());
  const worldPreviewSnapshotFrameRef = useRef(0);
  const [internalConfig, setInternalConfig] = useState(initialConfig);
  const [internalModelFile, setInternalModelFile] = useState(
    modelFile ?? DEFAULT_MODEL_3D_FILE,
  );
  const [analysisPointerState, setAnalysisPointerState] = useState();
  const [analysisEditState, setAnalysisEditState] = useState();
  const [cameraFrameVersion, setCameraFrameVersion] = useState(0);
  const [projectedTargets, setProjectedTargets] = useState([]);
  const [worldPreviewSnapshot, setWorldPreviewSnapshot] = useState("");
  const [worldPopupPos, setWorldPopupPos] = useState(() => {
    try {
      const saved = localStorage.getItem(WORLD_POPUP_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.left === "number" &&
          typeof parsed?.top === "number"
        ) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const worldPopupRef = useRef(null);
  const worldPopupDragRef = useRef(null);
  const resolvedConfig = config ?? internalConfig;
  const resolvedModelFile = modelFile ?? internalModelFile;
  const resolvedCameraVisualizationConfig =
    resolvedConfig.cameraVisualization ??
    DEFAULT_VIEWER_3D_CONFIG.cameraVisualization;
  const { cameraRef, controlsRef, rendererRef, sceneRef } = useThreeScene(
    containerRef,
    resolvedConfig,
  );
  const { loadState, modelRef } = useThreeModel(
    sceneRef,
    resolvedModelFile,
    resolvedConfig.model,
  );
  useThreeCamera(
    cameraRef,
    controlsRef,
    resolvedConfig.camera,
    resolvedConfig.controls,
  );
  useThreeLighting(sceneRef, resolvedConfig.lighting);
  useThreeBackground(sceneRef, resolvedConfig.background);
  const {
    getCameraAtClientPoint: pickCameraAtClientPoint,
    setHoveredCameraId,
  } = useThreeCameraVisualization(sceneRef, resolvedCameraVisualizationConfig);
  useEffect(() => {
    if (modelFile) {
      setInternalModelFile(modelFile);
    }
  }, [modelFile]);
  const handleConfigChange = useCallback(
    (nextConfig) => {
      if (!config) {
        setInternalConfig(nextConfig);
      }
      onConfigChange?.(nextConfig);
    },
    [config, onConfigChange],
  );
  const handleModelFileChange = useCallback(
    (nextModelFile) => {
      if (!modelFile) {
        setInternalModelFile(nextModelFile);
      }
      onModelFileChange?.(nextModelFile);
    },
    [modelFile, onModelFileChange],
  );
  const handleReset = () => {
    handleConfigChange(initialConfig);
  };
  const selectedCameraForPreview =
    showCameraOverlays && resolvedCameraVisualizationConfig.selectedCameraId
      ? getCameraPreset(resolvedCameraVisualizationConfig.selectedCameraId)
      : undefined;
  const renderInteractionMode = selectedCameraForPreview ? "camera" : "world";
  const showOptionBar =
    allowOptionBar && (resolvedConfig.controls?.showOptionBar ?? true);
  const filteredAnalysisTargets = selectedCameraForPreview
    ? analysisTargets.filter(
        (target) => target.cameraId === selectedCameraForPreview.id,
      )
    : [];
  const canCreateAnalysisTarget = Boolean(
    activeAnalysisMode &&
    onAnalysisTargetCreate &&
    renderInteractionMode === "camera" &&
    selectedCameraForPreview,
  );
  const selectedProjectedTarget = selectedAnalysisTargetId
    ? projectedTargets.find((target) => target.id === selectedAnalysisTargetId)
    : undefined;
  const shouldRenderCameraListOverlay =
    showCameraOverlays && resolvedCameraVisualizationConfig.enabled;
  const shouldRenderEventLayer = canCreateAnalysisTarget;
  const shouldRenderAnalysisModeToolbar = Boolean(
    onAnalysisModeChange && selectedCameraForPreview,
  );
  const analysisDragRect = useMemo(
    () =>
      analysisPointerState?.mode === "area"
        ? getAnalysisDragRect(
            analysisPointerState,
            getInteractionSurfaceBounds({
              cameraCanvas: cameraImageCanvasRef.current,
              mode: renderInteractionMode,
              renderer: rendererRef.current,
            }),
          )
        : undefined,
    [analysisPointerState, renderInteractionMode, rendererRef],
  );
  useEffect(() => {
    if (!filteredAnalysisTargets.length) {
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
      const nextTargets = filteredAnalysisTargets.map((target) =>
        projectAnalysisTarget(target, {
          camera,
          cameraCanvas: cameraImageCanvasRef.current,
          image: cameraImageElementRef.current,
          mode: renderInteractionMode,
          selectedCameraId: selectedCameraForPreview?.id,
        }),
      );
      const nextKey = getProjectedTargetsKey(nextTargets);
      if (projectedTargetsKeyRef.current !== nextKey) {
        projectedTargetsKeyRef.current = nextKey;
        setProjectedTargets(nextTargets);
      }
      animationFrameId = window.requestAnimationFrame(projectTargets);
    };
    projectTargets();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [
    filteredAnalysisTargets,
    cameraFrameVersion,
    cameraRef,
    renderInteractionMode,
    rendererRef,
    selectedCameraForPreview?.id,
  ]);
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
  const getInteractionPoint = (clientPoint) => {
    if (renderInteractionMode === "camera") {
      return getCameraImageInteractionPoint({
        cameraId: selectedCameraForPreview?.id,
        canvas: cameraImageCanvasRef.current,
        clientPoint,
        image: cameraImageElementRef.current,
      });
    }
    return {
      clientPoint,
      mode: "world",
      worldPoint: getWorldHit(clientPoint),
    };
  };
  const getCameraAtClientPoint = useCallback(
    (clientPoint, previousCameraId) => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!camera || !renderer) {
        return null;
      }
      return pickCameraAtClientPoint({
        camera,
        clientPoint,
        previousCameraId,
        renderer,
      });
    },
    [cameraRef, pickCameraAtClientPoint, rendererRef],
  );
  const captureWorldPreviewSnapshot = useCallback(
    (selectedCamera) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      if (!selectedCamera || !camera || !controls || !renderer || !scene) {
        return "";
      }
      const previousCamera = getRuntimeCameraConfig(camera, controls);
      const previousAutoRotate = controls.autoRotate;
      const previousPauseAutoRotate =
        renderer.domElement.dataset.pauseAutoRotate;
      forceRendererSizeToContainer({
        camera,
        container: containerRef.current,
        renderer,
      });
      if (modelRef.current) {
        modelRef.current.visible = true;
      }
      const previewCamera = getWorldPreviewCameraConfig({
        container: containerRef.current,
        model: modelRef.current,
        overviewCamera: initialConfig.camera ?? DEFAULT_VIEWER_3D_CONFIG.camera,
        renderer,
        resolvedCamera: resolvedConfig.camera,
        selectedCamera,
      });
      applyRuntimeCameraConfig(camera, controls, previewCamera);
      controls.autoRotate = false;
      renderer.domElement.dataset.pauseAutoRotate = "true";
      renderer.render(scene, camera);
      let snapshot = "";
      try {
        snapshot = renderer.domElement.toDataURL("image/png");
      } catch {
        snapshot = "";
      }
      applyRuntimeCameraConfig(camera, controls, previousCamera);
      controls.autoRotate = previousAutoRotate;
      if (previousPauseAutoRotate === undefined) {
        delete renderer.domElement.dataset.pauseAutoRotate;
      } else {
        renderer.domElement.dataset.pauseAutoRotate = previousPauseAutoRotate;
      }
      renderer.render(scene, camera);
      return snapshot;
    },
    [
      cameraRef,
      controlsRef,
      initialConfig.camera,
      modelRef,
      rendererRef,
      sceneRef,
      resolvedConfig,
    ],
  );
  const resetToOverviewCamera = useCallback(() => {
    const overviewCamera =
      initialConfig.camera ?? DEFAULT_VIEWER_3D_CONFIG.camera;
    if (!cameraRef.current || !controlsRef.current) {
      return;
    }
    cameraRef.current.position.set(
      overviewCamera.position.x,
      overviewCamera.position.y,
      overviewCamera.position.z,
    );
    cameraRef.current.fov = overviewCamera.fov ?? cameraRef.current.fov;
    cameraRef.current.updateProjectionMatrix();
    controlsRef.current.target.set(
      overviewCamera.target.x,
      overviewCamera.target.y,
      overviewCamera.target.z,
    );
    controlsRef.current.update();
    handleConfigChange({
      ...resolvedConfig,
      autoRotate:
        initialConfig.autoRotate ?? DEFAULT_VIEWER_3D_CONFIG.autoRotate,
      camera: {
        ...resolvedConfig.camera,
        ...overviewCamera,
        position: { ...overviewCamera.position },
        target: { ...overviewCamera.target },
      },
      cameraVisualization: {
        ...resolvedCameraVisualizationConfig,
        enabled: true,
        selectedCameraId: null,
        showAll: true,
      },
    });
    if (activeAnalysisMode) {
      onAnalysisModeChange?.(undefined);
    }
  }, [
    cameraRef,
    controlsRef,
    handleConfigChange,
    initialConfig,
    resolvedCameraVisualizationConfig,
    resolvedConfig,
    activeAnalysisMode,
    onAnalysisModeChange,
  ]);
  const switchToCamera = useCallback(
    (cameraId) => {
      const camera = getCameraPreset(cameraId);
      if (!camera) {
        return;
      }
      handleConfigChange({
        ...resolvedConfig,
        autoRotate: false,
        cameraVisualization: {
          ...resolvedCameraVisualizationConfig,
          enabled: true,
          selectedCameraId: cameraId,
          showAll: false,
        },
      });
    },
    [handleConfigChange, resolvedCameraVisualizationConfig, resolvedConfig],
  );
  useImperativeHandle(
    ref,
    () => ({
      switchToCamera,
      resetToOverviewCamera,
    }),
    [switchToCamera, resetToOverviewCamera],
  );
  useLayoutEffect(() => {
    setWorldPopupPos(null);
  }, [selectedCameraForPreview?.id]);
  useLayoutEffect(() => {
    if (!selectedCameraForPreview) {
      setWorldPreviewSnapshot("");
      return undefined;
    }
    if (loadState.isLoading || loadState.error) {
      return undefined;
    }
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    let isActive = true;
    setWorldPreviewSnapshot("");
    const capturePreview = () => {
      const snapshot = captureWorldPreviewSnapshot(selectedCameraForPreview);
      if (isActive && snapshot) {
        setWorldPreviewSnapshot(snapshot);
      }
    };
    const schedulePreviewRefresh = () => {
      if (worldPreviewSnapshotFrameRef.current) {
        window.cancelAnimationFrame(worldPreviewSnapshotFrameRef.current);
      }
      worldPreviewSnapshotFrameRef.current = window.requestAnimationFrame(
        () => {
          capturePreview();
          worldPreviewSnapshotFrameRef.current = window.requestAnimationFrame(
            () => {
              worldPreviewSnapshotFrameRef.current = 0;
              capturePreview();
            },
          );
        },
      );
    };
    const resizeObserver = new ResizeObserver(schedulePreviewRefresh);
    resizeObserver.observe(container);
    schedulePreviewRefresh();
    return () => {
      isActive = false;
      resizeObserver.disconnect();
      if (worldPreviewSnapshotFrameRef.current) {
        window.cancelAnimationFrame(worldPreviewSnapshotFrameRef.current);
        worldPreviewSnapshotFrameRef.current = 0;
      }
    };
  }, [
    captureWorldPreviewSnapshot,
    loadState.error,
    loadState.isLoading,
    modelRef,
    rendererRef,
    selectedCameraForPreview,
  ]);
  const handleCameraSelect = useCallback(
    (cameraId) => {
      if (cameraId === resolvedCameraVisualizationConfig.selectedCameraId) {
        resetToOverviewCamera();
        return;
      }
      switchToCamera(cameraId);
    },
    [
      resetToOverviewCamera,
      resolvedCameraVisualizationConfig.selectedCameraId,
      switchToCamera,
    ],
  );
  const handleCameraPreviewClose = useCallback(() => {
    resetToOverviewCamera();
  }, [resetToOverviewCamera]);
  const handleWorldPopupPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const popup = worldPopupRef.current;
    const container = containerRef.current;
    if (!popup || !container) return;
    const popupRect = popup.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    worldPopupDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origLeft: popupRect.left - containerRect.left,
      origTop: popupRect.top - containerRect.top,
    };
    popup.setPointerCapture(event.pointerId);
  }, []);
  const handleWorldPopupPointerMove = useCallback((event) => {
    const drag = worldPopupDragRef.current;
    const popup = worldPopupRef.current;
    const container = containerRef.current;
    if (!drag || !popup || !container) return;
    const containerRect = container.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const rawLeft = drag.origLeft + dx;
    const rawTop = drag.origTop + dy;
    const clampedLeft = Math.max(
      0,
      Math.min(rawLeft, containerRect.width - popupRect.width),
    );
    const clampedTop = Math.max(
      0,
      Math.min(rawTop, containerRect.height - popupRect.height),
    );
    setWorldPopupPos({ left: clampedLeft, top: clampedTop });
  }, []);
  const handleWorldPopupPointerUp = useCallback((event) => {
    const drag = worldPopupDragRef.current;
    worldPopupDragRef.current = null;
    if (worldPopupRef.current?.hasPointerCapture(event.pointerId)) {
      worldPopupRef.current.releasePointerCapture(event.pointerId);
    }
    if (drag) {
      setWorldPopupPos((pos) => {
        if (pos) {
          try {
            localStorage.setItem(WORLD_POPUP_POS_KEY, JSON.stringify(pos));
          } catch {}
        }
        return pos;
      });
    }
  }, []);
  useEffect(() => {
    if (!resolvedCameraVisualizationConfig.enabled || activeAnalysisMode) {
      return;
    }

    const canvas = rendererRef.current?.domElement;
    if (!canvas) {
      return;
    }

    const handleClick = (event) => {
      const camera = getCameraAtClientPoint(
        { x: event.clientX, y: event.clientY },
        null,
      );
      if (!camera) {
        return;
      }
      handleCameraSelect(camera);
    };

    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("click", handleClick);
    };
  }, [
    activeAnalysisMode,
    getCameraAtClientPoint,
    handleCameraSelect,
    rendererRef,
    resolvedCameraVisualizationConfig.enabled,
  ]);
  const handleCameraImageFrameChange = useCallback(() => {
    setCameraFrameVersion((currentVersion) => currentVersion + 1);
  }, []);
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
      interactionMode: renderInteractionMode,
      mode: activeAnalysisMode,
      pointerId: event.pointerId,
      startClient: clientPoint,
      startInteraction: getInteractionPoint(clientPoint),
    });
  };
  const handleAnalysisPointerMove = (event) => {
    if (
      !analysisPointerState ||
      event.pointerId !== analysisPointerState.pointerId
    ) {
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
    if (
      !analysisPointerState ||
      event.pointerId !== analysisPointerState.pointerId
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const endClient = { x: event.clientX, y: event.clientY };
    const draft = buildAnalysisDraft(
      analysisPointerState,
      endClient,
      getInteractionPoint,
    );
    restoreControls();
    setAnalysisPointerState(undefined);
    if (draft) {
      const previewImageDataUrl = captureAnalysisPreviewImage({
        cameraCanvas: cameraImageCanvasRef.current,
        camera: cameraRef.current,
        endClient,
        renderer: rendererRef.current,
        scene: sceneRef.current,
        state: analysisPointerState,
      });
      onAnalysisTargetCreate?.(
        previewImageDataUrl ? { ...draft, previewImageDataUrl } : draft,
      );
    }
  };
  const handleAnalysisPointerCancel = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    restoreControls();
    setAnalysisPointerState(undefined);
  };
  const handleAnalysisTargetPointerDown = (event, target, editMode) => {
    if (!onAnalysisTargetUpdate) {
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
    const nextEditState = {
      editMode,
      interactionMode: renderInteractionMode,
      pointerId: event.pointerId,
      startClient: clientPoint,
      startInteraction: getInteractionPoint(clientPoint),
      target,
    };
    analysisEditStateRef.current = nextEditState;
    setAnalysisEditState(nextEditState);
    onAnalysisTargetSelect?.(target.id);
  };
  const handleAnalysisTargetPointerMove = (event) => {
    const activeEditState = analysisEditStateRef.current;
    if (!activeEditState || event.pointerId !== activeEditState.pointerId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = buildEditedAnalysisTarget(
      activeEditState,
      { x: event.clientX, y: event.clientY },
      getInteractionPoint,
    );
    if (nextTarget) {
      onAnalysisTargetUpdate?.(nextTarget);
    }
  };
  const handleAnalysisTargetPointerUp = (event) => {
    const activeEditState = analysisEditStateRef.current;
    if (!activeEditState || event.pointerId !== activeEditState.pointerId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    restoreControls();
    analysisEditStateRef.current = undefined;
    setAnalysisEditState(undefined);
  };
  const handleAnalysisTargetPointerCancel = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    restoreControls();
    analysisEditStateRef.current = undefined;
    setAnalysisEditState(undefined);
  };
  return (
    <div
      className={cn(
        "Three3DViewer Three3DViewer__root-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <ViewerToolbar
        allowOptionBar={allowOptionBar}
        config={resolvedConfig}
        modelFile={resolvedModelFile}
        onChange={handleConfigChange}
        onReset={handleReset}
      />

      <div
        className={cn(
          "Three3DViewer Three3DViewer__body-1 grid min-h-0 min-w-0 flex-1 grid-cols-1",
          showOptionBar &&
            "grid-rows-[minmax(10rem,1fr)_minmax(0,16rem)] md:grid-cols-[minmax(0,1fr)_18rem] md:grid-rows-[minmax(0,1fr)]",
        )}
      >
        <div className="Three3DViewer Three3DViewer__stage-1 relative min-h-0 min-w-0 overflow-hidden bg-neutral-950 md:min-h-[14rem]">
          <div
            ref={containerRef}
            className={cn(
              "Three3DViewer Three3DViewer__canvas-host-1 absolute inset-0 z-0 h-full min-h-0 w-full",
              selectedCameraForPreview && "pointer-events-none opacity-0",
            )}
          />
          {selectedCameraForPreview ? (
            <CameraImageCanvas
              canvasRef={cameraImageCanvasRef}
              imageElementRef={cameraImageElementRef}
              imageUrl={selectedCameraForPreview.sampleImagePath}
              label={selectedCameraForPreview.name}
              onFrameChange={handleCameraImageFrameChange}
            />
          ) : null}
          {selectedCameraForPreview ? (
            <div
              ref={worldPopupRef}
              className="Three3DViewer Three3DViewer__world-host-1 pointer-events-auto absolute z-40 w-[min(38%,416px)] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-md border border-cyan-200/50 bg-neutral-950/90 p-2 shadow-2xl backdrop-blur-sm"
              style={
                worldPopupPos
                  ? { left: worldPopupPos.left, top: worldPopupPos.top }
                  : { left: "0.75rem", top: "0.75rem" }
              }
              onPointerDown={handleWorldPopupPointerDown}
              onPointerMove={handleWorldPopupPointerMove}
              onPointerUp={handleWorldPopupPointerUp}
              onPointerCancel={handleWorldPopupPointerUp}
            >
              <div className="Three3DViewer Three3DViewer__world-preview-header-1 mb-2 flex min-w-0 cursor-grab items-start justify-between gap-2 text-cyan-100 active:cursor-grabbing select-none">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {selectedCameraForPreview.name}
                  </p>
                  <p className="sr-only">
                    Live 3D world · FOV {selectedCameraForPreview.fov}°
                  </p>
                  <p className="truncate font-mono text-[10px] text-cyan-100/70">
                    World snapshot · FOV {selectedCameraForPreview.fov}°
                  </p>
                </div>
                <button
                  type="button"
                  className="Three3DViewer Three3DViewer__world-preview-close-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-xs border border-cyan-200/20 bg-white/5 p-0 text-cyan-100/70 leading-none transition hover:bg-cyan-300/15 hover:text-cyan-50"
                  onClick={handleCameraPreviewClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="카메라 보기 닫기"
                  aria-label="카메라 보기 닫기"
                >
                  X
                </button>
              </div>
              <div className="Three3DViewer Three3DViewer__world-snapshot-frame-1 flex max-h-full items-center justify-center overflow-hidden rounded-sm border border-cyan-200/30 bg-neutral-950">
                {worldPreviewSnapshot ? (
                  <img
                    alt={`${selectedCameraForPreview.name} world snapshot`}
                    className="Three3DViewer Three3DViewer__world-snapshot-1 block max-h-full max-w-full object-contain"
                    src={worldPreviewSnapshot}
                  />
                ) : (
                  <div className="Three3DViewer Three3DViewer__world-snapshot-loader-frame-1 flex aspect-video w-full items-center justify-center">
                    <Loader2
                      className="Three3DViewer Three3DViewer__world-snapshot-loader-1 h-5 w-5 animate-spin text-cyan-100/70"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {loadState.isLoading || loadState.error ? (
            <ViewerLoadState
              error={loadState.error}
              isLoading={loadState.isLoading}
            />
          ) : null}
          <AnalysisOverlay
            analysisSummary={analysisSummary}
            analysisTargets={filteredAnalysisTargets}
            isEditing={Boolean(analysisEditState)}
            onSelect={onAnalysisTargetSelect}
            onTargetPointerCancel={handleAnalysisTargetPointerCancel}
            onTargetPointerDown={handleAnalysisTargetPointerDown}
            onTargetPointerMove={handleAnalysisTargetPointerMove}
            onTargetPointerUp={handleAnalysisTargetPointerUp}
            projectedTargets={projectedTargets}
            selectedProjectedTarget={selectedProjectedTarget}
            selectedTargetId={selectedAnalysisTargetId}
          />
          {shouldRenderCameraListOverlay || shouldRenderAnalysisModeToolbar ? (
            <div className="Three3DViewer Three3DViewer__right-overlay-dock-1 pointer-events-none absolute right-3 top-1/2 z-50 flex -translate-y-1/2 items-center gap-2">
              {shouldRenderAnalysisModeToolbar ? (
                <AnalysisModeToolbar
                  activeMode={activeAnalysisMode}
                  onChange={onAnalysisModeChange}
                />
              ) : null}
              {shouldRenderCameraListOverlay ? (
                <CameraListOverlay
                  selectedCameraId={
                    resolvedCameraVisualizationConfig.selectedCameraId
                  }
                  onCameraHover={setHoveredCameraId}
                  onCameraSelect={handleCameraSelect}
                />
              ) : null}
            </div>
          ) : null}
          {shouldRenderEventLayer ? (
            <div
              className={cn(
                "Three3DViewer Three3DViewer__analysis-capture-1 absolute inset-0 z-20 touch-none",
                activeAnalysisMode === "point" && "cursor-crosshair",
                activeAnalysisMode === "area" && "cursor-crosshair",
              )}
              onPointerCancel={handleAnalysisPointerCancel}
              onPointerDown={handleAnalysisPointerDown}
              onPointerMove={handleAnalysisPointerMove}
              onPointerUp={handleAnalysisPointerUp}
            >
              {analysisDragRect ? (
                <div
                  className="Three3DViewer Three3DViewer__analysis-drag-1 pointer-events-none absolute rounded-sm border border-cyan-200 bg-cyan-300/15 shadow-[0_0_18px_rgba(103,232,249,0.26)]"
                  style={{
                    height: `${analysisDragRect.height}%`,
                    left: `${analysisDragRect.left}%`,
                    top: `${analysisDragRect.top}%`,
                    width: `${analysisDragRect.width}%`,
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {showOptionBar ? (
          <Viewer3DOptionBar
            config={resolvedConfig}
            modelFile={resolvedModelFile}
            onConfigChange={handleConfigChange}
            onModelFileChange={handleModelFileChange}
          />
        ) : null}
      </div>
    </div>
  );
});
function CameraImageCanvas({
  canvasRef,
  imageElementRef,
  imageUrl,
  label,
  onFrameChange,
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) {
      return undefined;
    }
    let animationFrameId = 0;
    let isActive = true;
    let lastFrameKey = "";
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      imageElementRef.current = image;
      drawFrame();
    };
    image.onerror = () => {
      imageElementRef.current = null;
      drawFallbackFrame(canvas);
      onFrameChange?.();
    };
    const drawFrame = () => {
      if (!isActive) {
        return;
      }
      const frameKey = drawCameraImageFrame(canvas, image);
      if (frameKey && frameKey !== lastFrameKey) {
        lastFrameKey = frameKey;
        onFrameChange?.();
      }
    };
    const scheduleDraw = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        drawFrame();
      });
    };
    image.src = imageUrl;
    const resizeObserver = new ResizeObserver(scheduleDraw);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", scheduleDraw);
    scheduleDraw();
    return () => {
      isActive = false;
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", scheduleDraw);
      resizeObserver.disconnect();
      if (imageElementRef.current === image) {
        imageElementRef.current = null;
      }
    };
  }, [canvasRef, imageElementRef, imageUrl, onFrameChange]);
  return (
    <canvas
      ref={canvasRef}
      className="CameraImageCanvas CameraImageCanvas__canvas-1 absolute inset-0 z-0 h-full w-full bg-neutral-950"
      aria-label={label ? `${label} 카메라 영상` : "카메라 영상"}
    />
  );
}
function AnalysisOverlay({
  analysisSummary,
  analysisTargets,
  isEditing,
  onSelect,
  onTargetPointerCancel,
  onTargetPointerDown,
  onTargetPointerMove,
  onTargetPointerUp,
  projectedTargets,
  selectedProjectedTarget,
  selectedTargetId,
}) {
  const calloutRef = useRef(null);
  const rootRef = useRef(null);
  const [overlayMetrics, setOverlayMetrics] = useState();
  const projectedTargetById = useMemo(
    () => new Map(projectedTargets.map((target) => [target.id, target])),
    [projectedTargets],
  );
  const connectorGeometry =
    selectedProjectedTarget?.visible && analysisSummary
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
      setOverlayMetrics((currentMetrics) =>
        areOverlayMetricsEqual(currentMetrics, nextMetrics)
          ? currentMetrics
          : nextMetrics,
      );
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
  return (
    <div
      ref={rootRef}
      className="AnalysisOverlay AnalysisOverlay__root-1 pointer-events-none absolute inset-0 z-30"
    >
      <svg
        className="AnalysisOverlay AnalysisOverlay__lines-1 absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${connectorGeometry?.width ?? 1} ${connectorGeometry?.height ?? 1}`}
        aria-hidden="true"
      >
        {connectorGeometry ? (
          <>
            <path
              d={connectorGeometry.path}
              fill="none"
              stroke="rgba(2, 6, 23, 0.68)"
              strokeDasharray="8 5"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth="3.6"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={connectorGeometry.path}
              fill="none"
              stroke="rgba(125, 211, 252, 0.82)"
              strokeDasharray="8 5"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth="1.55"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>

      {analysisTargets.map((target, index) => {
        const projectedTarget = projectedTargetById.get(target.id);
        if (!projectedTarget?.visible) {
          return null;
        }
        const selected = target.id === selectedTargetId;
        if (target.kind === "area" && projectedTarget.rect) {
          return (
            <div
              key={target.id}
              role="button"
              tabIndex={0}
              className={cn(
                "AnalysisOverlay AnalysisOverlay__area-1 pointer-events-auto absolute overflow-hidden rounded-sm border bg-cyan-300/[0.12] text-left shadow-[0_0_18px_rgba(103,232,249,0.2)] transition hover:bg-cyan-300/20",
                selected
                  ? "border-lime-200 bg-lime-300/20 shadow-[0_0_24px_rgba(190,242,100,0.36)]"
                  : "border-cyan-200/80",
                isEditing && selected && "cursor-grabbing",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(target.id);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }
                event.preventDefault();
                onSelect?.(target.id);
              }}
              onPointerCancel={onTargetPointerCancel}
              onPointerDown={(event) =>
                onTargetPointerDown?.(event, target, "move-area")
              }
              onPointerMove={onTargetPointerMove}
              onPointerUp={onTargetPointerUp}
              style={{
                height: `${projectedTarget.rect.height}%`,
                left: `${projectedTarget.rect.left}%`,
                minHeight: "2rem",
                minWidth: "2.75rem",
                top: `${projectedTarget.rect.top}%`,
                width: `${projectedTarget.rect.width}%`,
              }}
              title={target.name}
            >
              <span className="AnalysisOverlay AnalysisOverlay__area-label-1 absolute left-1 top-1 max-w-[calc(100%-0.5rem)] truncate rounded-sm bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white">
                {target.name}
              </span>
              {selected
                ? RESIZE_HANDLES.map((handle) => (
                    <span
                      key={handle}
                      className="AnalysisOverlay AnalysisOverlay__resize-handle-1 absolute h-3 w-3 rounded-[2px] border border-neutral-950 bg-lime-200 shadow-[0_0_8px_rgba(190,242,100,0.65)]"
                      onPointerCancel={onTargetPointerCancel}
                      onPointerDown={(event) =>
                        onTargetPointerDown?.(
                          event,
                          target,
                          `resize-area:${handle}`,
                        )
                      }
                      onPointerMove={onTargetPointerMove}
                      onPointerUp={onTargetPointerUp}
                      style={getResizeHandleStyle(handle)}
                      title="영역 크기 조절"
                    />
                  ))
                : null}
            </div>
          );
        }
        return (
          <button
            key={target.id}
            type="button"
            className={cn(
              "AnalysisOverlay AnalysisOverlay__point-1 pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[10px] font-bold shadow-[0_0_18px_rgba(103,232,249,0.26)] transition hover:scale-105",
              selected
                ? "border-lime-200 bg-lime-300 text-neutral-950"
                : "border-cyan-200 bg-cyan-300 text-neutral-950",
              isEditing && selected && "cursor-grabbing",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(target.id);
            }}
            onPointerCancel={onTargetPointerCancel}
            onPointerDown={(event) =>
              onTargetPointerDown?.(event, target, "move-point")
            }
            onPointerMove={onTargetPointerMove}
            onPointerUp={onTargetPointerUp}
            style={{
              left: `${projectedTarget.left}%`,
              top: `${projectedTarget.top}%`,
            }}
            title={target.name}
          >
            {index + 1}
          </button>
        );
      })}

      {selectedProjectedTarget?.visible && analysisSummary ? (
        <div
          ref={calloutRef}
          className="AnalysisOverlay AnalysisOverlay__callout-1 absolute right-3 top-3 z-40 grid w-[min(19rem,calc(100%-1.5rem))] gap-2 rounded-md border border-cyan-200/35 bg-neutral-950/[0.78] p-3 text-white shadow-2xl backdrop-blur-md"
        >
          <div className="AnalysisOverlay AnalysisOverlay__callout-header-1 min-w-0">
            <p className="AnalysisOverlay AnalysisOverlay__callout-title-1 truncate text-xs font-semibold">
              {analysisSummary.title}
            </p>
            <p className="AnalysisOverlay AnalysisOverlay__callout-subtitle-1 truncate font-mono text-[10px] text-cyan-100/80">
              {analysisSummary.subtitle}
            </p>
          </div>

          <div className="AnalysisOverlay AnalysisOverlay__metric-grid-1 grid grid-cols-3 gap-1.5">
            <AnalysisMetric
              label="최고"
              value={`${analysisSummary.temperatureMax}℃`}
            />
            <AnalysisMetric
              label="평균"
              value={`${analysisSummary.temperatureAverage}℃`}
            />
            <AnalysisMetric
              label="최저"
              value={`${analysisSummary.temperatureMin}℃`}
            />
            <AnalysisMetric
              label="검출"
              value={`${analysisSummary.ultrasoundDetectedDb} dB`}
            />
            <AnalysisMetric
              label="Peak"
              value={`${analysisSummary.ultrasoundPeakDb} dB`}
            />
            <AnalysisMetric label="추이" value={analysisSummary.trendLabel} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
function AnalysisModeToolbar({ activeMode, onChange }) {
  const modes = [
    {
      icon: RotateCcw,
      label: "탐색",
      value: undefined,
    },
    {
      icon: MousePointer2,
      label: "포인트",
      value: "point",
    },
    {
      icon: SquareDashedMousePointer,
      label: "영역",
      value: "area",
    },
  ];
  return (
    <div
      className="AnalysisModeToolbar AnalysisModeToolbar__root-1 pointer-events-auto rounded-md border border-white/15 bg-neutral-950/80 p-1 text-white shadow-2xl backdrop-blur-md"
      role="toolbar"
      aria-label="3D 분석 마우스 모드"
    >
      <div className="AnalysisModeToolbar AnalysisModeToolbar__list-1 grid gap-1">
        {modes.map(({ icon: Icon, label, value }) => {
          const active =
            activeMode === value || (!activeMode && value === undefined);
          return (
            <button
              key={label}
              type="button"
              className={cn(
                "AnalysisModeToolbar AnalysisModeToolbar__button-1 grid h-8 w-8 place-items-center rounded-sm border text-white/75 transition hover:border-cyan-200/60 hover:bg-white/10 hover:text-white",
                active
                  ? "border-cyan-200 bg-cyan-300/20 text-cyan-50 shadow-[0_0_18px_rgba(103,232,249,0.22)]"
                  : "border-transparent",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onChange(value);
              }}
              title={label}
              aria-label={label}
              aria-pressed={active}
            >
              <Icon
                className="AnalysisModeToolbar AnalysisModeToolbar__icon-1 h-4 w-4"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
function AnalysisMetric({ label, value }) {
  return (
    <div className="AnalysisMetric AnalysisMetric__tile-1 min-w-0 rounded-sm border border-white/10 bg-white/[0.08] px-1.5 py-1">
      <p className="AnalysisMetric AnalysisMetric__label-1 truncate text-[9px] font-semibold text-cyan-100/75">
        {label}
      </p>
      <p className="AnalysisMetric AnalysisMetric__value-1 truncate font-mono text-[11px] font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
function ViewerLoadState({ error, isLoading }) {
  return (
    <div className="ViewerLoadState ViewerLoadState__overlay-1 pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/30 text-white">
      <div className="ViewerLoadState ViewerLoadState__content-1 grid min-w-0 place-items-center gap-2 rounded-md border border-white/15 bg-black/50 px-3 py-2 text-center backdrop-blur-sm">
        {isLoading ? (
          <Loader2
            className="ViewerLoadState ViewerLoadState__icon-1 h-5 w-5 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <AlertTriangle
            className="ViewerLoadState ViewerLoadState__icon-2 h-5 w-5 text-amber-200"
            aria-hidden="true"
          />
        )}
        <p className="ViewerLoadState ViewerLoadState__text-1 max-w-[14rem] text-xs font-semibold">
          {isLoading ? "3D 모델 로드 중" : error}
        </p>
      </div>
    </div>
  );
}
function getWorldHitFromClientPoint({
  camera,
  clientPoint,
  model,
  raycaster,
  renderer,
}) {
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientPoint.x - rect.left) / rect.width) * 2 - 1,
    -(((clientPoint.y - rect.top) / rect.height) * 2 - 1),
  );
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(model, true).at(0)?.point.clone();
}
function buildAnalysisDraft(state, endClient, getInteractionPoint) {
  const travelDistance = getClientDistance(state.startClient, endClient);
  const endInteraction =
    getInteractionPoint(endClient) ?? state.startInteraction;
  if (!endInteraction) {
    return undefined;
  }
  if (state.interactionMode === "camera") {
    return buildCameraAnalysisDraft(state, endInteraction, travelDistance);
  }
  const endHit =
    endInteraction.worldPoint ?? state.startInteraction?.worldPoint;
  if (!endHit) {
    return undefined;
  }
  if (state.mode === "point") {
    return {
      interactionMode: "world",
      kind: "point",
      worldPosition: toVector3(endHit),
    };
  }
  if (travelDistance < 18) {
    return undefined;
  }
  const startHit = state.startInteraction?.worldPoint;
  const centerClient = {
    x: (state.startClient.x + endClient.x) / 2,
    y: (state.startClient.y + endClient.y) / 2,
  };
  const centerHit = getInteractionPoint(centerClient)?.worldPoint ?? endHit;
  return {
    interactionMode: "world",
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
function buildCameraAnalysisDraft(state, endInteraction, travelDistance) {
  const startInteraction =
    state.startInteraction?.mode === "camera"
      ? state.startInteraction
      : endInteraction;
  if (!startInteraction || endInteraction.mode !== "camera") {
    return undefined;
  }
  if (state.mode === "point") {
    return {
      ...toCameraTargetFields({
        cameraId: endInteraction.cameraId,
        imagePoint: endInteraction,
      }),
      interactionMode: "camera",
      kind: "point",
    };
  }
  if (travelDistance < 18) {
    return undefined;
  }
  return {
    ...toCameraAreaTargetFields({
      cameraId: endInteraction.cameraId,
      endPoint: endInteraction,
      startPoint: startInteraction,
    }),
    interactionMode: "camera",
    kind: "area",
  };
}
function buildEditedAnalysisTarget(state, currentClient, getInteractionPoint) {
  const currentInteraction = getInteractionPoint(currentClient);
  if (!currentInteraction) {
    return undefined;
  }
  if (
    state.interactionMode === "camera" ||
    isCameraAnalysisTarget(state.target)
  ) {
    return buildEditedCameraTarget(state, currentInteraction);
  }
  return buildEditedWorldTarget(state, currentInteraction);
}
function buildEditedCameraTarget(state, currentInteraction) {
  if (currentInteraction.mode !== "camera") {
    return undefined;
  }
  if (state.target.kind !== "area" || state.editMode === "move-point") {
    return {
      ...state.target,
      ...toCameraTargetFields({
        cameraId: currentInteraction.cameraId ?? state.target.cameraId,
        imagePoint: currentInteraction,
      }),
    };
  }
  if (state.editMode === "move-area") {
    const startInteraction =
      state.startInteraction?.mode === "camera"
        ? state.startInteraction
        : currentInteraction;
    const area = getTargetImageAreaUv(state.target);
    const delta = {
      x: currentInteraction.uv.x - startInteraction.uv.x,
      y: currentInteraction.uv.y - startInteraction.uv.y,
    };
    const movedArea = moveUvArea(area, delta);
    return {
      ...state.target,
      ...toCameraAreaTargetFields({
        cameraId: currentInteraction.cameraId ?? state.target.cameraId,
        endPoint: getCameraPointFromUv(movedArea.end, currentInteraction),
        startPoint: getCameraPointFromUv(movedArea.start, currentInteraction),
      }),
    };
  }
  const handle = state.editMode.startsWith("resize-area:")
    ? state.editMode.replace("resize-area:", "")
    : "se";
  const resizedArea = resizeUvArea(
    getTargetImageAreaUv(state.target),
    handle,
    currentInteraction.uv,
  );
  return {
    ...state.target,
    ...toCameraAreaTargetFields({
      cameraId: currentInteraction.cameraId ?? state.target.cameraId,
      endPoint: getCameraPointFromUv(resizedArea.end, currentInteraction),
      startPoint: getCameraPointFromUv(resizedArea.start, currentInteraction),
    }),
  };
}
function buildEditedWorldTarget(state, currentInteraction) {
  const currentHit = currentInteraction.worldPoint;
  if (!currentHit) {
    return undefined;
  }
  if (state.target.kind !== "area" || state.editMode === "move-point") {
    return {
      ...state.target,
      interactionMode: "world",
      worldPosition: toVector3(currentHit),
    };
  }
  if (state.editMode === "move-area") {
    const startHit = state.startInteraction?.worldPoint;
    if (!startHit) {
      return undefined;
    }
    const delta = currentHit.clone().sub(startHit);
    return {
      ...state.target,
      interactionMode: "world",
      worldArea: state.target.worldArea
        ? {
            end: toVector3(
              toThreeVector(state.target.worldArea.end).add(delta),
            ),
            start: toVector3(
              toThreeVector(state.target.worldArea.start).add(delta),
            ),
          }
        : state.target.worldArea,
      worldPosition: toVector3(
        toThreeVector(state.target.worldPosition).add(delta),
      ),
    };
  }
  if (!state.target.worldArea) {
    return {
      ...state.target,
      interactionMode: "world",
      worldArea: {
        end: toVector3(currentHit),
        start: state.target.worldPosition,
      },
      worldPosition: toVector3(currentHit),
    };
  }
  const handle = state.editMode.startsWith("resize-area:")
    ? state.editMode.replace("resize-area:", "")
    : "se";
  const nextArea = resizeWorldArea(state.target.worldArea, handle, currentHit);
  return {
    ...state.target,
    interactionMode: "world",
    worldArea: nextArea,
    worldPosition: getWorldAreaCenter(nextArea),
  };
}
function captureAnalysisPreviewImage({
  camera,
  cameraCanvas,
  endClient,
  renderer,
  scene,
  state,
}) {
  const sourceCanvas =
    state.interactionMode === "camera" ? cameraCanvas : renderer?.domElement;
  if (!sourceCanvas) {
    return undefined;
  }
  if (state.interactionMode !== "camera") {
    if (!camera || !renderer || !scene) {
      return undefined;
    }
    renderer.render(scene, camera);
  }
  const bounds = sourceCanvas.getBoundingClientRect();
  if (
    !bounds.width ||
    !bounds.height ||
    !sourceCanvas.width ||
    !sourceCanvas.height
  ) {
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
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const context = outputCanvas.getContext("2d");
  if (!context) {
    return undefined;
  }
  context.drawImage(
    sourceCanvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  drawAnalysisCaptureOverlay(context, {
    captureRect,
    endClient,
    outputHeight,
    outputWidth,
    state,
  });
  try {
    return outputCanvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}
function getAnalysisCaptureClientRect(state, endClient, bounds) {
  if (state.mode === "point") {
    const minSide = Math.min(bounds.width, bounds.height);
    const size = clamp(minSide * 0.3, 96, 180);
    return clampCaptureClientRect(
      endClient.x - size / 2,
      endClient.y - size / 2,
      size,
      size,
      bounds,
    );
  }
  const left = Math.min(state.startClient.x, endClient.x);
  const top = Math.min(state.startClient.y, endClient.y);
  const width = Math.abs(endClient.x - state.startClient.x);
  const height = Math.abs(endClient.y - state.startClient.y);
  const margin = clamp(Math.max(width, height) * 0.32, 32, 96);
  return clampCaptureClientRect(
    left - margin,
    top - margin,
    width + margin * 2,
    height + margin * 2,
    bounds,
  );
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
function drawAnalysisCaptureOverlay(
  context,
  { captureRect, endClient, outputHeight, outputWidth, state },
) {
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
  const left =
    (Math.min(state.startClient.x, endClient.x) - captureRect.left) * scaleX;
  const top =
    (Math.min(state.startClient.y, endClient.y) - captureRect.top) * scaleY;
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
function projectAnalysisTarget(target, context) {
  if (context.mode === "camera") {
    return projectCameraAnalysisTarget(target, context);
  }
  return projectWorldAnalysisTarget(target, context.camera);
}
function projectCameraAnalysisTarget(target, context) {
  if (
    !isCameraAnalysisTarget(target) ||
    target.cameraId !== context.selectedCameraId
  ) {
    return {
      id: target.id,
      left: 0,
      top: 0,
      visible: false,
    };
  }
  const center = projectImageUv(target.imageUv, context);
  const rect =
    target.kind === "area"
      ? projectCameraAnalysisArea(target, context, center)
      : undefined;
  return {
    id: target.id,
    left: center.left,
    rect,
    top: center.top,
    visible: center.visible,
  };
}
function projectWorldAnalysisTarget(target, camera) {
  const center = projectVector(target.worldPosition, camera);
  const rect =
    target.kind === "area"
      ? projectWorldAnalysisArea(target, camera, center)
      : undefined;
  return {
    id: target.id,
    left: center.left,
    rect,
    top: center.top,
    visible: center.visible,
  };
}
function projectCameraAnalysisArea(target, context, center) {
  if (!center.visible) {
    return undefined;
  }
  const area = getTargetImageAreaUv(target);
  const start = projectImageUv(area.start, context);
  const end = projectImageUv(area.end, context);
  const visiblePoints = [start, end, center].filter((point) => point.visible);
  if (!visiblePoints.length) {
    return getCenteredRect(center, 10, 10);
  }
  const minLeft = Math.min(...visiblePoints.map((point) => point.left));
  const maxLeft = Math.max(...visiblePoints.map((point) => point.left));
  const minTop = Math.min(...visiblePoints.map((point) => point.top));
  const maxTop = Math.max(...visiblePoints.map((point) => point.top));
  const width = Math.min(100, Math.max(4, maxLeft - minLeft));
  const height = Math.min(100, Math.max(4, maxTop - minTop));
  return {
    height,
    left: clamp(minLeft, 0, 100 - width),
    top: clamp(minTop, 0, 100 - height),
    width,
  };
}
function projectWorldAnalysisArea(target, camera, center) {
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
  const projected = new THREE.Vector3(vector.x, vector.y, vector.z).project(
    camera,
  );
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
function getRuntimeCameraConfig(camera, controls) {
  return {
    fov: camera.fov,
    maxDistance: controls.maxDistance,
    minDistance: controls.minDistance,
    position: toVector3(camera.position),
    target: toVector3(controls.target),
  };
}
function forceRendererSizeToContainer({ camera, container, renderer }) {
  const bounds = getRendererBounds({ container, renderer });
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const drawingBuffer = renderer.getDrawingBufferSize(new THREE.Vector2());
  const nextBufferWidth = Math.round(width * pixelRatio);
  const nextBufferHeight = Math.round(height * pixelRatio);
  renderer.setPixelRatio(pixelRatio);
  if (
    drawingBuffer.x !== nextBufferWidth ||
    drawingBuffer.y !== nextBufferHeight
  ) {
    renderer.setSize(width, height, false);
  }
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function applyRuntimeCameraConfig(camera, controls, config) {
  camera.position.set(config.position.x, config.position.y, config.position.z);
  camera.fov = config.fov ?? camera.fov;
  camera.updateProjectionMatrix();
  controls.target.set(config.target.x, config.target.y, config.target.z);
  controls.minDistance = config.minDistance ?? controls.minDistance;
  controls.maxDistance = config.maxDistance ?? controls.maxDistance;
  controls.update();
}
function getWorldPreviewCameraConfig({
  container,
  model,
  overviewCamera,
  renderer,
  resolvedCamera,
  selectedCamera,
}) {
  const baseCamera = resolvedCamera ?? DEFAULT_VIEWER_3D_CONFIG.camera;
  const overview = overviewCamera ?? DEFAULT_VIEWER_3D_CONFIG.camera;
  const modelBounds = getWorldPreviewModelBounds(model);
  const target = getWorldPreviewTarget(modelBounds, overview);
  const radius = getWorldPreviewRadius({
    modelBounds,
    selectedCamera,
    target,
  });
  const aspect = getRendererAspect({ container, renderer });
  const fov = Math.max(WORLD_PREVIEW_CAMERA_FOV, baseCamera.fov ?? 0);
  const verticalFov = THREE.MathUtils.degToRad(fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const fitFov = Math.max(
    THREE.MathUtils.degToRad(24),
    Math.min(verticalFov, horizontalFov),
  );
  const fitDistance =
    (radius * WORLD_PREVIEW_CAMERA_PADDING) / Math.sin(fitFov / 2);
  const minDistance =
    baseCamera.minDistance ?? DEFAULT_VIEWER_3D_CONFIG.camera.minDistance;
  const maxDistance = Math.max(
    baseCamera.maxDistance ?? DEFAULT_VIEWER_3D_CONFIG.camera.maxDistance,
    fitDistance * 1.2,
  );
  const selectedDistance = selectedCamera
    ? new THREE.Vector3(
        selectedCamera.position.x,
        selectedCamera.position.y,
        selectedCamera.position.z,
      ).distanceTo(target)
    : 0;
  const backOffset = Math.max(
    WORLD_PREVIEW_CAMERA_MIN_BACK_OFFSET,
    radius * WORLD_PREVIEW_CAMERA_BACK_OFFSET_RATIO,
  );
  const distance = selectedCamera
    ? selectedDistance + backOffset
    : Math.max(fitDistance, minDistance + radius * 0.35);
  const direction = getWorldPreviewDirection(selectedCamera, overview);
  const position = target.clone().addScaledVector(direction, distance);
  return {
    ...baseCamera,
    fov,
    maxDistance,
    minDistance,
    position: toVector3(position),
    target: toVector3(target),
  };
}
function getWorldPreviewModelBounds(model) {
  if (!model) {
    return undefined;
  }
  model.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (
    !Number.isFinite(bounds.min.x) ||
    !Number.isFinite(bounds.min.y) ||
    !Number.isFinite(bounds.min.z) ||
    !Number.isFinite(bounds.max.x) ||
    !Number.isFinite(bounds.max.y) ||
    !Number.isFinite(bounds.max.z) ||
    bounds.isEmpty()
  ) {
    return undefined;
  }
  return bounds;
}
function getWorldPreviewTarget(modelBounds, overviewCamera) {
  if (modelBounds) {
    return modelBounds.getCenter(new THREE.Vector3());
  }
  const fallbackTarget =
    overviewCamera?.target ?? DEFAULT_VIEWER_3D_CONFIG.camera.target;
  return new THREE.Vector3(
    fallbackTarget.x,
    fallbackTarget.y,
    fallbackTarget.z,
  );
}
function getWorldPreviewRadius({ modelBounds, selectedCamera, target }) {
  const points = [];
  if (modelBounds) {
    points.push(...getBoxCorners(modelBounds));
  }
  if (!points.length && selectedCamera) {
    const cameraPosition = new THREE.Vector3(
      selectedCamera.position.x,
      selectedCamera.position.y,
      selectedCamera.position.z,
    );
    const cameraTarget = new THREE.Vector3(
      selectedCamera.target.x,
      selectedCamera.target.y,
      selectedCamera.target.z,
    );
    points.push(cameraPosition, cameraTarget);
  }
  const radius = points.reduce(
    (currentRadius, point) => Math.max(currentRadius, point.distanceTo(target)),
    WORLD_PREVIEW_MIN_RADIUS,
  );
  return Math.max(WORLD_PREVIEW_MIN_RADIUS, radius);
}
function getWorldPreviewDirection(selectedCamera, overviewCamera) {
  if (selectedCamera) {
    const cameraPosition = new THREE.Vector3(
      selectedCamera.position.x,
      selectedCamera.position.y,
      selectedCamera.position.z,
    );
    const cameraTarget = new THREE.Vector3(
      selectedCamera.target.x,
      selectedCamera.target.y,
      selectedCamera.target.z,
    );
    const selectedDirection = cameraPosition.sub(cameraTarget);
    if (selectedDirection.lengthSq() > 0.0001) {
      if (Math.abs(selectedDirection.y) < selectedDirection.length() * 0.16) {
        selectedDirection.y += selectedDirection.length() * 0.22;
      }
      return selectedDirection.normalize();
    }
  }
  const fallbackPosition = DEFAULT_VIEWER_3D_CONFIG.camera.position;
  const fallbackTarget = DEFAULT_VIEWER_3D_CONFIG.camera.target;
  const position = overviewCamera?.position ?? fallbackPosition;
  const target = overviewCamera?.target ?? fallbackTarget;
  const direction = new THREE.Vector3(
    position.x - target.x,
    position.y - target.y,
    position.z - target.z,
  );
  if (direction.lengthSq() <= 0.0001) {
    return new THREE.Vector3(1, 0.72, 1).normalize();
  }
  return direction.normalize();
}
function getRendererAspect({ container, renderer }) {
  const bounds = getRendererBounds({ container, renderer });
  return bounds.height > 0 ? bounds.width / bounds.height : 16 / 9;
}
function getRendererBounds({ container, renderer }) {
  const bounds =
    container?.getBoundingClientRect() ??
    renderer?.domElement?.getBoundingClientRect();
  return {
    height: bounds?.height || 9,
    width: bounds?.width || 16,
  };
}
function getBoxCorners(box) {
  return [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
}
function drawCameraImageFrame(canvas, image) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.max(1, Math.round(width * pixelRatio));
  const nextHeight = Math.max(1, Math.round(height * pixelRatio));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#020617";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) {
    return `${canvas.width}:${canvas.height}:pending`;
  }
  const crop = getObjectCoverDrawRect({
    destinationHeight: canvas.height,
    destinationWidth: canvas.width,
    sourceHeight: image.naturalHeight,
    sourceWidth: image.naturalWidth,
  });
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height);
  return `${canvas.width}:${canvas.height}:${image.naturalWidth}:${image.naturalHeight}`;
}
function drawFallbackFrame(canvas) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  context.fillStyle = "#020617";
  context.fillRect(0, 0, canvas.width, canvas.height);
}
function getInteractionSurfaceBounds({ cameraCanvas, mode, renderer }) {
  const element = mode === "camera" ? cameraCanvas : renderer?.domElement;
  return element?.getBoundingClientRect();
}
function getCameraImageInteractionPoint({
  cameraId,
  canvas,
  clientPoint,
  image,
}) {
  if (!cameraId || !canvas) {
    return undefined;
  }
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return undefined;
  }
  const canvasScaleX = canvas.width / bounds.width || 1;
  const canvasScaleY = canvas.height / bounds.height || 1;
  const canvasPoint = {
    x: clamp(clientPoint.x - bounds.left, 0, bounds.width) * canvasScaleX,
    y: clamp(clientPoint.y - bounds.top, 0, bounds.height) * canvasScaleY,
  };
  const naturalWidth = image?.naturalWidth || canvas.width;
  const naturalHeight = image?.naturalHeight || canvas.height;
  const crop = getObjectCoverDrawRect({
    destinationHeight: canvas.height,
    destinationWidth: canvas.width,
    sourceHeight: naturalHeight,
    sourceWidth: naturalWidth,
  });
  const pixel = {
    x: clamp((canvasPoint.x - crop.x) / crop.scale, 0, naturalWidth),
    y: clamp((canvasPoint.y - crop.y) / crop.scale, 0, naturalHeight),
  };
  const uv = {
    x: clamp(pixel.x / naturalWidth, 0, 1),
    y: clamp(pixel.y / naturalHeight, 0, 1),
  };
  return {
    cameraId,
    clientPoint,
    displayPercent: clientToPercentPoint(clientPoint, bounds),
    mode: "camera",
    pixel: {
      x: round(pixel.x),
      y: round(pixel.y),
    },
    sourceSize: {
      height: naturalHeight,
      width: naturalWidth,
    },
    uv: {
      x: roundUv(uv.x),
      y: roundUv(uv.y),
    },
  };
}
function getObjectCoverDrawRect({
  destinationHeight,
  destinationWidth,
  sourceHeight,
  sourceWidth,
}) {
  const scale = Math.max(
    destinationWidth / sourceWidth,
    destinationHeight / sourceHeight,
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    height,
    scale,
    width,
    x: (destinationWidth - width) / 2,
    y: (destinationHeight - height) / 2,
  };
}
function toCameraTargetFields({ cameraId, imagePoint }) {
  const imageUv = toUvPoint(imagePoint.uv);
  return {
    cameraId,
    imagePixel: toImagePixel(imagePoint.pixel),
    imageUv,
    worldPosition: imageUvToWorldVector(imageUv),
  };
}
function toCameraAreaTargetFields({ cameraId, endPoint, startPoint }) {
  const start = toUvPoint(startPoint.uv);
  const end = toUvPoint(endPoint.uv);
  const center = getUvAreaCenter({ start, end });
  return {
    cameraId,
    imageAreaPixel: {
      end: toImagePixel(endPoint.pixel),
      start: toImagePixel(startPoint.pixel),
    },
    imageAreaUv: { end, start },
    imagePixel: getPixelAreaCenter(startPoint.pixel, endPoint.pixel),
    imageUv: center,
    worldArea: {
      end: imageUvToWorldVector(end),
      start: imageUvToWorldVector(start),
    },
    worldPosition: imageUvToWorldVector(center),
  };
}
function getCameraPointFromUv(uv, referencePoint) {
  const naturalWidth = referencePoint.sourceSize?.width ?? 1;
  const naturalHeight = referencePoint.sourceSize?.height ?? 1;
  return {
    ...referencePoint,
    pixel: {
      x: round(uv.x * naturalWidth),
      y: round(uv.y * naturalHeight),
    },
    uv: toUvPoint(uv),
  };
}
function getTargetImageAreaUv(target) {
  if (target.imageAreaUv?.start && target.imageAreaUv?.end) {
    return {
      end: toUvPoint(target.imageAreaUv.end),
      start: toUvPoint(target.imageAreaUv.start),
    };
  }
  const center = toUvPoint(target.imageUv ?? { x: 0.5, y: 0.5 });
  return {
    end: {
      x: clamp(center.x + 0.06, 0, 1),
      y: clamp(center.y + 0.06, 0, 1),
    },
    start: {
      x: clamp(center.x - 0.06, 0, 1),
      y: clamp(center.y - 0.06, 0, 1),
    },
  };
}
function moveUvArea(area, delta) {
  const minX = Math.min(area.start.x, area.end.x);
  const maxX = Math.max(area.start.x, area.end.x);
  const minY = Math.min(area.start.y, area.end.y);
  const maxY = Math.max(area.start.y, area.end.y);
  const width = maxX - minX;
  const height = maxY - minY;
  const nextMinX = clamp(minX + delta.x, 0, 1 - width);
  const nextMinY = clamp(minY + delta.y, 0, 1 - height);
  const offsetX = nextMinX - minX;
  const offsetY = nextMinY - minY;
  return {
    end: toUvPoint({ x: area.end.x + offsetX, y: area.end.y + offsetY }),
    start: toUvPoint({ x: area.start.x + offsetX, y: area.start.y + offsetY }),
  };
}
function resizeUvArea(area, handle, uv) {
  const nextArea = {
    end: { ...area.end },
    start: { ...area.start },
  };
  if (handle.includes("w")) {
    nextArea.start.x = uv.x;
  }
  if (handle.includes("e")) {
    nextArea.end.x = uv.x;
  }
  if (handle.includes("n")) {
    nextArea.start.y = uv.y;
  }
  if (handle.includes("s")) {
    nextArea.end.y = uv.y;
  }
  return {
    end: toUvPoint(nextArea.end),
    start: toUvPoint(nextArea.start),
  };
}
function resizeWorldArea(area, handle, worldPoint) {
  const nextArea = {
    end: toThreeVector(area.end),
    start: toThreeVector(area.start),
  };
  if (handle === "nw" || handle === "sw") {
    nextArea.start = worldPoint.clone();
  } else {
    nextArea.end = worldPoint.clone();
  }
  return {
    end: toVector3(nextArea.end),
    start: toVector3(nextArea.start),
  };
}
function projectImageUv(uv, { cameraCanvas, image }) {
  const canvas = cameraCanvas;
  const bounds = canvas?.getBoundingClientRect();
  if (!bounds?.width || !bounds.height) {
    return {
      left: clamp((uv?.x ?? 0.5) * 100, 0, 100),
      top: clamp((uv?.y ?? 0.5) * 100, 0, 100),
      visible: Boolean(uv),
    };
  }
  const naturalWidth = image?.naturalWidth || canvas.width || bounds.width;
  const naturalHeight = image?.naturalHeight || canvas.height || bounds.height;
  const crop = getObjectCoverDrawRect({
    destinationHeight: bounds.height,
    destinationWidth: bounds.width,
    sourceHeight: naturalHeight,
    sourceWidth: naturalWidth,
  });
  const left =
    ((crop.x + uv.x * naturalWidth * crop.scale) / bounds.width) * 100;
  const top =
    ((crop.y + uv.y * naturalHeight * crop.scale) / bounds.height) * 100;
  return {
    left: clamp(left, 0, 100),
    top: clamp(top, 0, 100),
    visible: left >= 0 && left <= 100 && top >= 0 && top <= 100,
  };
}
function isCameraAnalysisTarget(target) {
  return (
    target.interactionMode === "camera" ||
    Boolean(target.imageUv && target.cameraId)
  );
}
function imageUvToWorldVector(uv) {
  return {
    x: round((uv.x * 100 - 50) / 28),
    y: round((50 - uv.y * 100) / 28),
    z: 0,
  };
}
function getUvAreaCenter(area) {
  return toUvPoint({
    x: (area.start.x + area.end.x) / 2,
    y: (area.start.y + area.end.y) / 2,
  });
}
function getPixelAreaCenter(start, end) {
  return {
    x: round((start.x + end.x) / 2),
    y: round((start.y + end.y) / 2),
  };
}
function getWorldAreaCenter(area) {
  return toVector3(
    toThreeVector(area.start).add(toThreeVector(area.end)).multiplyScalar(0.5),
  );
}
function getResizeHandleStyle(handle) {
  const vertical = handle.includes("n") ? "top" : "bottom";
  const horizontal = handle.includes("w") ? "left" : "right";
  return {
    [horizontal]: "-0.375rem",
    [vertical]: "-0.375rem",
    cursor: `${handle}-resize`,
  };
}
function getCalloutConnectorGeometry(target, overlayMetrics) {
  if (
    !overlayMetrics?.width ||
    !overlayMetrics.height ||
    !overlayMetrics.calloutRect
  ) {
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
  const padding = Math.min(
    18,
    Math.max(8, Math.min(rect.width, rect.height) * 0.12),
  );
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
  const anchor = candidates.reduce((nearest, candidate) =>
    getPointDistance(point, candidate) < getPointDistance(point, nearest)
      ? candidate
      : nearest,
  );
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
  return (
    currentMetrics.width === nextMetrics.width &&
    currentMetrics.height === nextMetrics.height &&
    areOverlayRectsEqual(currentMetrics.calloutRect, nextMetrics.calloutRect)
  );
}
function areOverlayRectsEqual(currentRect, nextRect) {
  if (!currentRect || !nextRect) {
    return currentRect === nextRect;
  }
  return (
    currentRect.bottom === nextRect.bottom &&
    currentRect.height === nextRect.height &&
    currentRect.left === nextRect.left &&
    currentRect.right === nextRect.right &&
    currentRect.top === nextRect.top &&
    currentRect.width === nextRect.width
  );
}
function roundOverlayValue(value) {
  return Number(value.toFixed(2));
}
function getProjectedTargetsKey(targets) {
  return targets
    .map((target) =>
      [
        target.id,
        target.visible ? 1 : 0,
        target.left.toFixed(1),
        target.top.toFixed(1),
        target.rect?.left.toFixed(1) ?? "",
        target.rect?.top.toFixed(1) ?? "",
        target.rect?.width.toFixed(1) ?? "",
        target.rect?.height.toFixed(1) ?? "",
      ].join(":"),
    )
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
function toThreeVector(vector) {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}
function toUvPoint(point) {
  return {
    x: roundUv(point.x),
    y: roundUv(point.y),
  };
}
function toImagePixel(point) {
  return {
    x: round(point.x),
    y: round(point.y),
  };
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function round(value) {
  return Number(value.toFixed(3));
}
function roundUv(value) {
  return Number(clamp(value, 0, 1).toFixed(5));
}
