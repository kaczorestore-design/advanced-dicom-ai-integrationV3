from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import pyotp
import qrcode
import io
import base64
import secrets
import json
from .database import get_db, User, UserRole
from .session_manager import session_manager

import os
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
if SECRET_KEY == "your-secret-key-here-change-in-production":
    import warnings
    warnings.warn("Using default SECRET_KEY in production is insecure!", UserWarning)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=15)
    to_encode.update({
        "exp": expire.timestamp(),
        "iat": now.timestamp(),
        "type": "access_token"
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from .error_handlers import AuthenticationError
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        token_type = payload.get("type")
        exp = payload.get("exp")
        
        if username is None:
            raise AuthenticationError(
                message="Invalid token: missing username",
                details={"token_error": "missing_subject"}
            )
        
        if token_type != "access_token":
            raise AuthenticationError(
                message="Invalid token type",
                details={"expected_type": "access_token", "received_type": token_type}
            )
        
        # Check if token is expired
        if exp and datetime.utcnow().timestamp() > exp:
            raise AuthenticationError(
                message="Token has expired",
                details={"expired_at": datetime.fromtimestamp(exp).isoformat()}
            )
        
        return username
    except JWTError as e:
        raise AuthenticationError(
            message="Invalid token",
            details={"jwt_error": str(e)}
        )

def get_current_user(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    # Clean up expired sessions periodically
    session_manager.cleanup_expired_sessions()
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def require_role(required_roles: list[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        from .error_handlers import AuthorizationError
        
        if current_user.role not in required_roles:
            raise AuthorizationError(
                message="Insufficient permissions",
                details={
                    "required_roles": [role.value for role in required_roles],
                    "user_role": current_user.role.value,
                    "user_id": current_user.id
                }
            )
        return current_user
    return role_checker

def require_admin(current_user: User = Depends(get_current_user)):
    from .error_handlers import AuthorizationError
    
    if current_user.role != UserRole.ADMIN:
        raise AuthorizationError(
            message="Admin access required",
            details={
                "required_role": "admin",
                "user_role": current_user.role.value,
                "user_id": current_user.id
            }
        )
    return current_user

def require_diagnostic_center_admin(current_user: User = Depends(get_current_user)):
    from .error_handlers import AuthorizationError
    
    if current_user.role not in [UserRole.ADMIN, UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        raise AuthorizationError(
            message="Diagnostic center admin access required",
            details={
                "required_roles": ["admin", "diagnostic_center_admin"],
                "user_role": current_user.role.value,
                "user_id": current_user.id
            }
        )
    return current_user

def generate_mfa_secret() -> str:
    """Generate a new MFA secret for TOTP"""
    return pyotp.random_base32()

def generate_qr_code(user_email: str, secret: str) -> str:
    """Generate QR code for MFA setup"""
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user_email,
        issuer_name="PACS System"
    )
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

def verify_mfa_token(secret: str, token: str) -> bool:
    """Verify MFA token"""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)

def generate_backup_codes() -> list[str]:
    """Generate backup codes for MFA"""
    return [secrets.token_hex(4).upper() for _ in range(10)]
