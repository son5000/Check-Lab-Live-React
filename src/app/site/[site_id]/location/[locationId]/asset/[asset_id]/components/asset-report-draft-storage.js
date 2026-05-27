const ASSET_REPORT_DRAFT_STORAGE_PREFIX = "checklab:asset-report-draft:";
const ASSET_REPORT_DRAFT_STORAGE_VERSION = 1;
const ASSET_REPORT_DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 6;

export function persistAssetReportDraft(assetId, draft) {
  if (typeof window === "undefined" || !assetId) {
    return;
  }

  const storageKey = getAssetReportDraftStorageKey(assetId);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(createStoredReportDraft(assetId, draft)));
  } catch (error) {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(createStoredReportDraft(assetId, stripReportDraftPreviewImages(draft))),
      );
    } catch {
      console.warn("Failed to persist asset report draft.", error);
    }
  }
}

export function readAssetReportDraft(assetId, { maxAgeMs = ASSET_REPORT_DRAFT_MAX_AGE_MS } = {}) {
  if (typeof window === "undefined" || !assetId) {
    return null;
  }

  const storageKey = getAssetReportDraftStorageKey(assetId);
  try {
    const serializedDraft = window.localStorage.getItem(storageKey);
    if (!serializedDraft) {
      return null;
    }

    const draft = JSON.parse(serializedDraft);
    const isValidDraft =
      draft?.version === ASSET_REPORT_DRAFT_STORAGE_VERSION &&
      draft?.asset_id === assetId &&
      Number.isFinite(draft?.savedAt) &&
      Date.now() - draft.savedAt <= maxAgeMs;

    if (!isValidDraft) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return draft;
  } catch (error) {
    console.warn("Failed to read asset report draft.", error);
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function getAssetReportDraftStorageKey(assetId) {
  return `${ASSET_REPORT_DRAFT_STORAGE_PREFIX}${assetId}`;
}

function createStoredReportDraft(assetId, draft) {
  return {
    ...draft,
    asset_id: assetId,
    savedAt: Date.now(),
    version: ASSET_REPORT_DRAFT_STORAGE_VERSION,
  };
}

function stripReportDraftPreviewImages(draft) {
  return {
    ...draft,
    assetParts: stripAssetPartPreviewImages(draft.assetParts),
    remoteDashboard: draft.remoteDashboard
      ? {
          ...draft.remoteDashboard,
          initialAssetParts: stripAssetPartPreviewImages(draft.remoteDashboard.initialAssetParts),
        }
      : draft.remoteDashboard,
  };
}

function stripAssetPartPreviewImages(assetParts) {
  return assetParts?.map((part) => ({
    ...part,
    viewer3DTarget: part.viewer3DTarget
      ? {
          ...part.viewer3DTarget,
          previewImageDataUrl: undefined,
        }
      : part.viewer3DTarget,
  }));
}
