import { notFound } from "next/navigation";
import { MainLayout } from "@/app/layouts/main-layout";
import { buildBackendHeaderState, fetchBackendWorkflowTree, findSiteNode, toAssetModels, toLocationModels, toSiteModel, } from "@/app/site/utils/backend-workflow";
import { SiteSummaryPage } from "@/app/site/[site_id]/components/site-summary-page";
export default async function SiteLocationIndexPage({ params, }) {
    const monitoringTree = await fetchBackendWorkflowTree();
    const siteNode = findSiteNode(monitoringTree, params.site_id);
    if (!siteNode) {
        notFound();
    }
    const site = toSiteModel(siteNode);
    const locations = toLocationModels(siteNode);
    const assets = toAssetModels(siteNode);
    return (<MainLayout activeNodeId={site.site_id} headerState={buildBackendHeaderState({ site })} initialMonitoringTree={monitoringTree}>
      <SiteSummaryPage site={site} locations={locations} assets={assets}/>
    </MainLayout>);
}
