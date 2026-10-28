import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/shared/i18n/i18n";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useBooking } from "@/shared/state/BookingProvider";

function initialsOf(name: string | null): string {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function BookingChrome({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { state } = useBooking();
  const navigate = useNavigate();
  const authed = state.auth.status === "authenticated";
  const initials = authed
    ? initialsOf(state.careSubject?.name ?? "Valentina Rojas")
    : "";

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "#fff",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div
          className="pb-chrome-bar"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 20px",
            minHeight: 64,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <strong style={{ color: "var(--color-primary)", fontSize: 20 }}>{t("app.title")}</strong>
          <div className="pb-chrome-spacer" style={{ flex: 1 }} />
          {authed && (
            <nav aria-label="Main" className="pb-chrome-nav" style={{ display: "flex", gap: 8 }}>
              <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(BASE_PATH + "/home")}>
                {t("nav.myCare")}
              </button>
              <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(BASE_PATH + "/help")}>
                {t("nav.help")}
              </button>
            </nav>
          )}
          {authed && (
            <div
              aria-label="Signed in"
              title="Signed in"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--color-tint)",
                color: "#0068ac",
                display: "grid",
                placeItems: "center",
                font: "700 14px var(--font-family)",
                border: "1.5px solid #cfe4f3",
              }}
            >
              {initials}
            </div>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
