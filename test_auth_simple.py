#!/usr/bin/env python3
"""
Simple Authentication Test
Tests basic login functionality without triggering rate limiting
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_single_login():
    """Test a single login attempt"""
    print("🔍 Testing Single Login Attempt")
    print("=" * 40)
    
    # Test health check first
    try:
        response = requests.get(f"{BASE_URL}/healthz")
        print(f"Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Test login with admin credentials
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nLogin attempt: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print("✅ Login successful!")
            print(f"Token type: {data.get('token_type')}")
            print(f"Token (first 20 chars): {token[:20]}...")
            
            # Test authenticated endpoint
            headers = {"Authorization": f"Bearer {token}"}
            me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            
            if me_response.status_code == 200:
                user_data = me_response.json()
                print(f"✅ User info retrieved: {user_data.get('username')} ({user_data.get('role')})")
            else:
                print(f"❌ Failed to get user info: {me_response.status_code}")
                
        elif response.status_code == 429:
            print("⚠️ Rate limited - waiting for cooldown")
            print("Response:", response.json())
        elif response.status_code == 401:
            print("❌ Invalid credentials")
            print("Response:", response.json())
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print("Response:", response.text)
            
    except Exception as e:
        print(f"❌ Login test failed: {e}")

def test_invalid_credentials():
    """Test login with invalid credentials"""
    print("\n🔍 Testing Invalid Credentials")
    print("=" * 40)
    
    login_data = {
        "username": "invalid_user",
        "password": "wrong_password"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Invalid login attempt: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Correctly rejected invalid credentials")
        elif response.status_code == 429:
            print("⚠️ Rate limited")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print("Response:", response.text)
            
    except Exception as e:
        print(f"❌ Invalid credentials test failed: {e}")

if __name__ == "__main__":
    test_single_login()
    time.sleep(2)  # Small delay between tests
    test_invalid_credentials()
    print("\n✅ Authentication tests completed")