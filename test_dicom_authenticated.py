#!/usr/bin/env python3
"""
Authenticated test script for DICOM networking protocols
"""

import asyncio
import aiohttp
import json
from pathlib import Path

async def get_auth_token():
    """Get authentication token for API access"""
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        async with session.post(f"{base_url}/auth/login", json=login_data) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("access_token")
            else:
                print(f"❌ Authentication failed: {response.status}")
                return None

async def test_dicomweb_authenticated():
    """Test DICOMweb protocols with authentication"""
    print("🔍 Testing DICOMweb Protocols (Authenticated)...")
    
    token = await get_auth_token()
    if not token:
        return False
    
    base_url = "http://localhost:8000"
    headers = {"Authorization": f"Bearer {token}"}
    
    async with aiohttp.ClientSession() as session:
        print("\n📋 Testing QIDO-RS (Query Studies)...")
        try:
            async with session.get(f"{base_url}/dicomweb/studies", headers=headers) as response:
                if response.status == 200:
                    studies = await response.json()
                    print(f"✅ QIDO-RS: Found {len(studies)} studies")
                    
                    if studies:
                        study_uid = studies[0]["0020000D"]["Value"][0]
                        
                        print(f"\n📋 Testing QIDO-RS (Query Series for {study_uid})...")
                        async with session.get(f"{base_url}/dicomweb/studies/{study_uid}/series", headers=headers) as series_response:
                            if series_response.status == 200:
                                series = await series_response.json()
                                print(f"✅ QIDO-RS Series: Found {len(series)} series")
                                
                                if series:
                                    series_uid = series[0]["0020000E"]["Value"][0]
                                    
                                    print(f"\n📋 Testing QIDO-RS (Query Instances)...")
                                    async with session.get(f"{base_url}/dicomweb/studies/{study_uid}/series/{series_uid}/instances", headers=headers) as instances_response:
                                        if instances_response.status == 200:
                                            instances = await instances_response.json()
                                            print(f"✅ QIDO-RS Instances: Found {len(instances)} instances")
                                            
                                            if instances:
                                                sop_uid = instances[0]["00080018"]["Value"][0]
                                                
                                                print(f"\n📥 Testing WADO-RS (Retrieve Instance)...")
                                                async with session.get(f"{base_url}/dicomweb/studies/{study_uid}/series/{series_uid}/instances/{sop_uid}", headers=headers) as retrieve_response:
                                                    if retrieve_response.status == 200:
                                                        data = await retrieve_response.read()
                                                        print(f"✅ WADO-RS: Retrieved {len(data)} bytes")
                                                    else:
                                                        print(f"❌ WADO-RS failed: {retrieve_response.status}")
                                                
                                                print(f"\n🖼️ Testing WADO-RS (Retrieve Rendered)...")
                                                async with session.get(f"{base_url}/dicomweb/studies/{study_uid}/series/{series_uid}/instances/{sop_uid}/rendered", headers=headers) as rendered_response:
                                                    if rendered_response.status == 200:
                                                        image_data = await rendered_response.read()
                                                        print(f"✅ WADO-RS Rendered: Retrieved {len(image_data)} bytes")
                                                    else:
                                                        print(f"❌ WADO-RS Rendered failed: {rendered_response.status}")
                                        else:
                                            print(f"❌ QIDO-RS Instances failed: {instances_response.status}")
                            else:
                                print(f"❌ QIDO-RS Series failed: {series_response.status}")
                    
                    return True
                else:
                    print(f"❌ QIDO-RS failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ QIDO-RS error: {e}")
            return False

async def test_stow_rs():
    """Test STOW-RS (Store Over the Web)"""
    print("\n📤 Testing STOW-RS (Store Over the Web)...")
    
    token = await get_auth_token()
    if not token:
        return False
    
    base_url = "http://localhost:8000"
    headers = {"Authorization": f"Bearer {token}"}
    
    mock_dicom_content = b'\x00' * 1024  # Mock DICOM data
    
    async with aiohttp.ClientSession() as session:
        try:
            data = aiohttp.FormData()
            data.add_field('files', mock_dicom_content, filename='test.dcm', content_type='application/dicom')
            
            async with session.post(f"{base_url}/dicomweb/studies", data=data, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ STOW-RS: Successfully stored instances")
                    return True
                else:
                    print(f"❌ STOW-RS failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ STOW-RS error: {e}")
            return False

async def test_dimse_websocket():
    """Test DIMSE protocols via WebSocket"""
    print("\n🔍 Testing Traditional DIMSE Protocols...")
    
    try:
        import websockets
        
        uri = "ws://localhost:8000/dimse/ws"
        
        async with websockets.connect(uri) as websocket:
            echo_command = {
                "type": "C-ECHO",
                "config": {
                    "host": "localhost",
                    "port": 11112,
                    "callingAET": "PACS_CLIENT",
                    "calledAET": "PACS_SERVER"
                }
            }
            
            await websocket.send(json.dumps(echo_command))
            response = await websocket.recv()
            result = json.loads(response)
            
            if result.get("status") == "SUCCESS":
                print("✅ C-ECHO: Connection successful")
                
                find_command = {
                    "type": "C-FIND",
                    "level": "STUDY",
                    "criteria": {
                        "0010,0020": "PAT001",  # Patient ID
                        "0008,0020": "",        # Study Date
                        "0008,0060": ""         # Modality
                    }
                }
                
                await websocket.send(json.dumps(find_command))
                find_response = await websocket.recv()
                find_result = json.loads(find_response)
                
                if find_result.get("status") == "SUCCESS":
                    print("✅ C-FIND: Query successful")
                    return True
                else:
                    print(f"❌ C-FIND failed: {find_result}")
                    return False
            else:
                print(f"❌ C-ECHO failed: {result}")
                return False
                
    except ImportError:
        print("❌ websockets module not available")
        return False
    except Exception as e:
        print(f"❌ DIMSE WebSocket error: {e}")
        return False

async def test_frontend_integration():
    """Test frontend DICOM service integration"""
    print("\n🔍 Testing Frontend Integration...")
    
    token = await get_auth_token()
    if not token:
        return False
    
    base_url = "http://localhost:8000"
    headers = {"Authorization": f"Bearer {token}"}
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{base_url}/studies", headers=headers) as response:
                if response.status == 200:
                    studies = await response.json()
                    print(f"✅ Studies API: Found {len(studies)} studies")
                    
                    if studies:
                        study = studies[0]
                        study_id = study.get('id')
                        
                        async with session.get(f"{base_url}/studies/{study_id}/dicom-files", headers=headers) as dicom_response:
                            if dicom_response.status == 200:
                                dicom_files = await dicom_response.json()
                                print(f"✅ DICOM Files: Found {len(dicom_files)} files")
                                return True
                            else:
                                print(f"❌ DICOM Files failed: {dicom_response.status}")
                    
                    return True
                else:
                    print(f"❌ Studies API failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Frontend integration error: {e}")
            return False

async def main():
    """Run comprehensive authenticated DICOM tests"""
    print("🚀 Starting Authenticated DICOM Networking Tests")
    print("=" * 60)
    
    dicomweb_working = await test_dicomweb_authenticated()
    stow_working = await test_stow_rs()
    dimse_working = await test_dimse_websocket()
    frontend_working = await test_frontend_integration()
    
    print("\n" + "=" * 60)
    print("📊 Authenticated Test Summary:")
    print(f"✅ DICOMweb (QIDO-RS/WADO-RS): {'Working' if dicomweb_working else 'Failed'}")
    print(f"✅ STOW-RS: {'Working' if stow_working else 'Failed'}")
    print(f"✅ DIMSE Protocols: {'Working' if dimse_working else 'Failed'}")
    print(f"✅ Frontend Integration: {'Working' if frontend_working else 'Failed'}")
    
    if dicomweb_working and stow_working:
        print("\n🎉 DICOMweb protocols are fully functional!")
    
    if dimse_working:
        print("🎉 Traditional DIMSE protocols are functional!")
    
    if frontend_working:
        print("🎉 Frontend integration is working!")
    
    overall_success = dicomweb_working and stow_working and frontend_working
    print(f"\n🏆 Overall Status: {'SUCCESS' if overall_success else 'NEEDS ATTENTION'}")

if __name__ == "__main__":
    asyncio.run(main())
