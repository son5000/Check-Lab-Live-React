import { AlertTriangle, Building2, Gauge, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";
export function SiteSummaryPage({ site, locations, assets, }) {
    const locationCount = site.locationCount || locations.length;
    const assetCount = site.assetCount ||
        locations.reduce((count, location) => count + location.assetCount, 0) ||
        assets.length;
    const warningAssetCount = assets.filter((asset) => asset.status !== "normal").length;
    return (<main className="SiteSummaryPage SiteSummaryPage__root-1 min-w-0 flex-1 overflow-auto bg-muted/35 p-3 md:p-4">
      <div className="SiteSummaryPage SiteSummaryPage__container-1 mx-auto flex max-w-6xl flex-col gap-3">
        <section className="SiteSummaryPage SiteSummaryPage__section-1 rounded-md border border-border bg-card p-3 text-card-foreground">
          <div className="SiteSummaryPage SiteSummaryPage__container-2 flex min-w-0 items-start justify-between gap-3">
            <div className="SiteSummaryPage SiteSummaryPage__container-3 min-w-0">
              <p className="SiteSummaryPage SiteSummaryPage__text-1 truncate text-xs font-medium text-muted-foreground">공정 요약</p>
              <h1 className="SiteSummaryPage SiteSummaryPage__title-1 mt-1 truncate text-xl font-semibold">{site.name}</h1>
              <p className="SiteSummaryPage SiteSummaryPage__text-2 mt-1 text-sm text-muted-foreground">{site.description}</p>
            </div>
            <span className={cn("SiteSummaryPage SiteSummaryPage__label-1 shrink-0 rounded-md border px-2 py-1 text-xs font-semibold", dashboardStatusClassName[site.status])}>
              {site.status}
            </span>
          </div>
          <div className="SiteSummaryPage SiteSummaryPage__container-4 mt-3 grid gap-2 sm:grid-cols-4">
            <SummaryMetric icon={MapPin} label="위치" value={`${locationCount}개`}/>
            <SummaryMetric icon={Gauge} label="설비" value={`${assetCount}대`}/>
            <SummaryMetric icon={AlertTriangle} label="주요 알림" value={`${site.alertCount}건`}/>
            <SummaryMetric icon={Building2} label="관찰 설비" value={`${warningAssetCount}대`}/>
          </div>
        </section>

        <section className="SiteSummaryPage SiteSummaryPage__section-2 grid gap-2 lg:grid-cols-[1fr_1.2fr]">
          <div className="SiteSummaryPage SiteSummaryPage__container-5 rounded-md border border-border bg-card p-3 text-card-foreground">
            <h2 className="SiteSummaryPage SiteSummaryPage__title-2 truncate text-sm font-semibold">주요 알림</h2>
            <div className="SiteSummaryPage SiteSummaryPage__container-6 mt-2 grid gap-2">
              {site.alertCount > 0 ? (<div className="SiteSummaryPage SiteSummaryPage__alert-summary-1 rounded-md border border-border bg-background px-3 py-2">
                  <p className="truncate text-sm font-semibold">
                    백엔드 알림 집계 {site.alertCount}건
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    알림 상세 목록 API가 연결되면 이 영역에 실제 알림 행을 표시합니다.
                  </p>
                </div>) : (<div className="SiteSummaryPage SiteSummaryPage__alert-empty-1 rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
                  백엔드에서 전달된 주요 알림이 없습니다.
                </div>)}
            </div>
          </div>

          <div className="SiteSummaryPage SiteSummaryPage__container-7 rounded-md border border-border bg-card p-3 text-card-foreground">
            <h2 className="SiteSummaryPage SiteSummaryPage__title-3 truncate text-sm font-semibold">위치별 요약</h2>
            <div className="SiteSummaryPage SiteSummaryPage__container-8 mt-2 grid gap-2 sm:grid-cols-2">
              {locations.length ? (locations.map((location) => (<Link key={location.id} href={location.href} className="SiteSummaryPage SiteSummaryPage__link-1 min-w-0 rounded-md border border-border bg-background p-3 transition hover:border-foreground/30 hover:bg-accent/45">
                    <div className="SiteSummaryPage SiteSummaryPage__container-9 flex min-w-0 items-start justify-between gap-2">
                      <div className="SiteSummaryPage SiteSummaryPage__container-10 min-w-0">
                        <p className="SiteSummaryPage SiteSummaryPage__text-3 truncate text-[11px] text-muted-foreground">{location.floor}</p>
                        <h3 className="SiteSummaryPage SiteSummaryPage__title-4 truncate text-sm font-semibold">{location.name}</h3>
                      </div>
                      <span className={cn("SiteSummaryPage SiteSummaryPage__label-2 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", dashboardStatusClassName[location.status])}>
                        {location.status}
                      </span>
                    </div>
                    <p className="SiteSummaryPage SiteSummaryPage__text-4 mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {location.summary || "백엔드 설명 없음"}
                    </p>
                    <p className="SiteSummaryPage SiteSummaryPage__text-5 mt-3 text-xs font-medium">설비 {location.assetCount}대</p>
                  </Link>))) : (<div className="SiteSummaryPage SiteSummaryPage__location-empty-1 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground sm:col-span-2">
                  백엔드에서 전달된 위치가 없습니다.
                </div>)}
            </div>
          </div>
        </section>
      </div>
    </main>);
}
function SummaryMetric({ icon: Icon, label, value, }) {
    return (<div className="SummaryMetric SummaryMetric__container-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
      <Icon className="SummaryMetric SummaryMetric__icon-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
      <div className="SummaryMetric SummaryMetric__container-2 min-w-0">
        <p className="SummaryMetric SummaryMetric__text-1 truncate text-[11px] text-muted-foreground">{label}</p>
        <p className="SummaryMetric SummaryMetric__text-2 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>);
}
