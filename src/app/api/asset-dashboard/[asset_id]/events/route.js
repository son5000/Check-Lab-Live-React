import { fetchAssetEvents } from "@/app/monitoring/services/asset-events-api";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = readLimit(searchParams.get("limit"), 100);
        const events = await fetchAssetEvents(params.asset_id, { limit });
        return Response.json(events, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset events proxy failed", {
            asset_id: params.asset_id,
            error,
        });
        return Response.json([], {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
}
function readLimit(value, fallback) {
    const limit = Number(value);
    return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : fallback;
}
