import { deleteAsset, updateAsset, } from "@/app/site/services/site-management-api";
export const dynamic = "force-dynamic";
export async function PUT(request, { params }) {
    try {
        const body = (await request.json());
        const result = await updateAsset(params.asset_id, body);
        return Response.json(result ?? { ok: true }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset update proxy failed", {
            asset_id: params.asset_id,
            error,
        });
        return Response.json({ message: "Failed to update asset." }, { status: 502 });
    }
}
export async function DELETE(_request, { params }) {
    try {
        const result = await deleteAsset(params.asset_id);
        return Response.json(result ?? { ok: true }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset delete proxy failed", {
            asset_id: params.asset_id,
            error,
        });
        return Response.json({ message: "Failed to delete asset." }, { status: 502 });
    }
}
