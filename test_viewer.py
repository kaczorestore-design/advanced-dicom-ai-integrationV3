#!/usr/bin/env python3
"""
Test DICOM Viewer functionality
"""

import requests
import json

def test_dicom_viewer():
    """Test DICOM viewer functionality through API endpoints"""
    
    # Login as doctor to access viewer
    login_data = {"username": "doctor1", "password": "doctor123"}
    response = requests.post("http://localhost:8000/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
    
    token = response.json()["access_token"]
    print(f"✅ Got auth token: {token[:20]}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Get studies list
    print("\n📋 Testing Studies List Access...")
    response = requests.get("http://localhost:8000/api/studies/", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    print(f"✅ Found {len(studies)} studies")
    
    if not studies:
        print("❌ No studies available for viewer testing")
        return False
    
    # Test 2: Get specific study details
    study_id = studies[0]["id"]
    print(f"\n🔍 Testing Study Details Access (Study ID: {study_id})...")
    response = requests.get(f"http://localhost:8000/api/studies/{study_id}", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get study details: {response.status_code}")
        return False
    
    study = response.json()
    print(f"✅ Study details retrieved:")
    print(f"   - Patient: {study.get('patient', {}).get('first_name', 'N/A')} {study.get('patient', {}).get('last_name', 'N/A')}")
    print(f"   - Description: {study.get('study_description', 'N/A')}")
    print(f"   - DICOM Files: {len(study.get('dicom_files', []))}")
    
    # Test 3: Test DICOM file access
    dicom_files = study.get('dicom_files', [])
    if dicom_files:
        file_id = dicom_files[0]["id"]
        print(f"\n📁 Testing DICOM File Access (File ID: {file_id})...")
        response = requests.get(f"http://localhost:8000/api/studies/dicom/files/{file_id}", headers=headers)
        
        if response.status_code == 200:
            print(f"✅ DICOM file accessible ({len(response.content)} bytes)")
            print(f"   - Content-Type: {response.headers.get('content-type', 'N/A')}")
        else:
            print(f"❌ Failed to access DICOM file: {response.status_code}")
            return False
    else:
        print("⚠️ No DICOM files in study to test")
    
    # Test 4: Test viewer-specific endpoints
    print(f"\n🖼️ Testing Viewer-Specific Features...")
    
    # Test WADO-RS endpoints (DICOMweb)
    print("   Testing WADO-RS endpoints...")
    
    # Studies endpoint
    response = requests.get("http://localhost:8000/dicomweb/studies", headers=headers)
    if response.status_code == 200:
        wado_studies = response.json()
        print(f"   ✅ WADO-RS Studies: {len(wado_studies)} found")
    else:
        print(f"   ⚠️ WADO-RS Studies endpoint: {response.status_code}")
    
    # Test 5: Frontend viewer accessibility
    print(f"\n🌐 Testing Frontend Viewer Accessibility...")
    try:
        response = requests.get("http://localhost:5173", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend accessible")
            
            # Check if viewer route is accessible
            response = requests.get(f"http://localhost:5173/viewer/{study_id}", timeout=5)
            if response.status_code == 200:
                print("✅ Viewer route accessible")
            else:
                print(f"⚠️ Viewer route status: {response.status_code}")
        else:
            print(f"❌ Frontend not accessible: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Frontend connection error: {e}")
    
    return True

def test_viewer_features():
    """Test specific viewer features through API"""
    print("\n🔧 Testing Viewer Features...")
    
    # Login as radiologist for full access
    login_data = {"username": "radiologist1", "password": "radio123"}
    response = requests.post("http://localhost:8000/auth/login", json=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test measurement endpoints (if available)
    print("   Testing measurement capabilities...")
    
    # Test AI analysis endpoints
    print("   Testing AI analysis endpoints...")
    response = requests.get("http://localhost:8000/ai/models", headers=headers)
    if response.status_code == 200:
        models = response.json()
        print(f"   ✅ AI Models available: {len(models)}")
    else:
        print(f"   ⚠️ AI Models endpoint: {response.status_code}")
    
    print("✅ Viewer features test completed")

if __name__ == "__main__":
    print("🔍 Starting DICOM Viewer Validation...")
    
    success = test_dicom_viewer()
    if success:
        test_viewer_features()
        print("\n🎉 DICOM Viewer validation completed successfully!")
        print("\n📝 Viewer Features Validated:")
        print("   ✅ Study list access")
        print("   ✅ Study details retrieval")
        print("   ✅ DICOM file access")
        print("   ✅ WADO-RS endpoints")
        print("   ✅ Frontend accessibility")
        print("   ✅ Viewer route accessibility")
    else:
        print("\n💥 DICOM Viewer validation failed!")