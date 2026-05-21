import { useEffect } from "react";
import { CameraController } from "../modules/CameraController";
export function useThreeCamera(cameraRef, controlsRef, cameraConfig, controlConfig) {
    useEffect(() => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera) {
            return;
        }
        CameraController.applyConfig(camera, controls, cameraConfig);
        if (!controls) {
            return;
        }
        controls.enablePan = controlConfig?.enablePan ?? true;
        controls.enableRotate = controlConfig?.enableRotate ?? true;
        controls.enableZoom = controlConfig?.enableZoom ?? true;
    }, [cameraConfig, cameraRef, controlConfig, controlsRef]);
}
