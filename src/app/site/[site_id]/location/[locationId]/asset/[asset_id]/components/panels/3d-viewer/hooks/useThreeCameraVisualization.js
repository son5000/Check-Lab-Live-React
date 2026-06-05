import { useCallback, useEffect, useRef } from "react";
import { CAMERA_PRESETS } from "../constants/cameraPresets";
import {
  pickCameraMarkerFromClientPoint,
  removeAllCameraVisualizations,
  updateCameraMarkerInteractionState,
  updateCameraVisualizationObjects,
} from "../utils/cameraUtils";

const CAMERA_PRESET_IDS = CAMERA_PRESETS.map((camera) => camera.id);
const EMPTY_CUSTOM_POSITIONS = {};
const EMPTY_CUSTOM_FOVS = {};

export function useThreeCameraVisualization(sceneRef, config) {
  const hoveredCameraIdRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return undefined;
    }

    if (config?.enabled === false) {
      removeAllCameraVisualizations(scene);
      return undefined;
    }

    const selectedCameraId = config?.selectedCameraId ?? null;
    const requireSelection = config?.requireSelection === true;
    const showAll = requireSelection
      ? false
      : config?.showAll !== false || !selectedCameraId;
    const showLaserBeams = config?.showLaserBeams !== false;
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
      showLaserBeams,
    );
    updateCameraMarkerInteractionState(
      scene,
      selectedCameraId,
      hoveredCameraIdRef.current,
    );

    return undefined;
  }, [
    sceneRef,
    config?.selectedCameraId,
    config?.showAll,
    config?.requireSelection,
    config?.enabled,
    config?.customPositions,
    config?.customFovs,
    config?.showLaserBeams,
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
