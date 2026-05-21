import { fetchSiteLocations } from "@/app/site/services/site-management-api";
export const dynamic = "force-dynamic";
export async function GET(_request, { params }) {
    try {
        const result = await fetchSiteLocations(params.site_id);
        return Response.json(result, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] site location list proxy failed", {
            error,
            site_id: params.site_id,
        });
        return Response.json({ message: "Failed to load site locations." }, { status: 502 });
    }
}
