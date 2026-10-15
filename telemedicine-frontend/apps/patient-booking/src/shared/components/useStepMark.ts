import { useEffect } from "react";
import { observability } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import type { WizardStep } from "@/shared/types/booking";

/** Records a journey timing mark and sets the current step on entry. */
export function useStepMark(step: WizardStep): void {
  const { state, update } = useBooking();
  useEffect(() => {
    observability.mark(step);
    if (state.currentStep !== step) {
      update({ currentStep: step });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
}
