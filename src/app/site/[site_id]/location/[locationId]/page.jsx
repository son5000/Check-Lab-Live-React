import { notFound } from "next/navigation";
import { MainLayout } from "@/app/layouts/main-layout";
import { buildBackendHeaderState, fetchBackendWorkflowTree, findLocationNode, findSiteNode, toAssetModel, toLocationModel, toSiteModel, } from "@/app/site/utils/backend-workflow";
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
        ? locationAssets.map(toAssetModelFromSummary)
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
function toAssetModelFromSummary(asset) {
    return {
        asset_id: asset.asset_id,
        href: `/site/${encodeURIComponent(asset.site_id)}/location/${encodeURIComponent(asset.location_id)}/asset/${encodeURIComponent(asset.asset_id)}`,
        id: asset.asset_id,
        lastCollectedAt: "수집 대기",
        locationId: asset.location_id,
        name: asset.display_name || asset.asset_name || asset.asset_id,
        site_id: asset.site_id,
        status: toDashboardStatus(asset.status),
        type: asset.location_name,
    };
}
function toDashboardStatus(status) {
    return dashboardStatuses.includes(status)
        ? status
        : "normal";
}
