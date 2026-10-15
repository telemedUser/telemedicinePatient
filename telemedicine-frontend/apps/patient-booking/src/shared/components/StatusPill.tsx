export type PillTone = "neutral" | "info" | "success" | "danger" | "warning";

const TONE: Record<PillTone, { bg: string; fg: string; icon: string }> = {
  neutral: { bg: "#eef0f2", fg: "#3a4453", icon: "•" },
  info: { bg: "var(--color-tint)", fg: "#0068ac", icon: "ⓘ" },
  success: { bg: "#e6f4ea", fg: "var(--color-success)", icon: "✓" },
  danger: { bg: "#fdecec", fg: "var(--color-danger-text)", icon: "⚠" },
  warning: { bg: "#fdf3e6", fg: "var(--color-warning)", icon: "⚠" },
};

export function StatusPill({
  tone = "neutral",
  label,
}: {
  tone?: PillTone;
  label: string;
}) {
  const t = TONE[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px",
        borderRadius: "var(--radius-pill)",
        background: t.bg,
        color: t.fg,
        font: "600 13px var(--font-family)",
      }}
    >
      <span aria-hidden="true">{t.icon}</span>
      {label}
    </span>
  );
}
