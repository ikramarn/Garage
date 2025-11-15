import os
from typing import Dict
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import jwt

SERVICE_MAP: Dict[str, str] = {
    "appointments": os.getenv("APPOINTMENTS_URL", "http://localhost:8101"),
    "payments": os.getenv("PAYMENTS_URL", "http://localhost:8102"),
    "invoices": os.getenv("INVOICES_URL", "http://localhost:8103"),
    "contactus": os.getenv("CONTACTUS_URL", "http://localhost:8104"),
    "services": os.getenv("CATALOG_URL", "http://localhost:8105"),
    "auth": os.getenv("AUTH_URL", "http://localhost:8110"),
}

# When no path tail is provided (e.g., GET /api/invoices), map to a sensible
# default resource path for that service (e.g., /invoices).
DEFAULT_ROOT_TAIL: Dict[str, str] = {
    "appointments": "appointments",
    "payments": "payments",
    "invoices": "invoices",
    "contactus": "contactus",
    "services": "services",
    # Note: do NOT set a default for 'auth' to avoid mapping /api/auth -> /auth
}

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGO = "HS256"

app = FastAPI(title="Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok", "services": list(SERVICE_MAP.keys())}

@app.get("/whoami")
async def whoami(request: Request):
    payload = _decode_bearer(request.headers.get("authorization"))
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return payload

def _decode_bearer(authorization: str | None):
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return None

def _needs_auth(service: str, path_tail: str) -> bool:
    # protect invoices service; allow auth service public; others open
    if service == "invoices":
        return True
    return False

async def _proxy(request: Request, service: str, tail: str = "") -> Response:
    base_url = SERVICE_MAP.get(service)
    if not base_url:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")

    # If no tail provided, use default root tail for the service when available
    effective_tail = tail or DEFAULT_ROOT_TAIL.get(service, "")
    url = base_url.rstrip("/") + "/" + effective_tail.lstrip("/")
    method = request.method

    # Prepare request data
    headers = dict(request.headers)
    headers.pop("host", None)

    # auth handling
    payload = _decode_bearer(request.headers.get("authorization"))
    if _needs_auth(service, tail):
        if not payload:
            raise HTTPException(status_code=401, detail="Unauthorized")
        headers["x-user-id"] = str(payload.get("sub"))
        headers["x-user-role"] = str(payload.get("role"))
    elif payload:
        # forward identity if available (even when not required)
        headers["x-user-id"] = str(payload.get("sub"))
        headers["x-user-role"] = str(payload.get("role"))

    try:
        body = await request.body()
    except Exception:
        body = b""

    params = request.query_params

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(method, url, content=body, params=params, headers=headers)

    excluded = {"content-encoding", "transfer-encoding", "connection", "keep-alive"}
    response_headers = [(k, v) for k, v in resp.headers.items() if k.lower() not in excluded]
    return Response(content=resp.content, status_code=resp.status_code, headers=dict(response_headers), media_type=resp.headers.get("content-type"))

@app.api_route("/api/{service}", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"])
async def proxy_root(request: Request, service: str):
    return await _proxy(request, service, "")

@app.api_route("/api/{service}/{tail:path}", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"])
async def proxy_tail(request: Request, service: str, tail: str):
    return await _proxy(request, service, tail)
