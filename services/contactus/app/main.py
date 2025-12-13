from typing import List, Dict
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

_STORE: Dict[str, ContactMessage] = {}
app = FastAPI(title="Contact Us Service")

_STORE: Dict[str, ContactMessage] = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/contactus", response_model=List[ContactMessage])
def list_messages():
    return list(_STORE.values())

@app.post("/contactus", response_model=ContactMessage, status_code=201)
def create_message(payload: ContactMessageCreate):
    mid = str(uuid4())
    msg = ContactMessage(id=mid, created_at=datetime.utcnow(), **payload.model_dump())
    _STORE[mid] = msg
    return msg

    # Attempt to send email notification if configured
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    CONTACT_NOTIFY_EMAIL = os.getenv("CONTACT_NOTIFY_EMAIL")

    if SMTP_HOST and CONTACT_NOTIFY_EMAIL:
        try:
            email_msg = EmailMessage()
            email_msg["Subject"] = f"New contact from {payload.name}"
            email_msg["From"] = SMTP_USER or CONTACT_NOTIFY_EMAIL
            email_msg["To"] = CONTACT_NOTIFY_EMAIL
            email_msg.set_content(f"Name: {payload.name}\nEmail: {payload.email}\n\nMessage:\n{payload.message}")

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                if SMTP_USER and SMTP_PASS:
                    server.login(SMTP_USER, SMTP_PASS)
                server.send_message(email_msg)
        except Exception:
            # Do not fail the API if email sending fails
            pass

    return msg
