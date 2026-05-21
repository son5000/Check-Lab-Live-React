const DEFAULT_CHECKLAB_API_BASE_URL = "http://192.168.219.46:8000";
const DEFAULT_CHECKLAB_API_TIMEOUT_MS = 3000;
export function buildCheckLabApiUrl(path, query) {
    const baseUrl = process.env.CHECKLAB_API_BASE_URL ??
        process.env.NEXT_PUBLIC_CHECKLAB_API_BASE_URL ??
        DEFAULT_CHECKLAB_API_BASE_URL;
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = new URL(path.replace(/^\/+/, ""), normalizedBaseUrl);
    Object.entries(query ?? {}).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            return;
        }
        url.searchParams.set(key, String(value));
    });
    return url;
}
export function buildCheckLabAssetUrl(asset_id, assetPath, query) {
    return buildCheckLabApiUrl(`api/v1/assets/${encodeURIComponent(asset_id)}/${assetPath.replace(/^\/+/, "")}`, query);
}
export async function requestCheckLabJson(url, { body, context, method = "GET", requestName, timeoutMs = DEFAULT_CHECKLAB_API_TIMEOUT_MS, }) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    let response;
    try {
        response = await fetch(url, {
            body: body === undefined ? undefined : JSON.stringify(body),
            cache: "no-store",
            headers: {
                accept: "application/json",
                ...(body === undefined ? {} : { "content-type": "application/json" }),
            },
            method,
            signal: abortController.signal,
        });
    }
    catch (error) {
        console.error(`[CheckLab API] ${requestName} request unavailable`, {
            ...context,
            error,
            timeoutMs,
            url: String(url),
        });
        throw error;
    }
    finally {
        clearTimeout(timeoutId);
    }
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    const data = (responseText
        ? contentType.includes("application/json")
            ? JSON.parse(responseText)
            : responseText
        : null);
    if (!response.ok) {
        console.error(`[CheckLab API] ${requestName} failed`, {
            ...context,
            data,
            status: response.status,
            statusText: response.statusText,
            url: String(url),
        });
        const error = new Error(readErrorMessage(data) ??
            `${requestName} request failed: ${response.status} ${response.statusText}`);
        error.data = data;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
    }
    console.info(`[CheckLab API] ${requestName} success`, {
        ...context,
        status: response.status,
        url: String(url),
    });
    return data;
}
function readErrorMessage(data) {
    if (typeof data === "string" && data.trim())
        return data.trim();
    if (!data || typeof data !== "object")
        return undefined;
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
