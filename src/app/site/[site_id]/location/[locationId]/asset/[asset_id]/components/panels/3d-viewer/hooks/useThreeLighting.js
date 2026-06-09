import { useEffect } from "react";
import { LightingManager } from "../modules/LightingManager";
import { invalidateThreeScene } from "../utils/sceneRenderInvalidation";
export function useThreeLighting(sceneRef, lightingConfig) {
    useEffect(() => {
        if (!sceneRef.current)
            return;
        LightingManager.applyConfig(sceneRef.current, lightingConfig);
        invalidateThreeScene(sceneRef.current, "lighting");
    }, [sceneRef, lightingConfig]);
}
