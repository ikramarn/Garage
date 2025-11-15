import os
from typing import Dict
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

SERVICE_MAP: Dict[str, str] = {
    "appointments": os.getenv("APPOINTMENTS_URL", "http://localhost:8101"),
    "payments": os.getenv("PAYMENTS_URL", "http://localhost:8102"),
    "invoices": os.getenv("INVOICES_URL", "http://localhost:8103"),
    "contactus": os.getenv("CONTACTUS_URL", "http://localhost:8104"),
    "services": os.getenv("CATALOG_URL", "http://localhost:8105"),
}

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

async def _proxy(request: Request, service: str, tail: str = "") -> Response:
    base_url = SERVICE_MAP.get(service)
    if not base_url:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")

    url = base_url.rstrip("/") + "/" + tail.lstrip("/")
    method = request.method

    # Prepare request data
    headers = dict(request.headers)
    headers.pop("host", None)

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
