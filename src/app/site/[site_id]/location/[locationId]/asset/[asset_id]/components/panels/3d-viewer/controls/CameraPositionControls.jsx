"use client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as THREE from "three";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Crosshair,
  Eye,
  EyeOff,
  Minus,
  Move3D,
  Plus,
  Save,
  Target,
} from "lucide-react";
import {
  ControlSection,
  RangeField,
  Vector3Fields,
  SegmentedButton,
} from "./control-fields";
import { CAMERA_PRESETS } from "../constants/cameraPresets";

const WORLD_UP_VECTOR = Object.freeze({ x: 0, y: 1, z: 0 });
const FALLBACK_FORWARD_VECTOR = Object.freeze({ x: 0, y: 0, z: -1 });
const DEFAULT_CALIBRATION_IMAGE_OPACITY = 0.55;
const CAMERA_ORB_INITIAL_ROTATION = Object.freeze({ x: -18, y: 28, z: -8 });
const DEFAULT_NUDGE_STEP_PRESETS = Object.freeze([
  { label: "Fine", value: 1 },
  { label: "Normal", value: 5 },
  { label: "Wide", value: 15 },
]);

export function CameraPositionControls({
  cameraPresets = CAMERA_PRESETS,
  config,
  defaultNudgeStep = 5,
  fovMax = 95,
  fovMin = 25,
  onChange,
  onSave,
  renderSection = true,
  showCalibrationHoldControls = true,
  showCalibrationVisibility = true,
  showCameraSelector = true,
  stepPresets = DEFAULT_NUDGE_STEP_PRESETS,
}) {
  const [selectedId, setSelectedId] = useState(config?.selectedCameraId || "1");
  const [nudgeStep, setNudgeStep] = useState(defaultNudgeStep);
  const selectedCameraId = config?.selectedCameraId;
  const availableCameraPresets = cameraPresets?.length
    ? cameraPresets
    : CAMERA_PRESETS;

  useEffect(() => {
    if (selectedCameraId) {
      setSelectedId(selectedCameraId);
    }
  }, [selectedCameraId]);

  const selectedCamera = availableCameraPresets.find(
    (cam) => cam.id === selectedId,
  );
  if (!selectedCamera) {
    return null;
  }

  const customPositions = config?.customPositions || {};
  const customTargets = config?.customTargets || {};
  const customFovs = config?.customFovs || {};
  const currentPosition = customPositions[selectedId] || selectedCamera.position;
  const currentTarget = customTargets[selectedId] || selectedCamera.target;
  const currentFov = customFovs[selectedId] ?? selectedCamera.fov ?? 60;
  const calibrationImageOpacity = clampCalibrationImageOpacity(
    config?.calibrationImageOpacity,
  );
  const isCalibrationImageHidden = config?.hideCalibrationImage === true;
  const isCalibrationMeshHidden = config?.hideCalibrationMesh === true;
  const activeComparison =
    config?.editComparison?.cameraId === selectedId
      ? config.editComparison
      : null;
  const savedPosition = activeComparison?.position ?? currentPosition;
  const savedTarget = activeComparison?.target ?? currentTarget;
  const savedFov = activeComparison?.fov ?? currentFov;
  const poseDelta = getCameraComparisonDelta({
    currentFov,
    currentPosition,
    currentTarget,
    previousFov: savedFov,
    previousPosition: savedPosition,
    previousTarget: savedTarget,
  });
  const hasPoseChanges = hasMeaningfulPoseChanges(poseDelta);

  const getEditComparison = () => {
    if (config?.editComparison?.cameraId === selectedId) {
      return config.editComparison;
    }

    return {
      cameraId: selectedId,
      fov: currentFov,
      position: cloneVector3(currentPosition),
      target: cloneVector3(currentTarget),
    };
  };

  const handleCameraSelect = (cameraId) => {
    setSelectedId(cameraId);
    onChange({
      ...config,
      editComparison: undefined,
      hideCalibrationImage: undefined,
      hideCalibrationMesh: undefined,
      selectedCameraId: cameraId,
      showAll: false,
    });
  };

  const handlePositionChange = (newPosition) => {
    onChange({
      ...config,
      editComparison: getEditComparison(),
      selectedCameraId: selectedId,
      showAll: false,
      customPositions: {
        ...customPositions,
        [selectedId]: newPosition,
      },
    });
  };

  const handleCalibrationImageOpacityChange = (nextOpacity) => {
    onChange({
      ...config,
      calibrationImageOpacity: clampCalibrationImageOpacity(nextOpacity),
      selectedCameraId: selectedId,
      showAll: false,
    });
  };

  const handleMomentaryCalibrationVisibilityChange = (key, hidden) => {
    const nextConfig = {
      ...config,
      selectedCameraId: selectedId,
      showAll: false,
    };

    if (hidden) {
      nextConfig[key] = true;
    } else {
      delete nextConfig[key];
    }

    onChange(nextConfig);
  };

  const handleFovChange = (newFov) => {
    onChange({
      ...config,
      editComparison: getEditComparison(),
      selectedCameraId: selectedId,
      showAll: false,
      customFovs: {
        ...customFovs,
        [selectedId]: newFov,
      },
    });
  };

  const handleTargetChange = (newTarget) => {
    onChange({
      ...config,
      editComparison: getEditComparison(),
      selectedCameraId: selectedId,
      showAll: false,
      customTargets: {
        ...customTargets,
        [selectedId]: newTarget,
      },
    });
  };

  const handleCameraPoseChange = ({ fov, position, target }) => {
    onChange({
      ...config,
      editComparison: getEditComparison(),
      selectedCameraId: selectedId,
      showAll: false,
      customFovs:
        fov === undefined
          ? customFovs
          : {
              ...customFovs,
              [selectedId]: fov,
            },
      customPositions: position
        ? {
            ...customPositions,
            [selectedId]: position,
          }
        : customPositions,
      customTargets: target
        ? {
            ...customTargets,
            [selectedId]: target,
          }
        : customTargets,
    });
  };

  const moveCamera = ({ right = 0, up = 0 }) => {
    const basis = getCameraBasis(currentPosition, currentTarget);
    const offset = addVectors(
      scaleVector(basis.right, nudgeStep * right),
      scaleVector(basis.up, nudgeStep * up),
    );

    handleCameraPoseChange({
      position: addVectors(currentPosition, offset),
      target: addVectors(currentTarget, offset),
    });
  };

  const translateCamera = (axis, direction) => {
    moveCamera({ [axis]: direction });
  };

  const dollyCamera = (direction) => {
    const basis = getCameraBasis(currentPosition, currentTarget);
    const offset = scaleVector(basis.forward, nudgeStep * direction);

    handleCameraPoseChange({
      position: addVectors(currentPosition, offset),
    });
  };

  const aimCamera = ({ pitch = 0, yaw = 0 }) => {
    const basis = getCameraBasis(currentPosition, currentTarget);
    const currentDirection = subtractVectors(currentTarget, currentPosition);
    const yawedDirection = rotateVectorAroundAxis(
      currentDirection,
      WORLD_UP_VECTOR,
      degreesToRadians(yaw),
    );
    const pitchedDirection = rotateVectorAroundAxis(
      yawedDirection,
      basis.right,
      degreesToRadians(pitch),
    );

    handleCameraPoseChange({
      target: addVectors(currentPosition, pitchedDirection),
    });
  };

  const handleResetCamera = () => {
    const { [selectedId]: _, ...restPositions } = customPositions;
    const { [selectedId]: __, ...restFovs } = customFovs;
    const { [selectedId]: ___, ...restTargets } = customTargets;
    onChange({
      ...config,
      editComparison: getEditComparison(),
      selectedCameraId: selectedId,
      showAll: false,
      customPositions: restPositions,
      customFovs: restFovs,
      customTargets: restTargets,
    });
  };

  const handleSaveCameraPose = async () => {
    const baseConfig = getCameraVisualizationWithoutTransientOptions(config);
    const nextCameraVisualization = {
      ...baseConfig,
      enabled: true,
      selectedCameraId: selectedId,
      showAll: false,
      customPositions: {
        ...customPositions,
        [selectedId]: cloneVector3(currentPosition),
      },
      customFovs: {
        ...customFovs,
        [selectedId]: toFiniteNumber(currentFov, selectedCamera.fov ?? 60),
      },
      customTargets: {
        ...customTargets,
        [selectedId]: cloneVector3(currentTarget),
      },
    };

    try {
      if (onSave) {
        await onSave(nextCameraVisualization);
      } else {
        await onChange(nextCameraVisualization);
      }
      toast.success(`${selectedCamera.name} 카메라 설정이 저장되었습니다.`);
    } catch (error) {
      console.error("Failed to save camera pose.", error);
      toast.error("카메라 설정 저장에 실패했습니다.");
    }
  };

  const isCustomized =
    customPositions[selectedId] !== undefined ||
    customFovs[selectedId] !== undefined ||
    customTargets[selectedId] !== undefined;

  if (!showCameraSelector && !selectedCameraId) {
    return null;
  }

  const body = (
    <>
      {showCameraSelector ? (
      <div className="CameraPositionControls__cameras grid grid-cols-3 gap-1">
        {availableCameraPresets.map((camera) => (
          <SegmentedButton
            key={camera.id}
            active={selectedId === camera.id}
            onClick={() => handleCameraSelect(camera.id)}
            title={camera.name}
          >
            CAM {camera.id}
          </SegmentedButton>
        ))}
      </div>
      ) : null}

      <CameraPoseSummary
        cameraName={selectedCamera.name}
        currentFov={currentFov}
        currentPosition={currentPosition}
        currentTarget={currentTarget}
        delta={poseDelta}
        hasChanges={hasPoseChanges}
        isCustomized={isCustomized}
        onReset={handleResetCamera}
        savedFov={savedFov}
        savedPosition={savedPosition}
        savedTarget={savedTarget}
      />

      {showCalibrationVisibility ? (
      <CameraCalibrationVisibilityControls
        imageHidden={isCalibrationImageHidden}
        imageOpacity={calibrationImageOpacity}
        meshHidden={isCalibrationMeshHidden}
        onImageHoldChange={(hidden) =>
          handleMomentaryCalibrationVisibilityChange(
            "hideCalibrationImage",
            hidden,
          )
        }
        onImageOpacityChange={handleCalibrationImageOpacityChange}
        onMeshHoldChange={(hidden) =>
          handleMomentaryCalibrationVisibilityChange(
            "hideCalibrationMesh",
            hidden,
          )
        }
        showHoldControls={showCalibrationHoldControls}
      />
      ) : null}
      <CameraPoseNudgeControls
        step={nudgeStep}
        onAim={aimCamera}
        onDolly={dollyCamera}
        onMove={moveCamera}
        onStepChange={setNudgeStep}
        onTranslate={translateCamera}
        stepPresets={stepPresets}
      />
      <CameraPoseAdvancedFields
        position={currentPosition}
        target={currentTarget}
        onPositionChange={handlePositionChange}
        onTargetChange={handleTargetChange}
      />
      <RangeField
        label="FOV"
        max={fovMax}
        min={fovMin}
        onChange={handleFovChange}
        step={1}
        suffix="°"
        value={currentFov}
      />
      <CameraPoseSaveButton onClick={handleSaveCameraPose} />
    </>
  );

  if (!renderSection) {
    return body;
  }

  return (
    <ControlSection icon={Crosshair} title="카메라 위치 / 화각">
      {body}
    </ControlSection>
  );
}

function CameraPoseSummary({
  cameraName,
  currentFov,
  currentPosition,
  currentTarget,
  delta,
  hasChanges,
  isCustomized,
  onReset,
  savedFov,
  savedPosition,
  savedTarget,
}) {
  return (
    <div className="CameraPositionControls__pose-summary grid gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/[0.06] p-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="grid min-w-0 gap-0.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Camera className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
            <span className="min-w-0 truncate">{cameraName}</span>
          </span>
          <span className="truncate text-[10px] font-semibold text-muted-foreground">
            {hasChanges ? "Unsaved changes" : "Saved pose"}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={[
              "rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
              hasChanges
                ? "border-amber-300/45 bg-amber-300/15 text-amber-500"
                : "border-cyan-300/35 bg-cyan-300/10 text-cyan-500",
            ].join(" ")}
          >
            {hasChanges ? "Editing" : "Saved"}
          </span>
          {isCustomized ? (
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 rounded-sm border border-cyan-300/40 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-200 transition hover:bg-cyan-300/20"
              title="Reset camera pose"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <CameraPoseDeltaChip
          icon={Move3D}
          label="Position"
          value={formatDistanceDelta(delta.distance)}
        />
        <CameraPoseDeltaChip
          icon={Target}
          label="Aim"
          value={`${formatNumber(delta.angle)}deg`}
        />
        <CameraPoseDeltaChip
          icon={Eye}
          label="FOV"
          value={`${formatSignedNumber(delta.fov)}deg`}
        />
      </div>

      <div className="grid gap-1 rounded-md border border-border/60 bg-background p-1.5">
        <CameraPoseSnapshotRow
          fov={savedFov}
          label="Saved"
          position={savedPosition}
          target={savedTarget}
        />
        {hasChanges ? (
          <CameraPoseSnapshotRow
            fov={currentFov}
            label="Editing"
            position={currentPosition}
            target={currentTarget}
            strong
          />
        ) : null}
      </div>
    </div>
  );
}

function CameraPoseDeltaChip({ icon: Icon, label, value }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-md border border-border/60 bg-background px-1.5 py-1.5">
      <span className="inline-flex min-w-0 items-center gap-1 text-[9px] font-semibold uppercase text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">Delta {label}</span>
      </span>
      <span className="min-w-0 truncate font-mono text-[10px] font-semibold text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}

function CameraPoseSnapshotRow({ fov, label, position, strong = false, target }) {
  return (
    <div
      className={[
        "grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem] items-center gap-1.5 rounded-sm px-1.5 py-1 text-[10px]",
        strong ? "bg-cyan-300/10 text-foreground" : "text-muted-foreground",
      ].join(" ")}
    >
      <span className="truncate font-semibold">{label}</span>
      <span className="min-w-0 truncate font-mono" title={formatVectorBrief(position)}>
        P {formatVectorBrief(position)}
      </span>
      <span className="min-w-0 truncate font-mono" title={formatVectorBrief(target)}>
        A {formatVectorBrief(target)}
      </span>
      <span className="truncate text-right font-mono">{formatNumber(fov)}deg</span>
    </div>
  );
}

function CameraPoseStatusChip({ icon: Icon, label, value }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-md border border-border/60 bg-background px-1.5 py-1.5">
      <span className="inline-flex min-w-0 items-center gap-1 text-[9px] font-semibold uppercase text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className="min-w-0 truncate font-mono text-[10px] font-semibold text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}

function CameraPoseSaveButton({ onClick }) {
  return (
    <button
      type="button"
      className="CameraPositionControls__save-1 inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      title="카메라 위치 저장"
      onClick={onClick}
    >
      <Save className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">저장</span>
    </button>
  );
}

function CameraCalibrationVisibilityControls({
  imageHidden,
  imageOpacity,
  meshHidden,
  onImageHoldChange,
  onImageOpacityChange,
  onMeshHoldChange,
  showHoldControls = true,
}) {
  return (
    <div className="CameraPositionControls__visibility grid gap-2 rounded-md border border-border/60 bg-card p-2">
      {showHoldControls ? (
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <span className="truncate text-[10px] font-semibold text-muted-foreground">
          Hold hide
        </span>
        <div className="grid min-w-0 grid-cols-2 gap-1.5">
          <HoldVisibilityButton
            active={meshHidden}
            label="Mesh"
            title="Hold to hide mesh"
            onHoldChange={onMeshHoldChange}
          />
          <HoldVisibilityButton
            active={imageHidden}
            label="Image"
            title="Hold to hide camera image"
            onHoldChange={onImageHoldChange}
          />
        </div>
      </div>
      ) : null}
      <RangeField
        label="Image opacity"
        max={100}
        min={10}
        onChange={(percent) => onImageOpacityChange(percent / 100)}
        step={5}
        suffix="%"
        value={Math.round(imageOpacity * 100)}
      />
    </div>
  );
}

function HoldVisibilityButton({ active, label, onHoldChange, title }) {
  const handleHoldStart = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onHoldChange(true);
  };
  const handleHoldEnd = (event) => {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onHoldChange(false);
  };
  const handleKeyDown = (event) => {
    if (event.repeat || (event.key !== " " && event.key !== "Enter")) {
      return;
    }

    event.preventDefault();
    onHoldChange(true);
  };
  const handleKeyUp = (event) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onHoldChange(false);
  };

  return (
    <button
      type="button"
      className={[
        "CameraPositionControls__hold-button inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition",
        active
          ? "border-cyan-300 bg-cyan-300 text-slate-950"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      ].join(" ")}
      title={title}
      onBlur={() => onHoldChange(false)}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onPointerCancel={handleHoldEnd}
      onPointerDown={handleHoldStart}
      onPointerLeave={() => onHoldChange(false)}
      onPointerUp={handleHoldEnd}
    >
      {active ? (
        <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function CameraVectorField({ icon: Icon, label, labels, onChange, value }) {
  return (
    <div className="CameraPositionControls__vector-field grid gap-1.5 rounded-md border border-border/60 bg-background p-2">
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <Vector3Fields labels={labels} value={value} onChange={onChange} />
    </div>
  );
}

function CameraPoseAdvancedFields({
  onPositionChange,
  onTargetChange,
  position,
  target,
}) {
  return (
    <div className="CameraPositionControls__coordinates grid gap-2 rounded-md border border-border/60 bg-card p-2">
      <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <Crosshair className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">Coordinates</span>
      </div>
      <div className="grid gap-2">
        <CameraVectorField
          icon={Camera}
          label="Camera position"
          labels={["X", "Y", "Z"]}
          value={position}
          onChange={onPositionChange}
        />
        <CameraVectorField
          icon={Target}
          label="Aim target"
          labels={["X", "Y", "Z"]}
          value={target}
          onChange={onTargetChange}
        />
      </div>
    </div>
  );
}

function CameraPoseNudgeControls({
  onAim,
  onDolly,
  onMove,
  onStepChange,
  onTranslate,
  step,
  stepPresets = DEFAULT_NUDGE_STEP_PRESETS,
}) {
  const safeStep = Math.max(0.001, toFiniteNumber(step, 5));
  const resolvedStepPresets = stepPresets?.length
    ? stepPresets
    : DEFAULT_NUDGE_STEP_PRESETS;
  const [mode, setMode] = useState("move");
  const aimStep = getAimStepDegrees(safeStep);
  const isMoveMode = mode === "move";
  const activeModeLabel = isMoveMode ? "Camera position" : "Aim target";

  return (
    <div className="CameraPositionControls__nudge grid gap-2 rounded-md border border-primary/20 bg-primary/5 p-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-foreground">
          {isMoveMode ? (
            <Move3D className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
          ) : (
            <Target className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          )}
          <span className="min-w-0 truncate">{activeModeLabel}</span>
        </span>
        <span className="shrink-0 rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
          {formatNumber(safeStep)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-background p-1">
        <SegmentedButton
          active={isMoveMode}
          title="Move camera position"
          onClick={() => setMode("move")}
        >
          <span className="inline-flex min-w-0 items-center justify-center gap-1">
            <Move3D className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Move</span>
          </span>
        </SegmentedButton>
        <SegmentedButton
          active={!isMoveMode}
          title="Aim camera view"
          onClick={() => setMode("aim")}
        >
          <span className="inline-flex min-w-0 items-center justify-center gap-1">
            <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Aim</span>
          </span>
        </SegmentedButton>
      </div>

      <CameraPoseOrbControl
        onAim={onAim}
        onMove={onMove}
        mode={mode}
        step={safeStep}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_4.25rem] gap-2">
        <NudgePad
          label={activeModeLabel}
          onDown={() =>
            isMoveMode
              ? onTranslate("up", -1)
              : onAim({ pitch: -aimStep })
          }
          onLeft={() =>
            isMoveMode
              ? onTranslate("right", -1)
              : onAim({ yaw: aimStep })
          }
          onRight={() =>
            isMoveMode
              ? onTranslate("right", 1)
              : onAim({ yaw: -aimStep })
          }
          onUp={() =>
            isMoveMode
              ? onTranslate("up", 1)
              : onAim({ pitch: aimStep })
          }
        />
        <div className="grid min-w-0 content-end gap-1">
          <NudgeButton title="Move camera closer" onClick={() => onDolly(1)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[10px] font-semibold">Near</span>
          </NudgeButton>
          <NudgeButton title="Move camera farther" onClick={() => onDolly(-1)}>
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[10px] font-semibold">Far</span>
          </NudgeButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {resolvedStepPresets.map((preset) => (
          <StepPresetButton
            key={`${preset.label}-${preset.value}`}
            active={Math.abs(safeStep - preset.value) < 0.0001}
            label={preset.label}
            onClick={() => onStepChange(preset.value)}
          />
        ))}
      </div>
    </div>
  );
}

function CameraPoseOrbControl({ mode, onAim, onMove, step }) {
  const lastPointRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [orbRotation, setOrbRotation] = useState(CAMERA_ORB_INITIAL_ROTATION);
  const isMoveMode = mode === "move";
  const dragDegreesPerPixel = getOrbAimDragDegreesPerPixel(step);
  const dragMoveUnitsPerPixel = getOrbMoveDragUnitsPerPixel(step);
  const title = isMoveMode ? "Move sphere" : "Aim sphere";
  const activeIcon = isMoveMode ? Move3D : Target;
  const ActiveIcon = activeIcon;

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    lastPointRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    setDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!lastPointRef.current) {
      return;
    }

    event.preventDefault();
    const dx = event.clientX - lastPointRef.current.x;
    const dy = event.clientY - lastPointRef.current.y;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      return;
    }

    lastPointRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    setOrbRotation((currentRotation) => ({
      x: currentRotation.x - dy * 0.35,
      y: currentRotation.y + dx * 0.35,
      z: currentRotation.z + dx * 0.08 - dy * 0.04,
    }));

    if (isMoveMode) {
      onMove({
        right: dx * dragMoveUnitsPerPixel,
        up: -dy * dragMoveUnitsPerPixel,
      });
      return;
    }

    onAim({
      pitch: -dy * dragDegreesPerPixel,
      yaw: -dx * dragDegreesPerPixel,
    });
  };

  const handlePointerEnd = (event) => {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    lastPointRef.current = null;
    setDragging(false);
  };

  const handleKeyDown = (event) => {
    const keyToMotion = {
      ArrowDown: isMoveMode
        ? { move: { up: -0.35 } }
        : { aim: { pitch: -getAimStepDegrees(step) } },
      ArrowLeft: isMoveMode
        ? { move: { right: -0.35 } }
        : { aim: { yaw: getAimStepDegrees(step) } },
      ArrowRight: isMoveMode
        ? { move: { right: 0.35 } }
        : { aim: { yaw: -getAimStepDegrees(step) } },
      ArrowUp: isMoveMode
        ? { move: { up: 0.35 } }
        : { aim: { pitch: getAimStepDegrees(step) } },
    };
    const motion = keyToMotion[event.key];

    if (!motion) {
      return;
    }

    event.preventDefault();
    setOrbRotation((currentRotation) => ({
      x:
        currentRotation.x +
        (motion.aim?.pitch ?? toFiniteNumber(motion.move?.up)) * 1.6,
      y:
        currentRotation.y -
        (motion.aim?.yaw ?? -toFiniteNumber(motion.move?.right)) * 1.6,
      z:
        currentRotation.z +
        (motion.aim?.yaw ?? toFiniteNumber(motion.move?.right)) * 0.35,
    }));

    if (motion.move) {
      onMove(motion.move);
      return;
    }

    onAim(motion.aim);
  };

  return (
    <div className="CameraPoseOrbControl grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-cyan-300/25 bg-background/80 p-2">
      <button
        type="button"
        className={[
          "CameraPoseOrbControl__sphere-shell relative grid aspect-square h-[5.75rem] touch-none select-none place-items-center overflow-hidden rounded-full border border-cyan-200/45 bg-slate-950",
          "shadow-[inset_-18px_-20px_28px_rgba(2,6,23,0.88),inset_10px_10px_18px_rgba(255,255,255,0.16),0_10px_22px_rgba(8,47,73,0.35)] outline-none transition",
          dragging
            ? "cursor-grabbing border-cyan-200 ring-2 ring-cyan-300/35"
            : "cursor-grab hover:border-cyan-200/80 focus-visible:ring-2 focus-visible:ring-cyan-300/45",
        ].join(" ")}
        aria-label={title}
        title={title}
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          if (!dragging) {
            lastPointRef.current = null;
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
      >
        <CameraPoseOrbScene
          dragging={dragging}
          mode={mode}
          rotation={orbRotation}
        />
        <span className="relative grid h-8 w-8 place-items-center rounded-full border border-white/35 bg-slate-950/65 text-cyan-100 shadow-[0_0_18px_rgba(125,211,252,0.38)]">
          <ActiveIcon className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
          <span className="min-w-0 truncate text-[11px] font-semibold text-foreground">
            {title}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {isMoveMode ? (
            <>
              <CameraPoseStatusChip
                icon={ArrowRight}
                label="Right"
                value={formatNumber(dragMoveUnitsPerPixel * 10)}
              />
              <CameraPoseStatusChip
                icon={ArrowUp}
                label="Up"
                value={formatNumber(dragMoveUnitsPerPixel * 10)}
              />
            </>
          ) : (
            <>
              <CameraPoseStatusChip
                icon={ArrowLeft}
                label="Yaw"
                value={`${formatNumber(dragDegreesPerPixel * 10)}deg`}
              />
              <CameraPoseStatusChip
                icon={ArrowUp}
                label="Pitch"
                value={`${formatNumber(dragDegreesPerPixel * 10)}deg`}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CameraPoseOrbScene({ dragging, mode, rotation }) {
  const hostRef = useRef(null);
  const sceneStateRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0, 4.8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = "h-full w-full";
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      clearcoat: 0.82,
      clearcoatRoughness: 0.18,
      color: mode === "move" ? 0x22d3ee : 0xfbbf24,
      emissive: mode === "move" ? 0x083344 : 0x451a03,
      emissiveIntensity: 0.28,
      metalness: 0.22,
      roughness: 0.27,
      transmission: 0,
    });
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 72, 40),
      sphereMaterial,
    );
    group.add(sphere);

    const ringMaterial = new THREE.LineBasicMaterial({
      color: mode === "move" ? 0xbae6fd : 0xfef3c7,
      transparent: true,
      opacity: 0.66,
    });
    const accentRingMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
    });
    group.add(createOrbRing(ringMaterial, { x: 0, y: 0, z: 0 }));
    group.add(createOrbRing(ringMaterial, { x: Math.PI / 2, y: 0, z: 0 }));
    group.add(createOrbRing(ringMaterial, { x: 0, y: Math.PI / 2, z: 0 }));
    group.add(createOrbRing(accentRingMaterial, { x: 0.72, y: 0.38, z: 0.2 }));
    group.add(createOrbRing(accentRingMaterial, { x: -0.52, y: 0.2, z: 0.72 }));

    const highlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.72,
      }),
    );
    highlight.position.set(-0.42, 0.55, 0.96);
    group.add(highlight);

    scene.add(new THREE.AmbientLight(0x8fb8d8, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-2.4, 3.1, 3.6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(2.7, -1.9, 2.1);
    scene.add(rimLight);

    const renderScene = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(renderScene);
    resizeObserver.observe(host);

    sceneStateRef.current = {
      accentRingMaterial,
      camera,
      group,
      renderScene,
      renderer,
      ringMaterial,
      scene,
      sphere,
      sphereMaterial,
    };
    renderScene();

    return () => {
      resizeObserver.disconnect();
      sceneStateRef.current = null;
      disposeThreeObject(group);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const sceneState = sceneStateRef.current;

    if (!sceneState) {
      return;
    }

    const isMoveMode = mode === "move";
    sceneState.group.rotation.set(
      degreesToRadians(rotation.x),
      degreesToRadians(rotation.y),
      degreesToRadians(rotation.z),
    );
    sceneState.group.scale.setScalar(dragging ? 1.08 : 1);
    sceneState.sphereMaterial.color.set(isMoveMode ? 0x22d3ee : 0xfbbf24);
    sceneState.sphereMaterial.emissive.set(isMoveMode ? 0x083344 : 0x451a03);
    sceneState.sphereMaterial.emissiveIntensity = dragging ? 0.45 : 0.28;
    sceneState.ringMaterial.color.set(isMoveMode ? 0xbae6fd : 0xfef3c7);
    sceneState.ringMaterial.opacity = dragging ? 0.88 : 0.66;
    sceneState.accentRingMaterial.opacity = dragging ? 0.56 : 0.38;
    sceneState.renderScene();
  }, [dragging, mode, rotation.x, rotation.y, rotation.z]);

  return (
    <span
      ref={hostRef}
      className="CameraPoseOrbControl__sphere absolute inset-1 rounded-full"
      aria-hidden="true"
    />
  );
}

function StepPresetButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      className={[
        "h-7 min-w-0 rounded-sm border px-1.5 text-[10px] font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function NudgePad({ label, onDown, onLeft, onRight, onUp }) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="truncate text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="grid grid-cols-3 gap-1">
        <span aria-hidden="true" />
        <NudgeIconButton title={`${label} up`} onClick={onUp}>
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </NudgeIconButton>
        <span aria-hidden="true" />
        <NudgeIconButton title={`${label} left`} onClick={onLeft}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </NudgeIconButton>
        <span aria-hidden="true" />
        <NudgeIconButton title={`${label} right`} onClick={onRight}>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </NudgeIconButton>
        <span aria-hidden="true" />
        <NudgeIconButton title={`${label} down`} onClick={onDown}>
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </NudgeIconButton>
        <span aria-hidden="true" />
      </div>
    </div>
  );
}

function NudgeIconButton({ children, onClick, title }) {
  const pressHandlers = usePressRepeat(onClick);

  return (
    <button
      type="button"
      className="grid h-7 min-w-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
      title={title}
      {...pressHandlers}
    >
      {children}
    </button>
  );
}

function NudgeButton({ children, onClick, title }) {
  const pressHandlers = usePressRepeat(onClick);

  return (
    <button
      type="button"
      className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
      title={title}
      {...pressHandlers}
    >
      {children}
    </button>
  );
}

function usePressRepeat(onPress) {
  const onPressRef = useRef(onPress);
  const timersRef = useRef({ delay: null, repeat: null });

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => () => clearPressRepeatTimers(timersRef), []);

  const startPress = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    clearPressRepeatTimers(timersRef);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onPressRef.current?.();
    timersRef.current.delay = window.setTimeout(() => {
      timersRef.current.repeat = window.setInterval(() => {
        onPressRef.current?.();
      }, 70);
    }, 180);
  };

  const stopPress = (event) => {
    event.preventDefault();
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    clearPressRepeatTimers(timersRef);
  };

  const handleKeyDown = (event) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onPressRef.current?.();
  };

  const handleKeyUp = (event) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
  };

  return {
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onLostPointerCapture: stopPress,
    onPointerCancel: stopPress,
    onPointerDown: startPress,
    onPointerLeave: stopPress,
    onPointerUp: stopPress,
  };
}

function clearPressRepeatTimers(timersRef) {
  if (timersRef.current.delay !== null) {
    window.clearTimeout(timersRef.current.delay);
    timersRef.current.delay = null;
  }

  if (timersRef.current.repeat !== null) {
    window.clearInterval(timersRef.current.repeat);
    timersRef.current.repeat = null;
  }
}

function createOrbRing(material, rotation) {
  const points = [];
  const radius = 1.205;

  for (let index = 0; index < 128; index += 1) {
    const angle = (index / 128) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      ),
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const ring = new THREE.LineLoop(geometry, material);
  ring.rotation.set(rotation.x, rotation.y, rotation.z);
  return ring;
}

function disposeThreeObject(object) {
  const disposedMaterials = new Set();

  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => {
        if (!disposedMaterials.has(material)) {
          material.dispose();
          disposedMaterials.add(material);
        }
      });
      return;
    }

    if (child.material && !disposedMaterials.has(child.material)) {
      child.material.dispose();
      disposedMaterials.add(child.material);
    }
  });
}

function getCameraComparisonDelta({
  currentFov,
  currentPosition,
  currentTarget,
  previousFov,
  previousPosition,
  previousTarget,
}) {
  const x =
    toFiniteNumber(currentPosition?.x) - toFiniteNumber(previousPosition?.x);
  const y =
    toFiniteNumber(currentPosition?.y) - toFiniteNumber(previousPosition?.y);
  const z =
    toFiniteNumber(currentPosition?.z) - toFiniteNumber(previousPosition?.z);
  const currentDirection = getCameraDirection(currentPosition, currentTarget);
  const previousDirection = getCameraDirection(previousPosition, previousTarget);

  return {
    angle: getDirectionAngleDelta(currentDirection, previousDirection),
    distance: Math.hypot(x, y, z),
    fov: toFiniteNumber(currentFov) - toFiniteNumber(previousFov),
    x,
    y,
    z,
  };
}

function hasMeaningfulPoseChanges(delta) {
  return (
    Math.abs(delta.distance) > 0.001 ||
    Math.abs(delta.angle) > 0.01 ||
    Math.abs(delta.fov) > 0.001
  );
}

function getCameraBasis(position, target) {
  const forward = normalizeVector(
    subtractVectors(target, position),
    FALLBACK_FORWARD_VECTOR,
  );
  const upSeed =
    Math.abs(dotVectors(forward, WORLD_UP_VECTOR)) > 0.96
      ? { x: 0, y: 0, z: 1 }
      : WORLD_UP_VECTOR;
  const right = normalizeVector(crossVectors(forward, upSeed), {
    x: 1,
    y: 0,
    z: 0,
  });
  const up = normalizeVector(crossVectors(right, forward), WORLD_UP_VECTOR);

  return {
    forward,
    right,
    up,
  };
}

function addVectors(first, second) {
  return {
    x: toFiniteNumber(first?.x) + toFiniteNumber(second?.x),
    y: toFiniteNumber(first?.y) + toFiniteNumber(second?.y),
    z: toFiniteNumber(first?.z) + toFiniteNumber(second?.z),
  };
}

function subtractVectors(first, second) {
  return {
    x: toFiniteNumber(first?.x) - toFiniteNumber(second?.x),
    y: toFiniteNumber(first?.y) - toFiniteNumber(second?.y),
    z: toFiniteNumber(first?.z) - toFiniteNumber(second?.z),
  };
}

function scaleVector(vector, scale) {
  return {
    x: toFiniteNumber(vector?.x) * scale,
    y: toFiniteNumber(vector?.y) * scale,
    z: toFiniteNumber(vector?.z) * scale,
  };
}

function normalizeVector(vector, fallback) {
  const length = getVectorLength(vector);

  if (length <= 0.000001) {
    return { ...fallback };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function crossVectors(first, second) {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function dotVectors(first, second) {
  return (
    toFiniteNumber(first?.x) * toFiniteNumber(second?.x) +
    toFiniteNumber(first?.y) * toFiniteNumber(second?.y) +
    toFiniteNumber(first?.z) * toFiniteNumber(second?.z)
  );
}

function rotateVectorAroundAxis(vector, axis, radians) {
  const unitAxis = normalizeVector(axis, WORLD_UP_VECTOR);
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const dot = dotVectors(unitAxis, vector);
  const cross = crossVectors(unitAxis, vector);

  return {
    x:
      vector.x * cosine +
      cross.x * sine +
      unitAxis.x * dot * (1 - cosine),
    y:
      vector.y * cosine +
      cross.y * sine +
      unitAxis.y * dot * (1 - cosine),
    z:
      vector.z * cosine +
      cross.z * sine +
      unitAxis.z * dot * (1 - cosine),
  };
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getCameraDirection(position, target) {
  return {
    x: toFiniteNumber(target?.x) - toFiniteNumber(position?.x),
    y: toFiniteNumber(target?.y) - toFiniteNumber(position?.y),
    z: toFiniteNumber(target?.z) - toFiniteNumber(position?.z),
  };
}

function getDirectionAngleDelta(currentDirection, previousDirection) {
  const currentLength = getVectorLength(currentDirection);
  const previousLength = getVectorLength(previousDirection);

  if (currentLength <= 0 || previousLength <= 0) {
    return 0;
  }

  const dot =
    currentDirection.x * previousDirection.x +
    currentDirection.y * previousDirection.y +
    currentDirection.z * previousDirection.z;
  const cosine = Math.min(
    1,
    Math.max(-1, dot / (currentLength * previousLength)),
  );

  return (Math.acos(cosine) * 180) / Math.PI;
}

function getVectorLength(vector) {
  return Math.hypot(
    toFiniteNumber(vector?.x),
    toFiniteNumber(vector?.y),
    toFiniteNumber(vector?.z),
  );
}

function cloneVector3(vector) {
  return {
    x: toFiniteNumber(vector?.x),
    y: toFiniteNumber(vector?.y),
    z: toFiniteNumber(vector?.z),
  };
}

function getCameraVisualizationWithoutTransientOptions(config) {
  const nextConfig = { ...(config ?? {}) };
  delete nextConfig.editComparison;
  delete nextConfig.hideCalibrationImage;
  delete nextConfig.hideCalibrationMesh;
  return nextConfig;
}

function getAimStepDegrees(moveStep) {
  return Math.min(6, Math.max(0.5, toFiniteNumber(moveStep, 5) * 0.4));
}

function getOrbAimDragDegreesPerPixel(moveStep) {
  return Math.min(0.14, Math.max(0.045, getAimStepDegrees(moveStep) / 24));
}

function getOrbMoveDragUnitsPerPixel(moveStep) {
  return Math.min(0.02, Math.max(0.012, toFiniteNumber(moveStep, 5) / 300));
}

function formatSignedNumber(value) {
  const roundedValue = formatNumber(value);
  return value > 0 ? `+${roundedValue}` : roundedValue;
}

function formatDistanceDelta(value) {
  return toFiniteNumber(value) > 0.001 ? formatNumber(value) : "0";
}

function formatNumber(value) {
  const numericValue = toFiniteNumber(value);
  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2);
}

function formatVectorBrief(vector) {
  return ["x", "y", "z"]
    .map((axis) => formatCompactNumber(vector?.[axis]))
    .join(", ");
}

function formatCompactNumber(value) {
  const numericValue = toFiniteNumber(value);

  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }

  return numericValue.toFixed(1);
}

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clampCalibrationImageOpacity(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_CALIBRATION_IMAGE_OPACITY;
  }

  return Math.min(1, Math.max(0.1, numericValue));
}
