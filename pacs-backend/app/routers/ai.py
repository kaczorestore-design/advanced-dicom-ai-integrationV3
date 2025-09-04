from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db, User, Study, UserRole
from ..auth import get_current_user, check_medical_access, has_medical_access
from ..ai_service import ai_service
from .. import schemas

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-report/{study_id}")
async def generate_ai_report(
    study_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_medical_access),
):
    """Generate AI report for a study with universal medical access"""

    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Universal medical access - all authenticated medical professionals can generate AI reports
    # Access control is handled by check_medical_access dependency
    
    # Log access for audit purposes
    print(
        f"AI report generation access granted - User {current_user.id} ({current_user.role.value}) "
        f"from center {current_user.diagnostic_center_id} generated report for study {study_id} "
        f"from center {study.diagnostic_center_id}"
    )

    ai_report = ai_service.generate_report(
        modality=study.modality or "Unknown",
        body_part=study.body_part or "Unknown",
        study_description=study.study_description or "",
    )

    study.ai_report = str(ai_report)
    db.commit()

    return {"message": "AI report generated successfully", "report": ai_report}


@router.get("/report/{study_id}")
async def get_ai_report(
    study_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_medical_access),
):
    """Get AI report for a study with universal medical access"""

    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Universal medical access - all authenticated medical professionals can view AI reports
    # Access control is handled by check_medical_access dependency
    
    # Log access for audit purposes
    print(
        f"AI report access granted - User {current_user.id} ({current_user.role.value}) "
        f"from center {current_user.diagnostic_center_id} accessed report for study {study_id} "
        f"from center {study.diagnostic_center_id}"
    )

    if not study.ai_report:
        raise HTTPException(
            status_code=404, detail="No AI report available for this study"
        )

    try:
        import json

        ai_report = json.loads(study.ai_report)
    except:
        ai_report = {"raw_report": study.ai_report}

    return ai_report


@router.post("/analyze-measurements")
async def analyze_measurements(
    measurements: List[Dict[str, Any]], current_user: User = Depends(get_current_user)
):
    """Analyze measurements using AI"""

    if current_user.role not in [UserRole.DOCTOR, UserRole.RADIOLOGIST]:
        raise HTTPException(
            status_code=403,
            detail="Only doctors and radiologists can analyze measurements",
        )

    analysis = ai_service.analyze_measurements(measurements)

    return {"message": "Measurements analyzed successfully", "analysis": analysis}


@router.post("/analyze")
async def analyze_study(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_medical_access),
):
    """Analyze study using AI for DICOM viewer with universal medical access"""
    study_id = request.get("study_id")
    modality = request.get("modality")
    body_part = request.get("body_part")

    if not all([study_id, modality, body_part]):
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: study_id, modality, body_part",
        )

    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Universal medical access - all authenticated medical professionals can analyze studies
    # Access control is handled by check_medical_access dependency
    
    # Log access for audit purposes
    print(
        f"AI analysis access granted - User {current_user.id} ({current_user.role.value}) "
        f"from center {current_user.diagnostic_center_id} analyzed study {study_id} "
        f"from center {study.diagnostic_center_id}"
    )

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
            dicom_path=dicom_path,
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
            "processing_time": processing_time,
        }

    except Exception as e:
        from ..error_handlers import ServiceUnavailableError

        raise ServiceUnavailableError(
            service="AI Analysis",
            message=f"AI analysis failed: {str(e)}",
            details={
                "study_id": study_id,
                "error_type": type(e).__name__,
                "processing_time": time.time() - start_time,
            },
        )
