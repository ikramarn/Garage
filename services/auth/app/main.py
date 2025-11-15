import os
import time
from datetime import datetime, timedelta
from uuid import uuid4

import jwt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import create_engine, String, text
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, sessionmaker
from sqlalchemy.exc import OperationalError

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

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://garage:garage@db:5432/garage")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32))

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
    # Final attempt (let it raise if still failing)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

_wait_for_db()
Base.metadata.create_all(bind=engine)

# seed admin
with SessionLocal() as s:
    existing = s.query(User).filter(User.username == "admin").first()
    if not existing:
        uid = str(uuid4())
        s.add(User(id=uid, username="admin", password_hash=pwd_ctx.hash("admin123"), role="admin"))
        s.commit()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/register")
def register(body: Register):
    with SessionLocal() as s:
        existing = s.query(User).filter(User.username == body.username).first()
        if existing:
            raise HTTPException(400, "Username already exists")
        uid = str(uuid4())
        s.add(User(id=uid, username=body.username, password_hash=pwd_ctx.hash(body.password), role=body.role or "customer"))
        s.commit()
        return {"id": uid, "username": body.username}

@app.post("/login")
def login(body: Login):
    with SessionLocal() as s:
        u = s.query(User).filter(User.username == body.username).first()
        if not u or not pwd_ctx.verify(body.password, u.password_hash):
            raise HTTPException(401, "Invalid credentials")
    now = datetime.utcnow()
    payload = {
        "sub": u.id,
        "username": u.username,
        "role": u.role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=8)).timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=ALGO)
    return {"token": token}
