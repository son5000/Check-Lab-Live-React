import { buildCheckLabApiUrl, requestCheckLabJson, } from "@/app/monitoring/services/checklab-api-client";
export async function fetchSites() {
    const url = buildCheckLabApiUrl("api/v1/site");
    return requestCheckLabJson(url, {
        method: "GET",
        requestName: "site list",
    });
}
export async function fetchSite(site_id) {
    const url = buildCheckLabApiUrl(`api/v1/site/${encodeURIComponent(site_id)}`);
    return requestCheckLabJson(url, {
        context: { site_id },
        method: "GET",
        requestName: "site detail",
    });
}
export async function fetchSiteLocations(site_id) {
    const url = buildCheckLabApiUrl(`api/v1/site/${encodeURIComponent(site_id)}/location`);
    return requestCheckLabJson(url, {
        context: { site_id },
        method: "GET",
        requestName: "site location list",
    });
}
export async function fetchSiteLocation(site_id, location_id) {
    const url = buildCheckLabApiUrl(`api/v1/site/${encodeURIComponent(site_id)}/location/${encodeURIComponent(location_id)}`);
    return requestCheckLabJson(url, {
        context: { location_id, site_id },
        method: "GET",
        requestName: "site location detail",
    });
}
export async function fetchSiteLocationAssets(site_id, location_id) {
    const url = buildCheckLabApiUrl(`api/v1/site/${encodeURIComponent(site_id)}/location/${encodeURIComponent(location_id)}/assets`);
    return requestCheckLabJson(url, {
        context: { location_id, site_id },
        method: "GET",
        requestName: "site location asset list",
    });
}
export async function createSite(payload) {
    const url = buildCheckLabApiUrl("api/v1/site");
    return requestCheckLabJson(url, {
        body: payload,
        context: {
            locationCount: payload.locations?.length ?? 0,
            process_name: payload.process_name,
        },
        method: "POST",
        requestName: "site create",
    });
}
export async function updateSite(site_id, payload) {
    const url = buildCheckLabApiUrl(`api/v1/site/${encodeURIComponent(site_id)}`);
    return requestCheckLabJson(url, {
        body: payload,
        context: { process_name: payload.process_name, site_id },
        method: "PUT",
        requestName: "site update",
    });
}
export async function deleteSite(site_id) {
    const url = buildCheckLabApiUrl(`api/v1/site/${encodeURIComponent(site_id)}`);
    return requestCheckLabJson(url, {
        context: { site_id },
        method: "DELETE",
        requestName: "site delete",
    });
}
export async function createLocation(payload) {
    const url = buildCheckLabApiUrl("api/v1/location");
    return requestCheckLabJson(url, {
        body: payload,
        context: { name: payload.name, site_id: payload.site_id },
        method: "POST",
        requestName: "location create",
    });
}
export async function updateLocation(location_id, payload) {
    const url = buildCheckLabApiUrl(`api/v1/location/${encodeURIComponent(location_id)}`);
    return requestCheckLabJson(url, {
        body: payload,
        context: { location_id, name: payload.name },
        method: "PUT",
        requestName: "location update",
    });
}
export async function deleteLocation(location_id) {
    const url = buildCheckLabApiUrl(`api/v1/location/${encodeURIComponent(location_id)}`);
    return requestCheckLabJson(url, {
        context: { location_id },
        method: "DELETE",
        requestName: "location delete",
    });
}
export async function createAsset(payload) {
    const url = buildCheckLabApiUrl("api/v1/asset");
    return requestCheckLabJson(url, {
        body: payload,
        context: { location_id: payload.location_id, name: payload.name },
        method: "POST",
        requestName: "asset create",
    });
}
export async function updateAsset(asset_id, payload) {
    const url = buildCheckLabApiUrl(`api/v1/asset/${encodeURIComponent(asset_id)}`);
    return requestCheckLabJson(url, {
        body: payload,
        context: { asset_id, name: payload.name },
        method: "PUT",
        requestName: "asset update",
    });
}
export async function deleteAsset(asset_id) {
    const url = buildCheckLabApiUrl(`api/v1/asset/${encodeURIComponent(asset_id)}`);
    return requestCheckLabJson(url, {
        context: { asset_id },
        method: "DELETE",
        requestName: "asset delete",
    });
}
