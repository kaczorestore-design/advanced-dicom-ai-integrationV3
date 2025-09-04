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
    
    # Test the DICOM file endpoint with file ID 1
    headers = {'Authorization': f'Bearer {token}'}
    dicom_response = requests.get('http://localhost:8000/api/studies/dicom/files/1', headers=headers)
    
    print(f"\n🔍 DICOM File Endpoint Test:")
    print(f"  - Status Code: {dicom_response.status_code}")
    print(f"  - Content-Type: {dicom_response.headers.get('content-type')}")
    print(f"  - Content-Length: {dicom_response.headers.get('content-length')}")
    
    if dicom_response.status_code == 200:
        print(f"  ✅ DICOM file endpoint is working!")
        print(f"  - File size: {len(dicom_response.content)} bytes")
        
        # Check if it's actually DICOM content
        if dicom_response.content[:4] == b'DICM' or b'DICM' in dicom_response.content[:132]:
            print(f"  ✅ Valid DICOM file detected")
        else:
            print(f"  ⚠️  Content doesn't appear to be DICOM format")
            print(f"  - First 20 bytes: {dicom_response.content[:20]}")
    else:
        print(f"  ❌ DICOM file endpoint failed")
        print(f"  - Response: {dicom_response.text}")
else:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)