from typing import List, Dict
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class ServiceItemCreate(BaseModel):
    name: str
    description: str | None = None
    price: float

class ServiceItem(ServiceItemCreate):
    id: str

app = FastAPI(title="Services Catalog Service")

_STORE: Dict[str, ServiceItem] = {}

# seed a few (including requested booking services)
for name, price in [
    ("Book an MOT", 60.00),
    ("Book a service", 120.00),
    ("Book a repair work", 90.00),
    ("Oil Change", 49.99),
    ("Tire Rotation", 29.99),
    ("Brake Inspection", 39.99),
]:
    sid = str(uuid4())
    _STORE[sid] = ServiceItem(id=sid, name=name, description=f"{name} service", price=price)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/services", response_model=List[ServiceItem])
def list_services():
    return list(_STORE.values())

@app.post("/services", response_model=ServiceItem, status_code=201)
def create_service(payload: ServiceItemCreate):
    sid = str(uuid4())
    item = ServiceItem(id=sid, **payload.model_dump())
    _STORE[sid] = item
    return item

@app.get("/services/{service_id}", response_model=ServiceItem)
def get_service(service_id: str):
    item = _STORE.get(service_id)
    if not item:
        raise HTTPException(status_code=404, detail="Service not found")
    return item

@app.put("/services/{service_id}", response_model=ServiceItem)
def update_service(service_id: str, payload: ServiceItemCreate):
    if service_id not in _STORE:
        raise HTTPException(status_code=404, detail="Service not found")
    item = ServiceItem(id=service_id, **payload.model_dump())
    _STORE[service_id] = item
    return item

@app.delete("/services/{service_id}", status_code=204)
def delete_service(service_id: str):
    if service_id not in _STORE:
        raise HTTPException(status_code=404, detail="Service not found")
    del _STORE[service_id]
    return None
