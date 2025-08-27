from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
import pydicom
from datetime import datetime

from ..database import get_db, User, Study, Patient, DicomFile, UserRole, StudyStatus, DeletionRequest, DiagnosticCenter
from ..auth import get_current_user
from .. import schemas
from ..upload_config import validate_upload_file, validate_batch_upload, MAX_UPLOAD_SIZE
from ..audit import log_audit_event, anonymize_phi

router = APIRouter(prefix="/studies", tags=["studies"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.Study)
async def upload_study(
    patient_id: Optional[str] = Form(None),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    study_description: Optional[str] = Form(None),
    priority: Optional[str] = Form("normal"),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.TECHNICIAN, UserRole.DOCTOR]:
        raise HTTPException(status_code=403, detail="Only technicians and doctors can upload studies")
    
    try:
        validate_batch_upload(files, max_total_size=MAX_UPLOAD_SIZE)
        for file in files:
            if hasattr(file, 'size'):
                validate_upload_file(file)
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    
    extracted_metadata = {}
    if files and files[0].filename and files[0].filename.lower().endswith('.dcm'):
        try:
            temp_content = await files[0].read()
            await files[0].seek(0)  # Reset file pointer
            
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.dcm', delete=False) as temp_file:
                temp_file.write(temp_content)
                temp_path = temp_file.name
            
            ds = pydicom.dcmread(temp_path, force=True)
            
            extracted_metadata = {
                "patient_name": str(ds.get('PatientName', '')).replace('^', ' ').strip(),
                "patient_id_dicom": str(ds.get('PatientID', '')),
                "patient_birth_date": str(ds.get('PatientBirthDate', '')),
                "patient_sex": str(ds.get('PatientSex', '')),
                "study_description": str(ds.get('StudyDescription', '')),
                "modality": str(ds.get('Modality', '')),
                "body_part": str(ds.get('BodyPartExamined', '')),
                "study_date": str(ds.get('StudyDate', ''))
            }
            
            os.remove(temp_path)
            
        except Exception as e:
            print(f"Error extracting DICOM metadata: {e}")
    
    if not patient_id and extracted_metadata.get('patient_id_dicom'):
        patient_id = extracted_metadata['patient_id_dicom']
    
    if not patient_id:
        patient_id = f"PAT{str(uuid.uuid4().int)[:6]}"
    
    if not first_name and not last_name and extracted_metadata.get('patient_name'):
        name_parts = extracted_metadata['patient_name'].split(' ')
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
        elif len(name_parts) == 1:
            first_name = name_parts[0]
            last_name = "Unknown"
    
    if not gender and extracted_metadata.get('patient_sex'):
        gender = 'M' if extracted_metadata['patient_sex'].upper() == 'M' else 'F' if extracted_metadata['patient_sex'].upper() == 'F' else 'O'
    
    if not study_description and extracted_metadata.get('study_description'):
        study_description = extracted_metadata['study_description']
    
    if not first_name:
        first_name = "Unknown"
    if not last_name:
        last_name = "Patient"
    
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        patient_data = {
            "patient_id": patient_id,
            "first_name": first_name,
            "last_name": last_name,
            "gender": gender,
            "phone": phone,
            "email": email,
            "address": address
        }
        
        if date_of_birth:
            try:
                patient_data["date_of_birth"] = datetime.fromisoformat(date_of_birth)
            except ValueError:
                pass
        elif extracted_metadata.get('patient_birth_date'):
            try:
                birth_date_str = extracted_metadata['patient_birth_date']
                if len(birth_date_str) == 8:  # YYYYMMDD format
                    patient_data["date_of_birth"] = datetime.strptime(birth_date_str, '%Y%m%d')
            except ValueError:
                pass
        
        patient = Patient(**patient_data)
        db.add(patient)
        db.commit()
        db.refresh(patient)
    
    study_uid = str(uuid.uuid4())
    
    study = Study(
        study_uid=study_uid,
        patient_id=patient.id,
        diagnostic_center_id=current_user.diagnostic_center_id,
        uploaded_by_id=current_user.id,
        study_description=study_description,
        study_date=datetime.now(),
        modality=extracted_metadata.get('modality'),
        body_part=extracted_metadata.get('body_part'),
        status=StudyStatus.QUEUED
    )
    db.add(study)
    db.commit()
    db.refresh(study)
    
    study_dir = os.path.join(UPLOAD_DIR, study_uid)
    os.makedirs(study_dir, exist_ok=True)
    
    for file in files:
        if file.filename and file.filename.lower().endswith('.dcm'):
            file_path = os.path.join(study_dir, file.filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            try:
                ds = pydicom.dcmread(file_path, force=True)
                
                if not hasattr(ds, 'file_meta') or not ds.file_meta:
                    ds.file_meta = pydicom.Dataset()
                
                if 'TransferSyntaxUID' not in ds.file_meta:
                    ds.file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian
                if 'MediaStorageSOPClassUID' not in ds.file_meta:
                    ds.file_meta.MediaStorageSOPClassUID = ds.get('SOPClassUID', '1.2.840.10008.5.1.4.1.1.2')
                if 'MediaStorageSOPInstanceUID' not in ds.file_meta:
                    ds.file_meta.MediaStorageSOPInstanceUID = ds.get('SOPInstanceUID', str(uuid.uuid4()))
                if 'ImplementationClassUID' not in ds.file_meta:
                    ds.file_meta.ImplementationClassUID = '1.2.840.10008.1.2.1'
                if 'ImplementationVersionName' not in ds.file_meta:
                    ds.file_meta.ImplementationVersionName = 'PACS_SYSTEM_1.0'
                
                ds.save_as(file_path, write_like_original=False)
                
                dicom_file = DicomFile(
                    study_id=study.id,
                    series_uid=str(ds.get('SeriesInstanceUID', '')),
                    instance_uid=str(ds.get('SOPInstanceUID', '')),
                    file_path=file_path,
                    file_size=os.path.getsize(file_path),
                    slice_number=int(ds.get('InstanceNumber', 0)) if ds.get('InstanceNumber') else None,
                    patient_name=str(ds.get('PatientName', '')),
                    patient_id_dicom=str(ds.get('PatientID', '')),
                    study_date_dicom=str(ds.get('StudyDate', '')),
                    modality_dicom=str(ds.get('Modality', '')),
                    body_part_dicom=str(ds.get('BodyPartExamined', ''))
                )
                
                if not study.modality:
                    study.modality = dicom_file.modality_dicom
                if not study.body_part:
                    study.body_part = dicom_file.body_part_dicom
                
                db.add(dicom_file)
                
            except Exception as e:
                print(f"Error processing DICOM file {file.filename}: {e}")
    
    db.commit()
    db.refresh(study)
    
    try:
        from ..ai_service import ai_service
        ai_report = ai_service.generate_report(
            modality=study.modality or "Unknown",
            body_part=study.body_part or "Unknown", 
            study_description=study.study_description or "",
            dicom_path=study_dir if files else None
        )
        study.ai_report = str(ai_report)
        study.status = StudyStatus.PROCESSING
        db.commit()
        
    except Exception as e:
        print(f"Failed to generate AI report: {e}")
    
    try:
        from ..celery_app import process_dicom_study_async
        process_dicom_study_async.delay(study.id)
    except Exception as e:
        print(f"Background processing unavailable: {e}")
    
    return study

@router.get("/", response_model=List[schemas.Study])
async def get_studies(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[StudyStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Study)
    
    if current_user.role == UserRole.TECHNICIAN:
        query = query.filter(Study.uploaded_by_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        query = query.filter(
            (Study.diagnostic_center_id == current_user.diagnostic_center_id) |
            (Study.assigned_doctor_id == current_user.id)
        )
    elif current_user.role == UserRole.RADIOLOGIST:
        query = query.filter(Study.diagnostic_center_id == current_user.diagnostic_center_id)
    elif current_user.role in [UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        query = query.filter(Study.diagnostic_center_id == current_user.diagnostic_center_id)
    
    if status_filter:
        query = query.filter(Study.status == status_filter)
    
    studies = query.offset(skip).limit(limit).all()
    return studies

@router.get("/pending")
async def get_pending_studies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending studies with center and technician information"""
    
    if current_user.role not in [UserRole.RADIOLOGIST, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only radiologists and admins can view pending studies")
    
    studies = db.query(Study).filter(
        Study.status.in_([StudyStatus.QUEUED, StudyStatus.PROCESSING])
    ).all()
    
    enriched_studies = []
    for study in studies:
        patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
        
        center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == study.diagnostic_center_id).first()
        
        technician = db.query(User).filter(User.id == study.uploaded_by_id).first()
        
        study_dict = {
            "id": study.id,
            "study_uid": study.study_uid,
            "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            "patient_id_display": patient.patient_id if patient else "Unknown",
            "modality": study.modality,
            "body_part": study.body_part,
            "study_description": study.study_description,
            "status": study.status,
            "created_at": study.created_at,
            "center_name": center.name if center else "Unknown Center",
            "technician_name": technician.full_name if technician else "Unknown Technician",
            "priority": getattr(study, 'priority', 'normal')
        }
        enriched_studies.append(study_dict)
    
    return enriched_studies

@router.get("/{study_id}", response_model=schemas.Study)
async def get_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from ..error_handlers import NotFoundError, AuthorizationError
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise NotFoundError("Study", study_id)
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    elif current_user.role in [UserRole.DOCTOR, UserRole.TECHNICIAN, UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise AuthorizationError(
            message="Access denied to study",
            details={
                "study_id": study_id,
                "user_role": current_user.role.value,
                "user_diagnostic_center": current_user.diagnostic_center_id,
                "study_diagnostic_center": study.diagnostic_center_id
            }
        )
    
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
    if patient:
        study.patient_name = f"{patient.first_name} {patient.last_name}"
        study.patient_id_display = patient.patient_id
    
    dicom_files = db.query(DicomFile).filter(DicomFile.study_id == study.id).all()
    study.dicom_files = dicom_files
    
    return study

@router.put("/{study_id}/assign")
async def assign_study(
    study_id: int,
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    if current_user.role not in [UserRole.DIAGNOSTIC_CENTER_ADMIN, UserRole.DOCTOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if study.diagnostic_center_id != current_user.diagnostic_center_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    study.assigned_doctor_id = doctor_id
    study.status = StudyStatus.ASSIGNED
    db.commit()
    
    return {"message": "Study assigned successfully"}

@router.put("/{study_id}/report")
async def update_report(
    study_id: int,
    report_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    if current_user.role == UserRole.DOCTOR:
        study.doctor_report = report_data.get("report", "")
        study.status = StudyStatus.COMPLETED
    elif current_user.role == UserRole.RADIOLOGIST:
        study.radiologist_report = report_data.get("report", "")
        study.final_report = report_data.get("final_report", "")
        study.status = StudyStatus.REVIEWED
    
    db.commit()
    return {"message": "Report updated successfully"}

@router.get("/dicom/files/{file_id}")
async def get_dicom_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dicom_file = db.query(DicomFile).filter(DicomFile.id == file_id).first()
    if not dicom_file:
        raise HTTPException(status_code=404, detail="DICOM file not found")
    
    study = db.query(Study).filter(Study.id == dicom_file.study_id).first()
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
    
    if not os.path.exists(dicom_file.file_path):
        raise HTTPException(status_code=404, detail="DICOM file not found on disk")
    
    return FileResponse(
        path=dicom_file.file_path,
        media_type="application/dicom",
        filename=f"dicom_{file_id}.dcm"
    )

@router.delete("/{study_id}")
async def delete_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete studies")
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    # Prepare audit log details before deletion
    audit_details = {
        "study_id": study.id,
        "study_uid": study.study_uid,
        "patient_id": study.patient.patient_id if study.patient else None,
        "study_description": study.study_description,
        "modality": study.modality,
        "study_date": study.study_date.isoformat() if study.study_date else None,
        "diagnostic_center_id": study.diagnostic_center_id,
        "files_count": len(study.dicom_files)
    }
    
    # Anonymize PHI data for audit log
    anonymized_details = anonymize_phi(audit_details)
    
    dicom_files = db.query(DicomFile).filter(DicomFile.study_id == study_id).all()
    for dicom_file in dicom_files:
        if os.path.exists(dicom_file.file_path):
            os.remove(dicom_file.file_path)
        db.delete(dicom_file)
    
    db.delete(study)
    
    # Log the deletion action
    log_audit_event(
        db=db,
        action="STUDY_DELETED",
        user=current_user,
        resource_type="study",
        resource_id=str(study_id),
        details=anonymized_details
    )
    
    db.commit()
    
    return {"message": "Study deleted successfully"}

@router.post("/deletion-requests", response_model=schemas.DeletionRequest)
async def create_deletion_request(
    request_data: schemas.DeletionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.TECHNICIAN, UserRole.DOCTOR]:
        raise HTTPException(status_code=403, detail="Only technicians and doctors can request deletions")
    
    study = db.query(Study).filter(Study.id == request_data.study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    deletion_request = DeletionRequest(
        study_id=request_data.study_id,
        requested_by_id=current_user.id,
        reason=request_data.reason
    )
    db.add(deletion_request)
    db.commit()
    db.refresh(deletion_request)
    
    return deletion_request

@router.get("/deletion-requests", response_model=List[schemas.DeletionRequest])
async def get_deletion_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view deletion requests")
    
    try:
        requests = db.query(DeletionRequest).all()
        if not requests:
            return []
        
        result = []
        for req in requests:
            result.append({
                "id": req.id,
                "study_id": req.study_id,
                "reason": req.reason,
                "requested_by_id": req.requested_by_id,
                "status": req.status,
                "approved_by_id": req.approved_by_id,
                "approved_at": req.approved_at.isoformat() if req.approved_at else None,
                "created_at": req.created_at.isoformat() if req.created_at else None
            })
        return result
    except Exception as e:
        print(f"Error fetching deletion requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch deletion requests")

@router.put("/deletion-requests/{request_id}/approve")
async def approve_deletion_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can approve deletion requests")
    
    deletion_request = db.query(DeletionRequest).filter(DeletionRequest.id == request_id).first()
    if not deletion_request:
        raise HTTPException(status_code=404, detail="Deletion request not found")
    
    deletion_request.status = "approved"
    deletion_request.approved_by_id = current_user.id
    deletion_request.approved_at = datetime.now()
    db.commit()
    
    return {"message": "Deletion request approved"}

@router.put("/deletion-requests/{request_id}/reject")
async def reject_deletion_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can reject deletion requests")
    
    deletion_request = db.query(DeletionRequest).filter(DeletionRequest.id == request_id).first()
    if not deletion_request:
        raise HTTPException(status_code=404, detail="Deletion request not found")
    
    deletion_request.status = "rejected"
    deletion_request.approved_by_id = current_user.id
    deletion_request.approved_at = datetime.now()
    db.commit()
    
    return {"message": "Deletion request rejected"}


@router.put("/{study_id}/assign-to-self")
async def assign_study_to_self(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allow radiologist to assign study to themselves"""
    
    if current_user.role != UserRole.RADIOLOGIST:
        raise HTTPException(status_code=403, detail="Only radiologists can assign studies to themselves")
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    if study.radiologist_id:
        raise HTTPException(status_code=400, detail="Study already assigned to a radiologist")
    
    study.radiologist_id = current_user.id
    study.status = StudyStatus.ASSIGNED
    db.commit()
    
    return {"message": "Study assigned successfully"}

@router.get("/{study_id}/status")
async def get_study_status(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed status information for a study"""
    
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
    
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
    center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == study.diagnostic_center_id).first()
    technician = db.query(User).filter(User.id == study.uploaded_by_id).first()
    radiologist = db.query(User).filter(User.id == study.radiologist_id).first() if study.radiologist_id else None
    
    status_info = {
        "study_id": study.id,
        "status": study.status,
        "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
        "center_name": center.name if center else "Unknown",
        "uploaded_by": technician.full_name if technician else "Unknown",
        "assigned_radiologist": radiologist.full_name if radiologist else None,
        "created_at": study.created_at,
        "updated_at": study.updated_at,
        "timeline": [
            {"stage": "Uploaded", "status": "completed", "timestamp": study.created_at},
            {"stage": "Queued", "status": "completed" if study.status != StudyStatus.QUEUED else "current", "timestamp": study.created_at},
            {"stage": "Processing", "status": "completed" if study.status not in [StudyStatus.QUEUED, StudyStatus.PROCESSING] else "current" if study.status == StudyStatus.PROCESSING else "pending", "timestamp": None},
            {"stage": "Report Generated", "status": "completed" if study.status in [StudyStatus.COMPLETED, StudyStatus.REVIEWED] else "pending", "timestamp": None}
        ]
    }
    
    return status_info

@router.put("/{study_id}/report")
async def update_report(
    study_id: int,
    report_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update radiologist report for a study"""
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = True
    elif current_user.role == UserRole.DOCTOR:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    import json
    report_content = {
        "findings": report_data.get("findings", ""),
        "impression": report_data.get("impression", ""),
        "content": report_data.get("content", ""),
        "status": report_data.get("status", "draft"),
        "updated_by": current_user.id,
        "updated_at": datetime.now().isoformat()
    }
    
    study.radiologist_report = json.dumps(report_content)
    if report_data.get("status") == "final":
        study.status = StudyStatus.COMPLETED
    
    db.commit()
    
    return {"message": "Report updated successfully"}

@router.get("/{study_id}/report/pdf")
async def download_report_pdf(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and download PDF report"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from io import BytesIO
    import json
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = True
    elif current_user.role in [UserRole.DOCTOR, UserRole.TECHNICIAN]:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, height - 50, "MEDICAL IMAGING REPORT")
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, height - 100, "PATIENT INFORMATION")
    p.setFont("Helvetica", 10)
    p.drawString(50, height - 120, f"Name: {patient.first_name} {patient.last_name}")
    p.drawString(50, height - 135, f"Patient ID: {patient.patient_id}")
    p.drawString(50, height - 150, f"Date of Birth: {patient.date_of_birth}")
    p.drawString(50, height - 165, f"Gender: {patient.gender}")
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, height - 200, "STUDY INFORMATION")
    p.setFont("Helvetica", 10)
    p.drawString(50, height - 220, f"Study Date: {study.study_date}")
    p.drawString(50, height - 235, f"Modality: {study.modality}")
    p.drawString(50, height - 250, f"Body Part: {study.body_part}")
    p.drawString(50, height - 265, f"Description: {study.study_description}")
    
    if study.radiologist_report:
        try:
            report = json.loads(study.radiologist_report)
            
            p.setFont("Helvetica-Bold", 12)
            p.drawString(50, height - 300, "FINDINGS")
            p.setFont("Helvetica", 10)
            
            y_position = height - 320
            findings_text = report.get("findings", "")
            for line in findings_text.split('\n'):
                if y_position < 100:
                    p.showPage()
                    y_position = height - 50
                p.drawString(50, y_position, line[:80])
                y_position -= 15
            
            p.setFont("Helvetica-Bold", 12)
            p.drawString(50, y_position - 20, "IMPRESSION")
            p.setFont("Helvetica", 10)
            
            y_position -= 40
            impression_text = report.get("impression", "")
            for line in impression_text.split('\n'):
                if y_position < 100:
                    p.showPage()
                    y_position = height - 50
                p.drawString(50, y_position, line[:80])
                y_position -= 15
        except:
            p.setFont("Helvetica", 10)
            p.drawString(50, height - 300, "Report content not available")
    
    p.setFont("Helvetica", 8)
    p.drawString(50, 50, f"Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    p.drawString(50, 35, f"Radiologist: {current_user.full_name}")
    
    p.save()
    buffer.seek(0)
    
    return StreamingResponse(
        BytesIO(buffer.read()),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{study_id}.pdf"}
    )

@router.post("/{study_id}/share")
async def share_report_with_patient(
    study_id: int,
    share_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Share report with patient via email"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import secrets
    
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = True
    elif current_user.role == UserRole.DOCTOR:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
    patient_email = share_data.get("email")
    
    if not patient_email:
        raise HTTPException(status_code=400, detail="Patient email is required")
    
    share_token = secrets.token_urlsafe(32)
    
    try:
        msg = MIMEMultipart()
        msg['From'] = "noreply@pacsystem.com"
        msg['To'] = patient_email
        msg['Subject'] = f"Medical Report Available - {patient.first_name} {patient.last_name}"
        
        body = f"""
        Dear {patient.first_name} {patient.last_name},
        
        Your medical imaging report is now available for review.
        
        Study Details:
        - Date: {study.study_date}
        - Type: {study.modality} {study.body_part}
        - Description: {study.study_description}
        
        Please contact your healthcare provider if you have any questions about your report.
        
        Best regards,
        Medical Imaging Department
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        return {"message": "Report shared successfully", "share_token": share_token}
        
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
