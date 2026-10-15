import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import { matchRedFlag } from "@/shared/state/redFlag";
import { addChip, removeChip } from "@/shared/state/chips";
import type {
  DurationValue,
  FileCategory,
  Measurements,
  SymptomChip,
  UploadedFile,
} from "@/shared/types/booking";
import { SymptomChips } from "./SymptomChips";
import { DurationRadioGroup } from "./DurationRadioGroup";
import { SeveritySlider } from "./SeveritySlider";
import { FileUpload } from "./FileUpload";
import { MeasurementsBlock } from "./MeasurementsBlock";
import { EmergencyInterrupt } from "./EmergencyInterrupt";

const DEBOUNCE_MS = 500;
const MIN_CHARS = 3;

export function ReasonScreen() {
  useStepMark("P-04");
  const { state, update } = useBooking();
  const { goNext, goBack, skip } = useWizard();

  const [text, setText] = useState(state.symptomText);
  const [extractError, setExtractError] = useState(false);
  const [redFlag, setRedFlag] = useState<string | null>(null);
  const [dismissedFlag, setDismissedFlag] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDependent = state.careSubject?.kind === "dependent";

  useEffect(() => {
    update({ symptomText: text });
    const flag = matchRedFlag(text);
    setRedFlag(flag);
    if (!flag) setDismissedFlag(false);

    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < MIN_CHARS) {
      update({ selectedSymptoms: [], availableSymptoms: [] });
      return;
    }
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await apiFetch("/symptoms/extract", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text }),
          });
          if (!res.ok) throw new Error("extract failed");
          const data = (await res.json()) as { chips: SymptomChip[] };
          setExtractError(false);
          update({ selectedSymptoms: [], availableSymptoms: data.chips });
        } catch {
          setExtractError(true);
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const sets = { selected: state.selectedSymptoms, available: state.availableSymptoms };

  function onAdd(id: string) {
    const next = addChip(sets, id);
    update({ selectedSymptoms: next.selected, availableSymptoms: next.available });
  }
  function onRemove(id: string) {
    const next = removeChip(sets, id);
    update({ selectedSymptoms: next.selected, availableSymptoms: next.available });
  }
  function setDuration(d: DurationValue) {
    update({ duration: d });
  }
  function setSeverity(v: number) {
    update({ severity: v });
  }
  function setMeasurements(m: Measurements) {
    update({ measurements: m });
  }
  function addFile(f: UploadedFile) {
    update({ files: [...state.files, f] });
  }
  function removeFile(id: string) {
    update({ files: state.files.filter((f) => f.id !== id) });
  }
  function setFileCategory(id: string, c: FileCategory) {
    update({ files: state.files.map((f) => (f.id === id ? { ...f, category: c } : f)) });
  }

  function clearP04() {
    update({
      symptomText: "",
      selectedSymptoms: [],
      availableSymptoms: [],
      duration: null,
      severity: 0,
      files: [],
      measurements: {},
    });
  }

  return (
    <section data-screen="P-04" style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">What's going on?</h1>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 20px" }}>
        Describe your symptoms and we'll prepare them for your doctor.
      </p>

      <label htmlFor="reason" style={{ display: "block", font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 6 }}>
        Describe your symptoms
      </label>
      <textarea
        id="reason"
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="For example: sore throat since Tuesday, fever last night"
        style={{ width: "100%", minHeight: 96, padding: 14, border: "1.5px solid #c9d0d8", borderRadius: 14, font: "16px var(--font-family)", boxSizing: "border-box", resize: "vertical", marginBottom: 12 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SymptomChips selected={sets.selected} available={sets.available} error={extractError} onAdd={onAdd} onRemove={onRemove} />
        <DurationRadioGroup value={state.duration} onChange={setDuration} />
        <SeveritySlider value={state.severity} onChange={setSeverity} />
        {isDependent && <MeasurementsBlock value={state.measurements} onChange={setMeasurements} />}
        <FileUpload files={state.files} onAdd={addFile} onRemove={removeFile} onCategory={setFileCategory} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <button type="button" className="pb-btn pb-btn-primary" onClick={goNext} style={{ flex: "1 1 200px", minHeight: 52 }}>
          Continue
        </button>
        <button type="button" className="pb-btn" onClick={() => skip(clearP04)} style={{ background: "transparent", color: "var(--color-primary)" }}>
          Skip this step
        </button>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>
          Back
        </button>
      </div>

      {redFlag && !dismissedFlag && (
        <EmergencyInterrupt phrase={redFlag} onDismiss={() => setDismissedFlag(true)} />
      )}
    </section>
  );
}
