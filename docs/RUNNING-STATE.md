# Running State Snapshot

Captured at the end of the session that built P-10 rebuild + P-14→P-17. These are background
dev processes; if the machine/terminals restarted they are gone and must be re-launched with the
commands in AGENT-HANDOFF.md §3. Nothing here is auto-started.

## Expected services when fully up

| Service | Port | Start from | Notes |
|---------|------|-----------|-------|
| Docker infra (postgres/redis/consul/kafka) | 5432 / 6379 / 8500 / 29092 | Docker Desktop | Shared; kafka external listener on **29092** |
| patient-booking-service (INTEGRATION) | 8120 | `telemedicinePatient_integration\telemedicine-backend` gradle bootRun | Serves the patient app. DB `patient_booking`. |
| patient-booking app (INTEGRATION) | 3001 | `...integration\telemedicine-frontend\apps\patient-booking` → `corepack pnpm dev` | Proxies /api → :8120 |
| physician-service | 8114 | `telemedicine_physician\telemedicine-backend` gradle bootRun | DB `physician` |
| physician-app | 3015 | `telemedicine_physician\telemedicine-frontend` → `corepack pnpm exec nx serve physician-app` | Proxies /api,/ws → :8114, /booking-api → :8120 |
| video-consultation-service | 8130 | `...integration\telemedicine-backend` gradle `:video-consultation-service:bootRun` | **NOT started yet** — needed for the live video call |

## Do-not-run-together

- `telemedicinePatient` and `telemedicinePatient_integration` both expose patient-booking-service on
  :8120 against DB `patient_booking`. Run only the **integration** one.

## Quick smoke test after restarting

```
# backend up?
curl http://localhost:8120/actuator/health        # {"status":"UP"}
curl http://localhost:8120/api/doctors             # 12 doctors
# consultation flow
curl -X POST http://localhost:8120/api/consultations/TM-TEST/otp/send   # demoCode 739214
# app up?
open http://localhost:3001                         # patient app; login priya@example.in / correct-horse
```

## To demo the join flow

My care → upcoming consultation → Manage ▾ → Join consultation →
OTP `739 214` → consents → device check (allow camera/mic) → waiting room.
To flip the waiting room to a Join button (stands in for the physician admitting):
`curl -X POST http://localhost:8120/api/consultations/<APPOINTMENT_REF>/doctor-open`
