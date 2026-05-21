import { fetchAlerts } from "@/app/monitoring/services/asset-alerts-api";
import { buildMonitoringTreeFromAssetContexts, fetchDashboardAssetContexts, } from "@/app/monitoring/services/dashboard-asset-context";
import { fetchMonitoringTree, getEmptyMonitoringTree, } from "@/app/monitoring/services/monitoring-tree-api";
export async function fetchBackendMonitoringTree() {
    try {
        return await fetchMonitoringTree();
    }
    catch (error) {
        console.warn("[CheckLab API] native monitoring tree unavailable", {
            error,
        });
    }
    try {
        const alerts = await fetchAlerts({ limit: 200 });
        const assetIds = alerts
            .map((alert) => alert.asset_id?.trim())
            .filter((asset_id) => Boolean(asset_id));
        const contexts = await fetchDashboardAssetContexts(Array.from(new Set(assetIds)));
        return buildMonitoringTreeFromAssetContexts(contexts);
    }
    catch (error) {
        console.warn("[CheckLab API] fallback monitoring tree unavailable", {
            error,
        });
        return getEmptyMonitoringTree();
    }
}
