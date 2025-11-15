from typing import List, Dict, Optional
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
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

    # Generate a simple PDF in-memory
    buffer = BytesIO()
    width, height = A4
    c = canvas.Canvas(buffer, pagesize=A4)

    # Header
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, height - 60, "Invoice")
    c.setFont("Helvetica", 10)
    c.drawString(40, height - 80, f"Invoice ID: {inv.id}")
    c.drawString(40, height - 95, f"Date: {inv.issued_at.strftime('%Y-%m-%d %H:%M:%S')} UTC")

    # Billed to
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, height - 125, "Billed To:")
    c.setFont("Helvetica", 11)
    c.drawString(40, height - 140, inv.customer_name or "Customer")

    # Items table
    y = height - 180
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, "Description")
    c.drawRightString(width - 40, y, "Price")
    y -= 10
    c.line(40, y, width - 40, y)
    y -= 20
    c.setFont("Helvetica", 11)
    total = inv.amount if inv.amount is not None else sum(max(0.0, i.price) for i in inv.items)
    for item in (inv.items or []):
        c.drawString(40, y, item.description)
        c.drawRightString(width - 40, y, f"$ {float(item.price):.2f}")
        y -= 18
        if y < 80:
            # footer and new page
            c.showPage()
            y = height - 60
            c.setFont("Helvetica", 11)

    # Total
    y = max(y, 120)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 40, y, f"Total: $ {float(total):.2f} {inv.currency}")

    # Footer
    c.setFont("Helvetica", 9)
    c.drawString(40, 50, f"Appointment: {inv.appointment_id}")
    c.drawRightString(width - 40, 50, "Thank you for your business")

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"inline; filename=invoice-{invoice_id}.pdf"
    })
