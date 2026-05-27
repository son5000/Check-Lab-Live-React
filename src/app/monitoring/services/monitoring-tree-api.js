import { buildCheckLabApiUrl, requestCheckLabJson, } from "./checklab-api-client";
const EMPTY_MONITORING_TREE = {
    children: [],
    href: "/site",
    id: "overview",
    label: "전체 현황",
    status: "normal",
    type: "overview",
};
export async function fetchMonitoringTree() {
    const url = buildCheckLabApiUrl("api/v1/monitoring-tree");
    const data = await requestCheckLabJson(url, {
        requestName: "monitoring tree",
    });
    return normalizeMonitoringTree(data);
}
export function normalizeMonitoringTree(data) {
    const root = normalizeMonitoringRoot(data);
    return {
        ...root,
        children: root.children ?? [],
        href: root.href ?? "/site",
        id: root.id || "overview",
        label: root.label || "전체 현황",
        status: root.status ?? rollupStatus(root.children ?? []),
        type: "overview",
    };
}
export function getEmptyMonitoringTree() {
    return EMPTY_MONITORING_TREE;
}
function normalizeMonitoringRoot(data) {
    if (Array.isArray(data)) {
        return buildRootFromSiteRecords(data);
    }
    const record = toRecord(data);
    if (!record) {
        return EMPTY_MONITORING_TREE;
    }
    if (Array.isArray(record.sites)) {
        return buildRootFromSiteRecords(record.sites);
    }
    if (record.tree) {
        return normalizeMonitoringRoot(record.tree);
    }
    if (Array.isArray(record.children)) {
        const rootChildren = record.children
            .map((child) => normalizeTreeNode(child, {}))
            .filter(isMonitoringTreeNode);
        return {
            ...readNodeMeta(record),
            children: rootChildren,
            href: readString(record, ["href"]) ?? "/site",
            id: readString(record, ["id"]) ?? "overview",
            label: readString(record, ["label", "name"]) ?? "전체 현황",
            status: readDashboardStatus(record) ?? rollupStatus(rootChildren),
            type: "overview",
        };
    }
    return buildRootFromSiteRecords([record]);
}
function buildRootFromSiteRecords(siteRecords) {
    const children = siteRecords
        .map((siteRecord) => normalizeSiteNode(siteRecord))
        .filter(isMonitoringTreeNode)
        .sort(compareMonitoringNodes);
    return {
        ...EMPTY_MONITORING_TREE,
        children,
        status: rollupStatus(children),
    };
}
function normalizeTreeNode(value, context) {
    const record = toRecord(value);
    if (!record) {
        return undefined;
    }
    const explicitType = readNodeType(record);
    if (explicitType === "overview") {
        return normalizeMonitoringRoot(record);
    }
    if (explicitType === "site" || hasAny(record, ["site_id", "process_id", "process_name"])) {
        return normalizeSiteNode(record);
    }
    if (explicitType === "place" || hasAny(record, ["location_id", "floor"])) {
        return normalizeLocationNode(record, context.siteId);
    }
    if (explicitType === "asset" || hasAny(record, ["asset_id"])) {
        return normalizeAssetNode(record, context.siteId, context.locationId);
    }
    return undefined;
}
function normalizeSiteNode(value) {
    const record = toRecord(value);
    if (!record) {
        return undefined;
    }
    const siteId = readString(record, ["site_id", "process_id", "id"]) ??
        slugify(readString(record, ["process_name", "name", "label"]) ?? "site");
    const locations = readArray(record, ["locations", "children"])
        .map((location) => normalizeLocationNode(location, siteId))
        .filter(isMonitoringTreeNode)
        .sort(compareMonitoringNodes);
    return {
        ...readNodeMeta(record),
        alertCount: readNumber(record, ["alert_count", "alertCount", "recent_alert_count"]),
        assetCount: readNumber(record, ["asset_count", "assetCount"]) ??
            locations.reduce((count, location) => count + (location.assetCount ?? location.children?.length ?? 0), 0),
        children: locations,
        href: readString(record, ["href"]) ?? `/site/${encodeURIComponent(siteId)}`,
        id: siteId,
        label: readString(record, ["process_name", "name", "label"]) ?? siteId,
        locationCount: readNumber(record, ["location_count", "locationCount"]) ?? locations.length,
        status: readDashboardStatus(record) ?? rollupStatus(locations),
        type: "site",
    };
}
function normalizeLocationNode(value, siteId) {
    const record = toRecord(value);
    if (!record) {
        return undefined;
    }
    const resolvedSiteId = siteId ?? readString(record, ["site_id", "process_id"]);
    const locationId = readString(record, ["location_id", "id"]) ??
        slugify(readString(record, ["name", "label"]) ?? "location");
    const assets = readArray(record, ["assets", "children"])
        .map((asset) => normalizeAssetNode(asset, resolvedSiteId, locationId))
        .filter(isMonitoringTreeNode)
        .sort(compareMonitoringNodes);
    const href = readString(record, ["href"]) ??
        (resolvedSiteId
            ? `/site/${encodeURIComponent(resolvedSiteId)}/location/${encodeURIComponent(locationId)}`
            : undefined);
    return {
        ...readNodeMeta(record),
        assetCount: readNumber(record, ["asset_count", "assetCount"]) ?? assets.length,
        children: assets,
        floor: readString(record, ["floor"]),
        href,
        id: locationId,
        label: readString(record, ["name", "label"]) ?? locationId,
        status: readDashboardStatus(record) ?? rollupStatus(assets),
        type: "place",
    };
}
function normalizeAssetNode(value, siteId, locationId) {
    const record = toRecord(value);
    if (!record) {
        return undefined;
    }
    const assetId = readString(record, ["asset_id", "id"]) ??
        slugify(readString(record, ["name", "label"]) ?? "asset");
    const resolvedSiteId = siteId ?? readString(record, ["site_id"]);
    const resolvedLocationId = locationId ?? readString(record, ["location_id", "locationId"]);
    const href = readString(record, ["href", "dashboard_href"]) ??
        (resolvedSiteId && resolvedLocationId
            ? `/site/${encodeURIComponent(resolvedSiteId)}/location/${encodeURIComponent(resolvedLocationId)}/asset/${encodeURIComponent(assetId)}`
            : `/monitoring/realtime/${encodeURIComponent(assetId)}`);
    return {
        ...readNodeMeta(record),
        assetCode: readString(record, ["asset_code", "assetCode"]),
        assetNumber: readString(record, ["asset_number", "assetNumber"]),
        emergencyContact: readString(record, ["emergency_contact", "emergencyContact"]),
        href,
        id: assetId,
        label: readString(record, ["name", "label", "asset_name"]) ?? assetId,
        lastCollectedAt: readString(record, ["last_collected_at", "lastCollectedAt", "latest_updated_at"]),
        lastInspectionDate: readString(record, ["last_inspection_date", "lastInspectionDate"]),
        maintenanceCompany: readString(record, ["maintenance_company", "maintenanceCompany", "vendor", "maintenance_vendor"]),
        manager: readString(record, ["manager", "manager_name"]),
        managerContact: readString(record, ["manager_contact", "managerContact", "contact", "contact_number"]),
        managerEmail: readString(record, ["manager_email", "managerEmail", "email"]),
        modelName: readString(record, ["model_name", "modelName"]),
        operationState: readOperationState(record),
        optionUpdatedAt: readString(record, ["option_updated_at", "optionUpdatedAt", "settings_updated_at", "settingsUpdatedAt", "updated_at", "updatedAt"]),
        serialNumber: readString(record, ["serial_number", "serialNumber"]),
        status: readDashboardStatus(record),
        type: "asset",
    };
}
function readNodeMeta(record) {
    return {
        description: readString(record, ["description", "summary"]),
    };
}
function readNodeType(record) {
    const value = readString(record, ["type", "node_type"]);
    if (value === "overview" || value === "site" || value === "place" || value === "asset") {
        return value;
    }
    if (value === "location") {
        return "place";
    }
    return undefined;
}
function readDashboardStatus(record) {
    const value = readString(record, ["status", "dashboard_status", "overall_status"]);
    const normalizedValue = value?.toLowerCase();
    if (normalizedValue === "critical" ||
        normalizedValue === "danger" ||
        normalizedValue === "high" ||
        normalizedValue === "abnormal" ||
        normalizedValue === "위험" ||
        normalizedValue === "이상") {
        return "danger";
    }
    if (normalizedValue === "warning" ||
        normalizedValue === "medium" ||
        normalizedValue === "경고") {
        return "warning";
    }
    if (normalizedValue === "caution" ||
        normalizedValue === "주의" ||
        normalizedValue === "요주의") {
        return "caution";
    }
    if (normalizedValue === "error" || normalizedValue === "오류") {
        return "error";
    }
    if (normalizedValue === "normal" || normalizedValue === "정상") {
        return "normal";
    }
    return undefined;
}
function readOperationState(record) {
    const value = readString(record, ["operation_state", "operationState"]);
    const normalizedValue = value?.toLowerCase();
    if (value === "가동중" ||
        normalizedValue === "running" ||
        normalizedValue === "operating" ||
        normalizedValue === "active" ||
        normalizedValue === "online") {
        return "가동중";
    }
    if (value === "비가동" ||
        normalizedValue === "stopped" ||
        normalizedValue === "inactive" ||
        normalizedValue === "offline" ||
        normalizedValue === "down") {
        return "비가동";
    }
    return undefined;
}
function readArray(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (Array.isArray(value)) {
            return value;
        }
    }
    return [];
}
function readString(record, keys) {
    for (const key of keys) {
        const value = record?.[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value);
        }
    }
    return undefined;
}
function readNumber(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
    }
    return undefined;
}
function hasAny(record, keys) {
    return keys.some((key) => record[key] !== undefined);
}
function toRecord(value) {
    return typeof value === "object" && value !== null
        ? value
        : undefined;
}
function isMonitoringTreeNode(node) {
    return Boolean(node);
}
function slugify(value) {
    return (value
        .trim()
        .toLowerCase()
        .replace(/[^0-9a-z가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "") || "node");
}
function rollupStatus(nodes) {
    return nodes.reduce((currentStatus, node) => statusPriority[node.status ?? "normal"] > statusPriority[currentStatus]
        ? node.status ?? "normal"
        : currentStatus, "normal");
}
function compareMonitoringNodes(firstNode, secondNode) {
    return firstNode.label.localeCompare(secondNode.label, "ko-KR");
}
const statusPriority = {
    normal: 0,
    caution: 1,
    warning: 2,
    danger: 3,
    error: 4,
};
