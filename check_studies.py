#!/usr/bin/env python3
import requests

def check_studies():
    # Login as admin
    login_response = requests.post('http://localhost:8000/auth/login', 
                                 json={'username': 'admin', 'password': 'admin123'})
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get studies
    studies_response = requests.get('http://localhost:8000/studies/', headers=headers)
    
    if studies_response.status_code != 200:
        print(f"❌ Failed to get studies: {studies_response.status_code}")
        return
    
    studies = studies_response.json()
    print(f"Found {len(studies)} studies:")
    
    for study in studies:
        print(f"  Study {study['id']}: {study.get('study_description', 'N/A')}")
        print(f"    Patient: {study.get('patient', {}).get('first_name', 'N/A')} {study.get('patient', {}).get('last_name', 'N/A')}")
        print(f"    Status: {study.get('status', 'N/A')}")
        print(f"    Files: {len(study.get('dicom_files', []))}")
        print()

if __name__ == '__main__':
    check_studies()