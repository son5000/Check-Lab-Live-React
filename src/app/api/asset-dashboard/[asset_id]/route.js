import { getDisplaySettingsFromSearchParams } from "@/app/layouts/helpers/display-settings";
import { fetchAssetDashboard } from "@/app/monitoring/services/asset-dashboard-api";
import { toAssetDashboardRemoteSnapshot } from "@/app/monitoring/services/asset-dashboard-adapter";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
    try {
        const searchParams = request.nextUrl?.searchParams ?? new URL(request.url).searchParams;
        const displaySettings = getDisplaySettingsFromSearchParams(searchParams);
        const response = await fetchAssetDashboard(params.asset_id);
        const snapshot = toAssetDashboardRemoteSnapshot(response, displaySettings);
        return Response.json(snapshot, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset dashboard proxy failed", {
            asset_id: params.asset_id,
            error,
        });
        return Response.json({ message: "Failed to load asset dashboard." }, { status: 502 });
    }
}
