from typing import List, Dict, Optional
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel

class PaymentCreate(BaseModel):
    invoice_id: str
    amount: float
    currency: str = "USD"
    method: str = "card"

class Payment(PaymentCreate):
    id: str
    status: str = "completed"
    created_at: datetime

import os
from pydantic import BaseModel
from typing import Optional

try:
    import stripe
except Exception:
    stripe = None
app = FastAPI(title="Payments Service")

_STORE: Dict[str, Payment] = {}

@app.get("/health")
def health():
    return {"status": "ok"}


class StripeSessionRequest(BaseModel):
    invoice_id: int


class StripeIntentRequest(BaseModel):
    invoice_id: int
    currency: Optional[str] = "usd"


def _get_stripe():
    if stripe is None:
        raise RuntimeError("Stripe SDK not installed. Please install 'stripe' package.")
    secret = os.getenv("STRIPE_SECRET_KEY")
    if not secret:
        raise RuntimeError("STRIPE_SECRET_KEY not configured")
    stripe.api_key = secret
    return stripe


def _frontend_url():
    return os.getenv("FRONTEND_URL", "http://localhost:5173")


@app.post("/payments/stripe/create-session")
async def create_session(req: StripeSessionRequest):
    s = _get_stripe()
    # In a real app, fetch invoice details from DB
    amount_cents = 1000
    currency = "usd"
    success_url = f"{_frontend_url()}/checkout?invoice={req.invoice_id}&success=true"
    cancel_url = f"{_frontend_url()}/invoices"
    session = s.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": currency,
                "product_data": {"name": f"Invoice #{req.invoice_id}"},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"invoice_id": req.invoice_id},
    )
    return {"id": session.get("id"), "url": session.get("url")}


@app.post("/payments/stripe/create-intent")
async def create_intent(req: StripeIntentRequest):
    s = _get_stripe()
    # Dummy amount for placeholder; replace with real invoice lookup
    amount_cents = 1000
    intent = s.PaymentIntent.create(
        amount=amount_cents,
        currency=req.currency,
        metadata={"invoice_id": req.invoice_id},
    )
    return {"client_secret": intent.get("client_secret")}


class VerifySessionRequest(BaseModel):
    invoice_id: int


@app.post("/payments/stripe/verify-session")
async def verify_session(req: VerifySessionRequest):
    # In a full implementation, validate the Stripe session/intent and mark invoice paid in DB.
    # Here we just return success to allow frontend to refresh lists.
    return {"ok": True, "invoice_id": req.invoice_id}

@app.get("/payments", response_model=List[Payment])
def list_payments():
    return list(_STORE.values())

@app.post("/payments", response_model=Payment, status_code=201)
def create_payment(payload: PaymentCreate):
    pid = str(uuid4())
    payment = Payment(id=pid, created_at=datetime.utcnow(), **payload.model_dump())
    _STORE[pid] = payment
    return payment
