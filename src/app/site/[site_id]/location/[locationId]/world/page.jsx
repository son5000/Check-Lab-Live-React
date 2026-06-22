import Link from "next/link";
import { Box, ExternalLink, Wind } from "lucide-react";
import { sampleAssets, sampleLocation, sampleSite } from "./sample-wind-farm-demo";

export default function LocationWorldPage({ params }) {
  const viewerHref = `/site/${encodeURIComponent(params.site_id)}/location/${encodeURIComponent(params.locationId)}/world/viewer`;

  return (
    <main className="LocationWorldLaunchPage LocationWorldLaunchPage__root-1 flex min-h-screen min-w-0 flex-1 items-center justify-center bg-slate-950 p-4 text-slate-100">
      <section className="LocationWorldLaunchPage LocationWorldLaunchPage__panel-1 w-full max-w-xl rounded-md border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950/40">
        <div className="LocationWorldLaunchPage LocationWorldLaunchPage__title-row-1 flex min-w-0 items-start gap-3">
          <span className="LocationWorldLaunchPage LocationWorldLaunchPage__icon-shell-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
            <Wind
              className="LocationWorldLaunchPage LocationWorldLaunchPage__icon-1 h-5 w-5"
              aria-hidden="true"
            />
          </span>
          <div className="LocationWorldLaunchPage LocationWorldLaunchPage__copy-1 min-w-0">
            <p className="LocationWorldLaunchPage LocationWorldLaunchPage__eyebrow-1 truncate text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
              {sampleSite.name} / {sampleLocation.name}
            </p>
            <h1 className="LocationWorldLaunchPage LocationWorldLaunchPage__title-1 mt-1 text-2xl font-semibold text-white">
              Wind Farm Digital Twin
            </h1>
            <p className="LocationWorldLaunchPage LocationWorldLaunchPage__summary-1 mt-2 text-sm leading-6 text-slate-300">
              {sampleLocation.summary}
            </p>
          </div>
        </div>

        <div className="LocationWorldLaunchPage LocationWorldLaunchPage__metrics-1 mt-5 grid gap-2 sm:grid-cols-3">
          <LaunchMetric label="Units" value={sampleAssets.length} />
          <LaunchMetric
            label="Warnings"
            value={sampleAssets.filter((asset) => asset.status === "warning").length}
          />
          <LaunchMetric
            label="Watch"
            value={sampleAssets.filter((asset) => asset.status === "caution").length}
          />
        </div>

        <Link
          href={viewerHref}
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          className="LocationWorldLaunchPage LocationWorldLaunchPage__open-link-1 mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-200/25 bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          <Box
            className="LocationWorldLaunchPage LocationWorldLaunchPage__open-icon-1 h-4 w-4"
            aria-hidden="true"
          />
          Open Viewer
          <ExternalLink
            className="LocationWorldLaunchPage LocationWorldLaunchPage__external-icon-1 h-4 w-4"
            aria-hidden="true"
          />
        </Link>
      </section>
    </main>
  );
}

function LaunchMetric({ label, value }) {
  return (
    <div className="LocationWorldLaunchPage LocationWorldLaunchPage__metric-1 min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="LocationWorldLaunchPage LocationWorldLaunchPage__metric-label-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="LocationWorldLaunchPage LocationWorldLaunchPage__metric-value-1 mt-1 truncate text-lg font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
