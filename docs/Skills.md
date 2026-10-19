# Telemedicine Patient — Skills & Onboarding

What you need to know to work in the `telemedicinePatient` mono-workspace: the tech stack,
the concepts the codebase assumes you understand, where things live, and how to build, run,
and test locally on **Windows / PowerShell**.

---

## Tech stack by layer

| Layer | Technology | Version (from repo) | Where confirmed |
|-------|-----------|---------------------|-----------------|
| Backend language/build | Java + Gradle (multi-module) | Java **21**; Spring Boot **3.3.5**; Spring Cloud | `telemedicine-backend/build.gradle` (`VERSION_21`, plugin `3.3.5`) |
| API edge | Spring Cloud Gateway | Spring Cloud BOM | `gateway/src/main/resources/application.yml` |
| Service discovery | HashiCorp Consul | `hashicorp/consul:1.19` | `telemedicine-platform/.env.example` |
| Auth server | Keycloak | `quay.io/keycloak/keycloak:25.0` | `.env.example`, `docker-compose.yml` |
| Datastores / infra | PostgreSQL 16.4, Redis 7.4, Kafka 3.7, MinIO | pinned images | `.env.example` |
| Observability | Prometheus v2.54, Jaeger 1.57 (OTLP) | pinned images | `.env.example` |
| Frontend runtime | Node **20** + pnpm **9.15.0** | `packageManager: pnpm@9.15.0` | `telemedicine-frontend/package.json` |
| Monorepo tooling | Nx **20.4.0** | `nx 20.4.0` | `package.json` devDependencies |
| Build/dev server | Vite **5.4** | `vite ^5.4.11` | `package.json` |
| UI | React **18.3** + TypeScript **5.6** | `react ^18.3.1`, `typescript ~5.6.3` | `package.json` |
| Microfrontends | Module Federation (`@module-federation/vite ^1.2`, runtime `^0.8.3`) | — | `package.json`, each `vite.config.mts` |
| Testing (frontend) | Vitest 2.1 + Testing Library + MSW 2.7 + axe-core 4.10 | — | `package.json` |
| Containers / orchestration | Docker Compose (profile-driven) + Kubernetes | — | `telemedicine-platform/docker-compose.yml`, `kubernetes/` |

---

## Required skills and concepts

To be productive here, be comfortable with:

- **Microservices + schema-per-service** — many small Spring Boot services, each owning its
  own database; integrate via APIs and events, never shared tables.
- **Service discovery** — Consul registration and `lb://service-name` routing at the gateway.
- **BFF pattern** — `patient-bff` / `physician-bff` / `admin-bff` aggregate downstream calls;
  no business logic or persistence belongs in a BFF.
- **OAuth2 / OIDC with PKCE** — browser apps authenticate against Keycloak using the
  Authorization Code + PKCE (S256) flow; the gateway validates JWTs.
- **Module Federation / microfrontends** — the shell is a host that lazy-loads independently
  deployed remote `./App` modules at runtime from a manifest.
- **Nx monorepo** — project graph, task caching, `nx serve/build/test`, affected commands.
- **Vite** — dev server, `strictPort`, dev proxy, Module Federation plugin config.
- **WCAG 2.1 AA accessibility** — the design system targets AA; tests include `axe`.
- **i18n** — all user-facing strings go through `@telemedicine/i18n` (es-CL + en), no
  hardcoded UI strings.
- **Observability / distributed tracing** — OTLP to Jaeger, Prometheus metrics,
  correlation IDs end to end.
- **Docker Compose profiles + Kubernetes** — the platform is brought up by profile
  (`infra,observability,sim,edge,platform,domain,apps`).

---

## Repo layout — where things live

```
telemedicinePatient/
├─ README.md                     # top-level overview + quick start
├─ datastore/                    # mock seed data: appointments.json, mpi-patients.json, README, DELETION.md
├─ .github/workflows/            # CI: backend-ci, frontend-ci, deploy-staging, deploy-prod, performance-test
├─ telemedicine-backend/         # Spring/Java services (Gradle multi-module)
│  ├─ build.gradle, settings.gradle, build-logic/   # Java 21, convention plugins
│  ├─ gateway/                   # Spring Cloud Gateway (:8080), route table
│  ├─ bff/                       # admin-bff, patient-bff, physician-bff
│  ├─ platform/                  # audit-service, config-service, scheduler-service
│  ├─ services/                  # domain services (see table below) + _template-java/_template-python
│  ├─ simulators/                # external-simulators (:8200)
│  ├─ shared/                    # java-common-* libraries, python-common, contracts (OpenAPI)
│  ├─ config/checkstyle.xml      # checkstyle config
│  └─ docs/                      # backend architecture docs
├─ telemedicine-frontend/        # Nx + pnpm monorepo
│  ├─ package.json, nx.json, pnpm-workspace.yaml, tsconfig.base.json
│  ├─ apps/                      # shells + MFEs + patient-booking + patient-booking-api + _template-mfe
│  ├─ packages/                  # 19 reusable libraries (see Features.md)
│  └─ tools/                     # mfe scaffolding/generators
└─ telemedicine-platform/        # full-stack wiring
   ├─ docker-compose.yml         # profile-driven stack
   ├─ Makefile, .env.example
   ├─ infra/ observability/ kubernetes/ scripts/ (verify-*.ps1/.sh)
   └─ docs/                      # architecture, build-sequence, operational-manual, adding-a-service, adding-an-mfe, ...
```

### Backend domain services

`waiting-room-service`, `identity-service`, `video-service`, `telemetry-service`,
`clinical-docs-service`, `notification-service`, `integration-service`, `survey-service`,
`reporting-service`, `monitoring-service`, `patient-booking-service`, plus platform
(`config-service`, `audit-service`, `scheduler-service`) and `external-simulators`. Ports and
routes are in [Features.md](./Features.md).

### Frontend apps (`apps/`)

- Patient shell: `shell` (`:3000`).
- Patient MFEs: `mfe-patient-consent` (3002), `mfe-patient-identity` (3003),
  `mfe-patient-waiting-room` (3004), `mfe-patient-consultation` (3005),
  `mfe-patient-documents` (3006), `mfe-patient-survey` (3007).
- Physician: `physician-shell` (3010), `physician-app`, `mfe-physician-consultation` (3011),
  `mfe-physician-documentation` (3012), `mfe-physician-patient-context` (3013).
- Admin: `admin-shell` (3020), `mfe-admin-config` (3021), `mfe-admin-dashboards` (3022),
  `mfe-admin-audit` (3023), `mfe-admin-access` (3024), `mfe-admin-monitoring` (3025).
- Standalone: `patient-booking` (`:3001`, Vite app), `patient-booking-api` (Express mock),
  `_template-mfe` (`:3001` template).

> Physician/admin MFE ports (3011–3013, 3021–3025) are documented in
> `telemedicine-platform/docs/build-sequence.md`; patient MFE ports are verified against each
> app's `vite.config.mts` and `apps/shell/public/config/mfe-manifest.json`.

---

## Build, run, and test locally (Windows / PowerShell)

### Prerequisites

- **Docker Desktop** (for the backend + infra stack).
- **Node 20** — this is REQUIRED (see the Node/Nx gotcha below).
- **pnpm 9.15** (the repo pins `pnpm@9.15.0`).
- Java 21 + Gradle are optional for local frontend work; Docker builds the Java services.

> **Node version matters.** Node 24 makes Nx fall back to a broken WebAssembly mode. The
> symptom is the Nx daemon warning about WebAssembly followed by `Cannot find project 'shell'`
> when running `pnpm dev`. Use Node 20. If you use `nvm-windows`, install and select it:
>
> ```powershell
> nvm install 20
> nvm use 20
> node -v   # expect v20.x
> ```
>
> If `nvm` is not recognized, install nvm-windows first (or use Volta / the Node 20 MSI),
> then re-open the terminal so PATH is refreshed.

### 1. Start the backend (Docker)

From `telemedicine-platform`:

```powershell
cd c:\Users\anigup\telemed\telemedicinePatient\telemedicine-platform
Copy-Item .env.example .env
docker compose up -d --build
```

The default `COMPOSE_PROFILES` in `.env.example` is `infra,observability,sim,edge,platform`.
Add `,domain` to also start the domain services the patient journey calls:

```powershell
$env:COMPOSE_PROFILES = "infra,observability,sim,edge,platform,domain"
docker compose up -d --build
```

Verify Phase 0:

```powershell
pwsh ./scripts/verify-phase0.ps1
```

Key local URLs: gateway `http://localhost:8080`, Consul `http://localhost:8500`,
Keycloak `http://localhost:8180`, Prometheus `http://localhost:9090`,
Jaeger `http://localhost:16686`, simulators `http://localhost:8200`.

### 2. Install frontend dependencies

From `telemedicine-frontend`:

```powershell
cd c:\Users\anigup\telemed\telemedicinePatient\telemedicine-frontend
pnpm install
```

> **PowerShell execution policy.** If `pnpm` is blocked (`running scripts is disabled on this
> system`), allow signed local scripts for your user:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

### 3. Run the patient shell + its MFEs

The shell lazy-loads each MFE's `remoteEntry.js` over HTTP, so **each app must run in its own
terminal**. Ports are `strictPort`, so a busy port fails fast rather than falling back.

```powershell
# terminal 1 — host
pnpm nx serve shell                       # :3000

# terminals 2..7 — remotes
pnpm nx serve mfe-patient-consent         # :3002
pnpm nx serve mfe-patient-identity        # :3003
pnpm nx serve mfe-patient-waiting-room    # :3004
pnpm nx serve mfe-patient-consultation    # :3005
pnpm nx serve mfe-patient-documents       # :3006
pnpm nx serve mfe-patient-survey          # :3007
```

`pnpm dev` is a shortcut for `nx serve shell` only. Open `http://localhost:3000`.

**Auth dev bypass** — to skip Keycloak locally, run with the dev auth mode (the shell's
`authConfig` treats `VITE_AUTH_MODE === 'dev'` as `devMode`, minting a `PATIENT` dev user):

```powershell
$env:VITE_AUTH_MODE = "dev"
pnpm nx serve shell
```

**Fallback if Nx fails** — you can run Vite directly from an app directory:

```powershell
cd c:\Users\anigup\telemed\telemedicinePatient\telemedicine-frontend\apps\shell
pnpm exec vite
```

### 4. Run the standalone booking app (optional)

```powershell
# terminal 1 — mock API (Express, defaults to :4000)
cd c:\Users\anigup\telemed\telemedicinePatient\telemedicine-frontend\apps\patient-booking-api
pnpm start

# terminal 2 — booking UI (:3001)
cd c:\Users\anigup\telemed\telemedicinePatient\telemedicine-frontend\apps\patient-booking
pnpm dev
```

> The booking app's Vite config proxies `/api` to `http://localhost:8120`. The bundled mock
> API listens on `:4000` by default, so point one at the other (set `PORT=8120` on the mock,
> or adjust the proxy target) if you want the UI to hit the local mock.

### 5. Test, lint, typecheck

```powershell
# frontend (from telemedicine-frontend)
pnpm test                 # library tests via Nx (tag:type:lib)
pnpm test:coverage        # vitest with coverage
pnpm lint                 # ESLint across the workspace
pnpm typecheck            # tsc --noEmit on tsconfig.base.json
pnpm storybook            # design-system Storybook (:6006)

# platform verification scripts (from telemedicine-platform)
pwsh ./scripts/verify-part5.ps1   # packages
pwsh ./scripts/verify-part6.ps1   # MFEs + shells
```

For backend modules, Gradle is used (Docker handles this in the compose build). Example:

```powershell
cd c:\Users\anigup\telemed\telemedicinePatient\telemedicine-backend
./gradlew :gateway:check
```

---

## Conventions and patterns

- **Backend quality gates:** Checkstyle config at `telemedicine-backend/config/checkstyle.xml`;
  convention plugins live in `build-logic/`. Services target Java 21 and compile with
  `-parameters`. Shared libraries (`java-common-*`) are built before domain services (see
  build-sequence).
- **Frontend testing:** Vitest + Testing Library + MSW (request mocking) + axe
  (accessibility). Coverage thresholds are enforced (e.g. `patient-booking` requires 80%
  lines/functions/statements, 75% branches).
- **CI:** `.github/workflows/` — `backend-ci.yml`, `frontend-ci.yml`,
  `deploy-staging.yml`, `deploy-prod.yml`, `performance-test.yml`. CI enforces ~80% coverage
  gates (per build-sequence Phase 9 / Part 7).
- **i18n:** no hardcoded UI strings; use `useTranslation(namespace)` from
  `@telemedicine/i18n`. Locales: `es-CL` (primary) and `en`.
- **Adding a backend service:** scaffold with the Makefile
  (`make scaffold-java NAME=...`), register it in `settings.gradle` and the gateway route
  table (`gateway/src/main/resources/application.yml`), and add it to `docker-compose.yml`
  under the right profile. See `telemedicine-platform/docs/adding-a-service.md`.
- **Adding an MFE:** scaffold with `pnpm nx g @telemedicine/mfe:app <name>` (or
  `node tools/scaffold-mfe.mjs`), then **register the remote** in the owning shell's
  `public/config/mfe-manifest.json`. See
  `telemedicine-platform/docs/adding-an-mfe.md`.

### MFE manifest registration pattern

The shell discovers remotes from `apps/shell/public/config/mfe-manifest.json`. Each entry
declares the remote name, the `remoteEntry.js` URL, the shell `route`, the exposed `module`
(`./App`), the `roles` allowed to see it, and version constraints:

```json
{
  "name": "mfePatientConsent",
  "url": "http://localhost:3002/assets/remoteEntry.js",
  "route": "/patient/consent",
  "enabled": true,
  "module": "./App",
  "roles": ["PATIENT"],
  "version": "1.0.0",
  "minShellVersion": "1.0.0"
}
```

At runtime the shell filters by role (`filterRemotesByRole`) and by config-service feature
flags (`mergeConfigEnablement`) before mounting the route. The remote's Vite config must
expose `./App` and set a matching federation `name` (see each `vite.config.mts`).

---

## Common gotchas

- **Node 24 / Nx WebAssembly** — using Node 24 triggers the Nx WebAssembly fallback and
  `Cannot find project 'shell'`. Use **Node 20**.
- **PowerShell execution policy** — `pnpm` may be blocked; fix with
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **Strict ports** — the shell and MFEs use `strictPort: true`. If `:3000`/`:3002`–`:3007`
  are occupied, the dev server errors out instead of picking another port; free the port.
- **/api proxy needs the gateway** — dev servers proxy `/api/*` to `http://localhost:8080`.
  If the backend stack isn't up, API calls fail; start the backend first (step 1).
- **PowerShell syntax** — use `Copy-Item` (not `cp`), `;` to chain (not `&&`), and
  `$env:VAR = "x"` to set environment variables for a command.
- **Run each remote separately** — the host needs every remote's dev server running to load
  that route; a missing remote shows the shell's "remote unavailable" fallback.
- **Booking vs. consultation apps** — `patient-booking` (`:3001`) is a standalone app with its
  own Express mock, separate from the six Module Federation patient MFEs. Don't expect it to
  mount inside the shell.

---

## Related documents

- [Features.md](./Features.md) — functional overview, feature catalog, architecture diagram.
- `telemedicine-platform/docs/architecture.md` — repo layout and request flow.
- `telemedicine-platform/docs/build-sequence.md` — recommended build order and port map.
- `telemedicine-platform/docs/operational-manual.md` — operating the stack.
- `telemedicine-platform/docs/adding-a-service.md`, `adding-an-mfe.md` — extension checklists.
