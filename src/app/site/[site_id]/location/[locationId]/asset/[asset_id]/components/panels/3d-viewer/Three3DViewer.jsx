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
import { Box, Maximize2, X, Loader2 } from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL_3D_FILE, DEFAULT_VIEWER_3D_CONFIG } from "./constants";
import { Viewer3DOptionBar } from "./controls/Viewer3DOptionBar";
import { useThreeBackground } from "./hooks/useThreeBackground";
import { useThreeCamera } from "./hooks/useThreeCamera";
import { useThreeLighting } from "./hooks/useThreeLighting";
import { useThreeModel } from "./hooks/useThreeModel";
import { useThreeScene } from "./hooks/useThreeScene";
import { useThreeCameraVisualization } from "./hooks/useThreeCameraVisualization";
import { AnalysisModeToolbar } from "./components/AnalysisModeToolbar";
import { AnalysisOverlay } from "./components/AnalysisOverlay";
import { CameraImageCanvas } from "./components/CameraImageCanvas";
import { CameraListOverlay } from "./components/CameraListOverlay";
import { ViewerLoadState } from "./components/ViewerLoadState";
import {
  getAllCameraPresets,
  getCameraPreset,
} from "./constants/cameraPresets";
import {
  buildAnalysisDraft,
  buildEditedAnalysisTarget,
  captureAnalysisPreviewImage,
  getAnalysisDragRect,
  getInteractionSurfaceBounds,
  getProjectedTargetsKey,
  getWorldHitFromClientPoint,
  projectAnalysisTarget,
} from "./utils/analysisTargetUtils";
import { getCameraImageInteractionPoint } from "./utils/cameraCanvasUtils";
import {
  applyRuntimeCameraConfig,
  forceRendererSizeToContainer,
  getRuntimeCameraConfig,
  getWorldPreviewCameraConfig,
} from "./utils/worldPreviewUtils";
const EMPTY_ANALYSIS_TARGETS = [];
const WORLD_POPUP_POS_KEY = "three3d_world_popup_pos";
const ANALYSIS_CAMERA_TILE_COUNT = 8;
const ANALYSIS_TILE_WORLD_CAMERA_BACK_OFFSET_SCALE = 2.4;
export const Three3DViewer = forwardRef(function Three3DViewer(
  {
    activeAnalysisMode,
    allowOptionBar = true,
    analysisSummary,
    analysisTargets = EMPTY_ANALYSIS_TARGETS,
    analysisViewMode = "viewer",
    className,
    config,
    initialConfig = DEFAULT_VIEWER_3D_CONFIG,
    hideCameraVisualization = false,
    isThermalMeshPicking = false,
    modelFile,
    onAnalysisModeChange,
    onAnalysisTargetCreate,
    onAnalysisTargetDelete,
    onAnalysisTargetSelect,
    onAnalysisTargetUpdate,
    onConfigChange,
    onModelFileChange,
    onThermalMeshPicked,
    selectedAnalysisTargetId,
    showCameraOverlays = true,
    thermalCameraOverlay,
  },
  ref,
) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const cameraImageCanvasRef = useRef(null);
  const cameraImageElementRef = useRef(null);
  const analysisEditStateRef = useRef();
  const projectedTargetsKeyRef = useRef("");
  const raycasterRef = useRef(new THREE.Raycaster());
  const worldPreviewSnapshotFrameRef = useRef(0);
  const previousThermalCameraIdRef = useRef(null);
  const [internalConfig, setInternalConfig] = useState(initialConfig);
  const [internalModelFile, setInternalModelFile] = useState(
    modelFile ?? DEFAULT_MODEL_3D_FILE,
  );
  const [analysisPointerState, setAnalysisPointerState] = useState();
  const [analysisEditState, setAnalysisEditState] = useState();
  const [cameraFrameVersion, setCameraFrameVersion] = useState(0);
  const [projectedTargets, setProjectedTargets] = useState([]);
  const [worldPreviewSnapshot, setWorldPreviewSnapshot] = useState("");
  const [worldPreviewSnapshotFailed, setWorldPreviewSnapshotFailed] =
    useState(false);
  const [worldPopupPos, setWorldPopupPos] = useState(loadWorldPopupPosition);
  const [expandedAnalysisCameraId, setExpandedAnalysisCameraId] =
    useState(null);
  const worldPopupRef = useRef(null);
  const worldPopupDragRef = useRef(null);
  const resolvedConfig = config ?? internalConfig;
  const resolvedModelFile = modelFile ?? internalModelFile;
  const resolvedCameraVisualizationConfig =
    resolvedConfig.cameraVisualization ??
    DEFAULT_VIEWER_3D_CONFIG.cameraVisualization;
  const activeCameraVisualizationConfig = hideCameraVisualization
    ? {
        ...resolvedCameraVisualizationConfig,
        enabled: false,
        selectedCameraId: null,
        showAll: false,
        showLaserBeams: false,
      }
    : resolvedCameraVisualizationConfig;
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
  } = useThreeCameraVisualization(sceneRef, activeCameraVisualizationConfig);
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
  const selectedCameraForPreview = useMemo(() => {
    if (
      hideCameraVisualization ||
      !showCameraOverlays ||
      !activeCameraVisualizationConfig.selectedCameraId
    ) {
      return undefined;
    }

    return getConfiguredCameraPreset(
      activeCameraVisualizationConfig.selectedCameraId,
      activeCameraVisualizationConfig,
    );
  }, [
    activeCameraVisualizationConfig.customFovs,
    activeCameraVisualizationConfig.customPositions,
    activeCameraVisualizationConfig.selectedCameraId,
    hideCameraVisualization,
    showCameraOverlays,
  ]);
  const selectedCameraIdForPreview = selectedCameraForPreview?.id;
  const selectedThermalCameraIdForPreview =
    thermalCameraOverlay?.selectedCameraId ?? null;
  const isCameraVisualizationSelectionRequired =
    activeCameraVisualizationConfig.requireSelection === true;
  const isThermalCameraSelectionRequired =
    thermalCameraOverlay?.requireSelection === true;
  const rawThermalFramePreview =
    thermalCameraOverlay?.selectedFramePreview ?? null;
  const isThermalTileFramePreview =
    rawThermalFramePreview?.presentation === "tile-popup";
  const selectedThermalFramePreview =
    rawThermalFramePreview &&
    (isThermalTileFramePreview ||
      (selectedThermalCameraIdForPreview &&
        rawThermalFramePreview.cameraId === selectedThermalCameraIdForPreview))
      ? rawThermalFramePreview
      : null;
  const selectedThermalViewerFramePreview = isThermalTileFramePreview
    ? null
    : selectedThermalFramePreview;
  const selectedThermalTileFramePreview = isThermalTileFramePreview
    ? selectedThermalFramePreview
    : null;
  const isAnalysisTileMode = Boolean(
    analysisViewMode === "tiles" &&
      !hideCameraVisualization &&
      showCameraOverlays &&
      activeCameraVisualizationConfig.enabled,
  );
  const expandedAnalysisCamera = useMemo(() => {
    if (!isAnalysisTileMode || !expandedAnalysisCameraId) {
      return null;
    }

    return getConfiguredCameraPreset(
      expandedAnalysisCameraId,
      activeCameraVisualizationConfig,
    );
  }, [
    activeCameraVisualizationConfig,
    expandedAnalysisCameraId,
    isAnalysisTileMode,
  ]);
  const selectedImagePreview = useMemo(
    () => {
      if (selectedCameraForPreview && !isAnalysisTileMode) {
        return {
          cameraId: selectedCameraForPreview.id,
          fov: selectedCameraForPreview.fov,
          imageUrl: selectedCameraForPreview.sampleImagePath,
          label: selectedCameraForPreview.name,
          worldCamera: selectedCameraForPreview,
        };
      }

      if (selectedThermalViewerFramePreview?.imageUrl) {
        return {
          cameraId: selectedThermalViewerFramePreview.cameraId,
          fov: selectedThermalViewerFramePreview.fov,
          imageUrl: selectedThermalViewerFramePreview.imageUrl,
          label: selectedThermalViewerFramePreview.cameraName,
          sourceSize: {
            height: selectedThermalViewerFramePreview.height,
            width: selectedThermalViewerFramePreview.width,
          },
          worldCamera: selectedThermalViewerFramePreview.worldCamera,
        };
      }

      return null;
    },
    [
      isAnalysisTileMode,
      selectedCameraForPreview,
      selectedThermalViewerFramePreview,
    ],
  );
  const shouldRenderCameraImagePreview = Boolean(selectedImagePreview);
  const shouldRenderExpandedAnalysisSurface = Boolean(
    expandedAnalysisCamera || selectedThermalTileFramePreview,
  );
  const hasCameraAnalysisSurface = Boolean(
    selectedImagePreview ||
      expandedAnalysisCamera ||
      selectedThermalTileFramePreview,
  );
  const renderInteractionMode = hasCameraAnalysisSurface
    ? "camera"
    : "world";
  const showOptionBar =
    allowOptionBar && (resolvedConfig.controls?.showOptionBar ?? true);
  const selectedAnalysisCameraId =
    selectedImagePreview?.cameraId ??
    expandedAnalysisCamera?.id ??
    selectedThermalTileFramePreview?.cameraId ??
    null;
  const filteredAnalysisTargets = useMemo(
    () =>
      selectedAnalysisCameraId
        ? analysisTargets.filter(
            (target) => target.cameraId === selectedAnalysisCameraId,
          )
        : EMPTY_ANALYSIS_TARGETS,
    [analysisTargets, selectedAnalysisCameraId],
  );
  const canCreateAnalysisTarget = Boolean(
    activeAnalysisMode &&
    onAnalysisTargetCreate &&
    selectedAnalysisCameraId &&
    hasCameraAnalysisSurface,
  );
  const selectedProjectedTarget = useMemo(
    () =>
      selectedAnalysisTargetId
        ? projectedTargets.find((target) => target.id === selectedAnalysisTargetId)
        : undefined,
    [projectedTargets, selectedAnalysisTargetId],
  );
  const shouldRenderCameraListOverlay =
    !hideCameraVisualization &&
    showCameraOverlays &&
    activeCameraVisualizationConfig.enabled &&
    !isAnalysisTileMode;
  const shouldRenderThermalCameraListOverlay = Boolean(
    thermalCameraOverlay?.cameras?.length,
  );
  const shouldRenderEventLayer = canCreateAnalysisTarget;
  const shouldRenderAnalysisModeToolbar = Boolean(
    onAnalysisModeChange &&
      selectedAnalysisCameraId &&
      hasCameraAnalysisSurface,
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
      return undefined;
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
          selectedCameraId: selectedAnalysisCameraId,
        }),
      );
      const nextKey = getProjectedTargetsKey(nextTargets);
      if (projectedTargetsKeyRef.current !== nextKey) {
        projectedTargetsKeyRef.current = nextKey;
        setProjectedTargets(nextTargets);
      }

      if (renderInteractionMode === "world") {
        animationFrameId = window.requestAnimationFrame(projectTargets);
      }
    };

    animationFrameId = window.requestAnimationFrame(projectTargets);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [
    filteredAnalysisTargets,
    cameraFrameVersion,
    cameraRef,
    renderInteractionMode,
    rendererRef,
    selectedAnalysisCameraId,
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
  const pickThermalMeshAtClientPoint = useCallback(
    (clientPoint) => {
      const camera = cameraRef.current;
      const model = modelRef.current;
      const renderer = rendererRef.current;

      if (!camera || !model || !renderer) {
        return null;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((clientPoint.x - rect.left) / rect.width) * 2 - 1,
        -(((clientPoint.y - rect.top) / rect.height) * 2 - 1),
      );

      raycasterRef.current.setFromCamera(pointer, camera);
      return (
        raycasterRef.current
          .intersectObject(model, true)
          .map((hit) => hit.object)
          .find((object) => object?.isMesh) ?? null
      );
    },
    [cameraRef, modelRef, rendererRef],
  );
  const restoreControls = () => {
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  };
  const getInteractionPoint = (clientPoint) => {
    if (renderInteractionMode === "camera") {
      return getCameraImageInteractionPoint({
        cameraId: selectedAnalysisCameraId,
        canvas: cameraImageCanvasRef.current,
        clientPoint,
        image: cameraImageElementRef.current,
      });
    }
    return {
      cameraId: selectedAnalysisCameraId,
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
      resolvedConfig.camera,
      sceneRef,
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
  useEffect(() => {
    const previousThermalCameraId = previousThermalCameraIdRef.current;

    if (previousThermalCameraId && !selectedThermalCameraIdForPreview) {
      resetToOverviewCamera();
    }

    previousThermalCameraIdRef.current = selectedThermalCameraIdForPreview;
  }, [resetToOverviewCamera, selectedThermalCameraIdForPreview]);
  const switchToCamera = useCallback(
    (cameraId) => {
      const camera = getConfiguredCameraPreset(
        cameraId,
        resolvedCameraVisualizationConfig,
      );
      if (!camera) {
        return;
      }
      const focusedWorldCamera = isAnalysisTileMode
        ? getWorldPreviewCameraConfig({
            backOffsetScale: ANALYSIS_TILE_WORLD_CAMERA_BACK_OFFSET_SCALE,
            container: containerRef.current,
            model: modelRef.current,
            overviewCamera:
              initialConfig.camera ?? DEFAULT_VIEWER_3D_CONFIG.camera,
            renderer: rendererRef.current,
            resolvedCamera: resolvedConfig.camera,
            selectedCamera: camera,
          })
        : null;

      if (
        focusedWorldCamera &&
        cameraRef.current &&
        controlsRef.current
      ) {
        applyRuntimeCameraConfig(
          cameraRef.current,
          controlsRef.current,
          focusedWorldCamera,
        );
      }

      handleConfigChange({
        ...resolvedConfig,
        autoRotate: false,
        camera: focusedWorldCamera
          ? {
              ...resolvedConfig.camera,
              ...focusedWorldCamera,
            }
          : resolvedConfig.camera,
        cameraVisualization: {
          ...resolvedCameraVisualizationConfig,
          enabled: true,
          selectedCameraId: cameraId,
          showAll: false,
        },
      });
    },
    [
      cameraRef,
      controlsRef,
      handleConfigChange,
      initialConfig.camera,
      isAnalysisTileMode,
      modelRef,
      rendererRef,
      resolvedCameraVisualizationConfig,
      resolvedConfig,
    ],
  );
  const focusThermalCameraPose = useCallback(
    (pose) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const renderer = rendererRef.current;

      if (!camera || !controls || !pose?.position || !pose?.lookAt) {
        return;
      }

      const thermalPosition = toThreeVector3(pose.position);
      const thermalLookAt = toThreeVector3(pose.lookAt);
      const viewDirection = thermalPosition.clone().sub(thermalLookAt);

      if (viewDirection.lengthSq() <= 0.0001) {
        viewDirection.set(1, 0.45, 1);
      }

      const targetExtent = getThermalFocusExtent(modelRef.current);
      const thermalDistance = Math.max(0.001, viewDirection.length());
      const backOffsetScale = Math.max(1, Number(pose.backOffsetScale) || 1);
      const backOffset = Math.max(
        targetExtent * 0.18,
        thermalDistance * 0.35,
        0.08,
      ) * backOffsetScale;
      const viewPosition = thermalPosition
        .clone()
        .addScaledVector(viewDirection.normalize(), backOffset);
      const focusFov = Math.max(
        36,
        Math.min(58, (Number(pose.fov) || camera.fov || 42) * 1.45),
      );
      const nextCamera = {
        ...resolvedConfig.camera,
        fov: focusFov,
        maxDistance: Math.max(
          resolvedConfig.camera?.maxDistance ??
            DEFAULT_VIEWER_3D_CONFIG.camera.maxDistance,
          targetExtent * 8,
          viewPosition.distanceTo(thermalLookAt) * 3,
        ),
        minDistance:
          resolvedConfig.camera?.minDistance ??
          DEFAULT_VIEWER_3D_CONFIG.camera.minDistance,
        position: toPlainVector3(viewPosition),
        target: toPlainVector3(thermalLookAt),
      };

      forceRendererSizeToContainer({
        camera,
        container: containerRef.current,
        renderer,
      });
      applyRuntimeCameraConfig(camera, controls, nextCamera);
      handleConfigChange({
        ...resolvedConfig,
        autoRotate: false,
        camera: nextCamera,
      });
    },
    [
      cameraRef,
      controlsRef,
      handleConfigChange,
      modelRef,
      rendererRef,
      resolvedConfig,
    ],
  );
  useImperativeHandle(
    ref,
    () => ({
      focusThermalCameraPose,
      getThermalCamera: () => cameraRef.current,
      getThermalModel: () => modelRef.current,
      getThermalRenderer: () => rendererRef.current,
      getThermalScene: () => sceneRef.current,
      getThermalStageElement: () => stageRef.current,
      switchToCamera,
      resetToOverviewCamera,
    }),
    [
      focusThermalCameraPose,
      modelRef,
      rendererRef,
      switchToCamera,
      resetToOverviewCamera,
    ],
  );
  useEffect(() => {
    if (!isAnalysisTileMode) {
      setExpandedAnalysisCameraId(null);
    }
  }, [isAnalysisTileMode]);
  useLayoutEffect(() => {
    setWorldPopupPos(null);
  }, [selectedImagePreview?.cameraId]);
  useLayoutEffect(() => {
    if (!selectedImagePreview?.worldCamera) {
      setWorldPreviewSnapshot("");
      setWorldPreviewSnapshotFailed(false);
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
    let failedCaptureCount = 0;
    setWorldPreviewSnapshot("");
    setWorldPreviewSnapshotFailed(false);
    const capturePreview = () => {
      const snapshot = captureWorldPreviewSnapshot(
        selectedImagePreview.worldCamera,
      );
      if (!isActive) {
        return;
      }

      if (snapshot) {
        setWorldPreviewSnapshot(snapshot);
        setWorldPreviewSnapshotFailed(false);
        return;
      }

      failedCaptureCount += 1;
      if (failedCaptureCount >= 2) {
        setWorldPreviewSnapshotFailed(true);
      }
    };
    const schedulePreviewRefresh = () => {
      if (worldPreviewSnapshotFrameRef.current) {
        window.cancelAnimationFrame(worldPreviewSnapshotFrameRef.current);
      }
      failedCaptureCount = 0;
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
    selectedImagePreview,
  ]);
  const handleCameraSelect = useCallback(
    (cameraId) => {
      if (!cameraId) {
        if (isCameraVisualizationSelectionRequired) {
          return;
        }

        resetToOverviewCamera();
        return;
      }

      if (cameraId === resolvedCameraVisualizationConfig.selectedCameraId) {
        if (isCameraVisualizationSelectionRequired) {
          return;
        }

        resetToOverviewCamera();
        return;
      }
      switchToCamera(cameraId);
    },
    [
      isCameraVisualizationSelectionRequired,
      resetToOverviewCamera,
      resolvedCameraVisualizationConfig.selectedCameraId,
      switchToCamera,
    ],
  );
  const handleThermalCameraSelect = useCallback(
    (cameraId) => {
      if (isThermalCameraSelectionRequired && !cameraId) {
        return;
      }

      if (
        isThermalCameraSelectionRequired &&
        cameraId === selectedThermalCameraIdForPreview
      ) {
        return;
      }

      if (!cameraId || cameraId === selectedThermalCameraIdForPreview) {
        thermalCameraOverlay?.onCameraSelect?.(null);
        resetToOverviewCamera();
        return;
      }

      thermalCameraOverlay?.onCameraSelect?.(cameraId);
    },
    [
      isThermalCameraSelectionRequired,
      resetToOverviewCamera,
      selectedThermalCameraIdForPreview,
      thermalCameraOverlay,
    ],
  );
  const handleCameraPreviewClose = useCallback(() => {
    if (selectedThermalFramePreview) {
      thermalCameraOverlay?.onCameraSelect?.(null);
    }

    resetToOverviewCamera();
  }, [resetToOverviewCamera, selectedThermalFramePreview, thermalCameraOverlay]);
  useEffect(() => {
    if (!isThermalMeshPicking) {
      return undefined;
    }

    const canvas = rendererRef.current?.domElement;

    if (!canvas) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.button !== 0) {
        return;
      }

      const mesh = pickThermalMeshAtClientPoint({
        x: event.clientX,
        y: event.clientY,
      });

      if (mesh) {
        event.preventDefault();
        event.stopPropagation();
        onThermalMeshPicked?.(mesh);
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [
    isThermalMeshPicking,
    onThermalMeshPicked,
    pickThermalMeshAtClientPoint,
    rendererRef,
  ]);
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
          saveWorldPopupPosition(pos);
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
  const handleAnalysisTargetDelete = (targetId) => {
    restoreControls();
    analysisEditStateRef.current = undefined;
    setAnalysisEditState(undefined);
    setAnalysisPointerState(undefined);
    onAnalysisTargetDelete?.(targetId);
  };
  const analysisOverlayNode = (
    <AnalysisOverlay
      analysisSummary={analysisSummary}
      analysisTargets={filteredAnalysisTargets}
      isEditing={Boolean(analysisEditState)}
      onDelete={handleAnalysisTargetDelete}
      onSelect={onAnalysisTargetSelect}
      onTargetPointerCancel={handleAnalysisTargetPointerCancel}
      onTargetPointerDown={handleAnalysisTargetPointerDown}
      onTargetPointerMove={handleAnalysisTargetPointerMove}
      onTargetPointerUp={handleAnalysisTargetPointerUp}
      projectedTargets={projectedTargets}
      selectedProjectedTarget={selectedProjectedTarget}
      selectedTargetId={selectedAnalysisTargetId}
    />
  );
  const analysisCaptureLayerNode = shouldRenderEventLayer ? (
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
  ) : null;
  const shouldRenderStageAnalysisLayers = !shouldRenderExpandedAnalysisSurface;
  return (
    <div
      className={cn(
        "Three3DViewer Three3DViewer__root-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "Three3DViewer Three3DViewer__body-1 grid min-h-0 min-w-0 flex-1 grid-cols-1",
          showOptionBar &&
            "grid-rows-[minmax(10rem,1fr)_minmax(0,16rem)] md:grid-cols-[minmax(0,1fr)_18rem] md:grid-rows-[minmax(0,1fr)]",
        )}
      >
        <div
          ref={stageRef}
          className="Three3DViewer Three3DViewer__stage-1 relative min-h-0 min-w-0 overflow-hidden bg-neutral-950 md:min-h-[14rem]"
        >
          <div
            ref={containerRef}
            className={cn(
              "Three3DViewer Three3DViewer__canvas-host-1 absolute inset-0 z-0 h-full min-h-0 w-full",
              shouldRenderCameraImagePreview &&
                "pointer-events-none opacity-0",
            )}
          />
          {shouldRenderCameraImagePreview ? (
            <CameraImageCanvas
              canvasRef={cameraImageCanvasRef}
              imageElementRef={cameraImageElementRef}
              imageUrl={selectedImagePreview.imageUrl}
              label={selectedImagePreview.label}
              onFrameChange={handleCameraImageFrameChange}
            />
          ) : null}
          {isAnalysisTileMode ? (
            <AnalysisCameraTileOverlay
              analysisCaptureLayer={analysisCaptureLayerNode}
              analysisOverlay={analysisOverlayNode}
              canvasRef={cameraImageCanvasRef}
              expandedCamera={expandedAnalysisCamera}
              imageElementRef={cameraImageElementRef}
              selectedCameraId={selectedCameraForPreview?.id}
              onCameraImageFrameChange={handleCameraImageFrameChange}
              onCameraSelect={switchToCamera}
              onExpandedCameraChange={setExpandedAnalysisCameraId}
            />
          ) : null}
          {selectedThermalTileFramePreview ? (
            <AnalysisExpandedThermalFramePreview
              analysisCaptureLayer={analysisCaptureLayerNode}
              analysisOverlay={analysisOverlayNode}
              canvasRef={cameraImageCanvasRef}
              framePreview={selectedThermalTileFramePreview}
              imageElementRef={cameraImageElementRef}
              onCameraImageFrameChange={handleCameraImageFrameChange}
              onClose={() => selectedThermalTileFramePreview.onClose?.()}
            />
          ) : null}
          {shouldRenderCameraImagePreview ? (
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
                    {selectedImagePreview.label}
                  </p>
                  <p className="sr-only">
                    Live 3D world
                  </p>
                  <p className="truncate font-mono text-[10px] text-cyan-100/70">
                    {formatWorldPreviewSubtitle(selectedImagePreview)}
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
                    alt={`${selectedImagePreview.label} world snapshot`}
                    className="Three3DViewer Three3DViewer__world-snapshot-1 block max-h-full max-w-full object-contain"
                    src={worldPreviewSnapshot}
                  />
                ) : worldPreviewSnapshotFailed ? (
                  <div
                    className="Three3DViewer Three3DViewer__world-snapshot-fallback-1 flex aspect-video w-full items-center justify-center text-cyan-100/55"
                    aria-label="World snapshot unavailable"
                    role="img"
                  >
                    <Box className="h-5 w-5" aria-hidden="true" />
                  </div>
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
          {shouldRenderStageAnalysisLayers ? analysisOverlayNode : null}
          {shouldRenderCameraListOverlay ||
          shouldRenderAnalysisModeToolbar ||
          shouldRenderThermalCameraListOverlay ? (
            <div
              className={cn(
                "Three3DViewer Three3DViewer__right-overlay-dock-1 pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2",
                selectedThermalTileFramePreview ? "z-[90]" : "z-50",
              )}
            >
              {shouldRenderAnalysisModeToolbar ? (
                <AnalysisModeToolbar
                  activeMode={activeAnalysisMode}
                  onChange={onAnalysisModeChange}
                />
              ) : null}
              {shouldRenderCameraListOverlay ? (
                <CameraListOverlay
                  selectedCameraId={
                    activeCameraVisualizationConfig.selectedCameraId
                  }
                  showAllOption={!isCameraVisualizationSelectionRequired}
                  allOptionLabel="ALL"
                  allOptionTitle="모든 카메라 보기"
                  onCameraHover={setHoveredCameraId}
                  onCameraSelect={handleCameraSelect}
                />
              ) : null}
              {shouldRenderThermalCameraListOverlay ? (
                <CameraListOverlay
                  ariaLabel="열화상 카메라 목록"
                  cameras={thermalCameraOverlay.cameras}
                  getCameraId={(camera) => camera.cameraId}
                  getCameraLabel={(camera, index) =>
                    String(camera.cameraIndex ?? index + 1)
                  }
                  getCameraName={(camera) => camera.cameraName}
                  selectedCameraId={thermalCameraOverlay.selectedCameraId}
                  showAllOption={!isThermalCameraSelectionRequired}
                  allOptionLabel="ALL"
                  allOptionTitle="모든 열화상 카메라 보기"
                  onCameraHover={thermalCameraOverlay.onCameraHover}
                  onCameraSelect={handleThermalCameraSelect}
                />
              ) : null}
            </div>
          ) : null}
          {shouldRenderStageAnalysisLayers ? analysisCaptureLayerNode : null}
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

function AnalysisCameraTileOverlay({
  analysisCaptureLayer,
  analysisOverlay,
  canvasRef,
  expandedCamera,
  imageElementRef,
  onCameraImageFrameChange,
  onCameraSelect,
  onExpandedCameraChange,
  selectedCameraId,
}) {
  const cameras = useMemo(
    () => getAllCameraPresets().slice(0, ANALYSIS_CAMERA_TILE_COUNT),
    [],
  );
  const cells = [
    cameras[0],
    cameras[1],
    cameras[2],
    cameras[3],
    { type: "world" },
    cameras[4],
    cameras[5],
    cameras[6],
    cameras[7],
  ];

  return (
    <div className="Three3DViewer Three3DViewer__analysis-tile-overlay-1 pointer-events-none absolute inset-0 z-[45] grid min-h-0 min-w-0 p-3">
      <div className="Three3DViewer Three3DViewer__analysis-tile-grid-1 grid min-h-0 min-w-0 grid-cols-3 grid-rows-3 gap-2">
        {cells.map((cell, index) =>
          cell?.type === "world" ? (
            <AnalysisWorldTile key="world" />
          ) : (
            <AnalysisCameraImageTile
              key={cell?.id ?? `analysis-camera-empty-${index}`}
              active={cell?.id === selectedCameraId}
              camera={cell}
              onExpand={(camera) => onExpandedCameraChange?.(camera?.id)}
              onSelect={onCameraSelect}
            />
          ),
        )}
      </div>
      {expandedCamera ? (
        <AnalysisExpandedCameraTile
          analysisCaptureLayer={analysisCaptureLayer}
          analysisOverlay={analysisOverlay}
          canvasRef={canvasRef}
          camera={expandedCamera}
          imageElementRef={imageElementRef}
          onCameraImageFrameChange={onCameraImageFrameChange}
          onClose={() => onExpandedCameraChange?.(null)}
        />
      ) : null}
    </div>
  );
}

function AnalysisWorldTile() {
  return (
    <div className="Three3DViewer Three3DViewer__analysis-world-tile-1 pointer-events-none relative min-h-0 min-w-0 overflow-hidden rounded-md border-2 border-cyan-200/70 bg-cyan-950/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_0_26px_rgba(34,211,238,0.22)]">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,rgba(103,232,249,0.22)_0,rgba(103,232,249,0.22)_1px,transparent_1px,transparent_12px)]" />
      <div className="absolute inset-2 rounded-sm border border-dashed border-cyan-100/50" />
      <div className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-sm border border-cyan-100/50 bg-neutral-950/82 px-2 py-1 text-[10px] font-bold text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)] backdrop-blur-sm">
        <Box className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">3D VIEWER</span>
      </div>
      <div className="absolute inset-x-7 top-1/2 h-px -translate-y-1/2 bg-cyan-100/40" />
      <div className="absolute inset-y-7 left-1/2 w-px -translate-x-1/2 bg-cyan-100/40" />
      <div className="absolute bottom-2 right-2 rounded-sm border border-cyan-100/35 bg-neutral-950/72 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-100/80 backdrop-blur-sm">
        WORLD
      </div>
    </div>
  );
}

function AnalysisCameraImageTile({ active, camera, onExpand, onSelect }) {
  const handleSelect = () => {
    if (camera?.id) {
      onSelect?.(camera.id);
    }
  };
  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleSelect();
  };

  return (
    <div
      role="button"
      tabIndex={camera ? 0 : -1}
      aria-pressed={active}
      className={cn(
        "Three3DViewer Three3DViewer__analysis-camera-tile-1 pointer-events-auto relative min-h-0 min-w-0 overflow-hidden rounded-md border bg-neutral-950/88 text-left shadow-2xl outline-none transition",
        camera
          ? "cursor-pointer hover:border-cyan-200/55 hover:shadow-[0_0_24px_rgba(103,232,249,0.2)] focus-visible:ring-2 focus-visible:ring-cyan-200/60"
          : "cursor-default opacity-70",
        active
          ? "border-red-400 ring-2 ring-red-400/80 shadow-[0_0_24px_rgba(248,113,113,0.32)]"
          : "border-white/15",
      )}
      title={camera?.name ?? "Camera"}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {camera?.sampleImagePath ? (
        <img
          alt={camera.name}
          className="h-full w-full object-cover"
          draggable={false}
          src={camera.sampleImagePath}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-neutral-950 text-[11px] font-semibold text-white/45">
          No camera
        </div>
      )}
      <div className="absolute left-2 top-2 rounded-sm border border-white/15 bg-black/72 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        {camera?.id ?? "-"}
      </div>
      <button
        type="button"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-sm border border-white/20 bg-black/72 text-white/80 backdrop-blur-sm transition hover:border-cyan-200/50 hover:bg-cyan-300/20 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!camera?.sampleImagePath}
        title="Expand camera frame"
        aria-label={`${camera?.name ?? "Camera"} expand`}
        onClick={(event) => {
          event.stopPropagation();
          onExpand?.(camera);
        }}
      >
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function AnalysisExpandedCameraTile({
  analysisCaptureLayer,
  analysisOverlay,
  camera,
  canvasRef,
  imageElementRef,
  onCameraImageFrameChange,
  onClose,
}) {
  return (
    <div
      className="Three3DViewer Three3DViewer__analysis-expanded-preview-1 pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-black/76 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={camera?.name ?? "Camera preview"}
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[calc(100dvh-1.5rem)] w-[min(96vw,68rem)] max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-cyan-200/35 bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {camera?.name ?? "Camera"}
            </p>
            <p className="truncate font-mono text-[11px] text-white/55">
              FOV {camera?.fov ?? "-"} deg
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
            title="Close"
            aria-label="Close expanded camera frame"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative h-[min(64dvh,34rem)] min-h-[14rem] overflow-hidden bg-black md:h-[min(74dvh,40rem)]">
          {camera?.sampleImagePath ? (
            <>
              <CameraImageCanvas
                canvasRef={canvasRef}
                imageElementRef={imageElementRef}
                imageUrl={camera.sampleImagePath}
                label={camera.name}
                onFrameChange={onCameraImageFrameChange}
              />
              {analysisOverlay}
              {analysisCaptureLayer}
            </>
          ) : (
            <div className="grid min-h-[16rem] place-items-center text-sm font-semibold text-white/50">
              No camera frame
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisExpandedThermalFramePreview({
  analysisCaptureLayer,
  analysisOverlay,
  canvasRef,
  framePreview,
  imageElementRef,
  onCameraImageFrameChange,
  onClose,
}) {
  return (
    <div
      className="Three3DViewer Three3DViewer__thermal-analysis-expanded-preview-1 pointer-events-auto absolute inset-0 z-[80] grid place-items-center bg-black/76 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={framePreview?.cameraName ?? "Thermal frame preview"}
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[calc(100dvh-1.5rem)] w-[min(96vw,68rem)] max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-cyan-200/35 bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {framePreview?.cameraName ?? "Thermal camera"}
            </p>
            <p className="truncate font-mono text-[11px] text-white/55">
              {framePreview?.width && framePreview?.height
                ? `${framePreview.width}x${framePreview.height}`
                : "No frame"}
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
            title="Close"
            aria-label="Close expanded thermal frame"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative h-[min(64dvh,34rem)] min-h-[14rem] overflow-hidden bg-black md:h-[min(74dvh,40rem)]">
          {framePreview?.imageUrl ? (
            <>
              <CameraImageCanvas
                canvasRef={canvasRef}
                imageElementRef={imageElementRef}
                imageUrl={framePreview.imageUrl}
                label={framePreview.cameraName}
                onFrameChange={onCameraImageFrameChange}
              />
              {analysisOverlay}
              {analysisCaptureLayer}
            </>
          ) : (
            <div className="grid min-h-[16rem] place-items-center text-sm font-semibold text-white/50">
              No frame
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatWorldPreviewSubtitle(preview) {
  const fov = Number(preview?.fov);

  if (Number.isFinite(fov)) {
    return `World snapshot · FOV ${Math.round(fov * 10) / 10}°`;
  }

  return "World snapshot";
}

function loadWorldPopupPosition() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(WORLD_POPUP_POS_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);
    if (typeof parsed?.left === "number" && typeof parsed?.top === "number") {
      return parsed;
    }
  } catch {}

  return null;
}

function saveWorldPopupPosition(position) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WORLD_POPUP_POS_KEY, JSON.stringify(position));
  } catch {}
}

function toThreeVector3(vector) {
  return new THREE.Vector3(
    Number(vector.x) || 0,
    Number(vector.y) || 0,
    Number(vector.z) || 0,
  );
}

function toPlainVector3(vector) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function getConfiguredCameraPreset(cameraId, cameraVisualizationConfig = {}) {
  const camera = getCameraPreset(cameraId);

  if (!camera) {
    return undefined;
  }

  return {
    ...camera,
    fov: cameraVisualizationConfig.customFovs?.[cameraId] ?? camera.fov,
    position:
      cameraVisualizationConfig.customPositions?.[cameraId] ??
      camera.position,
  };
}

function getThermalFocusExtent(model) {
  if (!model) {
    return 1;
  }

  model.updateWorldMatrix?.(true, true);
  const box = new THREE.Box3().setFromObject(model);

  if (box.isEmpty()) {
    return 1;
  }

  const size = new THREE.Vector3();
  box.getSize(size);

  return Math.max(size.x, size.y, size.z, 1);
}
