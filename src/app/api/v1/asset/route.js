import { createAsset, } from "@/app/site/services/site-management-api";
export const dynamic = "force-dynamic";
export async function POST(request) {
    try {
        const body = (await request.json());
        const result = await createAsset(body);
        return Response.json(result ?? { ok: true }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset create proxy failed", { error });
        return Response.json(toProxyErrorBody(error), {
            status: typeof error?.status === "number" ? error.status : 502,
        });
    }
}
function toProxyErrorBody(error) {
    const data = error?.data;
    if (data && typeof data === "object") {
        return {
            ...data,
            message: readProxyErrorMessage(data) ?? error.message ?? "Failed to create asset.",
        };
    }
    return {
        message: error instanceof Error && error.message
            ? error.message
            : "Failed to create asset.",
    };
}
function readProxyErrorMessage(data) {
    if (typeof data.message === "string" && data.message.trim())
        return data.message.trim();
    if (typeof data.detail === "string" && data.detail.trim())
        return data.detail.trim();
    if (Array.isArray(data.detail) && data.detail.length) {
        return data.detail
            .map((item) => typeof item?.msg === "string" ? item.msg : undefined)
            .filter(Boolean)
            .join(", ");
    }
    return undefined;
}
