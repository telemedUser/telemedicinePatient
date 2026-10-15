import { useState, type FormEvent } from "react";
import { authApi } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import { useSignInAttempts } from "./useSignInAttempts";
import { NoRecordBranch } from "./NoRecordBranch";

export function SignInScreen() {
  useStepMark("P-02");
  const { update } = useBooking();
  const { goNext } = useWizard();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [badCreds, setBadCreds] = useState(false);
  const [noRecord, setNoRecord] = useState(false);
  const attempts = useSignInAttempts(email);

  async function onAuthenticated(userId: string, hasRecord: boolean) {
    attempts.succeed();
    if (!hasRecord) {
      setNoRecord(true);
      authApi.signOut();
      return;
    }
    update({ auth: { status: "authenticated", userId } });
    goNext();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (attempts.locked) return;
    const res = await authApi.signIn({ email, password });
    if (!res.ok) {
      attempts.fail();
      setBadCreds(true);
      return;
    }
    setBadCreds(false);
    await onAuthenticated(res.userId!, res.hasRecord);
  }

  async function handleClaveUnica() {
    const res = await authApi.signInWithClaveUnica();
    if (res.ok) await onAuthenticated(res.userId!, res.hasRecord);
  }

  if (noRecord) {
    return (
      <section data-screen="P-02" style={wrap}>
        <NoRecordBranch
          onTryAnother={() => {
            setNoRecord(false);
            setEmail("");
            setPassword("");
          }}
        />
      </section>
    );
  }

  return (
    <section data-screen="P-02" style={wrap}>
      <h1 className="pb-h1">Sign in to continue</h1>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 24px" }}>
        Use your account so we can find your record and cover.
      </p>
      <form onSubmit={handleSubmit} noValidate className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {badCreds && (
          <div role="alert" style={alertStyle}>
            <strong style={{ display: "block", color: "#b3261e" }}>
              Email or password doesn't match
            </strong>
            {attempts.attemptLabel
              ? `${attempts.attemptLabel} — after 5 we'll pause sign-in for 15 minutes.`
              : "Check both and try again."}
          </div>
        )}
        {attempts.locked && (
          <div role="alert" style={alertStyle}>
            <strong style={{ display: "block", color: "#b3261e" }}>
              Sign-in paused
            </strong>
            Too many attempts. Please wait 15 minutes before trying again.
          </div>
        )}
        <label style={labelStyle}>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            aria-invalid={badCreds}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={badCreds}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        <button type="button" style={linkBtn}>
          Forgot your password?
        </button>
        <button type="submit" className="pb-btn pb-btn-primary" disabled={attempts.locked} style={{ minHeight: 52 }}>
          Sign in
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8a94a0", fontSize: 13 }}>
          <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          or
          <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </div>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={handleClaveUnica} style={{ minHeight: 52 }}>
          Continue with ClaveÚnica
        </button>
      </form>
    </section>
  );
}

const wrap = { maxWidth: 520, margin: "0 auto", padding: "clamp(24px,5cqi,64px) 20px 48px" } as const;
const labelStyle = { display: "flex", flexDirection: "column", gap: 6, font: "600 14px var(--font-family)", color: "var(--color-heading)" } as const;
const inputStyle = { width: "100%", minHeight: 48, padding: "12px 14px", border: "1.5px solid #c9d0d8", borderRadius: 12, font: "16px var(--font-family)", boxSizing: "border-box" } as const;
const alertStyle = { padding: "12px 14px", borderRadius: 12, background: "#fdecec", border: "1px solid #f3b8b8", fontSize: 14 } as const;
const linkBtn = { alignSelf: "flex-start", border: 0, background: "transparent", padding: 0, color: "var(--color-primary)", font: "600 14px var(--font-family)", cursor: "pointer", textDecoration: "underline" } as const;
