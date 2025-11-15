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

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18*mm,
        leftMargin=18*mm,
        topMargin=18*mm,
        bottomMargin=18*mm,
    )

    styles = getSampleStyleSheet()
    story = []

    # Header with optional logo and company details
    header_cells = []
    # Left: logo + company name
    left_flow = []
    if company_logo_path and os.path.exists(company_logo_path):
        try:
            img = Image(company_logo_path, width=30*mm, height=30*mm)
            left_flow.append(img)
            left_flow.append(Spacer(1, 4))
        except Exception:
            pass
    left_flow.append(Paragraph(f"<b>{company_name}</b>", styles['Title']))
    left_flow.append(Paragraph(company_address.replace('\n', '<br/>'), styles['Normal']))

    # Right: invoice metadata
    meta = [
        [Paragraph("<b>Invoice</b>", styles['Heading2'])],
        [Paragraph(f"Invoice ID: {inv.id}", styles['Normal'])],
        [Paragraph(f"Date: {inv.issued_at.strftime('%Y-%m-%d %H:%M:%S')} UTC", styles['Normal'])],
        [Paragraph(f"Status: {inv.status}", styles['Normal'])],
    ]
    meta_table = Table(meta, colWidths=[70*mm])
    header_table = Table(
        [[left_flow, meta_table]],
        colWidths=[100*mm, 70*mm],
        hAlign='LEFT'
    )
    story.append(header_table)
    story.append(Spacer(1, 12))

    # Billed To block
    billed_to = inv.customer_name or "Customer"
    two_col = Table(
        [
            [Paragraph('<b>Billed To</b>', styles['Heading4']), Paragraph('<b>Appointment</b>', styles['Heading4'])],
            [Paragraph(billed_to, styles['Normal']), Paragraph(inv.appointment_id, styles['Normal'])],
        ],
        colWidths=[100*mm, 70*mm],
    )
    story.append(two_col)
    story.append(Spacer(1, 12))

    # Items table
    items = list(inv.items or [])
    total = inv.amount if inv.amount is not None else sum(max(0.0, i.price) for i in items)
    data = [["Description", "Price"]]
    if items:
        for it in items:
            data.append([it.description, f"$ {float(it.price):.2f}"])
    else:
        data.append(["Custom Amount", f"$ {float(total):.2f}"])

    data.append([Paragraph("<b>Total</b>", styles['Normal']), Paragraph(f"<b>$ {float(total):.2f} {inv.currency}</b>", styles['Normal'])])

    table = Table(data, colWidths=[130*mm, 40*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (1,1), (1,-1), 'RIGHT'),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor('#cbd5e1')),
        ('GRID', (0,0), (-1,-2), 0.25, colors.HexColor('#e5e7eb')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('LINEABOVE', (0,-1), (-1,-1), 0.75, colors.HexColor('#94a3b8')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 18))

    # Footer
    story.append(Paragraph("Thank you for your business", styles['Italic']))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"inline; filename=invoice-{invoice_id}.pdf"
    })
