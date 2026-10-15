import { useState } from "react";
import type { MedicalHistoryRecord } from "@/shared/types/booking";

export function MedicalHistoryRow({
  record,
  onToggleShare,
  onSaveCorrection,
}: {
  record: MedicalHistoryRecord;
  onToggleShare: (id: string, shared: boolean) => void;
  onSaveCorrection: (id: string, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.correction ?? "");

  function save() {
    const trimmed = draft.trim();
    if (trimmed.length >= 1 && trimmed.length <= 2000) {
      onSaveCorrection(record.id, trimmed);
    }
    setEditing(false);
  }

  return (
    <li className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button
          type="button"
          role="checkbox"
          aria-checked={record.shared}
          aria-label={`Share ${record.label} with the doctor`}
          onClick={() => onToggleShare(record.id, !record.shared)}
          style={{
            flex: "none",
            width: 28,
            height: 28,
            borderRadius: 8,
            border: `2px solid ${record.shared ? "var(--color-primary)" : "#c9d0d8"}`,
            background: record.shared ? "var(--color-primary)" : "#fff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {record.shared ? "\u2713" : ""}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 16px var(--font-family)", color: "var(--color-heading)" }}>
            {record.label}
          </div>
          <div style={{ fontSize: 14, color: "#3a4453" }}>{record.detail}</div>
          {record.correction && (
            <div
              data-testid={`correction-${record.id}`}
              style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}
            >
              Your note: {record.correction}
            </div>
          )}
        </div>
        <button
          type="button"
          className="pb-btn"
          aria-label={editing ? `Cancel editing ${record.label}` : `Add a correction for ${record.label}`}
          onClick={() => setEditing((v) => !v)}
          style={{ minHeight: 36, background: "transparent", color: "var(--color-primary)" }}
        >
          {editing ? "Cancel" : "Add a correction"}
        </button>
      </div>
      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label className="pb-visually-hidden" htmlFor={`corr-${record.id}`}>
            Correction for {record.label}
          </label>
          <textarea
            id={`corr-${record.id}`}
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1.5px solid #c9d0d8", borderRadius: 12, font: "15px var(--font-family)", boxSizing: "border-box" }}
          />
          <button type="button" className="pb-btn pb-btn-primary" onClick={save} style={{ alignSelf: "flex-start", minHeight: 40 }}>
            Save correction
          </button>
        </div>
      )}
    </li>
  );
}