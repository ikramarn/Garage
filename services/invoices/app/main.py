import os
import time
from typing import List, Optional
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI, Header, HTTPException
import httpx
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML
from sqlalchemy import create_engine, String, Float, DateTime, JSON, text
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, sessionmaker
from sqlalchemy.exc import OperationalError
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
    # Only admins may create invoices; require flag to be explicit
    admin_create: bool = False

class Invoice(InvoiceCreate):
    id: str
    status: str = "unpaid"
    issued_at: datetime
    owner_id: str

app = FastAPI(title="Invoices Service")

# DB setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://garage:garage@db:5432/garage")
APPOINTMENTS_URL = os.getenv("APPOINTMENTS_URL", "http://appointments:8000")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class InvoiceRow(Base):
    __tablename__ = "invoices"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    appointment_id: Mapped[str] = mapped_column(String(64))
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(16))
    items: Mapped[List[dict]] = mapped_column(JSON)
    customer_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    owner_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32))
    issued_at: Mapped[datetime] = mapped_column(DateTime)

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

def to_model(row: InvoiceRow) -> Invoice:
    return Invoice(
        id=row.id,
        appointment_id=row.appointment_id,
        amount=row.amount,
        currency=row.currency,
        items=[InvoiceItem(**it) for it in (row.items or [])],
        customer_name=row.customer_name,
        owner_id=row.owner_id,
        status=row.status,
        issued_at=row.issued_at,
    )

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/invoices", response_model=List[Invoice])
def list_invoices(x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(401, "Unauthorized")
    with SessionLocal() as s:
        if x_user_role == "admin":
            rows = s.query(InvoiceRow).all()
        else:
            rows = s.query(InvoiceRow).filter(InvoiceRow.owner_id == x_user_id).all()
        return [to_model(r) for r in rows]

@app.post("/invoices", response_model=Invoice, status_code=201)
def create_invoice(payload: InvoiceCreate, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(401, "Unauthorized")
    # Only admin may create invoices; normal users cannot
    if x_user_role != "admin":
        raise HTTPException(403, "Only admin can create invoices")
    # Admin must indicate explicit create intention
    if not payload.admin_create:
        raise HTTPException(400, "admin_create flag required")
    # Verify appointment is completed (use scheduled_at in the past as proxy)
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"{APPOINTMENTS_URL}/appointments/{payload.appointment_id}", headers={"x-user-role": "admin"})
        if resp.status_code != 200:
            raise HTTPException(404, "Appointment not found")
        appt = resp.json()
        # expected key 'scheduled_at' as ISO8601
        scheduled = appt.get("scheduled_at")
        if not scheduled:
            raise HTTPException(400, "Appointment missing scheduled time")
        try:
            # FastAPI typically serializes datetime to ISO format
            scheduled_dt = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(400, "Invalid appointment date")
        if scheduled_dt > datetime.utcnow().replace(tzinfo=scheduled_dt.tzinfo):
            raise HTTPException(409, "Appointment not completed yet")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(500, "Failed to verify appointment status")

    iid = str(uuid4())
    # Admin may create invoice for a customer (owner_id required)
    target_owner = payload.owner_id if payload.owner_id else x_user_id
    amount = payload.amount if payload.amount is not None else sum(max(0.0, i.price) for i in payload.items)
    with SessionLocal() as s:
        row = InvoiceRow(
            id=iid,
            issued_at=datetime.utcnow(),
            owner_id=target_owner,
            appointment_id=payload.appointment_id,
            amount=amount,
            currency=payload.currency,
            items=[i.model_dump() for i in payload.items or []],
            customer_name=payload.customer_name,
            status="unpaid",
        )
        s.add(row)
        s.commit()
        s.refresh(row)
        return to_model(row)

@app.get("/invoices/{invoice_id}", response_model=Invoice)
def get_invoice(invoice_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    with SessionLocal() as s:
        row = s.query(InvoiceRow).get(invoice_id)
        if not row:
            raise HTTPException(404, "Not found")
        if x_user_role == "admin" or row.owner_id == x_user_id:
            return to_model(row)
        raise HTTPException(403, "Forbidden")

@app.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: str, x_user_id: str | None = Header(default=None), x_user_role: str | None = Header(default=None)):
    with SessionLocal() as s:
        row = s.query(InvoiceRow).get(invoice_id)
    inv = to_model(row) if row else None
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
