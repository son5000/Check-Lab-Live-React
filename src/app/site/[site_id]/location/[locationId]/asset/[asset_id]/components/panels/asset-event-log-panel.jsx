import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BellRing, CircleAlert, CircleCheck, ListChecks, SlidersHorizontal, TriangleAlert, X, } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCheckLabTimeValue } from "@/app/layouts/helpers/time-formatters";
const EVENT_REVIEW_CONTEXT_EVENT = "checklab:event-review-context";
const gradeConfig = {
    normal: {
        icon: CircleCheck,
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        label: "정상",
    },
    caution: {
        icon: TriangleAlert,
        className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        label: "요주의",
    },
    abnormal: {
        icon: CircleAlert,
        className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
        label: "이상",
    },
};
export function AssetEventLogPanel({ asset_id, assetId, events, initialSelectedEventId, onEventRead, onRequestClose, variant = "compact", }) {
    const [eventFilterId, setEventFilterId] = useState("all");
    const [eventSortId, setEventSortId] = useState("latest");
    const [selectedEventId, setSelectedEventId] = useState();
    const [selectedEventSnapshot, setSelectedEventSnapshot] = useState();
    const [readEventIds, setReadEventIds] = useState([]);
    const handledInitialSelectedEventIdRef = useRef();
    const eventRecords = useMemo(() => dedupeEventRecords(events), [events]);
    const eventStats = useMemo(() => buildEventStats(eventRecords, readEventIds), [eventRecords, readEventIds]);
    const filteredEvents = useMemo(() => sortEvents(filterEvents(eventRecords, eventFilterId, readEventIds), eventSortId, readEventIds), [eventFilterId, eventRecords, eventSortId, readEventIds]);
    const visibleEvents = variant === "wide" ? filteredEvents : filteredEvents.slice(0, 6);
    const selectedLiveEvent = useMemo(() => selectedEventId
        ? eventRecords.find((event) => event.id === selectedEventId)
        : undefined, [eventRecords, selectedEventId]);
    const selectedEvent = selectedLiveEvent ?? selectedEventSnapshot;
    const isSelectedEventDetached = Boolean(selectedEvent && selectedEventId && !selectedLiveEvent);
    const detailEvents = useMemo(() => {
        if (!selectedEvent ||
            filteredEvents.some((event) => event.id === selectedEvent.id)) {
            return filteredEvents;
        }
        return [selectedEvent, ...filteredEvents];
    }, [filteredEvents, selectedEvent]);
    const isDetailOpen = Boolean(selectedEvent);
    useEffect(() => {
        setReadEventIds((currentIds) => {
            const nextIds = new Set(currentIds);
            eventRecords.forEach((event) => {
                if (event.isRead) {
                    nextIds.add(event.id);
                }
            });
            return Array.from(nextIds);
        });
    }, [eventRecords]);
    useEffect(() => {
        if (!initialSelectedEventId) {
            handledInitialSelectedEventIdRef.current = undefined;
            return;
        }
        if (handledInitialSelectedEventIdRef.current === initialSelectedEventId) {
            return;
        }
        const initialEvent = eventRecords.find((event) => event.id === initialSelectedEventId);
        if (!initialEvent) {
            return;
        }
        handledInitialSelectedEventIdRef.current = initialSelectedEventId;
        setSelectedEventId(initialSelectedEventId);
        setSelectedEventSnapshot(initialEvent);
        setReadEventIds((currentIds) => currentIds.includes(initialSelectedEventId)
            ? currentIds
            : [...currentIds, initialSelectedEventId]);
        void onEventRead?.(initialEvent);
    }, [eventRecords, initialSelectedEventId, onEventRead]);
    useEffect(() => {
        if (!selectedEventId) {
            setSelectedEventSnapshot(undefined);
            return;
        }
        if (selectedLiveEvent) {
            setSelectedEventSnapshot(selectedLiveEvent);
        }
    }, [selectedEventId, selectedLiveEvent]);
    const handleCloseDetail = useCallback(() => {
        setSelectedEventId(undefined);
        setSelectedEventSnapshot(undefined);
    }, []);
    const handleCloseEventReview = useCallback(() => {
        setEventFilterId("all");
        setEventSortId("latest");
        setSelectedEventId(undefined);
        setSelectedEventSnapshot(undefined);
        handledInitialSelectedEventIdRef.current = undefined;
        onRequestClose?.();
    }, [onRequestClose]);
    useEffect(() => {
        if (!isDetailOpen) {
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                handleCloseEventReview();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleCloseEventReview, isDetailOpen]);
    useEffect(() => {
        if (!selectedEvent) {
            window.dispatchEvent(new CustomEvent(EVENT_REVIEW_CONTEXT_EVENT, {
                detail: { isOpen: false },
            }));
            return;
        }
        window.dispatchEvent(new CustomEvent(EVENT_REVIEW_CONTEXT_EVENT, {
            detail: {
                asset_id: selectedEvent.asset_id ?? asset_id,
                assetId,
                eventId: selectedEvent.alertId ?? selectedEvent.id,
                grade: selectedEvent.grade,
                isOpen: true,
            },
        }));
        return () => {
            window.dispatchEvent(new CustomEvent(EVENT_REVIEW_CONTEXT_EVENT, {
                detail: { isOpen: false },
            }));
        };
    }, [asset_id, assetId, selectedEvent]);
    const handleEventSelect = (eventId) => {
        const event = eventRecords.find((currentEvent) => currentEvent.id === eventId) ??
            (selectedEventSnapshot?.id === eventId ? selectedEventSnapshot : undefined);
        if (!event) {
            return;
        }
        setSelectedEventId(eventId);
        setSelectedEventSnapshot(event);
        setReadEventIds((currentIds) => currentIds.includes(eventId) ? currentIds : [...currentIds, eventId]);
        void onEventRead?.(event);
    };
    return (<section className="AssetEventLogPanel AssetEventLogPanel__section-1 flex h-full max-h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card p-2 text-card-foreground">
      <div className="AssetEventLogPanel AssetEventLogPanel__container-1 mb-2 grid min-w-0 gap-2">
        <div className="AssetEventLogPanel AssetEventLogPanel__container-2 flex min-w-0 items-center justify-between gap-2">
          <div className="AssetEventLogPanel AssetEventLogPanel__container-5 flex min-w-0 items-center gap-1.5">
            <BellRing className="AssetEventLogPanel AssetEventLogPanel__icon-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
            <span className="AssetEventLogPanel AssetEventLogPanel__label-2 rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              미열람 {eventStats.unreadCount}
            </span>
            <span className="AssetEventLogPanel AssetEventLogPanel__label-3 rounded-sm border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-red-700 dark:text-red-300">
              이상 {eventStats.abnormalCount}
            </span>
            <span className="AssetEventLogPanel AssetEventLogPanel__label-4 rounded-sm border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              요주의 {eventStats.cautionCount}
            </span>
          </div>
          <span className="AssetEventLogPanel AssetEventLogPanel__label-1 shrink-0 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {filteredEvents.length}/{eventRecords.length}건
          </span>
        </div>
        <EventLogControls filterId={eventFilterId} sortId={eventSortId} onFilterChange={setEventFilterId} onSortChange={setEventSortId}/>
      </div>

      {variant === "wide" ? (<div className="AssetEventLogPanel AssetEventLogPanel__container-3 grid min-h-0 flex-1 auto-rows-[2.5rem] overflow-y-auto rounded-md border border-border bg-background">
          {visibleEvents.length ? (visibleEvents.map((event) => (<WideEventRow key={event.id} event={event} isRead={isEventRead(event, readEventIds)} onSelect={handleEventSelect}/>))) : (<EmptyEventState />)}
        </div>) : (<div className="AssetEventLogPanel AssetEventLogPanel__container-4 grid min-h-0 flex-1 auto-rows-max gap-1 overflow-y-auto pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin]">
          {visibleEvents.length ? (visibleEvents.map((event) => (<CompactEventCard key={event.id} event={event} isRead={isEventRead(event, readEventIds)} onSelect={handleEventSelect}/>))) : (<EmptyEventState />)}
        </div>)}

      {selectedEvent ? (<EventDetailDialog events={detailEvents} isDetached={isSelectedEventDetached} selectedEvent={selectedEvent} readEventIds={readEventIds} onBackToList={handleCloseDetail} onClose={handleCloseEventReview} onMarkRead={handleEventSelect} onSelect={handleEventSelect}/>) : null}
    </section>);
}
function EventLogControls({ filterId, sortId, onFilterChange, onSortChange, }) {
    return (<div className="EventLogControls EventLogControls__container-1 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-1.5">
      <div className="EventLogControls EventLogControls__filters-1 flex min-w-0 flex-wrap items-center gap-1">
        {eventFilterOptions.map((option) => (<button key={option.id} type="button" className={cn("EventLogControls EventLogControls__button-1 inline-flex h-7 shrink-0 items-center rounded-sm border px-2 text-[11px] font-semibold transition", filterId === option.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground")} aria-pressed={filterId === option.id} onClick={() => onFilterChange(option.id)}>
            {option.label}
          </button>))}
      </div>

      <label className="EventLogControls EventLogControls__sort-1 flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <SlidersHorizontal className="EventLogControls EventLogControls__icon-1 h-3.5 w-3.5" aria-hidden="true"/>
        <select className="EventLogControls EventLogControls__select-1 h-7 rounded-sm border border-border bg-card px-2 text-[11px] font-semibold text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" value={sortId} onChange={(event) => onSortChange(event.target.value)}>
          {eventSortOptions.map((option) => (<option key={option.id} value={option.id}>
              {option.label}
            </option>))}
        </select>
      </label>
    </div>);
}
function EmptyEventState() {
    return (<div className="EmptyEventState EmptyEventState__container-1 row-span-6 grid min-h-0 place-items-center rounded-md border border-dashed border-border bg-background px-3 text-center">
      <p className="EmptyEventState EmptyEventState__text-1 text-[11px] leading-5 text-muted-foreground">
        실제 임계치 초과, 변화 좌표, 알림 연동 이벤트가 발생하면 이곳에
        기록됩니다.
      </p>
    </div>);
}
function dedupeEventRecords(events) {
    const eventById = new Map();
    events.forEach((event) => {
        const currentEvent = eventById.get(event.id);
        eventById.set(event.id, currentEvent ? mergeDuplicateEvent(currentEvent, event) : event);
    });
    return Array.from(eventById.values());
}
function mergeDuplicateEvent(currentEvent, nextEvent) {
    const preferredEvent = getDuplicateEventPriority(nextEvent) > getDuplicateEventPriority(currentEvent)
        ? nextEvent
        : currentEvent;
    const fallbackEvent = preferredEvent === currentEvent ? nextEvent : currentEvent;
    return {
        ...fallbackEvent,
        ...preferredEvent,
        alertId: preferredEvent.alertId ?? fallbackEvent.alertId,
        asset_id: preferredEvent.asset_id ?? fallbackEvent.asset_id,
        globalAlert: Boolean(preferredEvent.globalAlert || fallbackEvent.globalAlert),
        isRead: Boolean(preferredEvent.isRead || fallbackEvent.isRead),
        occurredAtIso: preferredEvent.occurredAtIso ?? fallbackEvent.occurredAtIso,
        readAt: preferredEvent.readAt ?? fallbackEvent.readAt,
        readBy: preferredEvent.readBy ?? fallbackEvent.readBy,
        sourceType: preferredEvent.sourceType ?? fallbackEvent.sourceType,
    };
}
function getDuplicateEventPriority(event) {
    return ((event.source === "asset-threshold" ? 100 : 0) +
        (event.alertId ? 50 : 0) +
        (event.isRead ? 10 : 0) +
        (event.readAt ? 5 : 0) +
        getEventTime(event) / 10000000000000);
}
function buildEventStats(events, readEventIds) {
    return events.reduce((stats, event) => ({
        abnormalCount: stats.abnormalCount + (event.grade === "abnormal" ? 1 : 0),
        cautionCount: stats.cautionCount + (event.grade === "caution" ? 1 : 0),
        unreadCount: stats.unreadCount + (isEventRead(event, readEventIds) ? 0 : 1),
    }), {
        abnormalCount: 0,
        cautionCount: 0,
        unreadCount: 0,
    });
}
function filterEvents(events, filterId, readEventIds) {
    if (filterId === "unread") {
        return events.filter((event) => !isEventRead(event, readEventIds));
    }
    if (filterId === "abnormal" || filterId === "caution") {
        return events.filter((event) => event.grade === filterId);
    }
    return events;
}
function sortEvents(events, sortId, readEventIds) {
    return [...events].sort((firstEvent, secondEvent) => {
        if (sortId === "oldest") {
            return getEventTime(firstEvent) - getEventTime(secondEvent);
        }
        if (sortId === "severity") {
            const gradeDelta = eventGradePriority[secondEvent.grade] - eventGradePriority[firstEvent.grade];
            return gradeDelta || getEventTime(secondEvent) - getEventTime(firstEvent);
        }
        if (sortId === "unread") {
            const readDelta = Number(isEventRead(firstEvent, readEventIds)) -
                Number(isEventRead(secondEvent, readEventIds));
            return readDelta || getEventTime(secondEvent) - getEventTime(firstEvent);
        }
        return getEventTime(secondEvent) - getEventTime(firstEvent);
    });
}
function isEventRead(event, readEventIds) {
    return Boolean(event.isRead) || readEventIds.includes(event.id);
}
function getEventTime(event) {
    const isoTime = getCheckLabTimeValue(event.occurredAtIso);
    if (isoTime > 0) {
        return isoTime;
    }
    const time = Date.parse(`1970-01-01T${event.occurredAt}`);
    return Number.isFinite(time) ? time : 0;
}
const eventFilterOptions = [
    { id: "all", label: "전체" },
    { id: "unread", label: "미열람" },
    { id: "abnormal", label: "이상" },
    { id: "caution", label: "요주의" },
];
const eventSortOptions = [
    { id: "latest", label: "최신순" },
    { id: "oldest", label: "오래된순" },
    { id: "severity", label: "위험도순" },
    { id: "unread", label: "미열람 우선" },
];
const eventGradePriority = {
    abnormal: 3,
    caution: 2,
    normal: 1,
};
function WideEventRow({ event, isRead, onSelect, }) {
    const config = gradeConfig[event.grade];
    const Icon = config.icon;
    return (<button type="button" className="WideEventRow WideEventRow__item-1 grid min-h-8 min-w-0 grid-cols-[5.25rem_4.25rem_5.5rem_minmax(8rem,0.55fr)_minmax(0,1.45fr)] items-center gap-2 border-b border-border px-3 py-1 text-left leading-none transition last:border-b-0 hover:bg-accent/50 focus-visible:bg-accent focus-visible:outline-none" onClick={() => onSelect(event.id)}>
      <time className="WideEventRow WideEventRow__time-1 font-mono text-[11px] leading-none text-muted-foreground">
        {event.occurredAt}
      </time>
      <ReadStateBadge isRead={isRead}/>
      <span className={cn("WideEventRow WideEventRow__label-1 inline-flex min-w-0 items-center justify-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", config.className)}>
        <Icon className="WideEventRow WideEventRow__icon-1 h-3 w-3 shrink-0" aria-hidden="true"/>
        <span className="WideEventRow WideEventRow__label-2 truncate">
          {config.label}
        </span>
      </span>
      <h3 className="WideEventRow WideEventRow__title-1 truncate text-xs font-semibold leading-tight">
        {event.title}
      </h3>
      <p className="WideEventRow WideEventRow__text-1 min-w-0 truncate text-xs leading-tight text-muted-foreground">
        {event.message}
      </p>
    </button>);
}
function CompactEventCard({ event, isRead, onSelect, }) {
    const config = gradeConfig[event.grade];
    const Icon = config.icon;
    return (<button type="button" className="CompactEventCard CompactEventCard__item-1 min-h-[4.375rem] min-w-0 overflow-hidden rounded-md border border-border bg-background px-2 py-1.5 text-left transition hover:bg-accent/50 focus-visible:bg-accent focus-visible:outline-none" onClick={() => onSelect(event.id)}>
      <div className="CompactEventCard CompactEventCard__container-1 mb-1 flex min-w-0 items-center justify-between gap-2 leading-none">
        <div className="CompactEventCard CompactEventCard__container-2 flex min-w-0 items-center gap-1">
          <span className={cn("CompactEventCard CompactEventCard__label-1 inline-flex min-w-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", config.className)}>
            <Icon className="CompactEventCard CompactEventCard__icon-1 h-3 w-3 shrink-0" aria-hidden="true"/>
            <span className="CompactEventCard CompactEventCard__label-2 truncate">
              {config.label}
            </span>
          </span>
          <ReadStateBadge isRead={isRead}/>
        </div>
      </div>
      <h3 className="CompactEventCard CompactEventCard__title-1 truncate text-xs font-semibold leading-tight">
        {event.title}
      </h3>
      <p className="CompactEventCard CompactEventCard__text-1 truncate text-[11px] leading-tight text-muted-foreground">
        {event.message}
      </p>
    </button>);
}
function EventDetailDialog({ events, isDetached, readEventIds, selectedEvent, onBackToList, onClose, onMarkRead, onSelect, }) {
    const config = gradeConfig[selectedEvent.grade];
    const Icon = config.icon;
    const canMarkSelectedEventRead = selectedEvent.source === "asset-threshold" &&
        !isEventRead(selectedEvent, readEventIds);
    return (<div className="EventDetailDialog EventDetailDialog__overlay-1 fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="이벤트 기록 상세" onClick={onClose}>
      <div className="EventDetailDialog EventDetailDialog__container-1 grid max-h-[min(90vh,54rem)] w-[min(1080px,calc(100vw-2rem))] min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="EventDetailDialog EventDetailDialog__container-2 flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="EventDetailDialog EventDetailDialog__container-3 flex min-w-0 items-center gap-2">
            <ListChecks className="EventDetailDialog EventDetailDialog__icon-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
            <div className="EventDetailDialog EventDetailDialog__container-4 min-w-0">
              <div className="EventDetailDialog EventDetailDialog__container-15 flex min-w-0 items-center gap-2">
                <h3 className="EventDetailDialog EventDetailDialog__title-1 truncate text-sm font-semibold">
                  실시간 이벤트 상세
                </h3>
                {isDetached ? (<span className="EventDetailDialog EventDetailDialog__label-4 shrink-0 rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    상세 고정
                  </span>) : null}
              </div>
              <p className="EventDetailDialog EventDetailDialog__text-1 truncate text-[11px] text-muted-foreground">
                이벤트 목록에서 항목을 선택해 상세 내용을 확인합니다.
              </p>
            </div>
          </div>
          <div className="EventDetailDialog EventDetailDialog__actions-1 flex shrink-0 items-center gap-1.5">
            <button type="button" className="EventDetailDialog EventDetailDialog__button-list-1 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground" onClick={onBackToList}>
              <ArrowLeft className="EventDetailDialog EventDetailDialog__icon-4 h-3.5 w-3.5" aria-hidden="true"/>
              목록 보기
            </button>
            <button type="button" className="EventDetailDialog EventDetailDialog__button-read-1 inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-background px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={!canMarkSelectedEventRead} onClick={() => onMarkRead(selectedEvent.id)}>
              Mark Read
            </button>
            <button type="button" className="EventDetailDialog EventDetailDialog__button-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground" title="닫기" onClick={onClose}>
              <X className="EventDetailDialog EventDetailDialog__icon-2 h-4 w-4" aria-hidden="true"/>
            </button>
          </div>
        </div>

        <div className="EventDetailDialog EventDetailDialog__container-5 grid min-h-0 min-w-0 gap-3 p-4 md:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.85fr)]">
          <article className="EventDetailDialog EventDetailDialog__container-9 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background">
            <div className="EventDetailDialog EventDetailDialog__container-10 flex min-w-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className={cn("EventDetailDialog EventDetailDialog__label-3 inline-flex min-w-0 items-center gap-1 rounded-sm border px-2 py-1 text-xs font-semibold", config.className)}>
                <Icon className="EventDetailDialog EventDetailDialog__icon-3 h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
                {config.label}
              </span>
              <time className="EventDetailDialog EventDetailDialog__time-1 shrink-0 font-mono text-xs text-muted-foreground">
                {selectedEvent.occurredAt}
              </time>
            </div>

            <div className="EventDetailDialog EventDetailDialog__container-11 grid min-h-0 gap-3 overflow-y-auto p-4 [scrollbar-gutter:stable] [scrollbar-width:thin]">
              <div className="EventDetailDialog EventDetailDialog__container-12 min-w-0">
                <p className="EventDetailDialog EventDetailDialog__text-2 mb-1 text-[11px] font-medium text-muted-foreground">
                  이벤트 제목
                </p>
                <h4 className="EventDetailDialog EventDetailDialog__title-2 text-lg font-semibold leading-tight text-foreground">
                  {selectedEvent.title}
                </h4>
              </div>

              <div className="EventDetailDialog EventDetailDialog__container-13 rounded-md border border-border bg-card p-3">
                <p className="EventDetailDialog EventDetailDialog__text-3 mb-1 text-[11px] font-medium text-muted-foreground">
                  상세 메시지
                </p>
                <p className="EventDetailDialog EventDetailDialog__text-4 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  {selectedEvent.message}
                </p>
              </div>

              <div className="EventDetailDialog EventDetailDialog__container-14 grid gap-2 sm:grid-cols-3">
                <EventDetailMetric label="발생 시각" value={selectedEvent.occurredAt}/>
                <EventDetailMetric label="판정 등급" value={config.label}/>
                <EventDetailMetric label="이벤트 ID" value={selectedEvent.id}/>
              </div>
            </div>
          </article>

          <div className="EventDetailDialog EventDetailDialog__container-6 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background">
            <div className="EventDetailDialog EventDetailDialog__container-7 flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className="EventDetailDialog EventDetailDialog__label-1 text-xs font-semibold">
                이벤트 목록
              </span>
            </div>
            <div className="EventDetailDialog EventDetailDialog__container-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2 [scrollbar-gutter:stable] [scrollbar-width:thin]">
              {events.map((event) => (<EventDialogListItem key={event.id} event={event} isRead={isEventRead(event, readEventIds)} selected={event.id === selectedEvent.id} onSelect={onSelect}/>))}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
function EventDialogListItem({ event, isRead, selected, onSelect, }) {
    const config = gradeConfig[event.grade];
    const Icon = config.icon;
    return (<button type="button" className={cn("EventDialogListItem EventDialogListItem__button-1 min-w-0 rounded-md border border-border bg-card px-2.5 py-2 text-left transition hover:bg-accent/50", selected && "border-primary bg-primary/10 hover:bg-primary/15")} onClick={() => onSelect(event.id)}>
      <div className="EventDialogListItem EventDialogListItem__container-1 mb-1 flex min-w-0 items-center justify-between gap-2">
        <div className="EventDialogListItem EventDialogListItem__container-2 flex min-w-0 items-center gap-1">
          <span className={cn("EventDialogListItem EventDialogListItem__label-1 inline-flex min-w-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", config.className)}>
            <Icon className="EventDialogListItem EventDialogListItem__icon-1 h-3 w-3 shrink-0" aria-hidden="true"/>
            <span className="EventDialogListItem EventDialogListItem__label-2 truncate">
              {config.label}
            </span>
          </span>
          <ReadStateBadge isRead={isRead}/>
        </div>
      </div>
      <p className="EventDialogListItem EventDialogListItem__text-1 truncate text-xs font-semibold">
        {event.title}
      </p>
      <p className="EventDialogListItem EventDialogListItem__text-2 truncate text-[11px] text-muted-foreground">
        {event.message}
      </p>
    </button>);
}
function ReadStateBadge({ isRead }) {
    return (<span className={cn("ReadStateBadge ReadStateBadge__label-1 inline-flex min-w-[2.875rem] shrink-0 items-center justify-center rounded-sm border px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none", isRead
            ? "border-border bg-muted text-muted-foreground"
            : "border-primary/30 bg-primary/10 text-primary")}>
      {isRead ? "열람" : "미열람"}
    </span>);
}
function EventDetailMetric({ label, value }) {
    return (<div className="EventDetailMetric EventDetailMetric__container-1 min-w-0 rounded-md border border-border bg-card px-2.5 py-2">
      <p className="EventDetailMetric EventDetailMetric__text-2 truncate font-mono text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>);
}
