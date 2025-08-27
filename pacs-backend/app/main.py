import os

os.environ['LIGHTWEIGHT_AI'] = 'true'

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import os
import uuid
import shutil
from datetime import timedelta, datetime
import time

from .database import engine, Base, get_db
from .auth import (
    create_access_token, get_current_user, require_admin, 
    require_diagnostic_center_admin, get_password_hash, verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from . import schemas
from .database import (
    User, DiagnosticCenter, Patient, Study, DicomFile, Annotation,
    UserRole, StudyStatus
)
from .monitoring import get_metrics
from .dicom_service import DicomNodeConnector
from .error_handlers import setup_error_handlers

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PACS System API", 
    version="1.0.0",
    max_request_size=10 * 1024 * 1024 * 1024  # 10GB
)

# Setup error handlers
setup_error_handlers(app)

# CORS configuration - restrict origins in production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000").split(",")
if "*" in allowed_origins:
    import warnings
    warnings.warn("CORS allows all origins - this is insecure for production!", UserWarning)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

from starlette.middleware.base import BaseHTTPMiddleware

# Rate limiting for login attempts
login_attempts: Dict[str, List[float]] = {}
MAX_LOGIN_ATTEMPTS = 10  # Increased from 5 to 10
LOCKOUT_DURATION = 60   # Reduced from 5 minutes to 1 minute

def is_rate_limited(ip_address: str) -> bool:
    """Check if IP is rate limited for login attempts"""
    current_time = time.time()
    
    if ip_address not in login_attempts:
        login_attempts[ip_address] = []
    
    # Remove old attempts (older than lockout duration)
    login_attempts[ip_address] = [
        attempt_time for attempt_time in login_attempts[ip_address]
        if current_time - attempt_time < LOCKOUT_DURATION
    ]
    
    return len(login_attempts[ip_address]) >= MAX_LOGIN_ATTEMPTS

def record_login_attempt(ip_address: str):
    """Record a failed login attempt"""
    current_time = time.time()
    if ip_address not in login_attempts:
        login_attempts[ip_address] = []
    login_attempts[ip_address].append(current_time)

def clear_rate_limiting(ip_address: str = None):
    """Clear rate limiting for testing purposes"""
    if ip_address:
        login_attempts.pop(ip_address, None)
    else:
        login_attempts.clear()

class LargeUploadMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/studies/upload") or request.url.path.startswith("/api/studies/upload"):
            request.scope["client_max_body_size"] = 10 * 1024 * 1024 * 1024  # 10GB
        response = await call_next(request)
        return response

app.add_middleware(LargeUploadMiddleware)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/auth/login", response_model=schemas.Token)
async def login(login_data: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    from .error_handlers import RateLimitError, AuthenticationError
    
    # Get client IP address
    client_ip = request.client.host if request.client else "unknown"
    
    # Check rate limiting
    if is_rate_limited(client_ip):
        raise RateLimitError(
            message=f"Too many login attempts. Please try again in {LOCKOUT_DURATION // 60} minutes.",
            retry_after=LOCKOUT_DURATION,
            details={"ip_address": client_ip, "max_attempts": MAX_LOGIN_ATTEMPTS}
        )
    
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record failed login attempt
        record_login_attempt(client_ip)
        raise AuthenticationError(
            message="Incorrect username or password",
            details={"username": login_data.username, "ip_address": client_ip}
        )
    
    if not user.is_active:
        raise AuthenticationError(
            message="User account is inactive",
            details={"username": user.username, "account_status": "inactive"}
        )
    
    # Clear login attempts on successful login
    if client_ip in login_attempts:
        login_attempts[client_ip] = []
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/metrics")
async def metrics():
    return get_metrics()

@app.post("/auth/clear-rate-limit")
async def clear_rate_limit(request: Request, current_user: User = Depends(require_admin)):
    """Clear rate limiting for testing purposes (admin only)"""
    client_ip = request.client.host
    clear_rate_limiting(client_ip)
    return {"message": f"Rate limiting cleared for IP: {client_ip}"}

@app.post("/auth/clear-all-rate-limits")
async def clear_all_rate_limits(current_user: User = Depends(require_admin)):
    """Clear all rate limiting for testing purposes (admin only)"""
    clear_rate_limiting()
    return {"message": "All rate limiting cleared"}

try:
    dicom_service = DicomNodeConnector()
    dicom_service.start_scp_server()
    print("✅ DICOM SCP server started successfully")
except Exception as e:
    print(f"⚠️ DICOM service initialization failed: {e}")

from .routers import admin, diagnostic_center, studies, ai, mfa, audit

app.include_router(admin.router)
app.include_router(diagnostic_center.router)
app.include_router(studies.router)
app.include_router(ai.router)
app.include_router(mfa.router)
app.include_router(audit.router)
app.include_router(studies.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
