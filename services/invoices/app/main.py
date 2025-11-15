from typing import List, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel

class InvoiceCreate(BaseModel):
    appointment_id: str
    amount: float
    currency: str = "USD"

class Invoice(InvoiceCreate):
    id: str
    status: str = "unpaid"
    issued_at: datetime

app = FastAPI(title="Invoices Service")

_STORE: Dict[str, Invoice] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/invoices", response_model=List[Invoice])
def list_invoices():
    return list(_STORE.values())

@app.post("/invoices", response_model=Invoice, status_code=201)
def create_invoice(payload: InvoiceCreate):
    iid = str(uuid4())
    invoice = Invoice(id=iid, issued_at=datetime.utcnow(), **payload.model_dump())
    _STORE[iid] = invoice
    return invoice
