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
import { useWorldPreviewPopup } from "./hooks/useWorldPreviewPopup";
import { AnalysisModeToolbar } from "./components/AnalysisModeToolbar";
import { AnalysisOverlay } from "./components/AnalysisOverlay";
import {
  AnalysisCameraTileOverlay,
  AnalysisExpandedThermalFramePreview,
} from "./components/AnalysisCameraTileOverlay";
import { CameraImageCanvas } from "./components/CameraImageCanvas";
import { CameraListOverlay } from "./components/CameraListOverlay";
import { ViewerLoadState } from "./components/ViewerLoadState";
import { WorldPreviewPopup } from "./components/WorldPreviewPopup";
import { getCameraPreset } from "./constants/cameraPresets";
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
    onTileLayoutChange,
    onThermalMeshPicked,
    selectedAnalysisTargetId,
    showCameraOverlays = true,
    thermalCameraOverlay,
    tileLayoutConfig,
    visualCameraCalibrationEnabled = false,
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
  const [analysisTileWorldSnapshot, setAnalysisTileWorldSnapshot] =
    useState("");
  const [expandedAnalysisCameraId, setExpandedAnalysisCameraId] =
    useState(null);
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
      }
    : resolvedCameraVisualizationConfig;
  const isAnalysisTileMode = Boolean(
    analysisViewMode === "tiles" &&
      !hideCameraVisualization &&
      showCameraOverlays &&
      activeCameraVisualizationConfig.enabled,
  );
  const shouldSuspendWorldRenderForTiles = Boolean(
    analysisViewMode === "tiles" &&
      (isAnalysisTileMode || thermalCameraOverlay),
  );
  const sceneCameraVisualizationConfig = isAnalysisTileMode
    ? {
        ...activeCameraVisualizationConfig,
        editComparison: undefined,
        enabled: true,
        requireSelection: false,
        showAll: !activeCameraVisualizationConfig.selectedCameraId,
      }
    : activeCameraVisualizationConfig;
  const selectedVisualCameraConfig = visualCameraCalibrationEnabled
    ? resolvedCameraVisualizationConfig
    : activeCameraVisualizationConfig;
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
    sceneRef,
    resolvedConfig.camera,
    resolvedConfig.controls,
  );
  useThreeLighting(sceneRef, resolvedConfig.lighting);
  useThreeBackground(sceneRef, resolvedConfig.background);
  const {
    getCameraAtClientPoint: pickCameraAtClientPoint,
    setHoveredCameraId,
  } = useThreeCameraVisualization(sceneRef, sceneCameraVisualizationConfig);
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
  const selectedVisualCamera = useMemo(() => {
    if (
      !selectedVisualCameraConfig.selectedCameraId
    ) {
      return undefined;
    }

    return getConfiguredCameraPreset(
      selectedVisualCameraConfig.selectedCameraId,
      selectedVisualCameraConfig,
    );
  }, [
    selectedVisualCameraConfig.customFovs,
    selectedVisualCameraConfig.customPositions,
    selectedVisualCameraConfig.customTargets,
    selectedVisualCameraConfig.selectedCameraId,
  ]);
  const selectedCameraForPreview =
    showCameraOverlays && !visualCameraCalibrationEnabled
      ? selectedVisualCamera
      : undefined;
  const visualCameraCalibrationPreview = useMemo(() => {
    if (
      !visualCameraCalibrationEnabled ||
      !selectedVisualCamera?.sampleImagePath
    ) {
      return null;
    }

    return {
      cameraId: selectedVisualCamera.id,
      fov: selectedVisualCamera.fov,
      imageUrl: selectedVisualCamera.sampleImagePath,
      label: selectedVisualCamera.name,
      worldCamera: selectedVisualCamera,
    };
  }, [selectedVisualCamera, visualCameraCalibrationEnabled]);
  const visualCameraCalibrationImageOpacity =
    clampVisualCalibrationImageOpacity(
      selectedVisualCameraConfig.calibrationImageOpacity,
    );
  const isVisualCalibrationImageHidden =
    selectedVisualCameraConfig.hideCalibrationImage === true;
  const isVisualCalibrationMeshHidden =
    selectedVisualCameraConfig.hideCalibrationMesh === true;
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
  const isThermalCalibrationFramePreview =
    rawThermalFramePreview?.presentation === "calibration-overlay";
  const isSelectedThermalCameraFramePreview = Boolean(
    selectedThermalCameraIdForPreview &&
      rawThermalFramePreview?.cameraId === selectedThermalCameraIdForPreview,
  );
  const selectedThermalFramePreview =
    rawThermalFramePreview &&
    (isThermalTileFramePreview ||
      isSelectedThermalCameraFramePreview)
      ? rawThermalFramePreview
      : null;
  const selectedThermalViewerFramePreview =
    isThermalTileFramePreview || isThermalCalibrationFramePreview
      ? null
      : selectedThermalFramePreview;
  const selectedThermalTileFramePreview = isThermalTileFramePreview
    ? selectedThermalFramePreview
    : null;
  const selectedThermalCalibrationFramePreview =
    isThermalCalibrationFramePreview
      ? selectedThermalFramePreview
      : null;
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
  const {
    handlePointerDown: handleWorldPopupPointerDown,
    handlePointerMove: handleWorldPopupPointerMove,
    handlePointerUp: handleWorldPopupPointerUp,
    popupRef: worldPopupRef,
    position: worldPopupPos,
  } = useWorldPreviewPopup(containerRef, selectedImagePreview?.cameraId);
  const shouldRenderCameraImagePreview = Boolean(selectedImagePreview);
  const shouldRenderVisualCameraCalibrationOverlay = Boolean(
    visualCameraCalibrationPreview && !isVisualCalibrationImageHidden,
  );
  const shouldRenderThermalCameraCalibrationOverlay = Boolean(
    selectedThermalCalibrationFramePreview?.imageUrl &&
      !selectedThermalCalibrationFramePreview?.hideCalibrationImage,
  );
  const isThermalCalibrationMeshHidden =
    selectedThermalCalibrationFramePreview?.hideCalibrationMesh === true;
  const thermalCameraCalibrationImageOpacity =
    selectedThermalCalibrationFramePreview?.calibrationImageOpacity ??
    visualCameraCalibrationImageOpacity;
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
    analysisViewMode !== "tiles" &&
      thermalCameraOverlay?.showCameraListOverlay !== false &&
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
  const captureCurrentWorldSnapshot = useCallback(() => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!camera || !renderer || !scene) {
      return "";
    }

    forceRendererSizeToContainer({
      camera,
      container: containerRef.current,
      renderer,
    });
    renderer.render(scene, camera);
    try {
      return renderer.domElement.toDataURL("image/png");
    } catch {
      return "";
    }
  }, [cameraRef, rendererRef, sceneRef]);
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
      const camera = cameraId
        ? getConfiguredCameraPreset(
            cameraId,
            resolvedCameraVisualizationConfig,
          )
        : null;
      if (cameraId && !camera) {
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
            selectedCamera: camera ?? null,
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
          selectedCameraId: camera?.id ?? null,
          showAll: !camera,
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

      if (pose.useWorldPreviewFraming === true) {
        const focusedWorldCamera = getWorldPreviewCameraConfig({
          backOffsetScale,
          container: containerRef.current,
          model: modelRef.current,
          overviewCamera:
            initialConfig.camera ?? DEFAULT_VIEWER_3D_CONFIG.camera,
          renderer,
          resolvedCamera: resolvedConfig.camera,
          selectedCamera: {
            fov: pose.fov,
            position: toPlainVector3(thermalPosition),
            target: toPlainVector3(thermalLookAt),
          },
        });

        applyRuntimeCameraConfig(camera, controls, focusedWorldCamera);
        handleConfigChange({
          ...resolvedConfig,
          autoRotate: false,
          camera: {
            ...resolvedConfig.camera,
            ...focusedWorldCamera,
          },
        });
        return;
      }

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
      initialConfig.camera,
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
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return undefined;
    }

    const previousPauseRender = renderer.domElement.dataset.pauseRender;

    if (shouldSuspendWorldRenderForTiles) {
      renderer.domElement.dataset.pauseRender = "true";
    } else if (previousPauseRender === "true") {
      delete renderer.domElement.dataset.pauseRender;
    }

    return () => {
      if (previousPauseRender === undefined) {
        delete renderer.domElement.dataset.pauseRender;
      } else {
        renderer.domElement.dataset.pauseRender = previousPauseRender;
      }
    };
  }, [rendererRef, shouldSuspendWorldRenderForTiles]);
  useEffect(() => {
    if (!isAnalysisTileMode || loadState.isLoading || loadState.error) {
      setAnalysisTileWorldSnapshot("");
      return undefined;
    }

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let isActive = true;
    let frameId = 0;
    const retryTimeoutIds = [];
    const captureSnapshot = () => {
      const snapshot = captureCurrentWorldSnapshot();
      if (isActive && snapshot) {
        setAnalysisTileWorldSnapshot(snapshot);
      }
    };
    const scheduleSnapshot = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        captureSnapshot();
      });
    };
    const scheduleDelayedSnapshot = (delay) => {
      const timeoutId = window.setTimeout(scheduleSnapshot, delay);
      retryTimeoutIds.push(timeoutId);
    };
    const resizeObserver = new ResizeObserver(scheduleSnapshot);
    resizeObserver.observe(container);
    setAnalysisTileWorldSnapshot("");
    scheduleSnapshot();
    scheduleDelayedSnapshot(250);
    scheduleDelayedSnapshot(900);

    return () => {
      isActive = false;
      resizeObserver.disconnect();
      retryTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [
    captureCurrentWorldSnapshot,
    isAnalysisTileMode,
    loadState.error,
    loadState.isLoading,
    resolvedConfig.camera,
    activeCameraVisualizationConfig.selectedCameraId,
    activeCameraVisualizationConfig.customFovs,
    activeCameraVisualizationConfig.customPositions,
    activeCameraVisualizationConfig.customTargets,
    tileLayoutConfig,
  ]);
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
  useLayoutEffect(() => {
    const selectedCamera = visualCameraCalibrationPreview?.worldCamera;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;

    if (
      !selectedCamera ||
      !camera ||
      !controls ||
      !renderer ||
      !scene ||
      loadState.isLoading ||
      loadState.error
    ) {
      return;
    }

    const position = toThreeVector3(selectedCamera.position);
    const target = toThreeVector3(selectedCamera.target);
    const targetExtent = getThermalFocusExtent(modelRef.current);
    const distanceToTarget = Math.max(0.001, position.distanceTo(target));
    const nextCamera = {
      ...resolvedConfig.camera,
      fov: selectedCamera.fov ?? camera.fov,
      maxDistance: Math.max(
        resolvedConfig.camera?.maxDistance ??
          DEFAULT_VIEWER_3D_CONFIG.camera.maxDistance,
        targetExtent * 8,
        distanceToTarget * 4,
      ),
      minDistance:
        resolvedConfig.camera?.minDistance ??
        DEFAULT_VIEWER_3D_CONFIG.camera.minDistance,
      position: toPlainVector3(position),
      target: toPlainVector3(target),
    };

    forceRendererSizeToContainer({
      camera,
      container: containerRef.current,
      renderer,
    });
    applyRuntimeCameraConfig(camera, controls, nextCamera);
    renderer.render(scene, camera);
  }, [
    cameraRef,
    controlsRef,
    loadState.error,
    loadState.isLoading,
    modelRef,
    rendererRef,
    resolvedConfig.camera,
    sceneRef,
    visualCameraCalibrationPreview?.worldCamera,
  ]);
  useLayoutEffect(() => {
    const selectedCamera = selectedThermalCalibrationFramePreview?.worldCamera;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;

    if (
      !selectedCamera?.position ||
      !selectedCamera?.target ||
      !camera ||
      !controls ||
      !renderer ||
      !scene ||
      loadState.isLoading ||
      loadState.error
    ) {
      return;
    }

    const position = toThreeVector3(selectedCamera.position);
    const target = toThreeVector3(selectedCamera.target);
    const targetExtent = getThermalFocusExtent(modelRef.current);
    const distanceToTarget = Math.max(0.001, position.distanceTo(target));
    const nextCamera = {
      ...resolvedConfig.camera,
      fov: selectedCamera.fov ?? camera.fov,
      maxDistance: Math.max(
        resolvedConfig.camera?.maxDistance ??
          DEFAULT_VIEWER_3D_CONFIG.camera.maxDistance,
        targetExtent * 8,
        distanceToTarget * 4,
      ),
      minDistance:
        resolvedConfig.camera?.minDistance ??
        DEFAULT_VIEWER_3D_CONFIG.camera.minDistance,
      position: toPlainVector3(position),
      target: toPlainVector3(target),
    };

    forceRendererSizeToContainer({
      camera,
      container: containerRef.current,
      renderer,
    });
    applyRuntimeCameraConfig(camera, controls, nextCamera);
    renderer.render(scene, camera);
  }, [
    cameraRef,
    controlsRef,
    loadState.error,
    loadState.isLoading,
    modelRef,
    rendererRef,
    resolvedConfig.camera,
    sceneRef,
    selectedThermalCalibrationFramePreview?.worldCamera,
  ]);
  useEffect(() => {
    const controls = controlsRef.current;

    if (
      !controls ||
      (!visualCameraCalibrationPreview &&
        !selectedThermalCalibrationFramePreview)
    ) {
      return undefined;
    }

    const previousEnabled = controls.enabled;
    controls.enabled = false;

    return () => {
      controls.enabled = previousEnabled;
    };
  }, [
    controlsRef,
    selectedThermalCalibrationFramePreview,
    visualCameraCalibrationPreview,
  ]);
  useEffect(() => {
    const model = modelRef.current;
    const hasCalibrationPreview = Boolean(
      visualCameraCalibrationPreview || selectedThermalCalibrationFramePreview,
    );

    if (!hasCalibrationPreview || !model) {
      return undefined;
    }

    const previousVisible = model.visible;
    model.visible = !(
      isVisualCalibrationMeshHidden || isThermalCalibrationMeshHidden
    );
    renderCurrentThreeScene({ cameraRef, rendererRef, sceneRef });

    return () => {
      if (modelRef.current === model) {
        model.visible = previousVisible;
        renderCurrentThreeScene({ cameraRef, rendererRef, sceneRef });
      }
    };
  }, [
    cameraRef,
    isThermalCalibrationMeshHidden,
    isVisualCalibrationMeshHidden,
    modelRef,
    rendererRef,
    sceneRef,
    selectedThermalCalibrationFramePreview,
    visualCameraCalibrationPreview,
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
              (shouldRenderCameraImagePreview ||
                shouldSuspendWorldRenderForTiles) &&
                "pointer-events-none opacity-0",
            )}
          />
          {shouldRenderVisualCameraCalibrationOverlay ? (
            <div
              className="Three3DViewer Three3DViewer__visual-calibration-image-1 pointer-events-none absolute inset-0 z-20 mix-blend-screen"
              aria-hidden="true"
              style={{ opacity: visualCameraCalibrationImageOpacity }}
            >
              <CameraImageCanvas
                canvasRef={cameraImageCanvasRef}
                imageElementRef={cameraImageElementRef}
                imageUrl={visualCameraCalibrationPreview.imageUrl}
                label={visualCameraCalibrationPreview.label}
                onFrameChange={handleCameraImageFrameChange}
              />
            </div>
          ) : null}
          {shouldRenderThermalCameraCalibrationOverlay ? (
            <div
              className="Three3DViewer Three3DViewer__thermal-calibration-image-1 pointer-events-none absolute inset-0 z-20 mix-blend-screen"
              aria-hidden="true"
              style={{ opacity: thermalCameraCalibrationImageOpacity }}
            >
              <CameraImageCanvas
                canvasRef={cameraImageCanvasRef}
                imageElementRef={cameraImageElementRef}
                imageUrl={selectedThermalCalibrationFramePreview.imageUrl}
                label={selectedThermalCalibrationFramePreview.cameraName}
                onFrameChange={handleCameraImageFrameChange}
              />
            </div>
          ) : null}
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
              tileLayoutConfig={tileLayoutConfig}
              worldSnapshot={analysisTileWorldSnapshot}
              onCameraImageFrameChange={handleCameraImageFrameChange}
              onCameraSelect={switchToCamera}
              onExpandedCameraChange={setExpandedAnalysisCameraId}
              onTileLayoutChange={onTileLayoutChange}
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
            <WorldPreviewPopup
              popupRef={worldPopupRef}
              position={worldPopupPos}
              preview={selectedImagePreview}
              snapshot={worldPreviewSnapshot}
              snapshotFailed={worldPreviewSnapshotFailed}
              onClose={handleCameraPreviewClose}
              onPointerCancel={handleWorldPopupPointerUp}
              onPointerDown={handleWorldPopupPointerDown}
              onPointerMove={handleWorldPopupPointerMove}
              onPointerUp={handleWorldPopupPointerUp}
            />
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

function renderCurrentThreeScene({ cameraRef, rendererRef, sceneRef }) {
  const camera = cameraRef.current;
  const renderer = rendererRef.current;
  const scene = sceneRef.current;

  if (camera && renderer && scene) {
    renderer.render(scene, camera);
  }
}

function clampVisualCalibrationImageOpacity(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0.55;
  }

  return Math.min(1, Math.max(0.1, numericValue));
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
    target:
      cameraVisualizationConfig.customTargets?.[cameraId] ??
      camera.target,
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
