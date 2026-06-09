import { useEffect, useRef, useState } from "react";
import { ModelController } from "../modules/ModelController";
import { ModelLoader } from "../modules/ModelLoader";
import { invalidateThreeScene } from "../utils/sceneRenderInvalidation";
import { disposeObject3D } from "../utils/threeDisposal";
export function useThreeModel(sceneRef, modelFile, modelConfig) {
    const loaderRef = useRef(new ModelLoader());
    const modelRef = useRef(null);
    const modelConfigRef = useRef(modelConfig);
    const [loadState, setLoadState] = useState({ isLoading: true });
    useEffect(() => {
        modelConfigRef.current = modelConfig;
    }, [modelConfig]);
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) {
            return;
        }
        let isActive = true;
        setLoadState({ isLoading: true });
        loaderRef.current
            .loadModel(modelFile)
            .then((model) => {
            if (!isActive) {
                disposeObject3D(model);
                return;
            }
            if (modelRef.current) {
                scene.remove(modelRef.current);
                disposeObject3D(modelRef.current);
            }
            ModelController.applyConfig(model, modelConfigRef.current);
            modelRef.current = model;
            scene.add(model);
            invalidateThreeScene(scene, "model-loaded");
            setLoadState({ isLoading: false });
        })
            .catch((error) => {
            if (!isActive) {
                return;
            }
            setLoadState({
                error: error instanceof Error ? error.message : "모델 로드 실패",
                isLoading: false,
            });
        });
        return () => {
            isActive = false;
        };
    }, [modelFile, sceneRef]);
    useEffect(() => {
        if (modelRef.current) {
            ModelController.applyConfig(modelRef.current, modelConfig);
            invalidateThreeScene(sceneRef.current, "model-config");
        }
    }, [modelConfig, sceneRef]);
    useEffect(() => {
        return () => {
            if (modelRef.current) {
                disposeObject3D(modelRef.current);
                modelRef.current = null;
            }
        };
    }, []);
    return { loadState, modelRef };
}
