import requests
import json

login_data = {
    "username": "tech1", 
    "password": "tech123"
}

response = requests.post("http://localhost:8000/auth/login", json=login_data)
if response.status_code == 200:
    token = response.json()["access_token"]
    print(f"Login successful, token: {token[:20]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    study_data = {
        "patient_id": "TEST001",
        "first_name": "Test",
        "last_name": "Patient", 
        "study_description": "Test CT Study for Deletion Request",
        "modality": "CT",
        "body_part": "Chest"
    }
    
    response = requests.post("http://localhost:8000/studies/upload", json=study_data, headers=headers)
    print(f"Study creation response: {response.status_code}")
    if response.status_code != 200:
        print(f"Response text: {response.text}")
        
        response = requests.post("http://localhost:8000/api/studies/upload", json=study_data, headers=headers)
        print(f"Alternative endpoint response: {response.status_code}")
        if response.status_code != 200:
            print(f"Alternative response text: {response.text}")
    else:
        print("Study created successfully!")
        print(response.json())
        
else:
    print(f"Login failed: {response.status_code} - {response.text}")
