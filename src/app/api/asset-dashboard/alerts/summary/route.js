import { fetchAlertSummary } from "@/app/monitoring/services/asset-alerts-api";
export const dynamic = "force-dynamic";
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const summary = await fetchAlertSummary({
            asset_id: searchParams.get("asset_id") ?? undefined,
            isRead: readOptionalBoolean(searchParams.get("is_read")),
        });
        return Response.json(summary, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] alert summary proxy failed", { error });
        return Response.json({
            abnormal_count: 0,
            caution_count: 0,
            latest_created_at: null,
            normal_count: 0,
            total_count: 0,
            unread_count: 0,
            warning_count: 0,
        }, {
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
