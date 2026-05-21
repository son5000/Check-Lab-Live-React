import { useEffect } from "react";
import { LightingManager } from "../modules/LightingManager";
export function useThreeLighting(sceneRef, lightingConfig) {
    useEffect(() => {
        if (!sceneRef.current)
            return;
        LightingManager.applyConfig(sceneRef.current, lightingConfig);
    }, [sceneRef, lightingConfig]);
}
