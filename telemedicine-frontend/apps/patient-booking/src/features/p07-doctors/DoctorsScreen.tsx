import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Doctor } from "@/shared/types/booking";

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

export function DoctorsScreen() {
  useStepMark("P-07");
  const { state, update } = useBooking();
  const { goBack, goTo } = useWizard();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState(state.specialtyFilter);
  const [sort, setSort] = useState("recommended");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetch("/specialties").then((r) => r.json()).then((d: { specialties: string[] }) => setSpecialties(d.specialties)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (specialty && specialty !== "all") qs.set("specialty", specialty);
    // "recommended" is a client-side sort; send a neutral server sort.
    if (sort && sort !== "recommended") qs.set("sort", sort);
    void apiFetch(`/doctors?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: { doctors: Doctor[] }) => setDoctors(d.doctors))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [specialty, sort]);

  const visible = useMemo(() => {
    let rows = [...doctors];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          (d.treats ?? "").toLowerCase().includes(q),
      );
    }
    if (sort === "recommended") {
      rows.sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.rating - a.rating);
    }
    return rows;
  }, [doctors, query, sort]);

  function pick(doctor: Doctor) {
    update({ selectedDoctor: doctor, specialtyFilter: specialty });
    goTo("P-08");
  }

  const sortLabel: Record<string, string> = {
    recommended: "Recommended",
    rating: "Highest rated",
    price: "Lowest price",
    availability: "Soonest available",
  };

  return (
    <section data-screen="P-07" style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Doctors available</h1>

      {/* Search + Filters + Sort toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "4px 0 10px" }}>
        <div style={{ flex: "1 1 320px", display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 14px", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 999 }}>
          <span aria-hidden="true" style={{ color: "var(--color-muted)" }}>&#128269;</span>
          <input
            aria-label="Search by doctor, specialty or symptom"
            placeholder="Search by doctor, specialty or symptom"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", font: "15px var(--font-family)", background: "transparent" }}
          />
        </div>
        <button type="button" onClick={() => setShowFilters((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 16px", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 999, font: "600 14px var(--font-family)", color: "var(--color-heading)", cursor: "pointer" }}>
          &#9881; Filters
        </button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 14px", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 999 }}>
          <span aria-hidden="true" style={{ color: "var(--color-muted)" }}>&#8645;</span>
          <select aria-label="Sort doctors" value={sort} onChange={(e) => setSort(e.target.value)} style={{ border: "none", outline: "none", font: "600 14px var(--font-family)", color: "var(--color-heading)", background: "transparent", cursor: "pointer" }}>
            {Object.entries(sortLabel).map(([v, label]) => (<option key={v} value={v}>{label}</option>))}
          </select>
        </label>
      </div>

      {showFilters && (
        <div className="pb-card" style={{ padding: 14, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px var(--font-family)", color: "var(--color-muted)" }}>
            Specialty
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={{ minHeight: 38, padding: "0 10px", border: "1px solid #c9d0d8", borderRadius: 10, font: "14px var(--font-family)" }}>
              <option value="all">All specialties</option>
              {specialties.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </label>
        </div>
      )}

      <div style={{ fontSize: 14, color: "var(--color-muted)", margin: "0 0 14px" }}>
        {loading ? "Loading…" : `${visible.length} doctors`}
        {sort === "recommended" && !loading ? " · Recommended first" : ""}
      </div>

      {!loading && visible.length === 0 && (
        <p className="pb-card" style={{ color: "#3a4453" }}>No doctors match your search. Try a different term or specialty.</p>
      )}

      {!loading && visible.length > 0 && (
        <ul aria-label="Available doctors" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {visible.map((d) => (
            <li
              key={d.id}
              className="pb-card"
              style={{ padding: 0, overflow: "hidden", border: `1.5px solid ${d.recommended ? "var(--color-primary)" : "var(--color-border)"}` }}
            >
              <div style={{ display: "flex", gap: 14, padding: "16px 18px" }}>
                <span aria-hidden="true" style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 15px var(--font-family)" }}>
                  {initials(d.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {d.recommended && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "600 13px var(--font-family)", color: "var(--color-primary)", marginBottom: 4 }}>
                      <span aria-hidden="true">&#9733;</span> Recommended for you
                    </div>
                  )}
                  <div style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)" }}>{d.name}</div>
                  <div style={{ fontSize: 14, color: "var(--color-muted)", marginTop: 2 }}>
                    {d.specialty}{d.yearsExperience ? ` · ${d.yearsExperience} yrs experience` : ""}
                  </div>
                  {d.treats && (
                    <div style={{ fontSize: 14, color: "var(--color-text)", marginTop: 6 }}>Treats {d.treats}</div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--color-muted)", marginTop: 8 }}>
                    <span>&#9733; {d.rating.toFixed(1)}{d.reviews ? ` · ${d.reviews} reviews` : ""}</span>
                    {languageList(d.languages) && <span>&#127760; {languageList(d.languages)}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "12px 18px", borderTop: "1px solid var(--color-border)", background: "#fafbfc" }}>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 12, color: "var(--color-muted)" }}>Next available</div>
                  <div style={{ font: "700 14px var(--font-family)", color: "var(--color-success)" }}>{d.nextAvailability}</div>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                    {d.inNetwork ? "\u2713 In network · you pay \u2248" : "You pay \u2248"}
                  </div>
                  <div style={{ font: "700 14px var(--font-family)", color: "var(--color-heading)" }}>{inr(d.priceClp)}</div>
                </div>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  className={d.recommended ? "pb-btn pb-btn-primary" : "pb-btn pb-btn-secondary"}
                  onClick={() => pick(d)}
                  style={{ minHeight: 44 }}
                >
                  See profile and times
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>Back</button>
      </div>

      <div role="note" style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fdf0f0", border: "1px solid #f3c7c7", borderRadius: 14, padding: "14px 16px", marginTop: 16 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 36, height: 36, borderRadius: "50%", background: "var(--color-danger)", color: "#fff", display: "grid", placeItems: "center" }}>!</span>
        <div style={{ fontSize: 15, color: "var(--color-text)" }}><strong style={{ color: "var(--color-danger-text)" }}>Emergency?</strong> Call <a href="tel:112" style={{ fontWeight: 700, color: "var(--color-danger-text)" }}>112</a>.</div>
      </div>
    </section>
  );
}
