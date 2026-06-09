import { useEffect } from "react";
import { SceneBuilder } from "../modules/SceneBuilder";
import { invalidateThreeScene } from "../utils/sceneRenderInvalidation";
export function useThreeBackground(sceneRef, backgroundConfig) {
    useEffect(() => {
        if (!sceneRef.current)
            return;
        SceneBuilder.applyBackground(sceneRef.current, backgroundConfig);
        invalidateThreeScene(sceneRef.current, "background");
    }, [sceneRef, backgroundConfig]);
}
