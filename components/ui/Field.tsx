"use client";

import { cn } from "@/lib/utils";

export function Field({
  label,
  required,
  hint,
  error,
  counter,
  children,
  className = "",
  name,
  type = "text",
  value,
  onChange,
  options,
  suffix,
  rows,
  placeholder,
  maxLength,
  style,
  ...props
}: {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  counter?: { current: number; max: number };
  children?: React.ReactNode;
  className?: string;
  name?: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  options?: { value: string; label: string }[];
  suffix?: string;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  style?: React.CSSProperties;
  [key: string]: unknown;
}) {
  const inputId = name || Math.random().toString(36).slice(2);

  const renderInput = () => {
    if (children) return children;
    if (options) {
      return (
        <select
          id={inputId}
          name={name}
          value={String(value ?? "")}
          onChange={onChange}
          className="input"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    if (rows) {
      return (
        <textarea
          id={inputId}
          name={name}
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className="input"
        />
      );
    }
    return (
      <input
        id={inputId}
        name={name}
        type={type}
        value={String(value ?? "")}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="input"
      />
    );
  };

  return (
    <div className={cn("field", className)} style={style}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {required && <span className="field__req">*</span>}
        </label>
      )}
      <div className="field__input-wrap">
        {renderInput()}
        {suffix && <span className="field__suffix">{suffix}</span>}
      </div>
      {error && <p className="field__error">{error}</p>}
      {!error && hint && <p className="field__hint">{hint}</p>}
      {counter && (
        <p className="field__counter">
          {counter.current} / {counter.max}
        </p>
      )}
    </div>
  );
}
