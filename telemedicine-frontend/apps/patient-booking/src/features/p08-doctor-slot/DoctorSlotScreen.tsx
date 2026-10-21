import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { ConsultationMode, Slot } from "@/shared/types/booking";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", ml: "Malayalam", te: "Telugu", ta: "Tamil",
  pa: "Punjabi", bn: "Bengali", gu: "Gujarati", kn: "Kannada",
};
function languageList(codes?: string[]): string {
  if (!codes || codes.length === 0) return "";
  return codes.map((c) => LANG_NAMES[c] ?? c).join(", ");
}
function initials(name: string): string {
  return name.replace(/^(Dr\.?|Dra\.?)\s*/i, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
/** YYYY-MM-DD key for grouping slots by day in local time. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface DayGroup {
  key: string;
  date: Date;
  slots: Slot[];
}

export function DoctorSlotScreen() {
  useStepMark("P-08");
  const { state, update } = useBooking();
  const { goBack, goTo } = useWizard();
  const doctor = state.selectedDoctor;

  const [mode, setMode] = useState<ConsultationMode>(state.selectedMode ?? "video");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(state.selectedSlot?.id ?? null);

  useEffect(() => {
    if (!doctor) return;
    setLoading(true);
    void apiFetch(`/doctors/${doctor.id}/slots?mode=${mode}`)
      .then((r) => r.json())
      .then((d: { slots: Slot[] }) => setSlots(d.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
    // changing mode resets the current slot selection
    setSelectedId(null);
  }, [doctor, mode]);

  // Group slots into the next 7 days (only days that have slots show counts; others show "—").
  const days = useMemo<DayGroup[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byKey = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(s.startsAt);
      (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(s);
    }
    const out: DayGroup[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      out.push({ key: k, date, slots: byKey.get(k) ?? [] });
    }
    return out;
  }, [slots]);

  // Default the selected day to the first day that has slots.
  useEffect(() => {
    if (selectedDay && days.some((d) => d.key === selectedDay && d.slots.length > 0)) return;
    const first = days.find((d) => d.slots.length > 0);
    setSelectedDay(first ? first.key : null);
  }, [days, selectedDay]);

  if (!doctor) return null;

  const activeDay = days.find((d) => d.key === selectedDay) ?? null;

  function pickSlot(slot: Slot) {
    setSelectedId(slot.id);
    update({ selectedSlot: slot, selectedMode: mode });
  }

  function dayLabel(d: Date, index: number): string {
    if (index === 0) return "TODAY";
    if (index === 1) return "TMRW";
    return d.toLocaleDateString([], { weekday: "short" }).toUpperCase();
  }

  const breakdown = doctor.ratingBreakdown ?? [78, 16, 4, 1, 1];
  const modes = doctor.modes ?? ["video", "audio"];

  return (
    <section data-screen="P-08" style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(16px,3cqi,40px) 20px 48px" }}>
      <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)", padding: 0, marginBottom: 14, minHeight: "auto" }}>
        &#8592; All doctors
      </button>

      {/* Doctor profile card */}
      <div className="pb-card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: 14, borderBottom: "1px solid var(--color-border)" }}>
          <span aria-hidden="true" style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 15px var(--font-family)" }}>
            {initials(doctor.name)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 22px var(--font-family)", color: "var(--color-heading)" }}>{doctor.name}</div>
            <div style={{ fontSize: 14, color: "var(--color-muted)", marginTop: 2 }}>
              {doctor.specialty}{doctor.clinic ? ` · ${doctor.clinic}` : ""}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 14, color: "var(--color-heading)", fontWeight: 600 }}>
                &#9733; {doctor.rating.toFixed(1)}{doctor.reviews ? ` (${doctor.reviews} reviews)` : ""}
              </span>
              {doctor.inNetwork && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-success)", background: "#e3f4ea", padding: "3px 10px", borderRadius: 999 }}>
                  &#10003; In network
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16, padding: "14px 0" }}>
          <Meta label="Languages" value={languageList(doctor.languages) || "—"} />
          <Meta label="Experience" value={doctor.yearsExperience ? `${doctor.yearsExperience} years` : "—"} />
          <Meta label="Consultation" value={`${doctor.durationMin ?? 15}-min · ${modes.map((m) => (m === "video" ? "Video" : "Audio")).join(" · ")}`} />
          <Meta label="Fee" value={inr(doctor.priceClp)} />
        </div>

        {/* Hours + rating breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
          {doctor.hours && (
            <div>
              <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 8 }}>Consultation hours</div>
              {doctor.hours.split(";").map((line, i) => (
                <div key={i} style={{ fontSize: 14, color: "var(--color-muted)" }}>{line.trim()}</div>
              ))}
            </div>
          )}
          <div>
            <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 8 }}>Rating breakdown</div>
            {breakdown.map((pct, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 28, fontSize: 12, color: "var(--color-muted)" }}>{5 - i} &#9733;</span>
                <span style={{ flex: 1, height: 8, background: "#eceff2", borderRadius: 4, overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${pct}%`, height: "100%", background: "#c47a2c" }} />
                </span>
                <span style={{ width: 34, textAlign: "right", fontSize: 12, color: "var(--color-muted)" }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Book a time card */}
      <div className="pb-card">
        <h2 style={{ font: "700 20px var(--font-family)", color: "var(--color-heading)", margin: "0 0 14px" }}>Book a time</h2>

        <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 8 }}>How would you like to consult?</div>
        <div role="radiogroup" aria-label="Consultation mode" style={{ display: "inline-flex", gap: 0, background: "#eef1f4", borderRadius: 999, padding: 4, marginBottom: 20 }}>
          {modes.map((m) => {
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMode(m)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 20px", borderRadius: 999, border: "none", cursor: "pointer", font: "600 14px var(--font-family)", background: on ? "var(--color-heading)" : "transparent", color: on ? "#fff" : "var(--color-muted)" }}
              >
                <span aria-hidden="true">{m === "video" ? "\uD83D\uDCF9" : "\uD83D\uDCDE"}</span>
                {m === "video" ? "Video" : "Audio"}
              </button>
            );
          })}
        </div>

        <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 10 }}>Pick a day</div>
        {loading ? (
          <p role="status" style={{ color: "var(--color-muted)" }}>Loading times…</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
              {days.map((d, i) => {
                const on = selectedDay === d.key;
                const disabled = d.slots.length === 0;
                return (
                  <button
                    key={d.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedDay(d.key)}
                    style={{ flex: "none", width: 70, padding: "8px 0", borderRadius: 12, border: `1.5px solid ${on ? "var(--color-heading)" : "var(--color-border)"}`, background: on ? "var(--color-heading)" : "#fff", color: on ? "#fff" : disabled ? "#b7bfc8" : "var(--color-heading)", cursor: disabled ? "default" : "pointer", textAlign: "center" }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{dayLabel(d.date, i)}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{d.date.getDate()}</div>
                    <div style={{ fontSize: 11, color: on ? "rgba(255,255,255,0.8)" : "var(--color-muted)" }}>
                      {disabled ? "\u2014" : `${d.slots.length} slots`}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeDay && activeDay.slots.length > 0 ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>
                    {activeDay.date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{activeDay.slots.length} slots available</span>
                </div>
                <div role="radiogroup" aria-label="Available times" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {activeDay.slots.map((s) => {
                    const on = selectedId === s.id;
                    return (
                      <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => pickSlot(s)}
                        style={{ minHeight: 44, padding: "0 18px", borderRadius: 10, border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border)"}`, background: on ? "var(--color-primary)" : "#fff", color: on ? "#fff" : "var(--color-heading)", font: "600 15px var(--font-family)", cursor: "pointer" }}>
                        {timeLabel(s.startsAt)}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No times available on this day.</p>
            )}
          </>
        )}

        <button
          type="button"
          className="pb-btn pb-btn-primary"
          disabled={!selectedId}
          onClick={() => goTo("P-09")}
          style={{ width: "100%", minHeight: 52, marginTop: 22 }}
        >
          Continue
        </button>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)" }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--color-heading)", marginTop: 3 }}>{value}</div>
    </div>
  );
}
