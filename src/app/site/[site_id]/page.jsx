import { notFound } from "next/navigation";
import { MainLayout } from "@/app/layouts/main-layout";
import { buildBackendHeaderState, fetchBackendWorkflowTree, findSiteNode, toAssetModels, toLocationModels, toSiteModel, } from "@/app/site/utils/backend-workflow";
import { fetchSite, fetchSiteLocations, fetchSites, } from "@/app/site/services/site-management-api";
import { SiteSummaryPage } from "@/app/site/[site_id]/components/site-summary-page";
export default async function SitePage({ params }) {
    const [monitoringTree, siteDetail, siteLocations, siteSummaries] = await Promise.all([
        fetchBackendWorkflowTree(),
        fetchSite(params.site_id).catch((error) => {
            console.error("[CheckLab API] failed to load site detail", {
                error,
                site_id: params.site_id,
            });
            return undefined;
        }),
        fetchSiteLocations(params.site_id).catch((error) => {
            console.error("[CheckLab API] failed to load site locations", {
                error,
                site_id: params.site_id,
            });
            return [];
        }),
        fetchSites().catch((error) => {
            console.error("[CheckLab API] failed to load site summary fallback", {
                error,
                site_id: params.site_id,
            });
            return [];
        }),
    ]);
    const siteNode = findSiteNode(monitoringTree, params.site_id);
    const siteSummary = siteSummaries.find((summary) => summary.site_id === params.site_id);
    const siteResponse = siteDetail ?? siteSummary;
    if (!siteNode && !siteResponse) {
        notFound();
    }
    const site = siteResponse
        ? toSiteModelFromSummary(siteResponse)
        : toSiteModel(siteNode);
    const locations = siteLocations.length
        ? siteLocations.map(toLocationModelFromSummary)
        : siteNode
            ? toLocationModels(siteNode)
            : [];
    const assets = siteNode ? toAssetModels(siteNode) : [];
    return (<MainLayout activeNodeId={site.site_id} headerState={buildBackendHeaderState({ site })} initialMonitoringTree={monitoringTree}>
      <SiteSummaryPage site={site} locations={locations} assets={assets}/>
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
function toLocationModelFromSummary(location) {
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
