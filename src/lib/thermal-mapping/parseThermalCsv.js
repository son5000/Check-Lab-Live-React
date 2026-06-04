export function parseThermalCsvMatrix(csvText) {
  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new Error("Thermal CSV mock data source is empty.");
  }

  const matrix = [];
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/);
  let expectedWidth = null;

  lines.forEach((rawLine, rowIndex) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const row = parseThermalCsvRow(line, rowIndex);
    const actualWidth = row.length;

    if (actualWidth === 0) {
      return;
    }

    if (expectedWidth === null) {
      expectedWidth = actualWidth;
    } else if (actualWidth !== expectedWidth) {
      throw new Error(
        `Thermal CSV column count mismatch: row ${rowIndex + 1} expected ${expectedWidth} values, received ${actualWidth}.`,
      );
    }

    matrix.push(row);
  });

  if (!matrix.length || !expectedWidth) {
    throw new Error("Thermal CSV mock data source has no valid rows.");
  }

  return matrix;
}

export function getThermalMatrixStats(matrix) {
  if (!Array.isArray(matrix) || !matrix.length) {
    throw new Error("Thermal matrix is empty.");
  }

  const firstRow = matrix[0];
  if (!Array.isArray(firstRow) || !firstRow.length) {
    throw new Error("Thermal matrix first row is empty.");
  }

  const width = firstRow.length;
  const height = matrix.length;
  let minTemperature = Infinity;
  let maxTemperature = -Infinity;

  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new Error(`Thermal matrix row ${rowIndex + 1} is not an array.`);
    }

    if (row.length !== width) {
      throw new Error(
        `Thermal matrix column count mismatch: row ${rowIndex + 1} expected ${width} values, received ${row.length}.`,
      );
    }

    row.forEach((value, columnIndex) => {
      if (!Number.isFinite(value)) {
        throw new Error(
          `Thermal matrix contains an invalid number at row ${rowIndex + 1}, column ${columnIndex + 1}.`,
        );
      }

      minTemperature = Math.min(minTemperature, value);
      maxTemperature = Math.max(maxTemperature, value);
    });
  });

  if (!Number.isFinite(minTemperature) || !Number.isFinite(maxTemperature)) {
    throw new Error("Thermal matrix has no valid temperature values.");
  }

  return {
    width,
    height,
    minTemperature,
    maxTemperature,
  };
}

export function createThermalCameraFrameFromCsv(camera, csvText) {
  if (!camera?.cameraId) {
    throw new Error("Thermal camera frame requires camera.cameraId.");
  }

  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new Error(
      `Thermal camera ${camera.cameraId} has no CSV mock data source text.`,
    );
  }

  const temperatureMatrix = parseThermalCsvMatrix(csvText);
  const { width, height, minTemperature, maxTemperature } =
    getThermalMatrixStats(temperatureMatrix);

  return {
    cameraId: camera.cameraId,
    cameraIndex: camera.cameraIndex,
    cameraName: camera.cameraName,
    assetId: camera.assetId,
    sourceName: camera.mockCsvPath || camera.cameraName,
    dataSourceType: camera.dataSourceType,
    width,
    height,
    minTemperature,
    maxTemperature,
    temperatureMatrix,
    capturedAt: new Date().toISOString(),
  };
}

export async function loadThermalCameraFrameFromMockCsv(camera) {
  if (!camera?.mockCsvPath) {
    throw new Error(
      `Thermal camera ${camera?.cameraId ?? "(unknown)"} is missing mockCsvPath.`,
    );
  }

  if (typeof fetch !== "function") {
    throw new Error("Fetch is not available for thermal CSV mock data source.");
  }

  const response = await fetch(camera.mockCsvPath);

  if (!response.ok) {
    throw new Error(
      `Failed to load thermal CSV mock data source: ${camera.mockCsvPath} (${response.status}).`,
    );
  }

  const csvText = await response.text();
  return createThermalCameraFrameFromCsv(camera, csvText);
}

function parseThermalCsvRow(line, rowIndex) {
  const cells = line.includes(",") ? line.split(",") : line.split(/\s+/);

  return cells.map((cell, columnIndex) => {
    const trimmedCell = cell.trim();
    const value = Number(trimmedCell);

    if (!trimmedCell || !Number.isFinite(value)) {
      throw new Error(
        `Thermal CSV parse failed: row ${rowIndex + 1}, column ${columnIndex + 1} is not a valid number.`,
      );
    }

    return value;
  });
}
