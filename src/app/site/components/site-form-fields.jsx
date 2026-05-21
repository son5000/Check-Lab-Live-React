"use client";

import { useRef } from "react";
import { Image as ImageIcon, X } from "lucide-react";

const operationStateOptions = [
  { label: "\uBBF8\uC9C0\uC815", value: "" },
  { label: "\uAC00\uB3D9 \uC911", value: "\uAC00\uB3D9\uC911" },
  { label: "\uBE44\uAC00\uB3D9", value: "\uBE44\uAC00\uB3D9" },
];

export function TextField({
  disabled = false,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}) {
  return (
    <label className="SiteTextField SiteTextField__label-1 grid gap-2 text-sm font-semibold text-muted-foreground">
      {label}
      <input
        className="SiteTextField SiteTextField__input-1 h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

export function OperationStateSelect({ disabled = false, label, onChange, value }) {
  return (
    <label className="SiteOperationStateSelect SiteOperationStateSelect__label-1 grid gap-2 text-sm font-semibold text-muted-foreground">
      {label}
      <select
        className="SiteOperationStateSelect SiteOperationStateSelect__select-1 h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {operationStateOptions.map((option) => (
          <option key={option.value || "unset"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({
  disabled = false,
  label,
  onChange,
  placeholder,
  value,
}) {
  return (
    <label className="SiteTextAreaField SiteTextAreaField__label-1 grid gap-2 text-sm font-semibold text-muted-foreground">
      {label}
      <textarea
        className="SiteTextAreaField SiteTextAreaField__textarea-1 min-h-24 min-w-0 resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function ImageUploadField({
  disabled = false,
  label,
  onChange,
  onRemove,
  value,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") onChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <label className="SiteImageUploadField SiteImageUploadField__label-1 grid gap-2 text-sm font-semibold text-muted-foreground">
      {label}
      <div className="SiteImageUploadField SiteImageUploadField__container-1 flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="SiteImageUploadField SiteImageUploadField__button-1 flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background/50 text-sm font-medium text-muted-foreground transition hover:border-accent hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImageIcon className="SiteImageUploadField h-4 w-4" aria-hidden="true" />
          {value ? "이미지 변경" : "이미지 업로드"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="SiteImageUploadField SiteImageUploadField__remove-1 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-red-500/10 text-red-400 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            title="이미지 제거"
          >
            <X className="SiteImageUploadField h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {value ? (
        <div className="SiteImageUploadField SiteImageUploadField__preview-1 mt-1 overflow-hidden rounded-md border border-border bg-background">
          <img src={value} alt="preview" className="SiteImageUploadField h-24 w-full object-cover" />
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="SiteImageUploadField hidden"
        disabled={disabled}
      />
    </label>
  );
}

export function Metric({ label, value }) {
  return (
    <div className="SiteIndexMetric SiteIndexMetric__container-1 min-w-0 rounded-md border border-border bg-card px-4 py-3">
      <p className="SiteIndexMetric SiteIndexMetric__text-1 truncate text-xs text-muted-foreground">
        {label}
      </p>
      <p className="SiteIndexMetric SiteIndexMetric__text-2 truncate text-xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
