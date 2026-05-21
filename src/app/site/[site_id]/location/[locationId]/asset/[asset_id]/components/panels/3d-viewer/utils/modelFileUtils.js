const DEFAULT_TEXTURE_ROLES = ["baseColor"];
export function normalizeModelTextures(modelFile) {
    if (modelFile.textures?.length) {
        return modelFile.textures.map((texture, index) => ({
            enabled: texture.enabled ?? true,
            id: texture.id || `texture-${index + 1}`,
            label: texture.label ?? `텍스처 ${index + 1}`,
            role: texture.role ?? DEFAULT_TEXTURE_ROLES[index] ?? "baseColor",
            source: texture.source,
            strength: texture.strength ?? (index === 0 ? 1 : 0.35),
        }));
    }
    const sources = [
        ...(modelFile.textureUrl ? [modelFile.textureUrl] : []),
        ...(modelFile.textureUrls ?? []),
    ];
    return sources.map((source, index) => ({
        enabled: true,
        id: `texture-${index + 1}`,
        label: `텍스처 ${index + 1}`,
        role: DEFAULT_TEXTURE_ROLES[index] ?? "baseColor",
        source,
        strength: index === 0 ? 1 : 0.35,
    }));
}
export function getModelSourceName(source) {
    if (!source) {
        return "미지정";
    }
    if (typeof source !== "string") {
        return source.name;
    }
    return source.split("/").filter(Boolean).at(-1) ?? source;
}
export function withUpdatedTextureSlot(modelFile, slotIndex, source) {
    const textures = normalizeModelTextures(modelFile);
    const currentTexture = textures[slotIndex];
    const nextTextures = [...textures];
    nextTextures[slotIndex] = {
        enabled: true,
        id: currentTexture?.id ?? `texture-${slotIndex + 1}`,
        label: currentTexture?.label ?? `텍스처 ${slotIndex + 1}`,
        role: currentTexture?.role ?? DEFAULT_TEXTURE_ROLES[slotIndex] ?? "baseColor",
        source,
        strength: currentTexture?.strength ?? (slotIndex === 0 ? 1 : 0.35),
    };
    return {
        ...modelFile,
        textures: nextTextures,
    };
}
export function withUpdatedTextureMeta(modelFile, slotIndex, patch) {
    const textures = normalizeModelTextures(modelFile);
    const texture = textures[slotIndex];
    if (!texture) {
        const role = patch.role ?? DEFAULT_TEXTURE_ROLES[slotIndex] ?? "baseColor";
        return {
            ...modelFile,
            textures: [
                ...textures,
                {
                    enabled: true,
                    id: `texture-${slotIndex + 1}`,
                    label: `텍스처 ${slotIndex + 1}`,
                    role,
                    source: "",
                    strength: patch.strength ?? (slotIndex === 0 ? 1 : 0.35),
                },
            ],
        };
    }
    return {
        ...modelFile,
        textures: textures.map((currentTexture, index) => index === slotIndex ? { ...currentTexture, ...patch } : currentTexture),
    };
}
