from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .database import UserRole, StudyStatus


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: UserRole
    diagnostic_center_id: Optional[int] = None
    medical_license_number: Optional[str] = None
    board_certification: Optional[str] = None
    certification_expiry: Optional[datetime] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    diagnostic_center_id: Optional[int] = None
    medical_license_number: Optional[str] = None
    board_certification: Optional[str] = None
    certification_expiry: Optional[datetime] = None


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DiagnosticCenterBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class DiagnosticCenterCreate(DiagnosticCenterBase):
    pass


class DiagnosticCenterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    storage_quota_gb: Optional[int] = None
    storage_used_gb: Optional[int] = None


class DiagnosticCenter(DiagnosticCenterBase):
    id: int
    is_active: bool
    storage_quota_gb: Optional[int] = None
    storage_used_gb: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PatientBase(BaseModel):
    patient_id: str
    first_name: str
    last_name: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class Patient(PatientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StudyBase(BaseModel):
    study_uid: str
    patient_id: int
    diagnostic_center_id: int
    study_date: Optional[datetime] = None
    modality: Optional[str] = None
    body_part: Optional[str] = None
    study_description: Optional[str] = None
    priority: Optional[str] = "normal"


class StudyCreate(StudyBase):
    pass


class StudyUpdate(BaseModel):
    assigned_doctor_id: Optional[int] = None
    radiologist_id: Optional[int] = None
    status: Optional[StudyStatus] = None
    priority: Optional[str] = None
    ai_report: Optional[str] = None
    doctor_report: Optional[str] = None
    radiologist_report: Optional[str] = None
    final_report: Optional[str] = None


class Study(StudyBase):
    id: str
    uploaded_by_id: int
    assigned_doctor_id: Optional[int] = None
    radiologist_id: Optional[int] = None
    status: StudyStatus
    ai_report: Optional[str] = None
    doctor_report: Optional[str] = None
    radiologist_report: Optional[str] = None
    final_report: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    patient_name: Optional[str] = None
    patient_id_display: Optional[str] = None
    dicom_files: Optional[List["DicomFile"]] = None

    patient: Optional[Patient] = None
    diagnostic_center: Optional[DiagnosticCenter] = None
    uploaded_by: Optional[User] = None
    assigned_doctor: Optional[User] = None
    radiologist: Optional[User] = None

    class Config:
        from_attributes = True


class DicomFileBase(BaseModel):
    series_uid: str
    instance_uid: str
    file_path: str
    file_size: Optional[int] = None
    slice_number: Optional[int] = None
    patient_name: Optional[str] = None
    patient_id_dicom: Optional[str] = None
    study_date_dicom: Optional[str] = None
    modality_dicom: Optional[str] = None
    body_part_dicom: Optional[str] = None


class DicomFileCreate(DicomFileBase):
    study_id: str


class DicomFile(DicomFileBase):
    id: int
    study_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnnotationBase(BaseModel):
    annotation_type: str
    annotation_data: str
    notes: Optional[str] = None


class AnnotationCreate(AnnotationBase):
    study_id: str


class Annotation(AnnotationBase):
    id: int
    study_id: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AIReport(BaseModel):
    findings: List[str]
    impression: str
    confidence: float
    pathology_scores: Optional[dict] = None
    abnormal_findings: Optional[List[str]] = None
    ai_model: Optional[str] = None
    analysis_type: Optional[str] = None


class AIAnalysisRequest(BaseModel):
    study_id: str
    modality: str
    body_part: str
    dicom_path: Optional[str] = None


class AIAnalysisResponse(BaseModel):
    study_id: str
    analysis_results: AIReport
    processing_time: float
    timestamp: datetime


class DeletionRequestBase(BaseModel):
    study_id: str
    reason: str


class DeletionRequestCreate(DeletionRequestBase):
    pass


class DeletionRequestUpdate(BaseModel):
    status: str
    approved_by_id: Optional[int] = None


class DeletionRequest(DeletionRequestBase):
    id: int
    requested_by_id: int
    status: str
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SystemSettingsBase(BaseModel):
    auto_backup: bool = True
    email_notifications: bool = True
    maintenance_mode: bool = False
    max_upload_size: int = 100
    session_timeout: int = 30
    audit_log_retention: int = 90


class SystemSettingsUpdate(SystemSettingsBase):
    pass


class SystemSettings(SystemSettingsBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
