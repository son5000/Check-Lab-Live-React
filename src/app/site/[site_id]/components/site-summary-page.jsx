"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Gauge,
  MapPin,
  Plus,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { dashboardStatusClassName } from "@/app/layouts/constants/status-styles";
import { createLocation as createManagedLocation } from "@/app/site/services/site-management-client";
import {
  applyLocationResponse,
  emptyLocation,
  getApiErrorMessage,
  normalizeLocation,
  toCreateLocationPayload,
} from "@/app/site/components/site-builder-model";

export function SiteSummaryPage({ site, locations, assets }) {
  const router = useRouter();
  const [locationItems, setLocationItems] = useState(locations);
  const [draftLocation, setDraftLocation] = useState(emptyLocation);
  const [isRegisteringLocation, setIsRegisteringLocation] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [createLocationMessage, setCreateLocationMessage] = useState();

  const canCreateLocation = Boolean(
    site.site_id && draftLocation.name.trim() && !isCreatingLocation,
  );
  const locationCount = Math.max(site.locationCount || 0, locationItems.length);
  const assetCount =
    site.assetCount ||
    locationItems.reduce((count, location) => count + location.assetCount, 0) ||
    assets.length;
  const warningAssetCount = assets.filter(
    (asset) => asset.status !== "normal",
  ).length;

  useEffect(() => {
    setLocationItems(locations);
  }, [locations]);

  const handleRegisterLocation = async (event) => {
    event.preventDefault();
    if (!canCreateLocation) {
      return;
    }

    setIsCreatingLocation(true);
    setCreateLocationMessage(undefined);

    try {
      const normalizedLocation = normalizeLocation(draftLocation);
      const response = await createManagedLocation(
        toCreateLocationPayload(site.site_id, normalizedLocation),
      );
      const savedLocation = applyLocationResponse(normalizedLocation, response);

      if (!savedLocation.location_id.trim()) {
        throw new Error("서버 응답에 위치 ID가 없습니다.");
      }

      setLocationItems((currentLocations) => [
        ...currentLocations,
        toSummaryLocation(site.site_id, savedLocation),
      ]);
      setDraftLocation(emptyLocation);
      setIsRegisteringLocation(false);
      setCreateLocationMessage({
        tone: "success",
        text: "위치가 등록되었습니다.",
      });
      router.refresh();
    } catch (error) {
      setCreateLocationMessage({
        tone: "error",
        text: getApiErrorMessage(error, "위치 등록에 실패했습니다."),
      });
    } finally {
      setIsCreatingLocation(false);
    }
  };

  return (
    <main className="SiteSummaryPage SiteSummaryPage__root-1 min-w-0 flex-1 overflow-auto bg-muted/35 p-3 md:p-4">
      <div className="SiteSummaryPage SiteSummaryPage__container-1 mx-auto flex max-w-6xl flex-col gap-3">
        <section className="SiteSummaryPage SiteSummaryPage__section-1 rounded-md border border-border bg-card p-3 text-card-foreground">
          <div className="SiteSummaryPage SiteSummaryPage__container-2 flex min-w-0 items-start justify-between gap-3">
            <div className="SiteSummaryPage SiteSummaryPage__container-3 min-w-0">
              <p className="SiteSummaryPage SiteSummaryPage__text-1 truncate text-xs font-medium text-muted-foreground">
                공정 요약
              </p>
              <h1 className="SiteSummaryPage SiteSummaryPage__title-1 mt-1 truncate text-xl font-semibold">
                {site.name}
              </h1>
              <p className="SiteSummaryPage SiteSummaryPage__text-2 mt-1 text-sm text-muted-foreground">
                {site.description}
              </p>
            </div>
            <span
              className={cn(
                "SiteSummaryPage SiteSummaryPage__label-1 shrink-0 rounded-md border px-2 py-1 text-xs font-semibold",
                dashboardStatusClassName[site.status],
              )}
            >
              {site.status}
            </span>
          </div>
          <div className="SiteSummaryPage SiteSummaryPage__container-4 mt-3 grid gap-2 sm:grid-cols-4">
            <SummaryMetric
              icon={MapPin}
              label="위치"
              value={`${locationCount}개`}
            />
            <SummaryMetric icon={Gauge} label="설비" value={assetCount} />
            <SummaryMetric
              icon={AlertTriangle}
              label="주요 알림"
              value={site.alertCount}
            />
            <SummaryMetric
              icon={Building2}
              label="관찰 설비"
              value={warningAssetCount}
            />
          </div>
        </section>

        <section className="SiteSummaryPage SiteSummaryPage__section-2 grid gap-2 lg:grid-cols-[1fr_1.2fr]">
          <div className="SiteSummaryPage SiteSummaryPage__container-7 rounded-md border border-border bg-card p-3 text-card-foreground">
            <div className="SiteSummaryPage SiteSummaryPage__container-11 flex min-w-0 items-center justify-between gap-2">
              <h2 className="SiteSummaryPage SiteSummaryPage__title-3 truncate text-sm font-semibold">
                위치별 요약
              </h2>
              <button
                type="button"
                className="SiteSummaryPage SiteSummaryPage__button-register-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-primary bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isCreatingLocation}
                onClick={() => setIsRegisteringLocation((isOpen) => !isOpen)}
              >
                {isRegisteringLocation ? (
                  <X
                    className="SiteSummaryPage SiteSummaryPage__icon-register-1 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                ) : (
                  <Plus
                    className="SiteSummaryPage SiteSummaryPage__icon-register-2 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                )}
                위치 등록
              </button>
            </div>

            {createLocationMessage ? (
              <p
                className={cn(
                  "SiteSummaryPage SiteSummaryPage__message-1 mt-2 rounded-md border px-3 py-2 text-xs font-semibold",
                  createLocationMessage.tone === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
                )}
              >
                {createLocationMessage.text}
              </p>
            ) : null}

            {isRegisteringLocation ? (
              <form
                className="SiteSummaryPage SiteSummaryPage__form-register-1 mt-3 grid gap-2 rounded-md border border-border bg-background p-3"
                onSubmit={handleRegisterLocation}
              >
                <div className="SiteSummaryPage SiteSummaryPage__container-12 grid gap-2 sm:grid-cols-2">
                  <LocationField
                    label="위치명 *"
                    onChange={(name) =>
                      setDraftLocation((current) => ({ ...current, name }))
                    }
                    placeholder="1층 기계실"
                    value={draftLocation.name}
                  />
                  <LocationField
                    label="층/구역"
                    onChange={(floor) =>
                      setDraftLocation((current) => ({ ...current, floor }))
                    }
                    placeholder="1F"
                    value={draftLocation.floor}
                  />
                </div>
                <LocationTextArea
                  label="위치 설명"
                  onChange={(summary) =>
                    setDraftLocation((current) => ({ ...current, summary }))
                  }
                  value={draftLocation.summary}
                />
                <div className="SiteSummaryPage SiteSummaryPage__container-13 flex justify-end">
                  <button
                    type="submit"
                    className={cn(
                      "SiteSummaryPage SiteSummaryPage__button-save-1 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition",
                      canCreateLocation
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                        : "cursor-not-allowed border-border bg-muted text-muted-foreground",
                    )}
                    disabled={!canCreateLocation}
                  >
                    <Save
                      className="SiteSummaryPage SiteSummaryPage__icon-save-1 h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    {isCreatingLocation ? "등록 중" : "위치 등록"}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="SiteSummaryPage SiteSummaryPage__container-8 mt-2 grid gap-2 sm:grid-cols-2">
              {locationItems.length ? (
                locationItems.map((location) => (
                  <Link
                    key={location.id}
                    href={location.href}
                    className="SiteSummaryPage SiteSummaryPage__link-1 min-w-0 rounded-md border border-border bg-background p-3 transition hover:border-foreground/30 hover:bg-accent/45"
                  >
                    <div className="SiteSummaryPage SiteSummaryPage__container-9 flex min-w-0 items-start justify-between gap-2">
                      <div className="SiteSummaryPage SiteSummaryPage__container-10 min-w-0">
                        <p className="SiteSummaryPage SiteSummaryPage__text-3 truncate text-[11px] text-muted-foreground">
                          {location.floor}
                        </p>
                        <h3 className="SiteSummaryPage SiteSummaryPage__title-4 truncate text-sm font-semibold">
                          {location.name}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "SiteSummaryPage SiteSummaryPage__label-2 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
                          dashboardStatusClassName[location.status],
                        )}
                      >
                        {location.status}
                      </span>
                    </div>
                    <p className="SiteSummaryPage SiteSummaryPage__text-4 mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {location.summary || "설명 없음"}
                    </p>
                    <p className="SiteSummaryPage SiteSummaryPage__text-5 mt-3 text-xs font-medium">
                      설비 {location.assetCount}대
                    </p>
                  </Link>
                ))
              ) : (
                <div className="SiteSummaryPage SiteSummaryPage__location-empty-1 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground sm:col-span-2">
                  등록된 위치가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="SiteSummaryPage SiteSummaryPage__container-5 rounded-md border border-border bg-card p-3 text-card-foreground">
            <h2 className="SiteSummaryPage SiteSummaryPage__title-2 truncate text-sm font-semibold">
              주요 알림
            </h2>
            <div className="SiteSummaryPage SiteSummaryPage__container-6 mt-2 grid gap-2">
              {site.alertCount > 0 ? (
                <div className="SiteSummaryPage SiteSummaryPage__alert-summary-1 rounded-md border border-border bg-background px-3 py-2">
                  <p className="truncate text-sm font-semibold">
                    {`서버 알림 집계 ${site.alertCount}건`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    발생한 알림이 있으면 이곳에서 상세 내용을 확인할 수
                    있습니다.
                  </p>
                </div>
              ) : (
                <div className="SiteSummaryPage SiteSummaryPage__alert-empty-1 rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
                  전달된 주요 알림이 없습니다.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function LocationField({ label, onChange, placeholder, value }) {
  return (
    <label className="SiteSummaryPage SiteSummaryPage__field-1 grid min-w-0 gap-1">
      <span className="SiteSummaryPage SiteSummaryPage__label-3 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <input
        className="SiteSummaryPage SiteSummaryPage__input-1 h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs font-semibold outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function LocationTextArea({ label, onChange, value }) {
  return (
    <label className="SiteSummaryPage SiteSummaryPage__field-2 grid min-w-0 gap-1">
      <span className="SiteSummaryPage SiteSummaryPage__label-4 truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <textarea
        className="SiteSummaryPage SiteSummaryPage__textarea-1 min-h-20 min-w-0 resize-none rounded-md border border-border bg-card px-2 py-2 text-xs font-semibold outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SummaryMetric({ icon: Icon, label, value }) {
  return (
    <div className="SummaryMetric SummaryMetric__container-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
      <Icon
        className="SummaryMetric SummaryMetric__icon-1 h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="SummaryMetric SummaryMetric__container-2 min-w-0">
        <p className="SummaryMetric SummaryMetric__text-1 truncate text-[11px] text-muted-foreground">
          {label}
        </p>
        <p className="SummaryMetric SummaryMetric__text-2 truncate text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>
  );
}

function toSummaryLocation(siteId, location) {
  return {
    assetCount: location.assets?.length ?? 0,
    floor: location.floor,
    href: `/site/${encodeURIComponent(siteId)}/location/${encodeURIComponent(
      location.location_id,
    )}`,
    id: location.location_id,
    name: location.name,
    site_id: siteId,
    status: location.status,
    summary: location.summary,
  };
}
