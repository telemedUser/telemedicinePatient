import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

async function bootstrap() {
  // Mocks are opt-in. By default the app talks to the real backend
  // (proxied by Vite at /api). Set VITE_USE_MOCKS=true to use MSW instead.
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") {
    const { startMockWorker } = await import("@/shared/mocks/browser");
    await startMockWorker();
  }
  const el = document.getElementById("root");
  if (!el) throw new Error("Root element #root not found");
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();