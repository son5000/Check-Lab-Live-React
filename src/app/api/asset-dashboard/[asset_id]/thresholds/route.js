import { fetchAssetThresholds, toAssetThresholdConfig, updateAssetThresholds, } from "@/app/monitoring/services/asset-threshold-api";
export const dynamic = "force-dynamic";
const DEFAULT_FRONTEND_USER_ID = "frontend-user-id";
export async function GET(_request, { params }) {
    try {
        const response = await fetchAssetThresholds(params.asset_id);
        return Response.json(toAssetThresholdConfig(response), {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset thresholds proxy failed", {
            asset_id: params.asset_id,
            error,
        });
        return Response.json({ message: "Failed to load asset thresholds." }, { status: 502 });
    }
}
export async function PUT(request, { params }) {
    try {
        const body = (await request.json());
        const payload = toThresholdUpdatePayload(body);
        const response = await updateAssetThresholds(params.asset_id, payload);
        return Response.json(toAssetThresholdConfig(response), {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] asset thresholds update proxy failed", {
            asset_id: params.asset_id,
            error,
        });
        return Response.json({ message: "Failed to save asset thresholds." }, { status: 502 });
    }
}
function toThresholdUpdatePayload(body) {
    const payload = {
        acoustic_critical_db: readPositiveNumber(body.acoustic_critical_db),
        acoustic_warn_db: readPositiveNumber(body.acoustic_warn_db),
        temperature_critical_c: readPositiveNumber(body.temperature_critical_c),
        temperature_warn_c: readPositiveNumber(body.temperature_warn_c),
        updated_by: body.updated_by?.trim() || DEFAULT_FRONTEND_USER_ID,
    };
    if (payload.temperature_critical_c < payload.temperature_warn_c) {
        throw new Error("Temperature critical threshold must be >= warn threshold.");
    }
    if (payload.acoustic_critical_db < payload.acoustic_warn_db) {
        throw new Error("Acoustic critical threshold must be >= warn threshold.");
    }
    return payload;
}
function readPositiveNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error("Threshold values must be positive finite numbers.");
    }
    return value;
}
