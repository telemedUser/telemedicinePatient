# Agent Handoff — Telemedicine Patient/Physician Build

> Purpose: give a fresh agent (new account/session) the full working context so work can
> continue from the current step without re-discovery. Read this top-to-bottom first.
> Last updated: current session end (after building P-10 rebuild + P-14→P-17 join flow).

---

## 0. TL;DR of where we are

We are building a telemedicine platform (patient + physician modules). The **active work** is in the
**`telemedicinePatient_integration`** repo's standalone **`patient-booking`** app and its
**`patient-booking-service`** backend. The booking funnel (P-01→P-13) and the pre-join consultation
flow (P-14→P-17) are built and running. The **live video call** (two-way patient↔physician) is the
main pending piece.

Just completed this session:
- Rebuilt **P-10 Review & confirm** to match the prototype.
- Built **P-14 Confirm it's you (OTP)**, **P-15 Consents recap**, **P-16 Device check**, **P-17 Waiting room**.
- Added backend consultation-flow endpoints (OTP / consents / ready / status / doctor-open).
- Wired **My care → "Join consultation"** to launch the P-14→P-17 flow → `/consultation-video`.

---

## 1. Repos / folders (all under `c:\Users\anasin\Documents\telemedicine_docs\`)

| Folder | What it is | Status |
|--------|-----------|--------|
| `telemedicinePatient_integration` | **ACTIVE repo.** Full patient platform copy: backend services, Nx frontend, platform. The patient-booking app + service here are what we're building against. | In active use |
| `telemedicinePatient` | Earlier patient-only copy (patient-booking-service + patient-booking app). Superseded by the integration repo but shares the same Postgres DB (`patient_booking`) and port (:8120). | Legacy — do not run its :8120 at the same time as integration's |
| `telemedicine_physician` | Physician module (physician-service :8114 + physician-app :3015). Worklist, summary, patient-context pages built. | Built, runnable |
| `telemedicine_physician_integration` | Physician platform copy. Has NO video-conference package / video-consultation-service. | Reference |

Prototype design references (self-unpacking HTML bundles, open in a browser to view):
- `Bp Telemedicine Patient Prototype.html`
- `Bp Telemedicine Physician Prototype.html`
- `PRD-TM-001-v0.2-Blupa-Telemedicine-Platform.pdf`

Useful existing docs: `telemedicinePatient_integration/docs/Features.md`, `Gaps-and-Flags.md`, `Architecture.md`.

---

## 2. Product decisions (apply to ALL work — keep consistent)

- **Language:** English only.
- **Data/locale:** Indian names (Priya Sharma, Dr. Arjun Khanna, etc.), **INR** currency, ABHA/NMC-style refs, emergency number 112.
- **Branding:** neutral **"Connected Care"**. NEVER use the prototype's "blua"/"Bupa", "FONASA", "Webpay", "ClaveÚnica", "CLP", "Clínica Bupa Santiago", "Santiago (GMT-3)". Replace with neutral equivalents: "Insurance voucher", "Secured payment", INR.
- **Match the prototype's LAYOUT, components, colours** (navy `#10294A`, blue `#0079C8`, Figtree, warm paper `#e7e4dd`), NOT its copy/locale. The user sends prototype screenshots one at a time; collect ALL before implementing a batch.
- The `priceClp` / `feeClp` JSON keys are **legacy field names kept for frontend compatibility** but hold **INR** values. Don't rename them.

---

## 3. How to run everything (Windows / PowerShell)

Prereqs confirmed working on this machine:
- `JAVA_HOME = C:\Program Files\Java\jdk-21.0.12`
- Docker Desktop with the shared infra containers UP: `telemedicine-postgres-1`, `-redis-1`, `-consul-1`, `-kafka-1`.
- `corepack` provides pnpm@9.15.0 for the frontends (pnpm is NOT on PATH; use `corepack pnpm`).
- Kafka external port is **29092** (`KAFKA_BOOTSTRAP=localhost:29092`).

### Backend — patient-booking-service (:8120)
```
cwd: telemedicinePatient_integration\telemedicine-backend
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.12"; $env:KAFKA_BOOTSTRAP="localhost:29092"; $env:CONSUL_HOST="localhost"; $env:CONSUL_PORT="8500"; $env:DB_HOST="localhost"; $env:DB_PORT="5432"; $env:REDIS_HOST="localhost"; $env:REDIS_PORT="6379"; $env:REDIS_PASSWORD="change-me-locally"; .\gradlew.bat :patient-booking-service:bootRun --no-daemon --console=plain
```
Takes ~60s to boot. DB `patient_booking` / user `patient_booking` / pwd `change-me-locally`.
`telemedicine.security.mode=DEV`, `validate-on-migrate: false`, `allow-bean-definition-overriding: true`.

### Backend — physician-service (:8114)  (telemedicine_physician repo)
```
cwd: telemedicine_physician\telemedicine-backend
(same env but add) $env:DB_NAME="physician"; $env:DB_USER="physician"
.\gradlew.bat :physician-service:bootRun --no-daemon --console=plain
```

### Frontend — integration patient-booking (:3001)
```
# one-time: cwd telemedicinePatient_integration\telemedicine-frontend ; corepack pnpm install
cwd: telemedicinePatient_integration\telemedicine-frontend\apps\patient-booking
corepack pnpm dev
```
Proxies `/api` -> http://localhost:8120. `VITE_USE_MOCKS=false` (uses the real backend; MSW mocks are
INCOMPLETE — no doctors/slots/triage handlers, so always run the real :8120). `.env.development` has
`VITE_AUTH_MODE=dev`.

### Frontend — physician-app (:3015)  (telemedicine_physician repo)
```
cwd: telemedicine_physician\telemedicine-frontend
corepack pnpm exec nx serve physician-app
```
Proxies `/api`,`/ws` -> :8114 and `/booking-api` -> :8120. `.env.development` has `VITE_AUTH_MODE=dev`.

> IMPORTANT port/db collision: BOTH `telemedicinePatient` and `telemedicinePatient_integration`
> patient-booking-service use :8120 and DB `patient_booking`. Only run ONE at a time. The active one
> is the **integration** copy.

Patient demo login: `priya@example.in` / `correct-horse`. Physician worklist principal: `dev-physician`.

---

## 4. What's BUILT (patient booking + join flow)

All screens live in `telemedicinePatient_integration\telemedicine-frontend\apps\patient-booking\src\features\`.
Wizard order P-01→P-12 in `src/shared/types/booking.ts` (`WIZARD_ORDER`); routes in `src/app/routes.tsx`;
cross-screen state in `src/shared/state/BookingProvider.tsx`.

### Booking funnel (reworked to prototype this/last session)
- **P-04 reason** (`p04-reason/ReasonScreen.tsx` + `SymptomChips.tsx`): "What brings you in today?" — free text, backend auto-extracts "Symptoms we picked up" (removable pills, negation-aware e.g. "No cough" excluded) + "Also have any of these?" related chips. Backed by `SymptomCatalog`.
- **P-07 doctors** (`p07-doctors/DoctorsScreen.tsx`): "Doctors available" — search, Filters, Recommended sort, count line, rich cards (Recommended badge, Treats…, yrs experience, reviews, languages, Next available, In network · you pay ≈, See profile and times). INR.
- **P-08 doctor/slot** (`p08-doctor-slot/DoctorSlotScreen.tsx`): doctor profile (meta strip, consultation hours, rating-breakdown bars) + **Video/Audio toggle** + 7-day picker (per-day slot counts) + time pills + Continue.
- **P-09 cover** (`p09-cover/CoverCostScreen.tsx`): quote breakdown (fee − voucher = total), INR.
- **P-10 review** (`p10-review/ReviewScreen.tsx`): REBUILT to prototype — slot-held countdown, summary card (avatar+edit, WHEN/HOW/COVER/YOU PAY grid), booking notifications card, **4-consent gate** ("I agree to all" + "N of 4"), "Confirm and pay ₹…" disabled until all ticked.
- **P-11 payment** (`p11-payment/PaymentScreen.tsx`): slot-held countdown, saved/new card, voucher breakdown, "Pay ₹total", `/payments/confirm` then `POST /appointments`.
- **P-12 confirmed**, **P-13 My care** (`p13-home/HomeScreen.tsx`): Upcoming vs Past columns, opens-at strip + **Manage ▾ (Join consultation / Cancel)**, "Next steps" panel, "Everything in one place" tiles.

### Pre-join consultation flow (NEW this session) — `src/features/consultation-join/`
- **ConsultStepper.tsx** — 3-step header (Confirm it's you · Consents · Device check).
- **P-14 ConfirmItsYouScreen.tsx** — 6-digit OTP, demo code `739214`, Verify/Resend. Route `join/confirm`.
- **P-15 ConsentsRecapScreen.tsx** — read-only "given at booking" consents. Route `join/consents`.
- **P-16 DeviceCheckScreen.tsx** — real `getUserMedia` camera preview + live mic meter, device checklist (camera/mic/speaker/browser/connection), test sound, "I'm ready" → `POST /ready`. Route `join/device-check`.
- **P-17 WaitingRoomScreen.tsx** — "Dr. X will let you in", polls `/status`; when doctor-opened the strip becomes **Join** → `/consultation-video`. Messages + "While you wait". Route `join/waiting-room`.

Entry: My care → Manage ▾ → "Join consultation" → `/booking/join/confirm?ref=<appointmentRef>`.

### The live video screen (pre-existing, orphaned → now linked)
- `src/features/consultation-video/VideoConsultationScreen.tsx` — uses `@telemedicine/video-conference` (real WebRTC, role="patient"), connects to `ws://localhost:8130/ws`. Routes `video-consultation` AND `consultation-video`.

---

## 5. Backend — patient-booking-service (`telemedicinePatient_integration\telemedicine-backend\services\patient-booking-service`)

Package `com.telemedicine.patientbooking`. Port 8120. All endpoints under `/api` (via `BookingController`
and `ConsultationFlowController`). Serves the running app through the Vite proxy.

### Key classes
- `api/BookingController.java` — booking endpoints (auth, patients, symptoms/extract, triage, specialties, doctors, doctors/{id}, doctors/{id}/slots?mode=, cover/quote, payments/confirm, appointments CRUD, consents).
- `api/ConsultationFlowController.java` — **NEW**: `/consultations/{ref}/otp/send|otp/verify|consents|ready|status|doctor-open`.
- `service/BookingService.java` — listDoctors, **multi-day multi-mode slots** (`slots(doctorId, mode)`; deterministic ids `{doctorId}-{mode}-d{day}s{idx}`), createAppointment (publishes `AppointmentCreated` with `physicianRef=doctorId`, `patientRef=careSubjectName`), listAppointments, cancel (publishes `StatusChanged`).
- `service/ConsultationFlowService.java` — **NEW**: in-memory per-ref flow (OTP `739214`, verified, ready, status WAITING→OPEN_DOCTOR). markReady publishes `PatientEnteredWaitingRoom` + `DeviceTestCompleted`.
- `service/SymptomCatalog.java` — **NEW**: ~22 symptoms with trigger synonyms + related groupings; negation-aware `pickUp()` + `related()` + `hasRedFlag()`.
- `service/PatientReferenceData.java` — patient profile, dependents, medical history; delegates symptom extraction to SymptomCatalog.
- `domain/DoctorEntity.java` — has yearsExperience, treats, clinic, modes, durationMin, recommended, inNetwork, hours, ratingBreakdown (+ legacy name/specialty/rating/reviews/nextAvailability/mode/priceClp/languages/bio).
- `domain/AppointmentEntity.java` — has `care_subject_name`.

### Flyway migrations (IMPORTANT — version collision gotcha)
Because `telemedicinePatient` and `_integration` share one DB, their migration **version numbers collide**.
The DB already recorded V100-V104 from the other repo. The integration-specific migrations were therefore
numbered **V110+**:
- `V100-V103` — schema + doctor/appointment/consent seeds (shared shape).
- `V110__doctor_detail_and_patient_name.sql` — adds the new doctor columns + `care_subject_name` (ASCII only; an earlier en-dash/·version caused mojibake failures — keep SQL ASCII).
- `V111__seed_doctor_directory.sql` — enriches the 4 base doctors + adds 8 more (12 total, 1 recommended). ASCII only.

GOTCHA: a stale `build/resources/main/db/migration` copy once kept an old renamed migration and caused
Flyway failures. If migrations misbehave after renaming, delete `services/patient-booking-service/build/resources`
and restart so `processResources` recopies from `src`.

### Events (Kafka, shared `java-common-events`)
- Booking publishes `AppointmentCreated` (physicianRef = doctorId so it routes to that doctor's worklist; patientRef = patient name).
- Cancel publishes `StatusChanged`.
- Device-check "ready" publishes `PatientEnteredWaitingRoom` + `DeviceTestCompleted`.
- The physician-service `WorklistProjectionListener` consumes these; its worklist is scoped by provider_id + market "IN".

---

## 6. Physician side (telemedicine_physician) — brief

- `physician-service` :8114, DB `physician`. Worklist read model from events. Dev principal `dev-physician` (DevSecurityConfiguration anonymous). Per-physician login was built then **reverted** (user asked to revert) — currently single `dev-physician` worklist.
- `physician-app` :3015 — Worklist (subtle table matching prototype), Summary page, Patient Context page (reads real booking details via `/booking-api` proxy → :8120). Design language in `src/styles/theme.css` + `src/ui/primitives.tsx` (shared PageHeader/PageBody/Section/InfoCard/etc.).

---

## 7. VIDEO — the main pending work (next up)

Two video stacks exist:
- **Path B (target for booking journey):** `video-consultation-service` (:8130, WebRTC signaling over WebSocket `/ws`, rooms keyed by appointment ref) + frontend `@telemedicine/video-conference` package (real RTCPeerConnection; `role="doctor"` creates the offer, `role="patient"` answers). The patient `VideoConsultationScreen` uses this. Location: `telemedicinePatient_integration\telemedicine-backend\services\video-consultation-service` and `...\telemedicine-frontend\packages\video-conference`.
- Path A (federated MFE journey): `video-service` (:8103) + `@telemedicine/video-adapter` (Vonage/ACS/Simulator). Separate; not the booking journey.

### What's PENDING to make a real call work (Path B):
1. **Start `video-consultation-service` (:8130)** — it's a Gradle module but NOT in docker-compose/gateway; must be run manually. No Consul registration.
2. **Physician "doctor" peer** — there is NO physician client joining the :8130 room with `role="doctor"`. Without it the patient sits at "waiting for other participant". The physician integration folder has neither the video-conference package nor the service. Needs: add the join (same appointment-ref room, role doctor) to the physician app, OR a simple doctor test page.
3. **"Doctor opens room" trigger** — P-17 polls `GET /api/consultations/{ref}/status`; flip via dev hook `POST /api/consultations/{ref}/doctor-open`. In a real flow the physician "admit" should drive this. Consider adding a visible dev button.
4. **TURN/STUN** — `useWebRtcCall` defaults `iceServers=[]` (LAN/localhost only). Real cross-network calls need a TURN server plumbed through.
5. **WS auth / room provisioning** — none today (anyone with the ref can join; WS origin `*`). Fine for demo.
6. Optionally push booking/triage context to the service's clinical `/api` (patient-context, care-plan DRAFT→FINALIZED) which exists but is unused by the booking flow.

Vite config note: the patient app aliases `@telemedicine/video-conference` AND its `/styles.css` subpath
(bare-name alias shadows the package exports; both entries needed, CSS subpath first).

---

## 8. Known gotchas / lessons

- **Port/DB collision** between the two patient repos (:8120, DB patient_booking) — run only one.
- **Flyway version collisions** across repos sharing the DB — use V110+ for integration-only migrations; keep SQL ASCII (no en-dash `–` / middle-dot `·` → mojibake); nuke `build/resources` if a renamed migration lingers.
- **MSW mocks are incomplete** in patient-booking — always run against the real :8120 (`VITE_USE_MOCKS=false`).
- **Node 20 required** for the Nx frontend; Node 24 breaks Nx.
- **pnpm via corepack** only; pnpm not on PATH.
- **Dev console output** in this environment interleaves oddly; trust HTTP status codes / the actual file state.
- Physician frontend `node_modules` junctions can dangle if a repo folder is renamed — clean reinstall fixes.
- `ConsultationMode` in patient booking is `"video" | "audio"` (was `"video" | "in-person"`).

---

## 9. Verified working end-to-end (this session)

- Symptom extract: "Sore throat…, painful to swallow, mild headache. No cough" → pickedUp [Sore throat, Painful swallowing, Fever, Headache], related [Swollen glands, Hoarse voice, Chills, Sweats, …], Cough correctly excluded.
- `/cover/quote?doctorId=doc-khanna` → fee 800, voucher 280, total 520 INR.
- Full booking (symptoms→doctors→audio slot→quote→payments/confirm→appointment) → created appointment, status confirmed, mode audio.
- Consultation flow: otp/send→739214, otp/verify→verified, consents→4 items, ready→publishes events, status WAITING→(doctor-open)→OPEN_DOCTOR.
- 12 doctors seeded (1 recommended). Physician worklist shows patient name (from careSubjectName).

---

## 10. Suggested next steps (where the user is heading)

The user said they'll "go through more changes for further flow". Likely next: the **live consultation
screens and beyond** — the in-call experience (P-18+), post-call documents (P-19/clinical docs), survey,
and making the **two-way video actually connect** (physician doctor-peer on :8130). When the user sends
the next prototype screenshots, collect them all, then implement + wire backend, matching layout and
keeping the Section 2 decisions. Start the video service and add the physician join when video is the focus.
