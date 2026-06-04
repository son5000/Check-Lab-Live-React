import { useEffect, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CameraController } from "../modules/CameraController";
import { SceneBuilder } from "../modules/SceneBuilder";
import { disposeObject3D } from "../utils/threeDisposal";

export function useThreeScene(containerRef, config) {
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const initialConfigRef = useRef(config);
    const animationConfigRef = useRef({
        autoRotate: config.autoRotate ?? true,
        autoRotateSpeed: config.controls?.autoRotateSpeed ?? 0.7,
    });
    useEffect(() => {
        animationConfigRef.current = {
            autoRotate: config.autoRotate ?? true,
            autoRotateSpeed: config.controls?.autoRotateSpeed ?? 0.7,
        };
    }, [config.autoRotate, config.controls?.autoRotateSpeed]);
    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const initialConfig = initialConfigRef.current;
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        const scene = SceneBuilder.createScene();
        const camera = SceneBuilder.createCamera(width, height, initialConfig.camera.fov);
        const renderer = SceneBuilder.createRenderer(container);
        const controls = new OrbitControls(camera, renderer.domElement);
        let animationFrameId = 0;
        let resizeFrameId = 0;
        let lastRendererSizeKey = "";
        renderer.domElement.className = "h-full w-full";
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.screenSpacePanning = false;
        controlsRef.current = controls;
        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        SceneBuilder.applyBackground(scene, initialConfig.background);
        CameraController.applyConfig(camera, controls, initialConfig.camera);
        const resizeRendererToContainer = () => {
            const bounds = container.getBoundingClientRect();
            const nextWidth = Math.max(Math.round(bounds.width), 1);
            const nextHeight = Math.max(Math.round(bounds.height), 1);
            const nextPixelRatio = Math.min(window.devicePixelRatio, 2);
            const nextSizeKey = `${nextWidth}:${nextHeight}:${nextPixelRatio}`;
            if (lastRendererSizeKey === nextSizeKey) {
                return;
            }
            lastRendererSizeKey = nextSizeKey;
            renderer.setPixelRatio(nextPixelRatio);
            renderer.setSize(nextWidth, nextHeight, false);
            camera.aspect = nextWidth / nextHeight;
            camera.updateProjectionMatrix();
            controls.update();
            renderer.render(scene, camera);
        };
        const scheduleResize = () => {
            if (resizeFrameId) {
                window.cancelAnimationFrame(resizeFrameId);
            }
            resizeFrameId = window.requestAnimationFrame(() => {
                resizeRendererToContainer();
                resizeFrameId = window.requestAnimationFrame(() => {
                    resizeFrameId = 0;
                    resizeRendererToContainer();
                });
            });
        };
        resizeRendererToContainer();
        const resizeObserver = new ResizeObserver(scheduleResize);
        resizeObserver.observe(container);
        window.addEventListener("resize", scheduleResize);
        const animate = () => {
            const animationConfig = animationConfigRef.current;
            controls.autoRotate =
                renderer.domElement.dataset.pauseAutoRotate === "true"
                    ? false
                    : animationConfig.autoRotate;
            controls.autoRotateSpeed = animationConfig.autoRotateSpeed;
            controls.update();
            renderer.render(scene, camera);
            animationFrameId = window.requestAnimationFrame(animate);
        };
        animate();
        return () => {
            window.cancelAnimationFrame(animationFrameId);
            if (resizeFrameId) {
                window.cancelAnimationFrame(resizeFrameId);
            }
            window.removeEventListener("resize", scheduleResize);
            resizeObserver.disconnect();
            controls.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
            scene.children.forEach((object) => disposeObject3D(object));
            renderer.dispose();
            scene.clear();
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            controlsRef.current = null;
        };
    }, [containerRef]);
    return { cameraRef, controlsRef, rendererRef, sceneRef };
}
