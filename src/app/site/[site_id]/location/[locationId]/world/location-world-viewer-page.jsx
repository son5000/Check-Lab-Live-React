"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Camera,
    Gauge,
    Move3D,
    Plus,
    RotateCcw,
    Save,
    Thermometer,
    Trash2,
} from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";
import { ModelLoader } from "@/app/site/[site_id]/location/[locationId]/asset/[asset_id]/components/panels/3d-viewer/modules/ModelLoader";
import { disposeObject3D } from "@/app/site/[site_id]/location/[locationId]/asset/[asset_id]/components/panels/3d-viewer/utils/threeDisposal";
const SAMPLE_MODEL_FILE = {
    label: "Sample PLY",
    normalizeSize: 3.8,
    plyUrl: "/3d/sample.ply",
    textures: [
        {
            enabled: true,
            id: "world-sample-texture",
            label: "Sample PNG",
            role: "baseColor",
            source: "/3d/sample.png",
            strength: 1,
        },
    ],
};
const DEMO_ASSETS = [
    { id: "world-demo-compressor-01", name: "Compressor 01", status: "normal", type: "압축 설비" },
    { id: "world-demo-pump-02", name: "Pump 02", status: "caution", type: "이송 펌프" },
    { id: "world-demo-panel-03", name: "Panel 03", status: "warning", type: "전기 패널" },
    { id: "world-demo-chiller-04", name: "Chiller 04", status: "normal", type: "냉각 설비" },
    { id: "world-demo-blower-05", name: "Blower 05", status: "danger", type: "송풍 설비" },
];
const statusLabel = {
    caution: "주의",
    danger: "이상",
    error: "오류",
    normal: "정상",
    warning: "경고",
};
const statusColor = {
    caution: "#fbbf24",
    danger: "#fb7185",
    error: "#f87171",
    normal: "#67e8f9",
    warning: "#f97316",
};
const WORLD_SIZE = { depth: 48, width: 72 };
const EYE_HEIGHT = 3.4;
export function LocationWorldViewerPage({ assets, location, site }) {
    const storageKey = `checklab:location-world:${site.id}:${location.id}`;
    const assetStorageKey = `${storageKey}:assets`;
    const initialAssets = useMemo(() => buildDisplayAssets(assets), [assets]);
    const [worldAssets, setWorldAssets] = useState(() => readStoredWorldAssets(assetStorageKey, initialAssets));
    const [placements, setPlacements] = useState(() => readStoredPlacements(storageKey, worldAssets));
    const [selectedAssetId, setSelectedAssetId] = useState(worldAssets[0]?.id ?? "");
    const [isAddingAsset, setIsAddingAsset] = useState(false);
    const [isSaved, setIsSaved] = useState(true);
    useEffect(() => {
        setPlacements((currentPlacements) => mergePlacements(worldAssets, currentPlacements));
        setSelectedAssetId((currentId) => currentId && worldAssets.some((asset) => asset.id === currentId)
            ? currentId
            : worldAssets[0]?.id ?? "");
    }, [worldAssets]);
    const selectedAsset = worldAssets.find((asset) => asset.id === selectedAssetId);
    const selectedPlacement = placements[selectedAssetId];
    const handlePlacementChange = (assetId, patch) => {
        setPlacements((currentPlacements) => ({
            ...currentPlacements,
            [assetId]: {
                ...currentPlacements[assetId],
                ...patch,
            },
        }));
        setIsSaved(false);
    };
    const handleSavePlacements = () => {
        window.localStorage.setItem(storageKey, JSON.stringify(placements));
        window.localStorage.setItem(assetStorageKey, JSON.stringify(worldAssets));
        setIsSaved(true);
    };
    const handleResetPlacements = () => {
        const nextAssets = buildDisplayAssets(assets);
        const nextPlacements = buildDefaultPlacements(nextAssets);
        setWorldAssets(nextAssets);
        setPlacements(nextPlacements);
        window.localStorage.setItem(storageKey, JSON.stringify(nextPlacements));
        window.localStorage.setItem(assetStorageKey, JSON.stringify(nextAssets));
        setIsSaved(true);
        setIsAddingAsset(false);
    };
    const handleProximityFocus = (assetId) => {
        setSelectedAssetId((currentAssetId) => currentAssetId === assetId ? currentAssetId : assetId);
    };
    const handleAddAssetAt = (position) => {
        const nextIndex = worldAssets.length + 1;
        const nextAsset = {
            id: `world-custom-${Date.now()}`,
            isWorldCustom: true,
            name: `월드 설비 ${nextIndex}`,
            status: "normal",
            type: "사용자 배치 설비",
        };
        setWorldAssets((currentAssets) => [...currentAssets, nextAsset]);
        setPlacements((currentPlacements) => ({
            ...currentPlacements,
            [nextAsset.id]: {
                rotationY: 0,
                x: clampNumber(position.x, -WORLD_SIZE.width / 2 + 3, WORLD_SIZE.width / 2 - 3),
                z: clampNumber(position.z, -WORLD_SIZE.depth / 2 + 3, WORLD_SIZE.depth / 2 - 3),
            },
        }));
        setSelectedAssetId(nextAsset.id);
        setIsAddingAsset(false);
        setIsSaved(false);
    };
    const handleRemoveAsset = (assetId) => {
        setWorldAssets((currentAssets) => currentAssets.filter((asset) => asset.id !== assetId));
        setPlacements((currentPlacements) => {
            const nextPlacements = { ...currentPlacements };
            delete nextPlacements[assetId];
            return nextPlacements;
        });
        setSelectedAssetId((currentAssetId) => {
            if (currentAssetId !== assetId) {
                return currentAssetId;
            }
            const nextAsset = worldAssets.find((asset) => asset.id !== assetId);
            return nextAsset?.id ?? "";
        });
        setIsSaved(false);
    };
    return (<main className="LocationWorldViewerPage LocationWorldViewerPage__root-1 h-dvh min-h-0 min-w-0 overflow-hidden bg-neutral-950 text-white">
      <LocationWorldScene assets={worldAssets} isAddingAsset={isAddingAsset} location={location} placements={placements} selectedAssetId={selectedAssetId} onAddAssetAt={handleAddAssetAt} onPlacementSelect={setSelectedAssetId} onProximityFocus={handleProximityFocus}/>
      <header className="LocationWorldViewerPage LocationWorldViewerPage__header-1 pointer-events-none absolute left-3 right-3 top-3 z-30 flex min-w-0 items-start justify-between gap-3">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__title-block-1 pointer-events-auto min-w-0 rounded-md border border-white/15 bg-black/55 px-3 py-2 shadow-2xl backdrop-blur-md">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__eyebrow-1 truncate text-[11px] font-semibold text-cyan-100/75">
            {site.name} / {location.floor || location.id}
          </p>
          <h1 className="LocationWorldViewerPage LocationWorldViewerPage__title-1 truncate text-base font-semibold">
            {location.name} 3D 월드
          </h1>
        </div>
        <div className="LocationWorldViewerPage LocationWorldViewerPage__actions-1 pointer-events-auto flex shrink-0 items-center gap-2">
          <button type="button" className="LocationWorldViewerPage LocationWorldViewerPage__save-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-cyan-300/35 bg-cyan-300 px-3 text-xs font-semibold text-slate-950 shadow-xl transition hover:bg-cyan-200" onClick={handleSavePlacements}>
            <Save className="LocationWorldViewerPage LocationWorldViewerPage__icon-1 h-3.5 w-3.5" aria-hidden="true"/>
            {isSaved ? "배치 저장됨" : "배치 저장"}
          </button>
          <button type="button" className="LocationWorldViewerPage LocationWorldViewerPage__reset-1 grid h-9 w-9 place-items-center rounded-md border border-white/15 bg-black/45 text-white/80 shadow-xl transition hover:bg-white/15 hover:text-white" onClick={handleResetPlacements} title="배치 초기화" aria-label="배치 초기화">
            <RotateCcw className="LocationWorldViewerPage LocationWorldViewerPage__icon-2 h-4 w-4" aria-hidden="true"/>
          </button>
          <Link href={`/site/${encodeURIComponent(site.id)}/location/${encodeURIComponent(location.id)}`} className="LocationWorldViewerPage LocationWorldViewerPage__back-1 inline-flex h-9 items-center rounded-md border border-white/15 bg-black/45 px-3 text-xs font-semibold text-white/80 shadow-xl transition hover:bg-white/15 hover:text-white">
            위치 요약
          </Link>
        </div>
      </header>
      <WorldPlacementPanel assets={worldAssets} isAddingAsset={isAddingAsset} placements={placements} selectedAsset={selectedAsset} selectedPlacement={selectedPlacement} onAddStart={() => setIsAddingAsset(true)} onAddCancel={() => setIsAddingAsset(false)} onPlacementChange={handlePlacementChange} onRemove={handleRemoveAsset} onSelect={setSelectedAssetId}/>
      <WorldMovementPad/>
    </main>);
}
function LocationWorldScene({ assets, isAddingAsset, location, onAddAssetAt, onPlacementSelect, onProximityFocus, placements, selectedAssetId, }) {
    const containerRef = useRef(null);
    const assetGroupsRef = useRef(new Map());
    const baseModelRef = useRef(null);
    const keysRef = useRef(new Set());
    const sceneRef = useRef(null);
    const cameraStateRef = useRef({
        position: new THREE.Vector3(0, EYE_HEIGHT, 22),
        yaw: 0,
    });
    const proximityFocusRef = useRef({ assetId: "", lastChangedAt: 0 });
    const projectedKeyRef = useRef("");
    const placementsRef = useRef(placements);
    const assetsRef = useRef(assets);
    const isAddingAssetRef = useRef(isAddingAsset);
    const onAddAssetAtRef = useRef(onAddAssetAt);
    const selectedAssetIdRef = useRef(selectedAssetId);
    const onPlacementSelectRef = useRef(onPlacementSelect);
    const onProximityFocusRef = useRef(onProximityFocus);
    const [loadMessage, setLoadMessage] = useState("3D 월드 구성 중");
    const [projectedCards, setProjectedCards] = useState([]);
    useEffect(() => {
        placementsRef.current = placements;
        updateAssetTransforms(assetGroupsRef.current, placements);
    }, [placements]);
    useEffect(() => {
        assetsRef.current = assets;
        syncAssetModels({
            assets,
            baseModel: baseModelRef.current,
            groups: assetGroupsRef.current,
            placements: placementsRef.current,
            scene: sceneRef.current,
            selectedAssetId: selectedAssetIdRef.current,
        });
    }, [assets]);
    useEffect(() => {
        isAddingAssetRef.current = isAddingAsset;
    }, [isAddingAsset]);
    useEffect(() => {
        onAddAssetAtRef.current = onAddAssetAt;
    }, [onAddAssetAt]);
    useEffect(() => {
        selectedAssetIdRef.current = selectedAssetId;
        assetGroupsRef.current.forEach((group, assetId) => {
            applyAssetSelection(group, assetId === selectedAssetId);
        });
    }, [selectedAssetId]);
    useEffect(() => {
        onPlacementSelectRef.current = onPlacementSelect;
    }, [onPlacementSelect]);
    useEffect(() => {
        onProximityFocusRef.current = onProximityFocus;
    }, [onProximityFocus]);
    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#020617");
        scene.fog = new THREE.Fog("#020617", 28, 94);
        const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 900);
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
        });
        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const floorHit = new THREE.Vector3();
        const placementPreview = createPlacementPreview();
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let animationFrameId = 0;
        let previousTimestamp = performance.now();
        let isDisposed = false;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.domElement.className = "LocationWorldViewerPage LocationWorldViewerPage__canvas-1 h-full w-full";
        container.appendChild(renderer.domElement);
        sceneRef.current = scene;
        createWorldEnvironment(scene);
        scene.add(placementPreview);
        applyCameraState(camera, cameraStateRef.current);
        resizeRenderer(container, renderer, camera);
        const resizeObserver = new ResizeObserver(() => resizeRenderer(container, renderer, camera));
        resizeObserver.observe(container);
        const handleKeyDown = (event) => {
            if (isEditableTarget(event.target)) {
                return;
            }
            const action = keyToAction(event.key);
            if (!action) {
                return;
            }
            event.preventDefault();
            keysRef.current.add(action);
        };
        const handleKeyUp = (event) => {
            if (isEditableTarget(event.target)) {
                return;
            }
            const action = keyToAction(event.key);
            if (action) {
                keysRef.current.delete(action);
            }
        };
        const handleMoveEvent = (event) => {
            const action = event.detail?.action;
            if (!action) {
                return;
            }
            if (event.detail.active) {
                keysRef.current.add(action);
                return;
            }
            keysRef.current.delete(action);
        };
        const handlePointerDown = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
            raycaster.setFromCamera(pointer, camera);
            if (isAddingAssetRef.current) {
                if (raycaster.ray.intersectPlane(floorPlane, floorHit)) {
                    onAddAssetAtRef.current?.({
                        x: floorHit.x,
                        z: floorHit.z,
                    });
                }
                return;
            }
            const hits = raycaster.intersectObjects([...assetGroupsRef.current.values()], true);
            const assetId = hits.map((hit) => findAssetId(hit.object)).find(Boolean);
            if (assetId) {
                onPlacementSelectRef.current(assetId);
            }
        };
        const handlePointerMove = (event) => {
            if (!isAddingAssetRef.current) {
                placementPreview.visible = false;
                return;
            }
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
            raycaster.setFromCamera(pointer, camera);
            if (!raycaster.ray.intersectPlane(floorPlane, floorHit)) {
                placementPreview.visible = false;
                return;
            }
            placementPreview.visible = true;
            placementPreview.position.set(
                clampNumber(floorHit.x, -WORLD_SIZE.width / 2 + 3, WORLD_SIZE.width / 2 - 3),
                0.08,
                clampNumber(floorHit.z, -WORLD_SIZE.depth / 2 + 3, WORLD_SIZE.depth / 2 - 3),
            );
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("location-world-move", handleMoveEvent);
        renderer.domElement.addEventListener("pointerdown", handlePointerDown);
        renderer.domElement.addEventListener("pointermove", handlePointerMove);
        new ModelLoader()
            .loadModel(SAMPLE_MODEL_FILE)
            .then((baseModel) => {
            if (isDisposed) {
                disposeObject3D(baseModel);
                return;
            }
            baseModelRef.current = baseModel;
            syncAssetModels({
                assets: assetsRef.current,
                baseModel,
                groups: assetGroupsRef.current,
                placements: placementsRef.current,
                scene,
                selectedAssetId: selectedAssetIdRef.current,
            });
            setLoadMessage(undefined);
        })
            .catch(() => {
            setLoadMessage("샘플 3D 모델을 불러오지 못했습니다");
        });
        const animate = (timestamp) => {
            const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.06);
            previousTimestamp = timestamp;
            updatePersonCamera(cameraStateRef.current, keysRef.current, deltaSeconds);
            applyCameraState(camera, cameraStateRef.current);
            if (!isAddingAssetRef.current && placementPreview.visible) {
                placementPreview.visible = false;
            }
            updateProjectedCards({
                assets: assetsRef.current,
                camera,
                groups: assetGroupsRef.current,
                keyRef: projectedKeyRef,
                selectedAssetId: selectedAssetIdRef.current,
                setProjectedCards,
            });
            if (!isAddingAssetRef.current) {
                updateNearestAssetFocus({
                    assets: assetsRef.current,
                    cameraPosition: cameraStateRef.current.position,
                    groups: assetGroupsRef.current,
                    proximityFocus: proximityFocusRef.current,
                    selectedAssetId: selectedAssetIdRef.current,
                    onFocus: onProximityFocusRef.current,
                });
            }
            renderer.render(scene, camera);
            animationFrameId = window.requestAnimationFrame(animate);
        };
        animationFrameId = window.requestAnimationFrame(animate);
        return () => {
            isDisposed = true;
            window.cancelAnimationFrame(animationFrameId);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("location-world-move", handleMoveEvent);
            renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
            renderer.domElement.removeEventListener("pointermove", handlePointerMove);
            resizeObserver.disconnect();
            keysRef.current.clear();
            assetGroupsRef.current.clear();
            baseModelRef.current = null;
            sceneRef.current = null;
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
            if (baseModelRef.current) {
                disposeObject3D(baseModelRef.current);
            }
            disposeObject3D(scene);
            renderer.dispose();
        };
    }, []);
    return (<div className="LocationWorldViewerPage LocationWorldViewerPage__scene-1 absolute inset-0">
      <div ref={containerRef} className="LocationWorldViewerPage LocationWorldViewerPage__canvas-host-1 h-full min-h-0 w-full"/>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__vignette-1 pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(2,6,23,0.2)_58%,rgba(2,6,23,0.72)_100%)]"/>
      {projectedCards.map((card) => (<AssetWorldStatusCard key={card.id} card={card}/>))}
      {loadMessage ? (<div className="LocationWorldViewerPage LocationWorldViewerPage__loader-1 absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-black/65 px-4 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur">
          {loadMessage}
        </div>) : null}
      <div className="LocationWorldViewerPage LocationWorldViewerPage__location-chip-1 pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/15 bg-black/45 px-3 py-2 text-[11px] font-semibold text-white/75 backdrop-blur">
        {location.name}
      </div>
    </div>);
}
function WorldPlacementPanel({ assets, isAddingAsset, onAddCancel, onAddStart, onPlacementChange, onRemove, onSelect, placements, selectedAsset, selectedPlacement, }) {
    if (!selectedAsset || !selectedPlacement) {
        return (<aside className="LocationWorldViewerPage LocationWorldViewerPage__panel-1 absolute bottom-4 right-4 top-16 z-30 flex w-[min(22rem,calc(100dvw-2rem))] min-w-0 flex-col gap-3 rounded-md border border-white/15 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-header-1 min-w-0">
        <p className="LocationWorldViewerPage LocationWorldViewerPage__panel-eyebrow-1 text-[11px] font-semibold text-cyan-100/70">
          월드 배치
        </p>
        <h2 className="LocationWorldViewerPage LocationWorldViewerPage__panel-title-1 text-sm font-semibold">
          등록된 오브젝트 없음
        </h2>
      </div>
      <button type="button" className={cn("LocationWorldViewerPage LocationWorldViewerPage__add-1 inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition", isAddingAsset
                ? "border-cyan-300/55 bg-cyan-300 text-slate-950"
                : "border-white/15 bg-white/[0.08] text-white/80 hover:bg-white/[0.15] hover:text-white")} onClick={isAddingAsset ? onAddCancel : onAddStart}>
        <Plus className="LocationWorldViewerPage LocationWorldViewerPage__add-icon-1 h-3.5 w-3.5" aria-hidden="true"/>
        {isAddingAsset ? "바닥을 클릭해 배치" : "요소 추가"}
      </button>
    </aside>);
    }
    const telemetry = getAssetTelemetry(selectedAsset, assets.findIndex((asset) => asset.id === selectedAsset.id));
    return (<aside className="LocationWorldViewerPage LocationWorldViewerPage__panel-1 absolute bottom-4 right-4 top-16 z-30 flex w-[min(22rem,calc(100dvw-2rem))] min-w-0 flex-col gap-3 rounded-md border border-white/15 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-header-1 flex min-w-0 items-start justify-between gap-2">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-copy-1 min-w-0">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__panel-eyebrow-1 text-[11px] font-semibold text-cyan-100/70">
            가까운 설비 자동 포커스
          </p>
          <h2 className="LocationWorldViewerPage LocationWorldViewerPage__panel-title-1 truncate text-sm font-semibold">
            {selectedAsset.name}
          </h2>
        </div>
        <span className={cn("LocationWorldViewerPage LocationWorldViewerPage__panel-status-1 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold", dashboardStatusClassName[selectedAsset.status])}>
          {statusLabel[selectedAsset.status] ?? selectedAsset.status}
        </span>
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-actions-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button type="button" className={cn("LocationWorldViewerPage LocationWorldViewerPage__add-1 inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition", isAddingAsset
                ? "border-cyan-300/55 bg-cyan-300 text-slate-950"
                : "border-white/15 bg-white/[0.08] text-white/80 hover:bg-white/[0.15] hover:text-white")} onClick={isAddingAsset ? onAddCancel : onAddStart}>
          <Plus className="LocationWorldViewerPage LocationWorldViewerPage__add-icon-1 h-3.5 w-3.5" aria-hidden="true"/>
          {isAddingAsset ? "바닥을 클릭해 배치" : "요소 추가"}
        </button>
        <button type="button" className="LocationWorldViewerPage LocationWorldViewerPage__delete-1 inline-flex h-9 items-center justify-center gap-1 rounded-md border border-red-400/35 bg-red-500/15 px-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/25" onClick={() => onRemove(selectedAsset.id)}>
          <Trash2 className="LocationWorldViewerPage LocationWorldViewerPage__delete-icon-1 h-3.5 w-3.5" aria-hidden="true"/>
          제거
        </button>
      </div>
      {isAddingAsset ? (<p className="LocationWorldViewerPage LocationWorldViewerPage__add-help-1 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1.5 text-[11px] font-semibold text-cyan-50/85">
          마우스 커서 아래 바닥 원을 확인한 뒤 클릭하면 새 오브젝트가 생성됩니다.
        </p>) : null}
      <label className="LocationWorldViewerPage LocationWorldViewerPage__field-1 grid gap-1 text-[11px] font-semibold text-white/65">
        설비 선택
        <select className="LocationWorldViewerPage LocationWorldViewerPage__select-1 h-9 min-w-0 rounded-md border border-white/15 bg-white/10 px-2 text-xs font-semibold text-white outline-none" value={selectedAsset.id} onChange={(event) => onSelect(event.target.value)}>
          {assets.map((asset) => (<option key={asset.id} value={asset.id}>
              {asset.name}
            </option>))}
        </select>
      </label>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__status-box-1 grid grid-cols-3 gap-2 rounded-md border border-white/10 bg-white/[0.06] p-2">
        <MiniMetric icon={Thermometer} label="온도" value={`${telemetry.temperature}°C`}/>
        <MiniMetric icon={Gauge} label="초음파" value={`${telemetry.ultrasound} dB`}/>
        <MiniMetric icon={Camera} label="카메라" value={telemetry.camera}/>
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__position-grid-1 grid grid-cols-2 gap-2">
        <WorldNumberField label="X" max={WORLD_SIZE.width / 2 - 3} min={-WORLD_SIZE.width / 2 + 3} onChange={(x) => onPlacementChange(selectedAsset.id, { x })} value={selectedPlacement.x}/>
        <WorldNumberField label="Z" max={WORLD_SIZE.depth / 2 - 3} min={-WORLD_SIZE.depth / 2 + 3} onChange={(z) => onPlacementChange(selectedAsset.id, { z })} value={selectedPlacement.z}/>
      </div>
      <WorldNumberField label="회전" max={180} min={-180} onChange={(rotationY) => onPlacementChange(selectedAsset.id, { rotationY })} suffix="°" value={selectedPlacement.rotationY}/>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__summary-1 rounded-md border border-white/10 bg-white/[0.05] p-2 text-[11px] text-white/70">
        <p className="LocationWorldViewerPage LocationWorldViewerPage__summary-title-1 mb-1 font-semibold text-white">
          현재 요약
        </p>
        <p className="LocationWorldViewerPage LocationWorldViewerPage__summary-line-1">
          위치 X {round(selectedPlacement.x)} / Z {round(selectedPlacement.z)} / 회전 {round(selectedPlacement.rotationY)}°
        </p>
        <p className="LocationWorldViewerPage LocationWorldViewerPage__summary-line-2">
          {selectedAsset.type} / {telemetry.camera} / {telemetry.temperature}°C / {telemetry.ultrasound} dB
        </p>
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__asset-list-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {assets.map((asset, index) => {
            const placement = placements[asset.id];
            return (<button key={asset.id} type="button" className={cn("LocationWorldViewerPage LocationWorldViewerPage__asset-row-1 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-white/10 bg-white/[0.05] px-2 py-2 text-left transition hover:bg-white/[0.09]", asset.id === selectedAsset.id && "border-cyan-300/45 bg-cyan-300/15")} onClick={() => onSelect(asset.id)}>
              <span className="LocationWorldViewerPage LocationWorldViewerPage__asset-name-1 min-w-0 truncate text-xs font-semibold text-white">
                {index + 1}. {asset.name}
              </span>
              <span className="LocationWorldViewerPage LocationWorldViewerPage__asset-position-1 shrink-0 font-mono text-[10px] text-white/55">
                {placement ? `${round(placement.x)}, ${round(placement.z)}` : "-"}
              </span>
            </button>);
        })}
      </div>
    </aside>);
}
function WorldMovementPad() {
    return (<div className="LocationWorldViewerPage LocationWorldViewerPage__movement-1 absolute bottom-4 left-1/2 z-30 grid -translate-x-1/2 grid-cols-3 gap-1.5 rounded-md border border-white/15 bg-black/55 p-2 shadow-2xl backdrop-blur-md">
      <span/>
      <MoveButton action="forward" icon={ArrowUp} label="앞"/>
      <span/>
      <MoveButton action="left" icon={ArrowLeft} label="왼쪽"/>
      <MoveButton action="back" icon={ArrowDown} label="뒤"/>
      <MoveButton action="right" icon={ArrowRight} label="오른쪽"/>
      <MoveButton action="turnLeft" label="좌회전"/>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__eye-1 grid h-9 min-w-14 place-items-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-[10px] font-semibold text-cyan-100">
        <Move3D className="LocationWorldViewerPage LocationWorldViewerPage__eye-icon-1 h-3.5 w-3.5" aria-hidden="true"/>
      </div>
      <MoveButton action="turnRight" label="우회전"/>
    </div>);
}
function MoveButton({ action, icon: Icon, label, }) {
    const handlePress = () => {
        window.dispatchEvent(new CustomEvent("location-world-move", { detail: { action, active: true } }));
    };
    const handleRelease = () => {
        window.dispatchEvent(new CustomEvent("location-world-move", { detail: { action, active: false } }));
    };
    return (<button type="button" className="LocationWorldViewerPage LocationWorldViewerPage__move-button-1 inline-flex h-9 min-w-14 items-center justify-center gap-1 rounded-md border border-white/15 bg-white/[0.08] px-2 text-[11px] font-semibold text-white/80 transition hover:bg-white/[0.15] hover:text-white" onPointerDown={handlePress} onPointerLeave={handleRelease} onPointerUp={handleRelease}>
      {Icon ? <Icon className="LocationWorldViewerPage LocationWorldViewerPage__move-icon-1 h-3.5 w-3.5" aria-hidden="true"/> : null}
      {label}
    </button>);
}
function AssetWorldStatusCard({ card }) {
    const telemetry = getAssetTelemetry(card.asset, card.index);
    return (<div className={cn("LocationWorldViewerPage LocationWorldViewerPage__status-card-1 pointer-events-none absolute z-20 w-[11.5rem] -translate-x-1/2 -translate-y-full rounded-md border bg-black/62 p-2 text-white shadow-2xl backdrop-blur-md transition", card.selected
            ? "border-lime-200/70 bg-lime-950/55"
            : "border-cyan-200/30")} style={{
            left: `${card.left}%`,
            top: `${card.top}%`,
            opacity: card.opacity,
        }}>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__status-title-row-1 mb-1 flex min-w-0 items-center justify-between gap-2">
        <p className="LocationWorldViewerPage LocationWorldViewerPage__status-title-1 min-w-0 truncate text-xs font-semibold">
          {card.asset.name}
        </p>
        <span className={cn("LocationWorldViewerPage LocationWorldViewerPage__status-pill-1 shrink-0 rounded-sm border px-1 py-0.5 text-[9px] font-bold", dashboardStatusClassName[card.asset.status])}>
          {statusLabel[card.asset.status] ?? card.asset.status}
        </span>
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__status-grid-1 grid grid-cols-3 gap-1">
        <StatusCell label="온도" value={`${telemetry.temperature}°`}/>
        <StatusCell label="초음파" value={`${telemetry.ultrasound}`}/>
        <StatusCell label="CAM" value={telemetry.camera}/>
      </div>
    </div>);
}
function MiniMetric({ icon: Icon, label, value }) {
    return (<div className="LocationWorldViewerPage LocationWorldViewerPage__mini-1 min-w-0 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__mini-label-1 mb-1 flex min-w-0 items-center gap-1 text-[10px] font-semibold text-white/55">
        <Icon className="LocationWorldViewerPage LocationWorldViewerPage__mini-icon-1 h-3 w-3 shrink-0" aria-hidden="true"/>
        <span className="truncate">{label}</span>
      </div>
      <p className="LocationWorldViewerPage LocationWorldViewerPage__mini-value-1 truncate font-mono text-xs font-semibold text-white">
        {value}
      </p>
    </div>);
}
function StatusCell({ label, value }) {
    return (<div className="LocationWorldViewerPage LocationWorldViewerPage__status-cell-1 min-w-0 rounded-sm border border-white/10 bg-white/[0.07] px-1.5 py-1">
      <p className="LocationWorldViewerPage LocationWorldViewerPage__status-label-1 truncate text-[9px] font-semibold text-cyan-100/65">
        {label}
      </p>
      <p className="LocationWorldViewerPage LocationWorldViewerPage__status-value-1 truncate font-mono text-[11px] font-semibold">
        {value}
      </p>
    </div>);
}
function WorldNumberField({ label, max, min, onChange, suffix = "", value }) {
    return (<label className="LocationWorldViewerPage LocationWorldViewerPage__number-field-1 grid gap-1 text-[11px] font-semibold text-white/65">
      {label}
      <span className="LocationWorldViewerPage LocationWorldViewerPage__number-wrap-1 flex h-9 min-w-0 items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2">
        <input className="LocationWorldViewerPage LocationWorldViewerPage__number-input-1 min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold text-white outline-none" max={max} min={min} type="number" value={round(value)} onChange={(event) => onChange(clampNumber(Number(event.target.value), min, max))}/>
        {suffix ? (<span className="LocationWorldViewerPage LocationWorldViewerPage__number-suffix-1 shrink-0 text-[10px] text-white/55">
            {suffix}
          </span>) : null}
      </span>
    </label>);
}
function createWorldEnvironment(scene) {
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: "#1f2933",
        metalness: 0.04,
        roughness: 0.88,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE.width, WORLD_SIZE.depth), floorMaterial);
    floor.name = "world-floor";
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(WORLD_SIZE.width, 36, "#38bdf8", "#334155");
    grid.name = "world-grid";
    grid.material.opacity = 0.24;
    grid.material.transparent = true;
    scene.add(grid);
    addWall(scene, { x: 0, y: 5, z: -WORLD_SIZE.depth / 2 }, { x: WORLD_SIZE.width, y: 10, z: 0.4 });
    addWall(scene, { x: -WORLD_SIZE.width / 2, y: 5, z: 0 }, { x: 0.4, y: 10, z: WORLD_SIZE.depth });
    addWall(scene, { x: WORLD_SIZE.width / 2, y: 5, z: 0 }, { x: 0.4, y: 10, z: WORLD_SIZE.depth });
    addFloorMarkings(scene);
    addColumns(scene);
    addPipes(scene);
    const ambient = new THREE.AmbientLight("#ffffff", 1.15);
    scene.add(ambient);
    const hemisphere = new THREE.HemisphereLight("#c7d2fe", "#0f172a", 1.45);
    scene.add(hemisphere);
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.2);
    keyLight.position.set(-16, 24, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -48;
    keyLight.shadow.camera.right = 48;
    keyLight.shadow.camera.top = 36;
    keyLight.shadow.camera.bottom = -36;
    scene.add(keyLight);
    [
        [-22, 8, -15],
        [0, 8, -15],
        [22, 8, -15],
        [-22, 8, 12],
        [0, 8, 12],
        [22, 8, 12],
    ].forEach(([x, y, z]) => {
        const lamp = new THREE.PointLight("#67e8f9", 1.6, 26);
        lamp.position.set(x, y, z);
        scene.add(lamp);
        const fixture = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.36), new THREE.MeshStandardMaterial({
            color: "#cffafe",
            emissive: "#67e8f9",
            emissiveIntensity: 0.75,
        }));
        fixture.position.set(x, y + 0.18, z);
        scene.add(fixture);
    });
}
function addWall(scene, position, scale) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(scale.x, scale.y, scale.z), new THREE.MeshStandardMaterial({
        color: "#111827",
        metalness: 0.02,
        roughness: 0.72,
    }));
    wall.position.set(position.x, position.y, position.z);
    wall.receiveShadow = true;
    scene.add(wall);
}
function addFloorMarkings(scene) {
    const stripeMaterial = new THREE.MeshStandardMaterial({
        color: "#facc15",
        emissive: "#713f12",
        emissiveIntensity: 0.18,
        roughness: 0.7,
    });
    [-12, 12].forEach((x) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, WORLD_SIZE.depth - 8), stripeMaterial);
        stripe.position.set(x, 0.025, 0);
        scene.add(stripe);
    });
    [-18, 0, 18].forEach((x) => {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(7, 0.035, 0.18), stripeMaterial);
        cross.position.set(x, 0.035, 18);
        scene.add(cross);
    });
}
function addColumns(scene) {
    const material = new THREE.MeshStandardMaterial({
        color: "#334155",
        metalness: 0.18,
        roughness: 0.55,
    });
    [-28, 28].forEach((x) => {
        [-16, 6, 20].forEach((z) => {
            const column = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.8, 1.1), material);
            column.position.set(x, 4.4, z);
            column.castShadow = true;
            column.receiveShadow = true;
            scene.add(column);
        });
    });
}
function addPipes(scene) {
    const material = new THREE.MeshStandardMaterial({
        color: "#64748b",
        metalness: 0.55,
        roughness: 0.3,
    });
    [-18, -8, 10, 20].forEach((z, index) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18 + index * 0.025, 0.18 + index * 0.025, WORLD_SIZE.width - 8, 24), material);
        pipe.position.set(0, 7.4 + index * 0.42, z);
        pipe.rotation.z = Math.PI / 2;
        pipe.castShadow = true;
        scene.add(pipe);
    });
}
function createPlacementPreview() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 8, 96), new THREE.MeshBasicMaterial({
        color: "#22d3ee",
        opacity: 0.92,
        transparent: true,
    }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(2.35, 72), new THREE.MeshBasicMaterial({
        color: "#22d3ee",
        opacity: 0.16,
        side: THREE.DoubleSide,
        transparent: true,
    }));
    const crossA = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.025, 0.08), new THREE.MeshBasicMaterial({
        color: "#a5f3fc",
        opacity: 0.72,
        transparent: true,
    }));
    const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 4.6), new THREE.MeshBasicMaterial({
        color: "#a5f3fc",
        opacity: 0.72,
        transparent: true,
    }));
    ring.rotation.x = Math.PI / 2;
    fill.rotation.x = -Math.PI / 2;
    group.add(fill, ring, crossA, crossB);
    group.visible = false;
    return group;
}
function syncAssetModels({ assets, baseModel, groups, placements, scene, selectedAssetId }) {
    if (!baseModel || !scene) {
        return;
    }
    const assetIds = new Set(assets.map((asset) => asset.id));
    groups.forEach((group, assetId) => {
        if (!assetIds.has(assetId)) {
            scene.remove(group);
            disposeObject3D(group);
            groups.delete(assetId);
        }
    });
    assets.forEach((asset, index) => {
        let group = groups.get(asset.id);
        if (!group) {
            group = createAssetModel(asset, baseModel);
            scene.add(group);
            groups.set(asset.id, group);
        }
        updateAssetModelStatus(group, asset);
        applyPlacement(group, placements[asset.id] ?? buildDefaultPlacement(index));
        applyAssetSelection(group, asset.id === selectedAssetId);
    });
}
function createAssetModel(asset, baseModel) {
    const root = new THREE.Group();
    const model = cloneModelForAsset(baseModel);
    const color = statusColor[asset.status] ?? statusColor.normal;
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.16, 42), new THREE.MeshStandardMaterial({
        color: "#0f172a",
        metalness: 0.18,
        roughness: 0.72,
    }));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.045, 8, 64), new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
    }));
    const selectionRing = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.075, 8, 72), new THREE.MeshStandardMaterial({
        color: "#bef264",
        emissive: "#bef264",
        emissiveIntensity: 0.82,
    }));
    const labelStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.8, 8), new THREE.MeshBasicMaterial({
        color,
        opacity: 0.42,
        transparent: true,
    }));
    root.userData.assetId = asset.id;
    root.userData.halo = halo;
    root.userData.labelStem = labelStem;
    root.userData.selectionRing = selectionRing;
    model.rotation.x = -Math.PI / 2;
    model.position.y = 2.06;
    model.traverse((object) => {
        object.userData.assetId = asset.id;
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    platform.position.y = 0.08;
    halo.position.y = 0.22;
    halo.rotation.x = Math.PI / 2;
    selectionRing.position.y = 0.28;
    selectionRing.rotation.x = Math.PI / 2;
    selectionRing.visible = false;
    labelStem.position.y = 2.65;
    root.add(platform, halo, selectionRing, labelStem, model);
    return root;
}
function cloneModelForAsset(baseModel) {
    const model = baseModel.clone(true);
    model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
            return;
        }
        object.geometry = object.geometry.clone();
        if (Array.isArray(object.material)) {
            object.material = object.material.map((material) => material.clone());
            return;
        }
        object.material = object.material.clone();
    });
    return model;
}
function updateAssetModelStatus(group, asset) {
    const color = statusColor[asset.status] ?? statusColor.normal;
    const haloMaterial = group.userData.halo?.material;
    if (haloMaterial instanceof THREE.MeshStandardMaterial) {
        haloMaterial.color.set(color);
        haloMaterial.emissive.set(color);
    }
    const stemMaterial = group.userData.labelStem?.material;
    if (stemMaterial instanceof THREE.MeshBasicMaterial) {
        stemMaterial.color.set(color);
    }
}
function applyAssetSelection(group, selected) {
    group.userData.selectionRing.visible = selected;
    group.userData.labelStem.material.opacity = selected ? 0.9 : 0.42;
}
function updateAssetTransforms(groups, placements) {
    groups.forEach((group, assetId) => {
        const placement = placements[assetId];
        if (placement) {
            applyPlacement(group, placement);
        }
    });
}
function updateNearestAssetFocus({ assets, cameraPosition, groups, onFocus, proximityFocus, selectedAssetId }) {
    if (!assets.length || !onFocus) {
        return;
    }
    const nearest = assets.reduce((currentNearest, asset) => {
        const group = groups.get(asset.id);
        if (!group) {
            return currentNearest;
        }
        const distance = cameraPosition.distanceTo(group.position);
        if (!currentNearest || distance < currentNearest.distance) {
            return { assetId: asset.id, distance };
        }
        return currentNearest;
    }, undefined);
    if (!nearest || nearest.distance > 8.5 || nearest.assetId === selectedAssetId) {
        return;
    }
    const now = performance.now();
    if (proximityFocus.assetId === nearest.assetId && now - proximityFocus.lastChangedAt < 1200) {
        return;
    }
    proximityFocus.assetId = nearest.assetId;
    proximityFocus.lastChangedAt = now;
    onFocus(nearest.assetId);
}
function applyPlacement(group, placement) {
    group.position.set(placement.x, 0, placement.z);
    group.rotation.y = THREE.MathUtils.degToRad(placement.rotationY ?? 0);
}
function updateProjectedCards({ assets, camera, groups, keyRef, selectedAssetId, setProjectedCards }) {
    const cards = assets.flatMap((asset, index) => {
        const group = groups.get(asset.id);
        if (!group) {
            return [];
        }
        const anchor = group.position.clone();
        anchor.y += 6.1;
        const projected = anchor.project(camera);
        if (projected.z < -1 || projected.z > 1) {
            return [];
        }
        const left = (projected.x + 1) * 50;
        const top = (1 - projected.y) * 50;
        if (left < -8 || left > 108 || top < -8 || top > 108) {
            return [];
        }
        const distance = camera.position.distanceTo(group.position);
        return [{
                asset,
                id: asset.id,
                index,
                left: clampNumber(left, 2, 98),
                opacity: clampNumber(1.12 - distance / 74, 0.38, 1),
                selected: asset.id === selectedAssetId,
                top: clampNumber(top, 6, 94),
            }];
    });
    const key = cards.map((card) => `${card.id}:${card.left.toFixed(1)}:${card.top.toFixed(1)}:${card.opacity.toFixed(2)}:${card.selected ? 1 : 0}`).join("|");
    if (keyRef.current !== key) {
        keyRef.current = key;
        setProjectedCards(cards);
    }
}
function resizeRenderer(container, renderer, camera) {
    const bounds = container.getBoundingClientRect();
    const width = Math.max(Math.round(bounds.width), 1);
    const height = Math.max(Math.round(bounds.height), 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}
function updatePersonCamera(state, keys, deltaSeconds) {
    const turnSpeed = 1.65;
    const moveSpeed = keys.has("fast") ? 12 : 7.4;
    if (keys.has("turnLeft")) {
        state.yaw += turnSpeed * deltaSeconds;
    }
    if (keys.has("turnRight")) {
        state.yaw -= turnSpeed * deltaSeconds;
    }
    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3();
    if (keys.has("forward")) {
        move.add(forward);
    }
    if (keys.has("back")) {
        move.sub(forward);
    }
    if (keys.has("right")) {
        move.add(right);
    }
    if (keys.has("left")) {
        move.sub(right);
    }
    if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(moveSpeed * deltaSeconds);
        state.position.add(move);
        state.position.x = clampNumber(state.position.x, -WORLD_SIZE.width / 2 + 2, WORLD_SIZE.width / 2 - 2);
        state.position.z = clampNumber(state.position.z, -WORLD_SIZE.depth / 2 + 2, WORLD_SIZE.depth / 2 - 2);
    }
}
function applyCameraState(camera, state) {
    camera.position.copy(state.position);
    const lookDirection = new THREE.Vector3(Math.sin(state.yaw), -0.05, -Math.cos(state.yaw));
    camera.lookAt(state.position.clone().add(lookDirection));
}
function keyToAction(key) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "arrowup" || normalizedKey === "w") {
        return "forward";
    }
    if (normalizedKey === "arrowdown" || normalizedKey === "s") {
        return "back";
    }
    if (normalizedKey === "arrowleft" || normalizedKey === "a") {
        return "left";
    }
    if (normalizedKey === "arrowright" || normalizedKey === "d") {
        return "right";
    }
    if (normalizedKey === "q") {
        return "turnLeft";
    }
    if (normalizedKey === "e") {
        return "turnRight";
    }
    if (normalizedKey === "shift") {
        return "fast";
    }
    return undefined;
}
function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}
function findAssetId(object) {
    let current = object;
    while (current) {
        if (current.userData.assetId) {
            return current.userData.assetId;
        }
        current = current.parent;
    }
    return undefined;
}
function buildDisplayAssets(assets) {
    const normalizedAssets = assets.map((asset) => ({
        ...asset,
        status: asset.status ?? "normal",
        type: asset.type || "설비",
    }));
    const existingIds = new Set(normalizedAssets.map((asset) => asset.id));
    const demoAssets = DEMO_ASSETS.filter((asset) => !existingIds.has(asset.id));
    return [...normalizedAssets, ...demoAssets].slice(0, Math.max(5, normalizedAssets.length));
}
function readStoredWorldAssets(storageKey, fallbackAssets) {
    if (typeof window === "undefined") {
        return fallbackAssets;
    }
    try {
        const storedValue = window.localStorage.getItem(storageKey);
        if (!storedValue) {
            return fallbackAssets;
        }
        const parsedValue = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) {
            return fallbackAssets;
        }
        return parsedValue.map((asset) => ({
            ...asset,
            status: asset.status ?? "normal",
            type: asset.type || "설비",
        }));
    }
    catch {
        return fallbackAssets;
    }
}
function readStoredPlacements(storageKey, assets) {
    if (typeof window === "undefined") {
        return buildDefaultPlacements(assets);
    }
    try {
        const storedValue = window.localStorage.getItem(storageKey);
        if (!storedValue) {
            return buildDefaultPlacements(assets);
        }
        const parsedValue = JSON.parse(storedValue);
        return mergePlacements(assets, parsedValue && typeof parsedValue === "object" ? parsedValue : {});
    }
    catch {
        return buildDefaultPlacements(assets);
    }
}
function mergePlacements(assets, currentPlacements) {
    return Object.fromEntries(assets.map((asset, index) => [
        asset.id,
        sanitizePlacement(currentPlacements[asset.id], index),
    ]));
}
function buildDefaultPlacements(assets) {
    return Object.fromEntries(assets.map((asset, index) => [asset.id, buildDefaultPlacement(index)]));
}
function buildDefaultPlacement(index) {
    const columns = 3;
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
        rotationY: [-18, 14, -8, 22, 0, -28][index % 6],
        x: -18 + column * 18,
        z: -12 + row * 13,
    };
}
function sanitizePlacement(placement, index) {
    const fallback = buildDefaultPlacement(index);
    if (!placement || typeof placement !== "object") {
        return fallback;
    }
    return {
        rotationY: clampNumber(readNumber(placement.rotationY, fallback.rotationY), -180, 180),
        x: clampNumber(readNumber(placement.x, fallback.x), -WORLD_SIZE.width / 2 + 3, WORLD_SIZE.width / 2 - 3),
        z: clampNumber(readNumber(placement.z, fallback.z), -WORLD_SIZE.depth / 2 + 3, WORLD_SIZE.depth / 2 - 3),
    };
}
function getAssetTelemetry(asset, index) {
    const statusOffset = {
        caution: 7,
        danger: 18,
        error: 24,
        normal: 0,
        warning: 12,
    }[asset.status] ?? 0;
    return {
        camera: `C${(index % 4) + 1}`,
        temperature: Math.round(42 + statusOffset + index * 1.7),
        ultrasound: Math.round(51 + statusOffset * 0.8 + index * 2.2),
    };
}
function readNumber(value, fallback) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
}
function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function round(value) {
    return Number(value.toFixed(1));
}
