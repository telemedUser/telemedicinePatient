import { useRef, useState } from "react";
import { validateFile } from "@/shared/state/validateFile";
import type { FileCategory, UploadedFile } from "@/shared/types/booking";
import { StatusPill, type PillTone } from "@/shared/components/StatusPill";

const SCAN_TONE: Record<UploadedFile["scanStatus"], PillTone> = {
  pending: "neutral",
  scanning: "info",
  clean: "success",
  rejected: "danger",
};

export function FileUpload({
  files,
  onAdd,
  onRemove,
  onCategory,
}: {
  files: UploadedFile[];
  onAdd: (f: UploadedFile) => void;
  onRemove: (id: string) => void;
  onCategory: (id: string, c: FileCategory) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) {
      const result = validateFile({ mime: file.type, sizeBytes: file.size });
      if (!result.ok) {
        setError(
          result.reason === "type"
            ? `"${file.name}" is not a supported file type.`
            : `"${file.name}" is larger than the 10 MB limit.`,
        );
        continue;
      }
      setError(null);
      onAdd({
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        mime: file.type,
        sizeBytes: file.size,
        category: "photo",
        scanStatus: "pending",
      });
    }
  }

  return (
    <div>
      <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>
        Photos and documents <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(optional)</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "2px 0 10px" }}>
        JPG, PNG, HEIC or PDF · up to 10 MB each.
      </p>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14 }}>
          {error}
        </p>
      )}
      <ul aria-label="Attached files" style={{ listStyle: "none", margin: "0 0 10px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {files.map((f) => (
          <li key={f.id} className="pb-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "600 15px var(--font-family)", color: "var(--color-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <label className="pb-visually-hidden" htmlFor={`cat-${f.id}`}>
                  File type for {f.name}
                </label>
                <select
                  id={`cat-${f.id}`}
                  value={f.category}
                  onChange={(e) => onCategory(f.id, e.target.value as FileCategory)}
                  style={{ font: "600 13px var(--font-family)", color: "#0068ac", border: "1px solid var(--color-border)", borderRadius: 8, padding: "2px 6px" }}
                >
                  <option value="photo">Photo</option>
                  <option value="lab-report">Lab report</option>
                  <option value="prescription">Prescription</option>
                  <option value="other">Other document</option>
                </select>
                <StatusPill tone={SCAN_TONE[f.scanStatus]} label={f.scanStatus.charAt(0).toUpperCase() + f.scanStatus.slice(1)} />
              </div>
            </div>
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f.id)} className="pb-btn" style={{ minHeight: 40, background: "transparent", color: "var(--color-muted)" }}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="pb-btn pb-btn-secondary" onClick={() => inputRef.current?.click()}>
        Add photos or files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.heic,.heif"
        aria-label="Attach files"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
