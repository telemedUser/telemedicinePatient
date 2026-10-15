import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Doctor } from "@/shared/types/booking";

function clp(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export function DoctorsScreen() {
  useStepMark("P-07");
  const { state, update } = useBooking();
  const { goBack, goTo } = useWizard();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState(state.specialtyFilter);
  const [sort, setSort] = useState("rating");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetch("/specialties").then((r) => r.json()).then((d: { specialties: string[] }) => setSpecialties(d.specialties)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (specialty && specialty !== "all") qs.set("specialty", specialty);
    if (sort) qs.set("sort", sort);
    void apiFetch(`/doctors?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: { doctors: Doctor[] }) => setDoctors(d.doctors))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [specialty, sort]);

  function pick(doctor: Doctor) {
    update({ selectedDoctor: doctor, specialtyFilter: specialty });
    goTo("P-08");
  }

  return (
    <section data-screen="P-07" style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Doctors available</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "0 0 16px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, font: "600 13px var(--font-family)", color: "var(--color-muted)" }}>
          Specialty
          <select value={specialty} onChange={(ev) => setSpecialty(ev.target.value)} style={{ minHeight: 44, padding: "0 12px", border: "1.5px solid #c9d0d8", borderRadius: 12, font: "15px var(--font-family)" }}>
            <option value="all">All specialties</option>
            {specialties.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, font: "600 13px var(--font-family)", color: "var(--color-muted)" }}>
          Sort by
          <select value={sort} onChange={(ev) => setSort(ev.target.value)} style={{ minHeight: 44, padding: "0 12px", border: "1.5px solid #c9d0d8", borderRadius: 12, font: "15px var(--font-family)" }}>
            <option value="rating">Highest rated</option>
            <option value="price">Lowest price</option>
            <option value="availability">Soonest available</option>
          </select>
        </label>
      </div>

      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Loading doctors…</p>}

      {!loading && doctors.length === 0 && (
        <p className="pb-card" style={{ color: "#3a4453" }}>No doctors match your filters. Try a different specialty.</p>
      )}

      {!loading && doctors.length > 0 && (
        <ul aria-label="Available doctors" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {doctors.map((d) => (
            <li key={d.id} className="pb-card" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
              <span aria-hidden="true" style={{ flex: "none", width: 52, height: 52, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 16px var(--font-family)" }}>
                {d.name.split(" ").filter((p) => !p.endsWith(".")).slice(0, 2).map((p) => p[0]).join("")}
              </span>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)" }}>{d.name}</div>
                <div style={{ fontSize: 14, color: "var(--color-muted)" }}>{d.specialty} · ★ {d.rating.toFixed(1)} · {d.nextAvailability} · {d.mode}</div>
              </div>
              <div style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)" }}>{clp(d.priceClp)}</div>
              <button type="button" className="pb-btn pb-btn-primary" onClick={() => pick(d)} style={{ minHeight: 44 }}>Select</button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>Back</button>
      </div>

      <div role="note" style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fdf0f0", border: "1px solid #f3c7c7", borderRadius: 14, padding: "14px 16px", marginTop: 16 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 36, height: 36, borderRadius: "50%", background: "var(--color-danger)", color: "#fff", display: "grid", placeItems: "center" }}>!</span>
        <div style={{ fontSize: 15, color: "var(--color-text)" }}><strong style={{ color: "var(--color-danger-text)" }}>Emergency?</strong> Call <a href="tel:131" style={{ fontWeight: 700, color: "var(--color-danger-text)" }}>131 (SAMU)</a>.</div>
      </div>
    </section>
  );
}