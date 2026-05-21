import { createAlertSuppression } from "@/app/monitoring/services/asset-alerts-api";
export const dynamic = "force-dynamic";
const DEFAULT_FRONTEND_USER_ID = "frontend-user-id";
const DEFAULT_SUPPRESSION_DURATION_SECONDS = 180;
export async function POST(request) {
    try {
        const body = (await request.json());
        const asset_id = body.asset_id?.trim();
        if (!asset_id) {
            return Response.json({ message: "asset_id is required." }, { status: 400 });
        }
        const suppression = await createAlertSuppression({
            asset_id: asset_id,
            duration_seconds: readPositiveDuration(body.duration_seconds, DEFAULT_SUPPRESSION_DURATION_SECONDS),
            reason: body.reason,
            suppressed_by: body.suppressed_by?.trim() || DEFAULT_FRONTEND_USER_ID,
        });
        return Response.json(suppression, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] alert suppression proxy failed", { error });
        return Response.json({ message: "Failed to create alert suppression." }, { status: 502 });
    }
}
function readPositiveDuration(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.floor(value)
        : fallback;
}
