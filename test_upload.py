#!/usr/bin/env python3
"""
Test DICOM upload functionality
"""

import requests
import os

def test_dicom_upload():
    """Test uploading a DICOM file through the API"""
    
    # Login as technician
    login_data = {"username": "tech1", "password": "tech123"}
    response = requests.post("http://localhost:8000/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
    
    token = response.json()["access_token"]
    print(f"✅ Got auth token: {token[:20]}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Prepare upload data
    dicom_file_path = "test_dicom/test_ct.dcm"
    if not os.path.exists(dicom_file_path):
        print(f"❌ DICOM file not found: {dicom_file_path}")
        return False
    
    # Upload form data
    form_data = {
        "patient_id": "TEST001",
        "first_name": "Test",
        "last_name": "Patient",
        "date_of_birth": "1990-01-01",
        "gender": "M",
        "study_description": "Test Upload",
        "priority": "normal"
    }
    
    # Upload file
    with open(dicom_file_path, "rb") as f:
        files = {"files": ("test_ct.dcm", f, "application/dicom")}
        
        print(f"📤 Uploading DICOM file: {dicom_file_path}")
        response = requests.post(
            "http://localhost:8000/studies/upload",
            headers=headers,
            data=form_data,
            files=files
        )
    
    print(f"\n📡 Upload Response:")
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Upload successful!")
        print(f"Study ID: {result.get('id')}")
        print(f"Study UID: {result.get('study_uid')}")
        print(f"Patient: {result.get('patient', {}).get('first_name')} {result.get('patient', {}).get('last_name')}")
        print(f"Files uploaded: {len(result.get('dicom_files', []))}")
        return True
    else:
        print(f"❌ Upload failed: {response.text}")
        return False

if __name__ == "__main__":
    success = test_dicom_upload()
    if success:
        print("\n🎉 DICOM upload test completed successfully!")
    else:
        print("\n💥 DICOM upload test failed!")