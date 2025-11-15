from typing import List, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel

class PaymentCreate(BaseModel):
    appointment_id: str
    amount: float
    currency: str = "USD"
    method: str = "card"

class Payment(PaymentCreate):
    id: str
    status: str = "completed"
    created_at: datetime

app = FastAPI(title="Payments Service")

_STORE: Dict[str, Payment] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/payments", response_model=List[Payment])
def list_payments():
    return list(_STORE.values())

@app.post("/payments", response_model=Payment, status_code=201)
def create_payment(payload: PaymentCreate):
    pid = str(uuid4())
    payment = Payment(id=pid, created_at=datetime.utcnow(), **payload.model_dump())
    _STORE[pid] = payment
    return payment
