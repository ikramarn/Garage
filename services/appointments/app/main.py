from typing import List, Optional, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

class AppointmentCreate(BaseModel):
    customer_name: str
    service_id: Optional[str] = None
    scheduled_at: datetime
    notes: Optional[str] = None

class Appointment(AppointmentCreate):
    id: str
    owner_id: str

app = FastAPI(title="Appointments Service")

_STORE: Dict[str, Appointment] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/appointments", response_model=List[Appointment])
def list_appointments(x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    if not x_user_id:
        # Require auth to view appointments
        raise HTTPException(status_code=401, detail="Unauthorized")
    if x_user_role == "admin":
        return list(_STORE.values())
    return [a for a in _STORE.values() if a.owner_id == x_user_id]

@app.post("/appointments", response_model=Appointment, status_code=201)
def create_appointment(payload: AppointmentCreate, x_user_id: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    aid = str(uuid4())
    appt = Appointment(id=aid, owner_id=x_user_id, **payload.model_dump())
    _STORE[aid] = appt
    return appt

@app.get("/appointments/{appointment_id}", response_model=Appointment)
def get_appointment(appointment_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    appt = _STORE.get(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if x_user_role == "admin" or (x_user_id and appt.owner_id == x_user_id):
        return appt
    raise HTTPException(status_code=403, detail="Forbidden")

@app.put("/appointments/{appointment_id}", response_model=Appointment)
def update_appointment(appointment_id: str, payload: AppointmentCreate, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    if appointment_id not in _STORE:
        raise HTTPException(status_code=404, detail="Appointment not found")
    existing = _STORE[appointment_id]
    if not (x_user_role == "admin" or (x_user_id and existing.owner_id == x_user_id)):
        raise HTTPException(status_code=403, detail="Forbidden")
    appt = Appointment(id=appointment_id, owner_id=existing.owner_id, **payload.model_dump())
    _STORE[appointment_id] = appt
    return appt

@app.delete("/appointments/{appointment_id}", status_code=204)
def delete_appointment(appointment_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    appt = _STORE.get(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if not (x_user_role == "admin" or (x_user_id and appt.owner_id == x_user_id)):
        raise HTTPException(status_code=403, detail="Forbidden")
    del _STORE[appointment_id]
    return None
