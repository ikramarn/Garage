from typing import List, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

class InvoiceCreate(BaseModel):
    appointment_id: str
    amount: float
    currency: str = "USD"

class Invoice(InvoiceCreate):
    id: str
    status: str = "unpaid"
    issued_at: datetime
    owner_id: str

app = FastAPI(title="Invoices Service")

_STORE: Dict[str, Invoice] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/invoices", response_model=List[Invoice])
def list_invoices(x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(401, "Unauthorized")
    if x_user_role == "admin":
        return list(_STORE.values())
    return [inv for inv in _STORE.values() if inv.owner_id == x_user_id]

@app.post("/invoices", response_model=Invoice, status_code=201)
def create_invoice(payload: InvoiceCreate, x_user_id: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(401, "Unauthorized")
    iid = str(uuid4())
    invoice = Invoice(id=iid, issued_at=datetime.utcnow(), owner_id=x_user_id, **payload.model_dump())
    _STORE[iid] = invoice
    return invoice

@app.get("/invoices/{invoice_id}", response_model=Invoice)
def get_invoice(invoice_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    inv = _STORE.get(invoice_id)
    if not inv:
        raise HTTPException(404, "Not found")
    if x_user_role == "admin" or inv.owner_id == x_user_id:
        return inv
    raise HTTPException(403, "Forbidden")
