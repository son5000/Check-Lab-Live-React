"use client";

import { ChevronDown, ChevronRight, Cpu, Factory, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";

export function SiteTree({
  activeLocationIndex,
  activeSiteIndex,
  expandedLocations,
  expandedSites,
  sites,
  onSelectLocation,
  onSelectSite,
  onToggleLocation,
  onToggleSite,
}) {
  return (
    <aside className="SiteTree SiteIndexPage__site-list-1 flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground">
      <div className="SiteTree SiteIndexPage__site-list-head-1 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h2 className="SiteTree SiteIndexPage__title-2 truncate text-sm font-semibold">
          공정 목록
        </h2>
        <span className="SiteTree SiteIndexPage__count-1 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {sites.length}
        </span>
      </div>
      <div className="SiteTree SiteIndexPage__site-list-body-1 flex-1 space-y-1 overflow-y-auto p-2">
        {sites.length ? (
          sites.map((site, siteIndex) => (
            <SiteTreeItem
              key={site.site_id}
              activeLocationIndex={activeLocationIndex}
              activeSiteIndex={activeSiteIndex}
              expandedLocations={expandedLocations}
              isExpanded={expandedSites[site.site_id] ?? false}
              site={site}
              siteIndex={siteIndex}
              onSelectLocation={onSelectLocation}
              onSelectSite={onSelectSite}
              onToggleLocation={onToggleLocation}
              onToggleSite={onToggleSite}
            />
          ))
        ) : (
          <div className="SiteTree SiteIndexPage__empty-1 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            등록된 공정 없음
          </div>
        )}
      </div>
    </aside>
  );
}

function SiteTreeItem({
  activeLocationIndex,
  activeSiteIndex,
  expandedLocations,
  isExpanded,
  site,
  siteIndex,
  onSelectLocation,
  onSelectSite,
  onToggleLocation,
  onToggleSite,
}) {
  const isActiveSite = activeSiteIndex === siteIndex;

  return (
    <div>
      <div
        className={cn(
          "SiteTree SiteIndexPage__tree-site-1 group flex min-w-0 items-center gap-1 rounded-md border border-border bg-background transition hover:bg-accent/55",
          isActiveSite && "border-cyan-300/50 bg-cyan-300/10",
        )}
      >
        <button
          type="button"
          className="SiteTree SiteIndexPage__tree-toggle-1 flex h-10 w-8 shrink-0 items-center justify-center text-muted-foreground transition hover:text-foreground"
          onClick={() => onToggleSite(site.site_id)}
          aria-label={isExpanded ? "접기" : "펼치기"}
        >
          <TreeChevron isExpanded={isExpanded} hasChildren={site.locations.length > 0} />
        </button>
        <button
          type="button"
          className="SiteTree SiteIndexPage__tree-site-btn-1 flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left"
          onClick={() => onSelectSite(siteIndex)}
        >
          <span className="SiteTree SiteIndexPage__tree-site-icon-1 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card">
            <Factory className="SiteTree h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="SiteTree min-w-0 flex-1">
            <span className="SiteTree block truncate text-sm font-semibold">{site.name}</span>
            <span className="SiteTree block truncate text-xs text-muted-foreground">
              {site.site_id}
            </span>
          </span>
        </button>
      </div>

      {isExpanded
        ? site.locations.map((location, locationIndex) => (
            <LocationTreeItem
              key={location.location_id}
              isActive={isActiveSite && activeLocationIndex === locationIndex}
              isExpanded={expandedLocations[location.location_id] ?? false}
              location={location}
              locationIndex={locationIndex}
              siteIndex={siteIndex}
              onSelectLocation={onSelectLocation}
              onToggleLocation={onToggleLocation}
            />
          ))
        : null}
    </div>
  );
}

function LocationTreeItem({
  isActive,
  isExpanded,
  location,
  locationIndex,
  siteIndex,
  onSelectLocation,
  onToggleLocation,
}) {
  return (
    <div className="SiteTree ml-7">
      <div
        className={cn(
          "SiteTree SiteIndexPage__tree-location-1 mt-1 flex min-w-0 items-center gap-1 rounded-md border border-border bg-background transition hover:bg-accent/55",
          isActive && "border-cyan-300/50 bg-cyan-300/10",
        )}
      >
        <button
          type="button"
          className="SiteTree SiteIndexPage__tree-toggle-2 flex h-9 w-7 shrink-0 items-center justify-center text-muted-foreground transition hover:text-foreground"
          onClick={() => onToggleLocation(location.location_id)}
          aria-label={isExpanded ? "접기" : "펼치기"}
        >
          <TreeChevron
            isExpanded={isExpanded}
            hasChildren={location.assets.length > 0}
            sizeClassName="h-3 w-3"
          />
        </button>
        <button
          type="button"
          className="SiteTree SiteIndexPage__tree-location-btn-1 flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left"
          onClick={() => onSelectLocation(locationIndex, siteIndex)}
        >
          <MapPin className="SiteTree h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="SiteTree min-w-0 flex-1">
            <span className="SiteTree block truncate text-sm font-medium">{location.name}</span>
            <span className="SiteTree block truncate text-xs text-muted-foreground">
              {location.floor || location.location_id}
            </span>
          </span>
        </button>
      </div>

      {isExpanded
        ? location.assets.map((asset) => <AssetTreeItem key={asset.asset_id} asset={asset} />)
        : null}
    </div>
  );
}

function AssetTreeItem({ asset }) {
  return (
    <div className="SiteTree SiteIndexPage__tree-asset-1 ml-7 mt-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      <Cpu className="SiteTree h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="SiteTree min-w-0 flex-1">
        <span className="SiteTree block truncate text-xs font-medium">{asset.name}</span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-sm border px-1 py-0.5 text-[10px] font-semibold",
          dashboardStatusClassName[asset.status],
        )}
      >
        {asset.status}
      </span>
    </div>
  );
}

function TreeChevron({
  hasChildren,
  isExpanded,
  sizeClassName = "h-3.5 w-3.5",
}) {
  if (!hasChildren) {
    return <span className={sizeClassName} />;
  }

  const Icon = isExpanded ? ChevronDown : ChevronRight;
  return <Icon className={sizeClassName} aria-hidden="true" />;
}
