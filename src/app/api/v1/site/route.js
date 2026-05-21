import { createSite, fetchSites, } from "@/app/site/services/site-management-api";
export const dynamic = "force-dynamic";
export async function GET() {
    try {
        const result = await fetchSites();
        return Response.json(result, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] site list proxy failed", { error });
        return Response.json({ message: "Failed to load sites." }, { status: 502 });
    }
}
export async function POST(request) {
    try {
        const body = (await request.json());
        const result = await createSite(body);
        return Response.json(result ?? { ok: true }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] site create proxy failed", { error });
        return Response.json({ message: "Failed to create site." }, { status: 502 });
    }
}
