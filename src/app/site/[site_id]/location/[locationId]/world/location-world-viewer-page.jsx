"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Compass,
  Gauge,
  MapPin,
  RadioTower,
  RotateCcw,
  Wind,
  X,
  Zap,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cn } from "@/lib/utils";

const CAMERA_VIEWS = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "operations", label: "Operations", icon: Activity },
  { id: "grid", label: "Grid", icon: RadioTower },
];

const SAMPLE_WIND_FARM_UNITS = [
  {
    id: "wtg-01",
    name: "WTG-01",
    type: "Turbine",
    status: "normal",
    capacityMw: 4.2,
    outputMw: 3.8,
    windSpeed: 11.4,
    rotorRpm: 14.6,
    bearing: 18,
    health: 97,
    position: [-28, -14],
  },
  {
    id: "wtg-02",
    name: "WTG-02",
    type: "Turbine",
    status: "normal",
    capacityMw: 4.2,
    outputMw: 3.6,
    windSpeed: 10.9,
    rotorRpm: 13.8,
    bearing: 24,
    health: 95,
    position: [-10, -18],
  },
  {
    id: "wtg-03",
    name: "WTG-03",
    type: "Turbine",
    status: "caution",
    capacityMw: 4.2,
    outputMw: 2.9,
    windSpeed: 10.2,
    rotorRpm: 11.7,
    bearing: 31,
    health: 82,
    position: [9, -15],
  },
  {
    id: "wtg-04",
    name: "WTG-04",
    type: "Turbine",
    status: "normal",
    capacityMw: 4.2,
    outputMw: 3.9,
    windSpeed: 11.8,
    rotorRpm: 14.9,
    bearing: 21,
    health: 98,
    position: [28, -10],
  },
  {
    id: "wtg-05",
    name: "WTG-05",
    type: "Turbine",
    status: "normal",
    capacityMw: 4.2,
    outputMw: 3.4,
    windSpeed: 10.6,
    rotorRpm: 12.9,
    bearing: 28,
    health: 94,
    position: [-20, 8],
  },
  {
    id: "wtg-06",
    name: "WTG-06",
    type: "Turbine",
    status: "warning",
    capacityMw: 4.2,
    outputMw: 1.8,
    windSpeed: 9.7,
    rotorRpm: 7.6,
    bearing: 34,
    health: 68,
    position: [0, 10],
  },
  {
    id: "wtg-07",
    name: "WTG-07",
    type: "Turbine",
    status: "normal",
    capacityMw: 4.2,
    outputMw: 3.7,
    windSpeed: 11.2,
    rotorRpm: 14.1,
    bearing: 16,
    health: 96,
    position: [22, 12],
  },
  {
    id: "substation-a",
    name: "Substation A",
    type: "Substation",
    status: "normal",
    capacityMw: 29.4,
    outputMw: 23.1,
    windSpeed: 0,
    rotorRpm: 0,
    bearing: 0,
    health: 99,
    position: [0, 26],
  },
];

const STATUS_THEME = {
  normal: {
    label: "Normal",
    className:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 shadow-emerald-950/30",
    dotClassName: "bg-emerald-300",
    color: 0x34d399,
  },
  caution: {
    label: "Caution",
    className:
      "border-amber-300/40 bg-amber-300/10 text-amber-100 shadow-amber-950/30",
    dotClassName: "bg-amber-200",
    color: 0xfbbf24,
  },
  warning: {
    label: "Warning",
    className:
      "border-rose-300/40 bg-rose-400/10 text-rose-100 shadow-rose-950/30",
    dotClassName: "bg-rose-300",
    color: 0xfb7185,
  },
  offline: {
    label: "Offline",
    className:
      "border-slate-400/30 bg-slate-400/10 text-slate-200 shadow-slate-950/30",
    dotClassName: "bg-slate-300",
    color: 0x94a3b8,
  },
};

const VIEW_CAMERA_PRESETS = {
  overview: {
    position: new THREE.Vector3(46, 33, 56),
    target: new THREE.Vector3(0, 2.5, 3),
  },
  operations: {
    position: new THREE.Vector3(34, 18, 26),
    target: new THREE.Vector3(1, 5.5, 0),
  },
  grid: {
    position: new THREE.Vector3(-22, 21, 48),
    target: new THREE.Vector3(0, 2.4, 22),
  },
};

export function LocationWorldViewerPage({ site, location, assets = [] }) {
  const units = useMemo(() => buildWindFarmUnits(assets), [assets]);
  const [cameraView, setCameraView] = useState("overview");
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [selectedUnitId, setSelectedUnitId] = useState(
    units[0]?.id ?? "wtg-01",
  );
  const [selectedPart, setSelectedPart] = useState(null);

  useEffect(() => {
    if (!units.some((unit) => unit.id === selectedUnitId)) {
      setSelectedUnitId(units[0]?.id ?? "");
    }
  }, [selectedUnitId, units]);

  useEffect(() => {
    if (selectedPart && !units.some((unit) => unit.id === selectedPart.unitId)) {
      setSelectedPart(null);
    }
  }, [selectedPart, units]);

  const selectedUnit =
    units.find((unit) => unit.id === selectedUnitId) ?? units[0];
  const metrics = useMemo(() => buildOperationalMetrics(units), [units]);
  const alertUnits = units.filter((unit) => unit.status !== "normal");
  const activeSiteName = site?.name || site?.id || "Wind site";
  const activeLocationName = location?.name || location?.id || "Location";
  const handleUnitSelect = (unitId) => {
    setSelectedUnitId(unitId);
    setSelectedPart(null);
  };
  const handlePartSelect = (part) => {
    setSelectedUnitId(part.unitId);
    setSelectedPart(part);
  };

  return (
    <main className="LocationWorldViewerPage LocationWorldViewerPage__root-1 flex min-h-screen min-w-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100 lg:h-screen lg:max-h-screen lg:min-h-0 lg:overflow-hidden lg:[height:100dvh] lg:[max-height:100dvh]">
      <section className="LocationWorldViewerPage LocationWorldViewerPage__header-1 border-b border-white/10 bg-slate-950/95 px-4 py-3 md:px-5">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__header-inner-1 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="LocationWorldViewerPage LocationWorldViewerPage__title-group-1 min-w-0">
            <p className="LocationWorldViewerPage LocationWorldViewerPage__eyebrow-1 flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              <MapPin
                className="LocationWorldViewerPage LocationWorldViewerPage__icon-map-1 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span className="LocationWorldViewerPage LocationWorldViewerPage__site-1 truncate">
                {activeSiteName} / {activeLocationName}
              </span>
            </p>
            <div className="LocationWorldViewerPage LocationWorldViewerPage__headline-1 mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="LocationWorldViewerPage LocationWorldViewerPage__title-1 truncate text-xl font-semibold text-white md:text-2xl">
                Wind Farm Digital Twin
              </h1>
              <StatusBadge status={metrics.fleetStatus} />
            </div>
          </div>

          <div className="LocationWorldViewerPage LocationWorldViewerPage__controls-1 flex min-w-0 flex-wrap items-center gap-2">
            <div className="LocationWorldViewerPage LocationWorldViewerPage__view-tabs-1 inline-flex h-9 min-w-0 rounded-md border border-white/10 bg-white/5 p-1">
              {CAMERA_VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={cn(
                    "LocationWorldViewerPage LocationWorldViewerPage__view-button-1 inline-flex min-w-0 items-center gap-1.5 rounded px-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white",
                    cameraView === view.id && "bg-cyan-300 text-slate-950",
                  )}
                  aria-pressed={cameraView === view.id}
                  onClick={() => setCameraView(view.id)}
                >
                  <view.icon
                    className="LocationWorldViewerPage LocationWorldViewerPage__view-icon-1 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="LocationWorldViewerPage LocationWorldViewerPage__view-label-1 truncate">
                    {view.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="LocationWorldViewerPage LocationWorldViewerPage__reset-button-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white"
              title="Reset camera"
              onClick={() => setCameraResetKey((currentKey) => currentKey + 1)}
            >
              <RotateCcw
                className="LocationWorldViewerPage LocationWorldViewerPage__reset-icon-1 h-4 w-4"
                aria-hidden="true"
              />
              <span className="sr-only">Reset camera</span>
            </button>
          </div>
        </div>
      </section>

      <section className="LocationWorldViewerPage LocationWorldViewerPage__metrics-1 grid gap-px border-b border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        <TwinMetric
          icon={Zap}
          label="Active output"
          value={`${formatNumber(metrics.outputMw, 1)} MW`}
          detail={`${metrics.outputPct}% of ${formatNumber(metrics.capacityMw, 1)} MW`}
        />
        <TwinMetric
          icon={Wind}
          label="Wind speed"
          value={`${formatNumber(metrics.windSpeed, 1)} m/s`}
          detail="Hub-height average"
        />
        <TwinMetric
          icon={Gauge}
          label="Availability"
          value={`${metrics.availability}%`}
          detail={`${metrics.normalCount}/${metrics.unitCount} units normal`}
        />
        <TwinMetric
          icon={AlertTriangle}
          label="Active alarms"
          value={metrics.alertCount}
          detail={metrics.alertCount ? "Field action required" : "No open alarms"}
        />
      </section>

      <section className="LocationWorldViewerPage LocationWorldViewerPage__body-1 grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__stage-shell-1 relative min-h-[560px] overflow-hidden bg-slate-950">
          <WindFarmTwinStage
            cameraResetKey={cameraResetKey}
            cameraView={cameraView}
            onPartSelect={handlePartSelect}
            onUnitSelect={handleUnitSelect}
            selectedPart={selectedPart}
            selectedUnitId={selectedUnit?.id}
            units={units}
          />

          <div className="LocationWorldViewerPage LocationWorldViewerPage__hud-top-1 pointer-events-none absolute left-4 top-4 grid gap-2 sm:grid-cols-2">
            <HudPill
              icon={Compass}
              label="Yaw alignment"
              value={`${selectedUnit?.bearing ?? 0} deg`}
            />
            <HudPill
              icon={Activity}
              label="Fleet load"
              value={`${metrics.outputPct}%`}
            />
          </div>

          {selectedPart ? (
            <div className="LocationWorldViewerPage LocationWorldViewerPage__hud-selected-1 absolute bottom-4 left-4 right-4 max-w-xl rounded-md border border-white/10 bg-slate-950/80 p-3 shadow-2xl shadow-slate-950/50 backdrop-blur md:right-auto md:w-[28rem]">
              <SelectedPartAnalysis
                onClose={() => setSelectedPart(null)}
                part={selectedPart}
              />
            </div>
          ) : selectedUnit ? (
            <div className="LocationWorldViewerPage LocationWorldViewerPage__hud-selected-1 absolute bottom-4 left-4 right-4 max-w-xl rounded-md border border-white/10 bg-slate-950/80 p-3 shadow-2xl shadow-slate-950/50 backdrop-blur md:right-auto md:w-[28rem]">
              <SelectedUnitSummary unit={selectedUnit} />
            </div>
          ) : null}
        </div>

        <aside className="LocationWorldViewerPage LocationWorldViewerPage__side-1 flex min-h-0 flex-col border-t border-white/10 bg-slate-900/95 lg:border-l lg:border-t-0">
          <div className="LocationWorldViewerPage LocationWorldViewerPage__side-section-1 border-b border-white/10 p-4">
            <div className="LocationWorldViewerPage LocationWorldViewerPage__side-heading-1 flex min-w-0 items-center justify-between gap-2">
              <h2 className="LocationWorldViewerPage LocationWorldViewerPage__side-title-1 truncate text-sm font-semibold text-white">
                Field Units
              </h2>
              <span className="LocationWorldViewerPage LocationWorldViewerPage__side-count-1 rounded-sm border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                {units.length}
              </span>
            </div>
          </div>

          <div className="LocationWorldViewerPage LocationWorldViewerPage__unit-list-1 min-h-0 flex-1 overflow-y-auto p-3">
            <div className="LocationWorldViewerPage LocationWorldViewerPage__unit-list-inner-1 grid gap-2">
              {units.map((unit) => (
                <UnitListItem
                  key={unit.id}
                  isSelected={unit.id === selectedUnit?.id}
                  onSelect={() => handleUnitSelect(unit.id)}
                  unit={unit}
                />
              ))}
            </div>
          </div>

          <div className="LocationWorldViewerPage LocationWorldViewerPage__side-section-2 border-t border-white/10 p-4">
            <h2 className="LocationWorldViewerPage LocationWorldViewerPage__side-title-2 truncate text-sm font-semibold text-white">
              Live Alarms
            </h2>
            <div className="LocationWorldViewerPage LocationWorldViewerPage__alarm-list-1 mt-3 grid gap-2">
              {alertUnits.length ? (
                alertUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="LocationWorldViewerPage LocationWorldViewerPage__alarm-item-1 rounded-md border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="LocationWorldViewerPage LocationWorldViewerPage__alarm-row-1 flex min-w-0 items-center justify-between gap-2">
                      <p className="LocationWorldViewerPage LocationWorldViewerPage__alarm-name-1 truncate text-xs font-semibold text-white">
                        {unit.name}
                      </p>
                      <StatusBadge status={unit.status} />
                    </div>
                    <p className="LocationWorldViewerPage LocationWorldViewerPage__alarm-text-1 mt-2 text-xs leading-5 text-slate-300">
                      {getAlarmMessage(unit)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="LocationWorldViewerPage LocationWorldViewerPage__alarm-empty-1 rounded-md border border-dashed border-white/10 px-3 py-4 text-xs text-slate-400">
                  No active alarms
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function WindFarmTwinStage({
  cameraResetKey,
  cameraView,
  onPartSelect,
  onUnitSelect,
  selectedPart,
  selectedUnitId,
  units,
}) {
  const containerRef = useRef(null);
  const sceneApiRef = useRef(null);
  const onPartSelectRef = useRef(onPartSelect);
  const onUnitSelectRef = useRef(onUnitSelect);
  const cameraViewRef = useRef(cameraView);
  const selectedPartRef = useRef(selectedPart);
  const selectedUnitIdRef = useRef(selectedUnitId);

  useEffect(() => {
    onPartSelectRef.current = onPartSelect;
  }, [onPartSelect]);

  useEffect(() => {
    onUnitSelectRef.current = onUnitSelect;
  }, [onUnitSelect]);

  useEffect(() => {
    selectedPartRef.current = selectedPart;
    sceneApiRef.current?.setSelectedPart(selectedPart);
  }, [selectedPart]);

  useEffect(() => {
    selectedUnitIdRef.current = selectedUnitId;
    sceneApiRef.current?.setSelectedUnit(selectedUnitId);
  }, [selectedUnitId]);

  useEffect(() => {
    cameraViewRef.current = cameraView;
    sceneApiRef.current?.setCameraView(cameraView);
  }, [cameraResetKey, cameraView]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071a2c);
    scene.fog = new THREE.FogExp2(0x071a2c, 0.0095);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className =
      "LocationWorldViewerPage LocationWorldViewerPage__canvas-1 h-full w-full";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 16;
    controls.maxDistance = 115;
    controls.target.set(0, 2.5, 2);

    addWindFarmAtmosphere(scene);
    addWorldLighting(scene);
    addWindFarmGround(scene);

    const selectableObjects = [];
    const partSelectableObjects = [];
    const rotorEntries = [];
    const unitObjectMap = new Map();
    const windLineEntries = addWindFlow(scene);
    const substationPosition = getSubstationPosition(units);

    units.forEach((unit) => {
      const unitGroup =
        unit.type === "Substation"
          ? createSubstationUnit(unit)
          : createTurbineUnit(unit);

      scene.add(unitGroup.group);
      unitGroup.group.traverse((object) => {
        object.userData.unitId = unit.id;

        if (object.isMesh) {
          if (object.userData.isPartSelectable) {
            partSelectableObjects.push(object);
          } else {
            selectableObjects.push(object);
          }
        }
      });

      if (unitGroup.rotor) {
        rotorEntries.push({
          rotor: unitGroup.rotor,
          speed: Math.max(unit.rotorRpm, 4) * 0.026,
          status: unit.status,
        });
      }

      unitObjectMap.set(unit.id, unitGroup);
    });

    addCollectionLines(scene, units, substationPosition);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let frameId = 0;
    let cameraFocusAnimation = null;
    let hoveredPartKey = "";
    let selectedPartKey = "";

    const resizeRenderer = () => {
      const { clientHeight, clientWidth } = container;

      if (!clientHeight || !clientWidth) {
        return;
      }

      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const setCameraView = (viewId) => {
      const preset = VIEW_CAMERA_PRESETS[viewId] ?? VIEW_CAMERA_PRESETS.overview;

      cameraFocusAnimation = null;
      camera.position.copy(preset.position);
      controls.target.copy(preset.target);
      controls.update();
    };

    const focusCameraOnUnit = (entry) => {
      const worldPosition = new THREE.Vector3();
      const unitX = entry.unit.position?.[0] ?? 0;
      const unitZ = entry.unit.position?.[1] ?? 0;
      const sideSign = unitX > 8 ? -1 : 1;
      const depthSign = unitZ > 8 ? -1 : 1;
      const isSubstation = entry.unit.type === "Substation";
      const targetHeight = isSubstation ? 2.1 : 5.55;
      const cameraOffset = isSubstation
        ? new THREE.Vector3(sideSign * 11.5, 6.2, depthSign * 10.5)
        : new THREE.Vector3(sideSign * 12.5, 7.4, depthSign * 13.5);

      entry.group.getWorldPosition(worldPosition);
      worldPosition.y += targetHeight;

      cameraFocusAnimation = {
        duration: 720,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        startTime: performance.now(),
        toPosition: worldPosition.clone().add(cameraOffset),
        toTarget: worldPosition.clone(),
      };
    };

    const focusCameraOnPart = (partEntry) => {
      const partPosition = new THREE.Vector3();
      const unitPosition = new THREE.Vector3();
      const unitEntry = unitObjectMap.get(partEntry.meta.unitId);
      const isSubstation = partEntry.meta.unitType === "Substation";
      const viewDistance = isSubstation ? 6.4 : 5.4;
      const viewHeight = isSubstation ? 2.65 : 2.35;

      partEntry.popupGroup?.getWorldPosition(partPosition);
      unitEntry?.group.getWorldPosition(unitPosition);

      const outward = partPosition.clone().sub(unitPosition);
      outward.y = 0;

      if (outward.lengthSq() < 0.01) {
        outward.set(isSubstation ? 1 : 0.8, 0, isSubstation ? 0.8 : 1);
      }

      outward.normalize();

      const sideOffset = new THREE.Vector3(-outward.z, 0, outward.x).multiplyScalar(
        isSubstation ? 0.9 : 0.7,
      );
      const target = partPosition.clone().add(new THREE.Vector3(0, 0.36, 0));
      const position = target
        .clone()
        .add(outward.multiplyScalar(viewDistance))
        .add(sideOffset)
        .add(new THREE.Vector3(0, viewHeight, 0));

      cameraFocusAnimation = {
        duration: 680,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        startTime: performance.now(),
        toPosition: position,
        toTarget: target,
      };
    };

    const setSelectedUnit = (unitId, options = {}) => {
      let focusedEntry = null;

      unitObjectMap.forEach((entry, entryId) => {
        const isSelected = entryId === unitId;

        entry.group.scale.setScalar(isSelected ? 1.06 : 1);
        setUnitCutaway(entry, isSelected);

        if (entry.selectionRing) {
          entry.selectionRing.visible =
            isSelected || entry.unit.status !== "normal";
          entry.selectionRing.material.opacity = isSelected ? 0.75 : 0.36;
          entry.selectionRing.material.color.setHex(
            getThreeStatusColor(entry.unit.status),
          );
        }

        if (entry.beacon) {
          entry.beacon.material.emissiveIntensity = isSelected ? 1.9 : 0.8;
        }

        if (isSelected) {
          focusedEntry = entry;
        }
      });

      if (focusedEntry && options.focus !== false) {
        focusCameraOnUnit(focusedEntry);
      }
    };

    const applyPartInteractionState = () => {
      unitObjectMap.forEach((entry) => {
        entry.parts?.forEach((partEntry) => {
          const mode =
            partEntry.key === selectedPartKey
              ? "selected"
              : partEntry.key === hoveredPartKey
                ? "hover"
                : "idle";

          setInspectablePartState(partEntry, mode);
        });
      });
    };

    const setHoveredPart = (partEntry) => {
      const nextKey = partEntry?.key ?? "";

      if (hoveredPartKey === nextKey) {
        return;
      }

      hoveredPartKey = nextKey;
      renderer.domElement.style.cursor = nextKey ? "pointer" : "";
      applyPartInteractionState();
    };

    const setSelectedPart = (part) => {
      selectedPartKey = getPartKey(part);
      applyPartInteractionState();
    };

    const findPartEntryFromHit = (hit) => {
      let current = hit?.object;

      while (current) {
        if (
          current.userData?.partEntry &&
          isObjectVisibleInWorld(current)
        ) {
          return current.userData.partEntry;
        }

        current = current.parent;
      }

      return null;
    };

    const pickPartEntry = () => {
      const hits = raycaster.intersectObjects(partSelectableObjects, false);

      for (const hit of hits) {
        const partEntry = findPartEntryFromHit(hit);

        if (partEntry) {
          return partEntry;
        }
      }

      return null;
    };

    const handlePointerDown = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect();

      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const partEntry = pickPartEntry();

      if (partEntry) {
        setSelectedUnit(partEntry.meta.unitId, { focus: false });
        setSelectedPart(partEntry.meta);
        focusCameraOnPart(partEntry);
        onPartSelectRef.current?.(partEntry.meta);
        return;
      }

      const hit = raycaster.intersectObjects(selectableObjects, false)[0];
      const unitId = hit?.object?.userData?.unitId;

      if (unitId) {
        setSelectedUnit(unitId);
        onUnitSelectRef.current?.(unitId);
      }
    };

    const handlePointerMove = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect();

      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      setHoveredPart(pickPartEntry());
    };

    const handlePointerLeave = () => {
      setHoveredPart(null);
    };

    const updateCameraFocus = () => {
      if (!cameraFocusAnimation) {
        return;
      }

      const elapsed = performance.now() - cameraFocusAnimation.startTime;
      const progress = Math.min(elapsed / cameraFocusAnimation.duration, 1);
      const easedProgress =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(
        cameraFocusAnimation.fromPosition,
        cameraFocusAnimation.toPosition,
        easedProgress,
      );
      controls.target.lerpVectors(
        cameraFocusAnimation.fromTarget,
        cameraFocusAnimation.toTarget,
        easedProgress,
      );

      if (progress >= 1) {
        cameraFocusAnimation = null;
      }
    };

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);

      rotorEntries.forEach((entry) => {
        const statusFactor = entry.status === "warning" ? 0.45 : 1;
        entry.rotor.rotation.z += entry.speed * statusFactor * delta;
      });

      windLineEntries.forEach((entry) => {
        entry.line.position.x += entry.speed * delta;

        if (entry.line.position.x > 48) {
          entry.line.position.x = -48;
        }
      });

      unitObjectMap.forEach((entry) => {
        entry.parts?.forEach((partEntry) => {
          const popupModel = partEntry.popupGroup?.userData?.popupModel;

          if (partEntry.popupGroup?.visible && popupModel) {
            popupModel.rotation.y += delta * 0.18;
          }
        });
      });

      updateCameraFocus();
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(container);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    resizeRenderer();
    setCameraView(cameraViewRef.current);
    setSelectedUnit(selectedUnitIdRef.current);
    setSelectedPart(selectedPartRef.current);
    animate();

    sceneApiRef.current = {
      setCameraView,
      setSelectedPart,
      setSelectedUnit,
    };

    return () => {
      sceneApiRef.current = null;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      controls.dispose();

      scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.filter(Boolean).forEach((material) => {
          if (material.map) {
            material.map.dispose();
          }

          material.dispose();
        });
      });

      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [units]);

  return (
    <div
      ref={containerRef}
      className="LocationWorldViewerPage LocationWorldViewerPage__stage-1 h-full min-h-[560px] w-full"
    />
  );
}

function TwinMetric({ detail, icon: Icon, label, value }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__metric-1 min-w-0 bg-slate-900 px-4 py-3">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__metric-row-1 flex min-w-0 items-center gap-3">
        <span className="LocationWorldViewerPage LocationWorldViewerPage__metric-icon-shell-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-200/15 bg-cyan-200/10 text-cyan-100">
          <Icon
            className="LocationWorldViewerPage LocationWorldViewerPage__metric-icon-1 h-4 w-4"
            aria-hidden="true"
          />
        </span>
        <div className="LocationWorldViewerPage LocationWorldViewerPage__metric-copy-1 min-w-0">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__metric-label-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="LocationWorldViewerPage LocationWorldViewerPage__metric-value-1 truncate text-lg font-semibold text-white">
            {value}
          </p>
        </div>
      </div>
      <p className="LocationWorldViewerPage LocationWorldViewerPage__metric-detail-1 mt-2 truncate text-xs text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function HudPill({ icon: Icon, label, value }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__hud-pill-1 rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 shadow-lg shadow-slate-950/30 backdrop-blur">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__hud-pill-row-1 flex min-w-0 items-center gap-2">
        <Icon
          className="LocationWorldViewerPage LocationWorldViewerPage__hud-pill-icon-1 h-3.5 w-3.5 shrink-0 text-cyan-200"
          aria-hidden="true"
        />
        <p className="LocationWorldViewerPage LocationWorldViewerPage__hud-pill-label-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
      </div>
      <p className="LocationWorldViewerPage LocationWorldViewerPage__hud-pill-value-1 mt-1 truncate text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function SelectedUnitSummary({ unit }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__selected-1 min-w-0">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__selected-head-1 flex min-w-0 items-start justify-between gap-3">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__selected-title-group-1 min-w-0">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__selected-type-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
            {unit.type}
          </p>
          <h2 className="LocationWorldViewerPage LocationWorldViewerPage__selected-title-1 truncate text-base font-semibold text-white">
            {unit.name}
          </h2>
        </div>
        <StatusBadge status={unit.status} />
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__selected-grid-1 mt-3 grid gap-2 sm:grid-cols-4">
        <TelemetryCell label="Output" value={`${formatNumber(unit.outputMw, 1)} MW`} />
        <TelemetryCell label="Wind" value={`${formatNumber(unit.windSpeed, 1)} m/s`} />
        <TelemetryCell label="Rotor" value={`${formatNumber(unit.rotorRpm, 1)} rpm`} />
        <TelemetryCell label="Health" value={`${unit.health}%`} />
      </div>
      {unit.href ? (
        <Link
          href={unit.href}
          className="LocationWorldViewerPage LocationWorldViewerPage__selected-link-1 mt-3 inline-flex h-8 items-center justify-center rounded-md border border-cyan-200/25 bg-cyan-200/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-200/20"
        >
          Asset detail
        </Link>
      ) : null}
    </div>
  );
}

function SelectedPartAnalysis({ onClose, part }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__part-analysis-1 min-w-0">
      <div className="LocationWorldViewerPage LocationWorldViewerPage__part-head-1 flex min-w-0 items-start justify-between gap-3">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__part-title-group-1 min-w-0">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__part-type-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
            {part.unitName} / {part.category}
          </p>
          <h2 className="LocationWorldViewerPage LocationWorldViewerPage__part-title-1 truncate text-base font-semibold text-white">
            {part.name}
          </h2>
        </div>
        <div className="LocationWorldViewerPage LocationWorldViewerPage__part-actions-1 flex shrink-0 items-center gap-2">
          <StatusBadge status={part.status} />
          <button
            type="button"
            className="LocationWorldViewerPage LocationWorldViewerPage__part-close-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Close component analysis"
            onClick={onClose}
          >
            <X
              className="LocationWorldViewerPage LocationWorldViewerPage__part-close-icon-1 h-3.5 w-3.5"
              aria-hidden="true"
            />
            <span className="sr-only">Close component analysis</span>
          </button>
        </div>
      </div>

      <div className="LocationWorldViewerPage LocationWorldViewerPage__part-grid-1 mt-3 grid gap-2 sm:grid-cols-4">
        {part.metrics.map((metric) => (
          <TelemetryCell
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <div className="LocationWorldViewerPage LocationWorldViewerPage__part-analysis-body-1 mt-3 grid gap-2 sm:grid-cols-2">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__part-finding-1 rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__part-finding-label-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Condition
          </p>
          <p className="LocationWorldViewerPage LocationWorldViewerPage__part-finding-text-1 mt-1 text-xs leading-5 text-slate-200">
            {part.finding}
          </p>
        </div>
        <div className="LocationWorldViewerPage LocationWorldViewerPage__part-recommendation-1 rounded-md border border-cyan-200/15 bg-cyan-200/10 p-3">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__part-recommendation-label-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100/80">
            Action
          </p>
          <p className="LocationWorldViewerPage LocationWorldViewerPage__part-recommendation-text-1 mt-1 text-xs leading-5 text-cyan-50">
            {part.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}

function TelemetryCell({ label, value }) {
  return (
    <div className="LocationWorldViewerPage LocationWorldViewerPage__telemetry-cell-1 min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-2">
      <p className="LocationWorldViewerPage LocationWorldViewerPage__telemetry-label-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="LocationWorldViewerPage LocationWorldViewerPage__telemetry-value-1 mt-1 truncate text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function UnitListItem({ isSelected, onSelect, unit }) {
  return (
    <button
      type="button"
      className={cn(
        "LocationWorldViewerPage LocationWorldViewerPage__unit-button-1 grid min-w-0 gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-200/35 hover:bg-white/[0.06]",
        isSelected && "border-cyan-200/60 bg-cyan-200/10 shadow-lg shadow-cyan-950/20",
      )}
      onClick={onSelect}
    >
      <div className="LocationWorldViewerPage LocationWorldViewerPage__unit-head-1 flex min-w-0 items-start justify-between gap-2">
        <div className="LocationWorldViewerPage LocationWorldViewerPage__unit-copy-1 min-w-0">
          <p className="LocationWorldViewerPage LocationWorldViewerPage__unit-type-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {unit.type}
          </p>
          <p className="LocationWorldViewerPage LocationWorldViewerPage__unit-name-1 truncate text-sm font-semibold text-white">
            {unit.name}
          </p>
        </div>
        <StatusBadge status={unit.status} />
      </div>
      <div className="LocationWorldViewerPage LocationWorldViewerPage__unit-telemetry-1 grid grid-cols-3 gap-2">
        <TelemetryCell label="MW" value={formatNumber(unit.outputMw, 1)} />
        <TelemetryCell label="m/s" value={formatNumber(unit.windSpeed, 1)} />
        <TelemetryCell label="Health" value={`${unit.health}%`} />
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const theme = STATUS_THEME[normalizeOperationalStatus(status)];

  return (
    <span
      className={cn(
        "LocationWorldViewerPage LocationWorldViewerPage__status-1 inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold shadow-sm",
        theme.className,
      )}
    >
      <span
        className={cn(
          "LocationWorldViewerPage LocationWorldViewerPage__status-dot-1 h-1.5 w-1.5 rounded-full",
          theme.dotClassName,
        )}
      />
      {theme.label}
    </span>
  );
}

function buildWindFarmUnits(assets) {
  const assetItems = Array.isArray(assets) ? assets : [];
  const baseUnits = SAMPLE_WIND_FARM_UNITS.map((unit, index) => {
    const asset = assetItems[index];
    const status = normalizeOperationalStatus(asset?.status ?? unit.status);

    return {
      ...unit,
      assetId: asset?.id ?? unit.id,
      href: asset?.href,
      name: asset?.name || unit.name,
      status,
      type: unit.type,
      health: deriveHealth(unit.health, status),
      outputMw: deriveOutput(unit.outputMw, status),
    };
  });

  const extraUnits = assetItems
    .slice(SAMPLE_WIND_FARM_UNITS.length)
    .map((asset, index) => createAssetBackedTurbine(asset, index));

  return [...baseUnits, ...extraUnits];
}

function createAssetBackedTurbine(asset, index) {
  const status = normalizeOperationalStatus(asset?.status);
  const column = index % 5;
  const row = Math.floor(index / 5);
  const capacityMw = 4.2;
  const outputBase = 2.8 + column * 0.22;

  return {
    id: asset?.id || `asset-wtg-${index + 1}`,
    assetId: asset?.id || `asset-wtg-${index + 1}`,
    href: asset?.href,
    name: asset?.name || `WTG-${index + SAMPLE_WIND_FARM_UNITS.length + 1}`,
    type: "Turbine",
    status,
    capacityMw,
    outputMw: deriveOutput(outputBase, status),
    windSpeed: 9.8 + column * 0.3,
    rotorRpm: 10.5 + column * 0.7,
    bearing: 18 + column * 4,
    health: deriveHealth(91 - row * 3, status),
    position: [-36 + column * 18, 30 + row * 11],
  };
}

function buildOperationalMetrics(units) {
  const turbineUnits = units.filter((unit) => unit.type !== "Substation");
  const capacityMw = turbineUnits.reduce((sum, unit) => sum + unit.capacityMw, 0);
  const outputMw = turbineUnits.reduce((sum, unit) => sum + unit.outputMw, 0);
  const windSpeed =
    turbineUnits.reduce((sum, unit) => sum + unit.windSpeed, 0) /
    Math.max(turbineUnits.length, 1);
  const normalCount = units.filter((unit) => unit.status === "normal").length;
  const alertCount = units.length - normalCount;
  const fleetStatus = units.some((unit) => unit.status === "warning")
    ? "warning"
    : units.some((unit) => unit.status === "caution")
      ? "caution"
      : "normal";

  return {
    alertCount,
    availability: Math.round((normalCount / Math.max(units.length, 1)) * 100),
    capacityMw,
    fleetStatus,
    normalCount,
    outputMw,
    outputPct: Math.round((outputMw / Math.max(capacityMw, 1)) * 100),
    unitCount: units.length,
    windSpeed,
  };
}

function addWorldLighting(scene) {
  const hemisphereLight = new THREE.HemisphereLight(0xb7e8ff, 0x0f172a, 1.7);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.8);
  const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);

  directionalLight.position.set(26, 44, 20);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.near = 10;
  directionalLight.shadow.camera.far = 110;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  rimLight.position.set(-28, 18, -20);

  scene.add(hemisphereLight, directionalLight, rimLight);
}

function addWindFarmAtmosphere(scene) {
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 16;
  skyCanvas.height = 128;
  const context = skyCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, skyCanvas.height);

  gradient.addColorStop(0, "#102f4b");
  gradient.addColorStop(0.48, "#071a2c");
  gradient.addColorStop(1, "#03101c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 18),
    new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
    }),
  );

  skyDome.position.y = 28;
  scene.add(skyDome);

  const horizon = new THREE.Mesh(
    new THREE.RingGeometry(76, 78, 96),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      opacity: 0.08,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );

  horizon.rotation.x = -Math.PI / 2;
  horizon.position.y = 0.12;
  scene.add(horizon);
}

function addWindFarmGround(scene) {
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x40566a,
    metalness: 0.02,
    roughness: 0.86,
  });
  const cableCorridorMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    opacity: 0.12,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 150),
    new THREE.MeshStandardMaterial({
      color: 0x0b4158,
      metalness: 0.08,
      opacity: 0.78,
      roughness: 0.54,
      transparent: true,
    }),
  );

  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.08;
  ocean.receiveShadow = true;
  scene.add(ocean);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 82),
    new THREE.MeshStandardMaterial({
      color: 0x14304a,
      metalness: 0.05,
      opacity: 0.9,
      roughness: 0.82,
      transparent: true,
    }),
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const shallowWater = new THREE.Mesh(
    new THREE.PlaneGeometry(116, 24),
    new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      metalness: 0.05,
      opacity: 0.22,
      roughness: 0.62,
      transparent: true,
    }),
  );

  shallowWater.rotation.x = -Math.PI / 2;
  shallowWater.position.z = -36;
  shallowWater.position.y = 0.025;
  scene.add(shallowWater);

  const coastalShelf = new THREE.Mesh(
    new THREE.PlaneGeometry(92, 9),
    new THREE.MeshStandardMaterial({
      color: 0x2c5364,
      metalness: 0.02,
      opacity: 0.34,
      roughness: 0.8,
      transparent: true,
    }),
  );

  coastalShelf.rotation.x = -Math.PI / 2;
  coastalShelf.rotation.z = -0.05;
  coastalShelf.position.set(-4, 0.035, -30);
  coastalShelf.receiveShadow = true;
  scene.add(coastalShelf);

  const grid = new THREE.GridHelper(96, 24, 0x38bdf8, 0x1e3a5f);
  grid.position.y = 0.04;
  grid.material.opacity = 0.18;
  grid.material.transparent = true;
  scene.add(grid);

  [
    { position: [-8, 0.05, -42], rotation: 0.04, size: [150, 0.06] },
    { position: [18, 0.055, -34], rotation: 0.02, size: [118, 0.05] },
    { position: [-18, 0.052, -25], rotation: -0.03, size: [96, 0.045] },
    { position: [10, 0.05, 39], rotation: -0.025, size: [140, 0.04] },
    { position: [-26, 0.052, 31], rotation: 0.035, size: [86, 0.035] },
  ].forEach((wave) => {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(wave.size[0], wave.size[1]),
      new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        opacity: 0.14,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );

    line.rotation.x = -Math.PI / 2;
    line.rotation.z = wave.rotation;
    line.position.set(...wave.position);
    scene.add(line);
  });

  [
    { position: [-14, 0.065, 7], rotation: -0.43, size: [8.4, 62] },
    { position: [11, 0.066, 6], rotation: 0.86, size: [7.8, 48] },
    { position: [0, 0.067, -11], rotation: -1.2, size: [7.2, 58] },
  ].forEach((corridor) => {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(corridor.size[0], corridor.size[1]),
      cableCorridorMaterial.clone(),
    );

    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = corridor.rotation;
    strip.position.set(...corridor.position);
    scene.add(strip);
  });

  [
    { position: [-14, 0.085, 18], rotation: -0.52, size: [3.8, 46] },
    { position: [16, 0.09, 2], rotation: 0.9, size: [3.2, 44] },
    { position: [0, 0.095, -13], rotation: -1.3, size: [3, 54] },
  ].forEach((road) => {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(road.size[0], road.size[1]),
      roadMaterial,
    );

    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = road.rotation;
    strip.position.set(...road.position);
    strip.receiveShadow = true;
    scene.add(strip);
  });

  [
    [-28, -14],
    [-10, -18],
    [9, -15],
    [28, -10],
    [-20, 8],
    [0, 10],
    [22, 12],
  ].forEach(([x, z], index) => {
    const installZone = new THREE.Mesh(
      new THREE.RingGeometry(2.55, 2.85, 56),
      new THREE.MeshBasicMaterial({
        color: index === 5 ? 0xfb7185 : 0x67e8f9,
        opacity: index === 5 ? 0.18 : 0.12,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );

    installZone.rotation.x = -Math.PI / 2;
    installZone.position.set(x, 0.11, z);
    scene.add(installZone);
  });

  const substationApron = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.02,
      opacity: 0.42,
      roughness: 0.84,
      transparent: true,
    }),
  );

  substationApron.rotation.x = -Math.PI / 2;
  substationApron.position.set(0, 0.1, 26);
  substationApron.receiveShadow = true;
  scene.add(substationApron);
}

function addWindFlow(scene) {
  const entries = [];
  const material = new THREE.LineBasicMaterial({
    color: 0x93c5fd,
    opacity: 0.34,
    transparent: true,
  });

  for (let index = 0; index < 18; index += 1) {
    const z = -30 + index * 3.7;
    const y = 9 + (index % 4) * 1.3;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, y, z),
      new THREE.Vector3(6, y + 0.25, z + 0.45),
    ]);
    const line = new THREE.Line(geometry, material.clone());

    line.position.x = -48 + index * 5.4;
    scene.add(line);
    entries.push({
      line,
      speed: 5.5 + (index % 5) * 0.8,
    });
  }

  return entries;
}

function addCollectionLines(scene, units, substationPosition) {
  const material = new THREE.LineBasicMaterial({
    color: 0x22d3ee,
    opacity: 0.34,
    transparent: true,
  });

  units
    .filter((unit) => unit.type !== "Substation")
    .forEach((unit) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(unit.position[0], 0.09, unit.position[1]),
        new THREE.Vector3(substationPosition[0], 0.09, substationPosition[1]),
      ]);
      const line = new THREE.Line(geometry, material.clone());

      scene.add(line);
    });
}

function createBladeGeometry(length = 4.35, rootWidth = 0.54, tipWidth = 0.13) {
  const sectionCount = 7;
  const positions = [];
  const indices = [];

  for (let index = 0; index < sectionCount; index += 1) {
    const t = index / (sectionCount - 1);
    const width = THREE.MathUtils.lerp(rootWidth, tipWidth, t);
    const thickness = THREE.MathUtils.lerp(0.16, 0.045, t);
    const y = 0.3 + length * t;
    const camber = Math.sin(t * Math.PI) * 0.16;
    const twist = THREE.MathUtils.lerp(0.09, -0.08, t);

    positions.push(
      -width / 2 + camber,
      y,
      -thickness / 2 + twist,
      width / 2 + camber,
      y,
      -thickness / 2 - twist,
      width / 2 + camber,
      y,
      thickness / 2 - twist,
      -width / 2 + camber,
      y,
      thickness / 2 + twist,
    );
  }

  for (let index = 0; index < sectionCount - 1; index += 1) {
    const current = index * 4;
    const next = current + 4;

    indices.push(
      current,
      next,
      current + 1,
      current + 1,
      next,
      next + 1,
      current + 1,
      next + 1,
      current + 2,
      current + 2,
      next + 1,
      next + 2,
      current + 2,
      next + 2,
      current + 3,
      current + 3,
      next + 2,
      next + 3,
      current + 3,
      next + 3,
      current,
      current,
      next + 3,
      next,
    );
  }

  indices.push(0, 1, 2, 0, 2, 3);
  const last = (sectionCount - 1) * 4;
  indices.push(last, last + 2, last + 1, last, last + 3, last + 2);

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addTowerBand(group, radius, y, material) {
  const band = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 44), material);

  band.rotation.x = Math.PI / 2;
  band.position.y = y;
  group.add(band);
}

function createCylinderMesh({
  color,
  height,
  metalness = 0.08,
  radius,
  roughness = 0.66,
  segments = 20,
}) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    new THREE.MeshStandardMaterial({ color, metalness, roughness }),
  );
}

function setUnitCutaway(entry, isSelected) {
  if (entry.internalGroup) {
    entry.internalGroup.visible = isSelected;
  }

  entry.cutawayMeshes?.forEach((mesh) => {
    setMeshCutaway(mesh, isSelected);
  });
}

function setMeshCutaway(mesh, isCutaway) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  materials.filter(Boolean).forEach((material) => {
    if (!material.userData.locationWorldCutawayState) {
      material.userData.locationWorldCutawayState = {
        depthWrite: material.depthWrite,
        opacity: material.opacity,
        side: material.side,
        transparent: material.transparent,
      };
    }

    const original = material.userData.locationWorldCutawayState;

    if (isCutaway) {
      material.transparent = true;
      material.opacity = 0.32;
      material.depthWrite = false;
      material.side = THREE.DoubleSide;
    } else {
      material.transparent = original.transparent;
      material.opacity = original.opacity;
      material.depthWrite = original.depthWrite;
      material.side = original.side;
    }

    material.needsUpdate = true;
  });

  mesh.renderOrder = isCutaway ? 2 : 0;
}

function createPartMeta(
  unit,
  {
    category,
    finding,
    health,
    id,
    load,
    name,
    recommendation,
    signal,
    status = "normal",
    temperature,
    vibration,
  },
) {
  return {
    category,
    finding,
    health,
    id,
    metrics: [
      { label: "Health", value: `${health}%` },
      { label: "Temp", value: temperature },
      { label: "Vibration", value: vibration },
      { label: "Load", value: load },
    ],
    name,
    recommendation,
    signal,
    status: normalizeOperationalStatus(status),
    unitId: unit.id,
    unitName: unit.name,
    unitType: unit.type,
  };
}

function getPartKey(part) {
  return part ? `${part.unitId}:${part.id}` : "";
}

function isObjectVisibleInWorld(object) {
  let current = object;

  while (current) {
    if (current.visible === false) {
      return false;
    }

    current = current.parent;
  }

  return true;
}

function registerInspectablePart(partEntries, { meshes, meta, popupGroup }) {
  const partEntry = {
    key: getPartKey(meta),
    meshes,
    meta,
    popupGroup,
  };

  meshes.forEach((mesh) => {
    isolateMeshMaterial(mesh);
    mesh.userData.isPartSelectable = true;
    mesh.userData.partEntry = partEntry;
    mesh.userData.partId = meta.id;
  });

  if (popupGroup) {
    popupGroup.visible = false;
  }

  partEntries.push(partEntry);
  return partEntry;
}

function setInspectablePartState(partEntry, mode) {
  partEntry.meshes.forEach((mesh) => setMeshPartEmphasis(mesh, mode));

  if (partEntry.popupGroup) {
    partEntry.popupGroup.visible = mode === "selected";
  }
}

function setMeshPartEmphasis(mesh, mode) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  materials.filter(Boolean).forEach((material) => {
    if (material.emissive && !material.userData.locationWorldPartState) {
      material.userData.locationWorldPartState = {
        emissive: material.emissive.getHex(),
        emissiveIntensity: material.emissiveIntensity ?? 0,
      };
    }

    const original = material.userData.locationWorldPartState;

    if (!material.emissive || !original) {
      return;
    }

    if (mode === "selected") {
      material.emissive.setHex(0x22d3ee);
      material.emissiveIntensity = 0.72;
    } else if (mode === "hover") {
      material.emissive.setHex(0x93c5fd);
      material.emissiveIntensity = 0.42;
    } else {
      material.emissive.setHex(original.emissive);
      material.emissiveIntensity = original.emissiveIntensity;
    }

    material.needsUpdate = true;
  });

  mesh.renderOrder = mode === "selected" ? 4 : mode === "hover" ? 3 : 0;
}

function createPartPopupShell({ anchor, color = 0x38bdf8, position }) {
  const popupGroup = new THREE.Group();
  const modelGroup = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.02, 8, 88),
    new THREE.MeshBasicMaterial({
      color,
      opacity: 0.78,
      transparent: true,
    }),
  );
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(1.28, 72),
    new THREE.MeshBasicMaterial({
      color,
      opacity: 0.12,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  const connector = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(
        anchor[0] - position[0],
        anchor[1] - position[1],
        anchor[2] - position[2],
      ),
      new THREE.Vector3(0, 0, 0),
    ]),
    new THREE.LineBasicMaterial({
      color,
      opacity: 0.72,
      transparent: true,
    }),
  );

  popupGroup.position.set(...position);
  ring.rotation.x = Math.PI / 2;
  plate.rotation.x = Math.PI / 2;
  modelGroup.position.y = 0.36;
  modelGroup.scale.setScalar(2.05);
  popupGroup.add(connector, plate, ring, modelGroup);
  popupGroup.userData.popupModel = modelGroup;
  return popupGroup;
}

function createBoxMesh({
  color,
  depth,
  height,
  metalness = 0.12,
  roughness = 0.56,
  width,
}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, metalness, roughness }),
  );
}

function isolateMeshMaterial(mesh) {
  if (!mesh?.material || mesh.userData.hasIsolatedPartMaterial) {
    return;
  }

  mesh.material = Array.isArray(mesh.material)
    ? mesh.material.map((material) => material.clone())
    : mesh.material.clone();
  mesh.userData.hasIsolatedPartMaterial = true;
}

function addBoltCircle(group, meshes, {
  boltHeight = 0.05,
  boltRadius = 0.018,
  center,
  count = 12,
  material,
  radius,
}) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(boltRadius, boltRadius, boltHeight, 10),
      material,
    );

    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      center[2],
    );
    group.add(bolt);
    meshes?.push(bolt);
  }
}

function addGearTeeth(group, meshes, {
  center,
  count = 18,
  material,
  radius,
  toothDepth = 0.035,
  toothHeight = 0.045,
  toothWidth = 0.055,
}) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(toothWidth, toothHeight, toothDepth),
      material,
    );

    tooth.position.set(
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      center[2],
    );
    tooth.rotation.z = angle;
    group.add(tooth);
    meshes?.push(tooth);
  }
}

function addBearingBalls(group, meshes, {
  ballRadius = 0.025,
  center,
  count = 12,
  material,
  radius,
}) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(ballRadius, 12, 12),
      material,
    );

    ball.position.set(
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      center[2],
    );
    group.add(ball);
    meshes?.push(ball);
  }
}

function addCoolingFinStack(group, meshes, {
  center,
  count,
  depth,
  height,
  material,
  spacing,
  width,
}) {
  for (let index = 0; index < count; index += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    const offset = (index - (count - 1) / 2) * spacing;

    fin.position.set(center[0], center[1], center[2] + offset);
    group.add(fin);
    meshes?.push(fin);
  }
}

function addWireBundle(group, meshes, {
  colorSet = [0x38bdf8, 0x111827, 0x334155],
  count = 5,
  height,
  materialOptions = {},
  radius = 0.012,
  start,
  twist = 0.08,
}) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const wire = createCylinderMesh({
      color: colorSet[index % colorSet.length],
      height,
      metalness: materialOptions.metalness ?? 0.08,
      radius,
      roughness: materialOptions.roughness ?? 0.62,
      segments: 8,
    });

    wire.position.set(
      start[0] + Math.cos(angle) * twist,
      start[1],
      start[2] + Math.sin(angle) * twist,
    );
    wire.rotation.z = Math.sin(angle) * 0.045;
    group.add(wire);
    meshes?.push(wire);
  }
}

function createInsulatorStack({
  color = 0xdbeafe,
  height = 0.62,
  radius = 0.055,
  ringColor = 0x94a3b8,
}) {
  const group = new THREE.Group();
  const meshes = [];
  const core = createCylinderMesh({
    color,
    height,
    metalness: 0.02,
    radius: radius * 0.72,
    roughness: 0.5,
    segments: 16,
  });

  group.add(core);
  meshes.push(core);

  for (let index = 0; index < 4; index += 1) {
    const skirt = createCylinderMesh({
      color: index % 2 ? color : ringColor,
      height: 0.035,
      metalness: index % 2 ? 0.02 : 0.2,
      radius: radius * (1.25 - index * 0.07),
      roughness: 0.48,
      segments: 18,
    });

    skirt.position.y = -height / 2 + 0.12 + index * 0.12;
    group.add(skirt);
    meshes.push(skirt);
  }

  return { group, meshes };
}

function createTurbineUnit(unit) {
  const group = new THREE.Group();
  const internalGroup = new THREE.Group();
  const cutawayMeshes = [];
  const partEntries = [];
  const statusColor = getThreeStatusColor(unit.status);
  const whiteMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfe7ee,
    metalness: 0.08,
    roughness: 0.58,
  });
  const nacelleMaterial = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.18,
    roughness: 0.48,
  });
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: unit.status === "warning" ? 0xe7d8bd : 0xdce6ed,
    metalness: 0.04,
    roughness: 0.62,
  });
  const concreteMaterial = new THREE.MeshStandardMaterial({
    color: 0x65758a,
    metalness: 0.02,
    roughness: 0.9,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.22,
    roughness: 0.5,
  });
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0x9f1d2f,
    metalness: 0.04,
    roughness: 0.66,
  });
  const steelMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.34,
    roughness: 0.44,
  });
  const copperMaterial = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    emissive: 0x451a03,
    emissiveIntensity: 0.16,
    metalness: 0.2,
    roughness: 0.42,
  });
  const signalMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0891b2,
    emissiveIntensity: 0.55,
    metalness: 0.08,
    roughness: 0.36,
  });
  const cableMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.18,
    roughness: 0.62,
  });
  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: statusColor,
    emissive: statusColor,
    emissiveIntensity: 0.8,
    roughness: 0.36,
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: statusColor,
    opacity: unit.status === "normal" ? 0.18 : 0.42,
    transparent: true,
  });

  group.position.set(unit.position[0], 0, unit.position[1]);
  group.rotation.y = THREE.MathUtils.degToRad(unit.bearing);
  internalGroup.visible = false;

  const foundation = new THREE.Mesh(
    new THREE.CylinderGeometry(1.16, 1.28, 0.34, 42),
    concreteMaterial,
  );
  foundation.position.y = 0.17;
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  group.add(foundation);
  addTowerBand(group, 0.96, 0.38, trimMaterial);

  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    const bolt = createCylinderMesh({
      color: 0x1f2937,
      height: 0.12,
      radius: 0.025,
      segments: 10,
    });

    bolt.position.set(Math.cos(angle) * 0.74, 0.47, Math.sin(angle) * 0.74);
    group.add(bolt);
  }

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.5, 8.55, 36),
    whiteMaterial,
  );
  tower.position.y = 4.58;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);
  cutawayMeshes.push(tower);
  addTowerBand(group, 0.48, 1.25, trimMaterial);
  addTowerBand(group, 0.36, 4.7, trimMaterial);
  addTowerBand(group, 0.25, 8.48, trimMaterial);

  const accessDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.76, 0.035),
    trimMaterial,
  );
  accessDoor.position.set(0, 1.03, 0.5);
  group.add(accessDoor);

  [-0.12, 0.12].forEach((x) => {
    const rail = createCylinderMesh({
      color: 0x475569,
      height: 2.55,
      metalness: 0.28,
      radius: 0.012,
      roughness: 0.5,
      segments: 8,
    });

    rail.position.set(x, 2.52, 0.52);
    group.add(rail);
  });

  for (let rungIndex = 0; rungIndex < 8; rungIndex += 1) {
    const rung = createCylinderMesh({
      color: 0x475569,
      height: 0.28,
      metalness: 0.28,
      radius: 0.009,
      roughness: 0.5,
      segments: 8,
    });

    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 1.42 + rungIndex * 0.28, 0.54);
    group.add(rung);
  }

  const nacelle = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.82, 1.12),
    nacelleMaterial,
  );
  nacelle.position.set(0, 8.9, 0.34);
  nacelle.castShadow = true;
  group.add(nacelle);
  cutawayMeshes.push(nacelle);

  const roofPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.055, 0.46),
    trimMaterial.clone(),
  );
  roofPanel.position.set(-0.12, 9.34, 0.25);
  group.add(roofPanel);
  cutawayMeshes.push(roofPanel);

  [-1.23, 1.23].forEach((x) => {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.3, 0.56),
      trimMaterial.clone(),
    );

    vent.position.set(x, 8.95, 0.28);
    group.add(vent);
    cutawayMeshes.push(vent);
  });

  const rearServiceBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.42, 0.28),
    trimMaterial.clone(),
  );
  rearServiceBox.position.set(0, 8.78, -0.37);
  group.add(rearServiceBox);
  cutawayMeshes.push(rearServiceBox);

  const noseCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.72, 36),
    nacelleMaterial,
  );
  noseCone.rotation.x = Math.PI / 2;
  noseCone.position.set(0, 8.9, 1.16);
  noseCone.castShadow = true;
  group.add(noseCone);
  cutawayMeshes.push(noseCone);

  const loadPct = Math.round((unit.outputMw / Math.max(unit.capacityMw, 1)) * 100);
  const generatorMeshes = [];
  const generator = createCylinderMesh({
    color: 0x8fa3b8,
    height: 0.72,
    metalness: 0.44,
    radius: 0.27,
    roughness: 0.38,
    segments: 36,
  });
  generator.rotation.x = Math.PI / 2;
  generator.position.set(-0.48, 8.9, 0.12);
  generator.castShadow = true;
  internalGroup.add(generator);
  generatorMeshes.push(generator);

  [-0.39, 0.39].forEach((z) => {
    const endCap = createCylinderMesh({
      color: 0x475569,
      height: 0.06,
      metalness: 0.38,
      radius: 0.285,
      roughness: 0.42,
      segments: 36,
    });

    endCap.rotation.x = Math.PI / 2;
    endCap.position.set(-0.48, 8.9, z);
    internalGroup.add(endCap);
    generatorMeshes.push(endCap);
    addBoltCircle(internalGroup, generatorMeshes, {
      boltHeight: 0.028,
      boltRadius: 0.009,
      center: [-0.48, 8.9, z + (z > 0 ? 0.035 : -0.035)],
      count: 12,
      material: cableMaterial,
      radius: 0.22,
    });
  });

  [-0.22, -0.1, 0.02, 0.14, 0.26].forEach((z) => {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.035, 0.028),
      steelMaterial,
    );

    fin.position.set(-0.48, 9.18, z);
    internalGroup.add(fin);
    generatorMeshes.push(fin);
  });

  addCoolingFinStack(internalGroup, generatorMeshes, {
    center: [-0.77, 8.9, 0.02],
    count: 7,
    depth: 0.025,
    height: 0.33,
    material: steelMaterial,
    spacing: 0.105,
    width: 0.032,
  });
  addCoolingFinStack(internalGroup, generatorMeshes, {
    center: [-0.19, 8.9, 0.02],
    count: 7,
    depth: 0.025,
    height: 0.33,
    material: steelMaterial,
    spacing: 0.105,
    width: 0.032,
  });

  [-0.25, -0.08, 0.08, 0.25].forEach((z) => {
    const winding = new THREE.Mesh(
      new THREE.TorusGeometry(0.225, 0.014, 8, 38),
      copperMaterial,
    );

    winding.position.set(-0.48, 8.9, z);
    internalGroup.add(winding);
    generatorMeshes.push(winding);
  });

  addGearTeeth(internalGroup, generatorMeshes, {
    center: [-0.48, 8.9, 0.015],
    count: 20,
    material: copperMaterial,
    radius: 0.235,
    toothDepth: 0.018,
    toothHeight: 0.028,
    toothWidth: 0.045,
  });

  const terminalBox = createBoxMesh({
    color: 0x1f2937,
    depth: 0.14,
    height: 0.22,
    metalness: 0.24,
    roughness: 0.5,
    width: 0.26,
  });
  terminalBox.position.set(-0.48, 8.54, -0.12);
  internalGroup.add(terminalBox);
  generatorMeshes.push(terminalBox);

  [-0.08, 0, 0.08].forEach((x) => {
    const terminalLug = createCylinderMesh({
      color: 0xb45309,
      height: 0.08,
      metalness: 0.28,
      radius: 0.012,
      roughness: 0.42,
      segments: 10,
    });

    terminalLug.rotation.x = Math.PI / 2;
    terminalLug.position.set(-0.48 + x, 8.44, -0.205);
    internalGroup.add(terminalLug);
    generatorMeshes.push(terminalLug);
  });

  const generatorPopup = createPartPopupShell({
    anchor: [-0.48, 8.9, 0.12],
    color: 0x38bdf8,
    position: [2.75, 9.45, 1.85],
  });
  const generatorPopupModel = generatorPopup.userData.popupModel;
  const popupGeneratorBody = createCylinderMesh({
    color: 0x8fa3b8,
    height: 0.86,
    metalness: 0.48,
    radius: 0.32,
    roughness: 0.36,
    segments: 36,
  });
  popupGeneratorBody.rotation.x = Math.PI / 2;
  generatorPopupModel.add(popupGeneratorBody);
  [-0.32, 0.32].forEach((z) => {
    const popupEndCap = createCylinderMesh({
      color: 0x475569,
      height: 0.055,
      metalness: 0.38,
      radius: 0.325,
      roughness: 0.42,
      segments: 36,
    });

    popupEndCap.rotation.x = Math.PI / 2;
    popupEndCap.position.z = z;
    generatorPopupModel.add(popupEndCap);
  });
  [-0.26, -0.09, 0.09, 0.26].forEach((z) => {
    const popupWinding = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.017, 8, 42),
      copperMaterial.clone(),
    );

    popupWinding.position.z = z;
    generatorPopupModel.add(popupWinding);
  });
  addGearTeeth(generatorPopupModel, null, {
    center: [0, 0, 0],
    count: 22,
    material: copperMaterial.clone(),
    radius: 0.3,
    toothDepth: 0.02,
    toothHeight: 0.032,
    toothWidth: 0.045,
  });
  group.add(generatorPopup);
  registerInspectablePart(partEntries, {
    meshes: generatorMeshes,
    meta: createPartMeta(unit, {
      category: "Powertrain",
      finding:
        unit.status === "warning"
          ? "Generator temperature is elevated during derated operation."
          : "Generator thermal profile is stable across the stator housing.",
      health: unit.status === "warning" ? 74 : Math.min(unit.health + 1, 99),
      id: "generator",
      load: `${loadPct}%`,
      name: "Generator Stator",
      recommendation:
        unit.status === "warning"
          ? "Inspect cooling airflow and terminal resistance in the next stop window."
          : "Keep routine thermal trend monitoring active.",
      signal: "98%",
      status: unit.status === "warning" ? "caution" : "normal",
      temperature: unit.status === "warning" ? "78 C" : "64 C",
      vibration: unit.status === "warning" ? "3.6 mm/s" : "1.4 mm/s",
    }),
    popupGroup: generatorPopup,
  });

  const gearboxMeshes = [];
  const gearbox = createCylinderMesh({
    color: 0x64748b,
    height: 0.52,
    metalness: 0.42,
    radius: 0.28,
    roughness: 0.4,
    segments: 32,
  });
  gearbox.rotation.x = Math.PI / 2;
  gearbox.position.set(0.12, 8.9, 0.56);
  gearbox.castShadow = true;
  internalGroup.add(gearbox);
  gearboxMeshes.push(gearbox);

  [0.27, 0.85].forEach((z) => {
    const flange = new THREE.Mesh(
      new THREE.TorusGeometry(0.285, 0.018, 10, 40),
      steelMaterial,
    );

    flange.position.set(0.12, 8.9, z);
    internalGroup.add(flange);
    gearboxMeshes.push(flange);
    addBoltCircle(internalGroup, gearboxMeshes, {
      boltHeight: 0.024,
      boltRadius: 0.008,
      center: [0.12, 8.9, z],
      count: 10,
      material: cableMaterial,
      radius: 0.245,
    });
  });

  [0.44, 0.56, 0.68].forEach((z, index) => {
    const gearRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.18 + index * 0.025, 0.012, 8, 28),
      index === 1 ? copperMaterial : steelMaterial,
    );

    gearRing.position.set(0.12, 8.9, z);
    internalGroup.add(gearRing);
    gearboxMeshes.push(gearRing);
    addGearTeeth(internalGroup, gearboxMeshes, {
      center: [0.12, 8.9, z],
      count: 14 + index * 2,
      material: index === 1 ? copperMaterial : steelMaterial,
      radius: 0.2 + index * 0.025,
      toothDepth: 0.014,
      toothHeight: 0.024,
      toothWidth: 0.038,
    });
  });

  const oilFilter = createBoxMesh({
    color: 0x0f172a,
    depth: 0.18,
    height: 0.18,
    metalness: 0.2,
    roughness: 0.52,
    width: 0.28,
  });
  oilFilter.position.set(0.42, 8.68, 0.44);
  internalGroup.add(oilFilter);
  gearboxMeshes.push(oilFilter);

  const sightGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      opacity: 0.65,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  sightGlass.rotation.y = Math.PI / 2;
  sightGlass.position.set(0.435, 8.9, 0.66);
  internalGroup.add(sightGlass);
  gearboxMeshes.push(sightGlass);

  const breatherCap = createCylinderMesh({
    color: 0x0f172a,
    height: 0.12,
    metalness: 0.26,
    radius: 0.035,
    roughness: 0.48,
    segments: 14,
  });
  breatherCap.position.set(0.12, 9.23, 0.56);
  internalGroup.add(breatherCap);
  gearboxMeshes.push(breatherCap);

  const gearboxPopup = createPartPopupShell({
    anchor: [0.12, 8.9, 0.56],
    color: 0xfbbf24,
    position: [2.92, 8.62, 2.2],
  });
  const gearboxPopupModel = gearboxPopup.userData.popupModel;
  const popupGearboxBody = createCylinderMesh({
    color: 0x64748b,
    height: 0.62,
    metalness: 0.44,
    radius: 0.34,
    roughness: 0.38,
    segments: 36,
  });
  popupGearboxBody.rotation.x = Math.PI / 2;
  gearboxPopupModel.add(popupGearboxBody);
  [0.34, -0.34].forEach((z) => {
    const popupFlange = new THREE.Mesh(
      new THREE.TorusGeometry(0.345, 0.02, 10, 42),
      steelMaterial.clone(),
    );

    popupFlange.position.z = z;
    gearboxPopupModel.add(popupFlange);
  });
  [0, 0.18, -0.18].forEach((z, index) => {
    const popupGear = new THREE.Mesh(
      new THREE.TorusGeometry(0.19 + index * 0.04, 0.017, 8, 32),
      index === 0 ? copperMaterial.clone() : steelMaterial.clone(),
    );

    popupGear.position.z = z;
    gearboxPopupModel.add(popupGear);
    addGearTeeth(gearboxPopupModel, null, {
      center: [0, 0, z],
      count: 16 + index * 2,
      material: index === 0 ? copperMaterial.clone() : steelMaterial.clone(),
      radius: 0.215 + index * 0.04,
      toothDepth: 0.016,
      toothHeight: 0.027,
      toothWidth: 0.04,
    });
  });
  group.add(gearboxPopup);
  registerInspectablePart(partEntries, {
    meshes: gearboxMeshes,
    meta: createPartMeta(unit, {
      category: "Powertrain",
      finding:
        unit.status === "warning"
          ? "Gearbox vibration trend exceeds the normal band at low rotor speed."
          : "Gear mesh frequency remains inside the expected envelope.",
      health: unit.status === "warning" ? 68 : unit.status === "caution" ? 83 : 96,
      id: "gearbox",
      load: `${Math.max(loadPct - 4, 0)}%`,
      name: "Planetary Gearbox",
      recommendation:
        unit.status === "warning"
          ? "Schedule borescope inspection and oil particle analysis."
          : "Continue oil condition sampling on the standard interval.",
      signal: "96%",
      status: unit.status === "warning" ? "warning" : unit.status,
      temperature: unit.status === "warning" ? "86 C" : "61 C",
      vibration: unit.status === "warning" ? "5.2 mm/s" : "1.8 mm/s",
    }),
    popupGroup: gearboxPopup,
  });

  const driveTrainMeshes = [];
  const driveShaft = createCylinderMesh({
    color: 0xd1d5db,
    height: 1.72,
    metalness: 0.54,
    radius: 0.055,
    roughness: 0.34,
    segments: 20,
  });
  driveShaft.rotation.x = Math.PI / 2;
  driveShaft.position.set(0, 8.9, 0.82);
  internalGroup.add(driveShaft);
  driveTrainMeshes.push(driveShaft);

  const bearingCore = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.035, 10, 36),
    copperMaterial,
  );
  bearingCore.position.set(0, 8.9, 1.07);
  internalGroup.add(bearingCore);
  driveTrainMeshes.push(bearingCore);

  const bearingOuterRace = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.026, 10, 44),
    steelMaterial,
  );
  bearingOuterRace.position.set(0, 8.9, 1.07);
  internalGroup.add(bearingOuterRace);
  driveTrainMeshes.push(bearingOuterRace);

  const bearingInnerRace = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.02, 10, 36),
    steelMaterial,
  );
  bearingInnerRace.position.set(0, 8.9, 1.07);
  internalGroup.add(bearingInnerRace);
  driveTrainMeshes.push(bearingInnerRace);

  addBearingBalls(internalGroup, driveTrainMeshes, {
    ballRadius: 0.026,
    center: [0, 8.9, 1.07],
    count: 14,
    material: steelMaterial,
    radius: 0.245,
  });

  const brakeDisc = createCylinderMesh({
    color: 0x94a3b8,
    height: 0.06,
    metalness: 0.5,
    radius: 0.32,
    roughness: 0.34,
    segments: 40,
  });
  brakeDisc.rotation.x = Math.PI / 2;
  brakeDisc.position.set(0, 8.9, 1.24);
  internalGroup.add(brakeDisc);
  driveTrainMeshes.push(brakeDisc);

  addBoltCircle(internalGroup, driveTrainMeshes, {
    boltHeight: 0.03,
    boltRadius: 0.012,
    center: [0, 8.9, 1.285],
    count: 8,
    material: cableMaterial,
    radius: 0.22,
  });

  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    const coolingHole = createCylinderMesh({
      color: 0x111827,
      height: 0.064,
      metalness: 0.12,
      radius: 0.014,
      roughness: 0.5,
      segments: 10,
    });

    coolingHole.rotation.x = Math.PI / 2;
    coolingHole.position.set(
      Math.cos(angle) * 0.27,
      8.9 + Math.sin(angle) * 0.27,
      1.286,
    );
    internalGroup.add(coolingHole);
    driveTrainMeshes.push(coolingHole);
  }

  [-0.18, 0.18].forEach((x) => {
    const caliper = createBoxMesh({
      color: 0x334155,
      depth: 0.1,
      height: 0.16,
      metalness: 0.32,
      roughness: 0.46,
      width: 0.14,
    });

    caliper.position.set(x, 8.66, 1.24);
    internalGroup.add(caliper);
    driveTrainMeshes.push(caliper);

    const pad = createBoxMesh({
      color: 0x111827,
      depth: 0.115,
      height: 0.055,
      metalness: 0.1,
      roughness: 0.72,
      width: 0.12,
    });

    pad.position.set(x, 8.78, 1.24);
    internalGroup.add(pad);
    driveTrainMeshes.push(pad);
  });

  const shaftPopup = createPartPopupShell({
    anchor: [0, 8.9, 1.12],
    color: 0x93c5fd,
    position: [2.52, 8.05, 2.52],
  });
  const shaftPopupModel = shaftPopup.userData.popupModel;
  const popupShaft = createCylinderMesh({
    color: 0xd1d5db,
    height: 0.96,
    metalness: 0.56,
    radius: 0.07,
    roughness: 0.32,
    segments: 20,
  });
  popupShaft.rotation.x = Math.PI / 2;
  shaftPopupModel.add(popupShaft);
  const popupBearingOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.028, 10, 48),
    steelMaterial.clone(),
  );
  popupBearingOuter.position.z = 0.04;
  shaftPopupModel.add(popupBearingOuter);
  addBearingBalls(shaftPopupModel, null, {
    ballRadius: 0.028,
    center: [0, 0, 0.04],
    count: 14,
    material: steelMaterial.clone(),
    radius: 0.265,
  });
  const popupBrake = createCylinderMesh({
    color: 0x94a3b8,
    height: 0.08,
    metalness: 0.5,
    radius: 0.34,
    roughness: 0.34,
    segments: 40,
  });
  popupBrake.rotation.x = Math.PI / 2;
  popupBrake.position.z = 0.32;
  shaftPopupModel.add(popupBrake);
  addBoltCircle(shaftPopupModel, null, {
    boltHeight: 0.032,
    boltRadius: 0.012,
    center: [0, 0, 0.37],
    count: 8,
    material: cableMaterial.clone(),
    radius: 0.23,
  });
  group.add(shaftPopup);
  registerInspectablePart(partEntries, {
    meshes: driveTrainMeshes,
    meta: createPartMeta(unit, {
      category: "Mechanical",
      finding: "Main bearing and brake disc alignment are within tolerance.",
      health: unit.status === "warning" ? 72 : 95,
      id: "main-shaft-bearing",
      load: `${Math.min(loadPct + 6, 100)}%`,
      name: "Main Shaft Bearing",
      recommendation: "Monitor axial vibration during the next high-wind period.",
      signal: "97%",
      status: unit.status === "warning" ? "caution" : "normal",
      temperature: unit.status === "warning" ? "74 C" : "57 C",
      vibration: unit.status === "warning" ? "3.9 mm/s" : "1.2 mm/s",
    }),
    popupGroup: shaftPopup,
  });

  const cableMeshes = [];
  addWireBundle(internalGroup, cableMeshes, {
    colorSet: [0x38bdf8, 0x111827, 0x334155, 0xb45309, 0x64748b],
    count: 7,
    height: 7.36,
    materialOptions: { metalness: 0.08, roughness: 0.62 },
    radius: 0.009,
    start: [0, 4.85, -0.05],
    twist: 0.13,
  });

  [-0.18, 0, 0.18].forEach((x) => {
    const cable = createCylinderMesh({
      color: x === 0 ? 0x38bdf8 : 0x111827,
      height: 7.45,
      metalness: 0.08,
      radius: x === 0 ? 0.013 : 0.018,
      roughness: 0.62,
      segments: 8,
    });

    cable.position.set(x, 4.82, -0.05);
    internalGroup.add(cable);
    cableMeshes.push(cable);
  });

  [2.2, 4.7, 7.55].forEach((y) => {
    const cableClamp = new THREE.Mesh(
      new THREE.TorusGeometry(0.255, 0.012, 8, 28),
      cableMaterial,
    );

    cableClamp.rotation.x = Math.PI / 2;
    cableClamp.position.set(0, y, -0.05);
    internalGroup.add(cableClamp);
    cableMeshes.push(cableClamp);
  });

  const strainRelief = createBoxMesh({
    color: 0x111827,
    depth: 0.2,
    height: 0.12,
    metalness: 0.18,
    roughness: 0.58,
    width: 0.46,
  });
  strainRelief.position.set(0, 1.18, -0.17);
  internalGroup.add(strainRelief);
  cableMeshes.push(strainRelief);

  const cablePopup = createPartPopupShell({
    anchor: [0, 4.82, -0.05],
    color: 0x22d3ee,
    position: [1.98, 5.3, 1.85],
  });
  const cablePopupModel = cablePopup.userData.popupModel;
  addWireBundle(cablePopupModel, null, {
    colorSet: [0x38bdf8, 0x111827, 0x334155, 0xb45309, 0x64748b],
    count: 7,
    height: 0.96,
    radius: 0.012,
    start: [0, 0, 0],
    twist: 0.16,
  });
  [-0.16, 0, 0.16].forEach((x) => {
    const popupCable = createCylinderMesh({
      color: x === 0 ? 0x38bdf8 : 0x111827,
      height: 0.96,
      metalness: 0.08,
      radius: x === 0 ? 0.02 : 0.026,
      roughness: 0.62,
      segments: 10,
    });

    popupCable.position.x = x;
    cablePopupModel.add(popupCable);
  });
  group.add(cablePopup);
  registerInspectablePart(partEntries, {
    meshes: cableMeshes,
    meta: createPartMeta(unit, {
      category: "Electrical",
      finding: "Power cable insulation and signal pair are reporting clean continuity.",
      health: unit.status === "warning" ? 88 : 97,
      id: "power-cable-bundle",
      load: `${loadPct}%`,
      name: "Tower Power Cable",
      recommendation: "Keep partial-discharge sampling enabled for the tower run.",
      signal: "99%",
      status: "normal",
      temperature: unit.status === "warning" ? "49 C" : "43 C",
      vibration: "0.4 mm/s",
    }),
    popupGroup: cablePopup,
  });

  const controlMeshes = [];
  const baseCabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.72, 0.28),
    cableMaterial,
  );
  baseCabinet.position.set(-0.2, 1.26, -0.12);
  internalGroup.add(baseCabinet);
  controlMeshes.push(baseCabinet);

  const dataModule = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.08),
    signalMaterial,
  );
  dataModule.position.set(0.18, 1.52, -0.26);
  internalGroup.add(dataModule);
  controlMeshes.push(dataModule);

  [-0.08, 0.08].forEach((x) => {
    const breaker = createBoxMesh({
      color: 0x334155,
      depth: 0.035,
      height: 0.14,
      metalness: 0.18,
      roughness: 0.55,
      width: 0.08,
    });

    breaker.position.set(-0.2 + x, 1.4, -0.275);
    internalGroup.add(breaker);
    controlMeshes.push(breaker);
  });

  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const terminal = createBoxMesh({
        color: column % 2 ? 0x64748b : 0x94a3b8,
        depth: 0.028,
        height: 0.052,
        metalness: 0.16,
        roughness: 0.55,
        width: 0.045,
      });

      terminal.position.set(
        -0.32 + column * 0.075,
        1.17 + row * 0.075,
        -0.275,
      );
      internalGroup.add(terminal);
      controlMeshes.push(terminal);
    }
  }

  [
    { color: 0x38bdf8, points: [[-0.3, 1.28, -0.305], [0.18, 1.48, -0.305]] },
    { color: 0xb45309, points: [[-0.23, 1.2, -0.31], [0.16, 1.42, -0.31]] },
    { color: 0x94a3b8, points: [[-0.15, 1.16, -0.315], [0.18, 1.36, -0.315]] },
  ].forEach((wire) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        wire.points.map((point) => new THREE.Vector3(...point)),
      ),
      new THREE.LineBasicMaterial({
        color: wire.color,
        opacity: 0.82,
        transparent: true,
      }),
    );

    internalGroup.add(line);
  });

  const controlPopup = createPartPopupShell({
    anchor: [-0.2, 1.35, -0.12],
    color: 0x67e8f9,
    position: [1.72, 2.2, 1.48],
  });
  const controlPopupModel = controlPopup.userData.popupModel;
  const popupCabinet = createBoxMesh({
    color: 0x0f172a,
    depth: 0.34,
    height: 0.72,
    metalness: 0.24,
    roughness: 0.52,
    width: 0.5,
  });
  const popupScreen = createBoxMesh({
    color: 0x38bdf8,
    depth: 0.025,
    height: 0.18,
    metalness: 0.08,
    roughness: 0.36,
    width: 0.32,
  });
  popupScreen.position.set(0, 0.12, 0.185);
  controlPopupModel.add(popupCabinet, popupScreen);
  for (let index = 0; index < 6; index += 1) {
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 10),
      index % 2 ? copperMaterial.clone() : signalMaterial.clone(),
    );

    led.position.set(-0.18 + index * 0.072, -0.12, 0.19);
    controlPopupModel.add(led);
  }
  group.add(controlPopup);
  registerInspectablePart(partEntries, {
    meshes: controlMeshes,
    meta: createPartMeta(unit, {
      category: "Controls",
      finding: "Controller IO, breaker state, and telemetry signal are synchronized.",
      health: unit.status === "warning" ? 90 : 98,
      id: "base-control-cabinet",
      load: "42%",
      name: "Base Control Cabinet",
      recommendation: "Review event buffer after maintenance actions are closed.",
      signal: "99%",
      status: "normal",
      temperature: "38 C",
      vibration: "0.3 mm/s",
    }),
    popupGroup: controlPopup,
  });

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    beaconMaterial,
  );
  beacon.position.set(0.72, 9.48, 0.24);
  group.add(beacon);

  const rotor = new THREE.Group();
  rotor.position.set(0, 8.9, 1.58);

  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 28, 28),
    nacelleMaterial,
  );
  hub.castShadow = true;
  rotor.add(hub);
  cutawayMeshes.push(hub);

  const spinner = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.52, 28),
    nacelleMaterial,
  );
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.34;
  spinner.castShadow = true;
  rotor.add(spinner);
  cutawayMeshes.push(spinner);

  for (let bladeIndex = 0; bladeIndex < 3; bladeIndex += 1) {
    const bladePivot = new THREE.Group();
    const rootClamp = createCylinderMesh({
      color: 0x94a3b8,
      height: 0.6,
      metalness: 0.2,
      radius: 0.16,
      roughness: 0.52,
      segments: 20,
    });
    const blade = new THREE.Mesh(createBladeGeometry(), bladeMaterial);
    const bladeTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.34, 0.055),
      markerMaterial,
    );

    rootClamp.position.y = 0.42;
    bladeTip.position.y = 4.55;
    blade.castShadow = true;
    bladeTip.castShadow = true;
    bladePivot.rotation.z = (Math.PI * 2 * bladeIndex) / 3;
    bladePivot.add(rootClamp);
    bladePivot.add(blade);
    bladePivot.add(bladeTip);
    rotor.add(bladePivot);
  }

  group.add(rotor);
  group.add(internalGroup);

  const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.035, 8, 96),
    ringMaterial,
  );
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.position.y = 0.1;
  selectionRing.visible = unit.status !== "normal";
  group.add(selectionRing);

  return {
    beacon,
    cutawayMeshes,
    group,
    internalGroup,
    parts: partEntries,
    rotor,
    selectionRing,
    unit,
  };
}

function createSubstationUnit(unit) {
  const group = new THREE.Group();
  const internalGroup = new THREE.Group();
  const cutawayMeshes = [];
  const partEntries = [];
  const statusColor = getThreeStatusColor(unit.status);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x273449,
    metalness: 0.2,
    roughness: 0.6,
  });
  const concreteMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.02,
    roughness: 0.88,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0e7490,
    emissiveIntensity: 0.5,
    roughness: 0.42,
  });
  const steelMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.34,
    roughness: 0.44,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x172033,
    metalness: 0.22,
    roughness: 0.58,
  });
  const copperMaterial = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    emissive: 0x451a03,
    emissiveIntensity: 0.18,
    metalness: 0.24,
    roughness: 0.42,
  });
  const breakerMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.24,
    roughness: 0.52,
  });
  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: statusColor,
    emissive: statusColor,
    emissiveIntensity: 0.8,
    roughness: 0.36,
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: statusColor,
    opacity: 0.36,
    transparent: true,
  });

  group.position.set(unit.position[0], 0, unit.position[1]);
  internalGroup.visible = false;

  const base = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.65, 5.8), baseMaterial);
  base.position.y = 0.35;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  cutawayMeshes.push(base);

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(9.7, 0.18, 6.7),
    concreteMaterial,
  );
  slab.position.y = 0.14;
  slab.receiveShadow = true;
  group.add(slab);

  for (let index = 0; index < 14; index += 1) {
    const isLongSide = index < 8;
    const sideIndex = isLongSide ? index : index - 8;
    const post = createCylinderMesh({
      color: 0x64748b,
      height: 1.1,
      metalness: 0.22,
      radius: 0.035,
      roughness: 0.48,
      segments: 8,
    });

    post.position.set(
      isLongSide ? -4.5 + sideIndex * 1.3 : sideIndex % 2 ? 4.75 : -4.75,
      0.75,
      isLongSide ? (index % 2 ? 3.15 : -3.15) : -1.9 + Math.floor(sideIndex / 2) * 1.9,
    );
    group.add(post);
  }

  const controlRoom = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 2.1, 3.1),
    baseMaterial.clone(),
  );
  controlRoom.position.set(-1.5, 1.7, 0);
  controlRoom.castShadow = true;
  group.add(controlRoom);
  cutawayMeshes.push(controlRoom);

  const controlRoof = new THREE.Mesh(
    new THREE.BoxGeometry(4.95, 0.16, 3.35),
    darkMaterial.clone(),
  );
  controlRoof.position.set(-1.5, 2.84, 0);
  controlRoof.castShadow = true;
  group.add(controlRoof);
  cutawayMeshes.push(controlRoof);

  const protectionRackMeshes = [];

  for (let index = 0; index < 4; index += 1) {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.86, 0.18),
      breakerMaterial,
    );
    const statusPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.12, 0.035),
      index % 2 ? accentMaterial : copperMaterial,
    );

    rack.position.set(-2.82 + index * 0.42, 1.58, 0.86);
    statusPanel.position.set(-2.82 + index * 0.42, 1.88, 0.97);
    internalGroup.add(rack);
    internalGroup.add(statusPanel);
    protectionRackMeshes.push(rack, statusPanel);

    for (let buttonIndex = 0; buttonIndex < 3; buttonIndex += 1) {
      const button = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 10, 10),
        buttonIndex === 0 ? accentMaterial : copperMaterial,
      );

      button.position.set(
        -2.91 + index * 0.42 + buttonIndex * 0.06,
        1.66,
        0.965,
      );
      internalGroup.add(button);
      protectionRackMeshes.push(button);
    }

    const handle = createCylinderMesh({
      color: 0x94a3b8,
      height: 0.18,
      metalness: 0.3,
      radius: 0.009,
      roughness: 0.42,
      segments: 8,
    });

    handle.rotation.x = Math.PI / 2;
    handle.position.set(-2.64 + index * 0.42, 1.46, 0.97);
    internalGroup.add(handle);
    protectionRackMeshes.push(handle);
  }

  const rackCableDuct = createBoxMesh({
    color: 0x475569,
    depth: 0.16,
    height: 0.08,
    metalness: 0.22,
    roughness: 0.48,
    width: 1.85,
  });
  rackCableDuct.position.set(-2.18, 1.08, 0.84);
  internalGroup.add(rackCableDuct);
  protectionRackMeshes.push(rackCableDuct);

  const rackPopup = createPartPopupShell({
    anchor: [-2.18, 1.68, 0.88],
    color: 0x67e8f9,
    position: [-4.62, 3.1, 2.1],
  });
  const rackPopupModel = rackPopup.userData.popupModel;
  for (let index = 0; index < 4; index += 1) {
    const popupRack = createBoxMesh({
      color: 0x0f172a,
      depth: 0.18,
      height: 0.78,
      metalness: 0.24,
      roughness: 0.52,
      width: 0.26,
    });
    const popupScreen = createBoxMesh({
      color: index % 2 ? 0xb45309 : 0x38bdf8,
      depth: 0.025,
      height: 0.1,
      metalness: 0.08,
      roughness: 0.36,
      width: 0.18,
    });

    popupRack.position.x = -0.42 + index * 0.28;
    popupScreen.position.set(-0.42 + index * 0.28, 0.16, 0.105);
    rackPopupModel.add(popupRack, popupScreen);

    for (let buttonIndex = 0; buttonIndex < 3; buttonIndex += 1) {
      const popupButton = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 10),
        buttonIndex === 0 ? accentMaterial.clone() : copperMaterial.clone(),
      );

      popupButton.position.set(
        -0.49 + index * 0.28 + buttonIndex * 0.04,
        -0.08,
        0.105,
      );
      rackPopupModel.add(popupButton);
    }
  }
  group.add(rackPopup);
  registerInspectablePart(partEntries, {
    meshes: protectionRackMeshes,
    meta: createPartMeta(unit, {
      category: "Protection",
      finding: "Protection relays and breaker IO channels are synchronized.",
      health: 98,
      id: "protection-rack",
      load: "36%",
      name: "Protection Relay Rack",
      recommendation: "Keep relay event capture enabled for grid switching tests.",
      signal: "99%",
      status: "normal",
      temperature: "35 C",
      vibration: "0.2 mm/s",
    }),
    popupGroup: rackPopup,
  });

  const controlBus = createCylinderMesh({
    color: 0xb45309,
    height: 2.7,
    metalness: 0.3,
    radius: 0.045,
    roughness: 0.4,
    segments: 16,
  });
  controlBus.rotation.z = Math.PI / 2;
  controlBus.position.set(-1.5, 2.2, -0.88);
  internalGroup.add(controlBus);
  const busbarMeshes = [controlBus];

  for (let index = 0; index < 3; index += 1) {
    const windowPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.42, 0.035),
      accentMaterial,
    );

    windowPanel.position.set(-2.65 + index * 0.78, 1.95, 1.58);
    group.add(windowPanel);
  }

  const busBar = createCylinderMesh({
    color: 0x67e8f9,
    height: 5.8,
    metalness: 0.24,
    radius: 0.065,
    roughness: 0.4,
    segments: 16,
  });
  busBar.rotation.z = Math.PI / 2;
  busBar.position.set(1.2, 3.2, 1.9);
  group.add(busBar);
  busbarMeshes.push(busBar);

  [-0.9, 1.2, 3.3].forEach((x) => {
    const { group: insulator, meshes } = createInsulatorStack({
      color: 0xdbeafe,
      height: 0.7,
      radius: 0.06,
      ringColor: 0x64748b,
    });
    const clamp = createBoxMesh({
      color: 0x94a3b8,
      depth: 0.22,
      height: 0.05,
      metalness: 0.34,
      roughness: 0.44,
      width: 0.3,
    });

    insulator.position.set(x, 2.78, 1.9);
    clamp.position.set(x, 3.16, 1.9);
    group.add(insulator, clamp);
    busbarMeshes.push(...meshes, clamp);
  });

  [-0.32, 0, 0.32].forEach((offset) => {
    const phaseLink = createCylinderMesh({
      color: offset === 0 ? 0x67e8f9 : 0xb45309,
      height: 2.2,
      metalness: 0.28,
      radius: 0.032,
      roughness: 0.38,
      segments: 14,
    });

    phaseLink.rotation.z = Math.PI / 2;
    phaseLink.position.set(2.24, 2.35 + offset, 0.32);
    internalGroup.add(phaseLink);
    busbarMeshes.push(phaseLink);

    const phaseClamp = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.008, 8, 18),
      steelMaterial,
    );

    phaseClamp.rotation.y = Math.PI / 2;
    phaseClamp.position.set(3.26, 2.35 + offset, 0.32);
    internalGroup.add(phaseClamp);
    busbarMeshes.push(phaseClamp);
  });

  const busbarPopup = createPartPopupShell({
    anchor: [1.2, 3.2, 1.9],
    color: 0x22d3ee,
    position: [4.68, 3.62, 2.82],
  });
  const busbarPopupModel = busbarPopup.userData.popupModel;
  [-0.18, 0, 0.18].forEach((y, index) => {
    const popupBus = createCylinderMesh({
      color: index === 1 ? 0x67e8f9 : 0xb45309,
      height: 0.96,
      metalness: 0.3,
      radius: 0.035,
      roughness: 0.38,
      segments: 16,
    });

    popupBus.rotation.z = Math.PI / 2;
    popupBus.position.y = y;
    busbarPopupModel.add(popupBus);

    [-0.32, 0.32].forEach((x) => {
      const popupClamp = new THREE.Mesh(
        new THREE.TorusGeometry(0.048, 0.006, 8, 18),
        steelMaterial.clone(),
      );

      popupClamp.rotation.y = Math.PI / 2;
      popupClamp.position.set(x, y, 0);
      busbarPopupModel.add(popupClamp);
    });
  });
  group.add(busbarPopup);
  registerInspectablePart(partEntries, {
    meshes: busbarMeshes,
    meta: createPartMeta(unit, {
      category: "Grid",
      finding: "Phase bus temperature and load balance are inside operating limits.",
      health: 99,
      id: "high-voltage-busbar",
      load: "79%",
      name: "High Voltage Busbar",
      recommendation: "Maintain infrared scan cadence after high-output intervals.",
      signal: "99%",
      status: "normal",
      temperature: "51 C",
      vibration: "0.1 mm/s",
    }),
    popupGroup: busbarPopup,
  });

  [-2.8, 3.8].forEach((x) => {
    const gantryPost = createCylinderMesh({
      color: 0x94a3b8,
      height: 2.45,
      metalness: 0.36,
      radius: 0.055,
      roughness: 0.45,
      segments: 12,
    });

    gantryPost.position.set(x, 1.85, 1.9);
    group.add(gantryPost);
  });

  const transformerMeshes = [];

  for (let index = 0; index < 3; index += 1) {
    const transformerGroup = new THREE.Group();
    const transformer = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.9, 1.35),
      darkMaterial,
    );
    const coil = createCylinderMesh({
      color: 0x1f2937,
      height: 1.15,
      metalness: 0.18,
      radius: 0.26,
      roughness: 0.54,
      segments: 20,
    });

    transformer.position.y = 0.52;
    transformer.castShadow = true;
    transformerGroup.add(transformer);
    cutawayMeshes.push(transformer);
    transformerMeshes.push(transformer);

    [-0.49, 0.49].forEach((x) => {
      for (let finIndex = 0; finIndex < 6; finIndex += 1) {
        const coolingFin = createBoxMesh({
          color: 0x0f172a,
          depth: 0.045,
          height: 0.64,
          metalness: 0.24,
          roughness: 0.54,
          width: 0.026,
        });

        coolingFin.position.set(x, 0.58, -0.45 + finIndex * 0.16);
        transformerGroup.add(coolingFin);
        transformerMeshes.push(coolingFin);
      }
    });

    for (let layerIndex = 0; layerIndex < 5; layerIndex += 1) {
      const lamination = createBoxMesh({
        color: layerIndex % 2 ? 0x334155 : 0x475569,
        depth: 0.018,
        height: 0.74,
        metalness: 0.26,
        roughness: 0.48,
        width: 0.54,
      });

      lamination.position.set(0, 0.62, -0.2 + layerIndex * 0.055);
      transformerGroup.add(lamination);
      transformerMeshes.push(lamination);
    }

    coil.rotation.x = Math.PI / 2;
    coil.position.set(0, 0.68, -0.72);
    coil.castShadow = true;
    transformerGroup.add(coil);
    transformerMeshes.push(coil);

    [-0.26, 0, 0.26].forEach((x) => {
      const insulator = createCylinderMesh({
        color: 0xdbeafe,
        height: 0.5,
        metalness: 0.02,
        radius: 0.055,
        roughness: 0.5,
        segments: 14,
      });

      insulator.position.set(x, 1.23, 0.54);
      transformerGroup.add(insulator);
      transformerMeshes.push(insulator);

      const { group: bushingStack, meshes } = createInsulatorStack({
        color: 0xdbeafe,
        height: 0.34,
        radius: 0.045,
        ringColor: 0x94a3b8,
      });

      bushingStack.position.set(x, 1.54, 0.54);
      transformerGroup.add(bushingStack);
      transformerMeshes.push(...meshes);
    });

    transformerGroup.position.set(1.1 + index * 1.35, 0.62, -1.2);
    group.add(transformerGroup);

    for (let coilIndex = 0; coilIndex < 3; coilIndex += 1) {
      const internalCoil = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.018, 8, 32),
        copperMaterial,
      );

      internalCoil.rotation.x = Math.PI / 2;
      internalCoil.position.set(
        1.1 + index * 1.35,
        1.08 + coilIndex * 0.16,
        -1.2,
      );
      internalGroup.add(internalCoil);
      transformerMeshes.push(internalCoil);
    }
  }

  const transformerPopup = createPartPopupShell({
    anchor: [2.45, 1.18, -1.2],
    color: 0xf59e0b,
    position: [4.88, 2.35, -2.76],
  });
  const transformerPopupModel = transformerPopup.userData.popupModel;
  const popupCore = createBoxMesh({
    color: 0x1f2937,
    depth: 0.3,
    height: 0.68,
    metalness: 0.24,
    roughness: 0.48,
    width: 0.36,
  });
  transformerPopupModel.add(popupCore);
  [-0.24, 0.24].forEach((x) => {
    for (let finIndex = 0; finIndex < 5; finIndex += 1) {
      const popupFin = createBoxMesh({
        color: 0x0f172a,
        depth: 0.028,
        height: 0.5,
        metalness: 0.24,
        roughness: 0.54,
        width: 0.018,
      });

      popupFin.position.set(x, 0, -0.18 + finIndex * 0.09);
      transformerPopupModel.add(popupFin);
    }
  });
  [-0.18, 0.18].forEach((x) => {
    for (let index = 0; index < 4; index += 1) {
      const winding = new THREE.Mesh(
        new THREE.TorusGeometry(0.16 + index * 0.012, 0.012, 8, 34),
        copperMaterial.clone(),
      );

      winding.rotation.y = Math.PI / 2;
      winding.position.set(x, -0.18 + index * 0.12, 0);
      transformerPopupModel.add(winding);
    }
  });
  group.add(transformerPopup);
  registerInspectablePart(partEntries, {
    meshes: transformerMeshes,
    meta: createPartMeta(unit, {
      category: "Transformer",
      finding: "Winding temperature spread and bushing signals remain balanced.",
      health: 97,
      id: "transformer-windings",
      load: "78%",
      name: "Transformer Windings",
      recommendation: "Track dissolved gas trend before seasonal peak loading.",
      signal: "98%",
      status: "normal",
      temperature: "67 C",
      vibration: "0.6 mm/s",
    }),
    popupGroup: transformerPopup,
  });

  const cableTrayMeshes = [];

  [-0.15, 0.15].forEach((z) => {
    const cableTray = createCylinderMesh({
      color: 0x38bdf8,
      height: 3.9,
      metalness: 0.16,
      radius: 0.025,
      roughness: 0.42,
      segments: 12,
    });

    cableTray.rotation.z = Math.PI / 2;
    cableTray.position.set(1.55, 1.72, -1.2 + z);
    internalGroup.add(cableTray);
    cableTrayMeshes.push(cableTray);
  });

  [-0.36, 0, 0.36].forEach((x) => {
    const trayClamp = createBoxMesh({
      color: 0x475569,
      depth: 0.36,
      height: 0.045,
      metalness: 0.24,
      roughness: 0.48,
      width: 0.12,
    });

    trayClamp.position.set(1.55 + x, 1.72, -1.2);
    internalGroup.add(trayClamp);
    cableTrayMeshes.push(trayClamp);
  });

  const cableTrayPopup = createPartPopupShell({
    anchor: [1.55, 1.72, -1.2],
    color: 0x38bdf8,
    position: [3.82, 1.86, -3.02],
  });
  const cableTrayPopupModel = cableTrayPopup.userData.popupModel;
  [-0.16, 0.16].forEach((z) => {
    const popupTray = createCylinderMesh({
      color: 0x38bdf8,
      height: 0.92,
      metalness: 0.16,
      radius: 0.026,
      roughness: 0.42,
      segments: 12,
    });

    popupTray.rotation.z = Math.PI / 2;
    popupTray.position.z = z;
    cableTrayPopupModel.add(popupTray);
  });
  group.add(cableTrayPopup);
  registerInspectablePart(partEntries, {
    meshes: cableTrayMeshes,
    meta: createPartMeta(unit, {
      category: "Electrical",
      finding: "Cable tray current and fiber telemetry are stable.",
      health: 99,
      id: "substation-cable-tray",
      load: "63%",
      name: "Cable Tray",
      recommendation: "Verify terminations during the next planned outage.",
      signal: "99%",
      status: "normal",
      temperature: "42 C",
      vibration: "0.1 mm/s",
    }),
    popupGroup: cableTrayPopup,
  });

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), beaconMaterial);
  beacon.position.set(3.1, 3.45, 1.9);
  group.add(beacon);
  group.add(internalGroup);

  const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.8, 0.045, 8, 112),
    ringMaterial,
  );
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.position.y = 0.12;
  selectionRing.visible = unit.status !== "normal";
  group.add(selectionRing);

  return {
    beacon,
    cutawayMeshes,
    group,
    internalGroup,
    parts: partEntries,
    selectionRing,
    unit,
  };
}

function getSubstationPosition(units) {
  const substation = units.find((unit) => unit.type === "Substation");

  return substation?.position ?? [0, 26];
}

function getAlarmMessage(unit) {
  if (unit.status === "warning") {
    return "Output derating and vibration trend above operating band.";
  }

  if (unit.status === "caution") {
    return "Yaw alignment variance detected during the last sampling window.";
  }

  if (unit.status === "offline") {
    return "Unit telemetry is unavailable.";
  }

  return "No active alarm";
}

function deriveHealth(baseHealth, status) {
  if (status === "warning") {
    return Math.min(baseHealth, 68);
  }

  if (status === "caution") {
    return Math.min(baseHealth, 84);
  }

  if (status === "offline") {
    return 0;
  }

  return baseHealth;
}

function deriveOutput(baseOutput, status) {
  if (status === "warning") {
    return Number((baseOutput * 0.48).toFixed(1));
  }

  if (status === "caution") {
    return Number((baseOutput * 0.78).toFixed(1));
  }

  if (status === "offline") {
    return 0;
  }

  return baseOutput;
}

function normalizeOperationalStatus(status) {
  if (status === "normal" || status === "caution" || status === "warning") {
    return status;
  }

  if (status === "danger" || status === "error") {
    return "warning";
  }

  if (status === "offline") {
    return "offline";
  }

  return "normal";
}

function getThreeStatusColor(status) {
  return STATUS_THEME[normalizeOperationalStatus(status)].color;
}

function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}
