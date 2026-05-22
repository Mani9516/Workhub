# WorkHub — Employee Self-Service Portal

Full-stack **WorkHub** reference implementation: **React (Vite) + Material UI**, **FastAPI + SQLAlchemy + SQLite**, **Docker Compose**, **JWT + bcrypt**, role-based areas, leave workflow, AI-style learning recommendations, compliance policies, and the **Echo** in-app assistant.

This project lives alongside your existing `autonomous-resolution` backend under `workhub/` and does **not** modify the returns-resolution service.

## Quick start (local)

### Backend

```powershell
cd workhub\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

On first boot the API creates `data/workhub.db`, applies migrations via `create_all`, and seeds demo users if the database is empty.

### Frontend

```powershell
cd workhub\frontend
npm install
npm run dev
```

Open `http://localhost:5173` — Vite proxies `/api` to `http://127.0.0.1:8000`.

### Demo logins

The sign-in screen does **not** display passwords (or pre-filled credentials). Use this table from your README or internal runbook when evaluating the demo.

| Role     | Email                 | Password   |
|----------|----------------------|------------|
| Employee | employee@workhub.demo | demo1234 |
| Manager  | manager@workhub.demo  | demo1234 |
| HR       | hr@workhub.demo       | demo1234 |

For local Vite (`npm run dev`), optional **email-only** quick-fill on the login page is enabled when you copy `frontend/.env.example` to `frontend/.env` and set the `VITE_DEMO_EMAIL_*` variables (never put the demo password in any `VITE_` file).

### Email code sign-in (OTP)

The login page has an **Email code** tab. The API sends a **6-digit code** over **SMTP** when `SMTP_HOST` and `SMTP_FROM` are set (see `backend/.env.example`). Endpoints: `POST /api/auth/login-otp/send` and `POST /api/auth/login-otp/verify`.

For local development **without** a mail server, set **`LOGIN_OTP_LOG_TO_CONSOLE=true`** on the API: the code is printed to the server log only (never use this in production). Operators can read it from the API process output; with Docker use `docker compose logs -f api`. The WorkHub login page does **not** show server-log or Docker instructions for the OTP.

## Docker Compose

From `workhub/`:

```powershell
docker compose up --build
```

- **Web UI:** `http://localhost:8080` (Nginx serves the SPA and reverse-proxies `/api` to the API container — no CORS friction).
- **API (optional direct):** `http://localhost:8000` (e.g. Swagger at `/docs`).

Compose sets **`LOGIN_OTP_LOG_TO_CONSOLE=true`** on the API so **Email code** sign-in works without SMTP: after requesting a code, read the 6-digit OTP from `docker compose logs -f api` (development only). For real email delivery, set `SMTP_HOST`, `SMTP_FROM`, and related variables in Compose and set `LOGIN_OTP_LOG_TO_CONSOLE` to `false` or remove it.

Compose also sets **`CLEAR_CERTIFICATIONS_ON_START=true`** so every API container start clears HR certification rows (demo reset). Remove that variable or set it to `false` when you want certifications to persist across restarts; for local `uvicorn` without this env, certifications are kept by default.

The `web` image is built with `VITE_DEMO_EMAIL_*` [build args](https://docs.docker.com/compose/compose-file/build/#args) for optional login quick-fill (email only). The demo password is **not** baked into the frontend; use the **Demo logins** table above (same users as `backend/app/seed.py`).

Persisted SQLite lives in the `workhub_data` Docker volume mounted at `/app/data` in the API container.

## Feature map (high level)

- **Auth:** JWT bearer tokens, bcrypt-hashed passwords, roles `employee` / `manager` / `hr`.
- **ESS tabs:** Dashboard (module toggles + AI panels), Profile, Attendance, Leave, Payroll, Learning, Career, Wellness, Compliance, HR console (HR only).
- **Learning:** catalog with per-user completion; employees and managers record **course progress (0–100%)** on the Learning page; **only HR** marks a catalog course complete (completions show on Profile). **HR** can add catalog courses (`POST /api/learning/items`) from the HR console and see **per-person learning + certifications + skill-based ideas** (`GET /api/learning/hr/progress-overview`). After saving profile skills/goals, **`GET /api/career/skill-insights`** suggests credentials and open role directions (same heuristics as Career).
- **Certifications (HR-gated):** employees and managers request verification from **Profile** and update **self-reported preparation %** while a row is pending; nothing appears as approved on **Profile** or **Career** until **HR** approves (`/api/certifications/...`). **Only HR** can approve pending rows or assign HR-verified credentials; HR can assign certifications (optionally linked to a catalog course) from the HR console. Standard department names are suggested via `GET /api/meta/departments` (Marketing, Social Media, Finance, and others); any custom department string is still allowed on profile and onboarding.
- **Leave:** earned, casual, and sick leave (balances); **bereavement** and **optional** leave for all employees (no balance deduction) with **HR-only** approval; managers approve other leave for their team. On app startup, missing balance rows are backfilled (and legacy **annual** is copied to **earned** when needed).
- **HR onboarding:** `POST /api/admin/onboard` (HR console UI) creates a new **employee** with default leave balances and optional reporting manager.
- **Work from home (WFH):** employees submit date range + reason from **Attendance** (`Send for approval`); managers and HR see pending WFH with leave on **Dashboard** and **Leave**.
- **AI (server-side heuristics):** multi-factor scoring for learning recommendations, certification-weighted career path suggestions, and compliance policy prioritization.
- **Echo chatbot:** pattern-based assistant for leave, learning, compliance, and dashboard help.

## Security notes

- Change `SECRET_KEY` and database path for any shared or production deployment (see `backend/.env.example`).
- Demo passwords are for local evaluation only and are documented in this README, not rendered on the login UI.

## API surface

Interactive documentation: `http://localhost:8000/docs` when the API is running.
