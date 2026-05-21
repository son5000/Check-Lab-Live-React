import { notFound } from "next/navigation";
import { MainLayout } from "@/app/layouts/main-layout";
import { fetchAssetDashboard } from "@/app/monitoring/services/asset-dashboard-api";
import { toAssetDashboardRemoteSnapshot } from "@/app/monitoring/services/asset-dashboard-adapter";
import { buildBackendHeaderState, fetchBackendWorkflowTree, findAssetNode, findLocationNode, findSiteNode, toAssetModel, toLocationModel, toSiteModel, } from "@/app/site/utils/backend-workflow";
import { AssetDashboardPage } from "@/app/site/[site_id]/location/[locationId]/asset/[asset_id]/components/asset-dashboard-page";
export default async function AssetPage({ params, searchParams, }) {
    const monitoringTree = await fetchBackendWorkflowTree();
    const siteNode = findSiteNode(monitoringTree, params.site_id);
    const locationNode = siteNode
        ? findLocationNode(siteNode, params.locationId)
        : undefined;
    const assetNode = locationNode
        ? findAssetNode(locationNode, params.asset_id)
        : undefined;
    if (!siteNode || !locationNode || !assetNode) {
        notFound();
    }
    const site = toSiteModel(siteNode);
    const location = toLocationModel(siteNode, locationNode);
    const asset = toAssetModel({ assetNode, locationNode, siteNode });
    const remoteDashboard = await loadRemoteDashboard(params.asset_id);
    const dashboardAsset = applyRemoteHeaderToAsset(asset, remoteDashboard);
    const headerState = applyRemoteHeaderToHeaderState(buildBackendHeaderState({ asset: dashboardAsset, location, site }), remoteDashboard);
    return (<MainLayout activeNodeId={dashboardAsset.asset_id} clockOverride={remoteDashboard?.clock} headerState={headerState} initialMonitoringTree={monitoringTree}>
      <AssetDashboardPage asset_id={params.asset_id} initialEventId={searchParams?.eventId} site={site} location={location} remoteDashboard={remoteDashboard} asset={dashboardAsset}/>
    </MainLayout>);
}
async function loadRemoteDashboard(asset_id) {
    try {
        return toAssetDashboardRemoteSnapshot(await fetchAssetDashboard(asset_id));
    }
    catch (error) {
        console.warn("Failed to load asset dashboard API.", error);
        return null;
    }
}
function applyRemoteHeaderToAsset(asset, remoteDashboard) {
    const remoteHeader = remoteDashboard?.header;
    if (!remoteHeader) {
        return asset;
    }
    return {
        ...asset,
        lastCollectedAt: remoteHeader.lastCollectedAt ?? asset.lastCollectedAt,
        name: remoteHeader.assetName ?? asset.name,
        status: remoteHeader.dashboardStatus ?? asset.status,
    };
}
function applyRemoteHeaderToHeaderState(headerState, remoteDashboard) {
    const remoteHeader = remoteDashboard?.header;
    if (!remoteHeader) {
        return headerState;
    }
    return {
        ...headerState,
        assetStatus: remoteHeader.dashboardStatus ?? headerState.assetStatus,
        assetStatusLabel: remoteHeader.overallStatusLabel ?? headerState.assetStatusLabel,
        lastCollectedAt: remoteHeader.lastCollectedAt ?? headerState.lastCollectedAt,
        selectedPath: remoteHeader.path?.length
            ? remoteHeader.path
            : headerState.selectedPath,
        unresolvedAlarmCount: remoteHeader.recentAlertCount ?? headerState.unresolvedAlarmCount,
    };
}
