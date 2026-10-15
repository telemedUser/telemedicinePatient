# Requirements Document

## Introduction

This feature adds a net-new patient-facing booking front-door **plain React application**, **patient-booking**, built as a standard app (Vite + React + React Router) in the existing Nx + pnpm monorepo at `telemedicine-frontend/apps/patient-booking`, **without Module Federation**. It implements prototype screens **P-01 through P-12** of the Patient Journey as defined in the authoritative "Telemedicine Patient Prototype" (`Telemedicine Patient Prototype.html`): Front door, Sign in, Who needs care?, Reason for consultation, Confirm your medical history, Quick check (AI triage), Doctors available, Doctor profile and time, Your cover and cost, Review and confirm, Payment, and Booking confirmed.

The existing patient journey begins at consent/identity; there is currently no booking front-door application, so this application becomes the entry point that precedes the existing consent step. It reuses the shared workspace packages (`@telemedicine/auth`, `@telemedicine/session-context`, `@telemedicine/design-system`, `@telemedicine/i18n`, `@telemedicine/observability-web`, `@telemedicine/api-client`, `@telemedicine/test-utils`) via normal build-time imports rather than being loaded as a runtime remote.

The application is now backed by a **real lightweight backend**: a Node + Express service, the **Booking_API**, at `telemedicine-frontend/apps/patient-booking-api` listening on port 4000 and exposing JSON endpoints under `/api`. The frontend reaches the Booking_API through a Vite dev proxy at `/api`. MSW 2 is retained as an **opt-in fallback** (enabled when `VITE_USE_MOCKS=true`) for offline/dev work and tests; the **default** path is the real Booking_API.

**Scope boundaries:**

- **Real backend plus opt-in mocks.** The Booking_API provides sign-in, patient/dependent record lookup, AI symptom extraction, medical-history retrieval, triage, doctors, slots, cover quote, and appointment creation. When `VITE_USE_MOCKS=true`, all backend interactions are instead served by MSW 2 handlers in `@telemedicine/test-utils`. The real backend is the default.
- **Default UI language is English (`en`).** `es-CL` (Chilean Spanish) remains available as a secondary locale.
- **Neutral branding.** All "Bupa" references are removed from user-facing text; UI wording uses neutral "Telemedicine" terminology. The design tokens (primary `#0079C8`, heading `#10294A`, Figtree typeface) are retained.
- **Notifications are out of scope.**
- **The video consultation journey (P-14 onward) is out of scope here** and is built by a separate team, integrated later.
- **Payment is a mock screen only** (P-11): no real payment gateway and no card data captured or stored.
- **Excluded entirely:** video conferencing, messaging/chat, and notifications.
- The prototype's "Welcome back / returning mid-booking" branch is noted only as optional context for resume behaviour.

This document specifies requirements using EARS patterns and INCOSE quality rules, organized per screen (P-01..P-12) followed by cross-cutting requirements (shell chrome, dependent context, auth/session, i18n, accessibility, observability, testing/mocking, backend, wizard model) and an organizational requirement enabling three developers to work in parallel without merge conflicts.

## Glossary

- **Booking_App**: The new `patient-booking` plain-React application (Vite + React + React Router) implementing screens P-01 through P-12, built in the Nx monorepo without Module Federation.
- **Patient_Shell**: The existing patient portal host (`apps/shell`, Keycloak client `patient-portal`). The Booking_App renders its own routes via React Router; if integrated with the patient shell it mounts as a normal routed application through standard client-side routing, not as a federated remote.
- **Booking_Wizard**: The multi-step navigation controller inside the Booking_App that sequences P-01 through P-12 with Back/Continue semantics.
- **Session_Context**: The shared `@telemedicine/session-context` library used for cross-step state (selected patient/dependent, reason, severity, uploaded files, auth state).
- **Auth_Library**: The shared `@telemedicine/auth` library providing OAuth2 PKCE sign-in, in-memory tokens, and the `VITE_AUTH_MODE=dev` bypass.
- **Design_System**: The shared `@telemedicine/design-system` component library and design tokens.
- **I18n_Library**: The shared `@telemedicine/i18n` library providing es-CL (primary) and en (fallback) locale bundles.
- **Observability_Library**: The shared `@telemedicine/observability-web` library providing the error boundary and journey-timing marks.
- **Mock_Layer**: The MSW 2 request handlers that simulate all backend/BFF responses during development and tests.
- **Patient_Record**: The signed-in person's stored demographic, cover, and clinical-history data (mocked).
- **Dependent**: A person other than the account holder for whom care is booked (e.g. the child "Emilia Vergara Rojas").
- **Care_Subject**: The person (self or a Dependent) selected on P-03 as the recipient of care.
- **Dependent_Context_Strip**: The "For Emilia" banner shown while booking for a Dependent, stating the acting relationship, the Dependent's age, that both identities are recorded, and offering a Consent-centre affordance.
- **Symptom_Extraction**: The mocked AI service that returns candidate symptom chips derived from free-text symptom input.
- **Red_Flag_Phrase**: A configured danger phrase in the symptom text (e.g. "trouble breathing", "chest pain", "fainting") that triggers the emergency interrupt.
- **Emergency_Interrupt**: The `alertdialog` urging the patient to call 131 (SAMU) and not wait for a video consultation.
- **Severity_Value**: An integer from 0 to 10 captured by the "How bad is it?" slider.
- **Severity_Word**: The human-readable label paired with the current Severity_Value.
- **Measurements_Block**: The weight (kg) and height (cm) inputs shown on P-04 only when the Care_Subject is a Dependent, used for medicine dosing.
- **Status_Pill**: A labelled status indicator that always pairs an icon with a colour (WCAG 2.1 AA).
- **App_Routing**: The React Router route configuration for the Booking_App that defines the P-01 through P-12 steps under the booking base path and drives Back/Continue navigation.
- **Booking_API**: The Node + Express backend service at `telemedicine-frontend/apps/patient-booking-api` (port 4000) exposing JSON endpoints under `/api`, consumed by the Booking_App through the Vite dev proxy. Holds all data in memory with no database.
- **Triage_Provider**: The Booking_API server-side interface that produces AI-triage questions and results. Implemented now as the `MockTriageProvider` and replaceable later by an `LlmTriageProvider` without changing the HTTP contract or the frontend.
- **Doctor**: A clinician record returned by the Booking_API, comprising at least a name, specialty, rating, next availability, consultation mode, and price.
- **Slot**: A bookable time offered by a Doctor and returned by the Booking_API, comprising a date and time.
- **Cover_Quote**: A fixed consultation fee returned by the Booking_API for the selected booking.
- **Appointment**: A booking record created in memory by the Booking_API on successful payment, identified by an appointment reference and capturing the selected Doctor, Slot, consultation mode, and Care_Subject.
- **Payment_Mock**: The simulated P-11 payment experience that captures no card data, contacts no payment gateway, and always succeeds.
- **Home_Dashboard**: The P-13 "My care" screen that lists the signed-in patient's upcoming consultations and provides entry points to start a new consultation and manage existing bookings.
- **Consent_Record**: A changeable consent for upcoming care returned by the Booking_API, comprising at least an identifier, a human-readable label, and a granted state (granted or withdrawn).
- **Cancellation**: The operation that sets an existing Appointment's status to "cancelled" via the Booking_API.
- **Resume_Flow**: The P-35 "Welcome back" screen that offers to resume a previously started, non-expired booking at the furthest reached step or to start over.
- **Past_Consultation_View**: The P-20 screen that lists the signed-in patient's past (completed or cancelled) Appointments and shows the detail of a selected past Appointment.
- **Help_Screen**: The P-24 static informational screen presenting FAQs, contact options, and the emergency 131 (SAMU) notice, reachable from the shell "Help" entry, served without backend calls.
- **Find_Appointment_Screen**: The P-32 entry screen where a person enters an appointment reference to locate an existing booking through the Booking_API.
- **Consultation_Link_Screen**: The P-33 screen that displays the join link and details for a located Appointment.
- **Invalid_Link_Screen**: The P-34 edge screen shown when a consultation link is expired or invalid, offering a recovery action.
- **Slot_Released_Screen**: The P-36 edge screen shown when a previously held Slot was released, offering an action to pick a new time.
- **Authority_Attestation**: The P-27 confirmation in which the acting adult attests to their authority and relationship to the Dependent before a dependent booking proceeds, stored as a boolean attestation in Session_Context.
- **Dependent_Review_Screen**: The P-28 review-and-confirm summary for a Dependent booking.
- **Follow_Up_Booked_Screen**: The P-29 screen confirming a follow-up Appointment has been booked.
- **Follow_Up_Waiting_Screen**: The P-30 waiting-room placeholder screen for a follow-up consultation, noting the live portion is delivered by the clinical team.
- **Follow_Up_Complete_Screen**: The P-31 screen confirming a follow-up consultation is complete with a summary.
- **Withdraw_Consent_Screen**: The P-38 screen that lets the patient withdraw a specific Consent_Record by setting its granted state to withdrawn.
- **Consent_Withdrawn_Ended_Screen**: The P-39 terminal informational screen shown when a consultation ended because consent was withdrawn.
- **Consultation_Day_Stub**: The single placeholder screen representing prototype screens P-14 through P-22 (identity check, consents, device check, waiting room, video call, documents, survey), stating the live consultation experience is delivered by the clinical team and integration is pending, with no backend.

## Requirements

### Requirement 1: P-01 Front door

**User Story:** As a prospective patient, I want a landing page that lets me start care or find an existing appointment and explains how the service works, so that I can begin the booking journey with confidence.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-01 route, THE Booking_App SHALL display a primary heading, a "Get care now" primary action, and an "I already have an appointment" secondary action.
2. WHEN the patient activates "Get care now", THE Booking_Wizard SHALL navigate to the P-02 Sign in step.
3. WHEN the patient activates "I already have an appointment", THE Booking_Wizard SHALL navigate to the P-02 Sign in step.
4. THE Booking_App SHALL display a "How it works" section containing exactly four ordered steps, each with an icon, a step number, a title, and descriptive text.
5. THE Booking_App SHALL display an emergency notice instructing the patient to call 131 (SAMU) for emergencies, rendered with a `tel:131` link.
6. THE Booking_App SHALL render the P-01 layout using fluid reflow across viewport widths from 390px to 1280px without breakpoint-specific layout forks.

### Requirement 2: P-02 Sign in

**User Story:** As a patient, I want to sign in with my Telemedicine account or ClaveÚnica, so that the platform can locate my record and cover before booking.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-02 route, THE Booking_App SHALL display an email field, a password field, a "Sign in" submit action, a "Continue with ClaveÚnica" action, and a "Forgot your password?" action.
2. WHEN the patient submits valid credentials recognized by the Mock_Layer, THE Auth_Library SHALL establish an authenticated session, THE Booking_App SHALL reset the failed-attempt count for that email to 0, and THE Booking_Wizard SHALL navigate to the P-03 step.
3. IF the patient submits credentials that the Mock_Layer rejects as invalid, THEN THE Booking_App SHALL display an error message stating the email or password does not match and SHALL display the current failed-attempt count for that email in the form "Attempt N of 5", where N is the cumulative count of rejected submissions for that email from 1 to 5.
4. THE Booking_App SHALL track the failed-attempt count per email address.
5. WHILE the failed-attempt count for an email is below 5, THE Booking_App SHALL increment that count by 1 on each rejected sign-in submission for that email.
6. IF the failed-attempt count for an email reaches 5, THEN THE Booking_App SHALL disable sign-in submission for that email for 15 minutes and SHALL display a lockout message indicating that sign-in is paused.
7. WHILE the 15-minute lockout period for an email is active, THE Booking_App SHALL reject further sign-in submissions for that email and SHALL keep the lockout message visible.
8. WHEN the 15-minute lockout period for an email expires, THE Booking_App SHALL re-enable sign-in submission for that email and SHALL reset that email's failed-attempt count to 0.
9. WHEN the Mock_Layer responds that the authenticated account has no matching Patient_Record, THE Booking_App SHALL display the "no record found" branch referencing F-08, offering a "Get help linking my record" action and a "Try another account" action.
10. WHILE the "no record found" branch is displayed, THE Booking_App SHALL NOT create a booking and SHALL NOT assume a patient identity.
11. WHEN the patient activates "Try another account" from the "no record found" branch, THE Booking_App SHALL clear the branch and redisplay the sign-in form.
12. WHEN the patient activates "Continue with ClaveÚnica", THE Auth_Library SHALL initiate the ClaveÚnica sign-in path mocked by the Mock_Layer, and on a successful response THE Booking_Wizard SHALL navigate to the P-03 step.
13. IF the ClaveÚnica path returns no matching Patient_Record, THEN THE Booking_App SHALL display the "no record found" branch referencing F-08.
14. WHEN an authentication error field state applies, THE Booking_App SHALL set `aria-invalid` on the affected email and password inputs.

### Requirement 3: P-03 Who needs care?

**User Story:** As a signed-in patient, I want to choose whether care is for myself or a dependent, so that the booking is attributed to the correct person.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-03 route, THE Booking_App SHALL display a radiogroup of selectable care-subject cards including the signed-in patient and each eligible Dependent returned by the Mock_Layer.
2. THE Booking_App SHALL render each care-subject card with `role="radio"` and SHALL reflect the current selection using `aria-checked`.
3. WHERE a care-subject card is marked ineligible by the Mock_Layer, THE Booking_App SHALL render that card as disabled and SHALL prevent its selection.
4. WHEN the patient selects an eligible care-subject card, THE Session_Context SHALL store the selected Care_Subject.
5. WHEN the patient activates "Continue" with a Care_Subject selected, THE Booking_Wizard SHALL navigate to the P-04 step.
6. WHEN the patient activates "Back", THE Booking_Wizard SHALL navigate to the preceding step.
7. IF the patient activates "Continue" with no Care_Subject selected, THEN THE Booking_App SHALL keep the P-03 step active and SHALL display a selection-required message.

### Requirement 4: P-04 Reason for consultation

**User Story:** As a patient, I want to describe my symptoms with AI assistance, indicate duration and severity, optionally attach files, and provide a dependent's measurements, so that the clinician receives structured context before the consultation.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-04 route, THE Booking_App SHALL display a free-text symptom description field accepting up to 2000 characters.
2. WHEN the patient has entered at least 3 characters in the symptom description field and no further input occurs for 500 ms, THE Booking_App SHALL request candidate symptoms from the Symptom_Extraction mock.
3. WHEN the Symptom_Extraction mock returns candidates, THE Booking_App SHALL display up to 15 returned candidates as chips within a "Symptoms we picked up" region, marking each chip as either selected (with a remove control) or available (with an add control).
4. IF the symptom description field contains fewer than 3 non-whitespace characters, THEN THE Booking_App SHALL display no symptom chips and SHALL clear any previously displayed candidate chips.
5. IF the Symptom_Extraction mock request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL display an error message indicating extraction is unavailable and SHALL retain any symptoms already selected in Session_Context.
6. WHEN the patient activates the remove control on a selected symptom chip, THE Booking_App SHALL move that symptom from the selected set to the available set and SHALL update the stored symptom set in Session_Context.
7. WHEN the patient activates the add control on an available symptom chip, THE Booking_App SHALL move that symptom from the available set to the selected set and SHALL update the stored symptom set in Session_Context.
8. THE Booking_App SHALL display a "How long?" duration radiogroup and SHALL store the selected duration in Session_Context.
9. THE Booking_App SHALL display a "How bad is it?" severity slider accepting an integer Severity_Value from 0 to 10 inclusive, with an accessible name, keyboard operability adjusting by 1 with arrow keys, and an exposed current value for assistive technology.
10. THE Booking_App SHALL display a Severity_Word mapped from the current Severity_Value as follows: 0 to 2 inclusive maps to "Mild", 3 to 6 inclusive maps to "Moderate", 7 to 9 inclusive maps to "Severe", and 10 maps to "Worst possible".
11. WHEN the patient changes the severity slider, THE Session_Context SHALL store the updated Severity_Value and THE Booking_App SHALL update the displayed Severity_Word.
12. WHERE the patient attaches a file, THE Booking_App SHALL accept each file of type JPG, PNG, HEIC, or PDF with a per-file size up to 10 MB inclusive.
13. IF the patient attaches a file whose type is not JPG, PNG, HEIC, or PDF, THEN THE Booking_App SHALL reject that file, SHALL NOT add it to the attachment set, and SHALL display a message indicating the file type is not supported.
14. IF the patient attaches a file that exceeds 10 MB, THEN THE Booking_App SHALL reject that file, SHALL NOT add it to the attachment set, and SHALL display a message indicating the file exceeds the 10 MB limit.
15. WHEN a file is accepted, THE Booking_App SHALL display a file-type selector offering Photo, Lab report, Prescription, and Other document, and SHALL display a scan-status indicator for that file reflecting one of the states: Pending, Scanning, Clean, or Rejected.
16. WHERE the Care_Subject is a Dependent, THE Booking_App SHALL display the Measurements_Block with a weight input accepting 0.1 to 500 kg and a height input accepting 1 to 300 cm, and SHALL store entered measurements in Session_Context.
17. WHERE the Care_Subject is the signed-in patient, THE Booking_App SHALL NOT display the Measurements_Block.
18. IF the symptom text contains a configured Red_Flag_Phrase (for example "chest pain", "difficulty breathing", "shortness of breath", "suicidal", "stroke", or "severe bleeding"), THEN THE Booking_App SHALL display the Emergency_Interrupt as an `alertdialog` urging the patient to call 131 (SAMU) and not wait for a video consultation.
19. WHEN the Emergency_Interrupt is displayed, THE Booking_App SHALL provide a "Call 131" action linking to `tel:131` and a "Continue" action that dismisses the Emergency_Interrupt without blocking continuation.
20. WHEN the patient activates "Continue", THE Booking_Wizard SHALL navigate to the P-05 step, retaining the P-04 data stored in Session_Context.
21. WHEN the patient activates "Skip this step", THE Booking_Wizard SHALL navigate to the P-05 step and SHALL clear the P-04 symptom, duration, severity, attachment, and measurement data from Session_Context.

### Requirement 5: P-05 Confirm your medical history

**User Story:** As a patient, I want to review and confirm my stored medical history before proceeding, so that the clinician works from accurate information.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-05 route, THE Booking_App SHALL request the Care_Subject's medical-history records from the Mock_Layer.
2. WHILE the medical-history request is in progress, THE Booking_App SHALL display a loading indicator for the medical-history region.
3. WHEN the Mock_Layer returns medical-history records, THE Booking_App SHALL display each record as a reviewable row.
4. IF the Mock_Layer returns no medical-history records, THEN THE Booking_App SHALL display an empty-history message indicating no records are on file.
5. IF the medical-history request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL display an error message and SHALL provide a retry action that re-requests the records.
6. THE Booking_App SHALL render each medical-history row with a share toggle using `role="checkbox"` and SHALL reflect its state using `aria-checked`.
7. WHEN the patient toggles a medical-history row's share control, THE Session_Context SHALL store the updated share state for that record.
8. WHEN the patient edits a medical-history record and saves a correction of 1 to 2000 characters, THE Booking_App SHALL display the saved correction text with the record and SHALL store the correction in Session_Context.
9. THE Booking_App SHALL provide an "Add anything missing" free-text field accepting up to 2000 characters and SHALL store its content in Session_Context.
10. THE Booking_App SHALL require medical-history confirmation before advancing past P-05, keeping "Confirm and continue" disabled until the medical-history request has resolved (records displayed or empty-history message shown).
11. WHEN the patient activates "Confirm and continue", THE Booking_App SHALL mark the medical history as confirmed in Session_Context and THE Booking_Wizard SHALL complete the P-05 step.
12. WHEN the patient activates "Back", THE Booking_Wizard SHALL navigate to the preceding step.

### Requirement 6: Dependent context strip

**User Story:** As a patient booking for my child, I want a clear banner confirming who I am acting for, so that I understand both identities are recorded and can reach consent controls.

#### Acceptance Criteria

1. WHILE the Care_Subject is a Dependent, THE Booking_App SHALL display the Dependent_Context_Strip on each applicable booking step.
2. THE Dependent_Context_Strip SHALL display the Dependent's name, the Dependent's age, the acting relationship of the signed-in patient, and a statement that both identities are recorded.
3. THE Dependent_Context_Strip SHALL provide a Consent-centre affordance.
4. WHILE the Care_Subject is the signed-in patient, THE Booking_App SHALL NOT display the Dependent_Context_Strip.

### Requirement 7: Shared header and shell chrome

**User Story:** As a patient, I want consistent header chrome across the booking flow, so that the experience matches the rest of the Telemedicine portal.

#### Acceptance Criteria

1. THE Booking_App SHALL render shell chrome containing the Telemedicine wordmark, a "My care" entry, a "Help" entry, and a signed-in avatar showing the patient's initials.
2. WHILE no authenticated session exists, THE Booking_App SHALL render the chrome without the signed-in avatar initials.
3. THE Booking_App SHALL render shell chrome and layouts using Design_System components and design tokens.

### Requirement 8: Design system and visual standards

**User Story:** As a design stakeholder, I want the booking screens to conform to the Telemedicine visual system, so that the application is brand-consistent and accessible.

#### Acceptance Criteria

1. THE Booking_App SHALL apply the primary blue token value `#0079C8` for primary actions and the deep-navy heading token value `#10294A` for primary headings.
2. THE Booking_App SHALL use the Figtree typeface for text content.
3. THE Booking_App SHALL render all layouts with fluid reflow across viewport widths from 390px to 1280px without breakpoint-specific layout forks.
4. THE Booking_App SHALL render every Status_Pill with both an icon and a colour.
5. THE Booking_App SHALL compose its UI from Design_System components where an equivalent component exists.

### Requirement 9: Authentication and session integration

**User Story:** As a developer, I want the booking flow to use the platform's auth and session libraries, so that identity and cross-step state are handled consistently and securely.

#### Acceptance Criteria

1. THE Booking_App SHALL perform sign-in through the Auth_Library using the OAuth2 PKCE flow.
2. IF sign-in through the Auth_Library fails or is rejected by the identity provider, THEN THE Booking_App SHALL remain unauthenticated, SHALL NOT advance the Booking_Wizard past the sign-in step, and SHALL present an error indication that authentication did not complete.
3. THE Auth_Library SHALL hold access and refresh tokens in memory only and SHALL NOT persist tokens to localStorage, sessionStorage, or Session_Context.
4. WHERE `VITE_AUTH_MODE` is set to `dev`, THE Auth_Library SHALL provide a synthetic authenticated user without contacting an external identity provider.
5. WHEN the patient completes a booking step, THE Booking_App SHALL persist to Session_Context the Booking_Wizard current step identifier (one of P-01 through P-12), selected Care_Subject, symptom set, duration, Severity_Value, uploaded file metadata, medical-history confirmations, selected Doctor, selected Slot, appointment reference, and non-token authentication state (authenticated/unauthenticated status and user identifier only).
6. WHEN the patient navigates between booking steps, THE Booking_App SHALL read prior step values from Session_Context so that previously entered data is retained for the lifetime of the sessionStorage-backed Session_Context.
7. WHERE a previously started booking exists in Session_Context and the Session_Context has not been reset or expired, THE Booking_App MAY resume the Booking_Wizard at the furthest reached step, defined as the highest step identifier within P-01 through P-12 persisted in Session_Context.
8. IF Session_Context is reset or expires, THEN THE Auth_Library SHALL discard in-memory access and refresh tokens, THE Booking_App SHALL clear persisted Booking_Wizard step state from Session_Context, SHALL NOT resume a prior booking, and SHALL restart the Booking_Wizard at step P-01.

### Requirement 10: Routing and application integration

**User Story:** As a platform operator, I want the booking application served on a dedicated route via standard client-side routing, so that patients reach the booking wizard without runtime remote loading.

#### Acceptance Criteria

1. THE Booking_App SHALL define its screens as React Router routes under a base path `/booking`, or `/patient/booking` when mounted in the existing patient shell.
2. THE Booking_App SHALL render as a standard build-time React application and SHALL NOT use Module Federation or expose a remote entry.
3. WHEN the patient advances or retreats within the Booking_Wizard, THE Booking_App SHALL update the active route and step so that Back and Continue navigate across P-01 through P-12.
4. WHERE the Booking_App is integrated into the existing patient shell, THE Booking_App SHALL be mounted via standard client-side routing rather than runtime remote loading.
5. IF a booking route is accessed directly, THEN THE Booking_App SHALL render the corresponding step when prerequisites are met and SHALL redirect to P-01 when prerequisites are unmet.

### Requirement 11: Internationalization

**User Story:** As a patient, I want the booking flow in English by default with Chilean Spanish available, so that I can read the interface in my preferred language.

#### Acceptance Criteria

1. THE Booking_App SHALL source all user-facing text from the I18n_Library.
2. THE Booking_App SHALL provide locale bundles for en and es-CL covering all P-01 through P-12 text.
3. WHILE no explicit locale selection has been made, THE Booking_App SHALL render user-facing text using the en locale as the default.
4. WHILE the active locale is es-CL, THE Booking_App SHALL render user-facing text in Chilean Spanish.
5. IF a translation key is missing for the active locale, THEN THE Booking_App SHALL render the en fallback text for that key.

### Requirement 12: Accessibility

**User Story:** As a patient using assistive technology, I want the booking screens to meet accessibility standards, so that I can complete the journey independently.

#### Acceptance Criteria

1. THE Booking_App SHALL conform to WCAG 2.1 AA for all P-01 through P-12 screens.
2. THE Booking_App SHALL support keyboard operation for every interactive control, including the care-subject radiogroup, symptom chips, duration radiogroup, severity slider, file controls, and medical-history toggles.
3. THE Booking_App SHALL render the Emergency_Interrupt with `role="alertdialog"` and an accessible label.
4. THE Booking_App SHALL provide accessible names for form fields, status indicators, and icon-only controls.
5. THE Booking_App SHALL pass `jsx-a11y` lint rules and `vitest-axe` assertions in CI with zero violations on tested screens.

### Requirement 13: Observability

**User Story:** As an operator, I want client-side error capture and journey timing for the booking flow, so that failures and step performance are visible.

#### Acceptance Criteria

1. THE Booking_App SHALL wrap its root in the Observability_Library error boundary.
2. IF a render error occurs within the Booking_App, THEN the Observability_Library error boundary SHALL catch the error and SHALL report it through the configured observability channel.
3. WHEN the patient enters each booking step P-01 through P-12, THE Booking_App SHALL record a journey timing mark for that step via the Observability_Library.
4. WHERE `VITE_OBSERVABILITY_MODE` is set to `dev`, THE Observability_Library SHALL emit telemetry to the console without network transmission.

### Requirement 14: Backend mocking and testing

**User Story:** As a developer, I want the Booking_App to default to the real Booking_API with an opt-in mock fallback and full test coverage, so that the application runs against the backend yet still verifies offline and in tests.

#### Acceptance Criteria

1. THE Mock_Layer SHALL provide MSW 2 handlers for sign-in, patient and dependent record lookup, symptom extraction, medical-history retrieval, triage, doctors, slots, cover quote, and appointment creation.
2. WHILE `VITE_USE_MOCKS` is unset or not equal to `true`, THE Booking_App SHALL obtain backend data from the Booking_API via the `/api` dev proxy.
3. WHERE `VITE_USE_MOCKS` is set to `true`, THE Booking_App SHALL obtain backend data from the Mock_Layer instead of the Booking_API.
4. THE Booking_App SHALL NOT contain backend or BFF implementation code within the frontend application, keeping backend logic in the Booking_API.
5. THE Booking_App SHALL NOT include video conferencing, messaging/chat, or notification functionality.
6. THE Booking_App test suite SHALL use Vitest, Testing Library, and MSW 2 and SHALL use `@telemedicine/test-utils` render helpers and handlers with `VITE_USE_MOCKS` set to `true`.
7. THE Booking_App SHALL achieve at least 80% line coverage to satisfy the monorepo coverage gate.

### Requirement 15: Parallel development and merge-conflict avoidance

**User Story:** As a three-developer team, we want the work partitioned by file ownership, so that we can implement P-01 through P-05 in parallel without merge conflicts.

#### Acceptance Criteria

1. THE Booking_App source SHALL be organized so that each in-scope screen (P-01, P-02, P-03, P-04, P-05) resides in its own feature directory with a single owning developer.
2. THE implementation SHALL assign Developer A ownership of P-01 Front door and P-02 Sign in, including auth and session wiring for sign-in.
3. THE implementation SHALL assign Developer B ownership of P-03 Who needs care?, P-05 Confirm medical history, the Dependent_Context_Strip, and the patient/dependent data model additions in Session_Context.
4. THE implementation SHALL assign Developer C ownership of P-04 Reason for consultation, including symptom text, AI chips, duration, severity, file upload, and the Red_Flag_Phrase Emergency_Interrupt.
5. THE shared contracts — type definitions, Session_Context additions, Design_System additions, Booking_Wizard routing/step state, and the Booking_API — SHALL be owned by a single developer to minimize concurrent edits to shared files.
6. THE implementation SHALL route all developers' backend interactions through the Booking_API (or the Mock_Layer when `VITE_USE_MOCKS=true`) so that no developer introduces a competing backend-call mechanism.
7. THE implementation SHALL partition the new screens (P-06 through P-12) across the three developers so that each new screen resides in its own feature directory with a single owning developer, following the same per-screen ownership rule as P-01 through P-05.

### Requirement 16: P-06 Quick check (AI triage)

**User Story:** As a patient, I want an optional AI-assisted quick check that recommends a specialty, so that I can be routed to a suitable doctor while a clinician still makes every decision.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-06 route, THE Booking_App SHALL display a disclosure card stating that the quick check asks up to 5 quick questions, is AI-assisted, that answers go only to the doctor, that answers are never used to train models, and that a doctor makes every decision, and SHALL display an "Allow the quick check" action and a "Skip" action.
2. WHEN the patient activates "Allow the quick check", THE Booking_App SHALL request the triage question set from the Booking_API triage endpoints.
3. WHEN the Booking_API returns triage questions, THE Booking_App SHALL present up to 3 Yes/No questions one at a time, SHALL display a progress indicator in the form "Question N of 3" where N is the current question number from 1 to 3, and SHALL display a "Skip the rest" action.
4. WHEN the patient answers a triage question, THE Booking_App SHALL submit that answer to the Booking_API triage endpoints and SHALL store the question and answer in Session_Context.
5. WHEN the patient has answered the available triage questions or activates "Skip the rest", THE Booking_App SHALL request the triage result from the Booking_API triage endpoints.
6. WHEN the Booking_API returns a triage result, THE Booking_App SHALL display a result card showing a recommended specialty, a "Video recommended" hint, a "No emergency signs reported" confirmation, and a summary listing each answered question with its answer, and SHALL display a "Use this" action and a "Choose differently" action.
7. WHEN the patient activates "Use this", THE Session_Context SHALL store the recommended specialty as the active specialty filter and THE Booking_Wizard SHALL navigate to the P-07 step.
8. WHEN the patient activates "Choose differently", THE Booking_Wizard SHALL navigate to the P-07 step without storing a recommended specialty filter.
9. WHEN the patient activates "Skip" on the disclosure card, THE Booking_Wizard SHALL navigate to the P-07 step without requesting triage questions.
10. IF the triage request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL display a skipped fallback state indicating the quick check is unavailable and SHALL display a "See all available doctors" action that navigates to the P-07 step.
11. THE Booking_App SHALL display on the P-06 screen an emergency notice instructing the patient to call 131 (SAMU) for emergencies, rendered with a `tel:131` link.
12. THE Booking_App SHALL NOT compute triage questions or results in the frontend and SHALL obtain all triage questions and results from the Booking_API.

### Requirement 17: P-07 Doctors available

**User Story:** As a patient, I want to browse available doctors filtered by specialty and sorted, so that I can choose a clinician that fits my needs.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-07 route, THE Booking_App SHALL request the doctor list from the Booking_API.
2. WHILE the doctor-list request is in progress, THE Booking_App SHALL display a loading indicator for the doctor-list region.
3. WHEN the Booking_API returns doctors, THE Booking_App SHALL display each Doctor with the Doctor's name, specialty, rating, next availability, consultation mode, and price.
4. THE Booking_App SHALL provide a specialty filter control and SHALL request doctors filtered by the selected specialty from the Booking_API.
5. WHERE Session_Context holds a recommended specialty from P-06, THE Booking_App SHALL apply that specialty as the initial value of the specialty filter.
6. THE Booking_App SHALL provide a sort control and SHALL request doctors sorted by the selected sort option from the Booking_API.
7. WHEN the patient selects a Doctor, THE Session_Context SHALL store the selected Doctor and THE Booking_Wizard SHALL navigate to the P-08 step.
8. IF the Booking_API returns no doctors for the active filter, THEN THE Booking_App SHALL display an empty-results message indicating no doctors match the current filter.
9. THE Booking_App SHALL display on the P-07 screen an emergency notice instructing the patient to call 131 (SAMU) for emergencies, rendered with a `tel:131` link.

### Requirement 18: P-08 Doctor profile and time

**User Story:** As a patient, I want to view the selected doctor's profile and pick an available time, so that I can schedule the consultation.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-08 route, THE Booking_App SHALL display the selected Doctor's profile and SHALL request the selected Doctor's bookable Slots from the Booking_API.
2. WHILE the slot request is in progress, THE Booking_App SHALL display a loading indicator for the slot region.
3. WHEN the Booking_API returns Slots, THE Booking_App SHALL display each Slot with its date and time as a selectable option.
4. IF the Booking_API returns no Slots for the selected Doctor, THEN THE Booking_App SHALL display a message indicating no times are available.
5. WHEN the patient selects a Slot, THE Session_Context SHALL store the selected Slot.
6. WHEN the patient activates "Continue" with a Slot selected, THE Booking_Wizard SHALL navigate to the P-09 step.
7. IF the patient activates "Continue" with no Slot selected, THEN THE Booking_App SHALL keep the P-08 step active and SHALL display a selection-required message.
8. WHEN the patient activates "Back", THE Booking_Wizard SHALL navigate to the P-07 step.

### Requirement 19: P-09 Your cover and cost

**User Story:** As a patient, I want to see the fixed consultation fee before I confirm, so that I know the cost in advance.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-09 route, THE Booking_App SHALL request the Cover_Quote from the Booking_API.
2. WHILE the Cover_Quote request is in progress, THE Booking_App SHALL display a loading indicator for the cost region.
3. WHEN the Booking_API returns the Cover_Quote, THE Booking_App SHALL display the fixed consultation fee and SHALL display a statement that nothing is charged until the patient confirms on the next screen.
4. IF the Cover_Quote request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL display an error message and SHALL provide a retry action that re-requests the Cover_Quote.
5. WHEN the patient activates "Continue", THE Booking_Wizard SHALL navigate to the P-10 step.
6. WHEN the patient activates "Back", THE Booking_Wizard SHALL navigate to the P-08 step.

### Requirement 20: P-10 Review and confirm

**User Story:** As a patient, I want to review a summary of my booking before paying, so that I can correct anything before committing.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-10 route, THE Booking_App SHALL display a summary showing the Care_Subject, the selected reason and symptoms, the selected Doctor, the selected Slot date and time, the consultation mode, and the fee.
2. THE Booking_App SHALL provide an edit affordance for each summarized section that returns the Booking_Wizard to the step owning that section.
3. WHEN the patient activates "Confirm", THE Booking_Wizard SHALL navigate to the P-11 step.
4. WHEN the patient activates "Back", THE Booking_Wizard SHALL navigate to the P-09 step.

### Requirement 21: P-11 Payment

**User Story:** As a patient, I want to pay for the consultation through a simple mock payment step, so that my appointment is created without a real payment gateway.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-11 route, THE Booking_App SHALL display the fee as the total, a payment-method selection offering at least a mock card option, and a note that the Slot is held.
2. THE Payment_Mock SHALL NOT capture or store card data and SHALL NOT contact a payment gateway.
3. WHEN the patient activates the pay action, THE Booking_App SHALL display a processing state and SHALL submit an appointment-creation request to the Booking_API.
4. WHEN the Booking_API responds to the appointment-creation request, THE Booking_API SHALL return an appointment reference and THE Payment_Mock SHALL report success.
5. WHEN appointment creation succeeds, THE Session_Context SHALL store the appointment reference and THE Booking_Wizard SHALL navigate to the P-12 step.
6. IF the appointment-creation request fails or does not respond within 10 seconds, THEN THE Booking_App SHALL display an error message and SHALL keep the P-11 step active with the pay action available for retry.

### Requirement 22: P-12 Booking confirmed

**User Story:** As a patient, I want a confirmation of my booking with the reference and what happens next, so that I know the appointment is scheduled.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-12 route, THE Booking_App SHALL display a confirmation showing the appointment reference, the selected Doctor, the scheduled date and time, and the consultation mode.
2. THE Booking_App SHALL display a "what happens next" summary on the P-12 screen.
3. THE Booking_App SHALL display a statement that the P-12 step is the end of the current in-scope booking flow and that the video consultation day (P-14 onward) is handled by a separate team.

### Requirement 23: Booking_API backend service

**User Story:** As a platform developer, I want a lightweight in-memory Node + Express backend serving the booking data under /api, so that the frontend runs against a real backend with a swappable triage provider.

#### Acceptance Criteria

1. THE Booking_API SHALL run as a Node + Express service at `telemedicine-frontend/apps/patient-booking-api` listening on port 4000 and SHALL expose JSON endpoints under the `/api` base path.
2. THE Booking_API SHALL provide auth, patient and dependent record lookup, symptom-extraction, and medical-history endpoints serving the P-01 through P-05 data.
3. THE Booking_API SHALL provide triage endpoints behind the Triage_Provider interface for starting a triage, submitting an answer, and retrieving a triage result.
4. THE Booking_API SHALL provide a GET doctors endpoint accepting an optional specialty filter parameter and an optional sort parameter.
5. THE Booking_API SHALL provide a GET endpoint returning a selected Doctor's bookable Slots.
6. THE Booking_API SHALL provide a GET endpoint returning a fixed Cover_Quote.
7. WHEN the Booking_API receives a POST create-appointment request, THE Booking_API SHALL create an Appointment in memory and SHALL return the Appointment reference.
8. THE Booking_API SHALL set permissive CORS headers for local development.
9. WHEN the Booking_API receives a request carrying a correlation id, THE Booking_API SHALL log the request with that correlation id.
10. IF the Booking_API cannot fulfil a request, THEN THE Booking_API SHALL return an RFC-7807-style problem JSON response describing the error.
11. THE Booking_API SHALL hold all data in memory without a database, so that Appointments do not persist across service restarts.
12. THE Triage_Provider SHALL be implemented as the MockTriageProvider and SHALL be replaceable by an LlmTriageProvider without changing the Booking_API HTTP contract or the frontend.

### Requirement 24: Wizard model update for P-01 through P-12

**User Story:** As a developer, I want the booking wizard model, routing, resume, and guards to span P-01 through P-12, so that the extended journey navigates and resumes correctly.

#### Acceptance Criteria

1. THE Booking_Wizard SHALL sequence the steps P-01 through P-12 in order with Back and Continue semantics.
2. THE App_Routing SHALL define a React Router route for each step P-01 through P-12 under the booking base path.
3. WHEN the patient completes a booking step, THE Booking_App SHALL persist the Booking_Wizard current step identifier within the range P-01 through P-12 to Session_Context.
4. WHERE a previously started booking exists in Session_Context and the Session_Context has not been reset or expired, THE Booking_App MAY resume the Booking_Wizard at the furthest reached step, defined as the highest step identifier within P-01 through P-12 persisted in Session_Context.
5. IF a step after P-02 is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-02 sign-in step.
6. IF a step after P-03 is accessed with no Care_Subject selected in Session_Context, THEN THE Booking_App SHALL redirect to the P-03 step.
7. IF the P-09 step or any later step is accessed with no selected Doctor or no selected Slot in Session_Context, THEN THE Booking_App SHALL redirect to the earliest unmet prerequisite step among P-07 and P-08.

### Requirement 25: P-13 Home / My care

**User Story:** As a signed-in patient, I want a "My care" home screen that lists my upcoming consultations and lets me start a new one, so that I can manage my bookings from a single place.

#### Acceptance Criteria

1. WHEN the patient activates "Go to My care" on the P-12 Booking confirmed screen, THE Booking_Wizard SHALL navigate to the P-13 Home_Dashboard route.
2. WHEN the `/booking/home` route is accessed directly by an authenticated patient, THE Booking_App SHALL render the P-13 Home_Dashboard.
3. WHEN the Booking_App renders the P-13 route, THE Booking_App SHALL request the patient's appointments from the Booking_API via GET `/api/appointments` and SHALL display an "Upcoming consultations" section.
4. WHILE the appointments request is in progress, THE Booking_App SHALL display a loading indicator for the "Upcoming consultations" section.
5. WHEN the Booking_API returns at least one non-cancelled upcoming Appointment, THE Booking_App SHALL display each such Appointment as a card showing the Doctor, the scheduled date and time, the consultation mode, and the appointment reference, with a "View" action and a "Cancel" action.
6. IF the Booking_API returns no non-cancelled upcoming Appointments, THEN THE Booking_App SHALL display an empty-state message inviting the patient to start a new consultation.
7. THE Booking_App SHALL exclude Appointments whose status is "cancelled" from the "Upcoming consultations" list.
8. WHEN the patient activates the "New consultation" action, THE Booking_App SHALL reset the Booking_Wizard booking state in Session_Context and THE Booking_Wizard SHALL navigate to the P-01 step.
9. IF the appointments request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL display an error message and SHALL provide a retry action that re-requests the appointments.
10. IF the P-13 route is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 26: P-37 Cancel consultation

**User Story:** As a patient, I want to cancel a specific upcoming consultation after confirming, so that I can withdraw a booking I no longer need.

#### Acceptance Criteria

1. WHEN the patient activates the "Cancel" action on a Home_Dashboard appointment card, THE Booking_Wizard SHALL navigate to the P-37 route for that appointment reference.
2. WHEN the Booking_App renders the P-37 route, THE Booking_App SHALL display the appointment summary showing the Doctor, the scheduled date and time, and the appointment reference, together with the confirming prompt "Cancel this consultation?".
3. WHEN the patient confirms cancellation, THE Booking_App SHALL call the Booking_API via POST `/api/appointments/:reference/cancel`.
4. WHEN the Booking_API returns a successful cancellation response, THE Booking_API SHALL set that Appointment's status to "cancelled" and THE Booking_Wizard SHALL navigate to the P-13 Home_Dashboard route where the cancelled Appointment no longer appears as upcoming.
5. IF the cancellation request fails or does not respond within 10 seconds, THEN THE Booking_App SHALL display an error message and SHALL keep the Appointment unchanged.
6. WHEN the patient activates the "Keep appointment" action, THE Booking_Wizard SHALL navigate back to the P-13 Home_Dashboard route without cancelling the Appointment.
7. IF the P-37 route is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 27: P-23 Consent centre

**User Story:** As a patient, I want a consent centre where I can review and change consents for upcoming care, so that I control what is shared going forward.

#### Acceptance Criteria

1. WHEN the patient activates the Consent-centre affordance in the Dependent_Context_Strip, THE Booking_Wizard SHALL navigate to the P-23 Consent centre route.
2. WHEN the patient activates the Consent-centre entry from the Home_Dashboard, THE Booking_Wizard SHALL navigate to the P-23 Consent centre route.
3. WHEN the Booking_App renders the P-23 route, THE Booking_App SHALL request the patient's consents from the Booking_API via GET `/api/consents` and SHALL display each Consent_Record with its label and a toggle whose state reflects whether the consent is granted or withdrawn.
4. THE Booking_App SHALL render each consent toggle with `role="switch"` and SHALL reflect its granted state using `aria-checked`.
5. WHILE the consents request is in progress, THE Booking_App SHALL display a loading indicator for the consent-list region.
6. WHEN the patient toggles a Consent_Record, THE Booking_App SHALL send PATCH `/api/consents/:id` to the Booking_API with the new granted state.
7. WHEN the Booking_API returns a successful consent-update response, THE Booking_App SHALL reflect the updated granted state on the corresponding toggle.
8. IF a consent-update request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL revert the affected toggle to its prior state and SHALL display an error message.
9. THE Booking_App SHALL display a note stating that consents attached to past consultations are part of the medical record and are not changeable on the P-23 screen.
10. WHEN the patient activates the back action, THE Booking_Wizard SHALL navigate to the P-13 Home_Dashboard route.
11. IF the P-23 route is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 28: P-35 Welcome back (resume)

**User Story:** As a returning patient, I want a welcome-back screen that lets me resume my unfinished booking or start over, so that I can continue where I left off.

#### Acceptance Criteria

1. WHERE a previously started, non-expired booking exists in Session_Context, THE Booking_App MAY present the Resume_Flow screen greeting the patient by name and displaying a booking-progress stepper of the steps completed so far in P-01 through P-12 order with the furthest reached step highlighted.
2. THE Resume_Flow screen SHALL provide a primary action that resumes the Booking_Wizard at the furthest reached step persisted in Session_Context.
3. THE Resume_Flow screen SHALL provide a secondary action that resets the booking state in Session_Context and navigates the Booking_Wizard to the P-01 step.
4. WHERE Session_Context holds a selected Doctor and a selected Slot but no appointment reference, THE Resume_Flow screen SHALL display a "slot held" status.
5. THE Resume_Flow screen SHALL NOT include notification-nudge content.
6. IF the P-35 route is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 29: Booking_API manage-your-care endpoints

**User Story:** As a platform developer, I want the Booking_API to expose appointment and consent management endpoints, so that the manage-your-care screens run against the real backend.

#### Acceptance Criteria

1. WHEN the Booking_API receives a GET `/api/appointments` request, THE Booking_API SHALL return the list of created Appointments and SHALL accept an optional status filter parameter that restricts the returned Appointments to the specified status.
2. WHEN the Booking_API receives a POST `/api/appointments/:reference/cancel` request for a known appointment reference, THE Booking_API SHALL set that Appointment's status to "cancelled" and SHALL return the updated Appointment.
3. IF the Booking_API receives a POST `/api/appointments/:reference/cancel` request for an unknown appointment reference, THEN THE Booking_API SHALL return a 404 RFC-7807-style problem JSON response.
4. WHEN the Booking_API receives a GET `/api/consents` request, THE Booking_API SHALL return the patient's Consent_Record list.
5. WHEN the Booking_API receives a PATCH `/api/consents/:id` request for a known consent identifier, THE Booking_API SHALL update that Consent_Record's granted state and SHALL return the updated Consent_Record.
6. IF the Booking_API receives a PATCH `/api/consents/:id` request for an unknown consent identifier, THEN THE Booking_API SHALL return a 404 RFC-7807-style problem JSON response.
7. THE Booking_API SHALL hold all manage-your-care data in memory without a database, so that Appointment status changes and Consent_Record changes do not persist across service restarts.
8. IF the Booking_API cannot fulfil a manage-your-care request, THEN THE Booking_API SHALL return an RFC-7807-style problem JSON response describing the error.
9. WHEN the Booking_API receives a manage-your-care request carrying a correlation id, THE Booking_API SHALL log the request with that correlation id.

### Requirement 30: Wizard and routing update for manage-your-care

**User Story:** As a developer, I want the booking application routing to include the manage-your-care screens with consistent chrome and guards, so that patients can reach account-management routes outside the linear booking wizard.

#### Acceptance Criteria

1. THE App_Routing SHALL define React Router routes for the P-13 Home_Dashboard, the P-37 Cancel consultation screen, the P-23 Consent centre, and the P-35 Resume_Flow screen under the booking base path.
2. THE App_Routing SHALL require an authenticated session for the P-13, P-37, P-23, and P-35 routes.
3. IF the P-37 route is accessed without an appointment reference context, THEN THE Booking_App SHALL redirect to the P-13 Home_Dashboard route.
4. THE Booking_App SHALL render the P-13, P-37, P-23, and P-35 screens outside the strict linear P-01 through P-12 sequence while reusing the shell chrome, the authentication guards, and Session_Context.
5. IF any of the P-13, P-37, P-23, or P-35 routes is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 31: P-20 Past consultation

**User Story:** As a signed-in patient, I want to review my past consultations and open the details of one, so that I can look back at completed or cancelled appointments.

#### Acceptance Criteria

1. WHEN the patient activates the "Past consultations" entry from the Home_Dashboard, THE Booking_Wizard SHALL navigate to the P-20 Past_Consultation_View route.
2. WHEN the Booking_App renders the P-20 route, THE Booking_App SHALL request the patient's past Appointments from the Booking_API via GET `/api/appointments` with a status filter restricting results to Appointments whose status is "completed" or "cancelled".
3. WHILE the past-consultations request is in progress, THE Booking_App SHALL display a loading indicator for the past-consultations region.
4. WHEN the Booking_API returns at least one past Appointment, THE Booking_App SHALL display each returned Appointment as a selectable row showing the Doctor, the scheduled date and time, the consultation mode, the appointment reference, and the status.
5. WHEN the patient selects a past Appointment, THE Booking_App SHALL display the selected Appointment's detail showing the Doctor, the scheduled date and time, the consultation mode, the appointment reference, and the status.
6. IF the Booking_API returns no past Appointments, THEN THE Booking_App SHALL display an empty-state message indicating no past consultations are on file.
7. IF the past-consultations request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL display an error message and SHALL provide a retry action that re-requests the past Appointments.
8. IF the P-20 route is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 32: P-24 Help

**User Story:** As a patient, I want a help screen with FAQs, contact options, and an emergency notice, so that I can find assistance without leaving the application.

#### Acceptance Criteria

1. WHEN the patient activates the "Help" entry in the shell chrome, THE Booking_Wizard SHALL navigate to the P-24 Help_Screen route.
2. WHEN the Booking_App renders the P-24 route, THE Help_Screen SHALL display a frequently-asked-questions section, a contact-options section, and an emergency notice.
3. THE Help_Screen SHALL render the emergency notice instructing the patient to call 131 (SAMU) for emergencies with a `tel:131` link.
4. THE Help_Screen SHALL source all user-facing text from the I18n_Library.
5. THE Help_Screen SHALL render without requesting data from the Booking_API or the Mock_Layer.

### Requirement 33: P-32 Find my appointment

**User Story:** As a patient, I want to find an existing appointment by entering its reference, so that I can locate a booking I already made.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-32 Find_Appointment_Screen route, THE Booking_App SHALL display an appointment-reference input field and a "Find appointment" action.
2. IF the patient activates "Find appointment" with an empty reference field, THEN THE Booking_App SHALL keep the P-32 step active and SHALL display a message indicating an appointment reference is required.
3. WHEN the patient activates "Find appointment" with a non-empty reference, THE Booking_App SHALL look up the Appointment through the Booking_API via GET `/api/appointments/{reference}`.
4. WHILE the appointment-lookup request is in progress, THE Booking_App SHALL display a loading indicator and SHALL disable the "Find appointment" action.
5. WHEN the Booking_API returns a matching Appointment, THE Booking_Wizard SHALL navigate to the P-33 Consultation_Link_Screen route for that Appointment.
6. IF the Booking_API returns no matching Appointment for the entered reference, THEN THE Booking_App SHALL keep the P-32 step active and SHALL display a not-found message indicating no appointment matches the entered reference.
7. IF the appointment-lookup request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL display an error message and SHALL re-enable the "Find appointment" action.

### Requirement 34: P-33 Consultation link, P-34 Invalid link, P-36 Slot released

**User Story:** As a patient, I want to view my consultation link and receive clear guidance when a link is invalid or my slot was released, so that I can join my consultation or recover from an expiry.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-33 Consultation_Link_Screen route for a located Appointment, THE Booking_App SHALL display the Appointment's Doctor, scheduled date and time, consultation mode, and appointment reference, and SHALL display a join affordance for the consultation.
2. WHEN the patient activates the join affordance on the P-33 screen, THE Booking_Wizard SHALL navigate to the Consultation_Day_Stub route.
3. WHEN the Booking_App renders the P-34 Invalid_Link_Screen route, THE Invalid_Link_Screen SHALL display a message indicating the consultation link is expired or invalid.
4. THE Invalid_Link_Screen SHALL provide a "Find my appointment" recovery action that navigates to the P-32 Find_Appointment_Screen route and a "Get help" action that navigates to the P-24 Help_Screen route.
5. WHEN the Booking_App renders the P-36 Slot_Released_Screen route, THE Slot_Released_Screen SHALL display a message indicating the previously held Slot was released.
6. WHEN the patient activates the "Pick a new time" action on the P-36 screen, THE Booking_Wizard SHALL navigate to the P-07 Doctors available step.
7. THE Consultation_Link_Screen, the Invalid_Link_Screen, and the Slot_Released_Screen SHALL source all user-facing text from the I18n_Library.

### Requirement 35: Dependent chapter P-27 Confirm your authority, P-28 Review and confirm, P-29 Follow-up booked

**User Story:** As an adult booking for a dependent, I want to attest to my authority, review the dependent booking, and receive confirmation, so that the booking is properly authorized and recorded for the dependent.

#### Acceptance Criteria

1. WHILE the Care_Subject is a Dependent, THE Booking_App SHALL present the P-27 Authority_Attestation step before the dependent booking is confirmed.
2. WHEN the Booking_App renders the P-27 route, THE Booking_App SHALL display an attestation checkbox stating that the signed-in patient confirms their authority and relationship to act for the Dependent, and SHALL display the Dependent's name and the acting relationship.
3. IF the patient activates "Continue" on the P-27 step with the attestation checkbox unchecked, THEN THE Booking_App SHALL keep the P-27 step active and SHALL display a message indicating the attestation is required.
4. WHEN the patient checks the attestation checkbox and activates "Continue", THE Session_Context SHALL store the Authority_Attestation as granted and THE Booking_Wizard SHALL navigate to the P-28 Dependent_Review_Screen route.
5. WHEN the Booking_App renders the P-28 route, THE Dependent_Review_Screen SHALL display a summary showing the Dependent as the Care_Subject, the selected reason and symptoms, the selected Doctor, the selected Slot date and time, the consultation mode, and the fee.
6. WHEN the patient activates "Confirm" on the P-28 step, THE Booking_App SHALL submit an appointment-creation request to the Booking_API via POST `/api/appointments` for the Dependent booking.
7. WHEN the Booking_API returns an appointment reference for the dependent booking, THE Session_Context SHALL store the appointment reference and THE Booking_Wizard SHALL navigate to the P-29 Follow_Up_Booked_Screen route.
8. WHEN the Booking_App renders the P-29 route, THE Follow_Up_Booked_Screen SHALL display the appointment reference, the Dependent, the selected Doctor, the scheduled date and time, and the consultation mode.
9. IF the appointment-creation request for the dependent booking fails or does not respond within 10 seconds, THEN THE Booking_App SHALL display an error message and SHALL keep the P-28 step active with the "Confirm" action available for retry.
10. IF any of the P-27, P-28, or P-29 routes is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 36: Follow-up chapter P-30 Follow-up waiting room, P-31 Follow-up complete

**User Story:** As a patient with a follow-up consultation, I want a waiting-room screen and a completion confirmation, so that I understand the follow-up status while the live portion is handled by the clinical team.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-30 Follow_Up_Waiting_Screen route, THE Follow_Up_Waiting_Screen SHALL display a waiting-room message stating that the live follow-up consultation is delivered by the clinical team and that integration is pending.
2. THE Follow_Up_Waiting_Screen SHALL provide an onward action that navigates to the P-13 Home_Dashboard route.
3. WHEN the Booking_App renders the P-31 Follow_Up_Complete_Screen route, THE Follow_Up_Complete_Screen SHALL display a confirmation that the follow-up consultation is complete together with a summary showing the Doctor, the scheduled date and time, and the consultation mode.
4. THE Follow_Up_Complete_Screen SHALL provide an action that navigates to the P-13 Home_Dashboard route.
5. THE Follow_Up_Waiting_Screen and the Follow_Up_Complete_Screen SHALL source all user-facing text from the I18n_Library.
6. IF the P-30 or P-31 route is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 37: Consent withdrawal P-38 Withdraw a consent, P-39 Consultation ended — consent withdrawn

**User Story:** As a patient, I want to withdraw a specific consent with a clear confirmation, and understand when a consultation ended because of a withdrawal, so that I control my consents and understand the outcome.

#### Acceptance Criteria

1. WHEN the Booking_App renders the P-38 Withdraw_Consent_Screen route, THE Booking_App SHALL display the targeted Consent_Record's label and a confirming prompt asking the patient to confirm withdrawal of that consent.
2. THE Withdraw_Consent_Screen SHALL display an immutable-audit note stating that the withdrawal is recorded in the medical record and cannot be removed from the audit history.
3. WHEN the patient confirms withdrawal on the P-38 step, THE Booking_App SHALL send PATCH `/api/consents/:id` to the Booking_API with the granted state set to withdrawn.
4. WHEN the Booking_API returns a successful consent-update response for the withdrawal, THE Booking_App SHALL reflect the withdrawn state for that Consent_Record.
5. IF the consent-withdrawal request fails or does not respond within 5 seconds, THEN THE Booking_App SHALL keep the Consent_Record in its prior granted state and SHALL display an error message.
6. WHEN the patient activates the cancel action on the P-38 step, THE Booking_Wizard SHALL navigate to the P-23 Consent centre route without withdrawing the consent.
7. WHEN the Booking_App renders the P-39 Consent_Withdrawn_Ended_Screen route, THE Consent_Withdrawn_Ended_Screen SHALL display an informational message stating that the consultation ended because consent was withdrawn.
8. THE Consent_Withdrawn_Ended_Screen SHALL provide an action that navigates to the P-13 Home_Dashboard route.
9. IF the P-38 or P-39 route is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.

### Requirement 38: Consultation-day stub (P-14 through P-22)

**User Story:** As a patient, I want a clear placeholder for the consultation day, so that I understand the live consultation experience is delivered separately and integration is pending.

#### Acceptance Criteria

1. WHEN the Booking_App renders the Consultation_Day_Stub route, THE Consultation_Day_Stub SHALL display a heading identifying the consultation day and a statement that the live consultation experience, covering identity check, consents, device check, waiting room, video call, documents, and survey, is delivered by the clinical team and that integration is pending.
2. THE Consultation_Day_Stub SHALL display a visible marker identifying the screen as the integration seam between the booking flow and the clinical team's consultation-day journey covering prototype screens P-14 through P-22.
3. THE Consultation_Day_Stub SHALL provide an onward action that navigates to the P-13 Home_Dashboard route.
4. THE Consultation_Day_Stub SHALL render without requesting data from the Booking_API or the Mock_Layer.
5. THE Booking_App SHALL exclude prototype screen P-18 (video call) and prototype screen P-25 (notifications) from real implementation and SHALL represent them only within the Consultation_Day_Stub placeholder where applicable.
6. THE Consultation_Day_Stub SHALL source all user-facing text from the I18n_Library.

### Requirement 39: Booking_API endpoints for the final screen batch

**User Story:** As a platform developer, I want the Java patient-booking-service to expose the lookup and listing endpoints these screens need, so that the data-backed final screens run against the active backend.

#### Acceptance Criteria

1. THE Booking_API SHALL be the Java Spring Boot patient-booking-service at `telemedicine-backend/services/patient-booking-service` listening on port 8120 and exposing JSON endpoints under the `/api` base path, reached by the Booking_App through the Vite dev proxy mapping `/api` to `localhost:8120`.
2. WHEN the Booking_API receives a GET `/api/appointments` request with a status filter of "completed" or "cancelled", THE Booking_API SHALL return the Appointments whose status matches the requested status.
3. WHEN the Booking_API receives a GET `/api/appointments/{reference}` request for a known appointment reference, THE Booking_API SHALL return the matching Appointment.
4. IF the Booking_API receives a GET `/api/appointments/{reference}` request for an unknown appointment reference, THEN THE Booking_API SHALL return a 404 RFC-7807-style problem JSON response.
5. WHEN the Booking_API receives a PATCH `/api/consents/:id` request setting the granted state to withdrawn for a known consent identifier, THE Booking_API SHALL update that Consent_Record's granted state to withdrawn and SHALL return the updated Consent_Record.
6. THE Booking_API SHALL hold all data for the final screen batch in memory without a database, so that Appointment and Consent_Record changes do not persist across service restarts.
7. THE Booking_API SHALL set permissive CORS headers for the local development frontend.
8. IF the Booking_API cannot fulfil a request for the final screen batch, THEN THE Booking_API SHALL return an RFC-7807-style problem JSON response describing the error.
9. THE implementation SHALL treat the Java patient-booking-service as the authoritative backend and SHALL treat the Node backend as a non-authoritative reference only.

### Requirement 40: Routing and guards for the final screen batch

**User Story:** As a developer, I want React Router routes and consistent guards for the final screens, so that patients can reach account, dependent, follow-up, and edge screens with the correct authentication behaviour.

#### Acceptance Criteria

1. THE App_Routing SHALL define React Router routes under the booking base path for the P-20 Past_Consultation_View, the P-24 Help_Screen, the P-32 Find_Appointment_Screen, the P-33 Consultation_Link_Screen, the P-34 Invalid_Link_Screen, the P-36 Slot_Released_Screen, the P-27 Authority_Attestation screen, the P-28 Dependent_Review_Screen, the P-29 Follow_Up_Booked_Screen, the P-30 Follow_Up_Waiting_Screen, the P-31 Follow_Up_Complete_Screen, the P-38 Withdraw_Consent_Screen, the P-39 Consent_Withdrawn_Ended_Screen, and the Consultation_Day_Stub.
2. THE App_Routing SHALL require an authenticated session for the P-20, P-24, P-27, P-28, P-29, P-30, P-31, P-36, P-38, and P-39 routes.
3. WHERE a route is a link-entry screen, THE App_Routing SHALL allow the P-32 Find_Appointment_Screen, the P-33 Consultation_Link_Screen, and the P-34 Invalid_Link_Screen to be reached without an authenticated session.
4. IF a route requiring an authenticated session is accessed without an authenticated session, THEN THE Booking_App SHALL redirect to the P-01 step.
5. THE Booking_App SHALL render the final-batch screens outside the strict linear P-01 through P-12 sequence while reusing the shell chrome, the authentication guards, and Session_Context.
6. WHEN the patient navigates to a final-batch route, THE Booking_App SHALL update the active route so that onward and recovery actions on each screen navigate to their specified destinations.
