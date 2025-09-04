import requests
import json

# First login to get a valid token
login_response = requests.post('http://localhost:8000/auth/login', json={
    'username': 'admin',
    'password': 'admin123'
})

if login_response.status_code == 200:
    token = login_response.json()['access_token']
    print(f"✅ Login successful, token: {token[:20]}...")
    
    # Now get the study data
    headers = {'Authorization': f'Bearer {token}'}
    study_response = requests.get('http://localhost:8000/api/studies/NW1K5HKW', headers=headers)
    
    if study_response.status_code == 200:
        study_data = study_response.json()
        print("\n📊 Study Response:")
        print(json.dumps(study_data, indent=2))
        
        print("\n🔍 DICOM Files Analysis:")
        dicom_files = study_data.get('dicom_files', [])
        print(f"  - dicom_files exists: {bool(dicom_files)}")
        print(f"  - dicom_files type: {type(dicom_files)}")
        print(f"  - dicom_files length: {len(dicom_files) if dicom_files else 0}")
        
        if dicom_files:
            print("\n📋 First DICOM file structure:")
            print(json.dumps(dicom_files[0], indent=2))
            
            print("\n🆔 File IDs:")
            for i, file in enumerate(dicom_files):
                print(f"  File {i+1}: ID={file.get('id')}, Type={type(file.get('id'))}")
        else:
            print("  ❌ No DICOM files found")
    else:
        print(f"❌ Study request failed: {study_response.status_code}")
        print(study_response.text)
else:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)