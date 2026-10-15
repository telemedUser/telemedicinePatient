import { useBooking } from "@/shared/state/BookingProvider";
import { useStepMark } from "@/shared/components/useStepMark";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function ConfirmedScreen() {
  useStepMark("P-12");
  const { state } = useBooking();
  const d = state.selectedDoctor;
  const s = state.selectedSlot;

  return (
    <section data-screen="P-12" style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 56, height: 56, borderRadius: "50%", background: "#e3f4ea", color: "#1b7f4c", display: "grid", placeItems: "center", fontSize: 30 }}>✓</span>
        <h1 className="pb-h1" style={{ margin: 0 }}>Booking confirmed</h1>
      </div>

      <div className="pb-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ background: "var(--color-heading)", color: "#fff", padding: "18px 20px" }}>
          <div style={{ fontSize: 13, color: "#bfd8ee" }}>{(s?.mode ?? "video").toUpperCase()} CONSULTATION · REF {state.appointmentRef ?? "—"}</div>
          <div style={{ font: "700 22px var(--font-family)", marginTop: 4 }}>{fmt(s?.startsAt)}</div>
          {d && <div style={{ fontSize: 14, color: "#bfd8ee", marginTop: 4 }}>{d.name} · {d.specialty}</div>}
        </div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)", marginBottom: 10 }}>What happens next</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 15, color: "#3a4453" }}>
            <li>Your appointment reference is <strong>{state.appointmentRef ?? "—"}</strong>. Keep it for your records.</li>
            <li>On the day, you'll confirm your identity, consents and device check before joining the video call.</li>
            <li>Your doctor will see the symptoms and medical history you shared.</li>
          </ul>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--color-muted)" }}>
        This is the end of the current booking flow. The consultation day experience (identity, consents, device check, and video call) is delivered separately.
      </p>
    </section>
  );
}