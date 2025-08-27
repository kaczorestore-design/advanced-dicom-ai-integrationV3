#!/usr/bin/env python3
"""
Token Debug Script
Debugs JWT token creation and validation
"""

import requests
import json
import jwt
from datetime import datetime

BASE_URL = "http://localhost:8000"
SECRET_KEY = "your-secret-key-here-change-in-production"  # Default secret key
ALGORITHM = "HS256"

def debug_token():
    """Debug token creation and validation"""
    print("🔍 Debugging JWT Token")
    print("=" * 40)
    
    # Get a token first
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
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code}")
            print("Response:", response.text)
            return
            
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Login successful, got token")
        print(f"Token (first 50 chars): {token[:50]}...")
        
        # Decode the token to see its contents
        try:
            # Decode without verification first to see the payload
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            print("\n📋 Token payload (unverified):")
            for key, value in unverified_payload.items():
                if key == 'exp':
                    exp_time = datetime.fromtimestamp(value)
                    print(f"  {key}: {value} ({exp_time})")
                elif key == 'iat':
                    iat_time = datetime.fromtimestamp(value)
                    print(f"  {key}: {value} ({iat_time})")
                else:
                    print(f"  {key}: {value}")
            
            # Now try to verify the token
            verified_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            print("\n✅ Token verification successful")
            
            # Check expiration manually
            exp = verified_payload.get('exp')
            current_time = datetime.utcnow().timestamp()
            print(f"\n⏰ Time check:")
            print(f"  Current time: {current_time} ({datetime.fromtimestamp(current_time)})")
            print(f"  Token expires: {exp} ({datetime.fromtimestamp(exp)})")
            print(f"  Time until expiry: {exp - current_time:.2f} seconds")
            
            if current_time > exp:
                print("❌ Token is expired")
            else:
                print("✅ Token is still valid")
                
        except jwt.ExpiredSignatureError:
            print("❌ Token has expired")
        except jwt.InvalidTokenError as e:
            print(f"❌ Token validation failed: {e}")
        
        # Test the /auth/me endpoint
        print("\n🔍 Testing /auth/me endpoint")
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        
        print(f"Auth/me response: {me_response.status_code}")
        if me_response.status_code == 200:
            user_data = me_response.json()
            print(f"✅ User info: {user_data}")
        else:
            print(f"❌ Failed to get user info")
            print("Response:", me_response.text)
            
    except Exception as e:
        print(f"❌ Debug failed: {e}")

if __name__ == "__main__":
    debug_token()