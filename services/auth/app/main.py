import os
from datetime import datetime, timedelta
from typing import Dict
from uuid import uuid4

import jwt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGO = "HS256"

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Register(BaseModel):
    username: str
    password: str
    role: str | None = None  # 'admin' or 'customer'

class Login(BaseModel):
    username: str
    password: str

app = FastAPI(title="Auth Service")

_USERS: Dict[str, Dict] = {}

# seed admin
if "admin" not in _USERS:
    uid = str(uuid4())
    _USERS["admin"] = {
        "id": uid,
        "username": "admin",
        "password_hash": pwd_ctx.hash("admin123"),
        "role": "admin",
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/register")
def register(body: Register):
    if body.username in _USERS:
        raise HTTPException(400, "Username already exists")
    uid = str(uuid4())
    _USERS[body.username] = {
        "id": uid,
        "username": body.username,
        "password_hash": pwd_ctx.hash(body.password),
        "role": body.role or "customer",
    }
    return {"id": uid, "username": body.username}

@app.post("/login")
def login(body: Login):
    user = _USERS.get(body.username)
    if not user or not pwd_ctx.verify(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    now = datetime.utcnow()
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=8)).timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=ALGO)
    return {"token": token}
