import {
  DEFAULT_THERMAL_CAMERA_TARGET,
  DEFAULT_THERMAL_MOCK_ASSET_ID,
  THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
  THERMAL_DATA_SOURCE_TYPES,
} from "./constants.js";

export const MOCK_THERMAL_CAMERA_CSV_FILES = [
  "sample_1.csv",
  "sample_2.csv",
  "sample_3.csv",
  "sample_4.csv",
  "sample_5.csv",
  "sample_6.csv",
  "sample_7.csv",
  "sample_8.csv",
  "sample_9.csv",
];

export const MOCK_THERMAL_CAMERA_WORLD_POSES = [
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: 0, y: 0.05, z: 0 },
    poseLabel: "정면 가까이",
    position: { x: 0, y: 0.04, z: 0.62 },
    previewPlaneScale: 0.16,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: 0, y: 0.12, z: 0 },
    poseLabel: "정면 가까이 상단",
    position: { x: 0, y: 0.34, z: 0.54 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: 0, y: -0.08, z: 0 },
    poseLabel: "정면 하단 가까이",
    position: { x: 0, y: -0.32, z: 0.52 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: -0.08, y: 0.04, z: 0 },
    poseLabel: "왼쪽 옆면 촬영",
    position: { x: -0.62, y: 0.04, z: 0.08 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: 0.08, y: 0.04, z: 0 },
    poseLabel: "오른쪽 옆면 촬영",
    position: { x: 0.62, y: 0.04, z: 0.08 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: -0.08, y: 0.14, z: 0 },
    poseLabel: "front upper-left close sample",
    position: { x: -0.36, y: 0.24, z: 0.48 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: 0.08, y: 0.14, z: 0 },
    poseLabel: "front upper-right close sample",
    position: { x: 0.36, y: 0.24, z: 0.48 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: -0.08, y: -0.12, z: 0 },
    poseLabel: "front lower-left close sample",
    position: { x: -0.34, y: -0.24, z: 0.48 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
  {
    coordinateSpace: "asset-relative-sample",
    lookAt: { x: 0.08, y: -0.12, z: 0 },
    poseLabel: "front lower-right close sample",
    position: { x: 0.34, y: -0.24, z: 0.48 },
    previewPlaneScale: 0.14,
    projectorFov: THERMAL_CAPTURE_VERTICAL_FOV_DEGREES,
    sourceType: "sample-mock",
  },
];

export const MOCK_THERMAL_CAMERAS = MOCK_THERMAL_CAMERA_CSV_FILES.map(
  (fileName, index) => {
    const cameraIndex = index + 1;

    return {
      cameraId: `thermal-camera-${cameraIndex}`,
      cameraIndex,
      cameraName: `열화상 카메라 ${cameraIndex}`,
      assetId: DEFAULT_THERMAL_MOCK_ASSET_ID,
      mockCsvPath: `/csv/${fileName}`,
      dataSourceType: THERMAL_DATA_SOURCE_TYPES.CSV_MOCK,
      worldPose: MOCK_THERMAL_CAMERA_WORLD_POSES[index] ?? null,
      ...DEFAULT_THERMAL_CAMERA_TARGET,
    };
  },
);
