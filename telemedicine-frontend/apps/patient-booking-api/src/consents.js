// In-memory consent store for the consent centre (upcoming care).

const consents = new Map(
  [
    { id: "platform-tc", label: "Platform terms & conditions", description: "Required to use the telemedicine service.", granted: true },
    { id: "clinical-informed", label: "Clinical informed consent", description: "You agree to receive care via video consultation.", granted: true },
    { id: "data-sharing", label: "Share data for this episode", description: "Share your symptoms and history with the treating doctor.", granted: true },
  ].map((c) => [c.id, c]),
);

export function getConsents() {
  return [...consents.values()];
}

export function setConsent(id, granted) {
  const c = consents.get(id);
  if (!c) return null;
  c.granted = Boolean(granted);
  consents.set(id, c);
  return c;
}