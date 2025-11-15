import os
import time
from typing import List, Optional
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import create_engine, String, DateTime, Float, JSON, Text, text
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, sessionmaker
from sqlalchemy.exc import OperationalError

class AppointmentCreate(BaseModel):
    customer_name: str
    service_ids: List[str] = []
    total_price: float = 0.0
    scheduled_at: datetime
    notes: Optional[str] = None

class Appointment(AppointmentCreate):
    id: str
    owner_id: str

app = FastAPI(title="Appointments Service")

# DB setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://garage:garage@db:5432/garage")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class AppointmentRow(Base):
    __tablename__ = "appointments"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(64), index=True)
    customer_name: Mapped[str] = mapped_column(String(200))
    service_ids: Mapped[List[str]] = mapped_column(JSON)
    total_price: Mapped[float] = mapped_column(Float)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

def _wait_for_db(max_attempts: int = 30, delay_sec: float = 1.0) -> None:
    attempts = 0
    while attempts < max_attempts:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError:
            attempts += 1
            time.sleep(delay_sec)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

_wait_for_db()
Base.metadata.create_all(bind=engine)

def to_model(row: AppointmentRow) -> Appointment:
    return Appointment(
        id=row.id,
        owner_id=row.owner_id,
        customer_name=row.customer_name,
        service_ids=row.service_ids or [],
        total_price=row.total_price or 0.0,
        scheduled_at=row.scheduled_at,
        notes=row.notes,
    )

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/appointments", response_model=List[Appointment])
def list_appointments(x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    if not x_user_id:
        # Require auth to view appointments
        raise HTTPException(status_code=401, detail="Unauthorized")
    with SessionLocal() as s:
        if x_user_role == "admin":
            rows = s.query(AppointmentRow).all()
        else:
            rows = s.query(AppointmentRow).filter(AppointmentRow.owner_id == x_user_id).all()
        return [to_model(r) for r in rows]

@app.post("/appointments", response_model=Appointment, status_code=201)
def create_appointment(payload: AppointmentCreate, x_user_id: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    aid = str(uuid4())
    with SessionLocal() as s:
        row = AppointmentRow(
            id=aid,
            owner_id=x_user_id,
            customer_name=payload.customer_name,
            service_ids=list(payload.service_ids or []),
            total_price=float(payload.total_price or 0.0),
            scheduled_at=payload.scheduled_at,
            notes=payload.notes,
        )
        s.add(row)
        s.commit()
        return to_model(row)

@app.get("/appointments/{appointment_id}", response_model=Appointment)
def get_appointment(appointment_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    with SessionLocal() as s:
        row = s.query(AppointmentRow).get(appointment_id)
        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")
        if x_user_role == "admin" or (x_user_id and row.owner_id == x_user_id):
            return to_model(row)
        raise HTTPException(status_code=403, detail="Forbidden")

@app.put("/appointments/{appointment_id}", response_model=Appointment)
def update_appointment(appointment_id: str, payload: AppointmentCreate, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    with SessionLocal() as s:
        row = s.query(AppointmentRow).get(appointment_id)
        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")
        if not (x_user_role == "admin" or (x_user_id and row.owner_id == x_user_id)):
            raise HTTPException(status_code=403, detail="Forbidden")
        row.customer_name = payload.customer_name
        row.service_ids = list(payload.service_ids or [])
        row.total_price = float(payload.total_price or 0.0)
        row.scheduled_at = payload.scheduled_at
        row.notes = payload.notes
        s.commit()
        s.refresh(row)
        return to_model(row)

@app.delete("/appointments/{appointment_id}", status_code=204)
def delete_appointment(appointment_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    with SessionLocal() as s:
        row = s.query(AppointmentRow).get(appointment_id)
        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")
        if not (x_user_role == "admin" or (x_user_id and row.owner_id == x_user_id)):
            raise HTTPException(status_code=403, detail="Forbidden")
        s.delete(row)
        s.commit()
        return None
