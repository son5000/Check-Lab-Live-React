// 9개의 가상 카메라 프리셋 - 3D 재구성에 최적화된 배치
// 각 카메라는 메시 중심(0, 0, 0)을 바라봄

const normalizeVector = (x, y, z) => {
  const length = Math.sqrt(x * x + y * y + z * z);
  return {
    x: (x / length) * 60,
    y: (y / length) * 60,
    z: (z / length) * 60,
  };
};

export const CAMERA_PRESETS = [
  {
    id: "1",
    name: "정면 (Front)",
    position: normalizeVector(0, 0, 1),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_1.PNG",
  },
  {
    id: "2",
    name: "후면 (Back)",
    position: normalizeVector(0, 0, -1),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_2.PNG",
  },
  {
    id: "3",
    name: "좌측 (Left)",
    position: normalizeVector(-1, 0, 0),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_3.PNG",
  },
  {
    id: "4",
    name: "우측 (Right)",
    position: normalizeVector(1, 0, 0),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_4.PNG",
  },
  {
    id: "5",
    name: "상단-정면 (Top-Front)",
    position: normalizeVector(0, 0.7, 1),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_5.PNG",
  },
  {
    id: "6",
    name: "하단-정면 (Bottom-Front)",
    position: normalizeVector(0, -0.7, 1),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_1.PNG",
  },
  {
    id: "7",
    name: "상단-우측-정면 (Top-Right-Front)",
    position: normalizeVector(1, 0.7, 0.7),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_2.PNG",
  },
  {
    id: "8",
    name: "상단-좌측-정면 (Top-Left-Front)",
    position: normalizeVector(-1, 0.7, 0.7),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_3.PNG",
  },
  {
    id: "9",
    name: "하단-우측-정면 (Bottom-Right-Front)",
    position: normalizeVector(1, -0.7, 0.7),
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_4.PNG",
  },
];

export const getCameraPreset = (cameraId) => {
  return CAMERA_PRESETS.find((cam) => cam.id === cameraId);
};

export const getAllCameraPresets = () => CAMERA_PRESETS;
