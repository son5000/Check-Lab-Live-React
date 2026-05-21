import { createLocation, } from "@/app/site/services/site-management-api";
export const dynamic = "force-dynamic";
export async function POST(request) {
    try {
        const body = (await request.json());
        const result = await createLocation(body);
        return Response.json(result ?? { ok: true }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] location create proxy failed", { error });
        return Response.json({ message: "Failed to create location." }, { status: 502 });
    }
}
