export function invalidateThreeScene(scene, reason = "scene-change") {
  if (!scene?.userData) {
    return;
  }

  // Mutating hooks bump this counter so idle render loops draw one fresh frame.
  const currentVersion = Number(scene.userData.renderVersion) || 0;
  scene.userData.renderVersion = currentVersion + 1;
  scene.userData.renderReason = reason;
}

export function getThreeSceneRenderVersion(scene) {
  return Number(scene?.userData?.renderVersion) || 0;
}
