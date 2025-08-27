from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import psutil
import os
from datetime import datetime, timedelta
from sqlalchemy import func

from ..database import get_db, User, DiagnosticCenter, UserRole, Study, DicomFile, AuditLog, SystemSettings
from ..auth import require_admin, get_password_hash
from .. import schemas

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/users", response_model=schemas.User)
async def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        diagnostic_center_id=user_data.diagnostic_center_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users", response_model=List[schemas.User])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}", response_model=schemas.User)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.post("/diagnostic-centers", response_model=schemas.DiagnosticCenter)
async def create_diagnostic_center(
    center_data: schemas.DiagnosticCenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_center = DiagnosticCenter(**center_data.dict())
    db.add(db_center)
    db.commit()
    db.refresh(db_center)
    return db_center

@router.get("/diagnostic-centers", response_model=List[schemas.DiagnosticCenter])
async def get_diagnostic_centers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    centers = db.query(DiagnosticCenter).offset(skip).limit(limit).all()
    return centers

@router.put("/diagnostic-centers/{center_id}", response_model=schemas.DiagnosticCenter)
async def update_diagnostic_center(
    center_id: int,
    center_data: schemas.DiagnosticCenterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Diagnostic center not found")
    
    for field, value in center_data.dict(exclude_unset=True).items():
        setattr(center, field, value)
    
    db.commit()
    db.refresh(center)
    return center

@router.put("/diagnostic-centers/{center_id}/toggle-status")
async def toggle_center_status(
    center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Diagnostic center not found")
    
    center.is_active = not center.is_active
    db.commit()
    
    return {"message": f"Center {'activated' if center.is_active else 'deactivated'} successfully"}

@router.put("/diagnostic-centers/{center_id}/space-allocation")
async def update_space_allocation(
    center_id: int,
    quota_gb: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Diagnostic center not found")
    
    center.storage_quota_gb = quota_gb
    db.commit()
    
    return {"message": "Space allocation updated successfully"}

@router.delete("/diagnostic-centers/{center_id}")
async def delete_diagnostic_center(
    center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Diagnostic center not found")
    
    db.delete(center)
    db.commit()
    return {"message": "Diagnostic center deleted successfully"}

@router.get("/system-monitoring")
async def get_system_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get real-time system monitoring data"""
    
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    total_studies = db.query(Study).count()
    total_dicom_files = db.query(DicomFile).count()
    
    yesterday = datetime.now() - timedelta(days=1)
    recent_studies = db.query(Study).filter(Study.created_at >= yesterday).count()
    recent_uploads = db.query(DicomFile).filter(DicomFile.created_at >= yesterday).count()
    
    center_storage = db.query(
        DiagnosticCenter.id,
        DiagnosticCenter.name,
        DiagnosticCenter.storage_quota_gb,
        DiagnosticCenter.storage_used_gb,
        DiagnosticCenter.is_active
    ).all()
    
    ai_services = [
        {"name": "Chest X-Ray AI", "status": "operational", "last_check": datetime.now()},
        {"name": "Brain MRI AI", "status": "operational", "last_check": datetime.now()},
        {"name": "CT Scan AI", "status": "operational", "last_check": datetime.now()}
    ]
    
    recent_logs = db.query(AuditLog).filter(
        AuditLog.timestamp >= yesterday
    ).order_by(AuditLog.timestamp.desc()).limit(50).all()
    
    return {
        "system_resources": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used_gb": round(memory.used / (1024**3), 2),
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "disk_percent": round((disk.used / disk.total) * 100, 2),
            "disk_used_gb": round(disk.used / (1024**3), 2),
            "disk_total_gb": round(disk.total / (1024**3), 2)
        },
        "database_stats": {
            "total_studies": total_studies,
            "total_dicom_files": total_dicom_files,
            "recent_studies_24h": recent_studies,
            "recent_uploads_24h": recent_uploads
        },
        "center_storage": [
            {
                "center_id": center.id,
                "center_name": center.name,
                "quota_gb": center.storage_quota_gb or 100,
                "used_gb": center.storage_used_gb or 0,
                "usage_percent": round(((center.storage_used_gb or 0) / (center.storage_quota_gb or 100)) * 100, 2),
                "is_active": center.is_active
            }
            for center in center_storage
        ],
        "ai_services": ai_services,
        "recent_logs": [
            {
                "id": log.id,
                "action": log.action,
                "user_id": log.user_id,
                "details": log.details,
                "timestamp": log.timestamp,
                "level": "info" if "success" in log.action.lower() else "warning" if "warning" in log.action.lower() else "error"
            }
            for log in recent_logs
        ],
        "timestamp": datetime.now()
    }

@router.get("/center-analytics/{center_id}")
async def get_center_analytics(
    center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get detailed analytics for a specific center"""
    
    center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Diagnostic center not found")
    
    studies_by_status = db.query(
        Study.status,
        func.count(Study.id).label('count')
    ).filter(Study.diagnostic_center_id == center_id).group_by(Study.status).all()
    
    studies_by_modality = db.query(
        Study.modality,
        func.count(Study.id).label('count')
    ).filter(Study.diagnostic_center_id == center_id).group_by(Study.modality).all()
    
    last_week = datetime.now() - timedelta(days=7)
    recent_activity = db.query(Study).filter(
        Study.diagnostic_center_id == center_id,
        Study.created_at >= last_week
    ).order_by(Study.created_at.desc()).limit(20).all()
    
    staff_stats = db.query(
        User.id,
        User.full_name,
        User.role,
        func.count(Study.id).label('studies_count')
    ).join(Study, User.id == Study.uploaded_by_id).filter(
        User.diagnostic_center_id == center_id
    ).group_by(User.id, User.full_name, User.role).all()
    
    return {
        "center_info": {
            "id": center.id,
            "name": center.name,
            "is_active": center.is_active,
            "storage_quota_gb": center.storage_quota_gb,
            "storage_used_gb": center.storage_used_gb
        },
        "studies_by_status": [
            {"status": status, "count": count}
            for status, count in studies_by_status
        ],
        "studies_by_modality": [
            {"modality": modality or "Unknown", "count": count}
            for modality, count in studies_by_modality
        ],
        "recent_activity": [
            {
                "study_id": study.id,
                "patient_name": f"Patient {study.patient_id}",
                "modality": study.modality,
                "status": study.status,
                "created_at": study.created_at
            }
            for study in recent_activity
        ],
        "staff_performance": [
            {
                "user_id": user_id,
                "name": name,
                "role": role,
                "studies_uploaded": count
            }
            for user_id, name, role, count in staff_stats
        ]
    }

@router.get("/system-settings", response_model=schemas.SystemSettings)
async def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get current system settings"""
    settings = db.query(SystemSettings).first()
    if not settings:
        # Create default settings if none exist
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/system-settings", response_model=schemas.SystemSettings)
async def update_system_settings(
    settings_data: schemas.SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update system settings"""
    settings = db.query(SystemSettings).first()
    if not settings:
        # Create new settings if none exist
        settings = SystemSettings(**settings_data.dict())
        db.add(settings)
    else:
        # Update existing settings
        for field, value in settings_data.dict(exclude_unset=True).items():
            setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    return settings
