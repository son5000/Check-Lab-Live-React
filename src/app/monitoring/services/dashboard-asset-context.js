import { buildCheckLabAssetUrl, requestCheckLabJson, } from "./checklab-api-client";
export async function fetchDashboardAssetContext(asset_id) {
    const dashboard = await requestCheckLabJson(buildCheckLabAssetUrl(asset_id, "mock-dashboard"), {
        context: { asset_id },
        requestName: "dashboard asset context",
    });
    return toDashboardAssetContext(dashboard);
}
export async function fetchDashboardAssetContexts(asset_ids) {
    const uniqueAssetIds = Array.from(new Set(asset_ids.filter(Boolean)));
    const contexts = await Promise.all(uniqueAssetIds.map(async (asset_id) => {
        try {
            return await fetchDashboardAssetContext(asset_id);
        }
        catch (error) {
            console.warn("[CheckLab API] dashboard asset context unavailable", {
                asset_id,
                error,
            });
            return undefined;
        }
    }));
    return contexts.filter(isDashboardAssetContext);
}
export async function enrichAlertsWithDashboardContext(alerts) {
    const asset_ids = alerts
        .map((alert) => alert.asset_id?.trim())
        .filter((asset_id) => Boolean(asset_id));
    const contexts = await fetchDashboardAssetContexts(asset_ids);
    const contextByAssetId = new Map(contexts.map((context) => [context.asset_id, context]));
    return alerts.map((alert) => {
        const asset_id = alert.asset_id?.trim();
        const context = asset_id ? contextByAssetId.get(asset_id) : undefined;
        if (!context) {
            return alert;
        }
        return {
            ...alert,
            asset_id: context.assetId,
            asset_name: context.assetName,
            dashboard_href: context.href,
            dashboard_status: context.status,
            location_label: context.locationLabel,
        };
    });
}
export function buildMonitoringTreeFromAssetContexts(contexts) {
    const siteNodes = new Map();
    contexts.forEach((context) => {
        const siteNode = siteNodes.get(context.site_id) ??
            createMonitoringNode({
                href: context.siteHref,
                id: context.site_id,
                label: context.siteLabel,
                type: "site",
            });
        const locationNodes = siteNode.children ?? [];
        let locationNode = locationNodes.find((node) => node.id === context.locationId);
        if (!locationNode) {
            locationNode = createMonitoringNode({
                href: context.locationHref,
                id: context.locationId,
                label: context.locationLabel,
                type: "place",
            });
            siteNode.children = [...locationNodes, locationNode];
        }
        const assetNode = {
            href: context.href,
            id: context.assetId,
            label: context.assetName,
            status: context.status,
            type: "asset",
        };
        locationNode.children = [
            ...(locationNode.children ?? []).filter((node) => node.id !== context.assetId),
            assetNode,
        ].sort(compareMonitoringNodes);
        locationNode.assetCount = locationNode.children.length;
        locationNode.status = rollupStatus(locationNode.children);
        siteNode.children = (siteNode.children ?? []).sort(compareMonitoringNodes);
        siteNode.assetCount = siteNode.children.reduce((count, location) => count + (location.assetCount ?? 0), 0);
        siteNode.locationCount = siteNode.children.length;
        siteNode.status = rollupStatus(siteNode.children);
        siteNodes.set(context.site_id, siteNode);
    });
    const children = Array.from(siteNodes.values()).sort(compareMonitoringNodes);
    return {
        children,
        href: "/site",
        id: "overview",
        label: "전체 현황",
        status: rollupStatus(children),
        type: "overview",
    };
}
function toDashboardAssetContext(dashboard) {
    const asset_id = dashboard.asset_id;
    const path = splitDashboardPath(dashboard.header?.breadcrumb);
    const assetName = dashboard.header?.asset_name?.trim() || path.at(-1) || asset_id;
    const siteLabel = path[0] || "CheckLab";
    const locationLabel = dashboard.header?.location_label?.trim() || path.at(-2) || "설비";
    const site_id = slugify(siteLabel);
    const locationId = slugify(locationLabel);
    const assetId = asset_id;
    return {
        asset_id,
        assetId,
        assetName,
        href: `/site/${encodeURIComponent(site_id)}/location/${encodeURIComponent(locationId)}/asset/${encodeURIComponent(assetId)}`,
        locationHref: `/site/${encodeURIComponent(site_id)}/location/${encodeURIComponent(locationId)}`,
        locationId,
        locationLabel,
        site_id,
        siteHref: `/site/${encodeURIComponent(site_id)}`,
        siteLabel,
        status: toDashboardStatus(dashboard.header?.overall_status),
    };
}
function createMonitoringNode({ href, id, label, type, }) {
    return {
        children: [],
        href,
        id,
        label,
        type,
    };
}
function splitDashboardPath(value) {
    return (value
        ?.split(/[>/>]/)
        .map((segment) => segment.trim())
        .filter(Boolean) ?? []);
}
function slugify(value) {
    return (value
        .trim()
        .toLowerCase()
        .replace(/[^0-9a-z가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "") || "node");
}
function toDashboardStatus(status) {
    const normalizedStatus = status?.trim().toLowerCase() ?? "";
    if (normalizedStatus === "critical" ||
        normalizedStatus === "danger" ||
        normalizedStatus === "high" ||
        normalizedStatus === "abnormal" ||
        normalizedStatus === "위험" ||
        normalizedStatus === "이상") {
        return "danger";
    }
    if (normalizedStatus === "warning" || normalizedStatus === "medium") {
        return "warning";
    }
    if (normalizedStatus === "caution" ||
        normalizedStatus === "주의" ||
        normalizedStatus === "높음") {
        return "caution";
    }
    if (normalizedStatus === "error") {
        return "error";
    }
    return "normal";
}
function rollupStatus(nodes) {
    return nodes.reduce((currentStatus, node) => statusPriority[node.status ?? "normal"] > statusPriority[currentStatus]
        ? node.status ?? "normal"
        : currentStatus, "normal");
}
function compareMonitoringNodes(firstNode, secondNode) {
    return firstNode.label.localeCompare(secondNode.label, "ko-KR");
}
function isDashboardAssetContext(context) {
    return Boolean(context);
}
const statusPriority = {
    normal: 0,
    caution: 1,
    warning: 2,
    danger: 3,
    error: 4,
};
