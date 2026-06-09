export const TILE_LAYOUT_MODES = Object.freeze({
  GRID: "grid",
  MATRIX: "matrix",
});

export const TILE_WORLD_PLACEMENTS = Object.freeze({
  CENTER: "center",
  FIRST: "first",
  LAST: "last",
});

export const TILE_CAMERA_ORDERS = Object.freeze({
  ASC: "asc",
  DESC: "desc",
});

export const TILE_GRID_PRESETS = Object.freeze([
  { id: "2x2", label: "2x2", rows: 2, columns: 2 },
  { id: "3x3", label: "3x3", rows: 3, columns: 3 },
  { id: "4x4", label: "4x4", rows: 4, columns: 4 },
  { id: "5x5", label: "5x5", rows: 5, columns: 5 },
]);

export const MIN_TILE_GRID_SIZE = 2;
export const MAX_TILE_GRID_SIZE = 5;

export const DEFAULT_TILE_LAYOUT_CONFIG = Object.freeze({
  cameraLimit: 8,
  cameraOrder: TILE_CAMERA_ORDERS.ASC,
  columns: 3,
  gridColumns: 3,
  gridRows: 3,
  layout: TILE_LAYOUT_MODES.MATRIX,
  page: 0,
  rows: 3,
  worldPlacement: TILE_WORLD_PLACEMENTS.CENTER,
});

export const TILE_LAYOUT_CAMERA_LIMIT_OPTIONS = TILE_GRID_PRESETS.map(
  (preset) => preset.rows * preset.columns - 1,
);

const CENTER_MATRIX_CAMERA_SLOTS = [0, 1, 2, 5, 8, 7, 6, 3];
const CENTER_MATRIX_CORNER_SLOTS = [0, 2, 6, 8];

function clamp(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function clampGridSize(value, fallback) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return fallback;
  }
  return clamp(nextValue, MIN_TILE_GRID_SIZE, MAX_TILE_GRID_SIZE);
}

function getConfigRows(config) {
  return clampGridSize(
    config?.rows ?? config?.gridRows,
    DEFAULT_TILE_LAYOUT_CONFIG.rows,
  );
}

function getConfigColumns(config) {
  return clampGridSize(
    config?.columns ?? config?.gridColumns,
    DEFAULT_TILE_LAYOUT_CONFIG.columns,
  );
}

export function getTileCameraCapacity(config) {
  const rows = getConfigRows(config);
  const columns = getConfigColumns(config);
  return Math.max(1, rows * columns - 1);
}

export function getTileCellCount(config) {
  const rows = getConfigRows(config);
  const columns = getConfigColumns(config);
  return rows * columns;
}

export function normalizeTileLayoutConfig(config) {
  const rows = getConfigRows(config);
  const columns = getConfigColumns(config);
  const layout =
    config?.layout === TILE_LAYOUT_MODES.GRID
      ? TILE_LAYOUT_MODES.GRID
      : TILE_LAYOUT_MODES.MATRIX;
  const worldPlacement = Object.values(TILE_WORLD_PLACEMENTS).includes(
    config?.worldPlacement,
  )
    ? config.worldPlacement
    : DEFAULT_TILE_LAYOUT_CONFIG.worldPlacement;
  const cameraOrder =
    config?.cameraOrder === TILE_CAMERA_ORDERS.DESC
      ? TILE_CAMERA_ORDERS.DESC
      : TILE_CAMERA_ORDERS.ASC;
  const page = clamp(config?.page ?? DEFAULT_TILE_LAYOUT_CONFIG.page, 0, 999);
  const cameraLimit = getTileCameraCapacity({ rows, columns });

  return {
    cameraLimit,
    cameraOrder,
    columns,
    gridColumns: columns,
    gridRows: rows,
    layout,
    page,
    rows,
    worldPlacement,
  };
}

function compareEntryId(entryId, selectedEntryId) {
  if (entryId == null || selectedEntryId == null) {
    return false;
  }
  return String(entryId) === String(selectedEntryId);
}

function getEntryId(entry, options) {
  if (typeof options?.getEntryId === "function") {
    return options.getEntryId(entry);
  }
  return entry?.id ?? entry?.cameraId ?? entry?.camera?.cameraId ?? null;
}

export function getOrderedTileEntries(entries, config) {
  const tileConfig = normalizeTileLayoutConfig(config);
  const orderedEntries = [...(entries ?? [])];
  if (tileConfig.cameraOrder === TILE_CAMERA_ORDERS.DESC) {
    orderedEntries.reverse();
  }
  return orderedEntries;
}

export function getTilePageInfo(entries, config, options = {}) {
  const tileConfig = normalizeTileLayoutConfig(config);
  const orderedEntries = getOrderedTileEntries(entries, tileConfig);
  const capacity = getTileCameraCapacity(tileConfig);
  const total = orderedEntries.length;
  const pageCount = Math.max(1, Math.ceil(total / capacity));
  let page = clamp(tileConfig.page, 0, pageCount - 1);

  if (options.selectedEntryId != null) {
    const selectedIndex = orderedEntries.findIndex((entry) =>
      compareEntryId(getEntryId(entry, options), options.selectedEntryId),
    );
    if (selectedIndex >= 0) {
      page = Math.floor(selectedIndex / capacity);
    }
  }

  const startIndex = page * capacity;
  const endIndex = Math.min(total, startIndex + capacity);
  const visibleEntries = orderedEntries.slice(startIndex, endIndex);

  return {
    capacity,
    endIndex,
    hiddenAfter: Math.max(0, total - endIndex),
    hiddenBefore: Math.max(0, startIndex),
    orderedEntries,
    page,
    pageCount,
    startIndex,
    total,
    visibleEntries,
  };
}

export function getTilePageCountForCount(cameraCount, config) {
  const capacity = getTileCameraCapacity(config);
  const total = Math.max(0, Number(cameraCount) || 0);
  return Math.max(1, Math.ceil(total / capacity));
}

function getCenterSlotIndex(tileConfig) {
  const centerRow = Math.floor(tileConfig.rows / 2);
  const centerColumn = Math.floor(tileConfig.columns / 2);
  return centerRow * tileConfig.columns + centerColumn;
}

function getWorldSlotIndex(tileConfig) {
  const cellCount = getTileCellCount(tileConfig);
  if (tileConfig.worldPlacement === TILE_WORLD_PLACEMENTS.FIRST) {
    return 0;
  }
  if (tileConfig.worldPlacement === TILE_WORLD_PLACEMENTS.LAST) {
    return cellCount - 1;
  }
  return getCenterSlotIndex(tileConfig);
}

function getGeneralCameraSlots(tileConfig, worldSlotIndex) {
  const slots = Array.from({ length: getTileCellCount(tileConfig) }, (_, index) => index)
    .filter((index) => index !== worldSlotIndex);

  if (tileConfig.worldPlacement === TILE_WORLD_PLACEMENTS.CENTER) {
    const worldRow = Math.floor(worldSlotIndex / tileConfig.columns);
    const worldColumn = worldSlotIndex % tileConfig.columns;

    return slots.sort((first, second) => {
      const firstRow = Math.floor(first / tileConfig.columns);
      const firstColumn = first % tileConfig.columns;
      const secondRow = Math.floor(second / tileConfig.columns);
      const secondColumn = second % tileConfig.columns;
      const firstDistance =
        Math.abs(firstRow - worldRow) + Math.abs(firstColumn - worldColumn);
      const secondDistance =
        Math.abs(secondRow - worldRow) + Math.abs(secondColumn - worldColumn);

      if (firstDistance !== secondDistance) {
        return firstDistance - secondDistance;
      }
      if (firstRow !== secondRow) {
        return firstRow - secondRow;
      }
      return firstColumn - secondColumn;
    });
  }

  return slots;
}

function getCameraSlotIndexes(tileConfig, worldSlotIndex, visibleEntryCount) {
  if (
    tileConfig.rows === 3 &&
    tileConfig.columns === 3 &&
    tileConfig.worldPlacement === TILE_WORLD_PLACEMENTS.CENTER
  ) {
    return visibleEntryCount <= 4
      ? CENTER_MATRIX_CORNER_SLOTS
      : CENTER_MATRIX_CAMERA_SLOTS;
  }

  return getGeneralCameraSlots(tileConfig, worldSlotIndex);
}

export function buildTileCells(entries, config, options = {}) {
  const tileConfig = normalizeTileLayoutConfig(config);
  const { visibleEntries } = getTilePageInfo(entries, tileConfig, options);
  const cellCount = getTileCellCount(tileConfig);
  const cells = Array.from({ length: cellCount }, () => null);
  const worldSlotIndex = getWorldSlotIndex(tileConfig);
  const cameraSlotIndexes = getCameraSlotIndexes(
    tileConfig,
    worldSlotIndex,
    visibleEntries.length,
  );

  cells[worldSlotIndex] = {
    type: "world",
  };

  visibleEntries.forEach((entry, index) => {
    const slotIndex = cameraSlotIndexes[index];
    if (slotIndex == null) {
      return;
    }
    cells[slotIndex] = entry;
  });

  return cells;
}

export function getTileGridClassName() {
  return "";
}

export function getTileGridStyle(config) {
  const tileConfig = normalizeTileLayoutConfig(config);
  return {
    gridTemplateColumns: `repeat(${tileConfig.columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${tileConfig.rows}, minmax(0, 1fr))`,
  };
}
