from sqlalchemy.orm import Session
from .database import AuditLog, User
from fastapi import Request
import json
from datetime import datetime
from typing import Optional, Dict, Any

def log_audit_event(
    db: Session,
    action: str,
    user: Optional[User] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    request: Optional[Request] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log audit event to database"""
    
    audit_log = AuditLog(
        user_id=user.id if user else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
        details=json.dumps(details) if details else None,
        timestamp=datetime.utcnow()
    )
    
    db.add(audit_log)
    db.commit()

def anonymize_phi(data: Dict[str, Any]) -> Dict[str, Any]:
    """Anonymize PHI data for compliance"""
    phi_fields = [
        'patient_name', 'first_name', 'last_name', 
        'email', 'phone', 'address', 'patient_id'
    ]
    
    anonymized = data.copy()
    for field in phi_fields:
        if field in anonymized:
            anonymized[field] = "***REDACTED***"
    
    return anonymized
