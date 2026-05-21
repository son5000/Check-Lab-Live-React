export const SITE_BUILDER_STORAGE_KEY = "checklab:site-builder-sites";
export const emptySite = {
    alertCount: 0,
    description: "",
    assetCount: 0,
    locationCount: 0,
    locations: [],
    name: "",
    site_id: "",
    status: "normal",
};
export const emptyLocation = {
    assets: [],
    floor: "",
    location_id: "",
    name: "",
    status: "normal",
    summary: "",
};
export const emptyAsset = {
    asset_code: "",
    asset_id: "",
    asset_number: "",
    description: "",
    emergency_contact: "",
    last_inspection_date: "",
    manager: "",
    model_name: "",
    name: "",
    operation_state: "",
    serial_number: "",
    status: "normal",
    type: "",
};
export const statusOptions = [
    { label: "정상", value: "normal" },
    { label: "요주의", value: "caution" },
    { label: "경고", value: "warning" },
    { label: "이상", value: "danger" },
    { label: "오류", value: "error" },
];
export const EMPTY_INITIAL_SITES = [];
export function getItemAt(items, index) {
    return index === undefined ? undefined : items?.[index];
}
export function toSiteBuilderSite(site) {
    return {
        alertCount: 0,
        assetCount: site.asset_count,
        description: "",
        locationCount: site.location_count,
        locations: [],
        name: site.site_name,
        site_id: site.site_id,
        status: "normal",
    };
}
export function normalizeSite(site) {
    return recalculateSiteCounts({
        ...site,
        description: site.description.trim(),
        imageUrl: site.imageUrl?.trim() || undefined,
        locations: Array.isArray(site.locations)
            ? site.locations.map(normalizeLocation)
            : [],
        name: site.name.trim(),
        site_id: site.site_id.trim(),
    });
}
export function normalizeLocation(location) {
    return {
        ...location,
        assets: Array.isArray(location.assets)
            ? location.assets.map(normalizeAsset)
            : [],
        floor: location.floor.trim(),
        imageUrl: location.imageUrl?.trim() || undefined,
        location_id: location.location_id.trim(),
        name: location.name.trim(),
        summary: location.summary.trim(),
    };
}
export function normalizeAsset(asset) {
    return {
        ...asset,
        asset_id: asset.asset_id.trim(),
        asset_code: asset.asset_code?.trim() ?? "",
        asset_number: asset.asset_number?.trim() ?? "",
        description: asset.description?.trim() ?? "",
        imageUrl: asset.imageUrl?.trim() || undefined,
        emergency_contact: asset.emergency_contact?.trim() ?? "",
        last_inspection_date: asset.last_inspection_date?.trim() ?? "",
        manager: asset.manager?.trim() ?? "",
        model_name: asset.model_name?.trim() ?? "",
        name: asset.name.trim(),
        operation_state: asset.operation_state?.trim() ?? "",
        serial_number: asset.serial_number?.trim() ?? "",
        type: asset.type?.trim() ?? "",
    };
}
export function toCreateSitePayload(site) {
    const locations = site.locations
        .map(toCreateSiteLocationPayload)
        .filter((location) => location.name.trim().length > 0);
    return {
        description: site.description,
        image_url: site.imageUrl,
        ...(locations.length ? { locations } : {}),
        process_name: site.name,
    };
}
function toCreateSiteLocationPayload(location) {
    const assets = location.assets
        .map(toCreateSiteAssetPayload)
        .filter((asset) => asset.name.trim().length > 0);
    return {
        ...(assets.length ? { assets } : {}),
        description: location.summary,
        floor: location.floor,
        image_url: location.imageUrl,
        name: location.name,
    };
}
function toCreateSiteAssetPayload(asset) {
    return {
        asset_code: asset.asset_code,
        asset_number: asset.asset_number,
        description: asset.description,
        emergency_contact: asset.emergency_contact,
        image_url: asset.imageUrl,
        last_inspection_date: asset.last_inspection_date,
        manager: asset.manager,
        model_name: asset.model_name,
        name: asset.name,
        serial_number: asset.serial_number,
        type: asset.type,
    };
}
export function toUpdateSitePayload(site) {
    return {
        description: site.description,
        process_name: site.name,
    };
}
export function toCreateLocationPayload(site_id, location) {
    return {
        description: location.summary,
        floor: location.floor,
        name: location.name,
        site_id,
    };
}
export function toUpdateLocationPayload(location) {
    return {
        description: location.summary,
        floor: location.floor,
        name: location.name,
    };
}
export function toCreateAssetPayload(site_id, location_id, asset) {
    return {
        asset_code: asset.asset_code,
        asset_number: asset.asset_number,
        description: asset.description,
        emergency_contact: asset.emergency_contact,
        last_inspection_date: asset.last_inspection_date,
        location_id,
        manager: asset.manager,
        model_name: asset.model_name,
        name: asset.name,
        serial_number: asset.serial_number,
        site_id,
        type: asset.type,
    };
}
export function toUpdateAssetPayload(asset) {
    return {
        asset_code: asset.asset_code,
        asset_number: asset.asset_number,
        description: asset.description,
        emergency_contact: asset.emergency_contact,
        last_inspection_date: asset.last_inspection_date,
        manager: asset.manager,
        model_name: asset.model_name,
        name: asset.name,
        operation_state: asset.operation_state,
        serial_number: asset.serial_number,
        type: asset.type,
    };
}
export function applySiteResponse(fallbackSite, response) {
    const record = toResponseRecord(response, ["site", "process"], ["site_id", "process_id", "id"]);
    const responseLocations = readRecordArray(record, "locations");
    const locations = responseLocations
        ? responseLocations.map((location, index) => applyLocationResponse(fallbackSite.locations[index] ?? emptyLocation, location))
        : fallbackSite.locations;
    return recalculateSiteCounts({
        ...fallbackSite,
        description: readRecordString(record, ["description", "summary"]) ??
            fallbackSite.description,
        locations,
        name: readRecordString(record, ["process_name", "name"]) ?? fallbackSite.name,
        site_id: readRecordString(record, ["site_id", "process_id", "id"]) ??
            fallbackSite.site_id,
    });
}
export function applyLocationResponse(fallbackLocation, response) {
    const record = toResponseRecord(response, ["location"], ["location_id", "id"]);
    const responseAssets = readRecordArray(record, "assets");
    const assets = responseAssets
        ? responseAssets.map((asset, index) => applyAssetResponse(fallbackLocation.assets[index] ?? emptyAsset, asset))
        : fallbackLocation.assets;
    return {
        ...fallbackLocation,
        assets,
        floor: readRecordString(record, ["floor"]) ?? fallbackLocation.floor,
        location_id: readRecordString(record, ["location_id", "id"]) ??
            fallbackLocation.location_id,
        name: readRecordString(record, ["name"]) ?? fallbackLocation.name,
        status: readRecordStatus(record) ?? fallbackLocation.status,
        summary: readRecordString(record, ["description", "summary"]) ??
            fallbackLocation.summary,
    };
}
export function applyAssetResponse(fallbackAsset, response) {
    const record = toResponseRecord(response, ["asset"], ["asset_id", "id"]);
    return {
        ...fallbackAsset,
        asset_code: readRecordString(record, ["asset_code", "assetCode"]) ??
            fallbackAsset.asset_code,
        asset_id: readRecordString(record, ["asset_id", "id"]) ?? fallbackAsset.asset_id,
        asset_number: readRecordString(record, ["asset_number", "assetNumber"]) ??
            fallbackAsset.asset_number,
        description: readRecordString(record, ["description", "summary"]) ??
            fallbackAsset.description,
        emergency_contact: readRecordString(record, ["emergency_contact", "emergencyContact"]) ??
            fallbackAsset.emergency_contact,
        last_inspection_date: readRecordString(record, ["last_inspection_date", "lastInspectionDate"]) ??
            fallbackAsset.last_inspection_date,
        manager: readRecordString(record, ["manager", "manager_name"]) ??
            fallbackAsset.manager,
        model_name: readRecordString(record, ["model_name", "modelName"]) ??
            fallbackAsset.model_name,
        name: readRecordString(record, ["name"]) ?? fallbackAsset.name,
        operation_state: readRecordString(record, ["operation_state", "operationState"]) ??
            fallbackAsset.operation_state,
        serial_number: readRecordString(record, ["serial_number", "serialNumber"]) ??
            fallbackAsset.serial_number,
        status: readRecordStatus(record) ?? fallbackAsset.status,
        type: readRecordString(record, ["type", "asset_type"]) ?? fallbackAsset.type,
    };
}
export function recalculateSiteCounts(site) {
    return {
        ...site,
        assetCount: site.locations.reduce((count, loc) => count + loc.assets.length, 0),
        locationCount: site.locations.length,
    };
}
export function getApiErrorMessage(error, fallbackMessage) {
    return error instanceof Error && error.message
        ? error.message
        : fallbackMessage;
}
export function readStoredSites() {
    try {
        const storedValue = window.localStorage.getItem(SITE_BUILDER_STORAGE_KEY);
        if (!storedValue)
            return [];
        const parsedValue = JSON.parse(storedValue);
        return Array.isArray(parsedValue) ? parsedValue.map(normalizeSite) : [];
    }
    catch (error) {
        console.warn("Failed to read site builder storage.", error);
        return [];
    }
}
function toResponseRecord(value, nestedKeys = [], entityKeys = []) {
    const record = toPlainRecord(value);
    if (!record)
        return undefined;
    if (hasAnyRecordKey(record, entityKeys))
        return record;
    const directNestedRecord = findNestedRecord(record, nestedKeys);
    if (directNestedRecord)
        return directNestedRecord;
    const wrappedRecord = findNestedRecord(record, ["data", "result"]);
    if (!wrappedRecord)
        return record;
    return findNestedRecord(wrappedRecord, nestedKeys) ?? wrappedRecord;
}
function toPlainRecord(value) {
    return typeof value === "object" && value !== null
        ? value
        : undefined;
}
function findNestedRecord(record, keys) {
    for (const key of keys) {
        const nestedRecord = toPlainRecord(record[key]);
        if (nestedRecord)
            return nestedRecord;
    }
    return undefined;
}
function hasAnyRecordKey(record, keys) {
    return keys.some((key) => record[key] !== undefined && record[key] !== null);
}
function readRecordArray(record, key) {
    const value = record?.[key];
    return Array.isArray(value) ? value : undefined;
}
function readRecordString(record, keys) {
    for (const key of keys) {
        const value = record?.[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}
function readRecordStatus(record) {
    const status = readRecordString(record, ["status", "dashboard_status"]);
    return isDashboardStatus(status) ? status : undefined;
}
function isDashboardStatus(value) {
    return Boolean(value && statusOptions.some((option) => option.value === value));
}
