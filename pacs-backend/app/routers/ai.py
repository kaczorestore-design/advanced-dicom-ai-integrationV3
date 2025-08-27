from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db, User, Study, UserRole
from ..auth import get_current_user
from ..ai_service import ai_service
from .. import schemas

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/generate-report/{study_id}")
async def generate_ai_report(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI report for a study"""
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = True  # Radiologists can generate AI reports for any study
    elif current_user.role in [UserRole.DOCTOR, UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ai_report = ai_service.generate_report(
        modality=study.modality or "Unknown",
        body_part=study.body_part or "Unknown",
        study_description=study.study_description or ""
    )
    
    study.ai_report = str(ai_report)
    db.commit()
    
    return {
        "message": "AI report generated successfully",
        "report": ai_report
    }

@router.get("/report/{study_id}")
async def get_ai_report(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI report for a study"""
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = True
    elif current_user.role in [UserRole.DOCTOR, UserRole.TECHNICIAN, UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not study.ai_report:
        raise HTTPException(status_code=404, detail="No AI report available for this study")
    
    try:
        import json
        ai_report = json.loads(study.ai_report)
    except:
        ai_report = {"raw_report": study.ai_report}
    
    return ai_report

@router.post("/analyze-measurements")
async def analyze_measurements(
    measurements: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user)
):
    """Analyze measurements using AI"""
    
    if current_user.role not in [UserRole.DOCTOR, UserRole.RADIOLOGIST]:
        raise HTTPException(status_code=403, detail="Only doctors and radiologists can analyze measurements")
    
    analysis = ai_service.analyze_measurements(measurements)
    
    return {
        "message": "Measurements analyzed successfully",
        "analysis": analysis
    }

@router.post("/analyze")
async def analyze_study(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze study using AI for DICOM viewer"""
    study_id = request.get("study_id")
    modality = request.get("modality")
    body_part = request.get("body_part")
    
    if not all([study_id, modality, body_part]):
        raise HTTPException(status_code=400, detail="Missing required fields: study_id, modality, body_part")
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = True
    elif current_user.role in [UserRole.DOCTOR, UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        import time
        from ..database import DicomFile
        start_time = time.time()
        
        dicom_file = db.query(DicomFile).filter(DicomFile.study_id == study_id).first()
        dicom_path = dicom_file.file_path if dicom_file else None
        
        ai_report = ai_service.generate_report(
            modality=modality,
            body_part=body_part,
            study_description=study.study_description or "",
            dicom_path=dicom_path
        )
        
        processing_time = time.time() - start_time
        
        return {
            "findings": ai_report.get("findings", []),
            "impression": ai_report.get("impression", ""),
            "confidence": ai_report.get("confidence", 0.0),
            "pathology_scores": ai_report.get("pathology_scores", {}),
            "abnormal_findings": ai_report.get("abnormal_findings", []),
            "ai_model": ai_report.get("ai_model", ""),
            "analysis_type": ai_report.get("analysis_type", ""),
            "processing_time": processing_time
        }
        
    except Exception as e:
        from ..error_handlers import ServiceUnavailableError
        raise ServiceUnavailableError(
            service="AI Analysis",
            message=f"AI analysis failed: {str(e)}",
            details={
                "study_id": study_id,
                "error_type": type(e).__name__,
                "processing_time": time.time() - start_time
            }
        )
