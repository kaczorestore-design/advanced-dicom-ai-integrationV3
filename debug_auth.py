#!/usr/bin/env python3
"""
Debug authentication issue for QA validation
"""

import requests
import json

def test_auth_formats():
    """Test different authentication formats"""
    api_url = "http://localhost:8000"
    
    print("🔍 Testing Authentication Formats")
    print("=" * 40)
    
    try:
        response = requests.get(f"{api_url}/healthz")
        print(f"Health check: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return False
    
    login_data = {"username": "admin", "password": "admin123"}
    
    print("\n1. Testing JSON format...")
    try:
        response = requests.post(f"{api_url}/auth/login", json=login_data)
        print(f"JSON format: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"JSON format error: {e}")
    
    print("\n2. Testing form data format...")
    try:
        response = requests.post(f"{api_url}/auth/login", data=login_data)
        print(f"Form data: {response.status_code}")
        if response.status_code == 200:
            print("✅ Form data format works!")
            token_data = response.json()
            print(f"Token received: {token_data.get('access_token', 'No token')[:20]}...")
            return token_data.get('access_token')
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Form data error: {e}")
    
    print("\n3. Checking API documentation...")
    try:
        response = requests.get(f"{api_url}/docs")
        print(f"API docs: {response.status_code}")
    except Exception as e:
        print(f"API docs error: {e}")
    
    return None

def test_with_token(token):
    """Test API calls with token"""
    if not token:
        print("No token available for testing")
        return
    
    api_url = "http://localhost:8000"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n🔑 Testing with token: {token[:20]}...")
    
    try:
        response = requests.get(f"{api_url}/auth/me", headers=headers)
        print(f"User info: {response.status_code}")
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ User: {user_data.get('username')} ({user_data.get('role')})")
    except Exception as e:
        print(f"User info error: {e}")
    
    try:
        response = requests.get(f"{api_url}/studies/", headers=headers)
        print(f"Studies endpoint: {response.status_code}")
        if response.status_code == 200:
            print("✅ Studies endpoint accessible")
    except Exception as e:
        print(f"Studies error: {e}")

if __name__ == "__main__":
    token = test_auth_formats()
    test_with_token(token)
