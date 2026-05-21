import { cn } from "@/lib/utils";
export function AlarmRecordSection({ records }) {
    return (<section className="AlarmRecordSection AlarmRecordSection__section-1 min-h-0 overflow-hidden border-t border-border pt-2" aria-label="경보 기록">
      <h2 className="AlarmRecordSection AlarmRecordSection__title-1 mb-1 truncate text-xs font-semibold text-foreground">경보 기록</h2>
      <div className="AlarmRecordSection AlarmRecordSection__container-1 grid min-h-0 gap-1">
        {records.map((alarmRecord) => (<div key={alarmRecord.id} className="AlarmRecordSection AlarmRecordSection__container-2 grid h-8 min-w-0 grid-cols-[minmax(0,1fr)_4.25rem_3rem] items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px]" title={`${alarmRecord.type} ${alarmRecord.occurredAt} ${alarmRecord.code}`}>
            <div className="AlarmRecordSection AlarmRecordSection__container-3 min-w-0">
              <p className="AlarmRecordSection AlarmRecordSection__text-1 truncate font-medium text-foreground">{alarmRecord.type}</p>
              <p className="AlarmRecordSection AlarmRecordSection__text-2 truncate text-[10px] text-muted-foreground">
                {alarmRecord.occurredAt} · {alarmRecord.code}
              </p>
            </div>
            <span className="AlarmRecordSection AlarmRecordSection__label-1 truncate text-muted-foreground">{alarmRecord.code}</span>
            <span className={cn("AlarmRecordSection AlarmRecordSection__label-2 rounded-sm border px-1 py-0.5 text-center text-[10px] font-semibold", alarmRecord.isConfirmed
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300")}>
              {alarmRecord.isConfirmed ? "확인" : "미확인"}
            </span>
          </div>))}
      </div>
    </section>);
}
