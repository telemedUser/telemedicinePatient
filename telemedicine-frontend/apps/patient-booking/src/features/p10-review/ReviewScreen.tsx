import { useEffect, useRef, useState } from "react";
import { Download, Eye } from "lucide-react";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import { buildPdf, downloadPdf, viewPdf, type PdfLine } from "@/shared/pdf/buildPdf";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

/** "Fri 11 Sep 2026, 16:40-16:55" from an ISO start + duration minutes. */
function whenLabel(iso?: string, durationMin = 15): string {
  if (!iso) return "—";
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return iso;
  const end = new Date(start.getTime() + durationMin * 60000);
  const date = start.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${t(start)}\u2013${t(end)}`;
}
function openLabel(iso?: string): string {
  if (!iso) return "";
  const open = new Date(new Date(iso).getTime() - 30 * 60000);
  return open.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface ConsentDoc {
  id: string;
  title: string;
  desc: string;
  filename: string;
  body: string[];
}

const CONSENTS: ConsentDoc[] = [
  {
    id: "platform",
    title: "Platform terms v3.1",
    desc: "How the service works, payments and refunds.",
    filename: "platform-terms-v3.1",
    body: [
      "These terms govern your use of the Connected Care telemedicine platform.",
      "Bookings are confirmed once payment is authorised. Fees and any insurance voucher are shown before you pay; nothing is charged until you confirm.",
      "You may reschedule or cancel up until the consultation starts. Refunds for eligible cancellations are returned to the original payment method.",
      "The platform connects you with a licensed physician for a remote consultation. It is not a substitute for emergency care — in an emergency, call your local emergency number.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy notice v2.4",
    desc: "What we store, for how long, and your rights.",
    filename: "privacy-notice-v2.4",
    body: [
      "This notice explains how Connected Care processes your personal and health data.",
      "We store the information you provide for a consultation (symptoms, history, documents) and the records a physician creates (notes, prescriptions, certificates) for the retention period required by applicable healthcare regulations.",
      "Your data is used to deliver care, process payments and meet legal obligations. It is not sold. Access is limited to your care team and authorised staff.",
      "You have the right to access, correct, and request deletion of your data, and to withdraw consent at any time from the Consent centre.",
    ],
  },
  {
    id: "clinical",
    title: "Clinical informed consent for virtual care v1.3",
    desc: "Limits of remote care; withdraw at any time.",
    filename: "clinical-consent-v1.3",
    body: [
      "You are consenting to a clinical consultation delivered over video or audio.",
      "Remote care has limitations: the physician cannot physically examine you, and some conditions may require an in-person visit, tests, or referral. The physician will tell you if remote care is not appropriate.",
      "A clinical record, and where relevant a prescription, medical certificate or referral, may be produced and shared with you and the relevant systems.",
      "You may withdraw this consent at any time; doing so during a call will end the consultation.",
    ],
  },
  {
    id: "eligibility",
    title: "Share eligibility data for your insurance voucher",
    desc: "Needed to apply your voucher to this booking.",
    filename: "eligibility-data-sharing",
    body: [
      "To apply an insurance voucher to this booking, Connected Care needs to share limited eligibility data with your insurer or scheme.",
      "The data shared is restricted to what is necessary to validate the voucher (policy reference, eligibility status and the booking amount). No clinical details are shared for this purpose.",
      "If you do not consent, you can still book and pay the full fee without the voucher.",
    ],
  },
];
const HOLD_SECONDS = 9 * 60 + 16;

/** Build a consent document PDF (A4) from its title + body paragraphs. */
function buildConsentPdf(c: ConsentDoc): Blob {
  const lines: PdfLine[] = [
    { text: "Connected Care", style: "heading" },
    { text: c.title, style: "title" },
    { text: c.desc, style: "muted" },
    { style: "rule" },
    ...c.body.flatMap((p): PdfLine[] => [{ text: p, style: "normal" }, { style: "spacer" }]),
    { style: "rule" },
    { text: "This is a sample consent document for the Connected Care demo.", style: "muted" },
  ];
  return buildPdf(lines);
}

/** Open the consent document in a new browser tab (view). */
function viewConsent(c: ConsentDoc): void {
  viewPdf(buildConsentPdf(c));
}

/** Download the consent document as a .pdf file. */
function downloadConsent(c: ConsentDoc): void {
  downloadPdf(buildConsentPdf(c), c.filename);
}

export function ReviewScreen() {
  useStepMark("P-10");
  const { state } = useBooking();
  const { goBack, goTo } = useWizard();
  const d = state.selectedDoctor;
  const s = state.selectedSlot;
  const q = state.coverQuote;
  const mode = state.selectedMode ?? s?.mode ?? d?.mode ?? "video";
  const durationMin = d?.durationMin ?? 15;

  const fee = q?.consultationFee ?? q?.feeClp ?? d?.priceClp ?? 0;
  const voucher = q?.voucher ?? 0;
  const total = q?.total ?? Math.max(0, fee - voucher);

  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const agreedCount = CONSENTS.filter((c) => agreed[c.id]).length;
  const allAgreed = agreedCount === CONSENTS.length;

  const [remaining, setRemaining] = useState(HOLD_SECONDS);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timer.current = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);
  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  function toggleAll() {
    const next = !allAgreed;
    setAgreed(Object.fromEntries(CONSENTS.map((c) => [c.id, next])));
  }

  function initials(name?: string) {
    return (name ?? "").replace(/^(Dr\.?|Dra\.?)\s*/i, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  }

  return (
    <section data-screen="P-10" style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(20px,4cqi,48px) 20px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
        <h1 className="pb-h1" style={{ margin: 0 }}>Review and confirm</h1>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--color-success)", background: "#e3f4ea", padding: "5px 12px", borderRadius: 999 }}>
          &#128274; Slot held &middot; {mmss}
        </span>
      </div>

      {/* Summary card */}
      <div className="pb-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid var(--color-border)" }}>
          <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 14px var(--font-family)" }}>
            {initials(d?.name)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)" }}>{d?.name ?? "—"}</div>
            <div style={{ fontSize: 13, color: "var(--color-muted)" }}>{d?.specialty}{d?.clinic ? ` · ${d.clinic}` : ""}</div>
          </div>
          <button type="button" aria-label="Edit booking" onClick={() => goTo("P-08")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)" }}>&#9998;</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0 }}>
          <MetaCell label="When" lines={[whenLabel(s?.startsAt, durationMin), `${durationMin}-min consultation`]} />
          <MetaCell label="How" lines={[`${mode === "audio" ? "Audio" : "Video"} consultation`, `Link opens 30 min before · free to change until ${openLabel(s?.startsAt)}`]} icon={mode === "audio" ? "\uD83D\uDCDE" : "\uD83D\uDCF9"} />
          <MetaCell label="Cover" lines={["Insurance voucher applied", voucher > 0 ? `${inr(voucher)} off${q?.voucherRef ? ` · ref ${q.voucherRef}` : ""}` : "No voucher"]} />
          <MetaCell label="You pay" lines={[inr(total), voucher > 0 ? `${inr(fee)} fee − ${inr(voucher)} voucher` : `${inr(fee)} fee`]} highlight big />
        </div>
      </div>

      {/* Booking notifications */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 6px" }}>
        <h2 style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)", margin: 0 }}>Booking notifications</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 10px" }}>Confirmation, reminders and your join link go here.</p>
      <div className="pb-card" style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true">&#128172;</span>
          <span><span style={{ display: "block", font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>+91 98765 43210</span><span style={{ fontSize: 12, color: "var(--color-muted)" }}>SMS and WhatsApp</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true">&#9993;&#65039;</span>
          <span><span style={{ display: "block", font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>{state.careSubject?.name ? "priya.sharma@example.in" : "you@example.in"}</span><span style={{ fontSize: 12, color: "var(--color-muted)" }}>Email</span></span>
        </div>
      </div>

      {/* Consents */}
      <h2 style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)", margin: "0 0 6px" }}>Your consents</h2>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 10px" }}>Each consent is recorded with its version and time. You can withdraw any of them later in your Consent centre.</p>
      <div className="pb-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--color-border)", background: "#f6f8fa", cursor: "pointer" }}>
          <input type="checkbox" checked={allAgreed} onChange={toggleAll} style={{ width: 18, height: 18 }} />
          <span style={{ flex: 1, font: "700 15px var(--font-family)", color: "var(--color-heading)" }}>I agree to all</span>
          <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{agreedCount} of {CONSENTS.length}</span>
        </label>
        {CONSENTS.map((c) => (
          <label key={c.id} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}>
            <input type="checkbox" checked={!!agreed[c.id]} onChange={(e) => setAgreed((a) => ({ ...a, [c.id]: e.target.checked }))} style={{ width: 18, height: 18, marginTop: 2 }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>{c.title}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--color-muted)" }}>{c.desc}</span>
            </span>
            <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                aria-label={`View ${c.title}`}
                title="View document (opens in a new tab)"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewConsent(c); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", font: "600 12px var(--font-family)", padding: "4px 6px" }}
              >
                <Eye size={16} /> View
              </button>
              <button
                type="button"
                aria-label={`Download ${c.title}`}
                title="Download document (PDF)"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadConsent(c); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", font: "600 12px var(--font-family)", padding: "4px 6px" }}
              >
                <Download size={16} /> PDF
              </button>
            </span>
          </label>
        ))}
      </div>

      <button type="button" className="pb-btn pb-btn-primary" disabled={!allAgreed} onClick={() => goTo("P-11")} style={{ width: "100%", minHeight: 52 }}>
        Confirm and pay {inr(total)}
      </button>
      <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)", width: "100%", marginTop: 8 }}>Back</button>
    </section>
  );
}

function MetaCell({ label, lines, icon, highlight, big }: { label: string; lines: string[]; icon?: string; highlight?: boolean; big?: boolean }) {
  return (
    <div style={{ padding: "14px 18px", borderTop: "1px solid var(--color-border)", background: highlight ? "var(--color-tint)" : "transparent" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ font: `700 ${big ? 20 : 15}px var(--font-family)`, color: "var(--color-heading)", display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span aria-hidden="true" style={{ fontSize: 15 }}>{icon}</span>}{lines[0]}
      </div>
      {lines[1] && <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 3 }}>{lines[1]}</div>}
    </div>
  );
}
