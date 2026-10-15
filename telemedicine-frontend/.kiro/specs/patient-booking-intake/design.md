# Design Document

## Overview

This document describes the design for **patient-booking**, a net-new, patient-facing booking front-door built as a **plain React application** (Vite + React 18 + React Router 6 + TypeScript) inside the existing Nx + pnpm monorepo at `telemedicine-frontend/apps/patient-booking/`. It implements prototype screens **P-01 through P-05**: Front door, Sign in, Who needs care?, Reason for consultation, and Confirm your medical history.

### Key architectural decisions

| Decision | Rationale | Requirements |
|----------|-----------|--------------|
| **Plain React SPA, not a Module Federation remote** | The booking front-door precedes the authenticated patient journey and must run standalone. It is mounted via standard client-side routing, never a runtime remote. | 10.2, 10.4 |
| **Build-time reuse of shared packages with local fallbacks** | Reuses `@telemedicine/design-system`, `auth`, `session-context`, `i18n`, `observability-web`, `api-client`, `test-utils` as workspace imports when present; ships thin local fallbacks so the app runs on its own with `pnpm dev` if a package is unavailable. | 7.3, 8.5, 9.1, 11.1, 13.1 |
| **Frontend only — all backend mocked with MSW 2** | No backend/BFF code is produced. Sign-in, record lookup, symptom extraction, and medical-history retrieval are MSW handlers. | 14.1, 14.2, 14.4 |
| **Video / chat / notifications excluded** | Out of scope by requirement. | 14.3 |
| **`BookingProvider` context backed by `sessionStorage`** | Mirrors `@telemedicine/session-context` semantics for cross-step state and resume, with no tokens persisted. | 9.3, 9.5, 9.6 |
| **Three-developer file partition by feature folder** | Each screen lives in its own feature directory with a single owner; shared contracts funnel through one owner. | 15.1–15.6 |

### Degradation strategy (standalone-first)

The app is authored so a developer can `pnpm --filter patient-booking dev` with nothing else running:

- Shared packages are imported through a single **adapters barrel** (`src/shared/platform/`). Each adapter re-exports the real `@telemedicine/*` package when resolvable, otherwise a local fallback (a minimal themed component, an in-memory token set, a dev auth stub, a sessionStorage-only state helper).
- MSW runs in the browser via a dev worker (`public/mockServiceWorker.js`) and in tests via a Node server, so no network backend is ever required.
- `VITE_AUTH_MODE=dev` and `VITE_OBSERVABILITY_MODE=dev` are the default local env, yielding a synthetic user and console-only telemetry.

---

## Architecture

### High-level structure

```
┌──────────────────────────────────────────────────────────────────┐
│  patient-booking SPA  (Vite + React 18 + React Router 6)            │
│                                                                      │
│  Provider tree (src/app/AppProviders.tsx)                            │
│   ObservabilityBoundary                                              │
│    └─ I18nProvider (es-CL primary, en fallback)                      │
│        └─ ThemeProvider (Bupa tokens: #0079C8 / #10294A / Figtree)   │
│            └─ AuthProvider (PKCE / dev bypass, in-memory tokens)     │
│                └─ BookingProvider (sessionStorage-backed state)      │
│                    └─ RouterProvider (BookingWizard routes)          │
│                                                                      │
│  BookingWizard (src/shared/wizard/)                                  │
│   step order: P-01 → P-02 → P-03 → P-04 → P-05                       │
│   Back / Continue / Skip semantics, guards, resume-to-furthest       │
│                                                                      │
│  Feature screens                                                     │
│   p01-front-door │ p02-sign-in │ p03-who-needs-care │                │
│   p04-reason │ p05-medical-history                                   │
└──────────────────────────────────┬───────────────────────────────────┘
                                    │ fetch via api-client adapter
                                    ▼
                   ┌─────────────────────────────────┐
                   │  MSW 2 Mock_Layer (dev + tests) │
                   │  /auth/sign-in, /auth/claveunica │
                   │  /patients/me, /patients/me/deps │
                   │  /symptoms/extract               │
                   │  /patients/{id}/medical-history  │
                   └─────────────────────────────────┘
```

### Provider tree rationale

The provider ordering matters for correctness:

1. **ObservabilityBoundary outermost** so it catches render errors from every provider below (Req 13.1, 13.2).
2. **I18n above Theme/Auth** so error and loading UI rendered by inner providers is already localizable (Req 11.1).
3. **Theme above Auth/Booking** so all chrome and screens inherit Bupa tokens (Req 7.3, 8.1).
4. **Auth above Booking** so booking state can read non-token auth status (authenticated/unauthenticated + user id) without ever touching tokens (Req 9.3, 9.5).
5. **Booking above Router** so wizard state survives route changes and drives guards/resume (Req 9.6, 9.7, 10.3).

Source: `apps/patient-booking/src/app/AppProviders.tsx`

### Technology stack

| Concern | Technology | Version target |
|---------|-----------|----------------|
| UI | React | 18.3.x |
| Routing | React Router | 6.28.x |
| Language | TypeScript (strict) | 5.6.x |
| Build/dev | Vite | 5.4.x |
| Monorepo | Nx + pnpm workspace | 20.4.x / 9.15.x |
| API mocking | MSW | 2.7.x |
| Unit/integration tests | Vitest + Testing Library | 2.1.x / 16.x |
| a11y testing | axe-core / vitest-axe | 4.10.x |
| Lint | ESLint + jsx-a11y | 9.x |

No Module Federation plugin is configured; `vite.config.mts` is a standard React build (Req 10.2).

---

## Components and Interfaces

### Shell chrome and layout (shared)

**`BookingChrome`** (`src/shared/components/BookingChrome.tsx`) — renders the Bupa wordmark, a "My care" entry, a "Help" entry, and a signed-in avatar showing the patient's initials. When unauthenticated, the avatar initials are omitted. Composes Design_System `ShellLayout`/`PageLayout` and Bupa tokens.
*Satisfies: 7.1, 7.2, 7.3, 8.5*

**`DependentContextStrip`** (`src/shared/components/DependentContextStrip.tsx`) — a banner shown on every applicable step while the Care_Subject is a Dependent. Displays the Dependent's name, age, the acting relationship, a statement that both identities are recorded, and a Consent-centre affordance. Hidden when the Care_Subject is the signed-in patient.
*Satisfies: 6.1, 6.2, 6.3, 6.4*

**`StatusPill`** (`src/shared/components/StatusPill.tsx`) — a labelled indicator that always pairs an icon with a colour (never colour alone), used for file scan status and record states.
*Satisfies: 8.4, 12.4*

**`WizardFooter`** (`src/shared/wizard/WizardFooter.tsx`) — renders Back / Continue (and optional Skip) actions wired to the `BookingWizard` controller.

### P-01 Front door (`features/p01-front-door/`) — Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `FrontDoorScreen` | Primary heading, "Get care now" primary action, "I already have an appointment" secondary action; both navigate to P-02 | 1.1, 1.2, 1.3 |
| `HowItWorks` | Exactly four ordered steps, each with icon, step number, title, descriptive text | 1.4 |
| `EmergencyNotice` | Instruction to call 131 (SAMU), rendered with a `tel:131` link | 1.5 |

Layout uses fluid reflow across 390px–1280px with no breakpoint-specific forks (Req 1.6, 8.3) via CSS `clamp()`/flex-wrap, no media-query layout branches.

### P-02 Sign in (`features/p02-sign-in/`) — Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `SignInScreen` | Email, password, "Sign in" submit, "Continue with ClaveÚnica", "Forgot your password?" | 2.1 |
| `SignInForm` | Submits credentials via Auth_Library; sets `aria-invalid` on email/password when error state applies | 2.2, 2.14 |
| `AttemptLockoutController` (hook `useSignInAttempts`) | Per-email failed-attempt counter, "Attempt N of 5" message, 15-minute lockout, auto-reset on expiry/success | 2.3–2.8 |
| `NoRecordBranch` | F-08 "no record found" branch with "Get help linking my record" and "Try another account"; does not create a booking or assume identity | 2.9, 2.10, 2.11, 2.13 |
| `ClaveUnicaButton` | Initiates mocked ClaveÚnica path; on success navigates to P-03, on no-record shows F-08 branch | 2.12, 2.13 |

### P-03 Who needs care? (`features/p03-who-needs-care/`) — Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `WhoNeedsCareScreen` | Hosts the radiogroup and Back/Continue | 3.5, 3.6 |
| `CareSubjectRadioGroup` | `role="radiogroup"` of care-subject cards (patient + eligible dependents) | 3.1 |
| `CareSubjectCard` | `role="radio"` + `aria-checked`; ineligible cards disabled and unselectable | 3.2, 3.3 |
| selection logic | Stores selected Care_Subject in Session_Context; blocks Continue with no selection and shows a selection-required message | 3.4, 3.7 |

### P-04 Reason for consultation (`features/p04-reason/`) — Dev C

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `ReasonScreen` | Orchestrates the sub-components and Continue/Skip | 4.20, 4.21 |
| `SymptomTextField` | Free-text up to 2000 chars; debounced (500 ms) extraction trigger at ≥3 non-whitespace chars | 4.1, 4.2, 4.4 |
| `SymptomChips` | Up to 15 candidate chips in "Symptoms we picked up"; selected (remove control) vs available (add control); keeps the two sets disjoint; handles extraction error/timeout | 4.3, 4.5, 4.6, 4.7 |
| `DurationRadioGroup` | "How long?" radiogroup; stores duration | 4.8 |
| `SeveritySlider` | 0–10 integer slider, accessible name, arrow-key ±1, exposed current value; maps to Severity_Word | 4.9, 4.10, 4.11 |
| `FileUpload` | Accepts JPG/PNG/HEIC/PDF ≤10 MB; rejects wrong type / oversize with messages; per-file type selector + scan-status `StatusPill` | 4.12–4.15 |
| `MeasurementsBlock` | Weight (0.1–500 kg) + height (1–300 cm) shown only when Care_Subject is a Dependent | 4.16, 4.17 |
| `EmergencyInterrupt` | `role="alertdialog"` triggered by a Red_Flag_Phrase; "Call 131" (`tel:131`) + "Continue" (dismiss, non-blocking) | 4.18, 4.19 |

### P-05 Confirm medical history (`features/p05-medical-history/`) — Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `MedicalHistoryScreen` | Requests history on mount; loading / records / empty / error+retry states | 5.1, 5.2, 5.3, 5.4, 5.5 |
| `MedicalHistoryRow` | Reviewable row with a `role="checkbox"` share toggle + `aria-checked`; inline edit saving a 1–2000 char correction | 5.6, 5.7, 5.8 |
| `AddMissingField` | "Add anything missing" free-text up to 2000 chars | 5.9 |
| confirm gate | "Confirm and continue" disabled until the request resolves (records or empty); marks confirmed and completes the step; Back navigates to preceding step | 5.10, 5.11, 5.12 |

### Interface contracts (platform adapters)

`src/shared/platform/index.ts` exposes a stable surface regardless of whether the real package resolves:

```typescript
// Auth adapter
export interface AuthApi {
  signIn(credentials: Credentials): Promise<AuthResult>;
  signInWithClaveUnica(): Promise<AuthResult>;
  signOut(): void;
  getUser(): AuthUser | null;      // non-token identity only
  isAuthenticated(): boolean;
}

// Observability adapter
export interface ObservabilityApi {
  reportError(error: unknown, context?: Record<string, unknown>): void;
  mark(step: WizardStep): void;    // journey timing mark
}

// i18n adapter
export interface I18nApi {
  t(key: string, vars?: Record<string, string | number>): string;
  locale: 'es-CL' | 'en';
}
```

Each adapter is `satisfies`-checked against these interfaces so a fallback and the real package are interchangeable.

---

## Data Models

All booking state lives in `BookingState`, held by `BookingProvider` and mirrored to `sessionStorage` under key `patient-booking.state`. Tokens are **never** stored here (Req 9.3).

```typescript
// src/shared/types/booking.ts  (shared-contract owner)

export type WizardStep = 'P-01' | 'P-02' | 'P-03' | 'P-04' | 'P-05';

export const WIZARD_ORDER: readonly WizardStep[] =
  ['P-01', 'P-02', 'P-03', 'P-04', 'P-05'] as const;

export type Relationship = 'self' | 'parent' | 'guardian' | 'spouse' | 'caregiver';

export interface Dependent {
  id: string;
  name: string;
  ageYears: number;
  relationship: Exclude<Relationship, 'self'>;
  eligible: boolean;          // ineligible → disabled card (Req 3.3)
}

export interface CareSubject {
  kind: 'self' | 'dependent';
  id: string;                 // patient id or dependent id
  name: string;
  ageYears: number;
  relationship: Relationship; // 'self' when kind === 'self'
}

export interface SymptomChip {
  id: string;
  label: string;
}

export type DurationValue =
  | 'under-24h' | '1-3-days' | '4-7-days' | '1-2-weeks' | 'over-2-weeks';

export type SeverityWord = 'Mild' | 'Moderate' | 'Severe' | 'Worst possible';

export type ScanStatus = 'pending' | 'scanning' | 'clean' | 'rejected';
export type FileCategory = 'photo' | 'lab-report' | 'prescription' | 'other';

export interface UploadedFile {
  id: string;
  name: string;
  mime: 'image/jpeg' | 'image/png' | 'image/heic' | 'application/pdf';
  sizeBytes: number;          // ≤ 10 * 1024 * 1024 (Req 4.12)
  category: FileCategory;
  scanStatus: ScanStatus;
}

export interface Measurements {
  weightKg?: number;          // 0.1–500 (Req 4.16)
  heightCm?: number;          // 1–300  (Req 4.16)
}

export interface MedicalHistoryRecord {
  id: string;
  label: string;
  detail: string;
  shared: boolean;            // per-record share toggle (Req 5.6, 5.7)
  correction?: string;        // 1–2000 chars (Req 5.8)
}

export interface AuthStateSnapshot {
  status: 'authenticated' | 'unauthenticated';
  userId: string | null;      // identity only, no tokens (Req 9.5)
}

export interface BookingState {
  currentStep: WizardStep;
  furthestStep: WizardStep;            // for resume (Req 9.7)
  auth: AuthStateSnapshot;
  careSubject: CareSubject | null;
  symptomText: string;
  selectedSymptoms: SymptomChip[];
  availableSymptoms: SymptomChip[];    // disjoint from selectedSymptoms
  duration: DurationValue | null;
  severity: number;                    // 0–10 integer (Req 4.9)
  files: UploadedFile[];
  measurements: Measurements;
  history: {
    status: 'idle' | 'loading' | 'loaded' | 'empty' | 'error';
    records: MedicalHistoryRecord[];
    addMissing: string;                // ≤2000 chars (Req 5.9)
    confirmed: boolean;                // (Req 5.11)
  };
}
```

### Severity → word mapping (pure, total over 0..10)

```typescript
export function severityWord(value: number): SeverityWord {
  if (value <= 2) return 'Mild';          // 0,1,2
  if (value <= 6) return 'Moderate';      // 3..6
  if (value <= 9) return 'Severe';        // 7,8,9
  return 'Worst possible';                // 10
}
```
*Satisfies: 4.10, 4.11*

### File validation (pure)

```typescript
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/heic', 'application/pdf']);
const MAX_BYTES = 10 * 1024 * 1024;

export function validateFile(f: { mime: string; sizeBytes: number }):
  { ok: true } | { ok: false; reason: 'type' | 'size' } {
  if (!ALLOWED.has(f.mime)) return { ok: false, reason: 'type' };
  if (f.sizeBytes > MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}
```
*Satisfies: 4.12, 4.13, 4.14*

### Mock contract (MSW 2)

Handlers live in `src/shared/mocks/handlers/` and are also exported for `@telemedicine/test-utils` reuse (Req 14.1, 14.5).

| Endpoint | Request | Response (200) | Error branches |
|----------|---------|----------------|----------------|
| `POST /auth/sign-in` | `{ email, password }` | `{ userId, hasRecord: true }` | `401` invalid credentials; `200 { hasRecord:false }` → F-08 (Req 2.3, 2.9) |
| `POST /auth/claveunica` | — | `{ userId, hasRecord: true }` | `200 { hasRecord:false }` → F-08 (Req 2.12, 2.13) |
| `GET /patients/me` | — | `Patient_Record` | — |
| `GET /patients/me/dependents` | — | `Dependent[]` (incl. ineligible) | — (Req 3.1, 3.3) |
| `POST /symptoms/extract` | `{ text }` | `{ chips: SymptomChip[] /* ≤15 */, redFlag: boolean }` | `500` / delay >5s → extraction unavailable (Req 4.3, 4.5, 4.18) |
| `GET /patients/{id}/medical-history` | — | `{ records: MedicalHistoryRecord[] }` (may be empty) | `500` / delay >5s → error + retry (Req 5.3, 5.4, 5.5) |

The lockout counter and the Red_Flag_Phrase detection are **client-side** (Req 2.4, 4.18); the mock only returns a `redFlag` hint and credential validity. Red-flag matching is performed locally against a configured phrase list so detection works even on extraction failure.

---

## Routing and navigation

### Route table

`src/app/routes.tsx` — base path `/booking` (standalone) or `/patient/booking` (when mounted in the patient shell), chosen via `VITE_BOOKING_BASE_PATH`.

```
<base>                → redirect to resume target (furthestStep) or P-01
<base>/front-door     → P-01   (public)
<base>/sign-in        → P-02   (public)
<base>/who-needs-care → P-03   (requires: authenticated)
<base>/reason         → P-04   (requires: careSubject selected)
<base>/medical-history→ P-05   (requires: careSubject selected)
```
*Satisfies: 10.1, 10.3, 10.4*

### Guards and resume

`JourneyGuard` wraps protected routes. On direct access it checks prerequisites against `BookingState`; if unmet it redirects to P-01 (Req 10.5). On entry to `<base>` with existing non-expired state, it resumes at `furthestStep` (Req 9.7). If Session_Context was reset/expired, tokens are discarded, persisted step state cleared, and the wizard restarts at P-01 (Req 9.8).

### BookingWizard controller

`useWizard()` exposes `goNext()`, `goBack()`, `skip()`, `goTo(step)`. Transitions only move within `WIZARD_ORDER` and update both `currentStep` and `furthestStep` (never regressing `furthestStep`). `goNext`/`goBack` also push the matching route so URL and step stay in sync (Req 10.3). `skip()` on P-04 clears P-04 data then advances to P-05 (Req 4.21).

---

## Authentication and session

### Sign-in flow

Sign-in runs through the Auth_Library PKCE flow (Req 9.1). On success an authenticated session is established, the per-email attempt counter resets to 0, and the wizard advances to P-03 (Req 2.2). On failure the app stays unauthenticated, does not advance past sign-in, and surfaces an error (Req 9.2). With `VITE_AUTH_MODE=dev` the adapter returns a synthetic user with no IdP contact (Req 9.4). Access/refresh tokens are held in memory only — never in localStorage, sessionStorage, or Session_Context (Req 9.3).

### Attempt counter + lockout (client-side)

`useSignInAttempts(email)` keeps a per-email map `{ count, lockedUntil }`:

- Each rejected submission while `count < 5` increments `count` and shows "Attempt N of 5" (Req 2.3, 2.5).
- Reaching `count === 5` sets `lockedUntil = now + 15min`, disables submission, and shows the lockout message (Req 2.6).
- While locked, submissions are rejected and the message stays visible (Req 2.7).
- When `now ≥ lockedUntil`, submission re-enables and `count` resets to 0 (Req 2.8).
- A successful sign-in resets `count` to 0 (Req 2.2).

The counter is keyed by email and persisted to `sessionStorage` (not Session_Context booking state) so it survives reloads within the browser session without storing tokens.

### Session persistence

On step completion the app persists to Session_Context: `currentStep`, `careSubject`, symptom set, duration, severity, uploaded-file metadata, measurements, medical-history confirmations, and the non-token auth snapshot (Req 9.5). On navigation it reads prior values back so entered data is retained for the sessionStorage lifetime (Req 9.6).

---

## Design tokens, theming, and i18n

### Bupa tokens

`src/shared/theme/tokens.css` defines CSS custom properties applied via `data-theme="patient"`:

| Token | Value | Usage | Satisfies |
|-------|-------|-------|-----------|
| `--color-primary` | `#0079C8` | primary actions | 8.1 |
| `--color-heading` | `#10294A` | primary headings | 8.1 |
| `--font-family` | `Figtree, system-ui, sans-serif` | text content | 8.2 |

The ThemeProvider prefers Design_System tokens when the package resolves; otherwise it injects this local token sheet so colours/typeface match standalone (Req 8.5 fallback). Layouts use fluid reflow (clamp/flex) across 390–1280px with no breakpoint forks (Req 8.3).

### i18n

All user-facing text comes from the I18n_Library (Req 11.1). Bundles are **namespaced per screen** so the three developers edit disjoint files:

```
src/shared/i18n/
  es-CL/{common,p01,p02,p03,p04,p05}.json   (primary)
  en/{common,p01,p02,p03,p04,p05}.json       (fallback)
```

es-CL is primary; a missing key falls back to en (Req 11.2, 11.3, 11.4).

---

## Accessibility design (WCAG 2.1 AA)

| Control | ARIA / behavior | Satisfies |
|---------|-----------------|-----------|
| Care-subject selection | `role="radiogroup"` → cards `role="radio"` + `aria-checked`; disabled for ineligible | 3.2, 12.2 |
| Symptom chips | buttons with accessible add/remove labels; keyboard operable | 4.3, 12.2, 12.4 |
| Duration | native radiogroup | 12.2 |
| Severity slider | accessible name, arrow-key ±1, `aria-valuenow`/`aria-valuetext` exposes current value and word | 4.9, 12.2 |
| File controls | icon-only controls have accessible names; `StatusPill` pairs icon+colour | 4.15, 8.4, 12.4 |
| Medical-history toggle | `role="checkbox"` + `aria-checked` | 5.6, 12.2 |
| Emergency interrupt | `role="alertdialog"` with accessible label; focus trapped, returns focus on dismiss | 4.18, 12.3 |
| Form fields | accessible names; `aria-invalid` on auth errors | 2.14, 12.4 |

CI enforces zero `jsx-a11y` lint violations and zero `vitest-axe` violations on tested screens (Req 12.1, 12.5).

---

## Error Handling

- The app root is wrapped in the Observability_Library error boundary; render errors are caught and reported through the configured channel (Req 13.1, 13.2).
- Data-fetch errors (symptom extraction, medical history) surface inline, user-facing messages with retry where specified (Req 4.5, 5.5) rather than throwing to the boundary.
- The api-client adapter parses RFC 7807 `ProblemDetail` when the real package is present and maps to a simple `{ message }` in fallback mode.

## Observability

- A journey timing mark is recorded on entry to each step P-01..P-05 via `observability.mark(step)` in each screen's mount effect (Req 13.3).
- With `VITE_OBSERVABILITY_MODE=dev`, telemetry is console-only with no network transmission (Req 13.4).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The booking app is mostly UI composition over mocked data, which is best covered by example and a11y tests. However, several pure-logic cores have universal properties worth property-based testing: the severity mapping, file validation, symptom chip-set algebra, the client-side attempt-counter state machine, the wizard transition controller, and session serialization. Properties below target those cores.

### Property 1: Severity mapping is total and consistent with stored value

*For any* integer severity value in the range 0 to 10 inclusive, `severityWord(v)` returns exactly one of the four bands per the specification (0–2 → Mild, 3–6 → Moderate, 7–9 → Severe, 10 → Worst possible), and after the slider stores that value, the value read back from Session_Context equals `v` and the displayed word equals `severityWord(v)`.

**Validates: Requirements 4.10, 4.11**

### Property 2: File validation accepts iff type and size are both allowed

*For any* generated file with a MIME type and a byte size, `validateFile` returns `ok` if and only if the MIME type is one of `image/jpeg`, `image/png`, `image/heic`, `application/pdf` **and** the size is less than or equal to 10 MB (10 × 1024 × 1024 bytes); the boundary at exactly 10 MB is accepted and 10 MB + 1 byte is rejected.

**Validates: Requirements 4.12, 4.13, 4.14**

### Property 3: Symptom chip sets stay disjoint and conserved

*For any* initial candidate chip set and *any* sequence of add/remove operations on chips, the selected set and the available set remain disjoint (no chip id appears in both) and the union of the two sets (by id) equals the original candidate set with no duplicates and no loss.

**Validates: Requirements 4.3, 4.6, 4.7**

### Property 4: Attempt counter never exceeds 5 and lockout engages exactly at the threshold

*For any* sequence of sign-in submissions (rejected, successful, and clock-advance events) for a given email, the failed-attempt count always stays within 0 to 5 inclusive, a lockout is active if and only if the count reached 5 and the 15-minute window has not elapsed, a successful submission resets the count to 0, and advancing the clock past the lockout window re-enables submission and resets the count to 0.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

### Property 5: Wizard transitions stay within P-01..P-05 and furthest step never regresses

*For any* sequence of `goNext` / `goBack` / `skip` / `goTo` operations starting from P-01, the current step is always a member of `WIZARD_ORDER` (index within 0..4), and the furthest-reached step index is non-decreasing across the sequence and is always greater than or equal to the current step index.

**Validates: Requirements 10.3, 9.7**

### Property 6: Session state persistence round-trips without tokens

*For any* valid `BookingState`, serializing it to the Session_Context sessionStorage payload and rehydrating produces an equivalent `BookingState`, and the serialized payload never contains access-token or refresh-token fields.

**Validates: Requirements 9.3, 9.5, 9.6**

---

## Testing Strategy

### Dual approach

- **Unit / example tests** cover specific screens, states, and branches: P-01/P-02 rendering, the F-08 no-record branch, care-subject radiogroup roles and ineligibility, dependent context-strip visibility, chrome avatar state, medical-history loading/records/empty/error+retry, the Emergency_Interrupt alertdialog render and dismiss, token values and typeface, and i18n key coverage/fallback.
- **Property tests** cover the six universal properties above over randomized inputs.

Both are necessary: example tests pin concrete behavior and integration wiring; property tests exercise the pure cores across the full input space.

### Tooling

| Tool | Scope |
|------|-------|
| Vitest 2 + jsdom | all tests |
| Testing Library | component behavior |
| MSW 2 | mock all backend endpoints (dev worker + Node server in tests) |
| `fast-check` | property-based testing library (do not hand-roll generators) |
| vitest-axe | a11y assertions on each tested screen |
| `@telemedicine/test-utils` | `renderWithProviders` + shared handlers/fixtures |

### Property test configuration

- Each property is implemented as a **single** `fast-check` property test running a **minimum of 100 iterations** (`fc.assert(fc.property(...), { numRuns: 100 })`).
- Each property test is tagged with a comment referencing its design property:
  `// Feature: patient-booking-intake, Property N: {property text}`
- Property tests live beside the pure modules they validate (e.g. `src/shared/state/severity.property.test.ts`), keeping ownership clear.

### Coverage

The suite uses `renderWithProviders` and targets ≥ **80% line coverage** to satisfy the monorepo gate (Req 14.6). CI additionally fails on any `jsx-a11y` lint error or `vitest-axe` violation (Req 12.5).

---

## Folder structure and three-developer split

The source tree partitions work so each in-scope screen has a single owning developer and shared contracts funnel through one owner (Req 15.1–15.6).

```
apps/patient-booking/
├── public/
│   ├── mockServiceWorker.js          # MSW dev worker
│   └── config/
├── src/
│   ├── app/                          # [shared-contract owner]
│   │   ├── AppProviders.tsx          # provider tree
│   │   ├── routes.tsx                # React Router route table + guards
│   │   └── main.tsx                  # Vite entry, MSW dev bootstrap
│   ├── features/
│   │   ├── p01-front-door/           # [Dev A]
│   │   │   ├── FrontDoorScreen.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── EmergencyNotice.tsx
│   │   │   └── *.test.tsx
│   │   ├── p02-sign-in/              # [Dev A]  incl. auth/session sign-in wiring
│   │   │   ├── SignInScreen.tsx
│   │   │   ├── SignInForm.tsx
│   │   │   ├── NoRecordBranch.tsx
│   │   │   ├── ClaveUnicaButton.tsx
│   │   │   ├── useSignInAttempts.ts  # attempt counter + lockout
│   │   │   └── *.test.tsx / *.property.test.ts
│   │   ├── p03-who-needs-care/       # [Dev B]
│   │   │   ├── WhoNeedsCareScreen.tsx
│   │   │   ├── CareSubjectRadioGroup.tsx
│   │   │   ├── CareSubjectCard.tsx
│   │   │   └── *.test.tsx
│   │   ├── p04-reason/               # [Dev C]
│   │   │   ├── ReasonScreen.tsx
│   │   │   ├── SymptomTextField.tsx
│   │   │   ├── SymptomChips.tsx       # chip-set algebra (Property 3)
│   │   │   ├── DurationRadioGroup.tsx
│   │   │   ├── SeveritySlider.tsx     # severity mapping (Property 1)
│   │   │   ├── FileUpload.tsx         # file validation (Property 2)
│   │   │   ├── MeasurementsBlock.tsx
│   │   │   ├── EmergencyInterrupt.tsx # red-flag alertdialog
│   │   │   ├── redFlag.ts             # phrase-match predicate
│   │   │   └── *.test.tsx / *.property.test.ts
│   │   └── p05-medical-history/      # [Dev B]
│   │       ├── MedicalHistoryScreen.tsx
│   │       ├── MedicalHistoryRow.tsx
│   │       ├── AddMissingField.tsx
│   │       └── *.test.tsx
│   └── shared/                       # [shared-contract owner]
│       ├── components/               # BookingChrome, DependentContextStrip*, StatusPill
│       ├── wizard/                   # BookingWizard controller + WizardFooter (Property 5)
│       ├── state/                    # BookingProvider, severity.ts, booking state (Property 6)
│       ├── types/                    # booking.ts and all shared TS interfaces
│       ├── platform/                 # adapters for @telemedicine/* + local fallbacks
│       ├── theme/                    # tokens.css + ThemeProvider
│       ├── i18n/                     # es-CL/* + en/* namespaced per screen
│       └── mocks/                    # MSW handlers registry + fixtures
├── vite.config.mts                   # standard React build (NO Module Federation)
├── vitest.config.ts
├── project.json                      # Nx project
└── package.json
```

### Ownership map

| Owner | Files | Requirements |
|-------|-------|--------------|
| **Dev A** | `features/p01-front-door/`, `features/p02-sign-in/` (sign-in auth/session wiring, attempt counter) | 1.x, 2.x, 9.1–9.4 (sign-in side) |
| **Dev B** | `features/p03-who-needs-care/`, `features/p05-medical-history/`, `shared/components/DependentContextStrip.tsx`, patient/dependent model additions in `shared/types` + `shared/state` (coordinated via shared-contract owner) | 3.x, 5.x, 6.x |
| **Dev C** | `features/p04-reason/` (symptom text, AI chips, duration, severity, file upload) + `EmergencyInterrupt` + `redFlag.ts` | 4.x |
| **Shared-contract owner** | `src/app/*`, `shared/wizard`, `shared/state/BookingProvider`, `shared/types`, `shared/platform`, `shared/components` (chrome/StatusPill), `shared/theme`, `shared/i18n` scaffolding, `shared/mocks` registry | 7.x, 8.x, 9.5–9.8, 10.x, 11.x, 13.x, 14.x, 15.5, 15.6 |

The per-screen i18n namespace files (`p01..p05`) are edited by each screen's owner; only the `common` namespace and the handler registry are shared-owner files, minimizing concurrent edits (Req 15.1, 15.5). All backend interactions route through the shared Mock_Layer so no developer introduces a competing backend-call mechanism (Req 15.6).

---

## Requirements traceability

| Requirement | Design section(s) |
|-------------|-------------------|
| 1 — P-01 Front door | Components › P-01; Architecture (fluid reflow) |
| 2 — P-02 Sign in | Components › P-02; Authentication and session (attempt counter + lockout); Mock contract |
| 3 — P-03 Who needs care | Components › P-03; Accessibility (radiogroup) |
| 4 — P-04 Reason | Components › P-04; Data Models (severity, file validation); Correctness Properties 1–3 |
| 5 — P-05 Medical history | Components › P-05; Mock contract |
| 6 — Dependent context strip | Shell chrome › DependentContextStrip |
| 7 — Shared header/chrome | Shell chrome › BookingChrome |
| 8 — Design system / visual | Design tokens, theming; StatusPill; fluid reflow |
| 9 — Auth & session | Authentication and session; Data Models (AuthStateSnapshot); Correctness Property 6; Routing (resume/reset) |
| 10 — Routing & integration | Routing and navigation |
| 11 — i18n | Design tokens, theming, and i18n |
| 12 — Accessibility | Accessibility design |
| 13 — Observability | Error handling and observability |
| 14 — Mocking & testing | Mock contract; Testing Strategy |
| 15 — Parallel development | Folder structure and three-developer split |

---

*This design is implementable as a self-contained plain React application runnable with `pnpm --filter patient-booking dev`, reusing `@telemedicine/*` shared packages when resolvable and degrading to local fallbacks otherwise. It introduces no Module Federation and no backend code; all backend interactions are mocked with MSW 2.*

---

# Extension: Backend (Booking_API) and screens P-06..P-12

> This section extends the design above to cover the extended scope (Requirements 16–24). The P-01..P-05 design, provider tree, theming, i18n, accessibility, and existing Correctness Properties 1–6 remain unchanged. The two notable deltas to earlier assumptions are: (a) the default data path is now a **real Node + Express backend** (the Booking_API) rather than MSW, with MSW retained as an **opt-in** fallback via `VITE_USE_MOCKS=true`; and (b) the **default UI locale is `en`**, with `es-CL` secondary, and all user-facing "Bupa" wording replaced by neutral "Telemedicine" terms. The design tokens (`#0079C8` / `#10294A` / Figtree) are retained.

## Backend architecture (Booking_API)

The Booking_API is a lightweight Node + Express service at `telemedicine-frontend/apps/patient-booking-api`, listening on **port 4000**, exposing JSON endpoints under the `/api` base path. It holds all data **in memory** (no database); appointments and triage sessions do not survive a restart (Req 23.1, 23.11).

### Service structure

```
apps/patient-booking-api/
├── src/
│   ├── server.js            # Express app: middleware, route wiring, listen(4000)   [existing]
│   ├── data.js              # In-memory stores + helpers for P-01..P-05             [existing]
│   ├── problem.js           # RFC-7807-style problem helper { type,title,status,detail }   [new]
│   ├── triage/
│   │   ├── TriageProvider.js      # interface contract (JSDoc) + factory selectProvider()  [new]
│   │   ├── MockTriageProvider.js  # deterministic rules-based implementation (current)      [new]
│   │   └── sessions.js            # Map<sessionId, TriageSession> in-memory session store   [new]
│   ├── doctors.js           # in-memory Doctor[] + Slot[] + filter/sort helpers       [new]
│   ├── cover.js             # fixed Cover_Quote builder                               [new]
│   └── appointments.js      # in-memory Appointment store + reference generator       [new]
├── package.json
└── Dockerfile (optional)
```

The existing `server.js` already wires `cors`, `express.json()`, a correlation-id passthrough logger, `/health`, and the P-01..P-05 routes. The new modules are mounted into the same app; route handlers stay thin and delegate to the module helpers so the triage seam and stores are testable in isolation.

### Middleware and cross-cutting concerns

| Concern | Mechanism | Satisfies |
|---------|-----------|-----------|
| CORS | `cors()` with permissive defaults for local dev | 23.8 |
| JSON body | `express.json()` | 23.1 |
| Correlation id | reads `x-correlation-id` header (falls back to `-`) and logs `method path cid=<id>` per request | 23.9 |
| Error shape | all failure responses use the RFC-7807-ish envelope `{ type?, title, status, detail }` built by `problem.js`; `type` defaults to `about:blank` | 23.10 |
| Health | `GET /health → { status: "ok" }` | 23.1 |

### Error shape

`problem.js` returns a problem object and sets the HTTP status:

```jsonc
// example: 404 for unknown doctor
{ "type": "about:blank", "title": "Not Found", "status": 404, "detail": "No doctor with id doc-999." }
```

The frontend `apiClient` already understands this shape (it parses `{ title, detail }` into a `{ message }` for UI). No frontend change is required beyond mapping the new endpoints.

### In-memory stores

- **Patient / dependents / medical history / symptom extraction** — `data.js` (unchanged).
- **Triage sessions** — `triage/sessions.js` holds `Map<sessionId, TriageSession>`; a session records the ordered question set, the index of the next unanswered question, and collected answers. Keyed by `sessionId` returned from `POST /api/triage/start`.
- **Doctors / slots** — `doctors.js` holds a static seed `Doctor[]` and a per-doctor `Slot[]`; filtering and sorting are pure helpers over the seed.
- **Cover quote** — `cover.js` returns a **fixed** fee (no FONASA / isapre logic, no eligibility computation): `{ feeClp, currency: "CLP", note }`.
- **Appointments** — `appointments.js` holds `Map<reference, Appointment>` and a reference generator producing `TM-XXXXXX` (6 base-36 uppercase chars).

### How the frontend reaches it

- **Default path:** the Vite dev server proxies `/api` → `http://localhost:4000`. `apiClient.ts` issues `fetch` to `/api/...`, so no absolute host is baked into the frontend (Req 14.2).
- **Opt-in mocks:** when `VITE_USE_MOCKS=true`, MSW 2 intercepts the same `/api/...` requests in the browser (dev worker) and in tests (Node server), serving `@telemedicine/test-utils` handlers instead of the backend (Req 14.3, 14.6). The MSW handler set is extended to mirror every new endpoint below so offline/dev and the test suite stay faithful to the real contract (Req 14.1).
- The frontend contains **no backend/BFF code**; all server logic lives in the Booking_API (Req 14.4).

### Full endpoint contract

Existing (P-01..P-05) and new (P-06..P-12) endpoints, all under `/api`:

| # | Method & path | Request | Response (200) | Error branches | Req |
|---|---------------|---------|----------------|----------------|-----|
| 1 | `POST /api/auth/sign-in` | `{ email, password }` | `{ userId, hasRecord: true }` | `401` invalid; `200 { hasRecord:false }` → F-08 | 2.x |
| 2 | `POST /api/auth/claveunica` | — | `{ userId, hasRecord: true }` | `200 { hasRecord:false }` → F-08 | 2.12 |
| 3 | `GET /api/patients/me` | — | `Patient_Record` | — | 3.x |
| 4 | `GET /api/patients/me/dependents` | — | `Dependent[]` (incl. ineligible) | — | 3.1, 3.3 |
| 5 | `POST /api/symptoms/extract` | `{ text }` | `{ chips: SymptomChip[] /* ≤15 */, redFlag }` | `500` / slow → extraction unavailable | 4.3, 4.18 |
| 6 | `GET /api/patients/:id/medical-history` | — | `{ records: MedicalHistoryRecord[] }` | `500` / slow → error+retry | 5.x |
| 7 | `POST /api/triage/start` | `{ careSubjectId?, reason?, symptoms? }` | `{ sessionId, disclosure, firstQuestion: TriageQuestion \| null, totalQuestions }` | `500` / slow → P-06 skipped fallback | 16.2, 16.3, 23.3 |
| 8 | `POST /api/triage/answer` | `{ sessionId, questionId, answer: "yes"\|"no" }` | `{ nextQuestion: TriageQuestion \| null, result: TriageResult \| null }` | `404` unknown session; `400` bad answer | 16.4, 16.5, 23.3 |
| 9 | `GET /api/triage/result/:sessionId` | — | `TriageResult` | `404` unknown session | 16.5, 16.6, 23.3 |
| 10 | `GET /api/doctors?specialty=&sort=` | query: `specialty?`, `sort?` | `Doctor[]` | `[]` when no match (not an error) | 17.1, 17.4, 17.6, 23.4 |
| 11 | `GET /api/doctors/:id` | — | `Doctor` (detail) | `404` unknown doctor | 18.1, 23.5 |
| 12 | `GET /api/doctors/:id/slots` | — | `Slot[]` | `[]` when none; `404` unknown doctor | 18.1, 18.3, 18.4, 23.5 |
| 13 | `GET /api/cover/quote?doctorId=&slotId=` | query | `{ feeClp, currency: "CLP", note }` | `500` / slow → error+retry | 19.1, 19.3, 23.6 |
| 14 | `POST /api/appointments` | `{ careSubjectId, doctorId, slotId, mode, reason }` | `{ reference, status: "confirmed", doctor, slot, mode, feeClp }` | `400` missing fields; `409` slot taken | 21.3, 21.4, 22.1, 23.7 |

Notes:
- **Payment is mocked entirely on the frontend.** No payment endpoint exists. The appointment is created by `POST /api/appointments` *after* the frontend mock "payment" reports success (Req 21.2, 21.3). The appointment reference comes from the backend only.
- `GET /api/doctors` returning an empty array for an unmatched filter is a normal `200`, not an error (Req 17.8).
- Doctor `mode` is one of `video | in-person`; `priceClp` and the cover `feeClp` are the same fixed value for a given doctor so the P-09 quote and P-10 summary agree.

## Triage provider seam

The triage logic sits behind a single server-side interface so the current rules-based mock can later be swapped for an LLM-backed provider **without changing the HTTP contract or the frontend** (Req 16.12, 23.12). The frontend only ever talks to endpoints 7–9 above.

### Interface (JSDoc contract in `triage/TriageProvider.js`)

```typescript
// Conceptual TypeScript shape of the JS interface
interface TriageProvider {
  // Begin a triage; returns the session + first question (or null if no questions).
  startTriage(context: TriageContext): TriageSession;
  // Record an answer and return the next question, or null when the set is exhausted.
  submitAnswer(session: TriageSession, answer: TriageAnswerInput): TriageQuestion | null;
  // Derive the final recommendation from the answered session.
  buildResult(session: TriageSession): TriageResult;
}

interface TriageContext { careSubjectId?: string; reason?: string; symptoms?: string[]; }
interface TriageAnswerInput { questionId: string; answer: "yes" | "no"; }

interface TriageSession {
  sessionId: string;
  questions: TriageQuestion[];     // at most 3
  nextIndex: number;               // index of next unanswered question
  answers: { questionId: string; answer: "yes" | "no" }[];
}
```

Request/response DTOs crossing the wire are exactly the endpoint-7/8/9 payloads above (`sessionId`, `disclosure`, `TriageQuestion`, `TriageResult`). `selectProvider()` reads an env flag (e.g. `TRIAGE_PROVIDER=mock|llm`, default `mock`) and returns the active implementation; route handlers depend only on the interface.

- **`MockTriageProvider` (now):** deterministic, rules-based. Emits up to 3 Yes/No questions, maps answers to a `recommendedSpecialty`, always sets `videoRecommended: true` and `noEmergencySigns: true` for the in-scope happy path, and echoes the answered Q/A list.
- **`LlmTriageProvider` (later):** same methods; internally calls an LLM. Because it returns the same DTOs, no frontend code, route code, or MSW handler shape changes when it replaces the mock.

## New data models

Additions to `apps/patient-booking/src/shared/types/booking.ts`. All existing types (`WizardStep` et al. — see Wizard model update below — plus severity/chips/files/history) are retained.

```typescript
// --- Triage (P-06) ---
export interface TriageQuestion {
  id: string;
  prompt: string;
  index: number;        // 1-based position
  total: number;        // total questions in the set (≤ 3)
}

export interface TriageAnswer {
  questionId: string;
  prompt: string;       // denormalised for the result summary
  answer: "yes" | "no";
}

export interface TriageResult {
  recommendedSpecialty: string;
  videoRecommended: boolean;
  noEmergencySigns: boolean;
  answers: TriageAnswer[];
}

// --- Doctors & slots (P-07, P-08) ---
export type ConsultationMode = "video" | "in-person";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;              // 0..5
  nextAvailability: string;    // ISO 8601
  mode: ConsultationMode;
  priceClp: number;
}

export interface Slot {
  id: string;
  startsAt: string;            // ISO 8601
  mode: ConsultationMode;
}

// --- Cover & appointment (P-09, P-11, P-12) ---
export interface CoverQuote {
  feeClp: number;
  currency: "CLP";
  note: string;
}

export type AppointmentStatus = "confirmed";

export interface Appointment {
  reference: string;           // "TM-XXXXXX"
  status: AppointmentStatus;
  doctor: Doctor;
  slot: Slot;
  mode: ConsultationMode;
  feeClp: number;
}

// --- Triage flow status for the P-06 orchestrator ---
export type TriageStatus =
  | "idle"        // disclosure shown, not started
  | "loading"     // starting / fetching next
  | "question"    // presenting a question
  | "result"      // result card shown
  | "skipped"     // skipped by user or unavailable fallback
  | "error";

export interface BookingStateExtensions {
  triage: {
    status: TriageStatus;
    sessionId: string | null;
    currentQuestion: TriageQuestion | null;
    answers: TriageAnswer[];
    result: TriageResult | null;
  };
  specialtyFilter: string | null;   // seeded from triage "Use this" (Req 16.7, 17.5)
  selectedDoctor: Doctor | null;
  selectedSlot: Slot | null;
  coverQuote: CoverQuote | null;
  appointmentRef: string | null;
}
```

`BookingState` is extended to include the `BookingStateExtensions` fields; `createInitialBookingState()` initialises them to:

```typescript
{
  triage: { status: "idle", sessionId: null, currentQuestion: null, answers: [], result: null },
  specialtyFilter: null,
  selectedDoctor: null,
  selectedSlot: null,
  coverQuote: null,
  appointmentRef: null,
}
```

These are persisted to Session_Context on step completion alongside the existing fields; tokens are still never stored (Req 9.3, 9.5).

## New screens P-06..P-12

Each new screen lives in its own feature folder, mirroring the P-01..P-05 structure (one owning developer per screen). All backend interaction goes through the `apiClient` adapter to the Booking_API (or MSW when `VITE_USE_MOCKS=true`); no screen hardcodes backend logic.

### P-06 Quick check / AI triage (`features/p06-triage/`) — Dev C

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `TriageScreen` | Orchestrator over states `disclosure` / `question` / `result` / `skipped`; owns the P-06 timing mark and the 131 emergency notice; routes to P-07 on exit | 16.1, 16.11, 16.12, 13.3 |
| `TriageDisclosure` | Disclosure card: up to 5 quick questions, AI-assisted, answers go only to the doctor, never used to train models, a doctor makes every decision; "Allow the quick check" + "Skip" actions | 16.1, 16.2, 16.9 |
| `TriageQuestion` | Presents one Yes/No question at a time with "Question N of 3" progress and a "Skip the rest" action; submits each answer to the Booking_API and stores Q/A in Session_Context | 16.3, 16.4 |
| `TriageResult` | Result card: recommended specialty, "Video recommended" hint, "No emergency signs reported", answered-question summary; "Use this" (store specialty filter → P-07) and "Choose differently" (→ P-07, no filter) | 16.5, 16.6, 16.7, 16.8 |
| `TriageSkipped` | Fallback state when triage fails or exceeds 5 s, or when the user skipped on the disclosure; shows "See all available doctors" → P-07 | 16.9, 16.10 |

All questions/results come from the Booking_API triage endpoints; the frontend computes **no** triage logic (Req 16.12).

### P-07 Doctors available (`features/p07-doctors/`) — Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `DoctorsScreen` | Requests the doctor list on mount and on filter/sort change; loading / results / empty states; P-07 131 emergency notice; P-07 timing mark | 17.1, 17.2, 17.8, 17.9, 13.3 |
| `DoctorList` | Renders the returned `Doctor[]`; empty-results message when none match | 17.3, 17.8 |
| `DoctorCard` | Shows name, specialty, rating, next availability, mode, price; selecting stores the Doctor and navigates to P-08 | 17.3, 17.7 |
| `SpecialtyFilter` | Specialty filter control; initial value seeded from the P-06 recommended specialty when present; drives a backend-filtered request | 17.4, 17.5 |
| `SortControl` | Sort control; drives a backend-sorted request | 17.6 |

*Advanced filters (price band, language, availability window, gender preference) are deferred — not in this scope; `SpecialtyFilter` + `SortControl` are the only filter/sort controls built now.*

### P-08 Doctor profile and time (`features/p08-doctor-slot/`) — Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `DoctorProfile` | Renders the selected Doctor's profile; requests the Doctor's slots on mount; P-08 timing mark | 18.1, 18.2, 13.3 |
| `SlotPicker` | Lists slots (date+time) as selectable options; loading / no-times states; stores the selected Slot; Continue requires a selection (selection-required message otherwise); Back → P-07 | 18.3, 18.4, 18.5, 18.6, 18.7, 18.8 |

### P-09 Your cover and cost (`features/p09-cover/`) — Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `CoverCostScreen` | Requests the fixed Cover_Quote on mount; loading / loaded / error+retry states; shows the fixed fee and a "nothing charged until you confirm" statement; Continue → P-10, Back → P-08; P-09 timing mark | 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 13.3 |

### P-10 Review and confirm (`features/p10-review/`) — Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `ReviewScreen` | Summary of Care_Subject, reason + symptoms, Doctor, Slot date/time, mode, and fee, with an edit affordance per section that returns the wizard to the owning step; Confirm → P-11, Back → P-09; P-10 timing mark | 20.1, 20.2, 20.3, 20.4, 13.3 |

### P-11 Payment (`features/p11-payment/`) — Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `PaymentScreen` | Shows fee as total, a mock payment-method selection (at least a mock card), and a "slot is held" note; on pay, shows a processing state then submits `POST /api/appointments`; on success stores the appointment reference and advances to P-12; on failure/timeout (10 s) shows an error and keeps pay available for retry; captures/stores no card data and contacts no gateway; P-11 timing mark | 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 13.3 |

### P-12 Booking confirmed (`features/p12-confirmed/`) — Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `ConfirmedScreen` | Confirmation showing appointment reference, Doctor, scheduled date/time, and mode; a "what happens next" summary; a statement that P-12 ends the in-scope flow and the video day (P-14 onward) is a separate team's; P-12 timing mark | 22.1, 22.2, 22.3, 13.3 |

## Wizard model update

The wizard model is extended from P-01..P-05 to **P-01..P-12** (Req 24.1, 24.2).

### `WizardStep`, `WIZARD_ORDER`, `STEP_PATHS`

```typescript
export type WizardStep =
  | "P-01" | "P-02" | "P-03" | "P-04" | "P-05" | "P-06"
  | "P-07" | "P-08" | "P-09" | "P-10" | "P-11" | "P-12";

export const WIZARD_ORDER: readonly WizardStep[] = [
  "P-01","P-02","P-03","P-04","P-05","P-06",
  "P-07","P-08","P-09","P-10","P-11","P-12",
] as const;

export const STEP_PATHS: Record<WizardStep, string> = {
  "P-01": "front-door",
  "P-02": "sign-in",
  "P-03": "who-needs-care",
  "P-04": "reason",
  "P-05": "medical-history",
  "P-06": "triage",        // new
  "P-07": "doctors",       // new
  "P-08": "doctor",        // new (doctor profile + slot)
  "P-09": "cover",         // new
  "P-10": "review",        // new
  "P-11": "payment",       // new
  "P-12": "confirmed",     // new
};
```

The existing `useWizard` controller (`goNext` / `goBack` / `skip` / `goTo`) and the pure `transitions.ts` helpers (`advance` / `retreat` / `jumpTo`) are unchanged in shape; they operate over the longer `WIZARD_ORDER`, so transitions remain clamped to valid indices and `furthestStep` continues to never regress (Req 24.1, 24.3, 24.4).

### Route table (base `<base>` = `/booking` or `/patient/booking`)

```
<base>                → redirect to resume target (furthestStep) or P-01
<base>/front-door     → P-01   (public)
<base>/sign-in        → P-02   (public)
<base>/who-needs-care → P-03   (requires: authenticated)
<base>/reason         → P-04   (requires: careSubject)
<base>/medical-history→ P-05   (requires: careSubject)
<base>/triage         → P-06   (requires: careSubject)
<base>/doctors        → P-07   (requires: careSubject)
<base>/doctor         → P-08   (requires: selectedDoctor)
<base>/cover          → P-09   (requires: selectedDoctor + selectedSlot)
<base>/review         → P-10   (requires: selectedDoctor + selectedSlot)
<base>/payment        → P-11   (requires: selectedDoctor + selectedSlot)
<base>/confirmed      → P-12   (requires: appointmentRef)
```

### Guards (extended `JourneyGuard`)

The guard evaluates prerequisites against `BookingState` and redirects to the earliest unmet step (Req 10.5, 24.5, 24.6, 24.7):

- **Any step after P-02 without an authenticated session** → redirect to **P-02** (Req 24.5).
- **Any step after P-03 with no `careSubject`** → redirect to **P-03** (Req 24.6).
- **P-09 or later with no `selectedDoctor` or no `selectedSlot`** → redirect to the earliest unmet prerequisite among **P-07** (no doctor) then **P-08** (doctor but no slot) (Req 24.7).
- **P-12 without `appointmentRef`** → redirect to **P-11** (confirmation requires a created appointment; Req 22.1).

Resume on entry to `<base>` targets `furthestStep`; a reset/expired Session_Context discards tokens, clears persisted step state, and restarts at P-01 (Req 9.7, 9.8, 24.4).

## Folder structure update and ownership (P-06..P-12 + Booking_API)

The source tree gains the new feature folders and the backend app. The three-developer partition and single-owner-per-screen rule continue (Req 15.1, 15.5, 15.7).

```
telemedicine-frontend/apps/
├── patient-booking/                       # frontend SPA (unchanged structure + new features)
│   └── src/features/
│       ├── p06-triage/            # [Dev C]  TriageScreen, TriageDisclosure, TriageQuestion, TriageResult, TriageSkipped
│       ├── p07-doctors/           # [Dev B]  DoctorsScreen, DoctorList, DoctorCard, SpecialtyFilter, SortControl
│       ├── p08-doctor-slot/       # [Dev B]  DoctorProfile, SlotPicker
│       ├── p09-cover/             # [Dev B]  CoverCostScreen
│       ├── p10-review/            # [Dev A]  ReviewScreen
│       ├── p11-payment/           # [Dev A]  PaymentScreen
│       └── p12-confirmed/         # [Dev A]  ConfirmedScreen
│   # shared/types, shared/wizard, shared/state, shared/platform → shared-contract owner
└── patient-booking-api/                   # [shared-contract owner]  Booking_API (Express)
    └── src/  (server.js, data.js, problem.js, triage/*, doctors.js, cover.js, appointments.js)
```

### Updated ownership map

| Owner | New files | Requirements |
|-------|-----------|--------------|
| **Dev A** | `features/p10-review/`, `features/p11-payment/`, `features/p12-confirmed/` | 20.x, 21.x, 22.x |
| **Dev B** | `features/p07-doctors/`, `features/p08-doctor-slot/`, `features/p09-cover/` | 17.x, 18.x, 19.x |
| **Dev C** | `features/p06-triage/` | 16.x |
| **Shared-contract owner** | `apps/patient-booking-api/*` (entire Booking_API incl. Triage_Provider seam, doctors, cover, appointments, problem helper); `shared/types/booking.ts` additions; `shared/wizard` step model; `shared/state/BookingProvider` additions; extended MSW handler set in `@telemedicine/test-utils` | 23.x, 24.x, 9.5, 14.1, 15.5, 15.6 |

The Booking_API is owned by the shared-contract owner so that the HTTP contract and the Triage_Provider seam have a single steward; the three screen developers consume it only through the `apiClient` adapter, so no developer introduces a competing backend-call mechanism (Req 15.6, 23.12).

## Correctness Properties (continued)

Continuing the numbering from Property 6 above. The extended scope is mostly UI composition over backend data (best covered by example/integration tests against the Booking_API and MSW), but three new pure/stateful cores carry universal properties worth property-based testing: the triage session advancement, the appointment-reference format, and the doctor filter/sort invariants.

### Property 7: Triage asks at most 3 questions then yields a result

*For any* triage session started by the Triage_Provider and *any* sequence of Yes/No answers (including "skip the rest" at any point), `submitAnswer` returns at most 3 questions in total before `buildResult`/`result` is produced, every presented question's `index` is within 1..`total` with `total ≤ 3` and strictly increasing across the session, and once answers are exhausted or the rest is skipped a `TriageResult` is produced whose `answers` list equals exactly the questions that were answered (in order).

**Validates: Requirements 16.3, 16.5, 16.6, 23.3**

### Property 8: Appointment reference format and uniqueness

*For any* valid appointment-creation request, the Booking_API returns a reference matching the pattern `TM-[0-9A-Z]{6}`, the created Appointment echoes the requested doctor, slot, and mode with `status: "confirmed"` and a `feeClp` equal to the Cover_Quote fee for that booking, and no two successfully created appointments in a single service run share a reference.

**Validates: Requirements 21.4, 21.5, 22.1, 23.7**

### Property 9: Doctor query filtering and sorting are sound

*For any* seed doctor set and *any* `specialty` / `sort` query, every doctor returned by `GET /api/doctors` matches the requested specialty when one is supplied (and all are returned when none is), the result is a subset of the seed with no additions or duplicates, and when a `sort` option is supplied the returned list is ordered by that key (non-decreasing for ascending price / next-availability, non-increasing for rating).

**Validates: Requirements 17.3, 17.4, 17.6, 17.8, 23.4**

## Testing Strategy additions

- **Backend (Booking_API):** unit tests for `MockTriageProvider` (session advancement, result shape), `doctors.js` filter/sort helpers, the appointment-reference generator, and the `problem.js` envelope; a thin supertest-style integration pass over the new endpoints (7–14) asserting status codes and the RFC-7807 error shape on the documented error branches.
- **Property tests (fast-check, ≥100 iterations each, one test per property):** Property 7 against `MockTriageProvider`, Property 8 against the appointment store, Property 9 against the doctor filter/sort helpers. Each tagged `// Feature: patient-booking-intake, Property N: {property text}`.
- **Frontend:** example + `vitest-axe` tests per new screen (P-06..P-12) using `renderWithProviders` with `VITE_USE_MOCKS=true`, covering loading / results / empty / error+retry branches, the triage disclosure/question/result/skipped states, the P-11 processing→success→appointment-creation path and its retry-on-failure branch, and guard redirects for the new prerequisites. The MSW handler set mirrors endpoints 7–14 so tests exercise the same contract the backend serves (Req 14.1, 14.6).
- Coverage continues to target ≥ 80% line coverage with zero `jsx-a11y` / `vitest-axe` violations on tested screens (Req 14.7, 12.5).

## Requirements traceability (extension)

| Requirement | Design section(s) |
|-------------|-------------------|
| 16 — P-06 Quick check (triage) | New screens › P-06; Triage provider seam; Backend endpoints 7–9; Property 7 |
| 17 — P-07 Doctors available | New screens › P-07; Backend endpoint 10; Property 9 |
| 18 — P-08 Doctor profile & time | New screens › P-08; Backend endpoints 11–12 |
| 19 — P-09 Your cover and cost | New screens › P-09; Backend endpoint 13 |
| 20 — P-10 Review and confirm | New screens › P-10 |
| 21 — P-11 Payment | New screens › P-11; Backend endpoint 14 (post-mock-payment); Property 8 |
| 22 — P-12 Booking confirmed | New screens › P-12; Property 8 |
| 23 — Booking_API backend | Backend architecture (Booking_API); Triage provider seam; Properties 8–9 |
| 24 — Wizard model P-01..P-12 | Wizard model update (steps, routes, guards) |

*This extension keeps the Booking_App a frontend-only SPA talking to the standalone Booking_API over `/api` (MSW opt-in via `VITE_USE_MOCKS`), introduces no Module Federation, mocks payment entirely on the frontend, and isolates triage behind a provider seam so an LLM implementation can replace the mock without any contract or frontend change.*
---

# Extension: Manage-your-care (P-13, P-37, P-23, P-35)

> This section extends the design above to cover the manage-your-care scope (Requirements 25–30). Everything in the P-01..P-05 and P-06..P-12 designs — the provider tree, theming, i18n, accessibility, the linear `BookingWizard`, and existing Correctness Properties 1–9 — remains unchanged. The screens introduced here are **account-level** and are reachable **outside** the strict linear P-01..P-12 order while reusing the same `BookingProvider`, shell chrome, i18n, observability, and `JourneyGuard`. The two notable deltas to earlier assumptions are: (a) `AppointmentStatus` now includes `"cancelled"` in addition to `"confirmed"`; and (b) the Booking_API gains appointment-list / cancel and consent list / update endpoints, all still in-memory. P-12 gains a "Go to My care" action that enters this area.

## Backend endpoints (manage-your-care)

These endpoints are **added** to the existing Booking_API (`telemedicine-frontend/apps/patient-booking-api`, port 4000, `/api`). They reuse the in-memory stores, the correlation-id logger, and the RFC-7807 `problem.js` envelope already in place. No database is introduced; appointment status changes and consent changes do **not** survive a restart (Req 29.7).

### Store additions

- **Appointments** — `src/appointments.js` already holds a `Map<reference, Appointment>` and the `TM-XXXXXX` reference generator (used by `POST /api/appointments`). A `listAppointments(statusFilter?)` helper is added that returns the stored appointments as an array, optionally restricted to a single status. A `cancelAppointment(reference)` helper sets the stored appointment's `status` to `"cancelled"` and returns the updated record (or `undefined` when the reference is unknown).
- **Consents** — a new in-memory consents seed (e.g. `src/consents.js` holding a `Map<id, ConsentRecord>`) seeded with three records: platform terms & conditions, clinical informed consent, and data-sharing for this episode. Each record is `{ id, label, description, granted }`. `listConsents()` returns the array; `setConsentGranted(id, granted)` updates and returns the record (or `undefined` when unknown).

### New endpoint contract

Continuing the full endpoint table from the P-06..P-12 extension (endpoints 1–14), these are endpoints 15–18, all under `/api`:

| # | Method & path | Request | Response (200) | Error branches | Req |
|---|---------------|---------|----------------|----------------|-----|
| 15 | `GET /api/appointments?status=` | query: `status?` | `{ appointments: Appointment[] }` | — (empty array when none) | 25.3, 29.1 |
| 16 | `POST /api/appointments/:reference/cancel` | — | `{ appointment: Appointment }` with `status: "cancelled"` | `404` problem-JSON when reference unknown | 26.3, 26.4, 29.2, 29.3 |
| 17 | `GET /api/consents` | — | `{ consents: ConsentRecord[] }` | — | 27.3, 29.4 |
| 18 | `PATCH /api/consents/:id` | `{ granted: boolean }` | `{ consent: ConsentRecord }` (updated) | `404` problem-JSON when id unknown | 27.6, 27.7, 29.5, 29.6 |

Notes:
- `GET /api/appointments` returns the created appointments from the in-memory store; the optional `status` query restricts the result to that status (e.g. `?status=confirmed`). An empty list is a normal `200`, not an error (Req 29.1).
- `POST /api/appointments/:reference/cancel` is idempotent in effect: cancelling an already-cancelled appointment keeps `status: "cancelled"`. An unknown reference yields a `404` RFC-7807 problem response via `problem.js` (Req 29.3).
- `PATCH /api/consents/:id` updates only the `granted` state and echoes the full updated `ConsentRecord`; an unknown id yields a `404` problem response (Req 29.6).
- All failure responses continue to use the `{ type?, title, status, detail }` envelope; manage-your-care requests carrying a correlation id are logged with it (Req 29.8, 29.9).

The MSW handler set (opt-in via `VITE_USE_MOCKS=true`) mirrors endpoints 15–18 so offline/dev and the test suite stay faithful to the real contract.

### `AppointmentStatus` delta

`POST /api/appointments` still creates appointments with `status: "confirmed"`. The cancel endpoint is the only path that produces `"cancelled"`. The frontend `AppointmentStatus` union is widened accordingly (see New data models below).

## New data models

Additions to `apps/patient-booking/src/shared/types/booking.ts`. All existing types are retained; only `AppointmentStatus` changes and `ConsentRecord` is added.

```typescript
// Widened from "confirmed" to include the cancel outcome.
export type AppointmentStatus = "confirmed" | "cancelled";

// --- Consents (P-23) ---
export interface ConsentRecord {
  id: string;
  label: string;
  description: string;
  granted: boolean;
}
```

- The P-13 Home_Dashboard reads `Appointment[]` (already typed in the P-06..P-12 extension) from `GET /api/appointments`.
- The P-23 Consent centre reads `ConsentRecord[]` from `GET /api/consents`.
- No new persisted `BookingState` fields are required for the management screens: Home and Consent centre fetch their data on mount, and P-37 reads the target appointment by reference (from navigation state or a `?ref=` query, falling back to a lookup against the fetched list). The existing `appointmentRef`, `selectedDoctor`, and `selectedSlot` fields already in `BookingState` are reused by P-35 for the "slot held" status.

## Screens

Each screen lives in its own feature folder with a single owning developer, consistent with the per-screen ownership rule. All backend interaction goes through the `apiClient` adapter to the Booking_API (or MSW when `VITE_USE_MOCKS=true`). All four screens render inside the shared `BookingChrome` and the `BookingProvider` context, and record an observability timing mark on entry.

### P-13 Home / My care (`features/p13-home/`)

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `HomeScreen` | Fetches `GET /api/appointments` on mount; loading / list / empty states; filters out `"cancelled"` so only upcoming appointments show; hosts the "New consultation" action; P-13 timing mark | 25.3, 25.4, 25.6, 25.7, 25.9 |
| `UpcomingCard` | Renders one non-cancelled Appointment — Doctor, scheduled date/time, mode, and reference — with a "View" action and a "Cancel" action (Cancel → P-37 for that reference) | 25.5, 26.1 |
| `NewConsultationButton` | Resets the booking state in Session_Context to `createInitialBookingState()` and `goTo("P-01")` | 25.8 |
| `EmptyState` | Empty-state message inviting the patient to start a new consultation when no non-cancelled upcoming appointment exists | 25.6 |
| error+retry | On request failure or >5 s timeout, shows an error message and a retry action that re-requests the appointments | 25.9 |

Entry points: the P-12 "Go to My care" action and direct access to `/booking/home` by an authenticated patient both render Home (Req 25.1, 25.2). Unauthenticated access redirects to P-01 (Req 25.10, handled by the guard).

### P-37 Cancel consultation (`features/p37-cancel/`)

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `CancelScreen` | Resolves the target appointment by reference (navigation state or `?ref=` query, else a lookup against the fetched appointment list); shows the appointment summary (Doctor, date/time, reference) with the "Cancel this consultation?" prompt; P-37 timing mark | 26.1, 26.2 |
| confirm action | On confirm, `POST /api/appointments/:reference/cancel`; on success navigate to P-13 (where the cancelled appointment no longer appears as upcoming); on failure or >10 s timeout, show an error and keep the appointment unchanged | 26.3, 26.4, 26.5 |
| `KeepAppointmentButton` | "Keep appointment" returns to P-13 without cancelling | 26.6 |

If the route is reached without an appointment-reference context, the guard/screen redirects to P-13 (Req 30.3). Unauthenticated access redirects to P-01 (Req 26.7).

### P-23 Consent centre (`features/p23-consent-centre/`)

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `ConsentCentreScreen` | Fetches `GET /api/consents` on mount; loading / list states; hosts the display-only note and the Back-to-Home action; P-23 timing mark | 27.3, 27.5, 27.9, 27.10 |
| `ConsentToggle` | One consent row rendered with `role="switch"` and `aria-checked` reflecting the granted state; on toggle sends `PATCH /api/consents/:id { granted }` with an **optimistic** update, **reverting** to the prior state and showing an error message on failure or >5 s timeout; on success keeps the updated state | 27.3, 27.4, 27.6, 27.7, 27.8 |
| display-only note | A note stating that consents attached to past consultations are part of the medical record and are not changeable here | 27.9 |

Entry points: the Consent-centre affordance in the `DependentContextStrip` and a Consent-centre entry from Home both navigate to P-23 (Req 27.1, 27.2). Unauthenticated access redirects to P-01 (Req 27.11).

### P-35 Welcome back / resume (`features/p35-welcome-back/`)

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `WelcomeBackScreen` | Shown when a previously started, non-expired booking exists in Session_Context; greets the patient by name; renders a progress stepper over `WIZARD_ORDER` with the furthest reached step highlighted; P-35 timing mark; contains **no** notification-nudge content | 28.1, 28.5 |
| `ResumeButton` | Primary action: `goTo(furthestStep)` to resume at the furthest reached step persisted in Session_Context | 28.2 |
| `StartOverButton` | Secondary action: resets booking state in Session_Context to `createInitialBookingState()` and `goTo("P-01")` | 28.3 |
| `SlotHeldBadge` | Displays a "slot held" status when `selectedDoctor` and `selectedSlot` exist in Session_Context but `appointmentRef` is null | 28.4 |

Unauthenticated access redirects to P-01 (Req 28.6).

## Routing update

The management screens are added to `src/app/routes.tsx` under the **same base path** (`/booking` or `/patient/booking`), reusing the shared chrome and `JourneyGuard`, but **outside** the linear P-01..P-12 sequence. They are **not** added to `WizardStep`; `STEP_PATHS` continues to describe only P-01..P-12. The management routes use their own path constants (e.g. a `MANAGE_PATHS` map) so they never participate in `goNext`/`goBack` wizard transitions.

```
// linear wizard routes (P-01..P-12) — unchanged, see Wizard model update above
<base>/front-door ... <base>/confirmed

// management routes (account-level, outside the linear wizard)
<base>/home            → P-13 Home_Dashboard     (requires: authenticated)
<base>/cancel          → P-37 Cancel consultation (requires: authenticated + appointment context)
<base>/consent-centre  → P-23 Consent centre      (requires: authenticated)
<base>/welcome-back    → P-35 Welcome back         (requires: authenticated)
```

```typescript
// Management route path constants (NOT part of WizardStep / STEP_PATHS)
export const MANAGE_PATHS = {
  home: "home",
  cancel: "cancel",
  consentCentre: "consent-centre",
  welcomeBack: "welcome-back",
} as const;
```

Guard behaviour for the management routes (via the existing `JourneyGuard` with `requirements` support — `authenticated | careSubject | doctorSlot | appointment`):

- All four routes require an **authenticated** session; unauthenticated access redirects to **P-01** (Req 25.10, 26.7, 27.11, 28.6, 30.2, 30.5).
- `/booking/cancel` additionally requires an **appointment context** (a resolvable appointment reference); accessed without one it redirects to **P-13** (Req 30.3).
- These routes reuse the shell chrome, the authentication guards, and `BookingProvider` while rendering outside the strict linear P-01..P-12 sequence (Req 30.4).

The P-12 `ConfirmedScreen` gains a "Go to My care" action that navigates to `/booking/home` (Req 25.1), the single hand-off from the linear wizard into the management area.

## Correctness Properties (continued)

Continuing the numbering from Property 9. The management screens are mostly UI composition over backend data (best covered by example / integration tests), but the Home_Dashboard upcoming-list filter carries one universal invariant worth property-based testing.

### Property 10: Cancelled appointments never appear in the upcoming list

*For any* set of created appointments and *any* sequence of cancellations applied through `POST /api/appointments/:reference/cancel`, the "Upcoming consultations" list rendered by the P-13 Home_Dashboard contains exactly the appointments whose status is **not** `"cancelled"`, and every appointment set to `"cancelled"` is absent from that list regardless of order of cancellation.

**Validates: Requirements 25.5, 25.7, 26.4, 29.2**

## Testing Strategy additions

- **Backend (Booking_API):** unit tests for `listAppointments` (with and without the status filter), `cancelAppointment` (known / unknown reference → updated record / `undefined`), `listConsents`, and `setConsentGranted` (known / unknown id); a thin supertest-style integration pass over endpoints 15–18 asserting status codes and the RFC-7807 `404` shape on unknown reference / unknown consent id.
- **Property test (fast-check, ≥100 iterations, one test):** Property 10 against the appointment store + the Home upcoming-list selector, tagged `// Feature: patient-booking-intake, Property 10: {property text}`.
- **Frontend:** example + `vitest-axe` tests per management screen using `renderWithProviders` with `VITE_USE_MOCKS=true`:
  - P-13: loading / list / empty / error+retry; cancelled appointments excluded from the upcoming list; "New consultation" resets state and lands on P-01.
  - P-37: confirm → cancel → return to P-13; failure/timeout keeps the appointment; "Keep appointment" returns without cancelling; missing-context redirect to P-13.
  - P-23: `role="switch"` + `aria-checked` on each toggle; optimistic update on success; revert + error message on failure; display-only past-consent note.
  - P-35: greeting, progress stepper with furthest step highlighted, Resume → furthest, Start over → reset + P-01, "slot held" badge visibility, and absence of notification content.
  - Guard redirects: unauthenticated access to each of P-13/P-37/P-23/P-35 → P-01; P-37 without appointment context → P-13.
- The MSW handler set mirrors endpoints 15–18 so tests exercise the same contract the backend serves. Coverage continues to target ≥ 80% line coverage with zero `jsx-a11y` / `vitest-axe` violations on tested screens (Req 14.7, 12.5).

## Requirements traceability (manage-your-care extension)

| Requirement | Design section(s) |
|-------------|-------------------|
| 25 — P-13 Home / My care | Screens › P-13; Backend endpoint 15; Property 10 |
| 26 — P-37 Cancel consultation | Screens › P-37; Backend endpoint 16; Property 10 |
| 27 — P-23 Consent centre | Screens › P-23; Backend endpoints 17–18 |
| 28 — P-35 Welcome back (resume) | Screens › P-35 |
| 29 — Booking_API manage-your-care endpoints | Backend endpoints (manage-your-care); Properties 10 |
| 30 — Wizard & routing update for manage-your-care | Routing update (management routes, guards) |

*This extension keeps the Booking_App a frontend-only SPA talking to the standalone Booking_API over `/api` (MSW opt-in via `VITE_USE_MOCKS`). The P-13, P-37, P-23, and P-35 screens are account-level and reachable outside the strict linear P-01..P-12 order while reusing `BookingProvider`, the shell chrome, i18n, observability, and the `JourneyGuard`; they add no new persisted wizard step and leave `WizardStep` / `STEP_PATHS` unchanged.*

---

# Extension: Final screen batch (P-20, P-24, P-27..P-39 + Consultation-day stub)

> This section extends the design above to cover the final screen batch (Requirements 31-40). Everything in the P-01..P-05, P-06..P-12, and manage-your-care designs remains unchanged. The authoritative backend is now the **Java Spring Boot patient-booking-service** at `telemedicine-backend/services/patient-booking-service` (port 8120); the Node Booking_API is a non-authoritative reference only (Req 39.1, 39.9). The Vite dev proxy maps `/api` to `localhost:8120`. The screens introduced here are account/dependent/follow-up/edge screens plus a single stub standing in for the whole clinical-team video journey (P-14..P-22). They live **outside** the linear P-01..P-12 wizard, reuse the same `BookingProvider`, shell chrome, i18n, observability, and `JourneyGuard`, and are **not** added to `WizardStep` / `STEP_PATHS`.

## Backend (Java patient-booking-service) additions

The final-batch screens are served by the existing Java `BookingController` (`com.telemedicine.patientbooking.api.BookingController`) and in-memory `BookingData` store. Two additions are required; everything else reuses endpoints already built.

### Store additions (`BookingData`)

- **Seeded past appointments.** `BookingData` seeds at least one `"completed"` and one `"cancelled"` appointment at construction so the P-20 Past_Consultation_View has data without the user having to complete a live booking. These seeded records reuse existing `Doctor` and `Slot` shapes and carry a reference in the `TM-XXXXXX` format. The status filter on `listAppointments(statusFilter)` already restricts results, so `GET /api/appointments?status=completed` and `?status=cancelled` return the seeded past records (Req 31.2, 39.2).
- **Appointment lookup by reference.** A `getAppointment(reference)` helper returns `Optional<Appointment>` for a single stored appointment, backing the new lookup endpoint (Req 33.3, 39.3).

### New / reused endpoint contract (Java, under `/api`)

| # | Method & path | Request | Response (200) | Error branches | Req |
|---|---------------|---------|----------------|----------------|-----|
| 19 | `GET /api/appointments?status=` | query: `status` = `completed` \| `cancelled` \| `confirmed` | `{ appointments: Appointment[] }` filtered to the status | - (empty array when none) | 31.2, 39.2 |
| 20 | `GET /api/appointments/{reference}` | - | `Appointment` | `404` RFC-7807 problem JSON when reference unknown | 33.3, 39.3, 39.4 |
| 21 | `POST /api/appointments` (reused) | `{ careSubjectId, doctorId, slotId, mode, reason }` | `{ reference, status: "confirmed", ... }` | `400` missing fields | 35.6, 35.7 |
| 22 | `PATCH /api/consents/{id}` (reused) | `{ granted: false }` | `{ consent: ConsentRecord }` with `granted:false` | `404` unknown id | 37.3, 37.4, 39.5 |

`GET /api/appointments/{reference}` is added to `BookingController`; the handler calls `data.getAppointment(reference)` and throws `ResponseStatusException(NOT_FOUND, ...)` when absent, which the existing `ApiExceptionHandler` renders as RFC-7807 problem JSON (Req 39.4, 39.8). Permissive CORS for the local dev frontend is already configured in `WebConfig` (Req 39.7). All data remains in memory with no database, so changes do not survive a restart (Req 39.6).

The `Appointment` domain record is widened so `status` can be `"completed"` in addition to `"confirmed"` and `"cancelled"`; the frontend `AppointmentStatus` union is widened to match (see New data models below).

## New data models

Additions to `apps/patient-booking/src/shared/types/booking.ts`. All existing types are retained.

```typescript
// Widened to include the seeded past-consultation outcome.
export type AppointmentStatus = "confirmed" | "cancelled" | "completed";

// P-27 authority attestation persisted alongside the dependent booking.
export interface AuthorityAttestation {
  granted: boolean;
  dependentName: string;
  relationship: string;
}
```

`BookingState` gains an optional `authorityAttestation: AuthorityAttestation | null` field (initialised to `null` in `createInitialBookingState()`), set when the patient completes P-27 (Req 35.4). No other persisted wizard fields are added: the account/edge/follow-up screens fetch their data on mount or read an appointment reference from navigation state / a `?ref=` query.

## Screens

Each screen lives in its own feature folder with a single owning developer, consistent with the per-screen ownership rule. Data-backed screens reach the Java backend through the `apiClient` adapter (`/api/...` via the Vite proxy); informational screens render purely from the I18n_Library with no backend call. All screens render inside the shared `BookingChrome` and `BookingProvider` and record an observability timing mark on entry.

### P-20 Past consultation (`features/p20-past-consultations/`) - data-backed - Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `PastConsultationsScreen` | On mount requests past appointments via `GET /api/appointments?status=completed` and `?status=cancelled` (or a single call per status, merged); loading / list / empty / error+retry states; P-20 timing mark | 31.1, 31.2, 31.3, 31.6, 31.7 |
| `PastConsultationRow` | Selectable row showing Doctor, scheduled date/time, mode, reference, and status | 31.4 |
| `PastConsultationDetail` | On selection, shows the chosen appointment's Doctor, date/time, mode, reference, and status | 31.5 |

Auth-guarded; unauthenticated access redirects to P-01 (Req 31.8).

### P-24 Help (`features/p24-help/`) - informational - Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `HelpScreen` | Renders an FAQ section, a contact-options section, and an emergency notice; sources all text from i18n; makes no backend/Mock_Layer request; P-24 timing mark | 32.1, 32.2, 32.4, 32.5 |
| emergency notice | Instruction to call 131 (SAMU) with a `tel:131` link | 32.3 |

Reached from the "Help" entry in the shell chrome (Req 32.1).

### P-32 Find my appointment (`features/p32-find-appointment/`) - data-backed, public link-entry - Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `FindAppointmentScreen` | Reference input + "Find appointment" action; empty input keeps the step active with a "reference required" message; non-empty submits `GET /api/appointments/{reference}`; while in flight shows a loading indicator and disables the action; on match navigates to P-33 for that appointment; no match shows a not-found message; failure/>5s shows an error and re-enables the action; P-32 timing mark | 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7 |

Reachable **without** authentication (link-entry screen, Req 40.3).

### P-33 Consultation link (`features/p33-consultation-link/`) - public link-entry - Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `ConsultationLinkScreen` | Resolves the located appointment (navigation state or `?ref=` lookup via `GET /api/appointments/{reference}`); shows Doctor, date/time, mode, reference, and a join affordance; join navigates to the Consultation_Day_Stub; i18n text; P-33 timing mark | 34.1, 34.2, 34.7 |

Reachable without authentication (link-entry, Req 40.3).

### P-34 Invalid link (`features/p34-invalid-link/`) - informational, public link-entry - Dev A

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `InvalidLinkScreen` | Message that the link is expired/invalid; "Find my appointment" -> P-32; "Get help" -> P-24; i18n text; P-34 timing mark | 34.3, 34.4, 34.7 |

Reachable without authentication (link-entry, Req 40.3).

### P-36 Slot released (`features/p36-slot-released/`) - informational - Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `SlotReleasedScreen` | Message that the previously held slot was released; "Pick a new time" -> P-07 Doctors available; i18n text; P-36 timing mark | 34.5, 34.6, 34.7 |

Auth-guarded (Req 40.2).

### Dependent chapter P-27 / P-28 / P-29 (`features/p27-authority/`, `features/p28-dependent-review/`, `features/p29-follow-up-booked/`) - data-backed - Dev C

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `AuthorityAttestationScreen` (P-27) | Shown while Care_Subject is a Dependent before confirming; attestation checkbox stating the signed-in patient confirms authority + relationship, plus the Dependent's name and acting relationship; "Continue" with the box unchecked keeps the step active with an "attestation required" message; checking + Continue stores the Authority_Attestation as granted and navigates to P-28; P-27 timing mark | 35.1, 35.2, 35.3, 35.4 |
| `DependentReviewScreen` (P-28) | Summary showing the Dependent as Care_Subject, selected reason + symptoms, Doctor, Slot date/time, mode, and fee; "Confirm" submits `POST /api/appointments` for the dependent booking; on success stores the reference and navigates to P-29; failure/>10s shows an error and keeps P-28 active with Confirm available for retry | 35.5, 35.6, 35.7, 35.9 |
| `FollowUpBookedScreen` (P-29) | Shows the appointment reference, the Dependent, Doctor, scheduled date/time, and mode; P-29 timing mark | 35.8 |

All three auth-guarded; unauthenticated access redirects to P-01 (Req 35.10).

### Follow-up chapter P-30 / P-31 (`features/p30-follow-up-waiting/`, `features/p31-follow-up-complete/`) - informational - Dev C

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `FollowUpWaitingScreen` (P-30) | Waiting-room message that the live follow-up is delivered by the clinical team and integration is pending; onward action -> P-13 Home; i18n text; P-30 timing mark | 36.1, 36.2, 36.5 |
| `FollowUpCompleteScreen` (P-31) | Confirmation the follow-up is complete with a summary of Doctor, date/time, and mode; action -> P-13 Home; i18n text; P-31 timing mark | 36.3, 36.4, 36.5 |

Both auth-guarded; unauthenticated access redirects to P-01 (Req 36.6).

### Consent withdrawal P-38 / P-39 (`features/p38-withdraw-consent/`, `features/p39-consent-withdrawn-ended/`) - P-38 data-backed, P-39 informational - Dev B

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `WithdrawConsentScreen` (P-38) | Shows the targeted Consent_Record's label and a confirming prompt; an immutable-audit note that the withdrawal is recorded in the medical record and cannot be removed from the audit history; on confirm sends `PATCH /api/consents/{id}` with `granted:false`; on success reflects the withdrawn state; failure/>5s keeps the prior granted state and shows an error; cancel -> P-23 Consent centre without withdrawing; P-38 timing mark | 37.1, 37.2, 37.3, 37.4, 37.5, 37.6 |
| `ConsentWithdrawnEndedScreen` (P-39) | Informational message that the consultation ended because consent was withdrawn; action -> P-13 Home; P-39 timing mark | 37.7, 37.8 |

Both auth-guarded; unauthenticated access redirects to P-01 (Req 37.9).

### Consultation-day stub (`features/consultation-day-stub/`) - informational - Dev C

| Component | Responsibility | Satisfies |
|-----------|----------------|-----------|
| `ConsultationDayStub` | Heading identifying the consultation day; a statement that the live experience (identity check, consents, device check, waiting room, video call, documents, survey) is delivered by the clinical team and integration is pending; a visible integration-seam marker naming prototype screens P-14 through P-22; onward action -> P-13 Home; renders with no backend/Mock_Layer request; i18n text; timing mark | 38.1, 38.2, 38.3, 38.4, 38.6 |

This single stub stands in for the whole clinical-team video journey. Prototype screen P-18 (video call) and P-25 (notifications) are excluded from real implementation and represented only here where applicable (Req 38.5). It is the integration seam onward from P-33's join affordance (Req 34.2).

## Routing update

The final-batch screens are added to `src/app/routes.tsx` under the same booking base path, reusing the shared chrome and `JourneyGuard`, but **outside** the linear P-01..P-12 sequence and **not** added to `WizardStep` / `STEP_PATHS` (Req 40.5). They extend the existing `MANAGE_PATHS`-style constants.

```
// final-batch routes (account / dependent / follow-up / edge), outside the linear wizard
<base>/past-consultations -> P-20  (requires: authenticated)
<base>/help               -> P-24  (requires: authenticated)
<base>/find-appointment   -> P-32  (public - link entry)
<base>/consultation-link  -> P-33  (public - link entry)
<base>/invalid-link       -> P-34  (public - link entry)
<base>/slot-released      -> P-36  (requires: authenticated)
<base>/authority          -> P-27  (requires: authenticated)
<base>/dependent-review   -> P-28  (requires: authenticated)
<base>/follow-up-booked   -> P-29  (requires: authenticated)
<base>/follow-up-waiting  -> P-30  (requires: authenticated)
<base>/follow-up-complete -> P-31  (requires: authenticated)
<base>/withdraw-consent   -> P-38  (requires: authenticated)
<base>/consent-ended      -> P-39  (requires: authenticated)
<base>/consultation-day   -> Consultation_Day_Stub  (requires: authenticated)
```

Guard behaviour (via the existing `JourneyGuard`):

- The P-20, P-24, P-27, P-28, P-29, P-30, P-31, P-36, P-38, P-39, and Consultation_Day_Stub routes require an **authenticated** session; unauthenticated access redirects to **P-01** (Req 40.2, 40.4).
- The P-32, P-33, and P-34 routes are **link-entry** screens reachable **without** authentication, so they render with no `JourneyGuard` wrapper (consistent with P-01 / P-02) (Req 40.3).
- All final-batch screens render outside the strict linear P-01..P-12 sequence while reusing the shell chrome, the authentication guards, and Session_Context; onward and recovery actions on each screen navigate to their specified destinations (Req 40.5, 40.6).

## Correctness Properties (continued)

The final-batch screens are informational or thin data-backed views over already-covered backend logic (listing/filtering appointments, lookup by reference, consent patch), so they carry **no new universal property**. Property 10 (cancelled appointments excluded from the upcoming list) and Properties 8-9 (appointment reference/format, doctor filter/sort) already cover the backend invariants these screens rely on. The appointment-lookup-by-reference endpoint is covered by example/integration tests (found vs 404), and the status-filtered listing by the existing `listAppointments` filter tests extended with the seeded `"completed"` / `"cancelled"` records.

## Testing Strategy additions

- **Backend (Java):** extend the service tests with the seeded past appointments (`listAppointments("completed")` and `("cancelled")` return the seeds), and the new `getAppointment(reference)` lookup (known -> record, unknown -> empty / 404 via the controller). A thin MockMvc-style pass over `GET /api/appointments/{reference}` asserts 200 for a known reference and the RFC-7807 404 shape for an unknown one.
- **Frontend:** example + `vitest-axe` tests per data-backed screen (P-20 loading/list/empty/error+retry and row->detail selection; P-32 required/loading/match->P-33/not-found/error; P-28 confirm->create->P-29 and failure-retry; P-38 confirm->withdraw and failure-keeps-state). Informational screens (P-24, P-33, P-34, P-36, P-29, P-30, P-31, P-39, Consultation_Day_Stub) get a render + i18n + a11y test and an assertion that their onward/recovery actions navigate to the specified destinations and that no backend call is made where the requirement forbids it. Guard tests assert unauthenticated access to each auth-guarded route redirects to P-01, and that the three link-entry routes render without authentication.
- Coverage continues to target >=80% line coverage with zero `jsx-a11y` / `vitest-axe` violations on tested screens.

## Requirements traceability (final-batch extension)

| Requirement | Design section(s) |
|-------------|-------------------|
| 31 - P-20 Past consultation | Screens > P-20; Backend endpoint 19 |
| 32 - P-24 Help | Screens > P-24 |
| 33 - P-32 Find my appointment | Screens > P-32; Backend endpoint 20 |
| 34 - P-33 / P-34 / P-36 | Screens > P-33, P-34, P-36; Consultation-day stub |
| 35 - Dependent chapter P-27 / P-28 / P-29 | Screens > Dependent chapter; Backend endpoint 21 |
| 36 - Follow-up chapter P-30 / P-31 | Screens > Follow-up chapter |
| 37 - Consent withdrawal P-38 / P-39 | Screens > Consent withdrawal; Backend endpoint 22 |
| 38 - Consultation-day stub (P-14..P-22) | Screens > Consultation-day stub |
| 39 - Booking_API endpoints (Java) for the final batch | Backend (Java) additions; endpoints 19-22 |
| 40 - Routing and guards for the final batch | Routing update |

*This extension keeps the Booking_App a frontend-only SPA talking to the authoritative Java patient-booking-service over `/api` (proxied to port 8120). The final-batch screens are account / dependent / follow-up / edge screens plus a single stub for the clinical-team video journey (P-14..P-22); they are reachable outside the strict linear P-01..P-12 order while reusing `BookingProvider`, the shell chrome, i18n, observability, and the `JourneyGuard`, and they leave `WizardStep` / `STEP_PATHS` unchanged.*