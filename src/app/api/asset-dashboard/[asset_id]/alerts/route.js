import { fetchAlerts } from "@/app/monitoring/services/asset-alerts-api";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = readLimit(searchParams.get("limit"), 20);
        const alerts = await fetchAlerts({
            asset_id: params.asset_id,
            isRead: readOptionalBoolean(searchParams.get("is_read")),
            limit,
        });
        return Response.json(alerts, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset alerts proxy failed", {
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
function readOptionalBoolean(value) {
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }
    return undefined;
}
function readLimit(value, fallback) {
    const limit = Number(value);
    return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : fallback;
}
