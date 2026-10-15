export function AddMissingField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <label htmlFor="add-missing" style={{ display: "block", font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 6 }}>
        Add anything missing
      </label>
      <textarea
        id="add-missing"
        rows={3}
        maxLength={2000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Other conditions, medicines or allergies the doctor should know about"
        style={{ width: "100%", minHeight: 80, padding: 12, border: "1.5px solid #c9d0d8", borderRadius: 14, font: "16px var(--font-family)", boxSizing: "border-box" }}
      />
    </div>
  );
}
