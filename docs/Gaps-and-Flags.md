# Telemedicine Patient — Current State, Gaps & Flags

Brief, current-state assessment grounded in the repo code/configs and the
verified `Features.md` / `Skills.md`. Items are facts observed in the repo, not
speculation.

## 1. Current state (snapshot)

| Area | State |
|------|-------|
| Patient shell + 6 MFEs | Present, Module Federation wired via `mfe-manifest.json` |
| Backend domain services | 11 services + patient-bff, all Gradle modules with controllers |
| Event backbone | Kafka with 28 domain events, each + `.RETRY` + `.DLQ`; idempotent consumers |
| Gateway | Spring Cloud Gateway, config-driven routes, Resilience4j CB, Redis rate-limit |
| Discovery / auth | Consul + Keycloak (OAuth2 PKCE), dev bypass available |
| External integrations | Via `integration-service` → `external-simulators` (HIS/MPI/FONASA/video/notify) |
| Observability | Prometheus + Jaeger wired |
| Orchestration | Docker Compose (profile-driven) + Kubernetes manifests + HA (Kafka HA) |

## 2. Repo-wise gaps & flags

### Flags (things to be aware of)
- **Two parallel "video" paths.** `video-service` (:8103, gateway + compose) backs
  the Module Federation journey. `video-consultation-service` (:8130) is a separate
  peer-to-peer WebRTC signaling service for the standalone booking/demo path — **not**
  in the gateway or compose. Clarify which is the target for production.
- **Booking funnel is standalone, not an MFE.** `patient-booking` (:3001) + Express
  mock `patient-booking-api` are a self-contained demo, wired independently from the
  shell journey. The real consultation journey uses the 6 federated MFEs.
- **`patient-booking-service`** is a Gradle module but is **not published in
  `docker-compose.yml`** — so the booking funnel's "real" backend is not part of the
  standard local stack.
- **Templates are scaffolding only:** `services/_template-java`, `_template-python`
  (FastAPI, not a Gradle module), and `_template-mfe` (:3001 collides with booking).
- **Node 20 required.** Node 24 breaks Nx (WebAssembly fallback → "Cannot find project").
  Strict ports; `/api` proxy needs the gateway up. (See Skills.md gotchas.)

### Gaps (verify / likely incomplete)
- **Mock-heavy external layer.** All external vendor calls hit simulators. No evidence
  of real HIS/MPI/FONASA/video-vendor credentials wiring in-repo (expected for a sim-first build).
- **Booking → journey handoff.** Booking publishes `AppointmentCreated`/`StatusChanged`,
  but the standalone booking app and the federated journey are "wired independently" —
  confirm the end-to-end booking→consent→consultation continuity is actually connected.
- **Python template unused.** A FastAPI template exists but no Python domain service is
  built — confirm whether any service is intended to be Python.

## 3. Prototype vs repo (readable fragments)

> Based on readable fragments extracted from `Bupa Telemedicine Patient Prototype.html`
> (a self-unpacking React bundle). A full visual review requires opening it in a browser;
> flagged here as partial.

- Prototype shows a **booking-led, dependent-aware** flow: e.g. "Booking for Emilia
  Vergara Rojas", "You're acting as her mother", "both identities are recorded", with a
  `goConsent` transition → booking → consent onward.
- Repo match: dependent/"acting as" booking exists in `patient-booking`; consent exists
  as a federated MFE. **Flag:** prototype presents booking and consent as one continuous
  flow, while the repo splits them across the standalone app and the MFE journey (see §2).
- **Action:** do a side-by-side screen walk-through once the prototype is rendered, to
  confirm screen parity (triage, cover quote, mock payment, waiting room, consultation,
  documents, survey).

## 4. PRD comparison — PENDING

The PRD (`PRD-TM-001-v0.2`) is a PDF whose text layer could not be reliably extracted in
this environment (output was font/glyph binary). **PRD-vs-repo gap analysis is not done.**
To complete it, provide the PRD as text/`.md`/`.docx` (export from the PDF), or install a
working Python + `pypdf`. This section will be filled in once a readable PRD is available.
