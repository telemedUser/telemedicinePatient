export interface CareSubjectOption {
  id: string;
  title: string;
  subtitle: string;
  initials: string;
  disabled: boolean;
}

export function CareSubjectCard({
  option,
  selected,
  onSelect,
}: {
  option: CareSubjectOption;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={option.disabled}
      disabled={option.disabled}
      onClick={() => !option.disabled && onSelect(option.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 16,
        background: selected ? "var(--color-tint)" : "#fff",
        border: `2px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
        cursor: option.disabled ? "not-allowed" : "pointer",
        opacity: option.disabled ? 0.55 : 1,
        width: "100%",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--color-tint)",
          color: "#0068ac",
          display: "grid",
          placeItems: "center",
          font: "700 15px var(--font-family)",
        }}
      >
        {option.initials}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", font: "600 17px var(--font-family)", color: "var(--color-heading)" }}>
          {option.title}
        </span>
        <span style={{ display: "block", fontSize: 14, color: "var(--color-muted)", marginTop: 2 }}>
          {option.subtitle}
        </span>
      </span>
    </button>
  );
}
