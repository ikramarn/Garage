from typing import List, Optional, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class AppointmentCreate(BaseModel):
    customer_name: str
    service_id: Optional[str] = None
    scheduled_at: datetime
    notes: Optional[str] = None

class Appointment(AppointmentCreate):
    id: str

app = FastAPI(title="Appointments Service")

_STORE: Dict[str, Appointment] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/appointments", response_model=List[Appointment])
def list_appointments():
    return list(_STORE.values())

@app.post("/appointments", response_model=Appointment, status_code=201)
def create_appointment(payload: AppointmentCreate):
    aid = str(uuid4())
    appt = Appointment(id=aid, **payload.model_dump())
    _STORE[aid] = appt
    return appt

@app.get("/appointments/{appointment_id}", response_model=Appointment)
def get_appointment(appointment_id: str):
    appt = _STORE.get(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt

@app.put("/appointments/{appointment_id}", response_model=Appointment)
def update_appointment(appointment_id: str, payload: AppointmentCreate):
    if appointment_id not in _STORE:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt = Appointment(id=appointment_id, **payload.model_dump())
    _STORE[appointment_id] = appt
    return appt

@app.delete("/appointments/{appointment_id}", status_code=204)
def delete_appointment(appointment_id: str):
    if appointment_id not in _STORE:
        raise HTTPException(status_code=404, detail="Appointment not found")
    del _STORE[appointment_id]
    return None
