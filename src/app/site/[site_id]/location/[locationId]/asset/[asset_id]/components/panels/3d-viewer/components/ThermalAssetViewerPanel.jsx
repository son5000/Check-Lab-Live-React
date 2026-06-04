"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Crosshair,
  Flame,
  Grid3X3,
  Maximize2,
  RotateCcw,
  Thermometer,
  X,
} from "lucide-react";
import * as THREE from "three";
import {
  applyThermalTextureLayersToObject3D,
  applyThermalTextureToObject3D,
  collectThermalTargetMeshUuids,
  createThermalCanvasFromFrame,
  createThermalTextureFromCanvas,
  MOCK_THERMAL_CAMERAS,
  restoreOriginalMaterial,
  THERMAL_CAPTURE_VERTICAL_FOV_MAX_DEGREES,
  THERMAL_CAPTURE_VERTICAL_FOV_MIN_DEGREES,
} from "@/lib/thermal-mapping";
import { ThermalCameraList } from "@/app/monitoring/thermal-mapping/components/ThermalCameraList";
import { ThermalCalibrationOverlay } from "@/app/monitoring/thermal-mapping/components/ThermalCalibrationOverlay";
import { ThermalMappingControls } from "@/app/monitoring/thermal-mapping/components/ThermalMappingControls";
import { useMockThermalCameraFrames } from "@/app/monitoring/thermal-mapping/hooks/useMockThermalCameraFrames";
import { useThermalCameraPreviewPlanes } from "@/app/monitoring/thermal-mapping/hooks/useThermalCameraPreviewPlanes";
import {
  DEFAULT_THERMAL_ALIGNMENT,
  useThermalAlignment,
} from "@/app/monitoring/thermal-mapping/hooks/useThermalAlignment";
import { captureThreeViewerCanvas } from "@/app/monitoring/thermal-mapping/utils/captureThreeViewer";
import {
  DEFAULT_THERMAL_SAMPLE_POSE,
  getThermalTargetMetrics,
  resolveThermalCameraPose,
} from "@/app/monitoring/thermal-mapping/utils/thermalCameraPose";

const THERMAL_TILE_CAMERA_COUNT = 8;
const THERMAL_VIEW_MODES = Object.freeze({
  TILES: "tiles",
  WORLD: "world",
});

export function ThermalAssetViewerPanel({ onClose, ...contentProps }) {
  return (
    <aside className="Three3DViewer Three3DViewer__thermal-panel-1 absolute inset-x-3 bottom-3 z-[70] grid max-h-[min(72dvh,40rem)] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-cyan-200/20 bg-black/78 text-white shadow-2xl backdrop-blur-md md:left-auto md:w-[min(60rem,calc(100%-1.5rem))]">
      <header className="flex min-w-0 items-start justify-between gap-3 border-b border-white/10 px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-cyan-300/30 bg-cyan-300/12 text-cyan-100">
            <Thermometer className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">
              Asset 3D Viewer 열화상 매핑
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-white/55">
              백엔드 실시간 열화상 데이터 대체용 CSV Mock 데이터를 현재 3D Viewer mesh에 적용합니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
          onClick={onClose}
          title="열화상 매핑 닫기"
          aria-label="열화상 매핑 닫기"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <ThermalAssetViewerContent {...contentProps} showOverlaySection />
    </aside>
  );
}

export function ThermalAssetViewerOptionContent(props) {
  return <ThermalAssetViewerContent {...props} showOverlaySection={false} />;
}

function ThermalAssetViewerContent({
  cameras = MOCK_THERMAL_CAMERAS,
  captureTargetRef,
  isPickingMesh,
  materialRecordsRef,
  onSelectedCameraChange,
  onSelectedFramePreviewChange,
  onPickMesh,
  projectionRenderer,
  projectionScene,
  selectedCameraId: controlledSelectedCameraId,
  selectedTargetLabel,
  selectedTargetObject,
  showOverlaySection = true,
  storageKey,
  viewerRef,
  worldOverlayHost,
}) {
  const { error, framesByCameraId, loading } =
    useMockThermalCameraFrames(cameras);
  const isSelectedCameraControlled = controlledSelectedCameraId !== undefined;
  const [uncontrolledSelectedCameraId, setUncontrolledSelectedCameraId] =
    useState(null);
  const selectedCameraId = isSelectedCameraControlled
    ? controlledSelectedCameraId
    : uncontrolledSelectedCameraId;
  const setSelectedCameraId = useCallback(
    (nextCameraId) => {
      const resolvedCameraId =
        typeof nextCameraId === "function"
          ? nextCameraId(selectedCameraId)
          : nextCameraId;

      if (!isSelectedCameraControlled) {
        setUncontrolledSelectedCameraId(resolvedCameraId);
      }

      onSelectedCameraChange?.(resolvedCameraId);
    },
    [isSelectedCameraControlled, onSelectedCameraChange, selectedCameraId],
  );
  const [captureResult, setCaptureResult] = useState(null);
  const [meshTextureMessage, setMeshTextureMessage] = useState("");
  const [textureActionVersion, setTextureActionVersion] = useState(0);
  const [thermalViewMode, setThermalViewMode] = useState(
    THERMAL_VIEW_MODES.WORLD,
  );
  const [showThermalLaserGuide, setShowThermalLaserGuide] = useState(true);
  const autoAppliedThermalLayerKeyRef = useRef("");
  const localMaterialRecordsRef = useRef(new Map());
  const thermalMaterialRecordsRef =
    materialRecordsRef ?? localMaterialRecordsRef;
  const poseStorageKey = storageKey
    ? `${storageKey}:thermal-camera-pose-overrides:v1`
    : "";
  const [cameraPoseOverrides, setCameraPoseOverrides] = useState(() =>
    loadThermalCameraPoseOverrides(poseStorageKey),
  );
  const { getAlignment, resetAlignment, updateAlignment } = useThermalAlignment({
    storageKey,
  });
  const resolvedThermalCameras = useMemo(
    () =>
      cameras.map((camera, index) =>
        withThermalCameraPoseOverride(
          camera,
          index,
          cameraPoseOverrides,
          cameras.length,
        ),
      ),
    [cameraPoseOverrides, cameras],
  );
  const selectedCameraIndex = useMemo(
    () => cameras.findIndex((camera) => camera.cameraId === selectedCameraId),
    [cameras, selectedCameraId],
  );
  const selectedBasePose = useMemo(
    () =>
      selectedCameraIndex >= 0
        ? getThermalCameraBasePose(
            cameras[selectedCameraIndex],
            selectedCameraIndex,
            cameras.length,
          )
        : null,
    [cameras, selectedCameraIndex],
  );
  const selectedVirtualPose = useMemo(
    () =>
      selectedCameraIndex >= 0
        ? getThermalCameraBasePose(
            resolvedThermalCameras[selectedCameraIndex],
            selectedCameraIndex,
            resolvedThermalCameras.length,
          )
        : null,
    [resolvedThermalCameras, selectedCameraIndex],
  );
  const selectedResolvedPose = useMemo(() => {
    if (selectedCameraIndex < 0 || !selectedTargetObject) {
      return null;
    }

    const camera = resolvedThermalCameras[selectedCameraIndex];
    if (!camera) {
      return null;
    }

    return resolveThermalCameraPose({
      camera,
      index: selectedCameraIndex,
      targetMetrics: getThermalTargetMetrics(selectedTargetObject),
      totalCount: resolvedThermalCameras.length,
    });
  }, [resolvedThermalCameras, selectedCameraIndex, selectedTargetObject]);
  const selectedFrame = selectedCameraId
    ? framesByCameraId[selectedCameraId]
    : undefined;
  const selectedFrameImageDataUrl = useMemo(() => {
    return getThermalFrameImageDataUrl(selectedFrame);
  }, [selectedFrame]);
  const selectedAlignment = selectedCameraId
    ? getAlignment(selectedCameraId)
    : DEFAULT_THERMAL_ALIGNMENT;
  const targetLabel = selectedTargetLabel || "전체 3D 모델";
  const paletteRange = useMemo(
    () =>
      selectedFrame
        ? {
            paletteMaxTemperature: selectedFrame.maxTemperature,
            paletteMinTemperature: selectedFrame.minTemperature,
          }
        : undefined,
    [selectedFrame],
  );
  const appliedLayerCount = getThermalAppliedLayerCount(
    thermalMaterialRecordsRef.current,
    selectedTargetObject,
    textureActionVersion,
  );
  const depthMaskEnabled = Boolean(
    !showOverlaySection &&
      projectionRenderer &&
      projectionScene &&
      selectedTargetObject,
  );
  const shouldRenderThermalTileOverlay = Boolean(
    !showOverlaySection && thermalViewMode === THERMAL_VIEW_MODES.TILES,
  );
  const thermalTileEntries = useMemo(
    () =>
      resolvedThermalCameras
        .slice(0, THERMAL_TILE_CAMERA_COUNT)
        .map((camera, index) => ({
          camera,
          frame: framesByCameraId[camera.cameraId],
          index,
        })),
    [framesByCameraId, resolvedThermalCameras],
  );
  const activeThermalViewMode = thermalViewMode;
  const handleThermalViewModeChange = useCallback(
    (nextMode) => {
      setThermalViewMode(nextMode);
    },
    [],
  );

  useThermalCameraPreviewPlanes({
    cameras: resolvedThermalCameras,
    enabled:
      !showOverlaySection &&
      Boolean(projectionScene && selectedTargetObject),
    framesByCameraId,
    scene: projectionScene,
    selectedCameraId,
    showLaserGuide: showThermalLaserGuide,
    targetObject: selectedTargetObject,
  });

  useEffect(() => {
    if (
      showOverlaySection ||
      !selectedCameraId ||
      selectedCameraIndex < 0 ||
      !selectedTargetObject ||
      !selectedResolvedPose
    ) {
      return;
    }

    const focusThermalCameraPose =
      viewerRef?.current?.focusThermalCameraPose;

    if (typeof focusThermalCameraPose !== "function") {
      return;
    }

    focusThermalCameraPose({
      fov: selectedResolvedPose.projectorFov,
      lookAt: toPlainThermalVector(selectedResolvedPose.lookAt),
      position: toPlainThermalVector(selectedResolvedPose.position),
    });
  }, [
    selectedCameraId,
    selectedResolvedPose,
    selectedTargetObject,
    showOverlaySection,
    viewerRef,
  ]);

  const selectedFramePreview = useMemo(() => {
    if (
      showOverlaySection ||
      activeThermalViewMode !== THERMAL_VIEW_MODES.WORLD ||
      !selectedCameraId ||
      !selectedFrame ||
      !selectedFrameImageDataUrl
    ) {
      return null;
    }

    return {
      cameraId: selectedFrame.cameraId,
      cameraIndex: selectedFrame.cameraIndex,
      cameraName: selectedFrame.cameraName,
      capturedAt: selectedFrame.capturedAt,
      fov: selectedResolvedPose?.projectorFov,
      height: selectedFrame.height,
      imageUrl: selectedFrameImageDataUrl,
      width: selectedFrame.width,
      worldCamera: selectedResolvedPose
        ? {
            fov: selectedResolvedPose.projectorFov,
            position: toPlainThermalVector(selectedResolvedPose.position),
            target: toPlainThermalVector(selectedResolvedPose.lookAt),
          }
        : null,
    };
  }, [
    activeThermalViewMode,
    selectedCameraId,
    selectedFrame,
    selectedFrameImageDataUrl,
    selectedResolvedPose,
    showOverlaySection,
  ]);

  useEffect(() => {
    onSelectedFramePreviewChange?.(selectedFramePreview);
  }, [onSelectedFramePreviewChange, selectedFramePreview]);

  useEffect(() => {
    return () => {
      onSelectedFramePreviewChange?.(null);
    };
  }, [onSelectedFramePreviewChange]);

  useEffect(() => {
    if (!poseStorageKey) {
      return;
    }

    saveThermalCameraPoseOverrides(poseStorageKey, cameraPoseOverrides);
  }, [cameraPoseOverrides, poseStorageKey]);

  useEffect(() => {
    if (!cameras.length && selectedCameraId) {
      setSelectedCameraId(null);
      return;
    }

    if (
      selectedCameraId &&
      !cameras.some((camera) => camera.cameraId === selectedCameraId)
    ) {
      setSelectedCameraId(null);
    }
  }, [cameras, selectedCameraId, setSelectedCameraId]);

  const refreshCapture = useCallback(() => {
    if (!showOverlaySection) {
      return;
    }

    setCaptureResult(captureThreeViewerCanvas(captureTargetRef));
  }, [captureTargetRef, showOverlaySection]);

  useEffect(() => {
    if (!showOverlaySection) {
      return undefined;
    }

    const timeoutId = window.setTimeout(refreshCapture, 250);
    return () => window.clearTimeout(timeoutId);
  }, [refreshCapture, showOverlaySection]);

  const handleAlignmentChange = useCallback(
    (patch) => {
      if (selectedCameraId) {
        updateAlignment(selectedCameraId, patch);
      }
    },
    [selectedCameraId, updateAlignment],
  );

  const handleAlignmentReset = useCallback(() => {
    if (selectedCameraId) {
      resetAlignment(selectedCameraId);
    }
  }, [resetAlignment, selectedCameraId]);
  const handleVirtualPoseChange = useCallback(
    (nextPose) => {
      if (!selectedCameraId || !nextPose) {
        return;
      }

      setCameraPoseOverrides((currentOverrides) => ({
        ...currentOverrides,
        [selectedCameraId]: normalizeThermalCameraPoseConfig(nextPose),
      }));
    },
    [selectedCameraId],
  );
  const handleVirtualPoseReset = useCallback(() => {
    if (!selectedCameraId) {
      return;
    }

    setCameraPoseOverrides((currentOverrides) => {
      const nextOverrides = { ...currentOverrides };
      delete nextOverrides[selectedCameraId];
      return nextOverrides;
    });
  }, [selectedCameraId]);

  const restoreThermalTextureForTarget = useCallback(
    (targetObject, { silent = false, updateState = true } = {}) => {
      autoAppliedThermalLayerKeyRef.current = "";

      if (!targetObject) {
        if (!silent && updateState) {
          setMeshTextureMessage("복구할 3D Viewer mesh를 찾지 못했습니다.");
        }
        return 0;
      }

      const targetMeshUuids = collectThermalTargetMeshUuids(targetObject);
      const restoredEntries = [];

      thermalMaterialRecordsRef.current.forEach((record, meshUuid) => {
        if (targetMeshUuids.has(meshUuid)) {
          restoredEntries.push(record);
        }
      });

      if (!restoredEntries.length) {
        if (!silent && updateState) {
          setMeshTextureMessage("복구할 열화상 material 기록이 없습니다.");
        }
        return 0;
      }

      const texturesToDispose = new Set();
      restoredEntries.forEach((record) => {
        restoreOriginalMaterial(record.mesh, record.originalMaterial, {
          disposeCurrentMaterial: true,
        });
        if (record.texture) {
          texturesToDispose.add(record.texture);
        }
        record.layers?.forEach((layer) => {
          disposeThermalLayerResources(layer, texturesToDispose);
        });
        thermalMaterialRecordsRef.current.delete(record.meshUuid);
      });
      texturesToDispose.forEach((texture) => texture?.dispose?.());
      if (updateState) {
        setTextureActionVersion((version) => version + 1);
      }

      if (!silent && updateState) {
        setMeshTextureMessage(
          `${restoredEntries.length}개 mesh의 원본 material을 복구했습니다.`,
        );
      }

      return restoredEntries.length;
    },
    [thermalMaterialRecordsRef],
  );

  useEffect(() => {
    if (showOverlaySection || !selectedTargetObject) {
      return undefined;
    }

    return () => {
      restoreThermalTextureForTarget(selectedTargetObject, {
        silent: true,
        updateState: false,
      });
    };
  }, [restoreThermalTextureForTarget, selectedTargetObject, showOverlaySection]);

  useEffect(() => {
    if (showOverlaySection || !selectedTargetObject) {
      return;
    }

    if (loading || !projectionRenderer || !projectionScene || !cameras.length) {
      return;
    }

    const entries = resolvedThermalCameras.map((camera, index) => ({
      camera,
      frame: framesByCameraId[camera.cameraId],
      index,
    }));
    const readyEntries = selectedCameraId
      ? entries.filter(
          (entry) =>
            entry.camera.cameraId === selectedCameraId && Boolean(entry.frame),
        )
      : entries.filter((entry) => entry.frame);
    const expectedEntryCount = selectedCameraId ? 1 : cameras.length;

    if (readyEntries.length !== expectedEntryCount) {
      if (selectedCameraId) {
        restoreThermalTextureForTarget(selectedTargetObject, { silent: true });
      }
      return;
    }

    const layerModeKey = selectedCameraId ?? "ALL";
    const applyKey = [
      selectedTargetObject.uuid,
      layerModeKey,
      readyEntries
        .map(
          ({ camera, frame, index }) =>
            `${camera.cameraId}:${frame.capturedAt}:${getThermalCameraPoseKey(
              camera,
              index,
              resolvedThermalCameras.length,
            )}`,
        )
        .join("|"),
    ].join("::");

    if (autoAppliedThermalLayerKeyRef.current === applyKey) {
      return;
    }

    const targetMeshUuids = collectThermalTargetMeshUuids(selectedTargetObject);
    const staleLayersToDispose = new Set();
    const staleTexturesToDispose = new Set();

    thermalMaterialRecordsRef.current.forEach((record, meshUuid) => {
      if (!targetMeshUuids.has(meshUuid)) {
        return;
      }

      record.layers?.forEach((layer) => {
        staleLayersToDispose.add(layer);
      });

      if (record.texture) {
        staleTexturesToDispose.add(record.texture);
      }
    });

    const nextLayers = readyEntries.reduce(
      (layers, { camera, frame, index }) => {
        const thermalCanvas = createThermalCanvasFromFrame(frame, {
          paletteMaxTemperature: frame.maxTemperature,
          paletteMinTemperature: frame.minTemperature,
        });

        if (!thermalCanvas) {
          return layers;
        }

        const texture = createThermalTextureFromCanvas(thermalCanvas, {
          flipY: false,
        });

        if (!texture) {
          return layers;
        }

        const projection = createThermalCameraPoseProjectionOptions({
          cameraConfig: camera,
          cameraIndex: index,
          frame,
          includeDepthMap: Boolean(selectedCameraId),
          renderer: projectionRenderer,
          scene: projectionScene,
          targetObject: selectedTargetObject,
          totalCameraCount: resolvedThermalCameras.length,
        });

        if (!projection) {
          texture.dispose();
          return layers;
        }

        layers.push({
          cameraId: frame.cameraId,
          cameraName: frame.cameraName,
          opacity: 0.92,
          projection,
          targetName: targetLabel,
          texture,
        });

        return layers;
      },
      [],
    );

    if (nextLayers.length !== readyEntries.length) {
      const nextTexturesToDispose = new Set();
      nextLayers.forEach((layer) => {
        disposeThermalLayerResources(layer, nextTexturesToDispose);
      });
      nextTexturesToDispose.forEach((texture) => texture?.dispose?.());
      restoreThermalTextureForTarget(selectedTargetObject, { silent: true });
      return;
    }

    const result = applyThermalTextureLayersToObject3D(
      selectedTargetObject,
      nextLayers,
      {
        disposeCurrentMaterial: true,
        getOriginalMaterial: (mesh) =>
          thermalMaterialRecordsRef.current.get(mesh.uuid)?.originalMaterial,
      },
    );

    if (!result.ok) {
      const nextTexturesToDispose = new Set();
      nextLayers.forEach((layer) => {
        disposeThermalLayerResources(layer, nextTexturesToDispose);
      });
      nextTexturesToDispose.forEach((texture) => texture?.dispose?.());
      setMeshTextureMessage(
        result.error ?? "모든 열화상 카메라 layer 적용에 실패했습니다.",
      );
      return;
    }

    staleLayersToDispose.forEach((layer) => {
      disposeThermalLayerResources(layer, staleTexturesToDispose);
    });
    staleTexturesToDispose.forEach((texture) => texture?.dispose?.());
    result.appliedEntries.forEach((entry) => {
      thermalMaterialRecordsRef.current.set(entry.meshUuid, {
        ...entry,
        layers: nextLayers,
        targetName: targetLabel,
      });
    });
    autoAppliedThermalLayerKeyRef.current = applyKey;
    setTextureActionVersion((version) => version + 1);
    setMeshTextureMessage(
      selectedCameraId
        ? `${readyEntries[0].frame.cameraName} 열화상 layer만 mesh에 적용했습니다.`
        : `모든 열화상 카메라 ${nextLayers.length}개 layer를 카메라 좌표 기준으로 적용했습니다.`,
    );
  }, [
    cameras,
    framesByCameraId,
    loading,
    projectionRenderer,
    projectionScene,
    restoreThermalTextureForTarget,
    resolvedThermalCameras,
    selectedCameraId,
    selectedTargetObject,
    showOverlaySection,
    targetLabel,
    thermalMaterialRecordsRef,
  ]);

  const handleApplyThermalTexture = useCallback(() => {
    if (!selectedFrame) {
      setMeshTextureMessage("열화상 frame이 아직 준비되지 않았습니다.");
      return;
    }

    if (!selectedTargetObject) {
      setMeshTextureMessage("열화상 texture를 적용할 3D Viewer mesh가 없습니다.");
      return;
    }

    const thermalCanvas = createThermalCanvasFromFrame(selectedFrame, {
      paletteMaxTemperature: paletteRange?.paletteMaxTemperature,
      paletteMinTemperature: paletteRange?.paletteMinTemperature,
    });

    if (!thermalCanvas) {
      setMeshTextureMessage("thermal canvas를 생성하지 못했습니다.");
      return;
    }

    const selectedCameraConfig =
      selectedCameraIndex >= 0
        ? resolvedThermalCameras[selectedCameraIndex]
        : null;
    const projection = showOverlaySection
      ? null
      : createThermalCameraPoseProjectionOptions({
          cameraConfig: selectedCameraConfig,
          cameraIndex: Math.max(0, selectedCameraIndex),
          frame: selectedFrame,
          renderer: projectionRenderer,
          scene: projectionScene,
          targetObject: selectedTargetObject,
          totalCameraCount: resolvedThermalCameras.length,
        });

    if (!showOverlaySection && !projection) {
      setMeshTextureMessage(
        "현재 3D 월드 정합 정보를 찾을 수 없어 thermal texture를 적용하지 못했습니다.",
      );
      return;
    }

    const texture = createThermalTextureFromCanvas(thermalCanvas, {
      flipY: false,
      offsetX: projection ? undefined : selectedAlignment.uvOffsetX || 0,
      offsetY: projection ? undefined : selectedAlignment.uvOffsetY || 0,
      repeatX: projection ? undefined : selectedAlignment.uvScaleX || 1,
      repeatY: projection ? undefined : selectedAlignment.uvScaleY || 1,
    });

    if (!texture) {
      setMeshTextureMessage("thermal texture를 생성하지 못했습니다.");
      return;
    }

    if (projection) {
      const targetMeshUuids = collectThermalTargetMeshUuids(selectedTargetObject);
      const staleLayersToDispose = new Set();
      const texturesToDispose = new Set();

      thermalMaterialRecordsRef.current.forEach((record, meshUuid) => {
        if (!targetMeshUuids.has(meshUuid)) {
          return;
        }

        record.layers?.forEach((layer) => {
          staleLayersToDispose.add(layer);
        });

        if (record.texture) {
          texturesToDispose.add(record.texture);
        }
      });

      const nextLayer = {
        cameraId: selectedFrame.cameraId,
        cameraName: selectedFrame.cameraName,
        opacity: selectedAlignment.opacity,
        projection,
        targetName: targetLabel,
        texture,
      };
      const nextLayers = [nextLayer];
      const result = applyThermalTextureLayersToObject3D(
        selectedTargetObject,
        nextLayers,
        {
          disposeCurrentMaterial: true,
          getOriginalMaterial: (mesh) =>
            thermalMaterialRecordsRef.current.get(mesh.uuid)?.originalMaterial,
        },
      );

      if (!result.ok) {
        disposeThermalLayerResources(nextLayer, texturesToDispose);
        texturesToDispose.forEach((entryTexture) => entryTexture?.dispose?.());
        setMeshTextureMessage(
          result.error ?? "thermal texture layer 적용에 실패했습니다.",
        );
        return;
      }

      staleLayersToDispose.forEach((layer) => {
        disposeThermalLayerResources(layer, texturesToDispose);
      });
      texturesToDispose.forEach((entryTexture) => entryTexture?.dispose?.());
      result.appliedEntries.forEach((entry) => {
        thermalMaterialRecordsRef.current.set(entry.meshUuid, {
          ...entry,
          layers: nextLayers,
          targetName: targetLabel,
        });
      });
      setTextureActionVersion((version) => version + 1);
      setMeshTextureMessage(
        `${targetLabel}에 ${nextLayers.length}개 열화상 camera layer를 적용했습니다.`,
      );
      return;
    }

    restoreThermalTextureForTarget(selectedTargetObject, { silent: true });

    const result = applyThermalTextureToObject3D(selectedTargetObject, texture, {
      opacity: selectedAlignment.opacity,
      projection,
    });

    if (!result.ok) {
      texture.dispose();
      setMeshTextureMessage(result.error ?? "thermal texture 적용에 실패했습니다.");
      return;
    }

    result.appliedEntries.forEach((entry) => {
      thermalMaterialRecordsRef.current.set(entry.meshUuid, {
        ...entry,
        cameraId: selectedFrame.cameraId,
        targetName: targetLabel,
      });
    });
    setTextureActionVersion((version) => version + 1);
    setMeshTextureMessage(
      `${targetLabel}에 ${result.appliedEntries.length}개 thermal material을 적용했습니다.`,
    );
  }, [
    paletteRange?.paletteMaxTemperature,
    paletteRange?.paletteMinTemperature,
    projectionRenderer,
    projectionScene,
    restoreThermalTextureForTarget,
    selectedAlignment.opacity,
    selectedAlignment.uvOffsetX,
    selectedAlignment.uvOffsetY,
    selectedAlignment.uvScaleX,
    selectedAlignment.uvScaleY,
    selectedCameraId,
    selectedCameraIndex,
    selectedFrame,
    selectedTargetObject,
    showOverlaySection,
    targetLabel,
    thermalMaterialRecordsRef,
    resolvedThermalCameras,
  ]);

  const handleRestoreThermalTexture = useCallback(() => {
    restoreThermalTextureForTarget(selectedTargetObject);
  }, [restoreThermalTextureForTarget, selectedTargetObject]);

  const hasStoredMaterialRecords =
    textureActionVersion >= 0 && thermalMaterialRecordsRef.current.size > 0;

  return (
    <>
      <div
      className={
        showOverlaySection
          ? "grid min-h-0 gap-3 overflow-y-auto p-3 lg:grid-cols-[17rem_minmax(0,1fr)_17rem]"
          : "grid min-h-0 gap-3"
      }
      >
      {!showOverlaySection ? (
        <div className="grid gap-2">
          <ThermalViewModeSwitch
            mode={activeThermalViewMode}
            onChange={handleThermalViewModeChange}
          />
          <ThermalLaserToggle
            checked={showThermalLaserGuide}
            onChange={setShowThermalLaserGuide}
          />
        </div>
      ) : null}
      <ThermalCameraList
        cameras={cameras}
        framesByCameraId={framesByCameraId}
        loading={loading}
        selectedCameraId={selectedCameraId}
        onSelectCamera={setSelectedCameraId}
      />

      {showOverlaySection ? (
        <ThermalCalibrationOverlay
          alignment={selectedAlignment}
          captureResult={captureResult}
          description="기존 Asset 3D Viewer canvas 위에 열화상 Mock 이미지를 정합합니다."
          error={error}
          frame={selectedFrame}
          loading={loading}
          paletteRange={paletteRange}
          title="Asset 3D Viewer capture overlay"
          onAlignmentChange={handleAlignmentChange}
          onRefreshCapture={refreshCapture}
        />
      ) : null}

      <div className="grid min-h-0 gap-3">
        {showOverlaySection ? (
          <ThermalMappingControls
            alignment={selectedAlignment}
            disabled={!selectedCameraId || !selectedFrame || !selectedTargetObject}
            onApply={handleApplyThermalTexture}
            onChange={handleAlignmentChange}
            onReset={handleAlignmentReset}
          />
        ) : (
          <ThermalCameraPoseCalibrationControls
            basePose={selectedBasePose}
            disabled={!selectedCameraId || !selectedFrame || !selectedTargetObject}
            virtualPose={selectedVirtualPose}
            onApply={handleApplyThermalTexture}
            onChange={handleVirtualPoseChange}
            onReset={handleVirtualPoseReset}
          />
        )}

        <ThermalProjectionStatus
          appliedLayerCount={appliedLayerCount}
          depthMaskEnabled={depthMaskEnabled}
          selectedFrame={selectedFrame}
          targetLabel={targetLabel}
        />

        <ThermalMeshTextureActions
          disabled={!selectedCameraId || !selectedFrame || !selectedTargetObject}
          hasStoredMaterialRecords={hasStoredMaterialRecords}
          isPickingMesh={isPickingMesh}
          message={meshTextureMessage}
          selectedTargetLabel={targetLabel}
          onApplyTexture={handleApplyThermalTexture}
          onPickMesh={onPickMesh}
          onRestoreMaterial={handleRestoreThermalTexture}
        />

        {selectedFrame ? (
          <dl className="grid gap-2 rounded-md border border-white/10 bg-white/[0.045] p-2 text-[11px]">
            <ThermalMetric label="선택 카메라" value={selectedFrame.cameraName} />
            <ThermalMetric label="Width" value={selectedFrame.width} />
            <ThermalMetric label="Height" value={selectedFrame.height} />
            <ThermalMetric
              label="실제 minTemperature"
              value={`${formatTemperature(selectedFrame.minTemperature)} C`}
            />
            <ThermalMetric
              label="실제 maxTemperature"
              value={`${formatTemperature(selectedFrame.maxTemperature)} C`}
            />
          </dl>
        ) : null}
      </div>
      </div>
      {shouldRenderThermalTileOverlay && worldOverlayHost
        ? createPortal(
            <ThermalCameraTileOverlay
              entries={thermalTileEntries}
              loading={loading}
              selectedCameraId={selectedCameraId}
              onCameraSelect={setSelectedCameraId}
            />,
            worldOverlayHost,
          )
        : null}
    </>
  );
}

function ThermalViewModeSwitch({ mode, onChange }) {
  return (
    <div
      className="Three3DViewer__thermal-view-switch-1 grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-white/[0.045] p-1"
      role="toolbar"
      aria-label="Thermal view mode"
    >
      <ThermalViewModeButton
        active={mode === THERMAL_VIEW_MODES.WORLD}
        icon={Box}
        label="Viewer"
        title="Show the current thermal projection world view"
        onClick={() => onChange?.(THERMAL_VIEW_MODES.WORLD)}
      />
      <ThermalViewModeButton
        active={mode === THERMAL_VIEW_MODES.TILES}
        icon={Grid3X3}
        label="Tiles"
        title="Show 8 thermal frames around the live 3D view"
        onClick={() => onChange?.(THERMAL_VIEW_MODES.TILES)}
      />
    </div>
  );
}

function ThermalViewModeButton({ active, icon: Icon, label, onClick, title }) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-sm border px-2 text-[11px] font-semibold transition",
        active
          ? "border-cyan-200/40 bg-cyan-300 text-slate-950"
          : "border-transparent bg-transparent text-white/64 hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
      ].join(" ")}
      title={title}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ThermalLaserToggle({ checked, onChange }) {
  return (
    <label className="Three3DViewer__thermal-laser-toggle-1 flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.045] px-2 py-1.5">
      <span className="truncate text-[11px] font-semibold text-white/66">
        레이저 표시
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-cyan-300"
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </label>
  );
}

function ThermalCameraTileOverlay({
  entries,
  loading,
  onCameraSelect,
  selectedCameraId,
}) {
  const [expandedEntry, setExpandedEntry] = useState(null);
  const cells = [
    entries[0],
    entries[1],
    entries[2],
    entries[3],
    { type: "world" },
    entries[4],
    entries[5],
    entries[6],
    entries[7],
  ];

  return (
    <div className="Three3DViewer__thermal-tile-overlay-1 pointer-events-none absolute inset-0 z-[55] grid min-h-0 min-w-0 p-3">
      <div className="Three3DViewer__thermal-tile-grid-1 grid min-h-0 min-w-0 grid-cols-3 grid-rows-3 gap-2">
        {cells.map((cell, index) =>
          cell?.type === "world" ? (
            <ThermalWorldTile key="world" />
          ) : (
            <ThermalCameraImageTile
              key={cell?.camera?.cameraId ?? `thermal-empty-${index}`}
              active={cell?.camera?.cameraId === selectedCameraId}
              entry={cell}
              loading={loading}
              onExpand={setExpandedEntry}
              onSelect={onCameraSelect}
            />
          ),
        )}
      </div>
      {expandedEntry ? (
        <ThermalExpandedTilePreview
          entry={expandedEntry}
          onClose={() => setExpandedEntry(null)}
        />
      ) : null}
    </div>
  );
}

function ThermalWorldTile() {
  return (
    <div className="Three3DViewer__thermal-world-tile-1 pointer-events-none relative min-h-0 min-w-0 overflow-hidden rounded-md border-2 border-cyan-200/70 bg-cyan-950/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_0_26px_rgba(34,211,238,0.22)]">
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

function ThermalCameraImageTile({
  active,
  entry,
  loading,
  onExpand,
  onSelect,
}) {
  const imageDataUrl = useMemo(() => {
    return getThermalFrameImageDataUrl(entry?.frame);
  }, [entry?.frame]);
  const camera = entry?.camera;
  const frame = entry?.frame;
  const cameraLabel = camera?.cameraIndex ?? (
    Number.isFinite(entry?.index) ? entry.index + 1 : "-"
  );
  const handleSelect = () => {
    if (camera?.cameraId) {
      onSelect?.(camera.cameraId);
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
      className={[
        "Three3DViewer__thermal-image-tile-1 pointer-events-auto relative min-h-0 min-w-0 overflow-hidden rounded-md border bg-neutral-950/88 text-left shadow-2xl outline-none transition",
        camera
          ? "cursor-pointer hover:border-cyan-200/55 hover:shadow-[0_0_24px_rgba(103,232,249,0.2)] focus-visible:ring-2 focus-visible:ring-cyan-200/60"
          : "cursor-default opacity-70",
        active
          ? "border-red-400 ring-2 ring-red-400/80 shadow-[0_0_24px_rgba(248,113,113,0.32)]"
          : "border-white/15",
      ].join(" ")}
      title={camera?.cameraName ?? "Thermal camera"}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {imageDataUrl ? (
        <img
          alt={camera?.cameraName ?? "Thermal frame"}
          className="h-full w-full object-cover"
          draggable={false}
          src={imageDataUrl}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-neutral-950 text-[11px] font-semibold text-white/45">
          {loading ? "Loading" : "No frame"}
        </div>
      )}
      <div className="absolute left-2 top-2 rounded-sm border border-white/15 bg-black/72 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        {cameraLabel}
      </div>
      <button
        type="button"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-sm border border-white/20 bg-black/72 text-white/80 backdrop-blur-sm transition hover:border-cyan-200/50 hover:bg-cyan-300/20 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!imageDataUrl}
        title="Expand thermal frame"
        aria-label={`${camera?.cameraName ?? "Thermal camera"} expand`}
        onClick={(event) => {
          event.stopPropagation();
          onExpand?.(entry);
        }}
      >
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {frame ? (
        <div className="absolute bottom-2 right-2 rounded-sm border border-white/15 bg-black/72 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/80 backdrop-blur-sm">
          {frame.width}x{frame.height}
        </div>
      ) : null}
    </div>
  );
}

function ThermalExpandedTilePreview({ entry, onClose }) {
  const imageDataUrl = useMemo(() => {
    return getThermalFrameImageDataUrl(entry?.frame);
  }, [entry?.frame]);
  const camera = entry?.camera;
  const frame = entry?.frame;

  return (
    <div
      className="Three3DViewer__thermal-expanded-preview-1 pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-black/76 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={camera?.cameraName ?? "Thermal frame preview"}
      onClick={onClose}
    >
      <div
        className="relative grid max-h-full w-[min(92%,56rem)] max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-cyan-200/35 bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {camera?.cameraName ?? "Thermal camera"}
            </p>
            <p className="truncate font-mono text-[11px] text-white/55">
              {frame ? `${frame.width}x${frame.height}` : "No frame"}
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
        <div className="grid min-h-0 place-items-center bg-black p-2">
          {imageDataUrl ? (
            <img
              alt={camera?.cameraName ?? "Thermal frame"}
              className="max-h-full max-w-full object-contain"
              draggable={false}
              src={imageDataUrl}
            />
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

function getThermalFrameImageDataUrl(frame) {
  if (!frame) {
    return "";
  }

  const canvas = createThermalCanvasFromFrame(frame, {
    paletteMaxTemperature: frame.maxTemperature,
    paletteMinTemperature: frame.minTemperature,
  });

  return canvas?.toDataURL("image/png") ?? "";
}

function getThermalCameraPoseKey(cameraConfig, cameraIndex, totalCameraCount) {
  const pose = cameraConfig?.worldPose ?? getFallbackThermalCameraPoseKeySource(
    cameraIndex,
    totalCameraCount,
  );

  return [
    pose.coordinateSpace ?? "asset-relative-sample",
    getThermalPoseVectorKey(pose.position),
    getThermalPoseVectorKey(pose.lookAt),
    toFiniteNumber(
      pose.previewPlaneScale,
      DEFAULT_THERMAL_SAMPLE_POSE.previewPlaneScale,
    ),
    clampThermalCaptureFov(
      toFiniteNumber(pose.projectorFov, DEFAULT_THERMAL_SAMPLE_POSE.projectorFov),
    ),
  ].join(":");
}

function getFallbackThermalCameraPoseKeySource(cameraIndex, totalCameraCount) {
  const angle = ((Math.PI * 2) / Math.max(1, totalCameraCount)) * cameraIndex;

  return {
    coordinateSpace: DEFAULT_THERMAL_SAMPLE_POSE.coordinateSpace,
    lookAt: DEFAULT_THERMAL_SAMPLE_POSE.lookAt,
    position: {
      x: Math.sin(angle) * DEFAULT_THERMAL_SAMPLE_POSE.position.z,
      y: DEFAULT_THERMAL_SAMPLE_POSE.position.y,
      z: Math.cos(angle) * DEFAULT_THERMAL_SAMPLE_POSE.position.z,
    },
    previewPlaneScale: DEFAULT_THERMAL_SAMPLE_POSE.previewPlaneScale,
    projectorFov: DEFAULT_THERMAL_SAMPLE_POSE.projectorFov,
  };
}

function getThermalPoseVectorKey(vector) {
  return [
    toFiniteNumber(vector?.x, 0),
    toFiniteNumber(vector?.y, 0),
    toFiniteNumber(vector?.z, 0),
  ].join(",");
}

function toPlainThermalVector(vector) {
  return {
    x: toFiniteNumber(vector?.x, 0),
    y: toFiniteNumber(vector?.y, 0),
    z: toFiniteNumber(vector?.z, 0),
  };
}

function createThermalCameraPoseProjectionOptions({
  cameraConfig,
  cameraIndex,
  frame,
  includeDepthMap = true,
  renderer,
  scene,
  targetObject,
  totalCameraCount,
}) {
  if (!cameraConfig || !frame?.width || !frame?.height || !renderer || !scene || !targetObject) {
    return null;
  }

  const targetMetrics = getThermalTargetMetrics(targetObject);
  const pose = resolveThermalCameraPose({
    camera: cameraConfig,
    index: cameraIndex,
    targetMetrics,
    totalCount: totalCameraCount,
  });
  const aspectRatio = frame.width / frame.height;
  const distanceToTarget = Math.max(
    0.1,
    pose.position.distanceTo(pose.lookAt),
  );
  const projectorCamera = new THREE.PerspectiveCamera(
    pose.projectorFov,
    aspectRatio,
    0.01,
    Math.max(10, distanceToTarget + targetMetrics.extent * 4),
  );

  projectorCamera.position.copy(pose.position);
  projectorCamera.lookAt(pose.lookAt);
  projectorCamera.updateMatrixWorld(true);
  projectorCamera.updateProjectionMatrix();

  return {
    centerX: 0.5,
    centerY: 0.5,
    depthBias: 0.0035,
    depthMap: includeDepthMap
      ? captureThermalProjectionDepthMap({
          camera: projectorCamera,
          height: 768,
          renderer,
          scene,
          width: Math.max(1, Math.round(768 * aspectRatio)),
        })
      : null,
    height: 1,
    normalCutoff: 0.5,
    normalFeather: 0.18,
    projectorDirection: projectorCamera
      .getWorldDirection(new THREE.Vector3())
      .clone(),
    projectorMatrix: projectorCamera.projectionMatrix
      .clone()
      .multiply(projectorCamera.matrixWorldInverse),
    rotationRadians: 0,
    width: 1,
  };
}

function captureThermalProjectionDepthMap({
  camera,
  height,
  renderer,
  scene,
  width,
}) {
  if (!camera || !renderer || !scene) {
    return null;
  }

  const targetWidth = Math.min(2048, Math.max(1, width));
  const targetHeight = Math.min(2048, Math.max(1, height));
  const depthTexture = new THREE.DepthTexture(targetWidth, targetHeight);
  depthTexture.type = THREE.UnsignedIntType;
  depthTexture.minFilter = THREE.NearestFilter;
  depthTexture.magFilter = THREE.NearestFilter;
  depthTexture.generateMipmaps = false;

  const renderTarget = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
    depthBuffer: true,
  });
  renderTarget.depthTexture = depthTexture;
  renderTarget.texture.minFilter = THREE.NearestFilter;
  renderTarget.texture.magFilter = THREE.NearestFilter;
  renderTarget.texture.generateMipmaps = false;

  const previousRenderTarget = renderer.getRenderTarget();
  const previousClearColor = renderer.getClearColor(new THREE.Color());
  const previousClearAlpha = renderer.getClearAlpha();
  const previousXrEnabled = renderer.xr.enabled;
  const hiddenPreviewGroups = setThermalPreviewGroupsVisible(scene, false);

  try {
    renderer.xr.enabled = false;
    renderer.setRenderTarget(renderTarget);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
  } catch {
    renderTarget.dispose();
    return null;
  } finally {
    renderer.setRenderTarget(previousRenderTarget);
    renderer.setClearColor(previousClearColor, previousClearAlpha);
    renderer.xr.enabled = previousXrEnabled;
    restoreThermalPreviewGroupsVisible(hiddenPreviewGroups);
  }

  return {
    renderTarget,
    texture: depthTexture,
  };
}

function setThermalPreviewGroupsVisible(scene, visible) {
  const entries = [];

  scene.traverse?.((object) => {
    if (!object?.userData?.isThermalCameraPreviewPlanes) {
      return;
    }

    entries.push({
      object,
      visible: object.visible,
    });
    object.visible = visible;
  });

  return entries;
}

function restoreThermalPreviewGroupsVisible(entries) {
  entries.forEach((entry) => {
    entry.object.visible = entry.visible;
  });
}

function withThermalCameraPoseOverride(camera, index, overrides, totalCount) {
  const override = camera?.cameraId ? overrides?.[camera.cameraId] : null;

  if (!override) {
    return camera;
  }

  const basePose = getThermalCameraBasePose(camera, index, totalCount);
  const virtualPose = normalizeThermalCameraPoseConfig({
    ...basePose,
    ...override,
    lookAt: {
      ...basePose.lookAt,
      ...override.lookAt,
    },
    position: {
      ...basePose.position,
      ...override.position,
    },
  });

  return {
    ...camera,
    worldPose: {
      ...basePose,
      ...virtualPose,
      poseLabel: basePose.poseLabel,
      sourceType: basePose.sourceType,
    },
  };
}

function getThermalCameraBasePose(camera, index, totalCount) {
  return normalizeThermalCameraPoseConfig(
    camera?.worldPose ?? getFallbackThermalCameraPoseKeySource(index, totalCount),
  );
}

function normalizeThermalCameraPoseConfig(pose = {}) {
  return {
    coordinateSpace:
      pose.coordinateSpace ?? DEFAULT_THERMAL_SAMPLE_POSE.coordinateSpace,
    lookAt: normalizeThermalPoseVector(
      pose.lookAt,
      DEFAULT_THERMAL_SAMPLE_POSE.lookAt,
    ),
    poseLabel: pose.poseLabel,
    position: normalizeThermalPoseVector(
      pose.position,
      DEFAULT_THERMAL_SAMPLE_POSE.position,
    ),
    previewPlaneScale: toFiniteNumber(
      pose.previewPlaneScale,
      DEFAULT_THERMAL_SAMPLE_POSE.previewPlaneScale,
    ),
    projectorFov: clampThermalCaptureFov(
      toFiniteNumber(pose.projectorFov, DEFAULT_THERMAL_SAMPLE_POSE.projectorFov),
    ),
    sourceType: pose.sourceType,
  };
}

function normalizeThermalPoseVector(vector = {}, fallback = {}) {
  return {
    x: toFiniteNumber(vector.x, toFiniteNumber(fallback.x, 0)),
    y: toFiniteNumber(vector.y, toFiniteNumber(fallback.y, 0)),
    z: toFiniteNumber(vector.z, toFiniteNumber(fallback.z, 0)),
  };
}

function clampThermalCaptureFov(value) {
  return Math.min(
    THERMAL_CAPTURE_VERTICAL_FOV_MAX_DEGREES,
    Math.max(THERMAL_CAPTURE_VERTICAL_FOV_MIN_DEGREES, value),
  );
}

function getThermalCameraPoseDelta(basePose, virtualPose) {
  return {
    distance:
      getThermalPoseDistance(virtualPose) - getThermalPoseDistance(basePose),
    lookAt: getThermalVectorDelta(basePose.lookAt, virtualPose.lookAt),
    position: getThermalVectorDelta(basePose.position, virtualPose.position),
    previewPlaneScale:
      virtualPose.previewPlaneScale - basePose.previewPlaneScale,
    projectorFov: virtualPose.projectorFov - basePose.projectorFov,
  };
}

function getThermalVectorDelta(baseVector, virtualVector) {
  return {
    x: virtualVector.x - baseVector.x,
    y: virtualVector.y - baseVector.y,
    z: virtualVector.z - baseVector.z,
  };
}

function getThermalPoseDistance(pose) {
  const dx = pose.position.x - pose.lookAt.x;
  const dy = pose.position.y - pose.lookAt.y;
  const dz = pose.position.z - pose.lookAt.z;
  return Math.hypot(dx, dy, dz);
}

function loadThermalCameraPoseOverrides(storageKey) {
  if (!storageKey || typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) : {};

    if (!parsedValue || typeof parsedValue !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).map(([cameraId, pose]) => [
        cameraId,
        normalizeThermalCameraPoseConfig(pose),
      ]),
    );
  } catch {
    return {};
  }
}

function saveThermalCameraPoseOverrides(storageKey, overrides) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  const hasOverrides = Object.keys(overrides ?? {}).length > 0;

  try {
    if (!hasOverrides) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(overrides));
  } catch {
    // Local storage is an enhancement only.
  }
}

function formatPoseVectorDelta(delta) {
  return `x ${formatSignedNumber(delta.x, 3)} / y ${formatSignedNumber(
    delta.y,
    3,
  )} / z ${formatSignedNumber(delta.z, 3)}`;
}

function formatSignedNumber(value, decimals) {
  const numericValue = toFiniteNumber(value, 0);
  const sign = numericValue > 0 ? "+" : "";
  return `${sign}${numericValue.toFixed(decimals)}`;
}

function formatInputNumber(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : "0";
}

function ThermalCameraPoseCalibrationControls({
  basePose,
  disabled,
  onApply,
  onChange,
  onReset,
  virtualPose,
}) {
  const safeBasePose = basePose
    ? normalizeThermalCameraPoseConfig(basePose)
    : null;
  const safeVirtualPose = virtualPose
    ? normalizeThermalCameraPoseConfig(virtualPose)
    : safeBasePose;
  const poseDelta =
    safeBasePose && safeVirtualPose
      ? getThermalCameraPoseDelta(safeBasePose, safeVirtualPose)
      : null;

  const updateVector = (key, axis, value) => {
    if (!safeVirtualPose) {
      return;
    }

    onChange?.({
      ...safeVirtualPose,
      [key]: {
        ...safeVirtualPose[key],
        [axis]: value,
      },
    });
  };
  const updateScalar = (key, value) => {
    if (!safeVirtualPose) {
      return;
    }

    onChange?.({
      ...safeVirtualPose,
      [key]: value,
    });
  };

  if (!safeVirtualPose || !safeBasePose) {
    return (
      <section className="grid gap-2 rounded-md border border-white/10 bg-white/[0.045] p-2 text-[11px] text-white/60">
        <h3 className="truncate text-xs font-semibold text-white">
          Virtual camera calibration
        </h3>
        <p>열화상 카메라를 선택하면 가상 좌표와 화각을 조정할 수 있습니다.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-2 rounded-md border border-white/10 bg-white/[0.045] p-2">
      <div className="min-w-0">
        <h3 className="truncate text-xs font-semibold text-white">
          Virtual camera calibration
        </h3>
        <p className="mt-0.5 text-[11px] text-white/55">
          현실 설치값과 비교하면서 3D 월드의 가상 열화상 카메라 pose를 조정합니다.
        </p>
      </div>

      <div className="grid gap-2">
        <PoseVectorFields
          disabled={disabled}
          label="Position"
          value={safeVirtualPose.position}
          onChange={(axis, value) => updateVector("position", axis, value)}
        />
        <PoseVectorFields
          disabled={disabled}
          label="Look at"
          value={safeVirtualPose.lookAt}
          onChange={(axis, value) => updateVector("lookAt", axis, value)}
        />
        <PoseScalarField
          disabled={disabled}
          label="FOV"
          max={THERMAL_CAPTURE_VERTICAL_FOV_MAX_DEGREES}
          min={THERMAL_CAPTURE_VERTICAL_FOV_MIN_DEGREES}
          step={1}
          suffix="deg"
          value={safeVirtualPose.projectorFov}
          onChange={(value) => updateScalar("projectorFov", value)}
        />
      </div>

      <dl className="grid gap-1.5 rounded-md border border-cyan-200/15 bg-cyan-200/[0.055] p-2 text-[11px]">
        <PoseDeltaRow label="Δ Position" value={formatPoseVectorDelta(poseDelta.position)} />
        <PoseDeltaRow label="Δ Look at" value={formatPoseVectorDelta(poseDelta.lookAt)} />
        <PoseDeltaRow label="Δ Distance" value={formatSignedNumber(poseDelta.distance, 3)} />
        <PoseDeltaRow label="Δ FOV" value={`${formatSignedNumber(poseDelta.projectorFov, 1)} deg`} />
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-2 text-xs font-semibold text-white/72 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          기준값 복구
        </button>
        <button
          type="button"
          className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-cyan-300/35 bg-cyan-300 px-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onClick={onApply}
        >
          <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
          가상값 적용
        </button>
      </div>
    </section>
  );
}

function PoseVectorFields({ disabled, label, onChange, value }) {
  return (
    <fieldset className="grid gap-1.5 rounded-md border border-white/10 bg-black/20 p-2">
      <legend className="px-1 text-[11px] font-semibold text-white/70">
        {label}
      </legend>
      <div className="grid grid-cols-3 gap-1.5">
        {["x", "y", "z"].map((axis) => (
          <label key={axis} className="grid min-w-0 gap-1">
            <span className="text-[10px] font-semibold uppercase text-white/45">
              {axis}
            </span>
            <input
              type="number"
              className="h-8 min-w-0 rounded-md border border-white/10 bg-black/35 px-2 text-right font-mono text-xs text-white outline-none transition focus:border-cyan-300/45"
              disabled={disabled}
              step={0.01}
              value={formatInputNumber(value?.[axis])}
              onChange={(event) => onChange(axis, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PoseScalarField({
  disabled,
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}) {
  const numericValue = toFiniteNumber(value, min);

  return (
    <label className="grid gap-1 rounded-md border border-white/10 bg-black/20 p-2">
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white/66">
        <span>{label}</span>
        <span className="font-mono text-white/80">
          {numericValue.toFixed(step < 1 ? 2 : 0)} {suffix}
        </span>
      </span>
      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-2">
        <input
          type="range"
          className="min-w-0 accent-cyan-300"
          disabled={disabled}
          max={max}
          min={min}
          step={step}
          value={numericValue}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          className="h-8 min-w-0 rounded-md border border-white/10 bg-black/35 px-2 text-right font-mono text-xs text-white outline-none transition focus:border-cyan-300/45"
          disabled={disabled}
          max={max}
          min={min}
          step={step}
          value={formatInputNumber(numericValue)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </label>
  );
}

function PoseDeltaRow({ label, value }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
      <dt className="truncate text-white/55">{label}</dt>
      <dd className="min-w-0 truncate font-mono font-semibold text-cyan-50">
        {value}
      </dd>
    </div>
  );
}

function ThermalProjectionStatus({
  appliedLayerCount,
  depthMaskEnabled,
  selectedFrame,
  targetLabel,
}) {
  return (
    <section className="grid gap-2 rounded-md border border-cyan-200/15 bg-cyan-200/[0.055] p-2 text-[11px] text-white/72">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <span className="truncate text-white/55">정합 대상</span>
        <span className="min-w-0 truncate font-semibold text-white/86">
          {targetLabel}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <span className="truncate text-white/55">선택 열화상</span>
        <span className="min-w-0 truncate font-semibold text-white/86">
          {selectedFrame?.cameraName ?? "미선택"}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <span className="truncate text-white/55">Depth mask</span>
        <span className="min-w-0 truncate font-semibold text-lime-100">
          {depthMaskEnabled ? "보이는 표면만 적용" : "대기"}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <span className="truncate text-white/55">적용 layer</span>
        <span className="font-mono font-semibold text-white/86">
          {appliedLayerCount}
        </span>
      </div>
    </section>
  );
}

function ThermalMeshTextureActions({
  disabled,
  hasStoredMaterialRecords,
  isPickingMesh,
  message,
  onApplyTexture,
  onPickMesh,
  onRestoreMaterial,
  selectedTargetLabel,
}) {
  return (
    <section className="grid gap-2 rounded-md border border-white/10 bg-white/[0.045] p-2">
      <div className="min-w-0">
        <h3 className="truncate text-xs font-semibold text-white">
          Mesh thermal texture
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-white/55">
          대상: {selectedTargetLabel}
        </p>
      </div>

      <button
        type="button"
        className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-2 text-xs font-semibold text-white/72 transition hover:bg-white/[0.12] hover:text-white"
        onClick={onPickMesh}
      >
        <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
        {isPickingMesh ? "3D Viewer에서 mesh 클릭" : "Mesh 선택"}
      </button>

      <button
        type="button"
        className="Three3DViewer__thermal-apply-texture-1 inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-orange-300/35 bg-orange-300 px-2 text-xs font-semibold text-slate-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        onClick={onApplyTexture}
      >
        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
        선택 Mesh에 열화상 적용
      </button>

      <button
        type="button"
        className="Three3DViewer__thermal-restore-material-1 inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-2 text-xs font-semibold text-white/72 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!hasStoredMaterialRecords}
        onClick={onRestoreMaterial}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        원본 Material 복구
      </button>

      {message ? (
        <p className="rounded-md border border-cyan-200/20 bg-cyan-200/10 px-2 py-1.5 text-[11px] font-semibold text-cyan-50">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function getThermalAppliedLayerCount(records, targetObject) {
  if (!records?.size || !targetObject) {
    return 0;
  }

  const targetMeshUuids = collectThermalTargetMeshUuids(targetObject);
  const cameraIds = new Set();

  records.forEach((record, meshUuid) => {
    if (!targetMeshUuids.has(meshUuid)) {
      return;
    }

    record.layers?.forEach((layer) => {
      if (layer?.cameraId) {
        cameraIds.add(layer.cameraId);
      }
    });

    if (record.cameraId) {
      cameraIds.add(record.cameraId);
    }
  });

  return cameraIds.size;
}

function disposeThermalLayerResources(layer, textureSet) {
  if (!layer) {
    return;
  }

  if (layer.texture) {
    textureSet?.add(layer.texture);
  }

  layer.projection?.depthMap?.texture?.dispose?.();
  layer.projection?.depthMap?.renderTarget?.dispose?.();
}

function ThermalMetric({ label, value }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
      <dt className="truncate text-white/55">{label}</dt>
      <dd className="min-w-0 truncate font-mono font-semibold text-white/86">
        {value ?? "-"}
      </dd>
    </div>
  );
}

function formatTemperature(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

function toFiniteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}
