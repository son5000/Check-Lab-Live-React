import { useEffect } from "react";
import { SceneBuilder } from "../modules/SceneBuilder";
export function useThreeBackground(sceneRef, backgroundConfig) {
    useEffect(() => {
        if (!sceneRef.current)
            return;
        SceneBuilder.applyBackground(sceneRef.current, backgroundConfig);
    }, [sceneRef, backgroundConfig]);
}
