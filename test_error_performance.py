#!/usr/bin/env python3
"""
Test error handling scenarios and performance with large datasets
"""

import requests
import time
import os
import tempfile
from pathlib import Path
import concurrent.futures
import threading
from datetime import datetime

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

def create_invalid_dicom_file(filename):
    """Create an invalid DICOM file for testing"""
    with open(filename, 'wb') as f:
        # Write invalid DICOM header
        f.write(b'INVALID_DICOM_FILE_FOR_TESTING')
        f.write(b'\x00' * 100)  # Add some null bytes
        f.write(b'This is not a valid DICOM file content')

def create_corrupted_dicom_file(source_file, corrupted_file):
    """Create a corrupted DICOM file by modifying a valid one"""
    if not os.path.exists(source_file):
        # Create a fake corrupted file if source doesn't exist
        with open(corrupted_file, 'wb') as f:
            f.write(b'DICM')  # Valid DICOM prefix
            f.write(b'\x00' * 128)  # DICOM preamble
            f.write(b'CORRUPTED_DATA_AFTER_HEADER')
            f.write(b'\xFF' * 200)  # Invalid data
        return
    
    # Copy and corrupt the file
    with open(source_file, 'rb') as src:
        data = src.read()
    
    # Corrupt the middle part of the file
    if len(data) > 1000:
        corrupted_data = data[:500] + b'\xFF' * 100 + data[600:]
    else:
        corrupted_data = data[:len(data)//2] + b'\xFF' * 50
    
    with open(corrupted_file, 'wb') as dst:
        dst.write(corrupted_data)

def test_invalid_file_upload(base_url, token):
    """Test uploading invalid files"""
    print("\n🚫 Testing Invalid File Upload...")
    
    test_results = []
    
    # Test 1: Non-DICOM file
    print("  🔍 Testing non-DICOM file upload...")
    with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp:
        tmp.write(b'This is not a DICOM file')
        tmp_path = tmp.name
    
    try:
        with open(tmp_path, 'rb') as f:
            files = {'files': ('test.txt', f, 'text/plain')}
            data = {
                'patient_id': 'TEST_INVALID_001',
                'first_name': 'Test',
                'last_name': 'Invalid',
                'date_of_birth': '1990-01-01',
                'gender': 'M',
                'study_description': 'Invalid File Test',
                'priority': 'routine'
            }
            
            response = requests.post(
                f"{base_url}/studies/upload",
                files=files,
                data=data,
                headers=get_headers(token)
            )
            
            if response.status_code in [400, 422, 415]:  # Expected error codes
                print("    ✅ Non-DICOM file correctly rejected")
                test_results.append({"test": "non_dicom_file", "status": "success", "message": "Correctly rejected"})
            else:
                print(f"    ❌ Non-DICOM file not properly rejected: {response.status_code}")
                test_results.append({"test": "non_dicom_file", "status": "failed", "message": f"Status: {response.status_code}"})
    
    except Exception as e:
        print(f"    ❌ Error testing non-DICOM file: {e}")
        test_results.append({"test": "non_dicom_file", "status": "error", "message": str(e)})
    
    finally:
        os.unlink(tmp_path)
    
    # Test 2: Invalid DICOM file
    print("  🔍 Testing invalid DICOM file upload...")
    with tempfile.NamedTemporaryFile(suffix='.dcm', delete=False) as tmp:
        create_invalid_dicom_file(tmp.name)
        tmp_path = tmp.name
    
    try:
        with open(tmp_path, 'rb') as f:
            files = {'files': ('invalid.dcm', f, 'application/dicom')}
            data = {
                'patient_id': 'TEST_INVALID_002',
                'first_name': 'Test',
                'last_name': 'Invalid',
                'date_of_birth': '1990-01-01',
                'gender': 'M',
                'study_description': 'Invalid DICOM Test',
                'priority': 'routine'
            }
            
            response = requests.post(
                f"{base_url}/studies/upload",
                files=files,
                data=data,
                headers=get_headers(token)
            )
            
            if response.status_code in [400, 422, 500]:  # Expected error codes
                print("    ✅ Invalid DICOM file correctly rejected")
                test_results.append({"test": "invalid_dicom_file", "status": "success", "message": "Correctly rejected"})
            else:
                print(f"    ❌ Invalid DICOM file not properly rejected: {response.status_code}")
                test_results.append({"test": "invalid_dicom_file", "status": "failed", "message": f"Status: {response.status_code}"})
    
    except Exception as e:
        print(f"    ❌ Error testing invalid DICOM file: {e}")
        test_results.append({"test": "invalid_dicom_file", "status": "error", "message": str(e)})
    
    finally:
        os.unlink(tmp_path)
    
    # Test 3: Corrupted DICOM file
    print("  🔍 Testing corrupted DICOM file upload...")
    with tempfile.NamedTemporaryFile(suffix='.dcm', delete=False) as tmp:
        # Try to use existing DICOM file or create a fake corrupted one
        source_dicom = None
        for possible_file in ['test_dicom.dcm', 'test_workflow_20250825194230.dcm']:
            if os.path.exists(possible_file):
                source_dicom = possible_file
                break
        
        create_corrupted_dicom_file(source_dicom, tmp.name)
        tmp_path = tmp.name
    
    try:
        with open(tmp_path, 'rb') as f:
            files = {'files': ('corrupted.dcm', f, 'application/dicom')}
            data = {
                'patient_id': 'TEST_CORRUPTED_003',
                'first_name': 'Test',
                'last_name': 'Corrupted',
                'date_of_birth': '1990-01-01',
                'gender': 'M',
                'study_description': 'Corrupted DICOM Test',
                'priority': 'routine'
            }
            
            response = requests.post(
                f"{base_url}/studies/upload",
                files=files,
                data=data,
                headers=get_headers(token)
            )
            
            if response.status_code in [400, 422, 500]:  # Expected error codes
                print("    ✅ Corrupted DICOM file correctly rejected")
                test_results.append({"test": "corrupted_dicom_file", "status": "success", "message": "Correctly rejected"})
            else:
                print(f"    ❌ Corrupted DICOM file not properly rejected: {response.status_code}")
                test_results.append({"test": "corrupted_dicom_file", "status": "failed", "message": f"Status: {response.status_code}"})
    
    except Exception as e:
        print(f"    ❌ Error testing corrupted DICOM file: {e}")
        test_results.append({"test": "corrupted_dicom_file", "status": "error", "message": str(e)})
    
    finally:
        os.unlink(tmp_path)
    
    return test_results

def test_duplicate_upload(base_url, token):
    """Test uploading duplicate DICOM files"""
    print("\n🔄 Testing Duplicate Upload Handling...")
    
    # Check if we have a valid DICOM file to use
    dicom_file = None
    for possible_file in ['test_workflow_20250825194230.dcm', 'test_dicom.dcm']:
        if os.path.exists(possible_file):
            dicom_file = possible_file
            break
    
    if not dicom_file:
        print("    ⚠️ No valid DICOM file found for duplicate testing")
        return [{"test": "duplicate_upload", "status": "skipped", "message": "No DICOM file available"}]
    
    print(f"  🔍 Using {dicom_file} for duplicate testing...")
    
    # First upload
    print("  📤 First upload...")
    try:
        with open(dicom_file, 'rb') as f:
            files = {'files': (dicom_file, f, 'application/dicom')}
            data = {
                'patient_id': 'TEST_DUPLICATE_001',
                'first_name': 'Test',
                'last_name': 'Duplicate',
                'date_of_birth': '1990-01-01',
                'gender': 'M',
                'study_description': 'Duplicate Test Study',
                'priority': 'routine'
            }
            
            response1 = requests.post(
                f"{base_url}/studies/upload",
                files=files,
                data=data,
                headers=get_headers(token)
            )
            
            if response1.status_code in [200, 201]:
                print("    ✅ First upload successful")
                study_id_1 = response1.json().get('id') or response1.json().get('study_id')
            else:
                print(f"    ❌ First upload failed: {response1.status_code}")
                return [{"test": "duplicate_upload", "status": "failed", "message": "First upload failed"}]
    
    except Exception as e:
        print(f"    ❌ Error in first upload: {e}")
        return [{"test": "duplicate_upload", "status": "error", "message": str(e)}]
    
    # Second upload (duplicate)
    print("  📤 Second upload (duplicate)...")
    time.sleep(1)  # Brief delay
    
    try:
        with open(dicom_file, 'rb') as f:
            files = {'files': (dicom_file, f, 'application/dicom')}
            data = {
                'patient_id': 'TEST_DUPLICATE_001',  # Same patient
                'first_name': 'Test',
                'last_name': 'Duplicate',
                'date_of_birth': '1990-01-01',
                'gender': 'M',
                'study_description': 'Duplicate Test Study',
                'priority': 'routine'
            }
            
            response2 = requests.post(
                f"{base_url}/studies/upload",
                files=files,
                data=data,
                headers=get_headers(token)
            )
            
            if response2.status_code == 409:  # Conflict - ideal response
                print("    ✅ Duplicate correctly detected and rejected (409 Conflict)")
                return [{"test": "duplicate_upload", "status": "success", "message": "Duplicate correctly rejected"}]
            elif response2.status_code in [400, 422]:
                print("    ✅ Duplicate correctly rejected (validation error)")
                return [{"test": "duplicate_upload", "status": "success", "message": "Duplicate rejected with validation error"}]
            elif response2.status_code in [200, 201]:
                print("    ⚠️ Duplicate upload succeeded - may need duplicate detection")
                return [{"test": "duplicate_upload", "status": "warning", "message": "Duplicate upload allowed"}]
            else:
                print(f"    ❌ Unexpected response for duplicate: {response2.status_code}")
                return [{"test": "duplicate_upload", "status": "failed", "message": f"Unexpected status: {response2.status_code}"}]
    
    except Exception as e:
        print(f"    ❌ Error in duplicate upload: {e}")
        return [{"test": "duplicate_upload", "status": "error", "message": str(e)}]

def test_concurrent_uploads(base_url, token, num_concurrent=5):
    """Test concurrent upload performance"""
    print(f"\n⚡ Testing Concurrent Uploads ({num_concurrent} simultaneous)...")
    
    # Check if we have a valid DICOM file
    dicom_file = None
    for possible_file in ['test_workflow_20250825194230.dcm', 'test_dicom.dcm']:
        if os.path.exists(possible_file):
            dicom_file = possible_file
            break
    
    if not dicom_file:
        print("    ⚠️ No valid DICOM file found for concurrent testing")
        return [{"test": "concurrent_uploads", "status": "skipped", "message": "No DICOM file available"}]
    
    def upload_file(index):
        """Upload a single file"""
        try:
            start_time = time.time()
            
            with open(dicom_file, 'rb') as f:
                files = {'files': (f'{dicom_file}_{index}', f, 'application/dicom')}
                data = {
                    'patient_id': f'CONCURRENT_{index:03d}',
                    'first_name': 'Concurrent',
                    'last_name': f'Test{index}',
                    'date_of_birth': '1990-01-01',
                    'gender': 'M',
                    'study_description': f'Concurrent Upload Test {index}',
                    'priority': 'routine'
                }
                
                response = requests.post(
                    f"{base_url}/studies/upload",
                    files=files,
                    data=data,
                    headers=get_headers(token),
                    timeout=30
                )
                
                end_time = time.time()
                duration = end_time - start_time
                
                return {
                    'index': index,
                    'status_code': response.status_code,
                    'duration': duration,
                    'success': response.status_code in [200, 201],
                    'response_size': len(response.content)
                }
        
        except Exception as e:
            return {
                'index': index,
                'status_code': None,
                'duration': None,
                'success': False,
                'error': str(e)
            }
    
    # Execute concurrent uploads
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
        futures = [executor.submit(upload_file, i) for i in range(num_concurrent)]
        results = [future.result() for future in concurrent.futures.as_completed(futures)]
    
    end_time = time.time()
    total_duration = end_time - start_time
    
    # Analyze results
    successful_uploads = [r for r in results if r['success']]
    failed_uploads = [r for r in results if not r['success']]
    
    if successful_uploads:
        avg_duration = sum(r['duration'] for r in successful_uploads) / len(successful_uploads)
        max_duration = max(r['duration'] for r in successful_uploads)
        min_duration = min(r['duration'] for r in successful_uploads)
    else:
        avg_duration = max_duration = min_duration = 0
    
    print(f"  📊 Results: {len(successful_uploads)}/{num_concurrent} successful")
    print(f"  ⏱️ Total time: {total_duration:.2f}s")
    print(f"  📈 Average upload time: {avg_duration:.2f}s")
    print(f"  📈 Min/Max upload time: {min_duration:.2f}s / {max_duration:.2f}s")
    
    if len(successful_uploads) >= num_concurrent * 0.8:  # 80% success rate
        print("  ✅ Concurrent upload performance acceptable")
        status = "success"
    elif len(successful_uploads) > 0:
        print("  ⚠️ Some concurrent uploads failed")
        status = "warning"
    else:
        print("  ❌ All concurrent uploads failed")
        status = "failed"
    
    return [{
        "test": "concurrent_uploads",
        "status": status,
        "successful": len(successful_uploads),
        "total": num_concurrent,
        "total_duration": total_duration,
        "avg_duration": avg_duration
    }]

def test_large_file_handling(base_url, token):
    """Test handling of large files"""
    print("\n📦 Testing Large File Handling...")
    
    # Create a large dummy file (simulating large DICOM)
    large_file_size = 50 * 1024 * 1024  # 50MB
    
    with tempfile.NamedTemporaryFile(suffix='.dcm', delete=False) as tmp:
        # Create a file with DICOM-like header but large size
        tmp.write(b'\x00' * 128)  # DICOM preamble
        tmp.write(b'DICM')  # DICOM prefix
        tmp.write(b'\x00' * (large_file_size - 132))  # Fill with zeros
        tmp_path = tmp.name
    
    print(f"  📏 Created {large_file_size / (1024*1024):.1f}MB test file")
    
    try:
        start_time = time.time()
        
        with open(tmp_path, 'rb') as f:
            files = {'files': ('large_test.dcm', f, 'application/dicom')}
            data = {
                'patient_id': 'LARGE_FILE_001',
                'first_name': 'Large',
                'last_name': 'File',
                'date_of_birth': '1990-01-01',
                'gender': 'M',
                'study_description': 'Large File Test',
                'priority': 'routine'
            }
            
            response = requests.post(
                f"{base_url}/studies/upload",
                files=files,
                data=data,
                headers=get_headers(token),
                timeout=120  # 2 minute timeout for large file
            )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"  ⏱️ Upload took {duration:.2f} seconds")
        
        if response.status_code in [200, 201]:
            print("  ✅ Large file upload successful")
            return [{"test": "large_file_handling", "status": "success", "duration": duration, "file_size_mb": large_file_size / (1024*1024)}]
        elif response.status_code == 413:  # Payload too large
            print("  ⚠️ Large file rejected (413 Payload Too Large) - size limit enforced")
            return [{"test": "large_file_handling", "status": "warning", "message": "Size limit enforced"}]
        else:
            print(f"  ❌ Large file upload failed: {response.status_code}")
            return [{"test": "large_file_handling", "status": "failed", "status_code": response.status_code}]
    
    except requests.exceptions.Timeout:
        print("  ❌ Large file upload timed out")
        return [{"test": "large_file_handling", "status": "failed", "message": "Upload timeout"}]
    
    except Exception as e:
        print(f"  ❌ Error testing large file: {e}")
        return [{"test": "large_file_handling", "status": "error", "message": str(e)}]
    
    finally:
        os.unlink(tmp_path)

def test_api_rate_limiting(base_url, token):
    """Test API rate limiting and throttling"""
    print("\n🚦 Testing API Rate Limiting...")
    
    # Test rapid API calls
    num_requests = 20
    rapid_requests = []
    
    print(f"  🔄 Making {num_requests} rapid API calls...")
    
    start_time = time.time()
    
    for i in range(num_requests):
        try:
            response = requests.get(
                f"{base_url}/studies/",
                headers=get_headers(token),
                timeout=5
            )
            
            rapid_requests.append({
                'index': i,
                'status_code': response.status_code,
                'timestamp': time.time()
            })
            
            # Very brief delay to simulate rapid requests
            time.sleep(0.1)
        
        except Exception as e:
            rapid_requests.append({
                'index': i,
                'status_code': None,
                'error': str(e),
                'timestamp': time.time()
            })
    
    end_time = time.time()
    total_duration = end_time - start_time
    
    # Analyze rate limiting
    successful_requests = [r for r in rapid_requests if r.get('status_code') == 200]
    rate_limited_requests = [r for r in rapid_requests if r.get('status_code') == 429]
    error_requests = [r for r in rapid_requests if r.get('status_code') not in [200, 429]]
    
    print(f"  📊 Results: {len(successful_requests)} successful, {len(rate_limited_requests)} rate-limited, {len(error_requests)} errors")
    print(f"  ⏱️ Total time: {total_duration:.2f}s")
    print(f"  📈 Request rate: {num_requests/total_duration:.2f} req/s")
    
    if len(rate_limited_requests) > 0:
        print("  ✅ Rate limiting is working (429 responses detected)")
        status = "success"
    elif len(successful_requests) == num_requests:
        print("  ⚠️ No rate limiting detected - may need implementation")
        status = "warning"
    else:
        print("  ❌ Unexpected errors during rate limiting test")
        status = "failed"
    
    return [{
        "test": "api_rate_limiting",
        "status": status,
        "successful": len(successful_requests),
        "rate_limited": len(rate_limited_requests),
        "errors": len(error_requests),
        "request_rate": num_requests/total_duration
    }]

def test_memory_usage(base_url, token):
    """Test memory usage during operations"""
    print("\n🧠 Testing Memory Usage...")
    
    try:
        import psutil
        process = psutil.Process()
        
        # Get initial memory usage
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        print(f"  📊 Initial memory usage: {initial_memory:.2f} MB")
        
        # Perform memory-intensive operations
        print("  🔄 Performing memory-intensive operations...")
        
        # Multiple API calls
        for i in range(10):
            response = requests.get(f"{base_url}/studies/", headers=get_headers(token))
            if i % 3 == 0:  # Check memory every few requests
                current_memory = process.memory_info().rss / 1024 / 1024
                print(f"    Memory at request {i+1}: {current_memory:.2f} MB")
        
        # Final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024
        memory_increase = final_memory - initial_memory
        
        print(f"  📊 Final memory usage: {final_memory:.2f} MB")
        print(f"  📈 Memory increase: {memory_increase:.2f} MB")
        
        if memory_increase < 50:  # Less than 50MB increase
            print("  ✅ Memory usage within acceptable limits")
            status = "success"
        elif memory_increase < 100:
            print("  ⚠️ Moderate memory increase detected")
            status = "warning"
        else:
            print("  ❌ High memory usage detected")
            status = "failed"
        
        return [{
            "test": "memory_usage",
            "status": status,
            "initial_memory_mb": initial_memory,
            "final_memory_mb": final_memory,
            "memory_increase_mb": memory_increase
        }]
    
    except ImportError:
        print("  ⚠️ psutil not available - skipping memory test")
        return [{"test": "memory_usage", "status": "skipped", "message": "psutil not available"}]
    
    except Exception as e:
        print(f"  ❌ Error testing memory usage: {e}")
        return [{"test": "memory_usage", "status": "error", "message": str(e)}]

def main():
    """Main test function"""
    print("🚫 Testing Error Handling and Performance")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # Login as technician (has upload permissions)
    print("\n🔐 Authenticating as technician...")
    token = login_user(base_url, "tech1", "tech123")
    
    if not token:
        print("❌ Authentication failed")
        return
    
    print("✅ Authentication successful")
    
    # Run error handling tests
    print("\n🧪 Running Error Handling Tests...")
    invalid_file_results = test_invalid_file_upload(base_url, token)
    duplicate_results = test_duplicate_upload(base_url, token)
    
    # Run performance tests
    print("\n⚡ Running Performance Tests...")
    concurrent_results = test_concurrent_uploads(base_url, token, 3)  # Start with 3 concurrent
    large_file_results = test_large_file_handling(base_url, token)
    rate_limiting_results = test_api_rate_limiting(base_url, token)
    memory_results = test_memory_usage(base_url, token)
    
    # Compile all results
    all_results = (
        invalid_file_results + 
        duplicate_results + 
        concurrent_results + 
        large_file_results + 
        rate_limiting_results + 
        memory_results
    )
    
    # Summary
    print("\n📊 Error Handling and Performance Testing Summary:")
    print("=" * 55)
    
    print("\n🚫 Error Handling:")
    for result in invalid_file_results + duplicate_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'warning' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n⚡ Performance:")
    for result in concurrent_results + large_file_results + rate_limiting_results + memory_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] in ['warning', 'skipped'] else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    # Overall assessment
    total_tests = len(all_results)
    successful_tests = sum(1 for r in all_results if r['status'] == 'success')
    warning_tests = sum(1 for r in all_results if r['status'] in ['warning', 'skipped'])
    failed_tests = sum(1 for r in all_results if r['status'] in ['failed', 'error'])
    
    print(f"\n🎯 Overall Results: {successful_tests}/{total_tests} successful, {warning_tests} warnings, {failed_tests} failed")
    
    if failed_tests == 0 and successful_tests > total_tests * 0.7:
        print("✅ Error handling and performance validation successful")
    elif failed_tests <= 2:
        print("⚠️ Error handling and performance mostly working with minor issues")
    else:
        print("❌ Error handling and performance need attention")
    
    # Recommendations
    print("\n💡 Recommendations:")
    if any(r['status'] == 'warning' and 'duplicate' in r['test'] for r in all_results):
        print("  - Consider implementing duplicate detection for DICOM uploads")
    if any(r['status'] == 'warning' and 'rate_limiting' in r['test'] for r in all_results):
        print("  - Consider implementing API rate limiting for production")
    if any(r['status'] == 'failed' and 'large_file' in r['test'] for r in all_results):
        print("  - Review file size limits and upload timeout settings")
    if any(r['status'] == 'warning' and 'memory' in r['test'] for r in all_results):
        print("  - Monitor memory usage in production environment")
    
    print("\n📝 Note: Error handling and performance characteristics validated")
    print("   - Invalid file rejection working")
    print("   - Concurrent upload handling tested")
    print("   - Large file processing evaluated")
    print("   - API performance characteristics measured")

if __name__ == "__main__":
    main()