# Implementation Plan: patient-booking-intake

## Overview

This plan implements **patient-booking**, a plain React application (Vite + React 18 + React Router 6 + TypeScript) at `telemedicine-frontend/apps/patient-booking/`, frontend-only with MSW 2 mocks, covering prototype screens P-01 through P-05. It is **not** a Module Federation remote.

Work proceeds in layers so each step builds on the previous one with no orphaned code:

1. Scaffolding (standalone-first Vite app + MSW bootstrap).
2. Shared contracts (types, BookingProvider, wizard, routes/guards, platform adapters, theme, i18n, shared components, MSW registry).
3. Pure-logic cores with property-based tests (fast-check).
4. MSW handlers per endpoint.
5. Per-screen implementation grouped by developer owner (Dev A / Dev B / Dev C), each wired into the wizard and routes as it lands.
6. Integration happy-path and coverage verification.

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Each prompt builds on the previous ones and ends with wiring things together — no hanging or orphaned code.

Testing conventions:
- Property tests use `fast-check`, run a **minimum of 100 iterations** (`fc.assert(fc.property(...), { numRuns: 100 })`), and are tagged `// Feature: patient-booking-intake, Property N: {property text}`.
- Example/integration tests use Vitest + Testing Library + MSW 2 via `@telemedicine/test-utils` `renderWithProviders` (or local fallback).
- `vitest-axe` a11y assertions run on each tested screen with zero violations.

## Tasks

- [ ] 1. Scaffold the standalone-first patient-booking app
  - [ ] 1.1 Create the Nx/pnpm project skeleton
    - Create `apps/patient-booking/` with `package.json`, `project.json` (Nx project), `tsconfig.json` + `tsconfig.app.json` (strict), `index.html`, and `.gitignore`
    - Add `vite.config.mts` as a standard React build with **NO Module Federation plugin** and `vitest.config.ts` (jsdom, coverage thresholds)
    - Create `src/app/main.tsx` as the Vite entry that renders the app root into `index.html`
    - Set default local env `VITE_AUTH_MODE=dev`, `VITE_OBSERVABILITY_MODE=dev`, `VITE_BOOKING_BASE_PATH=/booking`
    - _Requirements: 10.2, 14.2, 14.3_

  - [ ] 1.2 Add the MSW 2 dev worker bootstrap
    - Add `public/mockServiceWorker.js` and a browser worker bootstrap started from `main.tsx` in dev before React mounts
    - Ensure the app boots with `pnpm --filter patient-booking dev` with no live backend
    - _Requirements: 14.1, 14.4_

  - [ ]* 1.3 Smoke test the app boot
    - Add a minimal test that renders the empty app root and asserts it mounts without errors
    - _Requirements: 10.2_

- [ ] 2. Shared contracts — TypeScript types and pure cores (shared-contract owner)
  - [ ] 2.1 Define booking types and shared contracts
    - Create `src/shared/types/booking.ts` with `WizardStep`, `WIZARD_ORDER`, `Relationship`, `Dependent`, `CareSubject`, `SymptomChip`, `DurationValue`, `SeverityWord`, `ScanStatus`, `FileCategory`, `UploadedFile`, `Measurements`, `MedicalHistoryRecord`, `AuthStateSnapshot`, and `BookingState`
    - _Requirements: 9.5, 15.5_

  - [ ] 2.2 Implement severityWord mapping
    - Create `src/shared/state/severity.ts` with `severityWord(value: number): SeverityWord` total over 0..10 (0–2 Mild, 3–6 Moderate, 7–9 Severe, 10 Worst possible)
    - _Requirements: 4.10, 4.11_

  - [ ]* 2.3 Write property test for severity mapping
    - **Property 1: Severity mapping is total and consistent with stored value**
    - Beside `severity.ts` as `severity.property.test.ts`; assert exactly one of the four bands for every integer 0..10
    - **Validates: Requirements 4.10, 4.11**

  - [ ] 2.4 Implement file validation
    - Create `src/shared/state/validateFile.ts` with `validateFile({mime, sizeBytes})` returning ok iff type ∈ {jpeg,png,heic,pdf} and size ≤ 10 MB (boundary 10 MB accepted, +1 byte rejected)
    - _Requirements: 4.12, 4.13, 4.14_

  - [ ]* 2.5 Write property test for file validation
    - **Property 2: File validation accepts iff type and size are both allowed**
    - Cover the exact 10 MB boundary and 10 MB + 1 byte
    - **Validates: Requirements 4.12, 4.13, 4.14**

  - [ ] 2.6 Implement symptom chip-set algebra
    - Create `src/shared/state/chips.ts` with pure `addChip`/`removeChip` operations keeping selected and available sets disjoint and conserved (union by id equals original candidate set)
    - _Requirements: 4.3, 4.6, 4.7_

  - [ ]* 2.7 Write property test for chip-set algebra
    - **Property 3: Symptom chip sets stay disjoint and conserved**
    - Random add/remove sequences; assert disjointness and conservation of ids with no duplicates/loss
    - **Validates: Requirements 4.3, 4.6, 4.7**

- [ ] 3. Shared contracts — state, wizard, routing, platform, theme, i18n (shared-contract owner)
  - [ ] 3.1 Implement BookingProvider with sessionStorage persistence
    - Create `src/shared/state/BookingProvider.tsx` holding `BookingState`, mirrored to `sessionStorage` key `patient-booking.state`; expose read/update API; never persist tokens
    - Provide serialize/rehydrate helpers used by the round-trip property test
    - _Requirements: 9.3, 9.5, 9.6_

  - [ ]* 3.2 Write property test for session persistence round-trip
    - **Property 6: Session state persistence round-trips without tokens**
    - Serialize → rehydrate any valid `BookingState` to an equivalent value; assert payload has no access/refresh token fields
    - **Validates: Requirements 9.3, 9.5, 9.6**

  - [ ] 3.3 Implement useWizard controller
    - Create `src/shared/wizard/BookingWizard.ts` exposing `goNext/goBack/skip/goTo`; transitions stay within `WIZARD_ORDER`; `furthestStep` never regresses; `skip()` on P-04 clears P-04 data; keep URL and step in sync
    - _Requirements: 10.3, 9.7, 4.21_

  - [ ]* 3.4 Write property test for wizard transitions
    - **Property 5: Wizard transitions stay within P-01..P-05 and furthest step never regresses**
    - Random `goNext/goBack/skip/goTo` sequences from P-01; assert current index ∈ 0..4 and furthest non-decreasing ≥ current
    - **Validates: Requirements 10.3, 9.7**

  - [ ] 3.5 Implement platform adapters barrel with local fallbacks
    - Create `src/shared/platform/index.ts` exposing `AuthApi`, `ObservabilityApi`, `I18nApi`, and api-client surface; each adapter re-exports the real `@telemedicine/*` package when resolvable, else a local fallback (dev auth stub, console telemetry, in-memory i18n, fallback fetch)
    - Honor `VITE_AUTH_MODE=dev` (synthetic user, no IdP) and `VITE_OBSERVABILITY_MODE=dev` (console-only)
    - Hold access/refresh tokens in memory only
    - _Requirements: 7.3, 8.5, 9.1, 9.3, 9.4, 11.1, 13.1, 13.4, 15.6_

  - [ ] 3.6 Implement theme tokens and ThemeProvider
    - Create `src/shared/theme/tokens.css` (`--color-primary:#0079C8`, `--color-heading:#10294A`, `--font-family:Figtree,...`) and a ThemeProvider that prefers Design_System tokens, else injects the local sheet; layouts use fluid reflow (clamp/flex) 390–1280px with no breakpoint forks
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [ ] 3.7 Scaffold i18n namespaced bundles
    - Create `src/shared/i18n/es-CL/{common,p01,p02,p03,p04,p05}.json` and `src/shared/i18n/en/{common,p01,p02,p03,p04,p05}.json`; wire the i18n adapter with es-CL primary and en fallback for missing keys
    - Seed `common` keys needed by chrome and wizard footer
    - _Requirements: 11.1, 11.2, 11.4_

  - [ ] 3.8 Implement AppProviders and routes with JourneyGuard
    - Create `src/app/AppProviders.tsx` with the provider order ObservabilityBoundary → I18n → Theme → Auth → Booking → Router
    - Create `src/app/routes.tsx` with base path from `VITE_BOOKING_BASE_PATH`, routes for front-door/sign-in (public) and who-needs-care/reason/medical-history (guarded), plus `<base>` redirect to P-01
    - Implement `JourneyGuard`: unmet prerequisites redirect to P-01; on reset/expiry discard tokens, clear step state, restart at P-01
    - Wrap root in the Observability_Library error boundary via the adapter
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 13.1, 13.2_

  - [ ] 3.9 Implement shared chrome and UI components
    - Create `src/shared/components/BookingChrome.tsx` (Bupa wordmark, "My care", "Help", avatar initials when authenticated, omitted otherwise), `StatusPill.tsx` (always icon + colour), and `src/shared/wizard/WizardFooter.tsx` (Back/Continue/optional Skip wired to the wizard)
    - _Requirements: 7.1, 7.2, 7.3, 8.4, 8.5, 12.4_

  - [ ] 3.10 Create the MSW handler registry
    - Create `src/shared/mocks/handlers/index.ts` registry plus fixtures; export handlers for reuse by `@telemedicine/test-utils`; route all app backend calls through the api-client adapter to this registry
    - _Requirements: 14.1, 14.4, 14.5, 15.6_

  - [ ]* 3.11 Record journey timing marks per step
    - Add `observability.mark(step)` on entry to each step via a shared mount hook used by every screen
    - _Requirements: 13.3_

- [ ] 4. Checkpoint — shared layer compiles and pure-core property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. MSW handlers for all endpoints (shared-contract owner)
  - [ ] 5.1 Implement auth and record-lookup handlers
    - `POST /auth/sign-in` (200 valid `{userId,hasRecord:true}`, 401 invalid, `200 {hasRecord:false}` F-08), `POST /auth/claveunica` (success + no-record), `GET /patients/me`, `GET /patients/me/dependents` (includes an ineligible dependent)
    - _Requirements: 2.2, 2.3, 2.9, 2.12, 2.13, 3.1, 3.3, 14.1_

  - [ ] 5.2 Implement symptom-extraction and medical-history handlers
    - `POST /symptoms/extract` returning `{chips(≤15), redFlag}` plus 500 and >5s-delay branches; `GET /patients/{id}/medical-history` returning records, an empty variant, and 500/>5s error variant
    - _Requirements: 4.3, 4.5, 5.3, 5.4, 5.5, 14.1_

  - [ ]* 5.3 Write tests for the mock handlers
    - Assert each endpoint returns the documented success and error branches
    - _Requirements: 14.1, 14.4_

- [ ] 6. Dev A — P-01 Front door (`features/p01-front-door/`)
  - [ ] 6.1 Implement FrontDoorScreen, HowItWorks, EmergencyNotice
    - `FrontDoorScreen`: primary heading, "Get care now" and "I already have an appointment" actions both navigating to P-02 via the wizard; fluid reflow 390–1280px
    - `HowItWorks`: exactly four ordered steps (icon, number, title, text); `EmergencyNotice`: call 131 (SAMU) with a `tel:131` link
    - Register the route and source text from the p01 i18n namespace
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.3_

  - [ ]* 6.2 Write example + a11y tests for P-01
    - Assert actions navigate to P-02, four steps render, `tel:131` present; run vitest-axe with zero violations
    - _Requirements: 1.1, 1.4, 1.5, 12.1, 12.5_

- [ ] 7. Dev A — P-02 Sign in (`features/p02-sign-in/`)
  - [ ] 7.1 Implement useSignInAttempts counter and lockout
    - Create `useSignInAttempts.ts`: per-email `{count, lockedUntil}` in sessionStorage (not booking state); increment on reject while <5; at 5 set 15-min lockout + message; reject while locked; on expiry re-enable and reset to 0; success resets to 0
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 7.2 Write property test for the attempt counter
    - **Property 4: Attempt counter never exceeds 5 and lockout engages exactly at the threshold**
    - Random sequences of reject/success/clock-advance; assert count ∈ 0..5, lockout iff count==5 within window, success and expiry reset to 0
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

  - [ ] 7.3 Implement SignInScreen and SignInForm
    - `SignInScreen`: email, password, "Sign in", "Continue with ClaveÚnica", "Forgot your password?"
    - `SignInForm`: submit via Auth_Library PKCE; on success reset attempts and navigate to P-03; on failure stay unauthenticated with error and set `aria-invalid` on email/password; wire the lockout "Attempt N of 5" / lockout message
    - _Requirements: 2.1, 2.2, 2.3, 2.14, 9.1, 9.2, 9.4_

  - [ ] 7.4 Implement NoRecordBranch (F-08) and ClaveUnicaButton
    - `NoRecordBranch`: shows "Get help linking my record" and "Try another account"; does not create a booking or assume identity; "Try another account" clears the branch and redisplays the form
    - `ClaveUnicaButton`: initiates mocked ClaveÚnica path; on success navigate to P-03, on no-record show F-08
    - _Requirements: 2.9, 2.10, 2.11, 2.12, 2.13_

  - [ ]* 7.5 Write example + a11y tests for P-02
    - Valid sign-in navigates to P-03; invalid shows error + "Attempt N of 5" and sets `aria-invalid`; lockout at 5; no-record branch and "Try another account"; ClaveÚnica success/no-record; vitest-axe zero violations
    - _Requirements: 2.2, 2.3, 2.6, 2.9, 2.11, 2.14, 12.1, 12.5_

- [ ] 8. Dev B — patient/dependent model and DependentContextStrip
  - [ ] 8.1 Add patient/dependent model and selection state in BookingProvider
    - Extend shared state (coordinated with shared-contract owner) with care-subject selection and dependent list sourced from the mock; expose selection setters
    - _Requirements: 3.4, 15.3_

  - [ ] 8.2 Implement DependentContextStrip
    - `src/shared/components/DependentContextStrip.tsx`: shown on each applicable step while Care_Subject is a Dependent; displays name, age, acting relationship, "both identities recorded" statement, and a Consent-centre affordance; hidden when Care_Subject is the signed-in patient
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 8.3 Write tests for DependentContextStrip visibility
    - Visible for dependent subject with correct fields; hidden for self
    - _Requirements: 6.1, 6.4_

- [ ] 9. Dev B — P-03 Who needs care? (`features/p03-who-needs-care/`)
  - [ ] 9.1 Implement CareSubjectRadioGroup, CareSubjectCard, and selection logic
    - `CareSubjectRadioGroup` (`role="radiogroup"`) listing the patient + eligible dependents from the mock; `CareSubjectCard` (`role="radio"` + `aria-checked`); ineligible cards disabled and unselectable
    - Store selected Care_Subject in Session_Context; "Continue" with a selection navigates to P-04; "Back" to the preceding step; "Continue" with no selection keeps P-03 active and shows a selection-required message
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 9.2 Write example + a11y tests for P-03
    - radio roles + aria-checked, ineligible disabled, selection-required message, navigation to P-04; vitest-axe zero violations
    - _Requirements: 3.2, 3.3, 3.7, 12.1, 12.2, 12.5_

- [ ] 10. Checkpoint — P-01 → P-03 flow works end to end against mocks
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Dev C — P-04 Reason for consultation (`features/p04-reason/`)
  - [ ] 11.1 Implement SymptomTextField with debounced extraction
    - Free-text up to 2000 chars; at ≥3 non-whitespace chars debounce 500 ms then request `/symptoms/extract`; below 3 chars clear chips
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ] 11.2 Implement SymptomChips using the chip-set algebra
    - Up to 15 candidates in "Symptoms we picked up"; selected (remove control) vs available (add control) via `chips.ts`; store set in Session_Context; on extraction failure/>5s show "unavailable" and retain selected
    - _Requirements: 4.3, 4.5, 4.6, 4.7_

  - [ ] 11.3 Implement DurationRadioGroup and SeveritySlider
    - "How long?" radiogroup storing duration; `SeveritySlider` 0–10 integer, accessible name, arrow-key ±1, `aria-valuenow`/`aria-valuetext`; display `severityWord` and store value on change
    - _Requirements: 4.8, 4.9, 4.10, 4.11_

  - [ ] 11.4 Implement FileUpload with validation and scan status
    - Accept JPG/PNG/HEIC/PDF ≤10 MB via `validateFile`; reject wrong type/oversize with messages; on accept show file-type selector (Photo/Lab report/Prescription/Other) and a scan-status `StatusPill` (Pending/Scanning/Clean/Rejected)
    - _Requirements: 4.12, 4.13, 4.14, 4.15, 8.4_

  - [ ] 11.5 Implement MeasurementsBlock (dependent-only)
    - Weight 0.1–500 kg and height 1–300 cm shown only when Care_Subject is a Dependent; store in Session_Context; hidden for self
    - _Requirements: 4.16, 4.17_

  - [ ] 11.6 Implement EmergencyInterrupt red-flag alertdialog
    - `redFlag.ts` client-side phrase match; when matched render `role="alertdialog"` with accessible label urging call 131 (SAMU); "Call 131" (`tel:131`) and non-blocking "Continue" dismiss
    - _Requirements: 4.18, 4.19, 12.3_

  - [ ] 11.7 Implement ReasonScreen orchestration (Continue/Skip)
    - Compose the sub-components; "Continue" navigates to P-05 retaining P-04 data; "Skip this step" clears P-04 symptom/duration/severity/attachment/measurement data and advances to P-05
    - _Requirements: 4.20, 4.21_

  - [ ]* 11.8 Write example + a11y tests for P-04
    - Debounce triggers extraction, chips add/remove, severity word/keyboard, file type/size rejection + scan pill, measurements for dependent only, red-flag alertdialog + dismiss, Continue vs Skip; vitest-axe zero violations
    - _Requirements: 4.2, 4.6, 4.9, 4.13, 4.16, 4.18, 4.21, 12.1, 12.5_

- [ ] 12. Dev B — P-05 Confirm medical history (`features/p05-medical-history/`)
  - [ ] 12.1 Implement MedicalHistoryScreen states
    - Request history on mount; loading indicator; render records; empty-history message when none; error + retry on failure/>5s
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 12.2 Implement MedicalHistoryRow and AddMissingField
    - `MedicalHistoryRow`: `role="checkbox"` share toggle + `aria-checked`, store share state; inline edit saving a 1–2000 char correction displayed with the record and stored
    - `AddMissingField`: "Add anything missing" up to 2000 chars stored in Session_Context
    - _Requirements: 5.6, 5.7, 5.8, 5.9_

  - [ ] 12.3 Implement the confirm gate
    - "Confirm and continue" disabled until the request resolves (records or empty); on activate mark confirmed and complete P-05; "Back" to the preceding step
    - _Requirements: 5.10, 5.11, 5.12_

  - [ ]* 12.4 Write example + a11y tests for P-05
    - loading/records/empty/error+retry, checkbox toggle + aria-checked, correction save, confirm gate disabled→enabled; vitest-axe zero violations
    - _Requirements: 5.2, 5.4, 5.5, 5.6, 5.10, 12.1, 12.5_

- [ ] 13. Integration and final wiring (shared-contract owner)
  - [ ] 13.1 Wire the full wizard and chrome across all screens
    - Ensure BookingChrome, DependentContextStrip, and WizardFooter render on each applicable step; confirm guards/redirects and that step state persists and reads back across navigation
    - _Requirements: 7.1, 7.2, 9.5, 9.6, 10.3, 10.5_

  - [ ]* 13.2 Write the P-01 → P-05 happy-path integration test and verify coverage
    - End-to-end test (self subject): front door → sign in → who needs care → reason → confirm history, against MSW; add a dependent-subject variant covering the context strip + measurements
    - Verify ≥80% line coverage and zero `jsx-a11y`/`vitest-axe` violations in CI
    - _Requirements: 12.5, 14.5, 14.6_

- [ ] 14. Optional polish (not required for a working P-01..P-05 flow)
  - [ ]* 14.1 Implement resume-to-furthest-step
    - On entry to `<base>` with non-expired state, resume at `furthestStep`; verify reset/expiry restarts at P-01 and discards tokens
    - _Requirements: 9.7, 9.8_

  - [ ]* 14.2 Complete full es-CL/en translation coverage
    - Fill all P-01..P-05 namespaces for both locales; add an i18n key-coverage/fallback test
    - _Requirements: 11.2, 11.3, 11.4_

- [ ] 15. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the unmarked set delivers a working P-01..P-05 flow against MSW mocks.
- Each task references specific requirements and, for pure cores, the design correctness property it validates.
- Checkpoints ensure incremental validation at natural boundaries.
- Property tests (`fast-check`, ≥100 runs) validate the six universal properties; example/integration tests pin concrete behavior and wiring.
- Ownership: Dev A = tasks 6–7; Dev B = tasks 8, 9, 12; Dev C = task 11; shared-contract owner = tasks 1–5, 13–15.

---

# Extension: Backend (Booking_API) and screens P-06..P-12

> This section extends the plan above to cover the extended scope (Requirements 16–24, design "Extension" section). It introduces a real Node + Express backend (`apps/patient-booking-api`) as the default data path with MSW retained as an opt-in fallback (`VITE_USE_MOCKS=true`), extends the wizard to P-01..P-12, and adds frontend screens P-06..P-12. Correctness Properties 7–9 (triage advancement, appointment-reference format, doctor filter/sort) carry the new property-based tests. Backend property/unit tests use `fast-check` (≥100 iterations) + supertest-style integration; frontend screen tests use Vitest + Testing Library + MSW 2 via `renderWithProviders` with `vitest-axe` a11y assertions.

- [ ] 16. Backend — Booking_API extensions (shared-contract owner)
  - [ ] 16.1 Add problem-JSON helper and error middleware
    - Create `src/problem.js` producing an RFC-7807-ish envelope `{type, title, status, detail}` and an Express error-handling middleware that serialises thrown/forwarded errors to it
    - Wire the middleware as the last app handler so all new endpoints emit the documented error shape
    - _Requirements: 23.1, 23.2_

  - [ ] 16.2 Implement the Triage_Provider seam and MockTriageProvider
    - Create `src/triage/TriageProvider.js` interface (`startTriage`, `submitAnswer`, `buildResult`) and `src/triage/MockTriageProvider.js` with in-memory triage sessions keyed by `sessionId` (≤3 questions, index within 1..total, strictly increasing; "skip the rest" at any point yields a result)
    - Add `selectProvider()` factory returning the mock now and ready to return an `LlmTriageProvider` later with no contract change
    - _Requirements: 16.3, 16.5, 16.6, 23.3_

  - [ ] 16.3 Add triage endpoints
    - `POST /api/triage/start` (creates a session, returns the first question), `POST /api/triage/answer` (records a Yes/No or skip, returns the next question or signals completion), `GET /api/triage/result/:sessionId` (returns the `TriageResult` with specialty, video hint, and the answered-question summary)
    - Route all through `selectProvider()`; emit the problem-JSON shape for unknown/expired sessions
    - _Requirements: 16.1, 16.3, 16.4, 23.4_

  - [ ] 16.4 Add doctors data and query endpoints
    - Create `src/data/doctors.js` with a static seed `Doctor[]` and pure `filterBySpecialty` / `sortBy` helpers; add `GET /api/doctors?specialty=&sort=` (empty array for an unmatched filter is a normal `200`) and `GET /api/doctors/:id` (404 problem-JSON when missing)
    - _Requirements: 17.1, 17.2, 17.8, 23.5_

  - [ ] 16.5 Add doctor availability endpoint
    - `GET /api/doctors/:id/slots` returning the per-doctor `Slot[]` from the seed; 404 problem-JSON for an unknown doctor
    - _Requirements: 18.1, 18.2, 23.5_

  - [ ] 16.6 Add cover-quote endpoint
    - Create `src/data/cover.js` returning a fixed `{feeClp, currency: "CLP", note}` (no FONASA/isapre or eligibility logic); add `GET /api/cover/quote` whose `feeClp` matches the selected doctor's `priceClp`
    - _Requirements: 19.1, 19.2, 23.6_

  - [ ] 16.7 Add appointment-creation endpoint
    - Create `src/data/appointments.js` with `Map<reference, Appointment>` and a reference generator producing `TM-XXXXXX` (6 base-36 uppercase chars, unique per service run); add `POST /api/appointments` creating an in-memory `Appointment` (echoing doctor/slot/mode, `status: "confirmed"`, `feeClp` equal to the cover fee) and returning its reference
    - _Requirements: 21.4, 21.5, 22.1, 23.7_

  - [ ]* 16.8 Backend unit, property, and smoke tests
    - Unit tests for `MockTriageProvider`, the `doctors.js` filter/sort helpers, the reference generator, and the `problem.js` envelope; a supertest-style integration pass over the new endpoints asserting status codes and the RFC-7807 error shape
    - **Property 7: Triage asks at most 3 questions then yields a result** (against `MockTriageProvider`)
    - **Property 8: Appointment reference format and uniqueness** (against the appointment store)
    - **Property 9: Doctor query filtering and sorting are sound** (against the `doctors.js` helpers)
    - **Validates: Requirements 16.3, 16.5, 16.6, 21.4, 21.5, 22.1, 23.3, 23.7** and Properties 7, 8, 9
    - _Requirements: 23.1, 23.2, 23.3, 23.5, 23.7_

- [ ] 17. Shared contracts — frontend types, wizard, routes, MSW (shared-contract owner)
  - [ ] 17.1 Extend booking types and BookingState
    - Extend `src/shared/types/booking.ts` with `TriageQuestion`, `TriageAnswer`, `TriageResult`, `TriageStatus`, `Doctor`, `Slot`, `CoverQuote`, `Appointment`, `AppointmentStatus`, and `ConsultationMode` (`video | in-person`)
    - Extend `BookingState` with `triage` state, `specialtyFilter`, `selectedDoctor`, `selectedSlot`, `coverQuote`, and `appointmentRef`; update `createInitialBookingState()` to initialise them
    - _Requirements: 16.3, 17.1, 18.1, 19.1, 20.1, 21.4, 22.1, 24.1_

  - [ ] 17.2 Extend the wizard model to P-01..P-12
    - Extend `WizardStep`, `WIZARD_ORDER`, and `STEP_PATHS` to cover P-06..P-12; update `useWizard` so transitions and `furthestStep` span the full P-01..P-12 order while keeping URL and step in sync
    - _Requirements: 24.1, 24.2_

  - [ ] 17.3 Extend routes and JourneyGuard
    - Add routes in `src/app/routes.tsx` for triage, doctors, doctor-slot, cover, review, payment, and confirmed; extend `JourneyGuard` so steps ≥ P-09 require a selected doctor + slot and P-12 requires an `appointmentRef`, redirecting to the earliest unmet prerequisite otherwise
    - _Requirements: 24.1, 24.2, 10.3, 10.4_

  - [ ] 17.4 Extend MSW handlers and fixtures (opt-in)
    - Add handlers + fixtures mirroring the backend endpoints (triage start/answer/result, doctors list/detail, slots, cover quote, appointments) to the registry so `VITE_USE_MOCKS=true` and tests exercise the same contract the Booking_API serves
    - _Requirements: 14.1, 14.4, 14.6_

  - [ ]* 17.5 Property/unit tests for new frontend pure logic
    - If any client-side pure logic is added (e.g. appointment-reference format validation, client doctor filter/sort mirrors), add tests referencing the relevant design property
    - **Property 8: Appointment reference format** and **Property 9: Doctor query filtering and sorting** where mirrored client-side
    - **Validates: Requirements 17.2, 21.4** and Properties 8, 9

- [ ] 18. Dev C — P-06 Quick check / AI triage (`features/p06-triage/`)
  - [ ] 18.1 Implement TriageScreen orchestrator and sub-components
    - `TriageScreen`: disclosure → question → result → skipped states driven entirely by the Booking_API (no hardcoded triage logic)
    - `TriageDisclosure` (explains the quick check), `TriageQuestion` (progress indicator + "skip the rest"), `TriageResult` (suggested specialty, video hint, explicit no-emergency statement, answer summary, "Use this" → P-07, "Choose differently" → P-07), `TriageSkipped` ("See all available doctors" → P-07); include the call-131 (SAMU) note; P-06 timing mark
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 13.3_

  - [ ]* 18.2 Write example + a11y tests for P-06
    - Disclosure→question→result and skipped paths, progress + skip, result navigation to P-07, 131 note present; vitest-axe zero violations
    - _Requirements: 16.1, 16.4, 16.6, 12.1, 12.5_

- [ ] 19. Dev A — P-07 Doctors available (`features/p07-doctors/`)
  - [ ] 19.1 Implement DoctorsScreen, list, filter, and sort
    - `DoctorsScreen` fetches the list via the Booking_API; `DoctorList`/`DoctorCard` show name, specialty, rating, next availability, mode, and price; `SpecialtyFilter` and `SortControl` re-query; empty result renders a no-matches message (not an error); selecting a doctor stores it and navigates to P-08; include the 131 note; advanced filters deferred; P-07 timing mark
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 13.3_

  - [ ]* 19.2 Write example + a11y tests for P-07
    - List renders fields, filter/sort re-query, empty-state message, selection navigates to P-08; vitest-axe zero violations
    - _Requirements: 17.2, 17.5, 17.8, 12.1, 12.5_

- [ ] 20. Dev A — P-08 Doctor profile and time (`features/p08-doctor-slot/`)
  - [ ] 20.1 Implement DoctorProfile and SlotPicker
    - `DoctorProfile` shows the selected doctor's detail; `SlotPicker` fetches `/doctors/:id/slots` and lets the user pick a slot; selecting a slot stores the selection and enables "Continue" → P-09; "Back" → P-07; P-08 timing mark
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 13.3_

  - [ ]* 20.2 Write example + a11y tests for P-08
    - Profile + slots render, slot selection enables continue to P-09, back to P-07; vitest-axe zero violations
    - _Requirements: 18.2, 18.3, 12.1, 12.5_

- [ ] 21. Dev B — P-09 Your cover and cost (`features/p09-cover/`)
  - [ ] 21.1 Implement CoverCostScreen
    - Fetch the fixed quote via `/cover/quote`; display the fee and a "nothing charged until you confirm" statement; "Continue" → P-10; P-09 timing mark
    - _Requirements: 19.1, 19.2, 19.3, 13.3_

  - [ ]* 21.2 Write example + a11y tests for P-09
    - Fee and no-charge-yet statement render, continue to P-10; vitest-axe zero violations
    - _Requirements: 19.2, 19.3, 12.1, 12.5_

- [ ] 22. Dev B — P-10 Review and confirm (`features/p10-review/`)
  - [ ] 22.1 Implement ReviewScreen
    - Summarise care subject, reason, doctor, slot, mode, and fee with edit links routing back to the relevant step; "Confirm" → P-11; P-10 timing mark
    - _Requirements: 20.1, 20.2, 20.3, 13.3_

  - [ ]* 22.2 Write example + a11y tests for P-10
    - Summary fields + edit links render, confirm navigates to P-11; vitest-axe zero violations
    - _Requirements: 20.1, 20.2, 12.1, 12.5_

- [ ] 23. Dev C — P-11 Payment (`features/p11-payment/`)
  - [ ] 23.1 Implement PaymentScreen (frontend-mocked)
    - Show mock payment methods, the fee/total, and a "slot held" note; "Pay" enters a processing state, then on mock success submits `POST /api/appointments`, stores the returned `appointmentRef`, and advances to P-12; on failure/timeout (10 s) show an error and keep pay available for retry; capture/store no card data and contact no gateway; P-11 timing mark
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 13.3_

  - [ ]* 23.2 Write example + a11y tests for P-11
    - Processing→success path creates the appointment and advances to P-12 storing the reference; retry-on-failure branch; no card data captured; vitest-axe zero violations
    - _Requirements: 21.2, 21.3, 21.4, 12.1, 12.5_

- [ ] 24. Dev B — P-12 Booking confirmed (`features/p12-confirmed/`)
  - [ ] 24.1 Implement ConfirmedScreen
    - Show the appointment reference, doctor, scheduled date/time, and mode; a "what happens next" summary; a statement that P-12 ends the in-scope flow and the video day (P-14 onward) is a separate team's; P-12 timing mark
    - _Requirements: 22.1, 22.2, 22.3, 13.3_

  - [ ]* 24.2 Write example + a11y tests for P-12
    - Reference, doctor, when, mode, and what-happens-next render; vitest-axe zero violations
    - _Requirements: 22.1, 22.2, 22.3, 12.1, 12.5_

- [ ] 25. Integration and final wiring (shared-contract owner)
  - [ ] 25.1 Wire P-06..P-12 into the wizard after P-05
    - Register the new screens in order after P-05; ensure chrome, dependent context strip, and wizard footer render on each applicable step; confirm the new guards/redirects and that selection/triage/appointment state persists and reads back across navigation; confirm the backend endpoints respond
    - _Requirements: 24.1, 24.2, 10.3, 10.5_

  - [ ]* 25.2 Write the P-01 → P-12 happy-path integration test and verify coverage
    - End-to-end test (self subject) front door → … → confirmed against MSW (`VITE_USE_MOCKS=true`), covering triage result → doctor select → slot → cover → review → mock payment → confirmed
    - Verify ≥80% line coverage and zero `jsx-a11y`/`vitest-axe` violations in CI
    - _Requirements: 24.1, 24.2, 14.5, 14.6_

- [ ] 26. Final checkpoint — ensure all tests pass and both servers run
  - Ensure all tests pass, confirm `patient-booking` and `patient-booking-api` both start, and ask the user if questions arise.

## Extension Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the unmarked set delivers a working P-01..P-12 flow against the Booking_API (MSW opt-in via `VITE_USE_MOCKS`).
- Backend tasks (16.x) and frontend shared-contract tasks (17.x) touch different files and can proceed in parallel; the new screens (18–24) depend on the shared frontend contract (17.x) and the backend endpoints (16.x).
- Property tests (`fast-check`, ≥100 runs) validate the three new universal properties (7 triage advancement, 8 appointment reference, 9 doctor filter/sort) on the backend; example/integration tests pin screen behaviour and wiring.
- Ownership (extension): backend + shared-contract owner = tasks 16, 17, 25, 26; Dev A = tasks 19, 20; Dev B = tasks 21, 22, 24; Dev C = tasks 18, 23.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6"] },
    { "id": 3, "tasks": ["2.3", "2.5", "2.7", "3.1", "3.3", "3.5", "3.6", "3.7"] },
    { "id": 4, "tasks": ["3.2", "3.4", "3.8", "3.9", "3.10", "3.11", "8.1"] },
    { "id": 5, "tasks": ["5.1", "5.2", "7.1", "8.2"] },
    { "id": 6, "tasks": ["5.3", "6.1", "7.2", "7.3", "8.3", "9.1", "11.1", "11.3", "11.4", "11.5", "11.6", "12.1"] },
    { "id": 7, "tasks": ["6.2", "7.4", "9.2", "11.2", "12.2"] },
    { "id": 8, "tasks": ["7.5", "11.7", "12.3"] },
    { "id": 9, "tasks": ["11.8", "12.4", "13.1"] },
    { "id": 10, "tasks": ["13.2", "14.1", "14.2"] },
    { "id": 11, "tasks": ["16.1", "17.1"] },
    { "id": 12, "tasks": ["16.2", "16.4", "16.6", "17.2"] },
    { "id": 13, "tasks": ["16.3", "16.5", "16.7", "17.3", "17.4"] },
    { "id": 14, "tasks": ["16.8", "17.5", "18.1", "19.1", "21.1", "22.1", "24.1"] },
    { "id": 15, "tasks": ["18.2", "19.2", "20.1", "21.2", "22.2", "23.1", "24.2"] },
    { "id": 16, "tasks": ["20.2", "23.2", "25.1"] },
    { "id": 17, "tasks": ["25.2"] }
  ]
}
```

---

# Extension: Manage-your-care (screens P-13, P-37, P-23, P-35)

> This section extends the plan to cover the manage-your-care batch (Requirements 25–30, design "Extension: Manage-your-care" section). It adds post-booking management endpoints to the Booking_API (`apps/patient-booking-api`) and four management screens that live **outside** the P-01..P-12 booking wizard: P-13 Home / My care, P-37 Cancel consultation, P-23 Consent centre, and P-35 Welcome back. These routes are auth-guarded (not wizard steps) and are **not** added to `WizardStep`/`STEP_PATHS`. Correctness Property 10 (cancelled appointments never appear in the upcoming list) carries the new backend property check. Backend tests use `fast-check` (≥100 iterations) + supertest-style integration; frontend screen tests use Vitest + Testing Library + MSW 2 via `renderWithProviders` with `vitest-axe` a11y assertions.

- [ ] 27. Backend — manage-your-care endpoints (shared-contract owner)
  - [ ] 27.1 Extend the appointment store with list and cancel
    - Extend `src/appointments.js` with `listAppointments(statusFilter?)` (returns all appointments, optionally filtered by status) and `cancelAppointment(reference)` (sets `status: "cancelled"`, returns the updated appointment, or signals not-found for an unknown reference); keep the existing `Map<reference, Appointment>` store and `createAppointment`
    - _Requirements: 29.1, 29.2_

  - [ ] 27.2 Add the in-memory consents store
    - Create `src/consents.js` with an in-memory seed of consent records (platform terms & conditions, clinical informed consent, data-sharing) and pure helpers `getConsents()` (returns the current records) and `setConsent(id, granted)` (updates one record's granted flag, or signals not-found for an unknown id)
    - _Requirements: 27.1, 27.2, 29.3_

  - [ ] 27.3 Wire the management endpoints in server.js
    - Add `GET /api/appointments?status=` (returns the list via `listAppointments`, filtered when `status` is present), `POST /api/appointments/:reference/cancel` (cancels via `cancelAppointment`; 404 problem-JSON for an unknown reference), `GET /api/consents` (returns `getConsents()`), and `PATCH /api/consents/:id` (toggles via `setConsent`; 404 problem-JSON for an unknown id)
    - Route all errors through the existing `src/problem.js` envelope and error middleware
    - _Requirements: 29.1, 29.2, 29.3_

  - [ ]* 27.4 Backend unit, property, and smoke tests
    - Smoke/integration pass: `createAppointment` → `GET /api/appointments` shows it → `POST /api/appointments/:reference/cancel` → the list marks it cancelled and the upcoming (non-cancelled) view excludes it; `GET /api/consents` → `PATCH /api/consents/:id` toggles the granted flag and the subsequent GET reflects it; assert 404 problem-JSON for unknown reference and unknown consent id
    - **Property 10: Cancelled appointments never appear in the upcoming list**
    - Random sequences of create/cancel; assert no appointment with `status: "cancelled"` is present in the upcoming (non-cancelled) filter and that cancellation is idempotent
    - **Validates: Requirements 29.1, 29.2**
    - _Requirements: 29.1, 29.2, 29.3_

- [ ] 28. Shared contracts — frontend types and routing (shared-contract owner)
  - [ ] 28.1 Extend booking types for management
    - Extend `src/shared/types/booking.ts`: define `AppointmentStatus = "confirmed" | "cancelled"` and add `ConsentRecord { id: string; label: string; description: string; granted: boolean }`
    - _Requirements: 25.1, 26.1, 27.1_

  - [ ] 28.2 Add management routes and guards (not wizard steps)
    - Add `MANAGE_PATHS` constants (`home`, `cancel`, `consentCentre`, `welcomeBack`) and register their routes in `src/app/routes.tsx` under the booking base path, each wrapped in `JourneyGuard` with `requires=["authenticated"]` (the cancel route additionally requires an appointment context via `requires=["authenticated","appointment"]`)
    - Do NOT add these paths to `WizardStep` or `STEP_PATHS` — they are management screens outside the P-01..P-12 wizard
    - _Requirements: 30.1, 30.2_

  - [ ]* 28.3 MSW handlers and fixtures for management endpoints (opt-in)
    - Add handlers + fixtures mirroring the backend endpoints (`GET /api/appointments`, `POST /api/appointments/:reference/cancel`, `GET /api/consents`, `PATCH /api/consents/:id`) to the registry so `VITE_USE_MOCKS=true` and tests exercise the same contract the Booking_API serves
    - _Requirements: 14.1, 14.4, 29.1, 29.2, 29.3_

- [ ] 29. Dev B — P-13 Home / My care (`features/p13-home/`)
  - [ ] 29.1 Implement HomeScreen and UpcomingCard
    - `HomeScreen`: fetch `GET /api/appointments` with loading/empty/list states; render upcoming appointments only (cancelled excluded); auth-guarded via the management route
    - `UpcomingCard`: show doctor, when, mode, and reference with "View" and "Cancel" actions (Cancel routes to P-37 with the appointment context)
    - "New consultation" resets booking state and navigates to P-01
    - Add a "Go to My care" action on the P-12 `ConfirmedScreen` that navigates to P-13
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ]* 29.2 Write example + a11y tests for P-13
    - Loading/empty/list states render, cancelled appointments excluded from upcoming, "New consultation" resets state and goes to P-01, UpcomingCard fields and View/Cancel actions present; vitest-axe zero violations
    - _Requirements: 25.1, 25.3, 25.4, 12.1, 12.5_

- [ ] 30. Dev B — P-37 Cancel consultation (`features/p37-cancel/`)
  - [ ] 30.1 Implement CancelScreen
    - `CancelScreen`: show the appointment summary (doctor, when, mode, reference) and a confirm prompt; "Cancel this consultation" calls `POST /api/appointments/:reference/cancel`; on success return to P-13 where the appointment no longer appears upcoming; on failure show an error and keep the appointment; "Keep appointment" returns to P-13 without changes
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

  - [ ]* 30.2 Write example + a11y tests for P-37
    - Summary + confirm prompt render, successful cancel returns to P-13 and drops the appointment from upcoming, failure keeps it with an error, "Keep appointment" returns without changes; vitest-axe zero violations
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 12.1, 12.5_

- [ ] 31. Dev C — P-23 Consent centre (`features/p23-consent-centre/`)
  - [ ] 31.1 Implement ConsentCentreScreen and ConsentToggle
    - `ConsentCentreScreen`: fetch `GET /api/consents` and render each record; `ConsentToggle` uses `role="switch"` with `aria-checked`; toggling issues `PATCH /api/consents/:id` with an optimistic update that reverts on error
    - Include a display-only note that past consents are shown for reference; "Back" returns to P-13 Home
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

  - [ ]* 31.2 Write example + a11y tests for P-23
    - Consents render, switch role + aria-checked, optimistic toggle persists on success and reverts on error, display-only past-consents note present, back to Home; vitest-axe zero violations
    - _Requirements: 27.1, 27.2, 27.3, 12.1, 12.5_

- [ ] 32. Dev C — P-35 Welcome back (`features/p35-welcome-back/`)
  - [ ] 32.1 Implement WelcomeBackScreen
    - `WelcomeBackScreen`: greet the user by name; render a progress stepper over `WIZARD_ORDER` with the `furthestStep` highlighted; "Resume" navigates to the furthest step; "Start over" resets booking state and goes to P-01; show a "slot held" status when a doctor and slot are selected but no `appointmentRef` exists; display no notification content
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

  - [ ]* 32.2 Write example + a11y tests for P-35
    - Greeting by name, stepper highlights furthest step, Resume goes to furthest step, Start over resets to P-01, "slot held" status shown only when doctor+slot selected and no appointmentRef, no notification content; vitest-axe zero violations
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 12.1, 12.5_

- [ ] 33. Integration and final wiring (shared-contract owner)
  - [ ] 33.1 Wire the management routes and P-12 entry point
    - Register the four management routes (P-13 home, P-37 cancel, P-23 consent-centre, P-35 welcome-back) and the P-12 "Go to My care" action; type-check the app; run an end-to-end API check (create → P-13 home lists it → cancel → gone from upcoming; consents GET → PATCH toggles → GET reflects); confirm both `patient-booking` and `patient-booking-api` start
    - _Requirements: 30.1, 30.2_

  - [ ]* 33.2 Write the management-flow integration test and verify coverage
    - End-to-end test against MSW (`VITE_USE_MOCKS=true`): Home lists an upcoming appointment → open Cancel → confirm → Home no longer shows it; open Consent centre → toggle a consent; open Welcome back → Resume lands on the furthest step
    - Verify ≥80% line coverage and zero `jsx-a11y`/`vitest-axe` violations in CI
    - _Requirements: 30.1, 30.2, 14.5, 14.6_

- [ ] 34. Final checkpoint — ensure all tests pass and both servers run
  - Ensure all tests pass, confirm `patient-booking` and `patient-booking-api` both start, and ask the user if questions arise.

## Manage-your-care Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the unmarked set delivers a working manage-your-care flow (Home → Cancel, Consent centre, Welcome back) against the Booking_API (MSW opt-in via `VITE_USE_MOCKS`).
- The four management screens are auth-guarded routes, not wizard steps — they are intentionally excluded from `WizardStep`/`STEP_PATHS`.
- Backend tasks (27.x) and frontend shared-contract tasks (28.x) touch different files and can proceed in parallel; the new screens (29–32) depend on the shared frontend contract (28.x) and the backend endpoints (27.x).
- Property test (`fast-check`, ≥100 runs) validates Property 10 (cancelled appointments never appear in the upcoming list) on the backend; example/integration tests pin screen behaviour and wiring.
- Ownership (manage-your-care): backend + shared-contract owner = tasks 27, 28, 33, 34; Dev B = tasks 29, 30; Dev C = tasks 31, 32.

## Task Dependency Graph (Manage-your-care extension)

```json
{
  "waves": [
    { "id": 18, "tasks": ["27.1", "27.2", "28.1"] },
    { "id": 19, "tasks": ["27.3", "28.2", "28.3"] },
    { "id": 20, "tasks": ["27.4", "29.1", "30.1", "31.1", "32.1"] },
    { "id": 21, "tasks": ["29.2", "30.2", "31.2", "32.2", "33.1"] },
    { "id": 22, "tasks": ["33.2"] }
  ]
}
```

---

# Extension: Final screen batch (P-20, P-24, P-27..P-39 + Consultation-day stub)

> This section extends the plan to cover the final screen batch (Requirements 31-40, design "Extension: Final screen batch" section). It adds two endpoints to the **authoritative Java** patient-booking-service (`telemedicine-backend/services/patient-booking-service`, port 8120) and fourteen frontend screens plus one stub that live **outside** the linear P-01..P-12 wizard. The screens are a mix: data-backed screens (P-20, P-32, P-33, P-28, P-38) call the Java backend through the `apiClient` adapter; informational screens (P-24, P-34, P-36, P-29, P-30, P-31, P-39, Consultation_Day_Stub) render from the I18n_Library only. No new universal correctness property is introduced; the backend additions are covered by example/integration tests. Frontend screen tests use Vitest + Testing Library + MSW 2 via `renderWithProviders` with `vitest-axe` a11y assertions.

- [ ] 35. Backend (Java) - final-batch endpoints (shared-contract owner)
  - [ ] 35.1 Seed past appointments and add lookup-by-reference in BookingData
    - In `BookingData`, seed at construction at least one `"completed"` and one `"cancelled"` Appointment (reusing existing Doctor/Slot shapes and `TM-XXXXXX` references) so P-20 has data without a live booking; add a `getAppointment(String reference)` returning `Optional<Appointment>`
    - Widen the `Appointment` domain record's `status` to allow `"completed"` in addition to `"confirmed"` / `"cancelled"`
    - _Requirements: 31.2, 33.3, 39.2, 39.3, 39.6_

  - [ ] 35.2 Add GET /api/appointments/{reference} to BookingController
    - Add a handler that calls `data.getAppointment(reference)` and throws `ResponseStatusException(NOT_FOUND, ...)` when absent so the existing `ApiExceptionHandler` renders RFC-7807 problem JSON; confirm the existing `GET /api/appointments?status=` returns the seeded completed/cancelled records and the reused `POST /api/appointments` and `PATCH /api/consents/{id}` cover the dependent-booking and consent-withdrawal paths
    - _Requirements: 33.3, 35.6, 37.3, 39.3, 39.4, 39.5, 39.8_

  - [ ]* 35.3 Backend tests for the final-batch endpoints
    - Extend the service tests: `listAppointments("completed")` and `("cancelled")` return the seeds; `getAppointment` known -> record, unknown -> empty; MockMvc-style pass over `GET /api/appointments/{reference}` asserting 200 for a known reference and the RFC-7807 404 shape for an unknown one; confirm `compileJava` / `test` build stays green
    - _Requirements: 39.3, 39.4, 39.8_

- [ ] 36. Shared contracts - types and routing for the final batch (shared-contract owner)
  - [ ] 36.1 Extend booking types for the final batch
    - In `src/shared/types/booking.ts`: widen `AppointmentStatus` to `"confirmed" | "cancelled" | "completed"`; add `AuthorityAttestation { granted; dependentName; relationship }`; add an optional `authorityAttestation: AuthorityAttestation | null` to `BookingState` and initialise it to `null` in `createInitialBookingState()`
    - _Requirements: 31.4, 35.4_

  - [ ] 36.2 Add final-batch routes and guards (not wizard steps)
    - In `src/app/routes.tsx`, register the fourteen routes under the booking base path: `past-consultations` (P-20), `help` (P-24), `find-appointment` (P-32), `consultation-link` (P-33), `invalid-link` (P-34), `slot-released` (P-36), `authority` (P-27), `dependent-review` (P-28), `follow-up-booked` (P-29), `follow-up-waiting` (P-30), `follow-up-complete` (P-31), `withdraw-consent` (P-38), `consent-ended` (P-39), `consultation-day` (Consultation_Day_Stub)
    - Wrap the auth-required routes (P-20, P-24, P-27, P-28, P-29, P-30, P-31, P-36, P-38, P-39, Consultation_Day_Stub) in `JourneyGuard requires={["authenticated"]}`; render the link-entry routes (P-32, P-33, P-34) with NO guard so they are reachable unauthenticated
    - Do NOT add any of these paths to `WizardStep` / `STEP_PATHS`
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6_

  - [ ]* 36.3 MSW handlers and fixtures for the final batch (opt-in)
    - Mirror `GET /api/appointments?status=completed|cancelled`, `GET /api/appointments/{reference}` (found + 404), the reused `POST /api/appointments` and `PATCH /api/consents/{id}` in the MSW registry so `VITE_USE_MOCKS=true` and tests exercise the same contract the Java backend serves
    - _Requirements: 31.2, 33.3, 39.3, 39.4_

- [ ] 37. Dev B - P-20 Past consultation (`features/p20-past-consultations/`)
  - [ ] 37.1 Implement PastConsultationsScreen, row, and detail
    - On mount request past appointments via `GET /api/appointments?status=completed` and `?status=cancelled` (merged); loading / list / empty / error+retry states; `PastConsultationRow` shows Doctor, date/time, mode, reference, status and is selectable; `PastConsultationDetail` shows the selected appointment's fields; auth-guarded; P-20 timing mark
    - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7, 31.8_

  - [ ]* 37.2 Write example + a11y tests for P-20
    - loading/list/empty/error+retry, row->detail selection, unauthenticated redirect to P-01; vitest-axe zero violations
    - _Requirements: 31.3, 31.5, 31.6, 31.7, 12.1, 12.5_

- [ ] 38. Dev A - P-24 Help and P-32/P-33/P-34 link-entry screens
  - [ ] 38.1 Implement HelpScreen (P-24)
    - FAQ section, contact-options section, emergency notice with `tel:131`; all text from i18n; no backend/Mock_Layer request; reachable from the shell "Help" entry; P-24 timing mark
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

  - [ ] 38.2 Implement FindAppointmentScreen (P-32)
    - Reference input + "Find appointment"; empty input keeps the step with a "reference required" message; non-empty submits `GET /api/appointments/{reference}` with a loading indicator and disabled action while in flight; match -> P-33 for that appointment; no match -> not-found message; failure/>5s -> error + re-enabled action; public (no guard); P-32 timing mark
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7_

  - [ ] 38.3 Implement ConsultationLinkScreen (P-33) and InvalidLinkScreen (P-34)
    - P-33: resolve the located appointment (navigation state or `?ref=` lookup); show Doctor, date/time, mode, reference, and a join affordance; join -> Consultation_Day_Stub; i18n text; public; P-33 timing mark
    - P-34: expired/invalid-link message; "Find my appointment" -> P-32; "Get help" -> P-24; i18n text; public; P-34 timing mark
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.7_

  - [ ]* 38.4 Write example + a11y tests for P-24 / P-32 / P-33 / P-34
    - P-24 sections + `tel:131` + no backend call; P-32 required/loading/match->P-33/not-found/error; P-33 fields + join->stub; P-34 recovery actions; link-entry routes render unauthenticated; vitest-axe zero violations
    - _Requirements: 32.2, 32.3, 33.2, 33.5, 33.6, 34.2, 34.4, 40.3, 12.1, 12.5_

- [ ] 39. Dev B - P-36 Slot released (`features/p36-slot-released/`)
  - [ ] 39.1 Implement SlotReleasedScreen
    - Message that the previously held slot was released; "Pick a new time" -> P-07 Doctors available; i18n text; auth-guarded; P-36 timing mark
    - _Requirements: 34.5, 34.6, 34.7, 40.2_

  - [ ]* 39.2 Write example + a11y tests for P-36
    - Released message renders, "Pick a new time" navigates to P-07; vitest-axe zero violations
    - _Requirements: 34.5, 34.6, 12.1, 12.5_

- [ ] 40. Dev C - Dependent chapter P-27 / P-28 / P-29
  - [ ] 40.1 Implement AuthorityAttestationScreen (P-27)
    - Shown while Care_Subject is a Dependent before confirming; attestation checkbox stating the signed-in patient confirms authority + relationship, plus the Dependent's name and acting relationship; "Continue" with the box unchecked keeps the step active with an "attestation required" message; checking + Continue stores the Authority_Attestation as granted in Session_Context and navigates to P-28; auth-guarded; P-27 timing mark
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.10_

  - [ ] 40.2 Implement DependentReviewScreen (P-28) and FollowUpBookedScreen (P-29)
    - P-28: summary of Dependent-as-Care_Subject, reason + symptoms, Doctor, Slot date/time, mode, fee; "Confirm" submits `POST /api/appointments`; success stores the reference and -> P-29; failure/>10s -> error, keep P-28 with Confirm available for retry
    - P-29: show the appointment reference, Dependent, Doctor, scheduled date/time, mode; auth-guarded; P-29 timing mark
    - _Requirements: 35.5, 35.6, 35.7, 35.8, 35.9, 35.10_

  - [ ]* 40.3 Write example + a11y tests for P-27 / P-28 / P-29
    - P-27 attestation-required gate + store-on-continue -> P-28; P-28 confirm->create->P-29 and failure-retry; P-29 fields; unauthenticated redirect to P-01; vitest-axe zero violations
    - _Requirements: 35.3, 35.4, 35.7, 35.9, 35.10, 12.1, 12.5_

- [ ] 41. Dev C - Follow-up chapter P-30 / P-31 and Consultation-day stub
  - [ ] 41.1 Implement FollowUpWaitingScreen (P-30) and FollowUpCompleteScreen (P-31)
    - P-30: waiting-room message that the live follow-up is delivered by the clinical team and integration is pending; onward -> P-13 Home; i18n text; auth-guarded; P-30 timing mark
    - P-31: confirmation the follow-up is complete + summary of Doctor, date/time, mode; action -> P-13 Home; i18n text; auth-guarded; P-31 timing mark
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6_

  - [ ] 41.2 Implement ConsultationDayStub (`features/consultation-day-stub/`)
    - Heading identifying the consultation day; statement that the live experience (identity check, consents, device check, waiting room, video call, documents, survey) is delivered by the clinical team and integration is pending; a visible integration-seam marker naming prototype screens P-14 through P-22; onward -> P-13 Home; no backend/Mock_Layer request; i18n text; auth-guarded; timing mark
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6_

  - [ ]* 41.3 Write example + a11y tests for P-30 / P-31 / Consultation-day stub
    - Onward actions navigate to P-13; stub shows the P-14..P-22 seam marker and makes no backend call; i18n render; vitest-axe zero violations
    - _Requirements: 36.2, 36.4, 38.2, 38.3, 38.4, 12.1, 12.5_

- [ ] 42. Dev B - Consent withdrawal P-38 / P-39
  - [ ] 42.1 Implement WithdrawConsentScreen (P-38) and ConsentWithdrawnEndedScreen (P-39)
    - P-38: show the targeted Consent_Record's label + a confirming prompt; immutable-audit note that the withdrawal is recorded in the medical record and cannot be removed from the audit history; confirm -> `PATCH /api/consents/{id}` with `granted:false`; success reflects the withdrawn state; failure/>5s keeps the prior granted state + error; cancel -> P-23 Consent centre without withdrawing; auth-guarded; P-38 timing mark
    - P-39: informational message that the consultation ended because consent was withdrawn; action -> P-13 Home; auth-guarded; P-39 timing mark
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 37.8, 37.9_

  - [ ]* 42.2 Write example + a11y tests for P-38 / P-39
    - P-38 confirm->withdraw reflects state, failure keeps prior state + error, cancel -> P-23; P-39 message + action -> P-13; unauthenticated redirect to P-01; vitest-axe zero violations
    - _Requirements: 37.4, 37.5, 37.6, 37.8, 37.9, 12.1, 12.5_

- [ ] 43. Integration and final wiring (shared-contract owner)
  - [ ] 43.1 Wire the final-batch routes and entry points
    - Register all fourteen routes; add the Home "Past consultations" entry (-> P-20) and the shell "Help" entry (-> P-24); ensure the P-33 join affordance reaches the Consultation_Day_Stub and the stub/edge/follow-up onward actions reach P-13; type-check the app (`tsc`); run an end-to-end API check against the Java backend (seeded past list, lookup by reference found + 404, dependent `POST /api/appointments`, consent withdrawal `PATCH`); confirm the Java service (8120) and the frontend (3001) both start
    - _Requirements: 40.1, 40.5, 40.6_

  - [ ]* 43.2 Write the final-batch integration tests and verify coverage
    - Against MSW (`VITE_USE_MOCKS=true`): P-20 lists seeded past appointments and opens a detail; P-32 find -> P-33 -> join -> Consultation_Day_Stub; dependent chapter P-27 -> P-28 -> confirm -> P-29; consent withdrawal P-38 -> withdrawn; guard redirects for auth-required routes and unauthenticated access to the three link-entry routes
    - Verify >=80% line coverage and zero `jsx-a11y` / `vitest-axe` violations in CI
    - _Requirements: 40.2, 40.3, 14.5, 14.6_

- [ ] 44. Final checkpoint - ensure all tests pass and both servers run
  - Ensure the Java service build is green and the frontend type-checks; confirm `patient-booking` (3001) and the Java patient-booking-service (8120) both start; ask the user if questions arise.

## Final-batch Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the unmarked set delivers the working final-batch screens against the authoritative Java backend (MSW opt-in via `VITE_USE_MOCKS`).
- The authoritative backend is the Java patient-booking-service (port 8120); the Node Booking_API is a non-authoritative reference only (Req 39.9).
- The fourteen final-batch routes are account / dependent / follow-up / edge screens plus one stub standing in for the whole clinical-team video journey (P-14..P-22); they are intentionally excluded from `WizardStep` / `STEP_PATHS`.
- Backend tasks (35.x) and frontend shared-contract tasks (36.x) touch different repos/files and can proceed in parallel; the new screens (37-42) depend on the shared frontend contract (36.x) and, for the data-backed screens, the backend endpoints (35.x).
- No new universal correctness property is introduced; the backend additions are covered by example/integration tests and the existing Properties 8-10 cover the invariants the data-backed screens rely on.
- Ownership (final batch): backend + shared-contract owner = tasks 35, 36, 43, 44; Dev A = task 38; Dev B = tasks 37, 39, 42; Dev C = tasks 40, 41.

## Task Dependency Graph (Final-batch extension)

```json
{
  "waves": [
    { "id": 23, "tasks": ["35.1", "36.1"] },
    { "id": 24, "tasks": ["35.2", "36.2", "36.3"] },
    { "id": 25, "tasks": ["35.3", "37.1", "38.1", "38.2", "38.3", "39.1", "40.1", "40.2", "41.1", "41.2", "42.1"] },
    { "id": 26, "tasks": ["37.2", "38.4", "39.2", "40.3", "41.3", "42.2", "43.1"] },
    { "id": 27, "tasks": ["43.2"] }
  ]
}
```