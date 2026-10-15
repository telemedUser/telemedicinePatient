import { WIZARD_ORDER, type WizardStep } from "@/shared/types/booking";

export function stepIndex(step: WizardStep): number {
  return WIZARD_ORDER.indexOf(step);
}

export function furthestOf(a: WizardStep, b: WizardStep): WizardStep {
  return stepIndex(a) >= stepIndex(b) ? a : b;
}

export function nextStep(step: WizardStep): WizardStep {
  const i = stepIndex(step);
  return i < WIZARD_ORDER.length - 1 ? WIZARD_ORDER[i + 1] : step;
}

export function prevStep(step: WizardStep): WizardStep {
  const i = stepIndex(step);
  return i > 0 ? WIZARD_ORDER[i - 1] : step;
}

export interface StepState {
  current: WizardStep;
  furthest: WizardStep;
}

export function advance(s: StepState): StepState {
  const current = nextStep(s.current);
  return { current, furthest: furthestOf(s.furthest, current) };
}

export function retreat(s: StepState): StepState {
  const current = prevStep(s.current);
  return { current, furthest: s.furthest };
}

export function jumpTo(s: StepState, target: WizardStep): StepState {
  return { current: target, furthest: furthestOf(s.furthest, target) };
}
