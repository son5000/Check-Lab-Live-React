import { useCallback, useEffect, useRef } from "react";
import {
  pickCameraMarkerFromClientPoint,
  removeAllCameraVisualizations,
  raycastCameraMarkers,
  updateCameraMarkerInteractionState,
  updateCameraVisualizationObjects,
} from "../utils/cameraUtils";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

export function useThreeCameraVisualization(sceneRef, config) {
  const cameraVisualizationRef = useRef(null);
  const hoveredCameraIdRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    // 카메라 시각화 활성화 여부 확인
    const isEnabled = config?.enabled !== false;

    if (!isEnabled) {
      removeAllCameraVisualizations(scene);
      return;
    }

    // 선택된 카메라 ID 가져오기
    const selectedCameraId = config?.selectedCameraId;

    // 표시할 카메라 ID 목록 결정
    const showAll = config?.showAll !== false || !selectedCameraId;
    const showLaserBeams = config?.showLaserBeams !== false;
    const visibleCameraIds = showAll
      ? CAMERA_PRESETS.map((cam) => cam.id)
      : selectedCameraId
      ? [selectedCameraId]
      : [];

    // 카메라 시각화 객체 업데이트
    updateCameraVisualizationObjects(
      scene,
      CAMERA_PRESETS,
      selectedCameraId,
      visibleCameraIds,
      config?.customPositions,
      showLaserBeams
    );

    // 참조 저장
    cameraVisualizationRef.current = {
      visibleCameraIds,
      selectedCameraId,
    };

    updateCameraMarkerInteractionState(
      scene,
      selectedCameraId,
      hoveredCameraIdRef.current
    );
  }, [sceneRef, config?.selectedCameraId, config?.showAll, config?.enabled, config?.customPositions, config?.showLaserBeams]);

  const setHoveredCameraId = useCallback((cameraId) => {
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
      config?.selectedCameraId,
      cameraId
    );
  }, [config?.selectedCameraId, sceneRef]);

  // 레이캐스트 메서드 반환: 카메라 구체만 판정한다.
  const getCameraAtPoint = useCallback((raycaster) => {
    const scene = sceneRef.current;
    if (!scene) return null;

    return raycastCameraMarkers(raycaster, scene);
  }, [sceneRef]);

  const getCameraAtClientPoint = useCallback(({
    camera,
    clientPoint,
    previousCameraId,
    renderer,
  }) => {
    return pickCameraMarkerFromClientPoint({
      camera,
      clientPoint,
      previousCameraId,
      renderer,
      scene: sceneRef.current,
    });
  }, [sceneRef]);

  return {
    cameraVisualizationRef,
    getCameraAtClientPoint,
    getCameraAtPoint,
    setHoveredCameraId,
  };
}
