import * as THREE from "three";

export function applyThermalTextureToMesh(mesh, texture, options = {}) {
  if (!mesh?.isMesh || !texture) {
    return {
      ok: false,
      error: "mesh 또는 texture가 없습니다.",
    };
  }

  try {
    const originalMaterial = mesh.material;

    if (!originalMaterial) {
      return {
        ok: false,
        error: "mesh material이 없습니다.",
      };
    }

    const appliedMaterial = Array.isArray(originalMaterial)
      ? originalMaterial.map((material) =>
          createThermalMaterialClone(material, texture, options),
        )
      : createThermalMaterialClone(originalMaterial, texture, options);

    mesh.material = appliedMaterial;

    return {
      ok: true,
      mesh,
      meshUuid: mesh.uuid,
      originalMaterial,
      appliedMaterial,
      texture,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "열화상 texture 적용 중 오류가 발생했습니다.",
    };
  }
}

export function applyThermalTextureToObject3D(root, texture, options = {}) {
  if (!root || !texture) {
    return {
      ok: false,
      appliedEntries: [],
      error: "target object 또는 texture가 없습니다.",
    };
  }

  const meshes = collectMeshes(root);

  if (!meshes.length) {
    return {
      ok: false,
      appliedEntries: [],
      error: "target object 내부에서 mesh를 찾지 못했습니다.",
    };
  }

  const appliedEntries = [];
  const errors = [];

  meshes.forEach((mesh) => {
    const result = applyThermalTextureToMesh(mesh, texture, options);

    if (result.ok) {
      appliedEntries.push(result);
      return;
    }

    errors.push(result.error);
  });

  return {
    ok: Boolean(appliedEntries.length),
    appliedEntries,
    error: appliedEntries.length
      ? null
      : errors[0] ?? "thermal texture를 적용하지 못했습니다.",
  };
}

export function applyThermalTextureLayersToObject3D(root, layers, options = {}) {
  const thermalLayers = Array.isArray(layers)
    ? layers.filter((layer) => layer?.texture && layer?.projection)
    : [];

  if (!root || !thermalLayers.length) {
    return {
      ok: false,
      appliedEntries: [],
      error: "target object 또는 thermal layer가 없습니다.",
    };
  }

  const meshes = collectMeshes(root);

  if (!meshes.length) {
    return {
      ok: false,
      appliedEntries: [],
      error: "target object 내부에서 mesh를 찾지 못했습니다.",
    };
  }

  const appliedEntries = [];
  const errors = [];

  meshes.forEach((mesh) => {
    const result = applyThermalTextureLayersToMesh(mesh, thermalLayers, options);

    if (result.ok) {
      appliedEntries.push(result);
      return;
    }

    errors.push(result.error);
  });

  return {
    ok: Boolean(appliedEntries.length),
    appliedEntries,
    error: appliedEntries.length
      ? null
      : errors[0] ?? "thermal texture layer를 적용하지 못했습니다.",
  };
}

export function applyThermalTextureLayersToMesh(mesh, layers, options = {}) {
  if (!mesh?.isMesh || !layers?.length) {
    return {
      ok: false,
      error: "mesh 또는 thermal layer가 없습니다.",
    };
  }

  try {
    const originalMaterial =
      options.getOriginalMaterial?.(mesh) ?? options.originalMaterial ?? mesh.material;

    if (!originalMaterial) {
      return {
        ok: false,
        error: "mesh material이 없습니다.",
      };
    }

    const currentMaterial = mesh.material;
    const appliedMaterial = Array.isArray(originalMaterial)
      ? originalMaterial.map((material) =>
          createThermalMaterialClone(material, null, {
            ...options,
            layers,
          }),
        )
      : createThermalMaterialClone(originalMaterial, null, {
          ...options,
          layers,
        });

    mesh.material = appliedMaterial;

    if (
      options.disposeCurrentMaterial &&
      currentMaterial &&
      currentMaterial !== originalMaterial
    ) {
      disposeMaterial(currentMaterial);
    }

    return {
      ok: true,
      mesh,
      meshUuid: mesh.uuid,
      originalMaterial,
      appliedMaterial,
      layers,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "thermal texture layer 적용 중 오류가 발생했습니다.",
    };
  }
}

export function restoreOriginalMaterial(mesh, originalMaterial, options = {}) {
  if (!mesh?.isMesh || !originalMaterial) {
    return {
      ok: false,
      error: "mesh 또는 originalMaterial이 없습니다.",
    };
  }

  try {
    const currentMaterial = mesh.material;
    mesh.material = originalMaterial;

    if (options.disposeCurrentMaterial && currentMaterial !== originalMaterial) {
      disposeMaterial(currentMaterial);
    }

    return {
      ok: true,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "원본 material 복구 중 오류가 발생했습니다.",
    };
  }
}

export function findMeshByNameOrId(root, target) {
  if (!root || !target) {
    return null;
  }

  let found = null;
  root.traverse?.((object) => {
    if (found || !object?.isMesh) {
      return;
    }

    if (
      object.uuid === target ||
      object.name === target ||
      object.userData?.id === target ||
      object.userData?.assetId === target
    ) {
      found = object;
    }
  });

  return found;
}

export function collectThermalTargetMeshUuids(root) {
  return new Set(collectMeshes(root).map((mesh) => mesh.uuid));
}

function collectMeshes(root) {
  if (!root) {
    return [];
  }

  const meshes = [];

  if (root.isMesh) {
    meshes.push(root);
  }

  root.traverse?.((object) => {
    if (object !== root && object?.isMesh) {
      meshes.push(object);
    }
  });

  return meshes;
}

function createThermalMaterialClone(material, texture, options) {
  if (options.layers?.length) {
    return createProjectedThermalLayersMaterial(material, options.layers);
  }

  if (options.projection) {
    return createProjectedThermalMaterial(material, texture, options);
  }

  const clonedMaterial = material.clone();
  clonedMaterial.map = texture;
  clonedMaterial.needsUpdate = true;

  if (Number.isFinite(options.opacity)) {
    clonedMaterial.transparent = options.opacity < 1;
    clonedMaterial.opacity = Math.max(0, Math.min(1, options.opacity));
  }

  return clonedMaterial;
}

function createProjectedThermalLayersMaterial(material, layers) {
  const projectedMaterial = material.clone();
  const thermalUniforms = {};

  layers.forEach((layer, index) => {
    const hasDepthMap = Boolean(layer.projection.depthMap?.texture);

    thermalUniforms[`thermalMap${index}`] = { value: layer.texture };
    thermalUniforms[`projectorMatrix${index}`] = {
      value: layer.projection.projectorMatrix.clone(),
    };
    thermalUniforms[`overlayCenter${index}`] = {
      value: new THREE.Vector2(
        layer.projection.centerX,
        layer.projection.centerY,
      ),
    };
    thermalUniforms[`overlayRotation${index}`] = {
      value: layer.projection.rotationRadians,
    };
    thermalUniforms[`overlaySize${index}`] = {
      value: new THREE.Vector2(layer.projection.width, layer.projection.height),
    };
    thermalUniforms[`thermalOpacity${index}`] = {
      value: Number.isFinite(layer.opacity)
        ? Math.max(0, Math.min(1, layer.opacity))
        : 1,
    };
    if (hasDepthMap) {
      thermalUniforms[`thermalDepthMap${index}`] = {
        value: layer.projection.depthMap.texture,
      };
      thermalUniforms[`thermalDepthBias${index}`] = {
        value: Number.isFinite(layer.projection.depthBias)
          ? layer.projection.depthBias
          : 0.0025,
      };
    }
    thermalUniforms[`projectorDirection${index}`] = {
      value: getNormalizedProjectionDirection(layer.projection.projectorDirection),
    };
    thermalUniforms[`normalCutoff${index}`] = {
      value: clamp01(
        Number.isFinite(layer.projection.normalCutoff)
          ? layer.projection.normalCutoff
          : 0.68,
      ),
    };
    thermalUniforms[`normalFeather${index}`] = {
      value: Math.max(
        0.001,
        Number.isFinite(layer.projection.normalFeather)
          ? layer.projection.normalFeather
          : 0.12,
      ),
    };
  });

  projectedMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, thermalUniforms);

    shader.vertexShader = `varying vec3 vThermalWorldPosition;
varying vec3 vThermalWorldNormal;
${shader.vertexShader}`;
    shader.vertexShader = injectThermalWorldVaryings(shader.vertexShader);
    shader.fragmentShader = injectThermalLayerProjection(
      shader.fragmentShader,
      layers,
    );
  };

  projectedMaterial.customProgramCacheKey = () =>
    `thermal-layers-${layers.length}-${layers
      .map((layer) => (layer.projection.depthMap?.texture ? "d" : "n"))
      .join("")}`;
  projectedMaterial.name = `${material.name || "material"} thermal layers`;
  projectedMaterial.needsUpdate = true;

  return projectedMaterial;
}

function injectThermalWorldVaryings(vertexShader) {
  if (vertexShader.includes("#include <worldpos_vertex>")) {
    return vertexShader.replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
      vThermalWorldPosition = worldPosition.xyz;
      vThermalWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
    );
  }

  return vertexShader.replace(
    "#include <project_vertex>",
    `vThermalWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vThermalWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
      #include <project_vertex>`,
  );
}

function injectThermalLayerProjection(fragmentShader, layers) {
  const declarations = `
    varying vec3 vThermalWorldPosition;
    varying vec3 vThermalWorldNormal;
    ${layers.map((layer, index) => `
    uniform sampler2D thermalMap${index};
    uniform mat4 projectorMatrix${index};
    uniform vec2 overlayCenter${index};
    uniform float overlayRotation${index};
    uniform vec2 overlaySize${index};
    uniform float thermalOpacity${index};
    ${layer.projection.depthMap?.texture ? `
    uniform sampler2D thermalDepthMap${index};
    uniform float thermalDepthBias${index};` : ""}
    uniform vec3 projectorDirection${index};
    uniform float normalCutoff${index};
    uniform float normalFeather${index};`).join("\n")}

    vec4 applyThermalProjectionLayers(vec4 baseColor) {
      vec4 layerColor = baseColor;

      ${layers.map((layer, index) => `
      {
        vec4 projected = projectorMatrix${index} * vec4(vThermalWorldPosition, 1.0);

        if (projected.w > 0.0) {
          vec3 ndc = projected.xyz / projected.w;

            if (ndc.z >= -1.0 && ndc.z <= 1.0) {
              vec2 screenUv = ndc.xy * 0.5 + 0.5;
              float projectedDepth = ndc.z * 0.5 + 0.5;
              bool isVisibleAtProjectionDepth = true;

              ${layer.projection.depthMap?.texture ? `
              {
                float visibleDepth = texture2D(thermalDepthMap${index}, screenUv).r;
                isVisibleAtProjectionDepth = projectedDepth <= visibleDepth + thermalDepthBias${index};
              }` : ""}

              float surfaceFacing = max(
                0.0,
                dot(normalize(vThermalWorldNormal), normalize(-projectorDirection${index}))
              );
              float angleWeight = smoothstep(
                normalCutoff${index},
                min(1.0, normalCutoff${index} + normalFeather${index}),
                surfaceFacing
              );
              vec2 relativeUv = screenUv - overlayCenter${index};
              float c = cos(-overlayRotation${index});
              float s = sin(-overlayRotation${index});
            vec2 rotatedUv = mat2(c, -s, s, c) * relativeUv;
            vec2 thermalUv = rotatedUv / overlaySize${index} + 0.5;

            if (
              thermalUv.x >= 0.0 &&
                thermalUv.x <= 1.0 &&
                thermalUv.y >= 0.0 &&
                thermalUv.y <= 1.0 &&
                isVisibleAtProjectionDepth &&
                angleWeight > 0.0
              ) {
              vec4 thermal = texture2D(
                thermalMap${index},
                vec2(thermalUv.x, 1.0 - thermalUv.y)
              );
              layerColor = mix(
                layerColor,
                vec4(thermal.rgb, layerColor.a),
                thermalOpacity${index} * thermal.a * angleWeight
              );
            }
          }
        }
      }`).join("\n")}

      return layerColor;
    }
  `;
  const applyLayers = "gl_FragColor = applyThermalProjectionLayers(gl_FragColor);";

  if (fragmentShader.includes("#include <tonemapping_fragment>")) {
    return `${declarations}\n${fragmentShader.replace(
      "#include <tonemapping_fragment>",
      `${applyLayers}\n#include <tonemapping_fragment>`,
    )}`;
  }

  return `${declarations}\n${fragmentShader.replace(
    "#include <dithering_fragment>",
    `${applyLayers}\n#include <dithering_fragment>`,
  )}`;
}

function createProjectedThermalMaterial(material, texture, options) {
  const projection = options.projection;
  const baseMap = material.map ?? null;
  const baseColor = material.color?.clone?.() ?? new THREE.Color(0xffffff);
  const baseOpacity = Number.isFinite(material.opacity) ? material.opacity : 1;
  const thermalOpacity = Number.isFinite(options.opacity)
    ? Math.max(0, Math.min(1, options.opacity))
    : 1;

  const projectedMaterial = new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: baseColor },
      baseMap: { value: baseMap },
      baseOpacity: { value: baseOpacity },
      hasBaseMap: { value: Boolean(baseMap) },
      overlayCenter: {
        value: new THREE.Vector2(projection.centerX, projection.centerY),
      },
      overlayRotation: { value: projection.rotationRadians },
      overlaySize: {
        value: new THREE.Vector2(projection.width, projection.height),
      },
      projectorMatrix: { value: projection.projectorMatrix.clone() },
      thermalMap: { value: texture },
      thermalOpacity: { value: thermalOpacity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform sampler2D baseMap;
      uniform float baseOpacity;
      uniform bool hasBaseMap;
      uniform vec2 overlayCenter;
      uniform float overlayRotation;
      uniform vec2 overlaySize;
      uniform mat4 projectorMatrix;
      uniform sampler2D thermalMap;
      uniform float thermalOpacity;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vec4 base = vec4(baseColor, baseOpacity);

        if (hasBaseMap) {
          base *= texture2D(baseMap, vUv);
        }

        vec4 projected = projectorMatrix * vec4(vWorldPosition, 1.0);

        if (projected.w <= 0.0) {
          gl_FragColor = base;
          return;
        }

        vec3 ndc = projected.xyz / projected.w;

        if (ndc.z < -1.0 || ndc.z > 1.0) {
          gl_FragColor = base;
          return;
        }

        vec2 screenUv = ndc.xy * 0.5 + 0.5;
        vec2 relativeUv = screenUv - overlayCenter;
        float c = cos(-overlayRotation);
        float s = sin(-overlayRotation);
        vec2 rotatedUv = mat2(c, -s, s, c) * relativeUv;
        vec2 thermalUv = rotatedUv / overlaySize + 0.5;

        if (
          thermalUv.x < 0.0 ||
          thermalUv.x > 1.0 ||
          thermalUv.y < 0.0 ||
          thermalUv.y > 1.0
        ) {
          gl_FragColor = base;
          return;
        }

        vec4 thermal = texture2D(thermalMap, vec2(thermalUv.x, 1.0 - thermalUv.y));
        gl_FragColor = mix(base, vec4(thermal.rgb, base.a), thermalOpacity * thermal.a);
      }
    `,
    transparent: Boolean(material.transparent) || baseOpacity < 1 || thermalOpacity < 1,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    alphaTest: material.alphaTest ?? 0,
  });

  projectedMaterial.name = `${material.name || "material"} thermal projection`;
  projectedMaterial.needsUpdate = true;

  return projectedMaterial;
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry?.dispose?.());
    return;
  }

  material?.dispose?.();
}

function getNormalizedProjectionDirection(value) {
  const direction = value?.isVector3
    ? value.clone()
    : new THREE.Vector3(0, 0, -1);

  if (direction.lengthSq() <= 0) {
    direction.set(0, 0, -1);
  }

  return direction.normalize();
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
