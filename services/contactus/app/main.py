from typing import List, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    message: str

class ContactMessage(ContactMessageCreate):
    id: str
    created_at: datetime

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
