import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Slot } from "@/shared/types/booking";

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function DoctorSlotScreen() {
  useStepMark("P-08");
  const { state, update } = useBooking();
  const { goBack, goTo } = useWizard();
  const doctor = state.selectedDoctor;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(state.selectedSlot?.id ?? null);

  useEffect(() => {
    if (!doctor) return;
    setLoading(true);
    void apiFetch(`/doctors/${doctor.id}/slots`)
      .then((r) => r.json())
      .then((d: { slots: Slot[] }) => setSlots(d.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [doctor]);

  if (!doctor) return null;

  function pick(slot: Slot) {
    setSelectedId(slot.id);
    update({ selectedSlot: slot });
  }

  return (
    <section data-screen="P-08" style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">{doctor.name}</h1>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 8px" }}>{doctor.specialty} · ★ {doctor.rating.toFixed(1)}</p>
      {doctor.bio && <p style={{ fontSize: 15, color: "#3a4453", margin: "0 0 20px" }}>{doctor.bio}</p>}

      <h2 style={{ fontSize: 18, color: "var(--color-heading)", margin: "0 0 10px" }}>Choose a time</h2>
      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Loading times…</p>}
      {!loading && (
        <div role="radiogroup" aria-label="Available times" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {slots.map((s) => {
            const on = selectedId === s.id;
            return (
              <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => pick(s)}
                style={{ minHeight: 48, padding: "0 16px", borderRadius: 12, border: `2px solid ${on ? "var(--color-primary)" : "#c9d0d8"}`, background: on ? "var(--color-tint)" : "#fff", color: "var(--color-heading)", font: "600 15px var(--font-family)", cursor: "pointer" }}>
                {fmt(s.startsAt)}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <button type="button" className="pb-btn pb-btn-primary" disabled={!selectedId} onClick={() => goTo("P-09")} style={{ flex: "1 1 200px", minHeight: 52 }}>Continue</button>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>Back</button>
      </div>
    </section>
  );
}