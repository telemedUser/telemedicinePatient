import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { STEP_PATHS, type WizardStep } from "@/shared/types/booking";
import { useBooking } from "@/shared/state/BookingProvider";
import { advance, retreat, jumpTo, type StepState } from "./transitions";

export const BASE_PATH = import.meta.env.VITE_BOOKING_BASE_PATH ?? "/booking";

export function stepUrl(step: WizardStep): string {
  return `${BASE_PATH}/${STEP_PATHS[step]}`;
}

export interface Wizard {
  current: WizardStep;
  furthest: WizardStep;
  goNext: () => void;
  goBack: () => void;
  skip: (clear?: () => void) => void;
  goTo: (step: WizardStep) => void;
}

export function useWizard(): Wizard {
  const { state, update } = useBooking();
  const navigate = useNavigate();

  const applyAndNavigate = useCallback(
    (next: StepState) => {
      update({ currentStep: next.current, furthestStep: next.furthest });
      navigate(stepUrl(next.current));
    },
    [navigate, update],
  );

  const cur: StepState = {
    current: state.currentStep,
    furthest: state.furthestStep,
  };

  return {
    current: state.currentStep,
    furthest: state.furthestStep,
    goNext: () => applyAndNavigate(advance(cur)),
    goBack: () => applyAndNavigate(retreat(cur)),
    skip: (clear) => {
      clear?.();
      applyAndNavigate(advance(cur));
    },
    goTo: (step) => applyAndNavigate(jumpTo(cur, step)),
  };
}
