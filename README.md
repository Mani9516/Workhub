# WorkHub — Employee Self-Service Portal

Full-stack **WorkHub** reference implementation: **React (Vite) + Material UI**, **FastAPI + SQLAlchemy + SQLite**, **Docker Compose**, **JWT + bcrypt**, role-based areas, leave workflow, AI-style learning recommendations, compliance policies, and the **Echo** in-app assistant.


### Demo logins

The sign-in screen does **not** display passwords (or pre-filled credentials). Use this table from your README or internal runbook when evaluating the demo.

| Role     | Email                 | Password   |
|----------|----------------------|------------|
| Employee | employee@workhub.demo | demo1234 |
| Manager  | manager@workhub.demo  | demo1234 |
| HR       | hr@workhub.demo       | demo1234 |


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
