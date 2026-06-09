export const CAMERA_PRESETS = [
  {
    id: "1",
    name: "실화상 카메라 1",
    position: { x: 39.74, y: 8.7, z: 13.58 },
    target: { x: 14.42, y: -10.56, z: -18.52 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_1.PNG",
  },
  {
    id: "2",
    name: "실화상 카메라 2",
    position: { x: -1.67, y: 16.65, z: 37.27 },
    target: { x: -46.06, y: -8.08, z: -4.25 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_2.PNG",
  },
  {
    id: "3",
    name: "실화상 카메라 3",
    position: { x: 9.81, y: -5.18, z: 30.02 },
    target: { x: -12.12, y: -13.16, z: 11.86 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_3.PNG",
  },
  {
    id: "4",
    name: "실화상 카메라 4",
    position: { x: 32.32, y: 1.36, z: 1.16 },
    target: { x: -0.49, y: -13.36, z: -38.56 },
    fov: 60,
    sampleImagePath: "/cam/cam_sample_4.PNG",
  },
];

export const getCameraPreset = (cameraId) => {
  return CAMERA_PRESETS.find((cam) => cam.id === cameraId);
};

export const getAllCameraPresets = () => CAMERA_PRESETS;
