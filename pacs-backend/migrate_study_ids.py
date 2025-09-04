#!/usr/bin/env python3
"""
Migration script to convert existing integer study IDs to 8-digit alphanumeric format.
This script recreates the database with the new schema.
"""

import sys
import os
import shutil
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import Base, engine
from app.utils import generate_study_id

def backup_database():
    """Create a backup of the current database."""
    db_path = "pacs.db"
    backup_path = f"pacs_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    if os.path.exists(db_path):
        shutil.copy2(db_path, backup_path)
        print(f"Database backed up to: {backup_path}")
        return backup_path
    return None

def migrate_study_ids():
    """
    Migrate existing integer study IDs to 8-digit alphanumeric format.
    """
    print("Starting study ID migration...")
    
    # Create backup
    backup_path = backup_database()
    
    try:
        # Create a temporary engine to read old data
        old_engine = create_engine("sqlite:///pacs.db")
        OldSession = sessionmaker(bind=old_engine)
        old_db = OldSession()
        
        # Read existing data
        print("Reading existing data...")
        
        # Get all studies
        studies_result = old_db.execute(text("""
            SELECT id, study_uid, patient_id, diagnostic_center_id, uploaded_by_id, 
                   assigned_doctor_id, radiologist_id, study_date, modality, body_part, 
                   study_description, priority, status, ai_report, doctor_report, 
                   radiologist_report, final_report, created_at, updated_at
            FROM studies ORDER BY id
        """))
        studies_data = studies_result.fetchall()
        
        # Get all dicom files
        dicom_files_result = old_db.execute(text("""
            SELECT id, study_id, series_uid, instance_uid, file_path, file_size, 
                   slice_number, patient_name, patient_id_dicom, study_date_dicom, 
                   modality_dicom, body_part_dicom, created_at
            FROM dicom_files ORDER BY id
        """))
        dicom_files_data = dicom_files_result.fetchall()
        
        # Get all annotations
        annotations_result = old_db.execute(text("""
            SELECT id, study_id, user_id, annotation_type, annotation_data, notes, created_at
            FROM annotations ORDER BY id
        """))
        annotations_data = annotations_result.fetchall()
        
        old_db.close()
        old_engine.dispose()
        
        if not studies_data:
            print("No studies found to migrate.")
            return
            
        print(f"Found {len(studies_data)} studies, {len(dicom_files_data)} DICOM files, {len(annotations_data)} annotations to migrate.")
        
        # Create mapping of old study IDs to new study IDs
        id_mapping = {}
        for study in studies_data:
            old_id = study[0]
            new_id = generate_study_id()
            id_mapping[old_id] = new_id
            print(f"Mapping study ID {old_id} -> {new_id}")
        
        # Remove old database and recreate with new schema
        print("Recreating database with new schema...")
        if os.path.exists("pacs.db"):
            os.remove("pacs.db")
        
        # Create new database with updated schema
        Base.metadata.create_all(bind=engine)
        
        # Create new session
        from app.database import SessionLocal
        new_db = SessionLocal()
        
        try:
            # Insert studies with new IDs
            print("Inserting studies with new IDs...")
            for study in studies_data:
                old_id = study[0]
                new_id = id_mapping[old_id]
                
                new_db.execute(text("""
                    INSERT INTO studies (id, study_uid, patient_id, diagnostic_center_id, 
                                       uploaded_by_id, assigned_doctor_id, radiologist_id, 
                                       study_date, modality, body_part, study_description, 
                                       priority, status, ai_report, doctor_report, 
                                       radiologist_report, final_report, created_at, updated_at)
                    VALUES (:id, :study_uid, :patient_id, :diagnostic_center_id, 
                           :uploaded_by_id, :assigned_doctor_id, :radiologist_id, 
                           :study_date, :modality, :body_part, :study_description, 
                           :priority, :status, :ai_report, :doctor_report, 
                           :radiologist_report, :final_report, :created_at, :updated_at)
                """), {
                    "id": new_id,
                    "study_uid": study[1],
                    "patient_id": study[2],
                    "diagnostic_center_id": study[3],
                    "uploaded_by_id": study[4],
                    "assigned_doctor_id": study[5],
                    "radiologist_id": study[6],
                    "study_date": study[7],
                    "modality": study[8],
                    "body_part": study[9],
                    "study_description": study[10],
                    "priority": study[11],
                    "status": study[12],
                    "ai_report": study[13],
                    "doctor_report": study[14],
                    "radiologist_report": study[15],
                    "final_report": study[16],
                    "created_at": study[17],
                    "updated_at": study[18]
                })
            
            # Insert DICOM files with updated study IDs
            print("Inserting DICOM files with updated study IDs...")
            for dicom_file in dicom_files_data:
                old_study_id = dicom_file[1]
                new_study_id = id_mapping[old_study_id]
                
                new_db.execute(text("""
                    INSERT INTO dicom_files (id, study_id, series_uid, instance_uid, file_path, 
                                            file_size, slice_number, patient_name, patient_id_dicom, 
                                            study_date_dicom, modality_dicom, body_part_dicom, created_at)
                    VALUES (:id, :study_id, :series_uid, :instance_uid, :file_path, 
                           :file_size, :slice_number, :patient_name, :patient_id_dicom, 
                           :study_date_dicom, :modality_dicom, :body_part_dicom, :created_at)
                """), {
                    "id": dicom_file[0],
                    "study_id": new_study_id,
                    "series_uid": dicom_file[2],
                    "instance_uid": dicom_file[3],
                    "file_path": dicom_file[4],
                    "file_size": dicom_file[5],
                    "slice_number": dicom_file[6],
                    "patient_name": dicom_file[7],
                    "patient_id_dicom": dicom_file[8],
                    "study_date_dicom": dicom_file[9],
                    "modality_dicom": dicom_file[10],
                    "body_part_dicom": dicom_file[11],
                    "created_at": dicom_file[12]
                })
            
            # Insert annotations with updated study IDs
            print("Inserting annotations with updated study IDs...")
            for annotation in annotations_data:
                old_study_id = annotation[1]
                new_study_id = id_mapping[old_study_id]
                
                new_db.execute(text("""
                    INSERT INTO annotations (id, study_id, user_id, annotation_type, 
                                            annotation_data, notes, created_at)
                    VALUES (:id, :study_id, :user_id, :annotation_type, 
                           :annotation_data, :notes, :created_at)
                """), {
                    "id": annotation[0],
                    "study_id": new_study_id,
                    "user_id": annotation[2],
                    "annotation_type": annotation[3],
                    "annotation_data": annotation[4],
                    "notes": annotation[5],
                    "created_at": annotation[6]
                })
            
            # Commit all changes
            new_db.commit()
            print("Migration completed successfully!")
            
            # Verify the migration
            print("Verifying migration...")
            result = new_db.execute(text("SELECT id FROM studies"))
            new_studies = result.fetchall()
            
            for study in new_studies:
                study_id = study[0]
                if len(study_id) == 8 and study_id.replace('_', '').replace('-', '').isalnum():
                    print(f"✓ Study ID {study_id} is valid")
                else:
                    print(f"✗ Study ID {study_id} might be invalid")
                    
        except Exception as e:
            new_db.rollback()
            raise e
        finally:
            new_db.close()
            
    except Exception as e:
        print(f"Migration failed: {e}")
        # Restore backup if migration failed
        if backup_path and os.path.exists(backup_path):
            if os.path.exists("pacs.db"):
                os.remove("pacs.db")
            shutil.copy2(backup_path, "pacs.db")
            print(f"Database restored from backup: {backup_path}")
        raise

if __name__ == "__main__":
    try:
        migrate_study_ids()
        print("\nMigration completed successfully!")
        print("You can now restart the backend server.")
    except Exception as e:
        print(f"\nMigration failed: {e}")
        sys.exit(1)