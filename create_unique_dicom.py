#!/usr/bin/env python3
import pydicom
import uuid
from datetime import datetime

def create_unique_dicom():
    """Create a unique DICOM file for testing"""
    
    # Read the existing test DICOM
    try:
        ds = pydicom.dcmread('test_dicom.dcm')
    except Exception as e:
        print(f"❌ Error reading test_dicom.dcm: {e}")
        return False
    
    # Generate unique UIDs
    unique_study_uid = f"1.2.826.0.1.3680043.8.498.{uuid.uuid4().int}"
    unique_series_uid = f"1.2.826.0.1.3680043.8.498.{uuid.uuid4().int}"
    unique_instance_uid = f"1.2.826.0.1.3680043.8.498.{uuid.uuid4().int}"
    
    # Update UIDs
    ds.StudyInstanceUID = unique_study_uid
    ds.SeriesInstanceUID = unique_series_uid
    ds.SOPInstanceUID = unique_instance_uid
    
    # Update patient info to be unique
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    ds.PatientID = f"WF{timestamp}"
    ds.PatientName = f"Workflow^Test^{timestamp}"
    
    # Update study info
    ds.StudyDate = datetime.now().strftime("%Y%m%d")
    ds.StudyTime = datetime.now().strftime("%H%M%S")
    ds.StudyDescription = f"Workflow Test {timestamp}"
    
    # Update file meta if present
    if hasattr(ds, 'file_meta'):
        ds.file_meta.MediaStorageSOPInstanceUID = unique_instance_uid
    
    # Save as unique file
    output_file = f"test_workflow_{timestamp}.dcm"
    ds.save_as(output_file)
    
    print(f"✅ Created unique DICOM file: {output_file}")
    print(f"   Study UID: {unique_study_uid}")
    print(f"   Series UID: {unique_series_uid}")
    print(f"   Instance UID: {unique_instance_uid}")
    print(f"   Patient ID: {ds.PatientID}")
    
    return output_file

if __name__ == '__main__':
    create_unique_dicom()