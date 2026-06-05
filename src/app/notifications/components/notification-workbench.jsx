"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCheck,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  ListChecks,
  RefreshCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TimerReset,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_FRONTEND_USER_ID = "frontend-user-id";
const REFRESH_ALERT_LIMIT = 200;
const REFRESH_EVENT_LIMIT = 80;

const gradeMeta = {
  error: {
    label: "오류",
    rank: 5,
    className: "border-rose-500/35 bg-rose-500/10 text-rose-300",
  },
  danger: {
    label: "위험",
    rank: 4,
    className: "border-red-500/35 bg-red-500/10 text-red-300",
  },
  warning: {
    label: "경고",
    rank: 3,
    className: "border-orange-500/35 bg-orange-500/10 text-orange-300",
  },
  caution: {
    label: "주의",
    rank: 2,
    className: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  },
  info: {
    label: "정보",
    rank: 1,
    className: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  },
  normal: {
    label: "정상",
    rank: 0,
    className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  },
};

const timeRangeOptions = [
  { id: "all", label: "전체 기간" },
  { id: "1h", label: "최근 1시간", durationMs: 60 * 60 * 1000 },
  { id: "24h", label: "최근 24시간", durationMs: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "최근 7일", durationMs: 7 * 24 * 60 * 60 * 1000 },
];

const sortOptions = [
  { id: "newest", label: "최신순" },
  { id: "severity", label: "위험도순" },
  { id: "asset", label: "설비명순" },
  { id: "unread", label: "미처리 우선" },
];

const suppressionOptions = [
  { seconds: 180, label: "3분" },
  { seconds: 600, label: "10분" },
  { seconds: 1800, label: "30분" },
];

export function NotificationWorkbench({
  assetOptions = [],
  initialAlerts = [],
  initialEventGroups = [],
}) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [eventGroups, setEventGroups] = useState(initialEventGroups);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");
  const [sortMode, setSortMode] = useState("newest");
  const [hideSuppressed, setHideSuppressed] = useState(true);
  const [selectedRecordId, setSelectedRecordId] = useState();
  const [locallyReadRecordIds, setLocallyReadRecordIds] = useState([]);
  const [suppressedAssetMap, setSuppressedAssetMap] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const assetById = useMemo(
    () => new Map(assetOptions.map((asset) => [asset.id, asset])),
    [assetOptions],
  );
  const records = useMemo(
    () =>
      normalizeRecords({
        alerts,
        assetById,
        eventGroups,
        locallyReadRecordIds,
        suppressedAssetMap,
      }),
    [alerts, assetById, eventGroups, locallyReadRecordIds, suppressedAssetMap],
  );
  const sourceOptions = useMemo(
    () =>
      Array.from(new Set(records.map((record) => record.sourceLabel)))
        .filter(Boolean)
        .sort((first, second) => first.localeCompare(second, "ko-KR")),
    [records],
  );
  const filteredRecords = useMemo(
    () =>
      sortRecords(
        records.filter((record) =>
          matchesFilters(record, {
            assetFilter,
            gradeFilter,
            hideSuppressed,
            kindFilter,
            query,
            readFilter,
            sourceFilter,
            timeRange,
          }),
        ),
        sortMode,
      ),
    [
      assetFilter,
      gradeFilter,
      hideSuppressed,
      kindFilter,
      query,
      readFilter,
      records,
      sortMode,
      sourceFilter,
      timeRange,
    ],
  );
  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordId) ??
    filteredRecords[0] ??
    null;
  const summary = useMemo(() => buildSummary(records, filteredRecords), [
    filteredRecords,
    records,
  ]);

  const refreshRecords = async () => {
    setIsRefreshing(true);
    setStatusMessage("");

    try {
      const nextAlertsResponse = await fetch(
        `/api/asset-dashboard/alerts?limit=${REFRESH_ALERT_LIMIT}`,
        {
          cache: "no-store",
          headers: { accept: "application/json" },
        },
      );
      const nextAlerts = nextAlertsResponse.ok
        ? await nextAlertsResponse.json()
        : [];
      const nextEventGroups = await Promise.all(
        assetOptions.map(async (asset) => {
          try {
            const response = await fetch(
              `/api/asset-dashboard/${encodeURIComponent(asset.id)}/events?limit=${REFRESH_EVENT_LIMIT}`,
              {
                cache: "no-store",
                headers: { accept: "application/json" },
              },
            );
            return {
              asset,
              events: response.ok ? await response.json() : [],
            };
          } catch {
            return { asset, events: [] };
          }
        }),
      );

      setAlerts(nextAlerts);
      setEventGroups(nextEventGroups);
      setStatusMessage("데이터를 새로고침했습니다.");
    } catch (error) {
      console.warn("Failed to refresh notification workbench.", error);
      setStatusMessage("새로고침에 실패했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const openRecordDetail = (record) => {
    if (!record?.href) {
      return;
    }

    const searchParams = new URLSearchParams();
    if (record.nativeId) {
      searchParams.set("eventId", record.nativeId);
    }
    router.push(`${record.href}?${searchParams.toString()}`, { scroll: false });
  };

  const markRecordsRead = async (targetRecords) => {
    const unreadRecords = targetRecords.filter((record) => !record.isRead);
    if (!unreadRecords.length) {
      setStatusMessage("읽음 처리할 항목이 없습니다.");
      return;
    }

    setIsMutating(true);
    setStatusMessage("");

    try {
      const alertIds = unreadRecords
        .filter((record) => record.kind === "alert")
        .map((record) => record.nativeId)
        .filter(Boolean);
      const eventRecords = unreadRecords.filter(
        (record) => record.kind === "event" && record.nativeId,
      );

      if (alertIds.length) {
        await fetch("/api/asset-dashboard/alerts/read", {
          body: JSON.stringify({
            alert_ids: alertIds,
            read_by: DEFAULT_FRONTEND_USER_ID,
          }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        });
      }

      await Promise.allSettled(
        eventRecords.map((record) =>
          fetch(
            `/api/asset-dashboard/events/${encodeURIComponent(record.nativeId)}/read`,
            {
              body: JSON.stringify({ read_by: DEFAULT_FRONTEND_USER_ID }),
              headers: { "Content-Type": "application/json" },
              method: "PUT",
            },
          ),
        ),
      );

      setLocallyReadRecordIds((currentIds) =>
        Array.from(
          new Set([...currentIds, ...unreadRecords.map((record) => record.id)]),
        ),
      );
      setStatusMessage(`${unreadRecords.length}개 항목을 읽음 처리했습니다.`);
    } catch (error) {
      console.warn("Failed to mark records read.", error);
      setStatusMessage("읽음 처리에 실패했습니다.");
    } finally {
      setIsMutating(false);
    }
  };

  const suppressAssetAlerts = async (record, durationSeconds) => {
    if (!record?.assetId) {
      setStatusMessage("설비 정보가 없어 알림 억제를 적용할 수 없습니다.");
      return;
    }

    setIsMutating(true);
    setStatusMessage("");

    try {
      await fetch("/api/asset-dashboard/alerts/suppression", {
        body: JSON.stringify({
          asset_id: record.assetId,
          duration_seconds: durationSeconds,
          reason: "notification-workbench",
          suppressed_by: DEFAULT_FRONTEND_USER_ID,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      setSuppressedAssetMap((currentMap) => ({
        ...currentMap,
        [record.assetId]: Date.now() + durationSeconds * 1000,
      }));
      setStatusMessage(`${record.assetName} 알림을 일시 억제했습니다.`);
    } catch (error) {
      console.warn("Failed to suppress asset alerts.", error);
      setStatusMessage("알림 억제에 실패했습니다.");
    } finally {
      setIsMutating(false);
    }
  };

  const exportCsv = () => {
    const csv = toCsv(filteredRecords);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `checklab-notifications-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="NotificationWorkbench NotificationWorkbench__root-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/35 p-3 md:p-4">
      <section className="NotificationWorkbench NotificationWorkbench__header-1 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="NotificationWorkbench NotificationWorkbench__title-1 truncate text-xl font-semibold text-foreground">
            이벤트 및 알림
          </h1>
          <p className="NotificationWorkbench NotificationWorkbench__subtitle-1 mt-1 truncate text-sm text-muted-foreground">
            전 설비 이벤트, 임계 알림, 조치 상태를 한 화면에서 분석합니다.
          </p>
        </div>
        <div className="NotificationWorkbench NotificationWorkbench__header-actions-1 flex shrink-0 flex-wrap items-center gap-2">
          <ActionButton
            icon={RefreshCcw}
            label={isRefreshing ? "새로고침 중" : "새로고침"}
            disabled={isRefreshing}
            onClick={refreshRecords}
          />
          <ActionButton
            icon={CheckCheck}
            label="필터 결과 읽음"
            disabled={isMutating || !filteredRecords.some((record) => !record.isRead)}
            onClick={() => markRecordsRead(filteredRecords)}
          />
          <ActionButton
            icon={Download}
            label="CSV"
            disabled={!filteredRecords.length}
            onClick={exportCsv}
          />
        </div>
      </section>

      <section className="NotificationWorkbench NotificationWorkbench__metrics-1 mt-3 grid shrink-0 gap-2 md:grid-cols-5">
        <MetricCard icon={ListChecks} label="전체" value={summary.total} />
        <MetricCard icon={BellRing} label="필터 결과" value={summary.filtered} />
        <MetricCard icon={ShieldAlert} label="미처리" value={summary.unread} />
        <MetricCard icon={AlertTriangle} label="고위험" value={summary.critical} />
        <MetricCard icon={TimerReset} label="영향 설비" value={summary.assets} />
      </section>

      <section className="NotificationWorkbench NotificationWorkbench__workspace-1 mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-[19rem_minmax(0,1fr)_22rem]">
        <FilterPanel
          assetFilter={assetFilter}
          assetOptions={assetOptions}
          gradeFilter={gradeFilter}
          hideSuppressed={hideSuppressed}
          kindFilter={kindFilter}
          query={query}
          readFilter={readFilter}
          sourceFilter={sourceFilter}
          sourceOptions={sourceOptions}
          timeRange={timeRange}
          onAssetFilterChange={setAssetFilter}
          onGradeFilterChange={setGradeFilter}
          onHideSuppressedChange={setHideSuppressed}
          onKindFilterChange={setKindFilter}
          onQueryChange={setQuery}
          onReadFilterChange={setReadFilter}
          onSourceFilterChange={setSourceFilter}
          onTimeRangeChange={setTimeRange}
        />

        <EventList
          records={filteredRecords}
          selectedRecordId={selectedRecord?.id}
          sortMode={sortMode}
          statusMessage={statusMessage}
          onRecordSelect={setSelectedRecordId}
          onSortModeChange={setSortMode}
        />

        <DetailPanel
          isMutating={isMutating}
          record={selectedRecord}
          onMarkRead={(record) => markRecordsRead([record])}
          onOpen={openRecordDetail}
          onSuppress={suppressAssetAlerts}
        />
      </section>
    </main>
  );
}

function ActionButton({ disabled, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      className="NotificationWorkbench NotificationWorkbench__action-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="NotificationWorkbench NotificationWorkbench__metric-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">
          {label}
        </p>
        <p className="truncate font-mono text-lg font-bold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function FilterPanel({
  assetFilter,
  assetOptions,
  gradeFilter,
  hideSuppressed,
  kindFilter,
  query,
  readFilter,
  sourceFilter,
  sourceOptions,
  timeRange,
  onAssetFilterChange,
  onGradeFilterChange,
  onHideSuppressedChange,
  onKindFilterChange,
  onQueryChange,
  onReadFilterChange,
  onSourceFilterChange,
  onTimeRangeChange,
}) {
  return (
    <aside className="NotificationWorkbench NotificationWorkbench__filters-1 grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-border bg-card">
      <div className="flex h-10 items-center gap-2 border-b border-border px-3">
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="truncate text-sm font-semibold">전문 필터</h2>
      </div>
      <div className="grid min-h-0 gap-3 overflow-y-auto p-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            검색
          </span>
          <span className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="설비, 메시지, 이벤트 ID"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </span>
        </label>

        <SegmentedField
          label="분류"
          options={[
            { id: "all", label: "전체" },
            { id: "alert", label: "알림" },
            { id: "event", label: "이벤트" },
          ]}
          value={kindFilter}
          onChange={onKindFilterChange}
        />
        <SelectField
          label="위험도"
          value={gradeFilter}
          onChange={onGradeFilterChange}
          options={[
            { id: "all", label: "전체" },
            ...Object.entries(gradeMeta).map(([id, meta]) => ({
              id,
              label: meta.label,
            })),
          ]}
        />
        <SelectField
          label="처리 상태"
          value={readFilter}
          onChange={onReadFilterChange}
          options={[
            { id: "all", label: "전체" },
            { id: "unread", label: "미처리" },
            { id: "read", label: "처리됨" },
          ]}
        />
        <SelectField
          label="설비"
          value={assetFilter}
          onChange={onAssetFilterChange}
          options={[
            { id: "all", label: "전체 설비" },
            ...assetOptions.map((asset) => ({
              id: asset.id,
              label: asset.label,
            })),
          ]}
        />
        <SelectField
          label="소스"
          value={sourceFilter}
          onChange={onSourceFilterChange}
          options={[
            { id: "all", label: "전체 소스" },
            ...sourceOptions.map((source) => ({
              id: source,
              label: source,
            })),
          ]}
        />
        <SelectField
          label="기간"
          value={timeRange}
          onChange={onTimeRangeChange}
          options={timeRangeOptions}
        />
        <label className="flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            억제된 설비 숨김
          </span>
          <input
            checked={hideSuppressed}
            className="h-4 w-4 accent-primary"
            type="checkbox"
            onChange={(event) => onHideSuppressedChange(event.target.checked)}
          />
        </label>
      </div>
    </aside>
  );
}

function SegmentedField({ label, onChange, options, value }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-background p-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              "h-7 rounded-sm px-2 text-xs font-semibold transition",
              value === option.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <select
        className="h-9 min-w-0 rounded-md border border-border bg-background px-2 text-sm font-semibold outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EventList({
  onRecordSelect,
  onSortModeChange,
  records,
  selectedRecordId,
  sortMode,
  statusMessage,
}) {
  return (
    <section className="NotificationWorkbench NotificationWorkbench__list-panel-1 grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-md border border-border bg-card">
      <div className="flex h-10 min-w-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h2 className="truncate text-sm font-semibold">이벤트 타임라인</h2>
        </div>
        <select
          className="h-8 shrink-0 rounded-md border border-border bg-background px-2 text-xs font-semibold"
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value)}
        >
          {sortOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex h-9 items-center justify-between gap-2 border-b border-border bg-muted/35 px-3">
        <p className="truncate text-xs font-semibold text-muted-foreground">
          {records.length}개 항목
        </p>
        {statusMessage ? (
          <p className="truncate text-xs font-semibold text-cyan-500">
            {statusMessage}
          </p>
        ) : null}
      </div>
      <div className="min-h-0 overflow-y-auto">
        {records.length ? (
          <ul className="divide-y divide-border">
            {records.map((record) => (
              <li key={record.id}>
                <button
                  type="button"
                  className={cn(
                    "NotificationWorkbench NotificationWorkbench__record-1 grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2.5 text-left transition hover:bg-accent/60",
                    selectedRecordId === record.id && "bg-accent",
                  )}
                  onClick={() => onRecordSelect(record.id)}
                >
                  <RecordIcon record={record} />
                  <span className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <GradeBadge grade={record.grade} />
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {record.kind === "alert" ? "알림" : "이벤트"}
                      </span>
                      {!record.isRead ? (
                        <span className="rounded-sm bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          미처리
                        </span>
                      ) : null}
                      {record.isSuppressed ? (
                        <span className="rounded-sm bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400">
                          억제중
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-foreground">
                      {record.title}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-muted-foreground">
                      {record.assetName} · {record.sourceLabel}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {record.message}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-[11px] font-semibold text-muted-foreground">
                    {record.occurredAt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid h-full min-h-[22rem] place-items-center p-6 text-center">
            <div className="grid gap-2">
              <SlidersHorizontal className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="text-sm font-semibold">필터 결과가 없습니다.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DetailPanel({ isMutating, onMarkRead, onOpen, onSuppress, record }) {
  if (!record) {
    return (
      <aside className="NotificationWorkbench NotificationWorkbench__detail-1 grid min-h-0 place-items-center rounded-md border border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          항목을 선택하면 상세 정보가 표시됩니다.
        </p>
      </aside>
    );
  }

  return (
    <aside className="NotificationWorkbench NotificationWorkbench__detail-1 grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-md border border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="flex min-w-0 items-center gap-2">
          <RecordIcon record={record} />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <GradeBadge grade={record.grade} />
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                {record.kind === "alert" ? "알림" : "이벤트"}
              </span>
            </div>
            <h2 className="mt-1 line-clamp-2 text-sm font-semibold">
              {record.title}
            </h2>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto p-3">
        <DetailRow label="설비" value={record.assetName} />
        <DetailRow label="위치" value={record.locationLabel} />
        <DetailRow label="소스" value={record.sourceLabel} />
        <DetailRow label="발생 시각" value={record.occurredAtFull} />
        <DetailRow label="처리 상태" value={record.isRead ? "처리됨" : "미처리"} />
        <DetailRow label="식별자" value={record.nativeId} />
        <div className="mt-3 rounded-md border border-border bg-background p-3">
          <p className="text-xs font-semibold text-muted-foreground">메시지</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
            {record.message}
          </p>
        </div>
      </div>

      <div className="grid gap-2 border-t border-border p-3">
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!record.href}
          onClick={() => onOpen(record)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          상세 대시보드 열기
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isMutating || record.isRead}
          onClick={() => onMarkRead(record)}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          읽음 처리
        </button>
        <div className="grid grid-cols-3 gap-1">
          {suppressionOptions.map((option) => (
            <button
              key={option.seconds}
              type="button"
              className="h-8 rounded-md border border-border bg-background text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isMutating || !record.assetId}
              onClick={() => onSuppress(record, option.seconds)}
            >
              {option.label} 억제
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 border-b border-border/60 py-2 text-xs">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-semibold text-foreground">
        {value || "-"}
      </span>
    </div>
  );
}

function RecordIcon({ record }) {
  const Icon = record.kind === "alert" ? ShieldAlert : ListChecks;
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-md border",
        gradeMeta[record.grade]?.className ?? gradeMeta.info.className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function GradeBadge({ grade }) {
  const meta = gradeMeta[grade] ?? gradeMeta.info;
  return (
    <span
      className={cn(
        "rounded-sm border px-1.5 py-0.5 text-[10px] font-bold",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function normalizeRecords({
  alerts,
  assetById,
  eventGroups,
  locallyReadRecordIds,
  suppressedAssetMap,
}) {
  const locallyReadIdSet = new Set(locallyReadRecordIds);
  const now = Date.now();
  const alertRecords = alerts.map((alert, index) =>
    normalizeAlertRecord(alert, index, locallyReadIdSet, suppressedAssetMap, now),
  );
  const eventRecords = eventGroups.flatMap((group) =>
    (group.events ?? []).map((event, index) =>
      normalizeEventRecord(
        event,
        group.asset ?? assetById.get(event.asset_id),
        index,
        locallyReadIdSet,
        suppressedAssetMap,
        now,
      ),
    ),
  );

  return dedupeRecords([...alertRecords, ...eventRecords]).sort(
    (first, second) => second.timestamp - first.timestamp,
  );
}

function normalizeAlertRecord(alert, index, locallyReadIdSet, suppressedAssetMap, now) {
  const nativeId = String(alert.alert_id ?? alert.id ?? `alert-${index + 1}`);
  const assetId = alert.asset_id ?? "";
  const grade = toGrade(alert.severity ?? alert.grade ?? alert.dashboard_status);
  const occurredAtIso = alert.created_at ?? alert.occurred_at ?? alert.timestamp;
  const timestamp = getTimeValue(occurredAtIso);
  const id = `alert:${nativeId}`;

  return {
    assetId,
    assetName: alert.asset_name ?? assetId ?? "설비 미지정",
    grade,
    href: alert.dashboard_href,
    id,
    isRead: Boolean(alert.is_read) || locallyReadIdSet.has(id),
    isSuppressed: isAssetSuppressed(assetId, suppressedAssetMap, now),
    kind: "alert",
    locationLabel: alert.location_label ?? "",
    message: alert.message ?? "알림 메시지가 없습니다.",
    nativeId,
    occurredAt: formatShortDateTime(occurredAtIso),
    occurredAtFull: formatFullDateTime(occurredAtIso),
    occurredAtIso,
    sourceLabel: "임계 알림",
    timestamp,
    title: alert.asset_name ? `${alert.asset_name} 임계 알림` : "임계 알림",
  };
}

function normalizeEventRecord(
  event,
  asset,
  index,
  locallyReadIdSet,
  suppressedAssetMap,
  now,
) {
  const nativeId = String(event.event_id ?? event.id ?? `event-${index + 1}`);
  const assetId = event.asset_id ?? asset?.id ?? "";
  const grade = toGrade(event.severity ?? event.grade ?? event.status);
  const occurredAtIso =
    event.observed_at ?? event.created_at ?? event.occurred_at ?? event.timestamp;
  const id = `event:${assetId}:${nativeId}`;
  const sourceLabel = toSourceLabel(event.source_type ?? event.event_type);

  return {
    assetId,
    assetName: asset?.label ?? event.asset_name ?? assetId ?? "설비 미지정",
    grade,
    href: asset?.href ?? event.dashboard_href,
    id,
    isRead: Boolean(event.is_read) || locallyReadIdSet.has(id),
    isSuppressed: isAssetSuppressed(assetId, suppressedAssetMap, now),
    kind: "event",
    locationLabel: asset?.locationLabel ?? event.location_label ?? "",
    message: event.message ?? "이벤트 메시지가 없습니다.",
    nativeId,
    occurredAt: formatShortDateTime(occurredAtIso),
    occurredAtFull: formatFullDateTime(occurredAtIso),
    occurredAtIso,
    sourceLabel,
    timestamp: getTimeValue(occurredAtIso),
    title: event.title ?? sourceLabel,
  };
}

function matchesFilters(record, filters) {
  if (filters.hideSuppressed && record.isSuppressed) {
    return false;
  }
  if (filters.kindFilter !== "all" && record.kind !== filters.kindFilter) {
    return false;
  }
  if (filters.gradeFilter !== "all" && record.grade !== filters.gradeFilter) {
    return false;
  }
  if (filters.readFilter === "unread" && record.isRead) {
    return false;
  }
  if (filters.readFilter === "read" && !record.isRead) {
    return false;
  }
  if (filters.assetFilter !== "all" && record.assetId !== filters.assetFilter) {
    return false;
  }
  if (
    filters.sourceFilter !== "all" &&
    record.sourceLabel !== filters.sourceFilter
  ) {
    return false;
  }
  if (!matchesTimeRange(record.timestamp, filters.timeRange)) {
    return false;
  }
  const query = filters.query.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return [
    record.assetId,
    record.assetName,
    record.locationLabel,
    record.message,
    record.nativeId,
    record.sourceLabel,
    record.title,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function sortRecords(records, sortMode) {
  return [...records].sort((first, second) => {
    if (sortMode === "severity") {
      return (
        (gradeMeta[second.grade]?.rank ?? 0) -
          (gradeMeta[first.grade]?.rank ?? 0) ||
        second.timestamp - first.timestamp
      );
    }
    if (sortMode === "asset") {
      return (
        first.assetName.localeCompare(second.assetName, "ko-KR") ||
        second.timestamp - first.timestamp
      );
    }
    if (sortMode === "unread") {
      return Number(first.isRead) - Number(second.isRead) ||
        second.timestamp - first.timestamp;
    }
    return second.timestamp - first.timestamp;
  });
}

function buildSummary(records, filteredRecords) {
  return {
    assets: new Set(filteredRecords.map((record) => record.assetId).filter(Boolean))
      .size,
    critical: filteredRecords.filter((record) =>
      ["danger", "error"].includes(record.grade),
    ).length,
    filtered: filteredRecords.length,
    total: records.length,
    unread: filteredRecords.filter((record) => !record.isRead).length,
  };
}

function matchesTimeRange(timestamp, timeRange) {
  const option = timeRangeOptions.find((item) => item.id === timeRange);
  if (!option?.durationMs || !timestamp) {
    return true;
  }
  return Date.now() - timestamp <= option.durationMs;
}

function toGrade(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["error", "fault"].includes(normalized)) {
    return "error";
  }
  if (
    ["critical", "danger", "high", "abnormal", "위험", "이상"].includes(
      normalized,
    )
  ) {
    return "danger";
  }
  if (["warning", "medium", "경고"].includes(normalized)) {
    return "warning";
  }
  if (["caution", "low", "주의"].includes(normalized)) {
    return "caution";
  }
  if (["normal", "ok", "정상"].includes(normalized)) {
    return "normal";
  }
  return "info";
}

function toSourceLabel(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "시스템 이벤트";
  }
  if (normalized === "alert") {
    return "임계 알림";
  }
  if (normalized === "system") {
    return "시스템 이벤트";
  }
  return normalized;
}

function dedupeRecords(records) {
  const recordById = new Map();
  records.forEach((record) => {
    const currentRecord = recordById.get(record.id);
    if (!currentRecord || record.timestamp > currentRecord.timestamp) {
      recordById.set(record.id, record);
    }
  });
  return Array.from(recordById.values());
}

function isAssetSuppressed(assetId, suppressedAssetMap, now) {
  return Boolean(assetId && (suppressedAssetMap[assetId] ?? 0) > now);
}

function getTimeValue(value) {
  const time = new Date(value ?? "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatShortDateTime(value) {
  const date = getValidDate(value);
  if (!date) {
    return "--:--";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatFullDateTime(value) {
  const date = getValidDate(value);
  if (!date) {
    return "-";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function getValidDate(value) {
  const date = new Date(value ?? "");
  return Number.isFinite(date.getTime()) ? date : null;
}

function toCsv(records) {
  const header = [
    "type",
    "grade",
    "status",
    "asset_id",
    "asset_name",
    "source",
    "occurred_at",
    "title",
    "message",
  ];
  const rows = records.map((record) => [
    record.kind,
    record.grade,
    record.isRead ? "read" : "unread",
    record.assetId,
    record.assetName,
    record.sourceLabel,
    record.occurredAtFull,
    record.title,
    record.message,
  ]);
  return [header, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
