# Garage Microservices App

A microservices-driven web app with a React (Vite) frontend and FastAPI backend services:

- Appointments
- Payments
- Invoices
- Contact Us
- Services Catalog

An API Gateway unifies all backend endpoints under `/api/*`.

## Stack

- Frontend: React + Vite + React Router
- Backend: Python FastAPI (one service per domain)
- Gateway: FastAPI proxy using httpx
- Docker: Dockerfiles and docker-compose for local orchestration

## Quick start (without Docker)

Prereqs: Node.js 18+ and Python 3.10+

1. Start backend services (each in its own shell):
   - Appointments: `uvicorn services.appointments.app.main:app --reload --port 8101`
   - Payments: `uvicorn services.payments.app.main:app --reload --port 8102`
   - Invoices: `uvicorn services.invoices.app.main:app --reload --port 8103`
   - Contact Us: `uvicorn services.contactus.app.main:app --reload --port 8104`
   - Services Catalog: `uvicorn services.catalog.app.main:app --reload --port 8105`
   - Gateway: `uvicorn gateway.main:app --reload --port 8080`

   First time, install deps per service:
   - `pip install -r services/<service>/requirements.txt`
   - `pip install -r gateway/requirements.txt`

2. Start frontend (from `frontend`):
   - `npm install`
   - `npm run dev`

Vite dev server will run on http://localhost:5173 and proxy `/api` to the gateway at http://localhost:8080.

## Docker compose (recommended)

Prereqs: Docker Desktop

From repo root:

```
# Build and run all services
# PowerShell
docker compose up --build

# Stop
docker compose down
```

- Frontend: http://localhost:5173
- API Gateway: http://localhost:8080

## Services and routes

All routes exposed via the gateway under `/api/*`:

- `GET /api/health` — overall health
- Appointments: `/api/appointments` (CRUD)
- Payments: `/api/payments` (create/list demo payments)
- Invoices: `/api/invoices` (create/list demo invoices)
- Contact Us: `/api/contactus` (submit message, list)
- Services: `/api/services` (list service catalog)

Each microservice also exposes its own `/health` endpoint.

## Notes on data

- In-memory storage for local/dev. Replace with a database as needed.
- IDs are UUIDs.

## Testing

You can run a very basic test for the Appointments service:

```
# PowerShell
pip install -r services/appointments/requirements.txt; pip install pytest
pytest services/appointments/tests
```

## FAQ

- Why FastAPI instead of Django? FastAPI is lightweight and ideal for small, independent services. Django would suit monolith or fewer services.
- React vs Vue? React is chosen here due to ecosystem and tooling. Swapping to Vue + Vite is straightforward if preferred.

## On enabling "GPT-5.1-Codex (Preview)"

That toggle can’t be enabled from this codebase or by me in your editor; it’s controlled by your organization’s admin/preview access. If you share where you want it enabled (e.g., in a specific product/tenant), I can add the app-side feature flag wiring.
