from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import json

from ..database import get_db, User
from ..auth import get_current_user, generate_mfa_secret, generate_qr_code, verify_mfa_token, generate_backup_codes
from .. import schemas

router = APIRouter(prefix="/auth", tags=["mfa"])

@router.post("/setup-mfa")
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup MFA for current user"""
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA already enabled"
        )
    
    secret = generate_mfa_secret()
    qr_code = generate_qr_code(current_user.email, secret)
    backup_codes = generate_backup_codes()
    
    current_user.mfa_secret = secret
    current_user.mfa_backup_codes = json.dumps(backup_codes)
    db.commit()
    
    return {
        "secret": secret,
        "qr_code": qr_code,
        "backup_codes": backup_codes
    }

@router.post("/verify-mfa")
async def verify_mfa(
    token_data: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify MFA token and enable MFA"""
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA not set up"
        )
    
    token = token_data.get("token")
    if not verify_mfa_token(current_user.mfa_secret, token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA token"
        )
    
    current_user.mfa_enabled = True
    db.commit()
    
    return {"message": "MFA enabled successfully"}

@router.post("/disable-mfa")
async def disable_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable MFA for current user"""
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    current_user.mfa_backup_codes = None
    db.commit()
    
    return {"message": "MFA disabled successfully"}
