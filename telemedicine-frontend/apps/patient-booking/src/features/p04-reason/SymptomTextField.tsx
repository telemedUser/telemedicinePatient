import { useEffect, useRef } from "react";

export const SYMPTOM_MAX_CHARS = 2000;
export const DEBOUNCE_MS = 500;
export const MIN_EXTRACT_CHARS = 3;

export interface SymptomTextFieldProps {
  value: string;
  onChange: (text: string) => void;
  /** Fired after the debounce window when text has >= 3 non-whitespace chars. */
  onExtract: (text: string) => void;
  /** Fired immediately when text drops below 3 non-whitespace chars. */
  onClear: () => void;
}

function nonWhitespaceLength(s: string): number {
  return s.replace(/\s/g, "").length;
}

export function SymptomTextField({
  value,
  onChange,
  onExtract,
  onClear,
}: SymptomTextFieldProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleChange(next: string) {
    const clipped = next.slice(0, SYMPTOM_MAX_CHARS);
    onChange(clipped);

    if (timer.current) clearTimeout(timer.current);

    if (nonWhitespaceLength(clipped) < MIN_EXTRACT_CHARS) {
      onClear();
      return;
    }

    timer.current = setTimeout(() => {
      onExtract(clipped);
    }, DEBOUNCE_MS);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor="symptom-text" style={labelStyle}>
        Describe your symptoms
      </label>
      <textarea
        id="symptom-text"
        value={value}
        maxLength={SYMPTOM_MAX_CHARS}
        rows={5}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="For example: sore throat and a fever since yesterday"
        style={{
          width: "100%",
          padding: "12px 14px",
          border: "1.5px solid #c9d0d8",
          borderRadius: 12,
          font: "16px var(--font-family)",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <span style={{ fontSize: 12, color: "var(--color-muted)", alignSelf: "flex-end" }}>
        {value.length} / {SYMPTOM_MAX_CHARS}
      </span>
    </div>
  );
}

const labelStyle = {
  font: "600 14px var(--font-family)",
  color: "var(--color-heading)",
} as const;
