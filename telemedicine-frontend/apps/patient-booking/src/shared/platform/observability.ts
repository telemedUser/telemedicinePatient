import type { ObservabilityApi } from "./types";
import type { WizardStep } from "@/shared/types/booking";

const DEV = import.meta.env.VITE_OBSERVABILITY_MODE === "dev";

export const observability: ObservabilityApi = {
  reportError(error: unknown, context?: Record<string, unknown>): void {
    if (DEV) {
      // eslint-disable-next-line no-console
      console.error("[observability] error", error, context ?? {});
      return;
    }
    // In non-dev this would POST to monitoring-service; out of scope here.
  },
  mark(step: WizardStep): void {
    if (DEV) {
      // eslint-disable-next-line no-console
      console.info("[observability] journey mark", step, performance.now());
    }
  },
};
