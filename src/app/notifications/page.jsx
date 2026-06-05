import { MainLayout } from "@/app/layouts/main-layout";
import { fetchAlerts } from "@/app/monitoring/services/asset-alerts-api";
import { fetchAssetEvents } from "@/app/monitoring/services/asset-events-api";
import { enrichAlertsWithDashboardContext } from "@/app/monitoring/services/dashboard-asset-context";
import {
  buildBackendHeaderState,
  fetchBackendWorkflowTree,
} from "@/app/site/utils/backend-workflow";
import { NotificationWorkbench } from "./components/notification-workbench";

const INITIAL_ALERT_LIMIT = 200;
const INITIAL_EVENT_LIMIT = 80;
const INITIAL_EVENT_ASSET_LIMIT = 60;

export default async function NotificationsPage() {
  const monitoringTree = await fetchBackendWorkflowTree();
  const assetOptions = collectAssetOptions(monitoringTree);
  const [initialAlerts, initialEventGroups] = await Promise.all([
    loadInitialAlerts(),
    loadInitialEventGroups(assetOptions),
  ]);

  return (
    <MainLayout
      activeNodeId="notifications"
      headerState={buildBackendHeaderState({})}
      initialMonitoringTree={monitoringTree}
    >
      <NotificationWorkbench
        assetOptions={assetOptions}
        initialAlerts={initialAlerts}
        initialEventGroups={initialEventGroups}
      />
    </MainLayout>
  );
}

async function loadInitialAlerts() {
  try {
    return await enrichAlertsWithDashboardContext(
      await fetchAlerts({ limit: INITIAL_ALERT_LIMIT }),
    );
  } catch (error) {
    console.error("[CheckLab API] failed to load notification page alerts", {
      error,
    });
    return [];
  }
}

async function loadInitialEventGroups(assetOptions) {
  const assets = assetOptions.slice(0, INITIAL_EVENT_ASSET_LIMIT);
  const groups = await Promise.all(
    assets.map(async (asset) => {
      try {
        return {
          asset,
          events: await fetchAssetEvents(asset.id, { limit: INITIAL_EVENT_LIMIT }),
        };
      } catch (error) {
        console.warn("[CheckLab API] failed to load notification page events", {
          asset_id: asset.id,
          error,
        });
        return { asset, events: [] };
      }
    }),
  );

  return groups;
}

function collectAssetOptions(tree) {
  const assets = [];
  const visit = (node, path = []) => {
    const nextPath = node?.label ? [...path, node.label] : path;

    if (node?.type === "asset") {
      assets.push({
        href: node.href,
        id: node.id,
        label: node.label ?? node.id,
        locationLabel: path.at(-1) ?? "",
        path: nextPath,
        siteLabel: path[1] ?? path[0] ?? "",
        status: node.status ?? "normal",
      });
      return;
    }

    (node?.children ?? []).forEach((child) => visit(child, nextPath));
  };

  visit(tree);
  return assets.sort((first, second) =>
    first.label.localeCompare(second.label, "ko-KR"),
  );
}
