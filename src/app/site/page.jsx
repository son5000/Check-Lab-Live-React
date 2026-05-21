import { MainLayout } from "@/app/layouts/main-layout";
import { SiteIndexPage } from "@/app/site/components/site-index-page";
import { fetchSites } from "@/app/site/services/site-management-api";
import { buildBackendHeaderState, fetchBackendWorkflowTree, } from "@/app/site/utils/backend-workflow";
export default async function SiteIndexRoutePage() {
    const [monitoringTree, sites] = await Promise.all([
        fetchBackendWorkflowTree(),
        fetchSites().catch((error) => {
            console.error("[CheckLab API] failed to load site index list", { error });
            return [];
        }),
    ]);
    return (<MainLayout activeNodeId="overview" headerState={buildBackendHeaderState({})} initialMonitoringTree={monitoringTree}>
      <SiteIndexPage initialSites={sites}/>
    </MainLayout>);
}
