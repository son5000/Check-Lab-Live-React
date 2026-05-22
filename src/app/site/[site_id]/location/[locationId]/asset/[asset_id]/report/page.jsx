import { notFound } from "next/navigation";
import { fetchAssetDashboard } from "@/app/monitoring/services/asset-dashboard-api";
import { toAssetDashboardRemoteSnapshot } from "@/app/monitoring/services/asset-dashboard-adapter";
import {
  fetchBackendWorkflowTree,
  findAssetNode,
  findAssetPathNode,
  findLocationNode,
  findSiteNode,
  toAssetModel,
  toLocationModel,
  toSiteModel,
} from "@/app/site/utils/backend-workflow";
import { AssetReportPage } from "@/app/site/[site_id]/location/[locationId]/asset/[asset_id]/components/asset-report-page";

export default async function AssetReportRoute({ params }) {
  const monitoringTree = await fetchBackendWorkflowTree();
  const siteNode = findSiteNode(monitoringTree, params.site_id);
  const locationNode = siteNode
    ? findLocationNode(siteNode, params.locationId)
    : undefined;
  const assetNode = locationNode
    ? findAssetNode(locationNode, params.asset_id)
    : undefined;
  const resolvedAssetPath =
    siteNode && locationNode && assetNode
      ? { assetNode, locationNode, siteNode }
      : findAssetPathNode(monitoringTree, params.asset_id);

  if (!resolvedAssetPath) {
    notFound();
  }

  const site = toSiteModel(resolvedAssetPath.siteNode);
  const location = toLocationModel(
    resolvedAssetPath.siteNode,
    resolvedAssetPath.locationNode,
  );
  const asset = toAssetModel(resolvedAssetPath);
  const remoteDashboard = await loadRemoteDashboard(params.asset_id);

  return (
    <AssetReportPage
      asset={applyRemoteHeaderToAsset(asset, remoteDashboard)}
      asset_id={params.asset_id}
      location={location}
      remoteDashboard={remoteDashboard}
      site={site}
    />
  );
}

async function loadRemoteDashboard(asset_id) {
  try {
    return toAssetDashboardRemoteSnapshot(await fetchAssetDashboard(asset_id));
  } catch (error) {
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
