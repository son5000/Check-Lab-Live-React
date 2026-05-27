import { fetchBackendMonitoringTree } from "@/app/monitoring/services/monitoring-tree-loader";
const statusLabel = {
    normal: "정상",
    caution: "요주의",
    warning: "경고",
    danger: "이상",
    error: "오류",
};
export async function fetchBackendWorkflowTree() {
    return fetchBackendMonitoringTree();
}
export function findSiteNode(tree, site_id) {
    return (tree.children ?? []).find((node) => node.type === "site" && node.id === site_id);
}
export function findLocationNode(siteNode, locationId) {
    return (siteNode.children ?? []).find((node) => node.type === "place" && node.id === locationId);
}
export function findAssetNode(locationNode, asset_id) {
    return (locationNode.children ?? []).find((node) => node.type === "asset" && node.id === asset_id);
}
export function findAssetPathNode(tree, asset_id) {
    for (const siteNode of tree.children ?? []) {
        if (siteNode.type !== "site") {
            continue;
        }
        for (const locationNode of siteNode.children ?? []) {
            if (locationNode.type !== "place") {
                continue;
            }
            const assetNode = findAssetNode(locationNode, asset_id);
            if (assetNode) {
                return { assetNode, locationNode, siteNode };
            }
        }
    }
    return undefined;
}
export function toSiteModel(siteNode) {
    const locations = siteNode.children ?? [];
    return {
        alertCount: siteNode.alertCount ?? 0,
        assetCount: siteNode.assetCount ??
            locations.reduce((count, location) => count + (location.assetCount ?? location.children?.length ?? 0), 0),
        description: siteNode.description ?? "",
        href: siteNode.href ?? `/site/${encodeURIComponent(siteNode.id)}`,
        locationCount: siteNode.locationCount ?? locations.length,
        name: siteNode.label,
        site_id: siteNode.id,
        status: siteNode.status ?? "normal",
    };
}
export function toLocationModel(siteNode, locationNode) {
    return {
        assetCount: locationNode.assetCount ?? locationNode.children?.length ?? 0,
        floor: locationNode.floor ?? "",
        href: locationNode.href ??
            `/site/${encodeURIComponent(siteNode.id)}/location/${encodeURIComponent(locationNode.id)}`,
        id: locationNode.id,
        name: locationNode.label,
        site_id: siteNode.id,
        status: locationNode.status ?? "normal",
        summary: locationNode.description ?? "",
    };
}
export function toAssetModel({ assetNode, locationNode, siteNode, }) {
    return {
        assetCode: assetNode.assetCode,
        assetNumber: assetNode.assetNumber,
        asset_id: assetNode.id,
        emergencyContact: assetNode.emergencyContact,
        href: assetNode.href ??
            `/site/${encodeURIComponent(siteNode.id)}/location/${encodeURIComponent(locationNode.id)}/asset/${encodeURIComponent(assetNode.id)}`,
        id: assetNode.id,
        lastCollectedAt: assetNode.lastCollectedAt ?? "수집 대기",
        lastInspectionDate: assetNode.lastInspectionDate,
        locationId: locationNode.id,
        maintenanceCompany: assetNode.maintenanceCompany,
        manager: assetNode.manager,
        managerContact: assetNode.managerContact ?? assetNode.emergencyContact,
        managerEmail: assetNode.managerEmail,
        modelName: assetNode.modelName,
        name: assetNode.label,
        operationState: assetNode.operationState === "가동중" ||
            assetNode.operationState === "비가동"
            ? assetNode.operationState
            : undefined,
        optionUpdatedAt: assetNode.optionUpdatedAt,
        serialNumber: assetNode.serialNumber,
        site_id: siteNode.id,
        status: assetNode.status ?? "normal",
        type: assetNode.description ?? "설비",
    };
}
export function toLocationModels(siteNode) {
    return (siteNode.children ?? [])
        .filter((node) => node.type === "place")
        .map((locationNode) => toLocationModel(siteNode, locationNode));
}
export function toAssetModels(siteNode) {
    return (siteNode.children ?? []).flatMap((locationNode) => (locationNode.children ?? [])
        .filter((node) => node.type === "asset")
        .map((assetNode) => toAssetModel({
        assetNode,
        locationNode,
        siteNode,
    })));
}
export function buildBackendHeaderState({ asset, location, site, }) {
    const selectedPath = [
        site?.name ?? "공정 선택",
        location?.name,
        asset?.name,
    ].filter(Boolean);
    const status = asset?.status ?? location?.status ?? site?.status ?? "normal";
    return {
        assetStatus: status,
        assetStatusLabel: statusLabel[status],
        lastCollectedAt: asset?.lastCollectedAt ?? "수집 대기",
        selectedPath,
        unresolvedAlarmCount: site?.alertCount ?? 0,
        userName: "관제 관리자",
    };
}
