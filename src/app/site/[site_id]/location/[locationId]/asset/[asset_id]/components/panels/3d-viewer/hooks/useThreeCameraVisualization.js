import { useCallback, useEffect, useRef } from "react";
import { CAMERA_PRESETS } from "../constants/cameraPresets";
import {
  pickCameraMarkerFromClientPoint,
  removeAllCameraVisualizations,
  updateCameraMarkerInteractionState,
  updateCameraVisualizationObjects,
} from "../utils/cameraUtils";
import { invalidateThreeScene } from "../utils/sceneRenderInvalidation";

const CAMERA_PRESET_IDS = CAMERA_PRESETS.map((camera) => camera.id);
const EMPTY_CUSTOM_POSITIONS = {};
const EMPTY_CUSTOM_FOVS = {};
const EMPTY_CUSTOM_TARGETS = {};

export function useThreeCameraVisualization(sceneRef, config) {
  const hoveredCameraIdRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return undefined;
    }

    if (config?.enabled === false) {
      removeAllCameraVisualizations(scene);
      invalidateThreeScene(scene, "camera-visualization-disabled");
      return undefined;
    }

    const selectedCameraId = config?.selectedCameraId ?? null;
    const requireSelection = config?.requireSelection === true;
    const showAll = requireSelection
      ? false
      : config?.showAll !== false || !selectedCameraId;
    const visibleCameraIds = showAll
      ? CAMERA_PRESET_IDS
      : selectedCameraId
      ? [selectedCameraId]
      : [];

    updateCameraVisualizationObjects(
      scene,
      CAMERA_PRESETS,
      selectedCameraId,
      visibleCameraIds,
      config?.customPositions ?? EMPTY_CUSTOM_POSITIONS,
      config?.customFovs ?? EMPTY_CUSTOM_FOVS,
      config?.customTargets ?? EMPTY_CUSTOM_TARGETS,
      config?.editComparison,
    );
    updateCameraMarkerInteractionState(
      scene,
      selectedCameraId,
      hoveredCameraIdRef.current,
    );
    invalidateThreeScene(scene, "camera-visualization");

    return undefined;
  }, [
    sceneRef,
    config?.selectedCameraId,
    config?.showAll,
    config?.requireSelection,
    config?.enabled,
    config?.customPositions,
    config?.customFovs,
    config?.customTargets,
    config?.editComparison,
  ]);

  const setHoveredCameraId = useCallback(
    (cameraId) => {
      if (hoveredCameraIdRef.current === cameraId) {
        return;
      }

      hoveredCameraIdRef.current = cameraId;

      const scene = sceneRef.current;
      if (!scene) {
        return;
      }

      updateCameraMarkerInteractionState(
        scene,
        config?.selectedCameraId ?? null,
        cameraId,
      );
      invalidateThreeScene(scene, "camera-hover");
    },
    [config?.selectedCameraId, sceneRef],
  );

  const getCameraAtClientPoint = useCallback(
    ({ camera, clientPoint, previousCameraId, renderer }) =>
      pickCameraMarkerFromClientPoint({
        camera,
        clientPoint,
        previousCameraId,
        renderer,
        scene: sceneRef.current,
      }),
    [sceneRef],
  );

  return {
    getCameraAtClientPoint,
    setHoveredCameraId,
  };
}
