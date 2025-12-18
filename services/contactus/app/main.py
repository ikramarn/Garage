from typing import List, Dict, Optional
from uuid import uuid4
from datetime import datetime
import os
import smtplib
from email.message import EmailMessage
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    message: str

class ContactMessage(ContactMessageCreate):
    id: str
    created_at: datetime

class ContactMessageResponse(ContactMessage):
    email_sent: bool = False
    email_error: Optional[str] = None

_STORE: Dict[str, ContactMessage] = {}
app = FastAPI(title="Contact Us Service")

_STORE: Dict[str, ContactMessage] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/contactus", response_model=List[ContactMessage])
def list_messages():
    return list(_STORE.values())

@app.post("/contactus", response_model=ContactMessageResponse, status_code=201)
def create_message(payload: ContactMessageCreate):
    mid = str(uuid4())
    msg = ContactMessage(id=mid, created_at=datetime.utcnow(), **payload.model_dump())
    _STORE[mid] = msg
    # Attempt to send email notification if configured
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_SSL = os.getenv("SMTP_SSL", "false").lower() in {"1", "true", "yes"}
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    CONTACT_NOTIFY_EMAIL = os.getenv("CONTACT_NOTIFY_EMAIL")
    email_sent = False
    email_error: Optional[str] = None
    if not (SMTP_HOST and CONTACT_NOTIFY_EMAIL):
        email_error = "Email not configured"
    else:
        try:
            email_msg = EmailMessage()
            email_msg["Subject"] = f"New contact from {payload.name}"
            email_msg["From"] = SMTP_USER or CONTACT_NOTIFY_EMAIL
            email_msg["To"] = CONTACT_NOTIFY_EMAIL
            email_msg.set_content(
                f"Name: {payload.name}\nEmail: {payload.email}\n\nMessage:\n{payload.message}"
            )

            if SMTP_SSL or SMTP_PORT == 465:
                with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                    if SMTP_USER and SMTP_PASS:
                        server.login(SMTP_USER, SMTP_PASS)
                    server.send_message(email_msg)
                    email_sent = True
            else:
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                    try:
                        server.starttls()
                    except Exception:
                        # Some servers may not support STARTTLS; continue without it
                        pass
                    if SMTP_USER and SMTP_PASS:
                        server.login(SMTP_USER, SMTP_PASS)
                    server.send_message(email_msg)
                    email_sent = True
        except Exception as e:
            # Do not fail the API if email sending fails; report status
            email_error = str(e)

    return ContactMessageResponse(**msg.model_dump(), email_sent=email_sent, email_error=email_error)
