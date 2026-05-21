import { notFound } from "next/navigation";
import { MainLayout } from "@/app/layouts/main-layout";
import { fetchAssetDashboard } from "@/app/monitoring/services/asset-dashboard-api";
import { toAssetDashboardRemoteSnapshot } from "@/app/monitoring/services/asset-dashboard-adapter";
import { AssetDashboardPage as AssetDashboardView } from "@/app/site/[site_id]/location/[locationId]/asset/[asset_id]/components/asset-dashboard-page";
export default async function AssetDashboardPage({ params, searchParams, }) {
    const asset_id = decodeURIComponent(params.asset_id);
    const remoteDashboard = await loadRemoteDashboard(asset_id);
    if (!remoteDashboard) {
        notFound();
    }
    const path = remoteDashboard.header?.path?.length
        ? remoteDashboard.header.path
        : ["CheckLab", "설비", asset_id];
    const status = remoteDashboard.header?.dashboardStatus ?? "normal";
    const site = buildSite(path, status, remoteDashboard);
    const location = buildLocation(path, site, status);
    const asset = buildAsset({
        asset_id,
        location,
        site,
        remoteDashboard,
    });
    const headerState = buildHeaderState(path, status, remoteDashboard);
    return (<MainLayout activeNodeId={asset.asset_id} clockOverride={remoteDashboard.clock} headerState={headerState}>
      <AssetDashboardView asset_id={asset_id} initialEventId={searchParams?.eventId} site={site} location={location} remoteDashboard={remoteDashboard} asset={asset}/>
    </MainLayout>);
}
async function loadRemoteDashboard(asset_id) {
    try {
        return toAssetDashboardRemoteSnapshot(await fetchAssetDashboard(asset_id));
    }
    catch (error) {
        console.warn("Failed to load asset dashboard API.", { asset_id, error });
        return null;
    }
}
function buildSite(path, status, remoteDashboard) {
    return {
        alertCount: remoteDashboard.header?.recentAlertCount ?? 0,
        description: `${path.at(-1) ?? "설비"} 실시간 관제`,
        assetCount: 1,
        href: "/",
        locationCount: 1,
        name: path[0] ?? "CheckLab",
        site_id: slugify(path[0] ?? "checklab"),
        status,
    };
}
function buildLocation(path, site, status) {
    const locationName = path.length > 2 ? path[path.length - 2] : "설비";
    return {
        assetCount: 1,
        floor: "-",
        href: site.href,
        id: slugify(locationName),
        name: locationName,
        site_id: site.site_id,
        status,
        summary: `${path.at(-1) ?? "설비"} 상태를 DB 대시보드 기준으로 표시합니다.`,
    };
}
function buildAsset({ asset_id, location, site, remoteDashboard, }) {
    const assetName = remoteDashboard.header?.assetName ?? asset_id;
    return {
        asset_id,
        href: `/monitoring/realtime/${encodeURIComponent(asset_id)}`,
        id: asset_id,
        lastCollectedAt: remoteDashboard.header?.lastCollectedAt ?? "--:--:--",
        locationId: location.id,
        name: assetName,
        site_id: site.site_id,
        status: remoteDashboard.header?.dashboardStatus ?? "normal",
        type: "설비",
    };
}
function buildHeaderState(path, status, remoteDashboard) {
    return {
        assetStatus: status,
        assetStatusLabel: remoteDashboard.header?.overallStatusLabel ?? statusLabel[status],
        lastCollectedAt: remoteDashboard.header?.lastCollectedAt ?? "--:--:--",
        selectedPath: path,
        unresolvedAlarmCount: remoteDashboard.header?.recentAlertCount ?? 0,
        userName: "CheckLab",
    };
}
function slugify(value) {
    return (value
        .trim()
        .toLowerCase()
        .replace(/[^0-9a-z가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "") || "node");
}
const statusLabel = {
    caution: "주의",
    danger: "이상",
    error: "오류",
    normal: "정상",
    warning: "경고",
};
