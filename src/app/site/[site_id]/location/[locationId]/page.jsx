import { notFound } from "next/navigation";
import { MainLayout } from "@/app/layouts/main-layout";
import { buildBackendHeaderState, fetchBackendWorkflowTree, findAssetPathNode, findLocationNode, findSiteNode, toAssetModel, toLocationModel, toSiteModel, } from "@/app/site/utils/backend-workflow";
import { fetchSite, fetchSiteLocation, fetchSiteLocationAssets, } from "@/app/site/services/site-management-api";
import { LocationSummaryPage } from "@/app/site/[site_id]/location/[locationId]/components/location-summary-page";
const dashboardStatuses = [
    "normal",
    "caution",
    "warning",
    "danger",
    "error",
];
export default async function LocationPage({ params }) {
    const [monitoringTree, siteDetail, locationDetail, locationAssets] = await Promise.all([
        fetchBackendWorkflowTree(),
        fetchSite(params.site_id).catch((error) => {
            console.error("[CheckLab API] failed to load location page site", {
                error,
                site_id: params.site_id,
            });
            return undefined;
        }),
        fetchSiteLocation(params.site_id, params.locationId).catch((error) => {
            console.error("[CheckLab API] failed to load location detail", {
                error,
                location_id: params.locationId,
                site_id: params.site_id,
            });
            return undefined;
        }),
        fetchSiteLocationAssets(params.site_id, params.locationId).catch((error) => {
            console.error("[CheckLab API] failed to load location assets", {
                error,
                location_id: params.locationId,
                site_id: params.site_id,
            });
            return [];
        }),
    ]);
    const siteNode = findSiteNode(monitoringTree, params.site_id);
    const locationNode = siteNode
        ? findLocationNode(siteNode, params.locationId)
        : undefined;
    if (!locationDetail && (!siteNode || !locationNode)) {
        notFound();
    }
    const site = siteDetail
        ? toSiteModelFromSummary(siteDetail)
        : locationDetail
            ? toSiteModelFromLocationDetail(locationDetail)
            : toSiteModel(siteNode);
    const location = locationDetail
        ? toLocationModelFromDetail(locationDetail)
        : toLocationModel(siteNode, locationNode);
    const assets = locationAssets.length
        ? locationAssets.map((asset) => toAssetModelFromSummary(asset, monitoringTree))
        : (locationNode?.children ?? []).map((assetNode) => toAssetModel({
            assetNode,
            locationNode: locationNode,
            siteNode: siteNode,
        }));
    return (<MainLayout activeNodeId={location.id} headerState={buildBackendHeaderState({ site, location })} initialMonitoringTree={monitoringTree}>
      <LocationSummaryPage site={site} location={location} assets={assets}/>
    </MainLayout>);
}
function toSiteModelFromSummary(site) {
    return {
        alertCount: 0,
        assetCount: site.asset_count,
        description: "",
        href: `/site/${encodeURIComponent(site.site_id)}`,
        locationCount: site.location_count,
        name: site.site_name,
        site_id: site.site_id,
        status: "normal",
    };
}
function toSiteModelFromLocationDetail(location) {
    return {
        alertCount: 0,
        assetCount: location.asset_count,
        description: "",
        href: `/site/${encodeURIComponent(location.site_id)}`,
        locationCount: 1,
        name: location.site_name,
        site_id: location.site_id,
        status: "normal",
    };
}
function toLocationModelFromDetail(location) {
    return {
        assetCount: location.asset_count,
        floor: location.display_label,
        href: `/site/${encodeURIComponent(location.site_id)}/location/${encodeURIComponent(location.location_id)}`,
        id: location.location_id,
        name: location.location_name || location.display_label || location.location_id,
        site_id: location.site_id,
        status: "normal",
        summary: "",
    };
}
function toAssetModelFromSummary(asset, monitoringTree) {
    const treeAssetNode = findAssetPathNode(monitoringTree, asset.asset_id)?.assetNode;
    const emergencyContact = readAssetString(asset, ["emergency_contact", "emergencyContact"]) ??
        treeAssetNode?.emergencyContact;
    const managerContact = readAssetString(asset, ["manager_contact", "managerContact", "contact", "contact_number"]) ??
        emergencyContact ??
        treeAssetNode?.managerContact;
    return {
        asset_id: asset.asset_id,
        emergencyContact,
        href: treeAssetNode?.href ??
            `/site/${encodeURIComponent(asset.site_id)}/location/${encodeURIComponent(asset.location_id)}/asset/${encodeURIComponent(asset.asset_id)}`,
        id: asset.asset_id,
        lastCollectedAt: readAssetString(asset, ["last_collected_at", "lastCollectedAt", "latest_updated_at"]) ??
            treeAssetNode?.lastCollectedAt ??
            "수집 대기",
        lastInspectionDate: readAssetString(asset, ["last_inspection_date", "lastInspectionDate"]) ??
            treeAssetNode?.lastInspectionDate,
        locationId: asset.location_id,
        maintenanceCompany: readAssetString(asset, ["maintenance_company", "maintenanceCompany", "vendor", "maintenance_vendor"]) ??
            treeAssetNode?.maintenanceCompany,
        manager: readAssetString(asset, ["manager", "manager_name"]) ??
            treeAssetNode?.manager,
        managerContact,
        managerEmail: readAssetString(asset, ["manager_email", "managerEmail", "email"]) ??
            treeAssetNode?.managerEmail,
        name: asset.display_name || asset.asset_name || asset.asset_id,
        optionUpdatedAt: readAssetString(asset, ["option_updated_at", "optionUpdatedAt", "settings_updated_at", "settingsUpdatedAt", "updated_at", "updatedAt"]) ??
            treeAssetNode?.optionUpdatedAt,
        site_id: asset.site_id,
        status: toDashboardStatus(asset.status),
        type: asset.location_name,
    };
}
function readAssetString(record, keys) {
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
function toDashboardStatus(status) {
    return dashboardStatuses.includes(status)
        ? status
        : "normal";
}
