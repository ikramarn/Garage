import os
from typing import List, Dict, Optional
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import mm
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML
from pydantic import BaseModel

class InvoiceItem(BaseModel):
    description: str
    price: float
    service_id: Optional[str] = None

class InvoiceCreate(BaseModel):
    appointment_id: str
    amount: Optional[float] = None
    currency: str = "USD"
    items: List[InvoiceItem] = []
    customer_name: Optional[str] = None
    owner_id: Optional[str] = None

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
def create_invoice(payload: InvoiceCreate, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(401, "Unauthorized")
    iid = str(uuid4())
    # Admin may create invoice for a customer
    target_owner = payload.owner_id if x_user_role == "admin" and payload.owner_id else x_user_id
    amount = payload.amount if payload.amount is not None else sum(max(0.0, i.price) for i in payload.items)
    invoice = Invoice(
        id=iid,
        issued_at=datetime.utcnow(),
        owner_id=target_owner,
        appointment_id=payload.appointment_id,
        amount=amount,
        currency=payload.currency,
        items=payload.items,
        customer_name=payload.customer_name,
    )
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

@app.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    inv = _STORE.get(invoice_id)
    if not inv:
        raise HTTPException(404, "Not found")
    if not (x_user_role == "admin" or inv.owner_id == x_user_id):
        raise HTTPException(403, "Forbidden")

    # Company details from env (with safe defaults)
    company_name = os.getenv("COMPANY_NAME", "Garage Ltd.")
    company_address = os.getenv("COMPANY_ADDRESS", "123 Service Lane\nAuto City, AC 12345\n+1 (555) 123-4567")
    company_logo_path = os.getenv("COMPANY_LOGO_PATH")  # optional

    # Render HTML via Jinja2
    templates_dir = os.path.join(os.path.dirname(__file__), 'templates')
    env = Environment(
        loader=FileSystemLoader(templates_dir),
        autoescape=select_autoescape(['html', 'xml'])
    )
    template = env.get_template('invoice.html')
    items = list(inv.items or [])
    total = inv.amount if inv.amount is not None else sum(max(0.0, i.price) for i in items)
    html = template.render(
        invoice=inv,
        total=total,
        company_name=company_name,
        company_address=company_address,
        company_logo=company_logo_path if company_logo_path and os.path.exists(company_logo_path) else None,
    )

    # Convert HTML to PDF with WeasyPrint
    pdf_bytes = HTML(string=html, base_url=templates_dir).write_pdf()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"inline; filename=invoice-{invoice_id}.pdf"
    })
