import { cookies } from "next/headers";
import { LoginPanel } from "@/app/auth/login-panel";
import { CHECKLAB_AUTH_COOKIE_NAME, isValidCheckLabToken, } from "@/app/auth/session";
import { MainLayout } from "@/app/layouts/main-layout";
import { SiteIndexPage } from "@/app/site/components/site-index-page";
import { buildBackendHeaderState, fetchBackendWorkflowTree, } from "@/app/site/utils/backend-workflow";
export default async function Home() {
    const token = cookies().get(CHECKLAB_AUTH_COOKIE_NAME)?.value;
    if (!isValidCheckLabToken(token)) {
        return <LoginPanel />;
    }
    const monitoringTree = await fetchBackendWorkflowTree();
    return (<MainLayout activeNodeId="overview" headerState={buildBackendHeaderState({})} initialMonitoringTree={monitoringTree}>
      <SiteIndexPage />
    </MainLayout>);
}
