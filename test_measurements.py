#!/usr/bin/env python3
"""
Test DICOM Viewer measurement tools and auto-measurement features
"""

import requests
import time
from pathlib import Path

def login_user(base_url, username, password):
    """Login and get access token"""
    login_data = {"username": username, "password": password}
    response = requests.post(f"{base_url}/auth/login", json=login_data)
    
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Login failed for {username}: {response.status_code}")
        return None

def get_headers(token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {token}"}

def test_measurement_tools(base_url, token):
    """Test measurement tools functionality"""
    print("\n📏 Testing Measurement Tools...")
    
    # Get available studies
    response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    if not studies:
        print("❌ No studies available for measurement testing")
        return False
    
    study_id = studies[0]['id']
    print(f"✅ Using study {study_id} for measurement testing")
    
    # Test measurement endpoints
    measurement_tests = [
        {
            "name": "Distance Measurement",
            "endpoint": f"/studies/{study_id}/measurements/distance",
            "data": {
                "start_point": {"x": 100, "y": 100},
                "end_point": {"x": 200, "y": 200},
                "pixel_spacing": [0.5, 0.5],
                "measurement_type": "distance"
            }
        },
        {
            "name": "Area Measurement",
            "endpoint": f"/studies/{study_id}/measurements/area",
            "data": {
                "points": [
                    {"x": 100, "y": 100},
                    {"x": 200, "y": 100},
                    {"x": 200, "y": 200},
                    {"x": 100, "y": 200}
                ],
                "pixel_spacing": [0.5, 0.5],
                "measurement_type": "area"
            }
        },
        {
            "name": "Angle Measurement",
            "endpoint": f"/studies/{study_id}/measurements/angle",
            "data": {
                "vertex": {"x": 150, "y": 150},
                "point1": {"x": 100, "y": 100},
                "point2": {"x": 200, "y": 100},
                "measurement_type": "angle"
            }
        }
    ]
    
    measurement_results = []
    
    for test in measurement_tests:
        print(f"  🔍 Testing {test['name']}...")
        
        response = requests.post(
            f"{base_url}{test['endpoint']}",
            json=test['data'],
            headers=get_headers(token)
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"    ✅ {test['name']} successful")
            print(f"    📊 Result: {result}")
            measurement_results.append({"test": test['name'], "status": "success", "result": result})
        elif response.status_code == 404:
            print(f"    ⚠️ {test['name']} endpoint not implemented (404)")
            measurement_results.append({"test": test['name'], "status": "not_implemented"})
        else:
            print(f"    ❌ {test['name']} failed: {response.status_code}")
            print(f"    Error: {response.text}")
            measurement_results.append({"test": test['name'], "status": "failed", "error": response.text})
    
    return measurement_results

def test_auto_measurements(base_url, token):
    """Test auto-measurement features"""
    print("\n🤖 Testing Auto-Measurement Features...")
    
    # Get available studies
    response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    if not studies:
        print("❌ No studies available for auto-measurement testing")
        return False
    
    study_id = studies[0]['id']
    print(f"✅ Using study {study_id} for auto-measurement testing")
    
    # Test auto-measurement endpoints
    auto_measurement_tests = [
        {
            "name": "Auto Organ Segmentation",
            "endpoint": f"/studies/{study_id}/auto-measurements/segmentation",
            "data": {
                "organ_type": "lung",
                "algorithm": "deep_learning"
            }
        },
        {
            "name": "Auto Lesion Detection",
            "endpoint": f"/studies/{study_id}/auto-measurements/lesion-detection",
            "data": {
                "detection_type": "nodules",
                "sensitivity": "high"
            }
        },
        {
            "name": "Auto Bone Density",
            "endpoint": f"/studies/{study_id}/auto-measurements/bone-density",
            "data": {
                "region": "spine",
                "method": "hounsfield_units"
            }
        },
        {
            "name": "Auto Cardiac Function",
            "endpoint": f"/studies/{study_id}/auto-measurements/cardiac",
            "data": {
                "measurement_type": "ejection_fraction",
                "chamber": "left_ventricle"
            }
        }
    ]
    
    auto_results = []
    
    for test in auto_measurement_tests:
        print(f"  🔍 Testing {test['name']}...")
        
        response = requests.post(
            f"{base_url}{test['endpoint']}",
            json=test['data'],
            headers=get_headers(token)
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"    ✅ {test['name']} successful")
            print(f"    📊 Result: {result}")
            auto_results.append({"test": test['name'], "status": "success", "result": result})
        elif response.status_code == 404:
            print(f"    ⚠️ {test['name']} endpoint not implemented (404)")
            auto_results.append({"test": test['name'], "status": "not_implemented"})
        else:
            print(f"    ❌ {test['name']} failed: {response.status_code}")
            print(f"    Error: {response.text}")
            auto_results.append({"test": test['name'], "status": "failed", "error": response.text})
    
    return auto_results

def test_measurement_persistence(base_url, token):
    """Test measurement data persistence and retrieval"""
    print("\n💾 Testing Measurement Persistence...")
    
    # Get available studies
    response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    if not studies:
        print("❌ No studies available for persistence testing")
        return False
    
    study_id = studies[0]['id']
    
    # Test getting measurements for a study
    response = requests.get(
        f"{base_url}/studies/{study_id}/measurements",
        headers=get_headers(token)
    )
    
    if response.status_code == 200:
        measurements = response.json()
        print(f"✅ Retrieved {len(measurements)} measurements for study {study_id}")
        return True
    elif response.status_code == 404:
        print("⚠️ Measurement persistence endpoint not implemented (404)")
        return False
    else:
        print(f"❌ Failed to retrieve measurements: {response.status_code}")
        return False

def main():
    """Main test function"""
    print("🔬 Testing DICOM Viewer Measurement Tools")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # Login as doctor (has access to measurement tools)
    print("\n🔐 Authenticating as doctor...")
    token = login_user(base_url, "doctor1", "doctor123")
    
    if not token:
        print("❌ Authentication failed")
        return
    
    print("✅ Authentication successful")
    
    # Run measurement tests
    measurement_results = test_measurement_tools(base_url, token)
    auto_results = test_auto_measurements(base_url, token)
    persistence_result = test_measurement_persistence(base_url, token)
    
    # Summary
    print("\n📊 Measurement Testing Summary:")
    print("=" * 40)
    
    print("\n📏 Manual Measurement Tools:")
    for result in measurement_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'not_implemented' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n🤖 Auto-Measurement Features:")
    for result in auto_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'not_implemented' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n💾 Measurement Persistence:")
    persistence_icon = "✅" if persistence_result else "⚠️"
    print(f"  {persistence_icon} Data persistence: {'working' if persistence_result else 'not implemented'}")
    
    # Overall assessment
    total_tests = len(measurement_results) + len(auto_results) + 1
    successful_tests = sum(1 for r in measurement_results if r['status'] == 'success')
    successful_tests += sum(1 for r in auto_results if r['status'] == 'success')
    successful_tests += 1 if persistence_result else 0
    
    print(f"\n🎯 Overall Results: {successful_tests}/{total_tests} tests successful")
    
    if successful_tests > 0:
        print("✅ Measurement functionality validation completed")
    else:
        print("⚠️ Measurement functionality appears to be not yet implemented")

if __name__ == "__main__":
    main()