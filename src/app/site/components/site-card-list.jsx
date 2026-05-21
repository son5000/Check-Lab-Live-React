"use client";

import Link from "next/link";
import { ArrowRight, Factory, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";

export function SiteCardList({ isMutating, sites, onRemoveSite, onSelectSite }) {
  return (
    <section className="SiteCardList SiteIndexPage__workspace-2 flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
      {sites.length > 0 ? (
        <div className="SiteCardList flex-1 overflow-y-auto p-4">
          <div className="SiteCardList grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site, siteIndex) => (
              <SiteCard
                key={site.site_id}
                isMutating={isMutating}
                site={site}
                siteIndex={siteIndex}
                onRemoveSite={onRemoveSite}
                onSelectSite={onSelectSite}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptySiteState />
      )}
    </section>
  );
}

function SiteCard({ isMutating, site, siteIndex, onRemoveSite, onSelectSite }) {
  return (
    <article className="SiteCardList SiteIndexPage__site-card-1 group grid gap-3 rounded-lg border border-border bg-background p-4 text-left transition hover:border-cyan-300/50 hover:bg-cyan-300/5">
      {site.imageUrl ? (
        <div className="SiteCardList h-32 overflow-hidden rounded-md bg-muted/50">
          <img
            src={site.imageUrl}
            alt={site.name}
            className="SiteCardList h-full w-full object-cover transition group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="SiteCardList min-w-0">
        <h3 className="SiteCardList truncate text-base font-semibold text-foreground">{site.name}</h3>
        <p className="SiteCardList mt-1 line-clamp-2 text-sm text-muted-foreground">
          {site.description || "설명 없음"}
        </p>
      </div>
      <div className="SiteCardList flex flex-wrap gap-2">
        <span
          className={cn(
            "SiteCardList inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold",
            dashboardStatusClassName[site.status],
          )}
        >
          {site.status}
        </span>
      </div>
      <div className="SiteCardList grid grid-cols-3 gap-2 border-t border-border pt-3">
        <SiteCardCount label="위치" value={site.locationCount} />
        <SiteCardCount label="설비" value={site.assetCount} />
        <SiteCardCount label="알림" value={site.alertCount} tone="warning" />
      </div>
      <div className="SiteCardList flex flex-wrap justify-end gap-2 border-t border-border pt-3">
        <Link
          href={`/site/${encodeURIComponent(site.site_id)}`}
          className="SiteCardList inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          상세
          <ArrowRight className="SiteCardList h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="SiteCardList inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isMutating}
          onClick={() => onSelectSite(siteIndex)}
        >
          <Pencil className="SiteCardList h-3.5 w-3.5" aria-hidden="true" />
          관리
        </button>
        <button
          type="button"
          className="SiteCardList inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/10 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
          disabled={isMutating}
          onClick={() => onRemoveSite(siteIndex)}
        >
          <Trash2 className="SiteCardList h-3.5 w-3.5" aria-hidden="true" />
          삭제
        </button>
      </div>
    </article>
  );
}

function SiteCardCount({ label, tone, value }) {
  return (
    <div className="SiteCardList text-center">
      <p className="SiteCardList text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className={cn("SiteCardList mt-1 text-sm font-bold", tone === "warning" && "text-orange-500")}>
        {value}
      </p>
    </div>
  );
}

function EmptySiteState() {
  return (
    <div className="SiteCardList flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="SiteCardList grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-border bg-muted/30">
        <Factory className="SiteCardList h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="SiteCardList max-w-sm">
        <h3 className="SiteCardList text-lg font-semibold text-foreground">등록된 공정이 없습니다</h3>
        <p className="SiteCardList mt-2 text-sm text-muted-foreground">
          새로운 공정을 생성하여 시작하세요.
        </p>
      </div>
    </div>
  );
}
