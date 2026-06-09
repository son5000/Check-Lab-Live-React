"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

const WORLD_POPUP_POS_KEY = "three3d_world_popup_pos";

export function useWorldPreviewPopup(containerRef, resetKey) {
  const popupRef = useRef(null);
  const dragRef = useRef(null);
  const [position, setPosition] = useState(loadWorldPopupPosition);

  useLayoutEffect(() => {
    setPosition(null);
  }, [resetKey]);

  const handlePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();

      const popup = popupRef.current;
      const container = containerRef.current;
      if (!popup || !container) {
        return;
      }

      const popupRect = popup.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      dragRef.current = {
        origLeft: popupRect.left - containerRect.left,
        origTop: popupRect.top - containerRect.top,
        startX: event.clientX,
        startY: event.clientY,
      };
      popup.setPointerCapture(event.pointerId);
    },
    [containerRef],
  );

  const handlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current;
      const popup = popupRef.current;
      const container = containerRef.current;
      if (!drag || !popup || !container) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const rawLeft = drag.origLeft + event.clientX - drag.startX;
      const rawTop = drag.origTop + event.clientY - drag.startY;

      setPosition({
        left: clampPosition(rawLeft, containerRect.width - popupRect.width),
        top: clampPosition(rawTop, containerRect.height - popupRect.height),
      });
    },
    [containerRef],
  );

  const handlePointerUp = useCallback((event) => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (popupRef.current?.hasPointerCapture(event.pointerId)) {
      popupRef.current.releasePointerCapture(event.pointerId);
    }

    if (drag) {
      setPosition((currentPosition) => {
        if (currentPosition) {
          saveWorldPopupPosition(currentPosition);
        }
        return currentPosition;
      });
    }
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    popupRef,
    position,
  };
}

function clampPosition(value, maxValue) {
  return Math.max(0, Math.min(value, Math.max(0, maxValue)));
}

function loadWorldPopupPosition() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(WORLD_POPUP_POS_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);
    if (typeof parsed?.left === "number" && typeof parsed?.top === "number") {
      return parsed;
    }
  } catch {
    // Stored popup position is optional UI state.
  }

  return null;
}

function saveWorldPopupPosition(position) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WORLD_POPUP_POS_KEY, JSON.stringify(position));
  } catch {
    // Stored popup position is optional UI state.
  }
}
