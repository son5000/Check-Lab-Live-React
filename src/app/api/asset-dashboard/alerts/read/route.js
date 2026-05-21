import { markAlertsRead } from "@/app/monitoring/services/asset-alerts-api";
export const dynamic = "force-dynamic";
const DEFAULT_FRONTEND_USER_ID = "frontend-user-id";
export async function PUT(request) {
    try {
        const body = (await request.json());
        const readBy = body.read_by?.trim() || DEFAULT_FRONTEND_USER_ID;
        const result = await markAlertsRead({
            alert_ids: body.alert_ids,
            asset_id: body.asset_id,
            only_unread: body.only_unread,
            read_by: readBy,
        });
        return Response.json(result, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] bulk alert read proxy failed", { error });
        return Response.json({ message: "Failed to mark alerts as read." }, { status: 502 });
    }
}
