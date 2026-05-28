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
  SlidersHorizontal,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { ModelLoader } from "@/app/site/[site_id]/location/[locationId]/asset/[asset_id]/components/panels/3d-viewer/modules/ModelLoader";
import { disposeObject3D } from "@/app/site/[site_id]/location/[locationId]/asset/[asset_id]/components/panels/3d-viewer/utils/threeDisposal";
const WORLD_SIZE = { depth: 48, width: 72 };
const WORLD_ASSET_BASE_Y = 0.08;
const WORLD_GROUND_Y = -0.02;
const WORLD_GROUND_MODEL_FILE = createWorldSampleModelFile({
  id: "bg-sample-ground",
  label: "Background Sample Ground",
  normalizeSize: WORLD_SIZE.width,
  plyUrl: "/3d/bg_sample.ply",
  textureUrl: "/3d/bg_sample.png",
});
const WORLD_SAMPLE_MODEL_FILES = [
  createWorldSampleModelFile({
    id: "equipment-sample",
    label: "Equipment Sample",
    plyUrl: "/3d/equipment_sample_threejs.ply",
    textureUrl: "/3d/equipment_sample_texture.png",
  }),
  createWorldSampleModelFile({
    id: "pump-unit",
    label: "Pump Unit",
    plyUrl: "/3d/sample_pump_unit.ply",
    textureUrl: "/3d/sample_pump_unit_texture.png",
  }),
  createWorldSampleModelFile({
    id: "thermal-node",
    label: "Thermal Node",
    plyUrl: "/3d/sample_thermal_node.ply",
    textureUrl: "/3d/sample_thermal_node_texture.png",
  }),
  createWorldSampleModelFile({
    id: "valve-box",
    label: "Valve Box",
    plyUrl: "/3d/sample_valve_box.ply",
    textureUrl: "/3d/sample_valve_box_texture.png",
  }),
  createWorldSampleModelFile({
    id: "main-sample",
    label: "Main Sample",
    normalizeSize: 4.6,
    plyUrl: "/3d/sample.ply",
    textureUrl: "/3d/sample.png",
  }),
];
const DEMO_ASSETS = [
  {
    id: "world-demo-compressor-01",
    name: "Compressor 01",
    status: "normal",
    type: "압축 설비",
  },
  {
    id: "world-demo-pump-02",
    name: "Pump 02",
    status: "caution",
    type: "이송 펌프",
  },
  {
    id: "world-demo-panel-03",
    name: "Panel 03",
    status: "warning",
    type: "전기 패널",
  },
  {
    id: "world-demo-chiller-04",
    name: "Chiller 04",
    status: "normal",
    type: "냉각 설비",
  },
  {
    id: "world-demo-blower-05",
    name: "Blower 05",
    status: "danger",
    type: "송풍 설비",
  },
  {
    id: "world-demo-abnormal-06",
    name: "Abnormal Sample",
    status: "error",
    type: "이상 샘플 설비",
  },
];
const WORLD_SAMPLE_ASSET_OVERRIDES = [
  {
    id: "world-sample-equipment-01",
    name: "Equipment Sample 01",
    status: "normal",
    type: "Sample Equipment",
  },
  {
    id: "world-sample-pump-02",
    name: "Pump Unit 02",
    status: "normal",
    type: "Sample Pump",
  },
  {
    id: "world-sample-thermal-03",
    name: "Thermal Node 03",
    status: "caution",
    type: "Sample Thermal Node",
  },
  {
    id: "world-sample-valve-04",
    name: "Valve Box 04",
    status: "caution",
    type: "Sample Valve Box",
  },
  {
    id: "world-sample-abnormal-05",
    name: "Abnormal Sample 05",
    status: "danger",
    type: "Sample Abnormal Equipment",
  },
];
const WORLD_SAMPLE_ASSETS = WORLD_SAMPLE_MODEL_FILES.map((modelFile, index) => ({
  ...DEMO_ASSETS[index],
  ...WORLD_SAMPLE_ASSET_OVERRIDES[index],
  modelFile,
}));
const REGISTERED_ASSET_SAMPLES = buildRegisteredAssetSamples(WORLD_SAMPLE_ASSETS, [
  {
    id: "registered-sample-motor-01",
    name: "Motor Unit A",
    status: "normal",
    type: "회전 설비",
  },
  {
    id: "registered-sample-pump-02",
    name: "Transfer Pump B",
    status: "caution",
    type: "이송 펌프",
  },
  {
    id: "registered-sample-panel-03",
    name: "Power Panel C",
    status: "warning",
    type: "전기 패널",
  },
  {
    id: "registered-sample-fan-04",
    name: "Exhaust Fan D",
    status: "danger",
    type: "송풍 설비",
  },
]);
const statusLabel = {
  caution: "요주의",
  danger: "이상",
  error: "이상",
  warning: "요주의",
};
const statusColor = {
  caution: "#facc15",
  danger: "#ef4444",
  error: "#dc2626",
  normal: "#67e8f9",
  warning: "#fde047",
};
function createWorldSampleModelFile({
  id,
  label,
  normalizeSize = 3.8,
  plyUrl,
  textureUrl,
}) {
  return {
    id,
    label,
    normalizeSize,
    plyUrl,
    textures: [
      {
        enabled: true,
        id: `${id}-base-color`,
        label: `${label} Texture`,
        role: "baseColor",
        source: textureUrl,
        strength: 1,
      },
    ],
  };
}
function buildRegisteredAssetSamples(sampleAssets, fallbackAssets) {
  return sampleAssets.length
    ? sampleAssets.map((asset) => ({
        ...cloneWorldAsset(asset),
        id: `registered-${asset.id}`,
      }))
    : fallbackAssets;
}
const EYE_HEIGHT = 3.4;
const DEFAULT_ASSET_ROTATION = {
  pitch: -64,
  roll: -135,
  yaw: 38,
};
const DEFAULT_CAMERA_VIEW_PRESET_ID = "person";
const CAMERA_VIEW_PRESETS = [
  {
    id: "person",
    label: "1인칭",
    pitch: -0.05,
    position: { x: 0, y: EYE_HEIGHT, z: 22 },
    yaw: 0,
  },
  {
    id: "overview",
    label: "윗 사선",
    pitch: -0.78,
    position: { x: 0, y: 24, z: 30 },
    yaw: 0,
  },
  {
    id: "top",
    label: "탑뷰",
    pitch: -1.42,
    position: { x: 0, y: 42, z: 4 },
    yaw: 0,
  },
  {
    id: "side",
    label: "측면 조망",
    pitch: -0.54,
    position: { x: -36, y: 17, z: 4 },
    yaw: 1.66,
  },
];
const DEFAULT_CAMERA_VIEW_PRESET =
  CAMERA_VIEW_PRESETS.find((preset) => preset.id === DEFAULT_CAMERA_VIEW_PRESET_ID) ??
  CAMERA_VIEW_PRESETS[0];
const DEFAULT_WORLD_SETTINGS = {
  accentColor: "#38bdf8",
  backgroundColor: "#020617",
  floorColor: "#ffffff",
  fogDistance: 94,
  gridOpacity: 0.24,
  lightLevel: 1,
};
export function LocationWorldViewerPage({ assets, location, site }) {
  const storageKey = `checklab:location-world:${site.id}:${location.id}`;
  const assetStorageKey = `${storageKey}:assets:v2`;
  const placementStorageKey = `${storageKey}:placements:v2`;
  const settingsStorageKey = `${storageKey}:settings`;
  const initialAssets = useMemo(() => buildDisplayAssets(assets), [assets]);
  const [worldAssets, setWorldAssets] = useState(initialAssets);
  const [placements, setPlacements] = useState(() =>
    buildDefaultPlacements(initialAssets),
  );
  const [worldSettings, setWorldSettings] = useState(DEFAULT_WORLD_SETTINGS);
  const [selectedAssetId, setSelectedAssetId] = useState(
    worldAssets[0]?.id ?? "",
  );
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [pendingAddAssetId, setPendingAddAssetId] = useState(
    REGISTERED_ASSET_SAMPLES[0]?.id ?? "",
  );
  const [activeCameraPresetId, setActiveCameraPresetId] = useState(
    DEFAULT_CAMERA_VIEW_PRESET_ID,
  );
  const [isSaved, setIsSaved] = useState(true);
  const [isAssetRegistrationOpen, setIsAssetRegistrationOpen] = useState(false);
  const [isWorldSettingsOpen, setIsWorldSettingsOpen] = useState(false);
  useEffect(() => {
    const storedAssets = readStoredWorldAssets(assetStorageKey, initialAssets);
    setWorldAssets(storedAssets);
    setPlacements(readStoredPlacements(placementStorageKey, storedAssets));
    setWorldSettings(readStoredWorldSettings(settingsStorageKey));
    setSelectedAssetId((currentId) =>
      currentId && storedAssets.some((asset) => asset.id === currentId)
        ? currentId
        : (storedAssets[0]?.id ?? ""),
    );
    setIsSaved(true);
  }, [assetStorageKey, initialAssets, placementStorageKey, settingsStorageKey]);
  useEffect(() => {
    setPlacements((currentPlacements) =>
      mergePlacements(worldAssets, currentPlacements),
    );
    setSelectedAssetId((currentId) =>
      currentId && worldAssets.some((asset) => asset.id === currentId)
        ? currentId
        : (worldAssets[0]?.id ?? ""),
    );
  }, [worldAssets]);
  const selectedAsset = worldAssets.find(
    (asset) => asset.id === selectedAssetId,
  );
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
    window.localStorage.setItem(placementStorageKey, JSON.stringify(placements));
    window.localStorage.setItem(assetStorageKey, JSON.stringify(worldAssets));
    window.localStorage.setItem(
      settingsStorageKey,
      JSON.stringify(worldSettings),
    );
    setIsSaved(true);
  };
  const handleResetPlacements = () => {
    const nextAssets = buildDisplayAssets(assets);
    const nextPlacements = buildDefaultPlacements(nextAssets);
    setWorldAssets(nextAssets);
    setPlacements(nextPlacements);
    window.localStorage.setItem(placementStorageKey, JSON.stringify(nextPlacements));
    window.localStorage.setItem(assetStorageKey, JSON.stringify(nextAssets));
    setIsSaved(true);
    setIsAddingAsset(false);
    setIsAssetRegistrationOpen(false);
    setPendingAddAssetId(REGISTERED_ASSET_SAMPLES[0]?.id ?? "");
  };
  const handleProximityFocus = (assetId) => {
    setSelectedAssetId((currentAssetId) =>
      currentAssetId === assetId ? currentAssetId : assetId,
    );
  };
  const handleAddAssetAt = (position) => {
    const sourceAsset =
      REGISTERED_ASSET_SAMPLES.find((asset) => asset.id === pendingAddAssetId) ??
      REGISTERED_ASSET_SAMPLES[0];
    if (!sourceAsset) {
      return;
    }
    const nextAsset = {
      ...sourceAsset,
      id: `world-added-${sourceAsset.id}-${Date.now()}`,
      sourceAssetId: sourceAsset.id,
    };
    setWorldAssets((currentAssets) => [...currentAssets, nextAsset]);
    setPlacements((currentPlacements) => ({
      ...currentPlacements,
      [nextAsset.id]: {
        rotationX: DEFAULT_ASSET_ROTATION.pitch,
        rotationY: DEFAULT_ASSET_ROTATION.yaw,
        rotationZ: DEFAULT_ASSET_ROTATION.roll,
        x: clampNumber(
          position.x,
          -WORLD_SIZE.width / 2 + 3,
          WORLD_SIZE.width / 2 - 3,
        ),
        z: clampNumber(
          position.z,
          -WORLD_SIZE.depth / 2 + 3,
          WORLD_SIZE.depth / 2 - 3,
        ),
      },
    }));
    setSelectedAssetId(nextAsset.id);
    setIsAddingAsset(false);
    setIsAssetRegistrationOpen(false);
    setPendingAddAssetId(REGISTERED_ASSET_SAMPLES[0]?.id ?? "");
    setIsSaved(false);
  };
  const handleAddStart = () => {
    setPendingAddAssetId((currentId) =>
      REGISTERED_ASSET_SAMPLES.some((asset) => asset.id === currentId)
        ? currentId
        : (REGISTERED_ASSET_SAMPLES[0]?.id ?? ""),
    );
    setIsWorldSettingsOpen(false);
    setIsAssetRegistrationOpen(true);
    setIsAddingAsset(true);
  };
  const handleAddCancel = () => {
    setIsAddingAsset(false);
    setPendingAddAssetId(REGISTERED_ASSET_SAMPLES[0]?.id ?? "");
  };
  const handleAssetRegistrationToggle = () => {
    const nextIsOpen = !isAssetRegistrationOpen;
    setIsAssetRegistrationOpen(nextIsOpen);
    if (nextIsOpen) {
      setIsWorldSettingsOpen(false);
      return;
    }
    setIsAddingAsset(false);
    setPendingAddAssetId(REGISTERED_ASSET_SAMPLES[0]?.id ?? "");
  };
  const handleWorldSettingsChange = (patch) => {
    setWorldSettings((currentSettings) => ({
      ...currentSettings,
      ...patch,
    }));
    setIsSaved(false);
  };
  const handleCameraPresetSelect = (presetId) => {
    setActiveCameraPresetId(presetId);
    window.dispatchEvent(
      new CustomEvent("location-world-camera-preset", {
        detail: { presetId },
      }),
    );
  };
  const handleRemoveAsset = (assetId) => {
    setWorldAssets((currentAssets) =>
      currentAssets.filter((asset) => asset.id !== assetId),
    );
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
  return (
    <main className="LocationWorldViewerPage LocationWorldViewerPage__root-1 h-dvh min-h-0 min-w-0 overflow-hidden bg-neutral-950 text-white">
      <LocationWorldScene
        assets={worldAssets}
        isAddingAsset={isAddingAsset}
        location={location}
        placements={placements}
        selectedAssetId={selectedAssetId}
        worldSettings={worldSettings}
        onAddAssetAt={handleAddAssetAt}
        onPlacementSelect={setSelectedAssetId}
        onProximityFocus={handleProximityFocus}
      />
      <header className="LocationWorldViewerPage LocationWorldViewerPage__header-1 pointer-events-none absolute left-3 right-3 top-3 z-30 flex min-w-0 items-start justify-between gap-3">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__title-block-1 pointer-events-auto min-w-0 rounded-md border border-white/15 bg-black/55 px-3 py-2 shadow-2xl backdrop-blur-md">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__eyebrow-1 truncate text-[11px] font-semibold text-cyan-100/75">
            {site.name} / {location.floor || location.id}
          </p>
          <h1 className="LocationWorldViewerPage LocationWorldViewerPage__title-1 truncate text-base font-semibold">
            {location.name}
          </h1>
        </div>
        <div className="LocationWorldViewerPage LocationWorldViewerPage__actions-1 pointer-events-auto flex shrink-0 items-center gap-2">
          {!isSaved ? (
            <button
              type="button"
              className="LocationWorldViewerPage LocationWorldViewerPage__save-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-cyan-300/35 bg-cyan-300 px-3 text-xs font-semibold text-slate-950 shadow-xl transition hover:bg-cyan-200"
              onClick={handleSavePlacements}
            >
              <Save
                className="LocationWorldViewerPage LocationWorldViewerPage__icon-1 h-3.5 w-3.5"
                aria-hidden="true"
              />
              현재 배치 저장하기
            </button>
          ) : null}
          <button
            type="button"
            className="LocationWorldViewerPage LocationWorldViewerPage__reset-1 grid h-9 w-9 place-items-center rounded-md border border-white/15 bg-black/45 text-white/80 shadow-xl transition hover:bg-white/15 hover:text-white"
            onClick={handleResetPlacements}
            title="배치 초기화"
            aria-label="배치 초기화"
          >
            <RotateCcw
              className="LocationWorldViewerPage LocationWorldViewerPage__icon-2 h-4 w-4"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className={cn(
              "LocationWorldViewerPage LocationWorldViewerPage__asset-register-1 grid h-9 w-9 place-items-center rounded-md border shadow-xl transition",
              isAssetRegistrationOpen
                ? "border-cyan-300/55 bg-cyan-300 text-slate-950"
                : "border-white/15 bg-black/45 text-white/80 hover:bg-white/15 hover:text-white",
            )}
            onClick={handleAssetRegistrationToggle}
            title="설비 등록"
            aria-label="설비 등록"
            aria-pressed={isAssetRegistrationOpen}
          >
            <Plus
              className="LocationWorldViewerPage LocationWorldViewerPage__icon-3 h-4 w-4"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className={cn(
              "LocationWorldViewerPage LocationWorldViewerPage__settings-1 grid h-9 w-9 place-items-center rounded-md border shadow-xl transition",
              isWorldSettingsOpen
                ? "border-cyan-300/45 bg-cyan-300/20 text-cyan-50"
                : "border-white/15 bg-black/45 text-white/80 hover:bg-white/15 hover:text-white",
            )}
            onClick={() => {
              setIsWorldSettingsOpen((isOpen) => !isOpen);
              setIsAssetRegistrationOpen(false);
              setIsAddingAsset(false);
            }}
            title="월드 환경 설정"
            aria-label="월드 환경 설정"
            aria-pressed={isWorldSettingsOpen}
          >
            <SlidersHorizontal
              className="LocationWorldViewerPage LocationWorldViewerPage__icon-4 h-4 w-4"
              aria-hidden="true"
            />
          </button>
          <Link
            href={`/site/${encodeURIComponent(site.id)}/location/${encodeURIComponent(location.id)}`}
            className="LocationWorldViewerPage LocationWorldViewerPage__back-1 inline-flex h-9 items-center rounded-md border border-white/15 bg-black/45 px-3 text-xs font-semibold text-white/80 shadow-xl transition hover:bg-white/15 hover:text-white"
          >
            위치 요약
          </Link>
        </div>
      </header>
      {isAssetRegistrationOpen ? (
        <WorldAssetRegistrationPanel
          isAddingAsset={isAddingAsset}
          pendingAddAssetId={pendingAddAssetId}
          registeredAssetSamples={REGISTERED_ASSET_SAMPLES}
          onAddCancel={handleAddCancel}
          onAddStart={handleAddStart}
          onClose={() => {
            setIsAssetRegistrationOpen(false);
            setIsAddingAsset(false);
            setPendingAddAssetId(REGISTERED_ASSET_SAMPLES[0]?.id ?? "");
          }}
          onPendingAddAssetChange={setPendingAddAssetId}
        />
      ) : null}
      {isWorldSettingsOpen ? (
        <WorldSettingsPanel
          activeCameraPresetId={activeCameraPresetId}
          settings={worldSettings}
          onCameraPresetSelect={handleCameraPresetSelect}
          onChange={handleWorldSettingsChange}
          onClose={() => setIsWorldSettingsOpen(false)}
        />
      ) : null}
      {!isWorldSettingsOpen && !isAssetRegistrationOpen ? (
        <WorldPlacementPanel
          assets={worldAssets}
          placements={placements}
          selectedAsset={selectedAsset}
          selectedPlacement={selectedPlacement}
          onPlacementChange={handlePlacementChange}
          onRemove={handleRemoveAsset}
          onSelect={setSelectedAssetId}
        />
      ) : null}
      <WorldMovementPad />
    </main>
  );
}
function LocationWorldScene({
  assets,
  isAddingAsset,
  location,
  onAddAssetAt,
  onPlacementSelect,
  onProximityFocus,
  placements,
  selectedAssetId,
  worldSettings,
}) {
  const containerRef = useRef(null);
  const assetGroupsRef = useRef(new Map());
  const modelCacheRef = useRef(new Map());
  const keysRef = useRef(new Set());
  const sceneRef = useRef(null);
  const cameraStateRef = useRef({
    pitch: DEFAULT_CAMERA_VIEW_PRESET.pitch,
    position: new THREE.Vector3(
      DEFAULT_CAMERA_VIEW_PRESET.position.x,
      DEFAULT_CAMERA_VIEW_PRESET.position.y,
      DEFAULT_CAMERA_VIEW_PRESET.position.z,
    ),
    yaw: DEFAULT_CAMERA_VIEW_PRESET.yaw,
  });
  const proximityFocusRef = useRef({ assetId: "", lastChangedAt: 0 });
  const projectedKeyRef = useRef("");
  const placementsRef = useRef(placements);
  const assetsRef = useRef(assets);
  const worldSettingsRef = useRef(worldSettings);
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
    worldSettingsRef.current = worldSettings;
    applyWorldSettings(sceneRef.current, worldSettings);
  }, [worldSettings]);
  useEffect(() => {
    assetsRef.current = assets;
    syncAssetModels({
      assets,
      groups: assetGroupsRef.current,
      modelCache: modelCacheRef.current,
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
    scene.background = new THREE.Color(
      worldSettingsRef.current.backgroundColor,
    );
    scene.fog = new THREE.Fog(
      worldSettingsRef.current.backgroundColor,
      28,
      worldSettingsRef.current.fogDistance,
    );
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
    renderer.domElement.className =
      "LocationWorldViewerPage LocationWorldViewerPage__canvas-1 h-full w-full";
    container.appendChild(renderer.domElement);
    sceneRef.current = scene;
    const modelLoader = new ModelLoader();
    createWorldEnvironment(scene, worldSettingsRef.current);
    scene.add(placementPreview);
    applyCameraState(camera, cameraStateRef.current);
    resizeRenderer(container, renderer, camera);
    const resizeObserver = new ResizeObserver(() =>
      resizeRenderer(container, renderer, camera),
    );
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
    const handleCameraPresetEvent = (event) => {
      const preset = CAMERA_VIEW_PRESETS.find(
        (viewPreset) => viewPreset.id === event.detail?.presetId,
      );
      if (!preset) {
        return;
      }
      keysRef.current.clear();
      cameraStateRef.current.position.set(
        preset.position.x,
        preset.position.y,
        preset.position.z,
      );
      cameraStateRef.current.pitch = preset.pitch;
      cameraStateRef.current.yaw = preset.yaw;
      applyCameraState(camera, cameraStateRef.current);
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
      const hits = raycaster.intersectObjects(
        [...assetGroupsRef.current.values()],
        true,
      );
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
        clampNumber(
          floorHit.x,
          -WORLD_SIZE.width / 2 + 3,
          WORLD_SIZE.width / 2 - 3,
        ),
        WORLD_ASSET_BASE_Y,
        clampNumber(
          floorHit.z,
          -WORLD_SIZE.depth / 2 + 3,
          WORLD_SIZE.depth / 2 - 3,
        ),
      );
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("location-world-camera-preset", handleCameraPresetEvent);
    window.addEventListener("location-world-move", handleMoveEvent);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    let assetModelLoadFailed = false;
    const worldGroundPromise = loadWorldGroundModel(
      modelLoader,
      scene,
      worldSettingsRef.current,
    )
      .then((groundModel) => {
        if (isDisposed) {
          disposeObject3D(groundModel);
          return;
        }
        attachWorldGroundModel(scene, groundModel, worldSettingsRef.current);
      })
      .catch(() => {
        if (!isDisposed) {
          showFallbackWorldFloor(scene);
        }
      });
    const assetModelPromise = Promise.all(
      getWorldAssetModelFiles(assetsRef.current).map(async (modelFile) => [
        getModelFileKey(modelFile),
        await modelLoader.loadModel(modelFile),
      ]),
    )
      .then((modelEntries) => {
        if (isDisposed) {
          modelEntries.forEach(([, model]) => disposeObject3D(model));
          return;
        }
        modelCacheRef.current = new Map(modelEntries);
        syncAssetModels({
          assets: assetsRef.current,
          groups: assetGroupsRef.current,
          modelCache: modelCacheRef.current,
          placements: placementsRef.current,
          scene,
          selectedAssetId: selectedAssetIdRef.current,
        });
      })
      .catch(() => {
        assetModelLoadFailed = true;
        setLoadMessage("샘플 3D 모델을 불러오지 못했습니다.");
      });
    Promise.all([worldGroundPromise, assetModelPromise]).then(() => {
      if (!isDisposed && !assetModelLoadFailed) {
        setLoadMessage(undefined);
      }
    });
    const animate = (timestamp) => {
      const deltaSeconds = Math.min(
        (timestamp - previousTimestamp) / 1000,
        0.06,
      );
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
      window.removeEventListener("location-world-camera-preset", handleCameraPresetEvent);
      window.removeEventListener("location-world-move", handleMoveEvent);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      keysRef.current.clear();
      assetGroupsRef.current.clear();
      modelCacheRef.current.forEach((model) => disposeObject3D(model));
      modelCacheRef.current.clear();
      sceneRef.current = null;
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, []);
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__scene-1 absolute inset-0">
      <div
        ref={containerRef}
        className="LocationWorldViewerPage LocationWorldViewerPage__canvas-host-1 h-full min-h-0 w-full"
      />
      <div className="LocationWorldViewerPage LocationWorldViewerPage__vignette-1 pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(2,6,23,0.2)_58%,rgba(2,6,23,0.72)_100%)]" />
      {projectedCards.map((card) => (
        <AssetWorldStatusCard key={card.id} card={card} />
      ))}
      {loadMessage ? (
        <div className="LocationWorldViewerPage LocationWorldViewerPage__loader-1 absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-black/65 px-4 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur">
          {loadMessage}
        </div>
      ) : null}
      <div className="LocationWorldViewerPage LocationWorldViewerPage__location-chip-1 pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/15 bg-black/45 px-3 py-2 text-[11px] font-semibold text-white/75 backdrop-blur">
        {location.name}
      </div>
    </div>
  );
}
function WorldPlacementPanel({
  assets,
  onPlacementChange,
  onRemove,
  onSelect,
  placements,
  selectedAsset,
  selectedPlacement,
}) {
  if (!selectedAsset || !selectedPlacement) {
    return (
      <aside className="LocationWorldViewerPage LocationWorldViewerPage__panel-1 absolute right-4 top-24 z-30 flex max-h-[calc(100dvh-7rem)] w-[min(22rem,calc(100dvw-2rem))] min-w-0 flex-col gap-3 rounded-md border border-white/15 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-md">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-header-1 min-w-0">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__panel-eyebrow-1 text-[11px] font-semibold text-cyan-100/70">
            월드 배치
          </p>
          <h2 className="LocationWorldViewerPage LocationWorldViewerPage__panel-title-1 text-sm font-semibold">
            등록된 오브젝트 없음
          </h2>
        </div>
      </aside>
    );
  }
  const telemetry = getAssetTelemetry(
    selectedAsset,
    assets.findIndex((asset) => asset.id === selectedAsset.id),
  );
  const selectedStatusLabel = getWorldStatusLabel(selectedAsset.status);
  return (
    <aside className="LocationWorldViewerPage LocationWorldViewerPage__panel-1 absolute right-4 top-24 z-30 flex max-h-[calc(100dvh-7rem)] w-[min(22rem,calc(100dvw-2rem))] min-w-0 flex-col gap-3 rounded-md border border-white/15 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-header-1 flex min-w-0 items-start justify-between gap-2">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-copy-1 min-w-0">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__panel-eyebrow-1 text-[11px] font-semibold text-cyan-100/70">
            가까운 설비 자동 포커싱
          </p>
          <h2 className="LocationWorldViewerPage LocationWorldViewerPage__panel-title-1 truncate text-sm font-semibold">
            {selectedAsset.name}
          </h2>
        </div>
        {selectedStatusLabel ? (
          <span
            className={cn(
              "LocationWorldViewerPage LocationWorldViewerPage__panel-status-1 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold",
              getWorldStatusPillClassName(selectedAsset.status),
            )}
          >
            {selectedStatusLabel}
          </span>
        ) : null}
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__panel-actions-1 grid grid-cols-1 gap-2">
        <button
          type="button"
          className="LocationWorldViewerPage LocationWorldViewerPage__delete-1 inline-flex h-9 items-center justify-center gap-1 rounded-md border border-red-400/35 bg-red-500/15 px-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/25"
          onClick={() => onRemove(selectedAsset.id)}
        >
          <Trash2
            className="LocationWorldViewerPage LocationWorldViewerPage__delete-icon-1 h-3.5 w-3.5"
            aria-hidden="true"
          />
          제거
        </button>
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__field-1 grid gap-1 text-[11px] font-semibold text-white/65">
        <span>설비 선택</span>
        <AssetSelector
          assets={assets}
          selectedAssetId={selectedAsset.id}
          onSelect={onSelect}
        />
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__status-box-1 grid grid-cols-3 gap-2 rounded-md border border-white/10 bg-white/[0.06] p-2">
        <MiniMetric icon={Thermometer} label="온도" value={`${telemetry.temperature}°C`} />
        <MiniMetric icon={Gauge} label="초음파" value={`${telemetry.ultrasound} dB`} />
        <MiniMetric icon={Camera} label="카메라" value={telemetry.camera} />
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__position-grid-1 grid grid-cols-2 gap-2">
        <WorldNumberField
          label="X"
          max={WORLD_SIZE.width / 2 - 3}
          min={-WORLD_SIZE.width / 2 + 3}
          onChange={(x) => onPlacementChange(selectedAsset.id, { x })}
          value={selectedPlacement.x}
        />
        <WorldNumberField
          label="Z"
          max={WORLD_SIZE.depth / 2 - 3}
          min={-WORLD_SIZE.depth / 2 + 3}
          onChange={(z) => onPlacementChange(selectedAsset.id, { z })}
          value={selectedPlacement.z}
        />
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__rotation-grid-1 grid grid-cols-3 gap-2">
        <WorldNumberField
          label="Pitch"
          max={180}
          min={-180}
          onChange={(rotationX) =>
            onPlacementChange(selectedAsset.id, { rotationX })
          }
          suffix="°"
          value={selectedPlacement.rotationX ?? DEFAULT_ASSET_ROTATION.pitch}
        />
        <WorldNumberField
          label="Yaw"
          max={180}
          min={-180}
          onChange={(rotationY) =>
            onPlacementChange(selectedAsset.id, { rotationY })
          }
          suffix="°"
          value={selectedPlacement.rotationY ?? DEFAULT_ASSET_ROTATION.yaw}
        />
        <WorldNumberField
          label="Roll"
          max={180}
          min={-180}
          onChange={(rotationZ) =>
            onPlacementChange(selectedAsset.id, { rotationZ })
          }
          suffix="°"
          value={selectedPlacement.rotationZ ?? DEFAULT_ASSET_ROTATION.roll}
        />
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__summary-1 rounded-md border border-white/10 bg-white/[0.05] p-2 text-[11px] text-white/70">
        <p className="LocationWorldViewerPage LocationWorldViewerPage__summary-title-1 mb-1 font-semibold text-white">
          현재 요약
        </p>
        <p className="LocationWorldViewerPage LocationWorldViewerPage__summary-line-1">
          위치 X {round(selectedPlacement.x)} / Z {round(selectedPlacement.z)} /
          Pitch {round(selectedPlacement.rotationX ?? DEFAULT_ASSET_ROTATION.pitch)}°
          / Yaw {round(selectedPlacement.rotationY ?? DEFAULT_ASSET_ROTATION.yaw)}°
          / Roll {round(selectedPlacement.rotationZ ?? DEFAULT_ASSET_ROTATION.roll)}°
        </p>
        <p className="LocationWorldViewerPage LocationWorldViewerPage__summary-line-2">
          {selectedAsset.type} / {telemetry.camera} / {telemetry.temperature}°C
          / {telemetry.ultrasound} dB
        </p>
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__asset-list-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {assets.map((asset, index) => {
          const placement = placements[asset.id];
          return (
            <button
              key={asset.id}
              type="button"
              className={cn(
                "LocationWorldViewerPage LocationWorldViewerPage__asset-row-1 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-white/10 bg-white/[0.05] px-2 py-2 text-left transition hover:bg-white/[0.09]",
                asset.id === selectedAsset.id &&
                  "border-cyan-300/45 bg-cyan-300/15",
              )}
              onClick={() => onSelect(asset.id)}
            >
              <span className="LocationWorldViewerPage LocationWorldViewerPage__asset-name-1 min-w-0 truncate text-xs font-semibold text-white">
                {index + 1}. {asset.name}
              </span>
              <span className="LocationWorldViewerPage LocationWorldViewerPage__asset-position-1 shrink-0 font-mono text-[10px] text-white/55">
                {placement
                  ? `${round(placement.x)}, ${round(placement.z)}`
                  : "-"}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
function AssetSelector({ assets, selectedAssetId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);

  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__asset-selector-1 relative">
      <button
        type="button"
        className="LocationWorldViewerPage LocationWorldViewerPage__selector-trigger-1 w-full h-9 min-w-0 rounded-md border border-white/15 bg-white/10 px-2 text-xs font-semibold text-white outline-none text-left flex items-center justify-between hover:bg-white/[0.15] transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedAsset?.name || "선택하세요"}</span>
        <span className="shrink-0 text-white/60">▼</span>
      </button>
      {isOpen ? (
        <div className="LocationWorldViewerPage LocationWorldViewerPage__selector-menu-1 absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-white/15 bg-black/85 shadow-2xl backdrop-blur-md overflow-y-auto max-h-56">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={cn(
                "LocationWorldViewerPage LocationWorldViewerPage__selector-option-1 w-full px-2 py-2 text-xs font-semibold text-left transition hover:bg-white/[0.1]",
                asset.id === selectedAssetId && "bg-cyan-300/20 text-cyan-50",
              )}
              onClick={() => {
                onSelect(asset.id);
                setIsOpen(false);
              }}
            >
              {asset.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
function WorldMovementPad() {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__movement-1 absolute bottom-4 left-1/2 z-30 grid -translate-x-1/2 grid-cols-3 gap-1.5 rounded-md border border-white/15 bg-black/55 p-2 shadow-2xl backdrop-blur-md">
      <span />
      <MoveButton action="forward" icon={ArrowUp} label="앞" />
      <span />
      <MoveButton action="left" icon={ArrowLeft} label="왼쪽" />
      <MoveButton action="back" icon={ArrowDown} label="뒤" />
      <MoveButton action="right" icon={ArrowRight} label="오른쪽" />
      <MoveButton action="turnLeft" label="좌회전" />
      <div className="LocationWorldViewerPage LocationWorldViewerPage__eye-1 grid h-9 min-w-14 place-items-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-[10px] font-semibold text-cyan-100">
        <Move3D
          className="LocationWorldViewerPage LocationWorldViewerPage__eye-icon-1 h-3.5 w-3.5"
          aria-hidden="true"
        />
      </div>
      <MoveButton action="turnRight" label="우회전" />
    </div>
  );
}
function MoveButton({ action, icon: Icon, label }) {
  const handlePress = () => {
    window.dispatchEvent(
      new CustomEvent("location-world-move", {
        detail: { action, active: true },
      }),
    );
  };
  const handleRelease = () => {
    window.dispatchEvent(
      new CustomEvent("location-world-move", {
        detail: { action, active: false },
      }),
    );
  };
  return (
    <button
      type="button"
      className="LocationWorldViewerPage LocationWorldViewerPage__move-button-1 inline-flex h-9 min-w-14 items-center justify-center gap-1 rounded-md border border-white/15 bg-white/[0.08] px-2 text-[11px] font-semibold text-white/80 transition hover:bg-white/[0.15] hover:text-white"
      onPointerDown={handlePress}
      onPointerLeave={handleRelease}
      onPointerUp={handleRelease}
    >
      {Icon ? (
        <Icon
          className="LocationWorldViewerPage LocationWorldViewerPage__move-icon-1 h-3.5 w-3.5"
          aria-hidden="true"
        />
      ) : null}
      {label}
    </button>
  );
}
function RegisteredAssetAddPicker({ assets, onSelect, selectedAssetId }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-1 grid gap-2 rounded-md border border-white/10 bg-white/[0.05] p-2">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-head-1 min-w-0">
        <p className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-eyebrow-1 text-[10px] font-semibold text-cyan-100/70">
          등록 설비 목록
        </p>
        <p className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-title-1 truncate text-xs font-semibold text-white">
          배치할 설비를 선택하세요
        </p>
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-list-1 grid gap-1">
        {assets.map((asset) => {
          const statusName = getWorldStatusLabel(asset.status);
          return (
            <button
              key={asset.id}
              type="button"
              className={cn(
                "LocationWorldViewerPage LocationWorldViewerPage__registered-picker-item-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2 py-2 text-left transition",
                asset.id === selectedAssetId
                  ? "border-cyan-300/55 bg-cyan-300/18 text-white"
                  : "border-white/10 bg-black/20 text-white/78 hover:bg-white/[0.09] hover:text-white",
              )}
              onClick={() => onSelect(asset.id)}
            >
              <span className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-copy-1 min-w-0">
                <span className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-name-1 block truncate text-xs font-semibold">
                  {asset.name}
                </span>
                <span className="LocationWorldViewerPage LocationWorldViewerPage__registered-picker-type-1 block truncate text-[10px] font-semibold text-white/50">
                  {asset.type}
                </span>
              </span>
              {statusName ? (
                <span
                  className={cn(
                    "LocationWorldViewerPage LocationWorldViewerPage__registered-picker-status-1 shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] font-bold",
                    getWorldStatusPillClassName(asset.status),
                  )}
                >
                  {statusName}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function AssetWorldStatusCard({ card }) {
  const telemetry = getAssetTelemetry(card.asset, card.index);
  const statusName = getWorldStatusLabel(card.asset.status);
  return (
    <div
      className={cn(
        "LocationWorldViewerPage LocationWorldViewerPage__status-card-1 pointer-events-none absolute z-20 w-[11.5rem] -translate-x-1/2 -translate-y-full rounded-md border p-2 text-white shadow-2xl backdrop-blur-md transition",
        getWorldStatusCardClassName(card.asset.status, card.selected),
      )}
      style={{
        left: `${card.left}%`,
        top: `${card.top}%`,
        opacity: card.opacity,
      }}
    >
      <div className="LocationWorldViewerPage LocationWorldViewerPage__status-title-row-1 mb-1 flex min-w-0 items-center justify-between gap-2">
        <p className="LocationWorldViewerPage LocationWorldViewerPage__status-title-1 min-w-0 truncate text-xs font-semibold">
          {card.asset.name}
        </p>
        {statusName ? (
          <span
            className={cn(
              "LocationWorldViewerPage LocationWorldViewerPage__status-pill-1 shrink-0 rounded-sm border px-1 py-0.5 text-[9px] font-bold",
              getWorldStatusPillClassName(card.asset.status),
            )}
          >
            {statusName}
          </span>
        ) : null}
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__status-grid-1 grid grid-cols-3 gap-1">
        <StatusCell label="온도" value={`${telemetry.temperature}°`} />
        <StatusCell label="초음파" value={`${telemetry.ultrasound}`} />
        <StatusCell label="CAM" value={telemetry.camera} />
      </div>
    </div>
  );
}
function MiniMetric({ icon: Icon, label, value }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__mini-1 min-w-0 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__mini-label-1 mb-1 flex min-w-0 items-center gap-1 text-[10px] font-semibold text-white/55">
        <Icon
          className="LocationWorldViewerPage LocationWorldViewerPage__mini-icon-1 h-3 w-3 shrink-0"
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
      </div>
      <p className="LocationWorldViewerPage LocationWorldViewerPage__mini-value-1 truncate font-mono text-xs font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
function StatusCell({ label, value }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__status-cell-1 min-w-0 rounded-sm border border-white/10 bg-white/[0.07] px-1.5 py-1">
      <p className="LocationWorldViewerPage LocationWorldViewerPage__status-label-1 truncate text-[9px] font-semibold text-cyan-100/65">
        {label}
      </p>
      <p className="LocationWorldViewerPage LocationWorldViewerPage__status-value-1 truncate font-mono text-[11px] font-semibold">
        {value}
      </p>
    </div>
  );
}
function getWorldStatusSeverity(status) {
  if (status === "danger" || status === "error") {
    return 2;
  }
  if (status === "caution" || status === "warning") {
    return 1;
  }
  return 0;
}
function getWorldStatusLabel(status) {
  return statusLabel[status] ?? "";
}
function getWorldStatusPillClassName(status) {
  return getWorldStatusSeverity(status) >= 2
    ? "border-red-200/60 bg-red-500/25 text-red-50"
    : "border-yellow-200/70 bg-yellow-300/25 text-yellow-50";
}
function getWorldStatusCardClassName(status, selected) {
  const severity = getWorldStatusSeverity(status);
  if (severity >= 2) {
    return "border-red-300/80 bg-red-950/75 shadow-red-500/30";
  }
  if (severity === 1) {
    return "border-yellow-200/90 bg-yellow-950/70 shadow-yellow-300/30";
  }
  return selected
    ? "border-lime-200/70 bg-lime-950/55"
    : "border-cyan-200/30 bg-black/62";
}
function WorldNumberField({ label, max, min, onChange, suffix = "", value }) {
  return (
    <label className="LocationWorldViewerPage LocationWorldViewerPage__number-field-1 grid gap-1 text-[11px] font-semibold text-white/65">
      {label}
      <span className="LocationWorldViewerPage LocationWorldViewerPage__number-wrap-1 flex h-9 min-w-0 items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2">
        <input
          className="LocationWorldViewerPage LocationWorldViewerPage__number-input-1 min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold text-white outline-none"
          max={max}
          min={min}
          type="number"
          value={round(value)}
          onChange={(event) =>
            onChange(clampNumber(Number(event.target.value), min, max))
          }
        />
        {suffix ? (
          <span className="LocationWorldViewerPage LocationWorldViewerPage__number-suffix-1 shrink-0 text-[10px] text-white/55">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}
function WorldSettingsPanel({
  activeCameraPresetId,
  onCameraPresetSelect,
  onChange,
  onClose,
  settings,
}) {
  return (
    <aside className="LocationWorldViewerPage LocationWorldViewerPage__settings-panel-1 absolute right-4 top-24 z-30 grid max-h-[calc(100dvh-7rem)] w-[min(20rem,calc(100dvw-2rem))] gap-3 overflow-y-auto rounded-md border border-white/15 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__settings-header-1 flex min-w-0 items-center justify-between gap-2">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__settings-title-wrap-1 flex min-w-0 items-center gap-1.5">
          <SlidersHorizontal
            className="LocationWorldViewerPage LocationWorldViewerPage__settings-icon-1 h-3.5 w-3.5 shrink-0 text-cyan-100/75"
            aria-hidden="true"
          />
          <h2 className="LocationWorldViewerPage LocationWorldViewerPage__settings-title-1 truncate text-sm font-semibold">
            월드 환경
          </h2>
        </div>
        <button
          type="button"
          className="LocationWorldViewerPage LocationWorldViewerPage__settings-close-1 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.08] text-white/70 transition hover:bg-white/[0.15] hover:text-white"
          onClick={onClose}
          title="닫기"
          aria-label="닫기"
        >
          <X
            className="LocationWorldViewerPage LocationWorldViewerPage__settings-close-icon-1 h-3.5 w-3.5"
            aria-hidden="true"
          />
        </button>
      </div>
      <WorldCameraViewSection
        activePresetId={activeCameraPresetId}
        onPresetSelect={onCameraPresetSelect}
      />
      <WorldEnvironmentSection settings={settings} onChange={onChange} />
    </aside>
  );
}
function WorldCameraViewSection({ activePresetId, onPresetSelect }) {
  return (
    <section className="LocationWorldViewerPage LocationWorldViewerPage__camera-views-1 grid gap-2 border-t border-white/10 pt-3">
      <h3 className="LocationWorldViewerPage LocationWorldViewerPage__camera-views-title-1 truncate text-xs font-semibold text-white">
        카메라 시점
      </h3>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__camera-views-grid-1 grid grid-cols-2 gap-1.5">
        {CAMERA_VIEW_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={cn(
              "LocationWorldViewerPage LocationWorldViewerPage__camera-view-1 h-8 rounded-md border px-2 text-[11px] font-semibold transition",
              activePresetId === preset.id
                ? "border-cyan-300/55 bg-cyan-300 text-slate-950"
                : "border-white/15 bg-white/[0.08] text-white/80 hover:bg-white/[0.15] hover:text-white",
            )}
            onClick={() => onPresetSelect(preset.id)}
            aria-pressed={activePresetId === preset.id}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
function WorldAssetRegistrationPanel({
  isAddingAsset,
  onAddCancel,
  onAddStart,
  onClose,
  onPendingAddAssetChange,
  pendingAddAssetId,
  registeredAssetSamples,
}) {
  return (
    <aside className="LocationWorldViewerPage LocationWorldViewerPage__asset-registration-panel-1 absolute right-4 top-24 z-30 grid max-h-[calc(100dvh-7rem)] w-[min(20rem,calc(100dvw-2rem))] gap-3 overflow-y-auto rounded-md border border-white/15 bg-black/58 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__asset-registration-header-1 flex min-w-0 items-center justify-between gap-2">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__asset-registration-title-wrap-1 flex min-w-0 items-center gap-1.5">
          <Plus
            className="LocationWorldViewerPage LocationWorldViewerPage__asset-registration-icon-1 h-3.5 w-3.5 shrink-0 text-cyan-100/75"
            aria-hidden="true"
          />
          <h2 className="LocationWorldViewerPage LocationWorldViewerPage__asset-registration-title-1 truncate text-sm font-semibold">
            설비 등록
          </h2>
        </div>
        <button
          type="button"
          className="LocationWorldViewerPage LocationWorldViewerPage__asset-registration-close-1 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.08] text-white/70 transition hover:bg-white/[0.15] hover:text-white"
          onClick={onClose}
          title="닫기"
          aria-label="닫기"
        >
          <X
            className="LocationWorldViewerPage LocationWorldViewerPage__asset-registration-close-icon-1 h-3.5 w-3.5"
            aria-hidden="true"
          />
        </button>
      </div>
      <WorldAssetAddSection
        isAddingAsset={isAddingAsset}
        pendingAddAssetId={pendingAddAssetId}
        registeredAssetSamples={registeredAssetSamples}
        onAddCancel={onAddCancel}
        onAddStart={onAddStart}
        onPendingAddAssetChange={onPendingAddAssetChange}
      />
    </aside>
  );
}
function WorldAssetAddSection({
  isAddingAsset,
  onAddCancel,
  onAddStart,
  onPendingAddAssetChange,
  pendingAddAssetId,
  registeredAssetSamples,
}) {
  return (
    <section className="LocationWorldViewerPage LocationWorldViewerPage__asset-add-section-1 grid gap-2 border-t border-white/10 pt-3">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__asset-add-header-1 flex min-w-0 items-center justify-between gap-2">
        <h3 className="LocationWorldViewerPage LocationWorldViewerPage__asset-add-title-1 truncate text-xs font-semibold text-white">
          등록 설비
        </h3>
        <button
          type="button"
          className={cn(
            "LocationWorldViewerPage LocationWorldViewerPage__asset-add-toggle-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border transition",
            isAddingAsset
              ? "border-cyan-300/55 bg-cyan-300 text-slate-950"
              : "border-white/15 bg-white/[0.08] text-white/80 hover:bg-white/[0.15] hover:text-white",
          )}
          onClick={isAddingAsset ? onAddCancel : onAddStart}
          title={isAddingAsset ? "배치 모드 취소" : "배치 모드 시작"}
          aria-label={isAddingAsset ? "배치 모드 취소" : "배치 모드 시작"}
        >
          {isAddingAsset ? (
            <X className="LocationWorldViewerPage LocationWorldViewerPage__asset-add-icon-1 h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Plus className="LocationWorldViewerPage LocationWorldViewerPage__asset-add-icon-1 h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      <RegisteredAssetAddPicker
        assets={registeredAssetSamples}
        selectedAssetId={pendingAddAssetId}
        onSelect={onPendingAddAssetChange}
      />
      <p className="LocationWorldViewerPage LocationWorldViewerPage__asset-add-help-1 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1.5 text-[11px] font-semibold text-cyan-50/85">
        {isAddingAsset
          ? "목록에서 설비를 선택한 뒤 바닥 위치를 클릭하면 해당 설비가 배치됩니다."
          : "배치할 설비를 선택하고 + 버튼을 눌러 배치 모드를 시작하세요."}
      </p>
    </section>
  );
}
function WorldEnvironmentSection({ onChange, settings }) {
  return (
    <section className="LocationWorldViewerPage LocationWorldViewerPage__environment-1 grid gap-2">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__environment-colors-1 grid grid-cols-3 gap-2">
        <WorldColorField
          label="배경"
          value={settings.backgroundColor}
          onChange={(backgroundColor) => onChange({ backgroundColor })}
        />
        <WorldColorField
          label="바닥"
          value={settings.floorColor}
          onChange={(floorColor) => onChange({ floorColor })}
        />
        <WorldColorField
          label="강조"
          value={settings.accentColor}
          onChange={(accentColor) => onChange({ accentColor })}
        />
      </div>
      <WorldRangeField
        label="그리드"
        max={0.65}
        min={0.05}
        step={0.01}
        value={settings.gridOpacity}
        onChange={(gridOpacity) => onChange({ gridOpacity })}
      />
      <WorldRangeField
        label="조명"
        max={1.4}
        min={0.45}
        step={0.05}
        value={settings.lightLevel}
        onChange={(lightLevel) => onChange({ lightLevel })}
      />
      <WorldRangeField
        label="안개 거리"
        max={140}
        min={44}
        step={1}
        value={settings.fogDistance}
        onChange={(fogDistance) => onChange({ fogDistance })}
      />
    </section>
  );
}
function WorldColorField({ label, onChange, value }) {
  return (
    <label className="LocationWorldViewerPage LocationWorldViewerPage__color-field-1 grid gap-1 text-[10px] font-semibold text-white/60">
      {label}
      <input
        className="LocationWorldViewerPage LocationWorldViewerPage__color-input-1 h-8 w-full min-w-0 rounded-md border border-white/15 bg-white/10 p-1 outline-none"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function WorldRangeField({ label, max, min, onChange, step, value }) {
  return (
    <label className="LocationWorldViewerPage LocationWorldViewerPage__range-field-1 grid gap-1 text-[10px] font-semibold text-white/60">
      <span className="LocationWorldViewerPage LocationWorldViewerPage__range-label-1 flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-white/75">{round(value)}</span>
      </span>
      <input
        className="LocationWorldViewerPage LocationWorldViewerPage__range-input-1 h-2 accent-cyan-300"
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) =>
          onChange(clampNumber(Number(event.target.value), min, max))
        }
      />
    </label>
  );
}
function createWorldEnvironment(scene, settings) {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: settings.floorColor,
    metalness: 0.04,
    roughness: 0.88,
    transparent: true,
    opacity: 0.92,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE.width, WORLD_SIZE.depth),
    floorMaterial,
  );
  floor.name = "world-fallback-floor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = WORLD_GROUND_Y;
  floor.receiveShadow = true;
  floor.visible = false;
  scene.add(floor);
  const grid = new THREE.GridHelper(WORLD_SIZE.width, 36, "#38bdf8", "#334155");
  grid.name = "world-grid";
  grid.position.y = WORLD_ASSET_BASE_Y * 0.5;
  setGridMaterialOpacity(grid, settings.gridOpacity);
  scene.add(grid);
  const ambient = new THREE.AmbientLight("#ffffff", 1.15 * settings.lightLevel);
  scene.add(ambient);
  const hemisphere = new THREE.HemisphereLight(
    "#c7d2fe",
    "#0f172a",
    1.45 * settings.lightLevel,
  );
  scene.add(hemisphere);
  const keyLight = new THREE.DirectionalLight(
    "#ffffff",
    2.2 * settings.lightLevel,
  );
  keyLight.position.set(-16, 24, 18);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -48;
  keyLight.shadow.camera.right = 48;
  keyLight.shadow.camera.top = 36;
  keyLight.shadow.camera.bottom = -36;
  scene.add(keyLight);
  const lamps = [];
  const fixtures = [];
  [
    [-22, 8, -15],
    [0, 8, -15],
    [22, 8, -15],
    [-22, 8, 12],
    [0, 8, 12],
    [22, 8, 12],
  ].forEach(([x, y, z]) => {
    const lamp = new THREE.PointLight(
      settings.accentColor,
      1.6 * settings.lightLevel,
      26,
    );
    lamp.position.set(x, y, z);
    scene.add(lamp);
    lamps.push(lamp);
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.16, 0.36),
      new THREE.MeshStandardMaterial({
        color: "#cffafe",
        emissive: settings.accentColor,
        emissiveIntensity: 0.75,
      }),
    );
    fixture.position.set(x, y + 0.18, z);
    scene.add(fixture);
    fixtures.push(fixture);
  });
  scene.userData.worldEnvironment = {
    ambient,
    floor,
    grid,
    groundModel: null,
    hemisphere,
    keyLight,
    fixtures,
    lamps,
  };
}
async function loadWorldGroundModel(modelLoader) {
  return modelLoader.loadModel(WORLD_GROUND_MODEL_FILE);
}
function attachWorldGroundModel(scene, groundModel, settings) {
  prepareWorldGroundModel(groundModel, settings);
  scene.add(groundModel);
  const environment = scene.userData.worldEnvironment;
  if (!environment) {
    return;
  }
  environment.groundModel = groundModel;
  environment.floor.visible = false;
}
function prepareWorldGroundModel(groundModel, settings) {
  groundModel.name = "world-bg-sample-ground";
  groundModel.userData.isWorldGround = true;
  groundModel.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }
    object.castShadow = false;
    object.receiveShadow = true;
    object.renderOrder = -1;
    setMaterialColor(object.material, settings.floorColor);
    setMaterialSurface(object.material, {
      metalness: 0.02,
      roughness: 0.86,
    });
  });
  groundModel.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(groundModel);
  const center = bounds.getCenter(new THREE.Vector3());
  groundModel.position.x -= center.x;
  groundModel.position.z -= center.z;
  groundModel.position.y += WORLD_GROUND_Y - bounds.min.y;
  groundModel.updateMatrixWorld(true);
}
function showFallbackWorldFloor(scene) {
  const environment = scene.userData.worldEnvironment;
  if (environment?.floor) {
    environment.floor.visible = true;
  }
}
function setWorldGroundTint(groundModel, color) {
  groundModel.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      setMaterialColor(object.material, color);
    }
  });
}
function setMaterialColor(material, color) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((item) => {
    if (item?.color) {
      item.color.set(color);
    }
  });
}
function setMaterialSurface(material, surface) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((item) => {
    if (!item) {
      return;
    }
    if ("metalness" in item) {
      item.metalness = surface.metalness;
    }
    if ("roughness" in item) {
      item.roughness = surface.roughness;
    }
    item.needsUpdate = true;
  });
}
function createPlacementPreview() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.06, 8, 96),
    new THREE.MeshBasicMaterial({
      color: "#22d3ee",
      opacity: 0.92,
      transparent: true,
    }),
  );
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(2.35, 72),
    new THREE.MeshBasicMaterial({
      color: "#22d3ee",
      opacity: 0.16,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  const crossA = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.025, 0.08),
    new THREE.MeshBasicMaterial({
      color: "#a5f3fc",
      opacity: 0.72,
      transparent: true,
    }),
  );
  const crossB = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.025, 4.6),
    new THREE.MeshBasicMaterial({
      color: "#a5f3fc",
      opacity: 0.72,
      transparent: true,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  fill.rotation.x = -Math.PI / 2;
  group.add(fill, ring, crossA, crossB);
  group.visible = false;
  return group;
}
function getWorldAssetModelFiles(assets) {
  const modelFilesByKey = new Map();
  assets.forEach((asset) => {
    const modelFile = asset.modelFile ?? WORLD_SAMPLE_MODEL_FILES[0];
    modelFilesByKey.set(getModelFileKey(modelFile), modelFile);
  });
  return Array.from(modelFilesByKey.values());
}
function getCachedModelForAsset(asset, modelCache) {
  return modelCache.get(getModelFileKey(asset.modelFile ?? WORLD_SAMPLE_MODEL_FILES[0]));
}
function getModelFileKey(modelFile) {
  return modelFile.id ?? modelFile.plyUrl;
}
function syncAssetModels({
  assets,
  groups,
  modelCache,
  placements,
  scene,
  selectedAssetId,
}) {
  if (!scene || !modelCache?.size) {
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
    const baseModel = getCachedModelForAsset(asset, modelCache);
    if (!baseModel) {
      return;
    }
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
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.16, 42),
    new THREE.MeshStandardMaterial({
      color: "#0f172a",
      metalness: 0.18,
      roughness: 0.72,
    }),
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.85, 0.045, 8, 64),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45,
    }),
  );
  const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.075, 8, 72),
    new THREE.MeshStandardMaterial({
      color: "#bef264",
      emissive: "#bef264",
      emissiveIntensity: 0.82,
    }),
  );
  const labelStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 2.8, 8),
    new THREE.MeshBasicMaterial({
      color,
      opacity: 0.42,
      transparent: true,
    }),
  );
  root.userData.assetId = asset.id;
  root.userData.halo = halo;
  root.userData.labelStem = labelStem;
  root.userData.model = model;
  root.userData.platform = platform;
  root.userData.selectionRing = selectionRing;
  model.rotation.order = "XYZ";
  model.rotation.set(
    THREE.MathUtils.degToRad(DEFAULT_ASSET_ROTATION.pitch),
    THREE.MathUtils.degToRad(DEFAULT_ASSET_ROTATION.yaw),
    THREE.MathUtils.degToRad(DEFAULT_ASSET_ROTATION.roll),
  );
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
  const severity = getWorldStatusSeverity(asset.status);
  group.userData.statusSeverity = severity;
  const haloMaterial = group.userData.halo?.material;
  if (haloMaterial instanceof THREE.MeshStandardMaterial) {
    haloMaterial.color.set(color);
    haloMaterial.emissive.set(color);
    haloMaterial.emissiveIntensity = [0.16, 0.95, 1.65][severity] ?? 0.16;
  }
  group.userData.halo?.scale.setScalar([0.84, 1.12, 1.34][severity] ?? 0.84);
  const platformMaterial = group.userData.platform?.material;
  if (platformMaterial instanceof THREE.MeshStandardMaterial) {
    platformMaterial.color.set(severity ? "#1f1308" : "#0f172a");
    platformMaterial.emissive.set(severity ? color : "#000000");
    platformMaterial.emissiveIntensity = [0, 0.16, 0.32][severity] ?? 0;
  }
  const stemMaterial = group.userData.labelStem?.material;
  if (stemMaterial instanceof THREE.MeshBasicMaterial) {
    stemMaterial.color.set(color);
  }
  applyAssetSelection(group, group.userData.isSelected);
}
function applyAssetSelection(group, selected) {
  group.userData.isSelected = selected;
  group.userData.selectionRing.visible = selected;
  const severity = group.userData.statusSeverity ?? 0;
  group.userData.labelStem.material.opacity = selected
    ? 0.95
    : ([0.3, 0.68, 0.9][severity] ?? 0.3);
}
function updateAssetTransforms(groups, placements) {
  groups.forEach((group, assetId) => {
    const placement = placements[assetId];
    if (placement) {
      applyPlacement(group, placement);
    }
  });
}
function updateNearestAssetFocus({
  assets,
  cameraPosition,
  groups,
  onFocus,
  proximityFocus,
  selectedAssetId,
}) {
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
  if (
    !nearest ||
    nearest.distance > 13 ||
    nearest.assetId === selectedAssetId
  ) {
    return;
  }
  const now = performance.now();
  if (
    proximityFocus.assetId === nearest.assetId &&
    now - proximityFocus.lastChangedAt < 1200
  ) {
    return;
  }
  proximityFocus.assetId = nearest.assetId;
  proximityFocus.lastChangedAt = now;
  onFocus(nearest.assetId);
}
function applyPlacement(group, placement) {
  group.position.set(placement.x, WORLD_ASSET_BASE_Y, placement.z);
  group.rotation.y = 0;
  if (group.userData.model) {
    group.userData.model.rotation.order = "XYZ";
    group.userData.model.rotation.set(
      THREE.MathUtils.degToRad(
        placement.rotationX ?? DEFAULT_ASSET_ROTATION.pitch,
      ),
      THREE.MathUtils.degToRad(
        placement.rotationY ?? DEFAULT_ASSET_ROTATION.yaw,
      ),
      THREE.MathUtils.degToRad(
        placement.rotationZ ?? DEFAULT_ASSET_ROTATION.roll,
      ),
    );
  }
}
function updateProjectedCards({
  assets,
  camera,
  groups,
  keyRef,
  selectedAssetId,
  setProjectedCards,
}) {
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
    return [
      {
        asset,
        id: asset.id,
        index,
        left: clampNumber(left, 2, 98),
        opacity: clampNumber(1.12 - distance / 74, 0.38, 1),
        selected: asset.id === selectedAssetId,
        top: clampNumber(top, 6, 94),
      },
    ];
  });
  const key = cards
    .map(
      (card) =>
        `${card.id}:${card.left.toFixed(1)}:${card.top.toFixed(1)}:${card.opacity.toFixed(2)}:${card.selected ? 1 : 0}`,
    )
    .join("|");
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
    state.yaw -= turnSpeed * deltaSeconds;
  }
  if (keys.has("turnRight")) {
    state.yaw += turnSpeed * deltaSeconds;
  }
  const forward = new THREE.Vector3(
    Math.sin(state.yaw),
    0,
    -Math.cos(state.yaw),
  );
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
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
    state.position.x = clampNumber(
      state.position.x,
      -WORLD_SIZE.width / 2 + 2,
      WORLD_SIZE.width / 2 - 2,
    );
    state.position.z = clampNumber(
      state.position.z,
      -WORLD_SIZE.depth / 2 + 2,
      WORLD_SIZE.depth / 2 - 2,
    );
  }
}
function applyCameraState(camera, state) {
  camera.position.copy(state.position);
  const pitch = state.pitch ?? -0.05;
  const horizontalScale = Math.cos(pitch);
  const lookDirection = new THREE.Vector3(
    Math.sin(state.yaw) * horizontalScale,
    Math.sin(pitch),
    -Math.cos(state.yaw) * horizontalScale,
  );
  camera.lookAt(state.position.clone().add(lookDirection));
}
function applyWorldSettings(scene, settings) {
  if (!scene) {
    return;
  }
  scene.background = new THREE.Color(settings.backgroundColor);
  scene.fog = new THREE.Fog(settings.backgroundColor, 28, settings.fogDistance);
  const environment = scene.userData.worldEnvironment;
  if (!environment) {
    return;
  }
  environment.floor.material.color.set(settings.floorColor);
  if (environment.groundModel) {
    setWorldGroundTint(environment.groundModel, settings.floorColor);
  }
  setGridMaterialOpacity(
    environment.grid,
    settings.gridOpacity,
    settings.accentColor,
  );
  environment.ambient.intensity = 1.15 * settings.lightLevel;
  environment.hemisphere.intensity = 1.45 * settings.lightLevel;
  environment.keyLight.intensity = 2.2 * settings.lightLevel;
  environment.lamps.forEach((lamp) => {
    lamp.color.set(settings.accentColor);
    lamp.intensity = 1.6 * settings.lightLevel;
  });
  environment.fixtures.forEach((fixture) => {
    fixture.material.emissive.set(settings.accentColor);
  });
}
function setGridMaterialOpacity(grid, opacity, accentColor) {
  const gridMaterials = Array.isArray(grid.material)
    ? grid.material
    : [grid.material];
  gridMaterials.forEach((material, index) => {
    material.opacity = opacity;
    material.transparent = true;
    if (index === 0 && accentColor && material.color) {
      material.color.set(accentColor);
    }
  });
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
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
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
function cloneWorldAsset(asset) {
  return {
    ...asset,
    modelFile: cloneWorldModelFile(asset.modelFile),
  };
}
function cloneWorldModelFile(modelFile) {
  return {
    ...modelFile,
    textures: modelFile.textures?.map((texture) => ({ ...texture })) ?? [],
  };
}
function buildDisplayAssets() {
  return WORLD_SAMPLE_ASSETS.map(cloneWorldAsset);
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
      modelFile: asset.modelFile
        ? cloneWorldModelFile(asset.modelFile)
        : cloneWorldModelFile(WORLD_SAMPLE_MODEL_FILES[0]),
      status: asset.status ?? "normal",
      type: asset.type || "설비",
    }));
  } catch {
    return fallbackAssets;
  }
}
function readStoredWorldSettings(storageKey) {
  if (typeof window === "undefined") {
    return DEFAULT_WORLD_SETTINGS;
  }
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      return DEFAULT_WORLD_SETTINGS;
    }
    return sanitizeWorldSettings(JSON.parse(storedValue));
  } catch {
    return DEFAULT_WORLD_SETTINGS;
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
    return mergePlacements(
      assets,
      parsedValue && typeof parsedValue === "object" ? parsedValue : {},
    );
  } catch {
    return buildDefaultPlacements(assets);
  }
}
function mergePlacements(assets, currentPlacements) {
  return Object.fromEntries(
    assets.map((asset, index) => [
      asset.id,
      sanitizePlacement(currentPlacements[asset.id], index),
    ]),
  );
}
function buildDefaultPlacements(assets) {
  return Object.fromEntries(
    assets.map((asset, index) => [asset.id, buildDefaultPlacement(index)]),
  );
}
function buildDefaultPlacement(index) {
  const columns = 3;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    rotationX: DEFAULT_ASSET_ROTATION.pitch,
    rotationY: DEFAULT_ASSET_ROTATION.yaw,
    rotationZ: DEFAULT_ASSET_ROTATION.roll,
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
    rotationX: clampNumber(
      readNumber(placement.rotationX, fallback.rotationX),
      -180,
      180,
    ),
    rotationY: clampNumber(
      readNumber(placement.rotationY, fallback.rotationY),
      -180,
      180,
    ),
    rotationZ: clampNumber(
      readNumber(placement.rotationZ, fallback.rotationZ),
      -180,
      180,
    ),
    x: clampNumber(
      readNumber(placement.x, fallback.x),
      -WORLD_SIZE.width / 2 + 3,
      WORLD_SIZE.width / 2 - 3,
    ),
    z: clampNumber(
      readNumber(placement.z, fallback.z),
      -WORLD_SIZE.depth / 2 + 3,
      WORLD_SIZE.depth / 2 - 3,
    ),
  };
}
function sanitizeWorldSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return DEFAULT_WORLD_SETTINGS;
  }
  return {
    accentColor: readColor(
      settings.accentColor,
      DEFAULT_WORLD_SETTINGS.accentColor,
    ),
    backgroundColor: readColor(
      settings.backgroundColor,
      DEFAULT_WORLD_SETTINGS.backgroundColor,
    ),
    floorColor: readColor(
      settings.floorColor,
      DEFAULT_WORLD_SETTINGS.floorColor,
    ),
    fogDistance: clampNumber(
      readNumber(settings.fogDistance, DEFAULT_WORLD_SETTINGS.fogDistance),
      44,
      140,
    ),
    gridOpacity: clampNumber(
      readNumber(settings.gridOpacity, DEFAULT_WORLD_SETTINGS.gridOpacity),
      0.05,
      0.65,
    ),
    lightLevel: clampNumber(
      readNumber(settings.lightLevel, DEFAULT_WORLD_SETTINGS.lightLevel),
      0.45,
      1.4,
    ),
  };
}
function getAssetTelemetry(asset, index) {
  const statusOffset =
    {
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
function readColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}
function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function round(value) {
  return Number(value.toFixed(1));
}
