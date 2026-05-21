import { deleteSite, fetchSite, updateSite, } from "@/app/site/services/site-management-api";
export const dynamic = "force-dynamic";
export async function GET(_request, { params }) {
    try {
        const result = await fetchSite(params.site_id);
        return Response.json(result, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] site detail proxy failed", {
            error,
            site_id: params.site_id,
        });
        return Response.json({ message: "Failed to load site." }, { status: 502 });
    }
}
export async function PUT(request, { params }) {
    try {
        const body = (await request.json());
        const result = await updateSite(params.site_id, body);
        return Response.json(result ?? { ok: true }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] site update proxy failed", {
            error,
            site_id: params.site_id,
        });
        return Response.json({ message: "Failed to update site." }, { status: 502 });
    }
}
export async function DELETE(_request, { params }) {
    try {
        const result = await deleteSite(params.site_id);
        return Response.json(result ?? { ok: true }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] site delete proxy failed", {
            error,
            site_id: params.site_id,
        });
        return Response.json({ message: "Failed to delete site." }, { status: 502 });
    }
}
