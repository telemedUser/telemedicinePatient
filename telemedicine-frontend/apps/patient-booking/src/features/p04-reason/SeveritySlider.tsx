import { severityWord, clampSeverity } from "@/shared/state/severity";

export function SeveritySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const word = severityWord(value);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(clampSeverity(value + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clampSeverity(value - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(10);
    }
  }

  return (
    <div>
      <label
        htmlFor="severity"
        style={{ display: "flex", justifyContent: "space-between", font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 8 }}
      >
        How bad is it?
        <span style={{ color: "#0068ac" }}>
          <span data-testid="severity-word">{word}</span>{" "}
          <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>{value}/10</span>
        </span>
      </label>
      <input
        id="severity"
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        aria-label="How bad is it?"
        aria-valuenow={value}
        aria-valuetext={`${value} of 10, ${word}`}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(clampSeverity(Number(e.target.value)))}
        style={{ width: "100%", accentColor: "var(--color-primary)", height: 44 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-muted)" }}>
        <span>Barely notice it</span>
        <span>Worst imaginable</span>
      </div>
    </div>
  );
}