import { notFound } from "next/navigation";
import { MainLayout } from "@/app/layouts/main-layout";
import { buildBackendHeaderState, fetchBackendWorkflowTree, findLocationNode, findSiteNode, toAssetModel, toLocationModel, toSiteModel, } from "@/app/site/utils/backend-workflow";
import { LocationSummaryPage } from "@/app/site/[site_id]/location/[locationId]/components/location-summary-page";
export default async function AssetIndexPage({ params }) {
    const monitoringTree = await fetchBackendWorkflowTree();
    const siteNode = findSiteNode(monitoringTree, params.site_id);
    const locationNode = siteNode
        ? findLocationNode(siteNode, params.locationId)
        : undefined;
    if (!siteNode || !locationNode) {
        notFound();
    }
    const site = toSiteModel(siteNode);
    const location = toLocationModel(siteNode, locationNode);
    const assets = (locationNode.children ?? []).map((assetNode) => toAssetModel({ assetNode, locationNode, siteNode }));
    return (<MainLayout activeNodeId={location.id} headerState={buildBackendHeaderState({ site, location })} initialMonitoringTree={monitoringTree}>
      <LocationSummaryPage site={site} location={location} assets={assets}/>
    </MainLayout>);
}
