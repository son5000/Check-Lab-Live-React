import { markEventRead } from "@/app/monitoring/services/asset-events-api";
export const dynamic = "force-dynamic";
const DEFAULT_FRONTEND_USER_ID = "frontend-user-id";
export async function PUT(request, { params }) {
    try {
        const body = (await request.json());
        const readBy = body.read_by?.trim() || DEFAULT_FRONTEND_USER_ID;
        const event = await markEventRead(params.eventId, readBy);
        return Response.json(event, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] event read proxy failed", {
            error,
            eventId: params.eventId,
        });
        return Response.json({ message: "Failed to mark event as read." }, { status: 502 });
    }
}
