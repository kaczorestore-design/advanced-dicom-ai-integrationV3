from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./pacs.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class UserRole(enum.Enum):
    ADMIN = "admin"
    DIAGNOSTIC_CENTER_ADMIN = "diagnostic_center_admin"
    DOCTOR = "doctor"
    TECHNICIAN = "technician"
    RADIOLOGIST = "radiologist"

class StudyStatus(enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    UPLOADED = "uploaded"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEWED = "reviewed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    diagnostic_center_id = Column(Integer, ForeignKey("diagnostic_centers.id"), nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    mfa_backup_codes = Column(Text, nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    diagnostic_center = relationship("DiagnosticCenter", back_populates="users")
    uploaded_studies = relationship("Study", foreign_keys="Study.uploaded_by_id", back_populates="uploaded_by")
    assigned_studies = relationship("Study", foreign_keys="Study.assigned_doctor_id", back_populates="assigned_doctor")
    radiologist_studies = relationship("Study", foreign_keys="Study.radiologist_id", back_populates="radiologist")

class DiagnosticCenter(Base):
    __tablename__ = "diagnostic_centers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(Text)
    phone = Column(String)
    email = Column(String)
    is_active = Column(Boolean, default=True)
    storage_quota_gb = Column(Integer, default=100)
    storage_used_gb = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    users = relationship("User", back_populates="diagnostic_center")
    studies = relationship("Study", back_populates="diagnostic_center")

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(DateTime)
    gender = Column(String)
    phone = Column(String)
    email = Column(String)
    address = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    studies = relationship("Study", back_populates="patient")

class Study(Base):
    __tablename__ = "studies"
    
    id = Column(Integer, primary_key=True, index=True)
    study_uid = Column(String, unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    diagnostic_center_id = Column(Integer, ForeignKey("diagnostic_centers.id"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    radiologist_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    study_date = Column(DateTime)
    modality = Column(String)
    body_part = Column(String)
    study_description = Column(Text)
    priority = Column(String, default="normal")
    status = Column(Enum(StudyStatus), default=StudyStatus.UPLOADED)
    
    ai_report = Column(Text)
    doctor_report = Column(Text)
    radiologist_report = Column(Text)
    final_report = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    patient = relationship("Patient", back_populates="studies")
    diagnostic_center = relationship("DiagnosticCenter", back_populates="studies")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id], back_populates="uploaded_studies")
    assigned_doctor = relationship("User", foreign_keys=[assigned_doctor_id], back_populates="assigned_studies")
    radiologist = relationship("User", foreign_keys=[radiologist_id], back_populates="radiologist_studies")
    dicom_files = relationship("DicomFile", back_populates="study")
    annotations = relationship("Annotation", back_populates="study")

class DicomFile(Base):
    __tablename__ = "dicom_files"
    
    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id"), nullable=False)
    series_uid = Column(String, nullable=False)
    instance_uid = Column(String, unique=True, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    slice_number = Column(Integer)
    
    patient_name = Column(String)
    patient_id_dicom = Column(String)
    study_date_dicom = Column(String)
    modality_dicom = Column(String)
    body_part_dicom = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    study = relationship("Study", back_populates="dicom_files")

class Annotation(Base):
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    annotation_type = Column(String)  # measurement, roi, text, etc.
    annotation_data = Column(Text)  # JSON data for coordinates, measurements, etc.
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    study = relationship("Study", back_populates="annotations")
    user = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    auto_backup = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    maintenance_mode = Column(Boolean, default=False)
    max_upload_size = Column(Integer, default=100)
    session_timeout = Column(Integer, default=30)
    audit_log_retention = Column(Integer, default=90)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DeletionRequest(Base):
    __tablename__ = "deletion_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id"), nullable=False)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String, default="pending")
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    study = relationship("Study")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
