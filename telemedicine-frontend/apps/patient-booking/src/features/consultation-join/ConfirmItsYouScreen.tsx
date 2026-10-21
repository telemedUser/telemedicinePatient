import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { ConsultStepper } from "./ConsultStepper";

export function ConfirmItsYouScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state } = useBooking();
  const ref = params.get("ref") || state.appointmentRef || "CONS-DEMO";

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    void apiFetch(`/consultations/${ref}/otp/send`, { method: "POST" })
      .then((r) => r.json())
      .then((d: { demoCode?: string }) => setDemoCode(d.demoCode ?? null))
      .catch(() => {});
  }, [ref]);

  function setDigit(i: number, v: string) {
    const ch = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    setError(false);
    if (ch && i < 5) inputs.current[i + 1]?.focus();
  }
  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  async function verify() {
    const code = digits.join("");
    if (code.length < 6) { setError(true); return; }
    setBusy(true);
    try {
      const res = await apiFetch(`/consultations/${ref}/otp/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error();
      navigate(`${BASE_PATH}/join/consents?ref=${encodeURIComponent(ref)}`);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  async function resend() {
    const r = await apiFetch(`/consultations/${ref}/otp/send`, { method: "POST" }).then((x) => x.json()).catch(() => null);
    if (r?.demoCode) setDemoCode(r.demoCode);
  }

  return (
    <section data-screen="P-14" style={{ padding: "clamp(16px,3cqi,40px) 0 48px" }}>
      <ConsultStepper current={0} />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 20px" }}>
        <h1 className="pb-h1" style={{ marginTop: 8 }}>Confirm it's you</h1>
        <div className="pb-card" style={{ marginTop: 12 }}>
          <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 10 }}>Verification code</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            {digits.map((val, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                inputMode="numeric"
                maxLength={1}
                value={val}
                aria-label={`Digit ${i + 1}`}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                style={{ width: 44, height: 52, textAlign: "center", font: "700 20px var(--font-family)", border: `1.5px solid ${error ? "#d9534f" : "#c9d0d8"}`, borderRadius: 12, marginLeft: i === 3 ? 12 : 0 }}
              />
            ))}
          </div>
          <button type="button" className="pb-btn pb-btn-primary" onClick={verify} disabled={busy} style={{ width: "100%", minHeight: 52 }}>
            {busy ? "Verifying…" : "Verify"}
          </button>
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 14, color: "var(--color-muted)" }}>
            Didn't get it? <button type="button" onClick={resend} style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer" }}>Resend code</button>
          </div>
          {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 13, textAlign: "center", marginTop: 8 }}>That code doesn't match. Try again.</p>}
        </div>
        {demoCode && (
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 12 }}>
            Demo code is {demoCode.slice(0, 3)} {demoCode.slice(3)}
          </p>
        )}
      </div>
    </section>
  );
}
