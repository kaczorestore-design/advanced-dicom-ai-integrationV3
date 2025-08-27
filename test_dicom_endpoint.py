#!/usr/bin/env python3
"""
Test the DICOM file endpoint and analyze the file metadata
"""

import requests
import pydicom
import os

def test_dicom_endpoint():
    """Test DICOM file serving and metadata"""
    
    login_response = requests.post("http://localhost:8000/auth/login", 
                                 json={"username": "admin", "password": "admin123"})
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()["access_token"]
    print(f"✅ Got auth token: {token[:20]}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    dicom_response = requests.get("http://localhost:8000/api/studies/dicom/files/1", 
                                headers=headers)
    
    print(f"\n📡 DICOM Endpoint Response:")
    print(f"Status: {dicom_response.status_code}")
    print(f"Content-Type: {dicom_response.headers.get('content-type')}")
    print(f"Content-Length: {dicom_response.headers.get('content-length')}")
    
    if dicom_response.status_code == 200:
        with open("endpoint_dicom.dcm", "wb") as f:
            f.write(dicom_response.content)
        
        print(f"✅ Downloaded {len(dicom_response.content)} bytes")
        
        try:
            ds = pydicom.dcmread("endpoint_dicom.dcm")
            print(f"\n📋 DICOM Metadata Analysis:")
            print(f"Transfer Syntax UID (0002,0010): {ds.get('TransferSyntaxUID', 'MISSING')}")
            print(f"Media Storage SOP Class UID (0002,0002): {ds.get('MediaStorageSOPClassUID', 'MISSING')}")
            print(f"Media Storage SOP Instance UID (0002,0003): {ds.get('MediaStorageSOPInstanceUID', 'MISSING')}")
            print(f"Implementation Class UID (0002,0012): {ds.get('ImplementationClassUID', 'MISSING')}")
            print(f"Implementation Version Name (0002,0013): {ds.get('ImplementationVersionName', 'MISSING')}")
            
            if hasattr(ds, 'file_meta'):
                print(f"✅ File meta information present")
                print(f"File meta transfer syntax: {ds.file_meta.get('TransferSyntaxUID', 'MISSING')}")
            else:
                print(f"❌ File meta information missing")
                
            print(f"\nPatient Name: {ds.get('PatientName', 'N/A')}")
            print(f"Modality: {ds.get('Modality', 'N/A')}")
            print(f"Study Date: {ds.get('StudyDate', 'N/A')}")
            
        except Exception as e:
            print(f"❌ DICOM parsing error: {e}")
    else:
        print(f"❌ Failed to download DICOM file: {dicom_response.text}")

if __name__ == "__main__":
    test_dicom_endpoint()
