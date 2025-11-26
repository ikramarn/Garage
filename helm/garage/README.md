# Garage Helm Chart

This chart deploys the Garage application (frontend, gateway, and FastAPI microservices) onto Kubernetes.

## Prerequisites
- Docker Desktop with Kubernetes enabled, or any K8s cluster
- Access to images in GHCR: `ghcr.io/<owner>/garage-<service>:<tag>`

## Install

```powershell
# From repo root
helm install garage ./helm/garage \
  --set owner=ikramarn \
  --set image.tag=latest \
  --set env.jwtSecret="dev-secret-change-me" \
  --set env.databaseUrl="postgresql+psycopg2://garage:garage@db:5432/garage" \
  --set env.viteProxyTarget="http://gateway:8080" \
  --set service.type=NodePort \
  --set service.ports.frontend=30000 \
  --set service.ports.gateway=30080
```

## Access
- Frontend: `http://localhost:30000`
- Gateway health: `http://localhost:30080/health`

## Configure RDS
To use an AWS RDS Postgres, set `env.databaseUrl` to your RDS SQLAlchemy URL (password URL-encoded), e.g.:

```
postgresql+psycopg2://<user>:<encoded-pass>@<rds-host>:5432/<db-name>?sslmode=require
```

Ensure the cluster nodes (Docker Desktop VM) can reach RDS over 5432 (network/security groups).

## Toggle components
Disable/enable individual services via values:

```powershell
helm upgrade garage ./helm/garage --set components.payments.enabled=false
```
