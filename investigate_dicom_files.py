#!/usr/bin/env python3
"""
Investigate DICOM files in the database and uploads directory
"""

import sys
import os
sys.path.append('/home/ubuntu/pacs-system/pacs-backend')

from app.database import SessionLocal, Study, DicomFile, Patient

def investigate_dicom_files():
    """Investigate DICOM files in database and filesystem"""
    db = SessionLocal()
    try:
        print('📊 Database Analysis:')
        studies = db.query(Study).all()
        dicom_files = db.query(DicomFile).all()
        patients = db.query(Patient).all()
        
        print(f'Patients: {len(patients)}')
        print(f'Studies: {len(studies)}')
        print(f'DICOM files: {len(dicom_files)}')
        
        print(f'\n📋 Study Details:')
        for study in studies:
            print(f'Study {study.id}: {study.study_description or "No description"}')
            print(f'  Patient ID: {study.patient_id}')
            print(f'  Study UID: {study.study_uid}')
            print(f'  Status: {study.status}')
            print(f'  Modality: {study.modality}')
            
        print(f'\n📄 DICOM File Details:')
        for file in dicom_files:
            print(f'File {file.id}:')
            print(f'  Path: {file.file_path}')
            print(f'  Size: {file.file_size} bytes')
            print(f'  Exists: {os.path.exists(file.file_path)}')
            print(f'  Modality: {file.modality_dicom}')
            print(f'  Patient Name: {file.patient_name}')
            
            if os.path.exists(file.file_path):
                actual_size = os.path.getsize(file.file_path)
                print(f'  Actual size: {actual_size} bytes')
                
                try:
                    with open(file.file_path, 'rb') as f:
                        header = f.read(132)
                        if len(header) >= 132 and header[128:132] == b'DICM':
                            print(f'  ✅ Valid DICOM header found')
                        else:
                            print(f'  ❌ Missing DICM header')
                            print(f'  Header preview: {header[:50]}')
                except Exception as e:
                    print(f'  ❌ Cannot read file: {e}')
            print('')
            
    finally:
        db.close()

if __name__ == "__main__":
    investigate_dicom_files()
