import { fetchSiteLocation } from "@/app/site/services/site-management-api";
export const dynamic = "force-dynamic";
export async function GET(_request, { params }) {
    try {
        const result = await fetchSiteLocation(params.site_id, params.location_id);
        return Response.json(result, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] site location detail proxy failed", {
            error,
            location_id: params.location_id,
            site_id: params.site_id,
        });
        return Response.json({ message: "Failed to load site location." }, { status: 502 });
    }
}
