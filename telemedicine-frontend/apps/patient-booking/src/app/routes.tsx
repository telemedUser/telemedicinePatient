import { Navigate, Route, Routes } from "react-router-dom";
import { BASE_PATH, stepUrl } from "@/shared/wizard/useWizard";
import { BookingChrome } from "@/shared/components/BookingChrome";
import { DependentContextStrip } from "@/shared/components/DependentContextStrip";
import { JourneyGuard } from "./JourneyGuard";
import { FrontDoorScreen } from "@/features/p01-front-door/FrontDoorScreen";
import { SignInScreen } from "@/features/p02-sign-in/SignInScreen";
import { WhoNeedsCareScreen } from "@/features/p03-who-needs-care/WhoNeedsCareScreen";
import { ReasonScreen } from "@/features/p04-reason/ReasonScreen";
import { MedicalHistoryScreen } from "@/features/p05-medical-history/MedicalHistoryScreen";
import { TriageScreen } from "@/features/p06-triage/TriageScreen";
import { DoctorsScreen } from "@/features/p07-doctors/DoctorsScreen";
import { DoctorSlotScreen } from "@/features/p08-doctor-slot/DoctorSlotScreen";
import { CoverCostScreen } from "@/features/p09-cover/CoverCostScreen";
import { ReviewScreen } from "@/features/p10-review/ReviewScreen";
import { PaymentScreen } from "@/features/p11-payment/PaymentScreen";
import { ConfirmedScreen } from "@/features/p12-confirmed/ConfirmedScreen";
import { HomeScreen } from "@/features/p13-home/HomeScreen";
import { CancelScreen } from "@/features/p37-cancel/CancelScreen";
import { ConsentCentreScreen } from "@/features/p23-consent-centre/ConsentCentreScreen";
import { WelcomeBackScreen } from "@/features/p35-welcome-back/WelcomeBackScreen";
import { PastConsultationsScreen } from "@/features/p20-past-consultations/PastConsultationsScreen";
import { HelpScreen } from "@/features/p24-help/HelpScreen";
import { FindAppointmentScreen } from "@/features/p32-find-appointment/FindAppointmentScreen";
import { ConsultationLinkScreen } from "@/features/p33-consultation-link/ConsultationLinkScreen";
import { InvalidLinkScreen } from "@/features/p34-invalid-link/InvalidLinkScreen";
import { SlotReleasedScreen } from "@/features/p36-slot-released/SlotReleasedScreen";
import { AuthorityAttestationScreen } from "@/features/p27-authority/AuthorityAttestationScreen";
import { DependentReviewScreen } from "@/features/p28-dependent-review/DependentReviewScreen";
import { FollowUpBookedScreen } from "@/features/p29-follow-up-booked/FollowUpBookedScreen";
import { FollowUpWaitingScreen } from "@/features/p30-follow-up-waiting/FollowUpWaitingScreen";
import { FollowUpCompleteScreen } from "@/features/p31-follow-up-complete/FollowUpCompleteScreen";
import { WithdrawConsentScreen } from "@/features/p38-withdraw-consent/WithdrawConsentScreen";
import { ConsentWithdrawnEndedScreen } from "@/features/p39-consent-withdrawn-ended/ConsentWithdrawnEndedScreen";
import { ConsultationDayStub } from "@/features/consultation-day-stub/ConsultationDayStub";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <BookingChrome>
      <DependentContextStrip />
      {children}
    </BookingChrome>
  );
}

export function BookingRoutes() {
  const rel = (step: Parameters<typeof stepUrl>[0]) =>
    stepUrl(step).slice(BASE_PATH.length + 1);

  return (
    <Routes>
      <Route path={BASE_PATH}>
        <Route index element={<Navigate to={stepUrl("P-01")} replace />} />
        <Route path={rel("P-01")} element={<Shell><FrontDoorScreen /></Shell>} />
        <Route path={rel("P-02")} element={<Shell><SignInScreen /></Shell>} />
        <Route
          path={rel("P-03")}
          element={<JourneyGuard requires={["authenticated"]}><Shell><WhoNeedsCareScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-04")}
          element={<JourneyGuard requires={["authenticated", "careSubject"]}><Shell><ReasonScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-05")}
          element={<JourneyGuard requires={["authenticated", "careSubject"]}><Shell><MedicalHistoryScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-06")}
          element={<JourneyGuard requires={["authenticated", "careSubject"]}><Shell><TriageScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-07")}
          element={<JourneyGuard requires={["authenticated", "careSubject"]}><Shell><DoctorsScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-08")}
          element={<JourneyGuard requires={["authenticated", "careSubject", "doctorSlot"]}><Shell><DoctorSlotScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-09")}
          element={<JourneyGuard requires={["authenticated", "careSubject", "doctorSlot"]}><Shell><CoverCostScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-10")}
          element={<JourneyGuard requires={["authenticated", "careSubject", "doctorSlot"]}><Shell><ReviewScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-11")}
          element={<JourneyGuard requires={["authenticated", "careSubject", "doctorSlot"]}><Shell><PaymentScreen /></Shell></JourneyGuard>}
        />
        <Route
          path={rel("P-12")}
          element={<JourneyGuard requires={["authenticated", "appointment"]}><Shell><ConfirmedScreen /></Shell></JourneyGuard>}
        />

        {/* Management routes */}
        <Route path="home" element={<JourneyGuard requires={["authenticated"]}><Shell><HomeScreen /></Shell></JourneyGuard>} />
        <Route path="cancel" element={<JourneyGuard requires={["authenticated"]}><Shell><CancelScreen /></Shell></JourneyGuard>} />
        <Route path="consent-centre" element={<JourneyGuard requires={["authenticated"]}><Shell><ConsentCentreScreen /></Shell></JourneyGuard>} />
        <Route path="welcome-back" element={<JourneyGuard requires={["authenticated"]}><Shell><WelcomeBackScreen /></Shell></JourneyGuard>} />

        {/* Final-batch: auth-required */}
        <Route path="past-consultations" element={<JourneyGuard requires={["authenticated"]}><Shell><PastConsultationsScreen /></Shell></JourneyGuard>} />
        <Route path="help" element={<JourneyGuard requires={["authenticated"]}><Shell><HelpScreen /></Shell></JourneyGuard>} />
        <Route path="slot-released" element={<JourneyGuard requires={["authenticated"]}><Shell><SlotReleasedScreen /></Shell></JourneyGuard>} />
        <Route path="authority" element={<JourneyGuard requires={["authenticated"]}><Shell><AuthorityAttestationScreen /></Shell></JourneyGuard>} />
        <Route path="dependent-review" element={<JourneyGuard requires={["authenticated"]}><Shell><DependentReviewScreen /></Shell></JourneyGuard>} />
        <Route path="follow-up-booked" element={<JourneyGuard requires={["authenticated"]}><Shell><FollowUpBookedScreen /></Shell></JourneyGuard>} />
        <Route path="follow-up-waiting" element={<JourneyGuard requires={["authenticated"]}><Shell><FollowUpWaitingScreen /></Shell></JourneyGuard>} />
        <Route path="follow-up-complete" element={<JourneyGuard requires={["authenticated"]}><Shell><FollowUpCompleteScreen /></Shell></JourneyGuard>} />
        <Route path="withdraw-consent" element={<JourneyGuard requires={["authenticated"]}><Shell><WithdrawConsentScreen /></Shell></JourneyGuard>} />
        <Route path="consent-ended" element={<JourneyGuard requires={["authenticated"]}><Shell><ConsentWithdrawnEndedScreen /></Shell></JourneyGuard>} />
        <Route path="consultation-day" element={<JourneyGuard requires={["authenticated"]}><Shell><ConsultationDayStub /></Shell></JourneyGuard>} />

        {/* Final-batch: public link-entry (no auth guard) */}
        <Route path="find-appointment" element={<Shell><FindAppointmentScreen /></Shell>} />
        <Route path="consultation-link" element={<Shell><ConsultationLinkScreen /></Shell>} />
        <Route path="invalid-link" element={<Shell><InvalidLinkScreen /></Shell>} />
      </Route>
      <Route path="*" element={<Navigate to={stepUrl("P-01")} replace />} />
    </Routes>
  );
}