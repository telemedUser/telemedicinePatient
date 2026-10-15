import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useBooking } from "@/shared/state/BookingProvider";
import { stepUrl } from "@/shared/wizard/useWizard";

type Requirement = "authenticated" | "careSubject" | "doctorSlot" | "appointment";

export function JourneyGuard({
  requires,
  children,
}: {
  requires: Requirement[];
  children: ReactNode;
}) {
  const { state } = useBooking();

  if (requires.includes("authenticated") && state.auth.status !== "authenticated") {
    return <Navigate to={stepUrl("P-01")} replace />;
  }
  if (requires.includes("careSubject") && !state.careSubject) {
    return <Navigate to={stepUrl("P-01")} replace />;
  }
  if (requires.includes("doctorSlot") && (!state.selectedDoctor || !state.selectedSlot)) {
    return <Navigate to={stepUrl("P-07")} replace />;
  }
  if (requires.includes("appointment") && !state.appointmentRef) {
    return <Navigate to={stepUrl("P-10")} replace />;
  }
  return <>{children}</>;
}