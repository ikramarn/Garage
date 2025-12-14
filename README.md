# Garage Microservices App

A microservices-driven web app with a React (Vite) frontend and FastAPI backend services:

- Appointments
- Payments
- Invoices (server-side PDF)
- Contact Us
- Services Catalog

An API Gateway unifies all backend endpoints under `/api/*`. Authentication uses JWT with RBAC (admin and customer).

Recent changes:
- Login: After signing in, users are redirected to Home.
- Payments: Payments are made against invoices (select an invoice), not appointments.
- Invoices: Only admins can create invoices and only for completed appointments (server verifies completion).

## Stack

- Frontend: React + Vite + React Router
- Backend: Python FastAPI (one service per domain)
- Gateway: FastAPI proxy using httpx
- Database: PostgreSQL (Dockerized)
- PDF: WeasyPrint + Jinja2 template (Invoices)
- Docker: Dockerfiles and docker-compose for local orchestration
- CI/CD: GitHub Actions builds and pushes images to GHCR (GitHub Container Registry)

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
# Pull registry images and run all services (PowerShell)
docker compose pull
docker compose up -d

# Stop
docker compose down
```

- Frontend: http://localhost:5173
- API Gateway: http://localhost:8080
 - pgAdmin (DB UI): http://localhost:5050 (admin@example.com / admin123)

If your GHCR packages are private, login first:

```
# Create a GitHub PAT with read:packages and use it here
docker login ghcr.io -u <github-username> -p <PAT>
```

Local development builds (optional): To switch a service back to local build, replace its `image:` with a `build:` block in `docker-compose.yml`, then:

```
docker compose build <service>
docker compose up -d <service>
```

## Services and routes

All routes exposed via the gateway under `/api/*`:

- `GET /api/health` — overall health
- Appointments: `/api/appointments` (CRUD)
- Payments: `/api/payments`:
   - `GET /api/payments` — list payments
   - `POST /api/payments` — create payment against an invoice: `{ invoice_id, amount, currency, method }`
- Invoices: `/api/invoices`:
   - `GET /api/invoices` — list invoices (admin sees all; customers see their own)
   - `POST /api/invoices` — admin-only; requires `{ appointment_id, items, amount?, currency, owner_id?, customer_name?, admin_create: true }`
      - Server validates the appointment is completed (scheduled time is in the past) via the Appointments service.
- Contact Us: `/api/contactus` (submit message, list)
- Services: `/api/services` (list service catalog)

Each microservice also exposes its own `/health` endpoint.

## Database

- Engine: PostgreSQL 15 (container `db`)
- Connection (inside compose network): `postgresql://garage:garage@db:5432/garage`
- Connection (from host tools): host `localhost`, port `5432`, db `garage`, user `garage`, password `garage`

pgAdmin access:

- URL: http://localhost:5050
- Login: `admin@example.com` / `admin123`
- Add Server in pgAdmin:
   - Name: `Garage`
   - Host: `db`
   - Port: `5432`
   - Maintenance DB: `garage`
   - Username: `garage`
   - Password: `garage`

## Auth & RBAC

- JWT Secret is set via `JWT_SECRET` in services that need it (gateway forwards identity headers).
- Roles: `admin` and `customer`. Admins can see/manage all; customers see only their own.

## Invoices PDF

- Server-side PDF at `GET /api/invoices/{id}/pdf` rendered via HTML template with WeasyPrint.
- Optional branding env vars (set on `invoices` service):
   - `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_LOGO_PATH`
 - Invoices service calls Appointments service to validate completion; set `APPOINTMENTS_URL` if not using defaults.

## Notes on data

- Users, appointments, and invoices are stored in PostgreSQL.
- IDs are UUIDs.

## Testing

You can run a very basic test for the Appointments service:

```
# PowerShell
pip install -r services/appointments/requirements.txt; pip install pytest
pytest services/appointments/tests
```

## CI/CD (GHCR)

This repo includes a GitHub Actions workflow to build and push Docker images for all services to GitHub Container Registry (GHCR) on push to `main`.

- Workflow file: `.github/workflows/build-and-push.yml`
- Registry: `ghcr.io/<owner>/garage-<service>` (e.g., `ghcr.io/ikramarn/garage-gateway`)
- Tags: `latest` on default branch, branch ref tags, and commit SHA-prefixed tags

Make images public (optional):

1. Open https://github.com/<owner>?tab=packages
2. Open each `garage-*` package → Package Settings → Change visibility to Public

Use in compose (already configured): images are pulled from GHCR via `image:` entries.

## Kubernetes Ingress (local cluster)

The cluster exposes an NGINX Ingress that routes:

- `/` → `frontend` service (port 5173)
- `/api` → `gateway` service (port 8080)

For local access, map the host to localhost:

1) Edit `C:\Windows\System32\drivers\etc\hosts` (run editor as Administrator) and add:

```
127.0.0.1 garage.local
```

2) Open:

- Frontend: http://garage.local
- API example: http://garage.local/api/services

Verify from PowerShell:

```powershell
Invoke-WebRequest -Headers @{ Host = "garage.local" } -Uri http://localhost/ -UseBasicParsing
Invoke-WebRequest -Headers @{ Host = "garage.local" } -Uri http://localhost/api/services -UseBasicParsing
```

Tip: Avoid port-forwarding the `frontend` service for browsing; it serves static assets only and does not proxy `/api`. Always use the Ingress for combined UI+API routing.

## Deploy

Recommended approach: use a managed PostgreSQL in the cloud and deploy the app containers using your registry images. For a quick POC you can run Postgres as a container, but for production use a managed service (Azure Database for PostgreSQL / AWS RDS for PostgreSQL) and set `DATABASE_URL` on the services.

Environment variables to set (replace placeholders):

```
# Example managed Postgres connection string
DATABASE_URL=postgresql+psycopg2://<db_user>:<db_password>@<db_host>:5432/<db_name>

# Shared JWT secret (gateway + auth)
JWT_SECRET=<your-strong-secret>

# Invoices service (server-side validation)
APPOINTMENTS_URL=http://appointments:8000
```

### Azure (Web App for Containers, Docker Compose)

Azure App Service can run a Docker Compose app. For cloud, exclude `db`/`pgadmin` and point services at a managed Postgres via `DATABASE_URL`.

1) Prepare a cloud compose file (example)

Create a `docker-compose.cloud.yml` (not committed) with only app services and GHCR images:

```yaml
services:
   gateway:
      image: ghcr.io/ikramarn/garage-gateway:latest
      ports:
         - "8080:8080"
      environment:
         - APPOINTMENTS_URL=http://appointments:8000
         - PAYMENTS_URL=http://payments:8000
         - INVOICES_URL=http://invoices:8000
         - CONTACTUS_URL=http://contactus:8000
         - CATALOG_URL=http://catalog:8000
         - AUTH_URL=http://auth:8000
         - JWT_SECRET=${JWT_SECRET}
      depends_on:
         - appointments
         - payments
         - invoices
         - contactus
         - catalog
         - auth

   auth:
      image: ghcr.io/ikramarn/garage-auth:latest
      environment:
         - JWT_SECRET=${JWT_SECRET}
         - DATABASE_URL=${DATABASE_URL}
      expose:
         - "8000"

   appointments:
      image: ghcr.io/ikramarn/garage-appointments:latest
      environment:
         - DATABASE_URL=${DATABASE_URL}
      expose:
         - "8000"

   invoices:
      image: ghcr.io/ikramarn/garage-invoices:latest
      environment:
         - DATABASE_URL=${DATABASE_URL}
      expose:
         - "8000"

   payments:
      image: ghcr.io/ikramarn/garage-payments:latest
      expose:
         - "8000"

   contactus:
      image: ghcr.io/ikramarn/garage-contactus:latest
      expose:
         - "8000"

   catalog:
      image: ghcr.io/ikramarn/garage-catalog:latest
      expose:
         - "8000"

   frontend:
      image: ghcr.io/ikramarn/garage-frontend:latest
      ports:
         - "5173:5173"
      environment:
         - VITE_PROXY_TARGET=http://gateway:8080
      depends_on:
         - gateway
```

2) Provision and deploy with Azure CLI

```
az login
az group create -n rg-garage -l westeurope
az appservice plan create -g rg-garage -n sp-garage --is-linux --sku P1v3
az webapp create -g rg-garage -p sp-garage -n garage-webapp \
   --multicontainer-config-type compose \
   --multicontainer-config-file docker-compose.cloud.yml

# Set app settings (env vars)
az webapp config appsettings set -g rg-garage -n garage-webapp \
   --settings JWT_SECRET="<your-secret>" DATABASE_URL="<your-managed-db-url>"

# If GHCR images are private, configure registry credentials
az webapp config container set -g rg-garage -n garage-webapp \
   --docker-registry-server-url https://ghcr.io \
   --docker-registry-server-user <github-username> \
   --docker-registry-server-password <PAT-with-read:packages>
```

Notes:
- App Service stores the compose file; to update, rerun the `az webapp config container set` (or re-create) with the new file.
- For production, place the frontend behind Azure Front Door or Azure CDN and expose only gateway.

### AWS (ECS on Fargate with Docker Compose)

ECS + Fargate supports a Docker Compose deployment via Docker’s ECS integration. Use GHCR public images (or push to ECR if you prefer private).

1) Configure AWS and Docker ECS context

```
aws configure
docker context create ecs garage-ecs
docker context use garage-ecs
```

2) Use the same `docker-compose.cloud.yml` (without db/pgadmin)

```
export JWT_SECRET=...   # or set in your shell
export DATABASE_URL=... # managed RDS Postgres URL
docker compose -f docker-compose.cloud.yml up
```

Alternative: push images to ECR and use AWS Copilot CLI to model services and environments.

Notes:
- For private GHCR images on ECS, configure an image pull secret or mirror to ECR.
- Use AWS RDS for PostgreSQL and security groups/VPC subnets per your environment.

## FAQ

- Why FastAPI instead of Django? FastAPI is lightweight and ideal for small, independent services. Django would suit monolith or fewer services.
- React vs Vue? React is chosen here due to ecosystem and tooling. Swapping to Vue + Vite is straightforward if preferred.


