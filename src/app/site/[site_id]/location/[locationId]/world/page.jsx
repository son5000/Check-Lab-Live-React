import { notFound } from "next/navigation";
import {
    fetchSite,
    fetchSiteLocation,
    fetchSiteLocationAssets,
    fetchSiteLocations,
    fetchSites,
} from "@/app/site/services/site-management-api";
import { LocationWorldViewerPage } from "@/app/site/[site_id]/location/[locationId]/world/location-world-viewer-page";
const dashboardStatuses = [
    "normal",
    "caution",
    "warning",
    "danger",
    "error",
];
export default async function LocationWorldPage({ params }) {
    const siteSummaries = await fetchSites().catch((error) => {
        console.error("[CheckLab API] failed to load world site list", {
            error,
            site_id: params.site_id,
        });
        return [];
    });
    const siteSummary = siteSummaries.find((summary) => matchesSiteRoute(summary, params.site_id));
    const resolvedSiteId = siteSummary?.site_id ?? params.site_id;
    const [siteDetail, siteLocations] = await Promise.all([
        fetchSite(resolvedSiteId).catch((error) => {
            console.error("[CheckLab API] failed to load world site", {
                error,
                site_id: resolvedSiteId,
            });
            return undefined;
        }),
        fetchSiteLocations(resolvedSiteId).catch((error) => {
            console.error("[CheckLab API] failed to load world location list", {
                error,
                site_id: resolvedSiteId,
            });
            return [];
        }),
    ]);
    const locationSummary = siteLocations.find((summary) => matchesLocationRoute(summary, params.locationId, siteSummary ?? siteDetail));
    const resolvedLocationId = locationSummary?.location_id ?? params.locationId;
    const [locationDetail, locationAssets] = await Promise.all([
        fetchSiteLocation(resolvedSiteId, resolvedLocationId).catch((error) => {
            console.error("[CheckLab API] failed to load world location", {
                error,
                location_id: resolvedLocationId,
                site_id: resolvedSiteId,
            });
            return undefined;
        }),
        fetchSiteLocationAssets(resolvedSiteId, resolvedLocationId).catch((error) => {
            console.error("[CheckLab API] failed to load world assets", {
                error,
                location_id: resolvedLocationId,
                site_id: resolvedSiteId,
            });
            return [];
        }),
    ]);
    const resolvedLocation = locationDetail ?? locationSummary;
    if (!resolvedLocation) {
        notFound();
    }
    const site = siteDetail
        ? {
            id: siteDetail.site_id,
            name: siteDetail.site_name || siteDetail.site_id,
        }
        : siteSummary
            ? {
                id: siteSummary.site_id,
                name: siteSummary.site_name || siteSummary.site_id,
            }
        : {
            id: resolvedSiteId,
            name: resolvedSiteId,
        };
    const location = {
        floor: resolvedLocation.display_label || "",
        id: resolvedLocation.location_id,
        name: resolvedLocation.location_name ||
            resolvedLocation.display_label ||
            resolvedLocation.location_id,
        siteId: resolvedLocation.site_id || resolvedSiteId,
        summary: resolvedLocation.description || resolvedLocation.summary || "",
    };
    const assets = locationAssets.map((asset) => ({
        href: `/site/${encodeURIComponent(asset.site_id)}/location/${encodeURIComponent(asset.location_id)}/asset/${encodeURIComponent(asset.asset_id)}`,
        id: asset.asset_id,
        name: asset.display_name || asset.asset_name || asset.asset_id,
        status: dashboardStatuses.includes(asset.status) ? asset.status : "normal",
        type: asset.location_name || asset.asset_type || "설비",
    }));
    return (<LocationWorldViewerPage site={site} location={location} assets={assets}/>);
}
function matchesSiteRoute(site, routeValue) {
    return matchesAnyRouteValue(routeValue, [
        site.site_id,
        site.site_name,
    ]);
}
function matchesLocationRoute(location, routeValue, site) {
    const siteName = site?.site_name;
    return matchesAnyRouteValue(routeValue, [
        location.location_id,
        location.location_name,
        location.display_label,
        siteName && location.location_name
            ? `${siteName} ${location.location_name}`
            : undefined,
        siteName && location.display_label
            ? `${siteName} ${location.display_label}`
            : undefined,
    ]);
}
function matchesAnyRouteValue(routeValue, candidates) {
    const normalizedRouteValue = normalizeRouteValue(routeValue);
    return candidates.some((candidate) => {
        if (!candidate) {
            return false;
        }
        return normalizeRouteValue(candidate) === normalizedRouteValue;
    });
}
function normalizeRouteValue(value) {
    return decodeURIComponent(String(value ?? ""))
        .normalize("NFKD")
        .toLowerCase()
        .replace(/['"]/g, "")
        .replace(/[^0-9a-z가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
