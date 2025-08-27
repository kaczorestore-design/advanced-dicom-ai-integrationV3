#!/usr/bin/env python3
"""
Test 3D/4D reconstruction and advanced visualization features
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

def test_3d_reconstruction(base_url, token):
    """Test 3D reconstruction capabilities"""
    print("\n🧊 Testing 3D Reconstruction...")
    
    # Get available studies
    response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    if not studies:
        print("❌ No studies available for 3D testing")
        return False
    
    study_id = studies[0]['id']
    print(f"✅ Using study {study_id} for 3D reconstruction testing")
    
    # Test 3D reconstruction endpoints
    reconstruction_tests = [
        {
            "name": "Volume Rendering (VR)",
            "endpoint": f"/studies/{study_id}/3d/volume-rendering",
            "data": {
                "rendering_type": "volume",
                "quality": "high",
                "opacity_function": "default"
            }
        },
        {
            "name": "Multi-Planar Reconstruction (MPR)",
            "endpoint": f"/studies/{study_id}/3d/mpr",
            "data": {
                "planes": ["axial", "coronal", "sagittal"],
                "slice_thickness": 1.0
            }
        },
        {
            "name": "Maximum Intensity Projection (MIP)",
            "endpoint": f"/studies/{study_id}/3d/mip",
            "data": {
                "projection_type": "maximum",
                "thickness": 10.0,
                "direction": "anterior"
            }
        },
        {
            "name": "Surface Rendering",
            "endpoint": f"/studies/{study_id}/3d/surface-rendering",
            "data": {
                "threshold": 200,
                "smoothing": True,
                "decimation": 0.5
            }
        },
        {
            "name": "Curved MPR",
            "endpoint": f"/studies/{study_id}/3d/curved-mpr",
            "data": {
                "curve_points": [
                    {"x": 100, "y": 100, "z": 50},
                    {"x": 150, "y": 120, "z": 60},
                    {"x": 200, "y": 140, "z": 70}
                ],
                "width": 20
            }
        }
    ]
    
    reconstruction_results = []
    
    for test in reconstruction_tests:
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
            reconstruction_results.append({"test": test['name'], "status": "success", "result": result})
        elif response.status_code == 404:
            print(f"    ⚠️ {test['name']} endpoint not implemented (404)")
            reconstruction_results.append({"test": test['name'], "status": "not_implemented"})
        else:
            print(f"    ❌ {test['name']} failed: {response.status_code}")
            print(f"    Error: {response.text}")
            reconstruction_results.append({"test": test['name'], "status": "failed", "error": response.text})
    
    return reconstruction_results

def test_4d_visualization(base_url, token):
    """Test 4D visualization and temporal analysis"""
    print("\n⏱️ Testing 4D Visualization...")
    
    # Get available studies
    response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    if not studies:
        print("❌ No studies available for 4D testing")
        return False
    
    study_id = studies[0]['id']
    print(f"✅ Using study {study_id} for 4D visualization testing")
    
    # Test 4D visualization endpoints
    visualization_4d_tests = [
        {
            "name": "Temporal Sequence Analysis",
            "endpoint": f"/studies/{study_id}/4d/temporal-analysis",
            "data": {
                "analysis_type": "cardiac_function",
                "frame_rate": 30,
                "cycle_detection": True
            }
        },
        {
            "name": "Cine Loop Generation",
            "endpoint": f"/studies/{study_id}/4d/cine-loop",
            "data": {
                "format": "mp4",
                "frame_rate": 25,
                "quality": "high",
                "loop": True
            }
        },
        {
            "name": "4D Volume Rendering",
            "endpoint": f"/studies/{study_id}/4d/volume-rendering",
            "data": {
                "temporal_resolution": 50,
                "interpolation": "linear",
                "compression": "h264"
            }
        },
        {
            "name": "Perfusion Analysis",
            "endpoint": f"/studies/{study_id}/4d/perfusion",
            "data": {
                "roi_coordinates": {"x": 150, "y": 150, "width": 50, "height": 50},
                "analysis_method": "time_intensity_curve",
                "contrast_agent": "gadolinium"
            }
        },
        {
            "name": "Motion Analysis",
            "endpoint": f"/studies/{study_id}/4d/motion-analysis",
            "data": {
                "tracking_method": "optical_flow",
                "reference_frame": 0,
                "roi_tracking": True
            }
        }
    ]
    
    visualization_4d_results = []
    
    for test in visualization_4d_tests:
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
            visualization_4d_results.append({"test": test['name'], "status": "success", "result": result})
        elif response.status_code == 404:
            print(f"    ⚠️ {test['name']} endpoint not implemented (404)")
            visualization_4d_results.append({"test": test['name'], "status": "not_implemented"})
        else:
            print(f"    ❌ {test['name']} failed: {response.status_code}")
            print(f"    Error: {response.text}")
            visualization_4d_results.append({"test": test['name'], "status": "failed", "error": response.text})
    
    return visualization_4d_results

def test_advanced_visualization_features(base_url, token):
    """Test advanced visualization features"""
    print("\n🎨 Testing Advanced Visualization Features...")
    
    # Get available studies
    response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    if not studies:
        print("❌ No studies available for advanced visualization testing")
        return False
    
    study_id = studies[0]['id']
    
    # Test advanced visualization endpoints
    advanced_tests = [
        {
            "name": "Fusion Imaging",
            "endpoint": f"/studies/{study_id}/visualization/fusion",
            "data": {
                "primary_modality": "CT",
                "secondary_modality": "PET",
                "fusion_method": "overlay",
                "opacity": 0.7
            }
        },
        {
            "name": "Virtual Endoscopy",
            "endpoint": f"/studies/{study_id}/visualization/virtual-endoscopy",
            "data": {
                "organ": "colon",
                "path_planning": "automatic",
                "rendering_quality": "high"
            }
        },
        {
            "name": "Vessel Tracking",
            "endpoint": f"/studies/{study_id}/visualization/vessel-tracking",
            "data": {
                "seed_point": {"x": 150, "y": 150, "z": 50},
                "tracking_method": "centerline",
                "vessel_type": "artery"
            }
        },
        {
            "name": "Segmentation Overlay",
            "endpoint": f"/studies/{study_id}/visualization/segmentation",
            "data": {
                "segmentation_type": "organ",
                "organs": ["liver", "kidney", "spleen"],
                "color_map": "rainbow"
            }
        }
    ]
    
    advanced_results = []
    
    for test in advanced_tests:
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
            advanced_results.append({"test": test['name'], "status": "success", "result": result})
        elif response.status_code == 404:
            print(f"    ⚠️ {test['name']} endpoint not implemented (404)")
            advanced_results.append({"test": test['name'], "status": "not_implemented"})
        else:
            print(f"    ❌ {test['name']} failed: {response.status_code}")
            print(f"    Error: {response.text}")
            advanced_results.append({"test": test['name'], "status": "failed", "error": response.text})
    
    return advanced_results

def test_export_capabilities(base_url, token):
    """Test 3D/4D export capabilities"""
    print("\n💾 Testing Export Capabilities...")
    
    # Get available studies
    response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
    
    if response.status_code != 200:
        print(f"❌ Failed to get studies: {response.status_code}")
        return False
    
    studies = response.json()
    if not studies:
        print("❌ No studies available for export testing")
        return False
    
    study_id = studies[0]['id']
    
    # Test export endpoints
    export_tests = [
        {
            "name": "3D Model Export (STL)",
            "endpoint": f"/studies/{study_id}/export/3d-model",
            "data": {
                "format": "stl",
                "threshold": 200,
                "smoothing": True
            }
        },
        {
            "name": "3D Model Export (OBJ)",
            "endpoint": f"/studies/{study_id}/export/3d-model",
            "data": {
                "format": "obj",
                "include_textures": True,
                "decimation": 0.5
            }
        },
        {
            "name": "Volume Data Export",
            "endpoint": f"/studies/{study_id}/export/volume",
            "data": {
                "format": "nifti",
                "compression": True
            }
        },
        {
            "name": "Cine Loop Export",
            "endpoint": f"/studies/{study_id}/export/cine",
            "data": {
                "format": "mp4",
                "frame_rate": 30,
                "quality": "high"
            }
        }
    ]
    
    export_results = []
    
    for test in export_tests:
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
            export_results.append({"test": test['name'], "status": "success", "result": result})
        elif response.status_code == 404:
            print(f"    ⚠️ {test['name']} endpoint not implemented (404)")
            export_results.append({"test": test['name'], "status": "not_implemented"})
        else:
            print(f"    ❌ {test['name']} failed: {response.status_code}")
            print(f"    Error: {response.text}")
            export_results.append({"test": test['name'], "status": "failed", "error": response.text})
    
    return export_results

def main():
    """Main test function"""
    print("🧊 Testing 3D/4D Reconstruction and Advanced Visualization")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    
    # Login as doctor (has access to advanced visualization)
    print("\n🔐 Authenticating as doctor...")
    token = login_user(base_url, "doctor1", "doctor123")
    
    if not token:
        print("❌ Authentication failed")
        return
    
    print("✅ Authentication successful")
    
    # Run visualization tests
    reconstruction_results = test_3d_reconstruction(base_url, token)
    visualization_4d_results = test_4d_visualization(base_url, token)
    advanced_results = test_advanced_visualization_features(base_url, token)
    export_results = test_export_capabilities(base_url, token)
    
    # Summary
    print("\n📊 3D/4D Visualization Testing Summary:")
    print("=" * 50)
    
    print("\n🧊 3D Reconstruction:")
    for result in reconstruction_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'not_implemented' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n⏱️ 4D Visualization:")
    for result in visualization_4d_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'not_implemented' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n🎨 Advanced Visualization:")
    for result in advanced_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'not_implemented' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n💾 Export Capabilities:")
    for result in export_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'not_implemented' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    # Overall assessment
    all_results = reconstruction_results + visualization_4d_results + advanced_results + export_results
    total_tests = len(all_results)
    successful_tests = sum(1 for r in all_results if r['status'] == 'success')
    not_implemented = sum(1 for r in all_results if r['status'] == 'not_implemented')
    
    print(f"\n🎯 Overall Results: {successful_tests}/{total_tests} tests successful, {not_implemented} not implemented")
    
    if successful_tests > 0:
        print("✅ Some 3D/4D visualization functionality is working")
    elif not_implemented == total_tests:
        print("⚠️ 3D/4D visualization features appear to be not yet implemented")
    else:
        print("❌ 3D/4D visualization functionality has issues")
    
    # Frontend capabilities note
    print("\n📝 Note: Frontend 3D/4D capabilities should be tested manually in the DICOM viewer interface")
    print("   - View mode switching (2D/3D/MPR/VR/MIP)")
    print("   - Cine playback controls")
    print("   - 3D rendering and manipulation")
    print("   - Export functionality")

if __name__ == "__main__":
    main()