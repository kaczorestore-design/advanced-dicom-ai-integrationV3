import requests
import json

# First, login to get a valid token
login_url = "http://localhost:8000/auth/login"
login_data = {"username": "admin", "password": "admin123"}

print("Attempting login...")
login_response = requests.post(login_url, json=login_data)
print(f"Login Status Code: {login_response.status_code}")

if login_response.status_code == 200:
    login_result = login_response.json()
    token = login_result["access_token"]
    print(f"Login successful! Token: {token[:50]}...")
    
    # Now test the study API endpoint
    study_url = "http://localhost:8000/api/studies/NW1K5HKW"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\nTesting study API endpoint...")
    response = requests.get(study_url, headers=headers)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nResponse Data: {json.dumps(data, indent=2)}")
        
        # Check dicom_files specifically
        if 'dicom_files' in data:
            print(f"\nDICOM Files Count: {len(data['dicom_files'])}")
            for i, file in enumerate(data['dicom_files']):
                print(f"File {i+1}: {file}")
        else:
            print("\nNo 'dicom_files' key found in response")
    else:
        print(f"Error Response: {response.text}")
else:
    print(f"Login failed: {login_response.text}")