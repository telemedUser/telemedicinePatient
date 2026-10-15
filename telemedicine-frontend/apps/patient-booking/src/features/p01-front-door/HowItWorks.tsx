interface Step {
  n: number;
  icon: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  { n: 1, icon: "📝", title: "Tell us what's wrong", text: "Describe your symptoms in a few words." },
  { n: 2, icon: "🩺", title: "Match with a doctor", text: "We find an available doctor for you." },
  { n: 3, icon: "🎥", title: "Join the video call", text: "Speak with your doctor from anywhere." },
  { n: 4, icon: "💊", title: "Get your plan", text: "Receive prescriptions and documents online." },
];

export function HowItWorks() {
  return (
    <div>
      <h2 style={{ fontSize: "clamp(22px,1.2cqi + 16px,30px)", color: "var(--color-heading)", margin: "0 0 6px" }}>
        How it works
      </h2>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 24px" }}>
        From first symptom to prescription, in four steps.
      </p>
      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 12,
        }}
      >
        {STEPS.map((s) => (
          <li key={s.n} className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span aria-hidden="true" style={{ fontSize: 28 }}>
                {s.icon}
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--color-heading)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  font: "700 14px var(--font-family)",
                }}
              >
                {s.n}
              </span>
            </div>
            <div style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)" }}>
              {s.title}
            </div>
            <div style={{ fontSize: 14, color: "#3a4453" }}>{s.text}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
