import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThresholdEditor({
  isSaving = false,
  onDirtyChange,
  saveError,
  thresholds,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => toThresholdDraft(thresholds));
  const [isDirty, setIsDirty] = useState(false);
  const parsedDraft = useMemo(() => parseThresholdDraft(draft), [draft]);
  const canSave =
    parsedDraft !== null &&
    parsedDraft.temperatureCritical >= parsedDraft.temperature &&
    parsedDraft.ultrasoundCriticalDb >= parsedDraft.ultrasoundDb &&
    !isSaving;

  useEffect(() => {
    if (isDirty) {
      return;
    }

    const nextDraft = toThresholdDraft(thresholds);
    setDraft((currentDraft) =>
      areThresholdDraftsEqual(currentDraft, nextDraft) ? currentDraft : nextDraft
    );
  }, [isDirty, thresholds]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const updateDraft = (patch) => {
    setIsDirty(true);
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...patch,
    }));
  };

  const handleSave = async () => {
    if (!canSave || !parsedDraft) {
      return;
    }

    try {
      await onSave(parsedDraft);
      setIsDirty(false);
    } catch {
      // Keep the edited draft so polling or global alerts cannot overwrite it.
    }
  };

  return (
    <div className="ThresholdEditor ThresholdEditor__container-1 rounded-md border border-border bg-background p-1.5">
      <div className="ThresholdEditor ThresholdEditor__container-2 mb-1.5 flex items-center justify-between gap-2">
        <div className="ThresholdEditor ThresholdEditor__container-3 flex min-w-0 items-center gap-1.5">
          <SlidersHorizontal className="ThresholdEditor ThresholdEditor__icon-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <h2 className="ThresholdEditor ThresholdEditor__title-1 truncate text-xs font-semibold">
            설비 임계치 설정
          </h2>
        </div>
        <div className="ThresholdEditor ThresholdEditor__container-6 flex min-w-0 shrink-0 items-center justify-end gap-1">
          {onClose ? (
            <button
              type="button"
              className="ThresholdEditor ThresholdEditor__button-2 grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="설비 임계치 설정 닫기"
              title="닫기"
              onClick={onClose}
            >
              <X
                className="ThresholdEditor ThresholdEditor__icon-3 h-3.5 w-3.5"
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>
      </div>

      <div className="ThresholdEditor ThresholdEditor__container-4 grid grid-cols-2 gap-1.5">
        <ThresholdInput
          label="온도 경고 기준"
          suffix="℃"
          value={draft.temperatureWarnC}
          onChange={(temperatureWarnC) => updateDraft({ temperatureWarnC })}
        />
        <ThresholdInput
          label="온도 위험 기준"
          suffix="℃"
          value={draft.temperatureCriticalC}
          onChange={(temperatureCriticalC) =>
            updateDraft({ temperatureCriticalC })
          }
        />
        <ThresholdInput
          label="초음파 경고 기준"
          suffix="dB"
          value={draft.acousticWarnDb}
          onChange={(acousticWarnDb) => updateDraft({ acousticWarnDb })}
        />
        <ThresholdInput
          label="초음파 위험 기준"
          suffix="dB"
          value={draft.acousticCriticalDb}
          onChange={(acousticCriticalDb) => updateDraft({ acousticCriticalDb })}
        />
      </div>

      {saveError ? (
        <p className="ThresholdEditor ThresholdEditor__error-1 mt-1.5 rounded-sm border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-700 dark:text-red-300">
          {saveError}
        </p>
      ) : null}

      <button
        type="button"
        className={cn(
          "ThresholdEditor ThresholdEditor__button-save-1 mt-1.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition",
          canSave
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed border-border bg-muted text-muted-foreground"
        )}
        disabled={!canSave}
        onClick={() => void handleSave()}
      >
        {isSaving ? (
          <Loader2
            className="ThresholdEditor ThresholdEditor__icon-save-1 h-3.5 w-3.5 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Save
            className="ThresholdEditor ThresholdEditor__icon-save-1 h-3.5 w-3.5"
            aria-hidden="true"
          />
        )}
        임계치 저장
      </button>
    </div>
  );
}

function ThresholdInput({ label, onChange, suffix, value }) {
  return (
    <label className="ThresholdInput ThresholdInput__field-1 grid min-w-0 gap-1">
      <span className="ThresholdInput ThresholdInput__label-1 truncate text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="ThresholdInput ThresholdInput__control-1 flex h-8 min-w-0 items-center gap-1 rounded-md border border-border bg-card px-2">
        <input
          className="ThresholdInput ThresholdInput__input-1 min-w-0 flex-1 bg-transparent font-mono text-sm font-semibold outline-none"
          type="number"
          min={0}
          inputMode="decimal"
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span
          className="ThresholdInput ThresholdInput__suffix-1 shrink-0 font-mono text-[10px] font-bold text-muted-foreground"
          aria-hidden="true"
        >
          {suffix}
        </span>
      </span>
    </label>
  );
}

function toThresholdDraft(thresholds) {
  return {
    acousticCriticalDb: formatDraftNumber(
      thresholds?.ultrasoundCriticalDb ?? thresholds?.ultrasoundDb
    ),
    acousticWarnDb: formatDraftNumber(thresholds?.ultrasoundDb),
    temperatureCriticalC: formatDraftNumber(
      thresholds?.temperatureCritical ?? thresholds?.temperature
    ),
    temperatureWarnC: formatDraftNumber(thresholds?.temperature),
  };
}

function parseThresholdDraft(draft) {
  const temperature = parsePositiveNumber(draft.temperatureWarnC);
  const temperatureCritical = parsePositiveNumber(draft.temperatureCriticalC);
  const ultrasoundDb = parsePositiveNumber(draft.acousticWarnDb);
  const ultrasoundCriticalDb = parsePositiveNumber(draft.acousticCriticalDb);

  if (
    temperature === null ||
    temperatureCritical === null ||
    ultrasoundDb === null ||
    ultrasoundCriticalDb === null
  ) {
    return null;
  }

  return {
    temperature,
    temperatureCritical,
    ultrasoundDb,
    ultrasoundCriticalDb,
  };
}

function parsePositiveNumber(value) {
  const numberValue = Number(value);
  return value.trim().length > 0 &&
    Number.isFinite(numberValue) &&
    numberValue > 0
    ? numberValue
    : null;
}

function formatDraftNumber(value) {
  return value === undefined ? "" : String(value);
}

function areThresholdDraftsEqual(firstDraft, secondDraft) {
  return (
    firstDraft.acousticCriticalDb === secondDraft.acousticCriticalDb &&
    firstDraft.acousticWarnDb === secondDraft.acousticWarnDb &&
    firstDraft.temperatureCriticalC === secondDraft.temperatureCriticalC &&
    firstDraft.temperatureWarnC === secondDraft.temperatureWarnC
  );
}
