"use client";

import { useCallback, useEffect, useState } from "react";

export const DEFAULT_THERMAL_ALIGNMENT = {
  positionX: 0,
  positionY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 0.6,
  targetMeshId: null,
  targetMeshName: null,
  uvOffsetX: 0,
  uvOffsetY: 0,
  uvScaleX: 1,
  uvScaleY: 1,
};

export const THERMAL_ALIGNMENT_STORAGE_KEY =
  "checklab:thermal-mapping:alignment:v1";

export function useThermalAlignment({
  storageKey = THERMAL_ALIGNMENT_STORAGE_KEY,
} = {}) {
  const [alignmentsByCameraId, setAlignmentsByCameraId] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAlignmentsByCameraId(readStoredAlignments(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(alignmentsByCameraId),
    );
  }, [alignmentsByCameraId, hydrated, storageKey]);

  const getAlignment = useCallback(
    (cameraId) => ({
      ...DEFAULT_THERMAL_ALIGNMENT,
      ...(cameraId ? alignmentsByCameraId[cameraId] : null),
    }),
    [alignmentsByCameraId],
  );

  const updateAlignment = useCallback((cameraId, patch) => {
    if (!cameraId || !patch) {
      return;
    }

    setAlignmentsByCameraId((currentAlignments) => ({
      ...currentAlignments,
      [cameraId]: normalizeAlignment({
        ...DEFAULT_THERMAL_ALIGNMENT,
        ...currentAlignments[cameraId],
        ...patch,
      }),
    }));
  }, []);

  const resetAlignment = useCallback((cameraId) => {
    if (!cameraId) {
      return;
    }

    setAlignmentsByCameraId((currentAlignments) => {
      const nextAlignments = { ...currentAlignments };
      delete nextAlignments[cameraId];
      return nextAlignments;
    });
  }, []);

  return {
    alignmentsByCameraId,
    getAlignment,
    resetAlignment,
    updateAlignment,
  };
}

function readStoredAlignments(storageKey) {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : {};

    if (!parsedValue || typeof parsedValue !== "object") {
      return {};
    }

    return Object.entries(parsedValue).reduce(
      (nextAlignments, [cameraId, alignment]) => {
        nextAlignments[cameraId] = normalizeAlignment(alignment);
        return nextAlignments;
      },
      {},
    );
  } catch {
    return {};
  }
}

function normalizeAlignment(alignment = {}) {
  return {
    positionX: toFiniteNumber(
      alignment.positionX,
      DEFAULT_THERMAL_ALIGNMENT.positionX,
    ),
    positionY: toFiniteNumber(
      alignment.positionY,
      DEFAULT_THERMAL_ALIGNMENT.positionY,
    ),
    scaleX: toFiniteNumber(alignment.scaleX, DEFAULT_THERMAL_ALIGNMENT.scaleX),
    scaleY: toFiniteNumber(alignment.scaleY, DEFAULT_THERMAL_ALIGNMENT.scaleY),
    rotation: toFiniteNumber(
      alignment.rotation,
      DEFAULT_THERMAL_ALIGNMENT.rotation,
    ),
    opacity: clamp(
      toFiniteNumber(alignment.opacity, DEFAULT_THERMAL_ALIGNMENT.opacity),
      0,
      1,
    ),
    targetMeshId: alignment.targetMeshId ?? null,
    targetMeshName: alignment.targetMeshName ?? null,
    uvOffsetX: toFiniteNumber(
      alignment.uvOffsetX,
      DEFAULT_THERMAL_ALIGNMENT.uvOffsetX,
    ),
    uvOffsetY: toFiniteNumber(
      alignment.uvOffsetY,
      DEFAULT_THERMAL_ALIGNMENT.uvOffsetY,
    ),
    uvScaleX: toFiniteNumber(
      alignment.uvScaleX,
      DEFAULT_THERMAL_ALIGNMENT.uvScaleX,
    ),
    uvScaleY: toFiniteNumber(
      alignment.uvScaleY,
      DEFAULT_THERMAL_ALIGNMENT.uvScaleY,
    ),
  };
}

function toFiniteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
