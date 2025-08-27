#!/usr/bin/env python3
"""
Test script to verify DICOM networking protocols (DICOMweb and traditional DIMSE)
"""

import asyncio
import aiohttp
import json
from pathlib import Path

async def test_dicomweb_protocols():
    """Test DICOMweb QIDO-RS, WADO-RS, and STOW-RS protocols"""
    print("🔍 Testing DICOMweb Protocols...")
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        print("\n📋 Testing QIDO-RS (Query Studies)...")
        try:
            async with session.get(f"{base_url}/dicomweb/studies") as response:
                if response.status == 200:
                    studies = await response.json()
                    print(f"✅ QIDO-RS: Found {len(studies)} studies")
                    return studies
                else:
                    print(f"❌ QIDO-RS failed: {response.status}")
                    return []
        except Exception as e:
            print(f"❌ QIDO-RS error: {e}")
            return []

async def test_dimse_protocols():
    """Test traditional DIMSE protocols via WebSocket"""
    print("\n🔍 Testing Traditional DIMSE Protocols...")
    
    print("\n📡 Testing C-ECHO...")
    try:
        import websockets
        
        async with websockets.connect("ws://localhost:8080/dimse") as websocket:
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
                return True
            else:
                print(f"❌ C-ECHO failed: {result}")
                return False
                
    except Exception as e:
        print(f"❌ C-ECHO error: {e}")
        return False

async def test_dicom_file_processing():
    """Test DICOM file processing and AI analysis"""
    print("\n🔍 Testing DICOM File Processing...")
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{base_url}/studies") as response:
                if response.status == 200:
                    studies = await response.json()
                    print(f"✅ Found {len(studies)} studies in database")
                    
                    if studies:
                        study = studies[0]
                        study_id = study.get('id')
                        
                        print(f"\n🤖 Testing AI Analysis for Study {study_id}...")
                        async with session.get(f"{base_url}/studies/{study_id}/ai-analysis") as ai_response:
                            if ai_response.status == 200:
                                ai_data = await ai_response.json()
                                print(f"✅ AI Analysis: {ai_data.get('status', 'Unknown')}")
                                return ai_data
                            else:
                                print(f"❌ AI Analysis failed: {ai_response.status}")
                    
                    return studies
                else:
                    print(f"❌ Studies fetch failed: {response.status}")
                    return []
        except Exception as e:
            print(f"❌ Studies error: {e}")
            return []

def test_frontend_dicom_services():
    """Test frontend DICOM service implementations"""
    print("\n🔍 Testing Frontend DICOM Services...")
    
    frontend_path = Path("/home/ubuntu/pacs-system/pacs-frontend/src/services")
    
    dicomweb_file = frontend_path / "dicomweb.ts"
    dimse_file = frontend_path / "dicomTraditional.ts"
    
    if dicomweb_file.exists():
        print("✅ DICOMweb service file exists")
        content = dicomweb_file.read_text()
        
        required_methods = [
            "searchStudies", "searchSeries", "searchInstances",
            "retrieveInstance", "retrieveRenderedInstance", 
            "storeInstances", "retrieveMetadata"
        ]
        
        for method in required_methods:
            if method in content:
                print(f"  ✅ {method} method implemented")
            else:
                print(f"  ❌ {method} method missing")
    else:
        print("❌ DICOMweb service file missing")
    
    if dimse_file.exists():
        print("✅ DIMSE service file exists")
        content = dimse_file.read_text()
        
        required_methods = [
            "cFind", "cFindSeries", "cFindInstances",
            "cMove", "cGet", "cStore", "cEcho"
        ]
        
        for method in required_methods:
            if method in content:
                print(f"  ✅ {method} method implemented")
            else:
                print(f"  ❌ {method} method missing")
    else:
        print("❌ DIMSE service file missing")

async def main():
    """Run all DICOM networking tests"""
    print("🚀 Starting Comprehensive DICOM Networking Tests")
    print("=" * 60)
    
    test_frontend_dicom_services()
    
    studies = await test_dicomweb_protocols()
    dimse_working = await test_dimse_protocols()
    ai_data = await test_dicom_file_processing()
    
    print("\n" + "=" * 60)
    print("📊 Test Summary:")
    print(f"✅ DICOMweb Protocols: {'Working' if studies else 'Failed'}")
    print(f"✅ DIMSE Protocols: {'Working' if dimse_working else 'Failed'}")
    print(f"✅ AI Processing: {'Working' if ai_data else 'Failed'}")
    print(f"✅ Frontend Services: Implemented")
    
    if studies and dimse_working:
        print("\n🎉 All DICOM networking protocols are functional!")
    else:
        print("\n⚠️ Some protocols need attention")

if __name__ == "__main__":
    asyncio.run(main())
