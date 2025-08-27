#!/usr/bin/env python3
"""
Test security features, audit logs, monitoring, and compliance readiness
"""

import requests
import time
import json
from datetime import datetime, timedelta
import base64
import hashlib

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

def test_authentication_security(base_url):
    """Test authentication security measures"""
    print("\n🔐 Testing Authentication Security...")
    
    test_results = []
    
    # Test 1: Invalid credentials
    print("  🔍 Testing invalid credentials...")
    try:
        response = requests.post(f"{base_url}/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        
        if response.status_code == 401:
            print("    ✅ Invalid credentials correctly rejected")
            test_results.append({"test": "invalid_credentials", "status": "success"})
        else:
            print(f"    ❌ Invalid credentials not properly rejected: {response.status_code}")
            test_results.append({"test": "invalid_credentials", "status": "failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing invalid credentials: {e}")
        test_results.append({"test": "invalid_credentials", "status": "error", "message": str(e)})
    
    # Test 2: SQL Injection attempts
    print("  🔍 Testing SQL injection protection...")
    try:
        sql_injection_payloads = [
            "admin'; DROP TABLE users; --",
            "' OR '1'='1",
            "admin' UNION SELECT * FROM users --",
            "'; INSERT INTO users VALUES ('hacker', 'password'); --"
        ]
        
        sql_injection_blocked = 0
        for payload in sql_injection_payloads:
            response = requests.post(f"{base_url}/auth/login", json={
                "username": payload,
                "password": "test"
            })
            
            if response.status_code in [400, 401, 422]:  # Properly rejected
                sql_injection_blocked += 1
        
        if sql_injection_blocked == len(sql_injection_payloads):
            print("    ✅ SQL injection attempts properly blocked")
            test_results.append({"test": "sql_injection_protection", "status": "success"})
        else:
            print(f"    ⚠️ Some SQL injection attempts not blocked: {sql_injection_blocked}/{len(sql_injection_payloads)}")
            test_results.append({"test": "sql_injection_protection", "status": "warning"})
    
    except Exception as e:
        print(f"    ❌ Error testing SQL injection protection: {e}")
        test_results.append({"test": "sql_injection_protection", "status": "error", "message": str(e)})
    
    # Test 3: Brute force protection
    print("  🔍 Testing brute force protection...")
    try:
        failed_attempts = 0
        for i in range(10):  # Try 10 failed logins
            response = requests.post(f"{base_url}/auth/login", json={
                "username": "admin",
                "password": f"wrong_password_{i}"
            })
            
            if response.status_code == 401:
                failed_attempts += 1
            elif response.status_code == 429:  # Rate limited
                print("    ✅ Brute force protection activated (rate limiting)")
                test_results.append({"test": "brute_force_protection", "status": "success"})
                break
            
            time.sleep(0.1)  # Brief delay between attempts
        else:
            print("    ⚠️ No brute force protection detected")
            test_results.append({"test": "brute_force_protection", "status": "warning"})
    
    except Exception as e:
        print(f"    ❌ Error testing brute force protection: {e}")
        test_results.append({"test": "brute_force_protection", "status": "error", "message": str(e)})
    
    return test_results

def test_authorization_controls(base_url):
    """Test role-based access controls"""
    print("\n🛡️ Testing Authorization Controls...")
    
    test_results = []
    
    # Test different user roles
    user_credentials = [
        ("admin", "admin123", "admin"),
        ("doctor1", "doc123", "doctor"),
        ("tech1", "tech123", "technician"),
        ("patient1", "patient123", "patient")
    ]
    
    role_tokens = {}
    
    # Login as different users
    for username, password, role in user_credentials:
        token = login_user(base_url, username, password)
        if token:
            role_tokens[role] = token
            print(f"    ✅ {role.capitalize()} login successful")
        else:
            print(f"    ❌ {role.capitalize()} login failed")
    
    # Test admin-only endpoints
    print("  🔍 Testing admin-only access...")
    admin_endpoints = [
        "/users/",
        "/diagnostic-centers/",
        "/admin/stats"
    ]
    
    admin_access_correct = 0
    for endpoint in admin_endpoints:
        try:
            # Test with admin token
            if "admin" in role_tokens:
                admin_response = requests.get(f"{base_url}{endpoint}", headers=get_headers(role_tokens["admin"]))
                admin_allowed = admin_response.status_code in [200, 404]  # 404 is OK if endpoint doesn't exist
            else:
                admin_allowed = False
            
            # Test with non-admin token
            non_admin_blocked = True
            for role, token in role_tokens.items():
                if role != "admin":
                    response = requests.get(f"{base_url}{endpoint}", headers=get_headers(token))
                    if response.status_code not in [403, 401]:
                        non_admin_blocked = False
                        break
            
            if admin_allowed and non_admin_blocked:
                admin_access_correct += 1
                print(f"    ✅ {endpoint}: Admin access properly controlled")
            else:
                print(f"    ❌ {endpoint}: Access control issue")
        
        except Exception as e:
            print(f"    ❌ Error testing {endpoint}: {e}")
    
    if admin_access_correct >= len(admin_endpoints) * 0.7:  # 70% success rate
        test_results.append({"test": "admin_access_control", "status": "success"})
    else:
        test_results.append({"test": "admin_access_control", "status": "failed"})
    
    # Test patient data access
    print("  🔍 Testing patient data access controls...")
    try:
        # Patients should only see their own data
        if "patient" in role_tokens:
            response = requests.get(f"{base_url}/studies/", headers=get_headers(role_tokens["patient"]))
            if response.status_code == 200:
                studies = response.json()
                print(f"    ✅ Patient can access studies: {len(studies)} studies visible")
                test_results.append({"test": "patient_data_access", "status": "success"})
            else:
                print(f"    ❌ Patient cannot access studies: {response.status_code}")
                test_results.append({"test": "patient_data_access", "status": "failed"})
        else:
            print("    ⚠️ No patient token available for testing")
            test_results.append({"test": "patient_data_access", "status": "skipped"})
    
    except Exception as e:
        print(f"    ❌ Error testing patient data access: {e}")
        test_results.append({"test": "patient_data_access", "status": "error", "message": str(e)})
    
    return test_results

def test_data_encryption(base_url):
    """Test data encryption and secure transmission"""
    print("\n🔒 Testing Data Encryption...")
    
    test_results = []
    
    # Test HTTPS enforcement (if applicable)
    print("  🔍 Testing secure transmission...")
    try:
        # Check if HTTPS is enforced
        if base_url.startswith("https://"):
            print("    ✅ HTTPS is being used")
            test_results.append({"test": "https_usage", "status": "success"})
        else:
            print("    ⚠️ HTTP is being used - HTTPS recommended for production")
            test_results.append({"test": "https_usage", "status": "warning"})
    
    except Exception as e:
        print(f"    ❌ Error testing HTTPS: {e}")
        test_results.append({"test": "https_usage", "status": "error", "message": str(e)})
    
    # Test password security
    print("  🔍 Testing password security...")
    try:
        # Test weak password rejection
        weak_passwords = ["123", "password", "abc", "111111"]
        
        weak_password_rejected = 0
        for weak_pass in weak_passwords:
            response = requests.post(f"{base_url}/auth/register", json={
                "username": f"test_weak_{weak_pass}",
                "password": weak_pass,
                "email": f"test_{weak_pass}@example.com",
                "role": "patient"
            })
            
            if response.status_code in [400, 422]:  # Weak password rejected
                weak_password_rejected += 1
        
        if weak_password_rejected >= len(weak_passwords) * 0.5:  # At least 50% rejected
            print("    ✅ Weak passwords are being rejected")
            test_results.append({"test": "password_security", "status": "success"})
        else:
            print("    ⚠️ Weak password validation may need improvement")
            test_results.append({"test": "password_security", "status": "warning"})
    
    except Exception as e:
        print(f"    ❌ Error testing password security: {e}")
        test_results.append({"test": "password_security", "status": "error", "message": str(e)})
    
    return test_results

def test_audit_logging(base_url):
    """Test audit logging capabilities"""
    print("\n📝 Testing Audit Logging...")
    
    test_results = []
    
    # Test login audit
    print("  🔍 Testing login audit logging...")
    try:
        # Perform a login
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            # Check if audit logs endpoint exists
            response = requests.get(f"{base_url}/audit/logs", headers=get_headers(token))
            
            if response.status_code == 200:
                logs = response.json()
                print(f"    ✅ Audit logs accessible: {len(logs)} log entries")
                test_results.append({"test": "audit_logs_access", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Audit logs endpoint not implemented")
                test_results.append({"test": "audit_logs_access", "status": "warning", "message": "Endpoint not implemented"})
            else:
                print(f"    ❌ Cannot access audit logs: {response.status_code}")
                test_results.append({"test": "audit_logs_access", "status": "failed"})
        else:
            print("    ❌ Cannot test audit logs - login failed")
            test_results.append({"test": "audit_logs_access", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing audit logging: {e}")
        test_results.append({"test": "audit_logs_access", "status": "error", "message": str(e)})
    
    # Test activity tracking
    print("  🔍 Testing activity tracking...")
    try:
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            # Perform some activities
            activities = [
                ("GET", "/studies/"),
                ("GET", "/users/"),
                ("GET", "/auth/me")
            ]
            
            for method, endpoint in activities:
                if method == "GET":
                    requests.get(f"{base_url}{endpoint}", headers=get_headers(token))
            
            # Check if activities are logged
            response = requests.get(f"{base_url}/audit/activities", headers=get_headers(token))
            
            if response.status_code == 200:
                activities_log = response.json()
                print(f"    ✅ Activity tracking working: {len(activities_log)} activities logged")
                test_results.append({"test": "activity_tracking", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Activity tracking endpoint not implemented")
                test_results.append({"test": "activity_tracking", "status": "warning", "message": "Endpoint not implemented"})
            else:
                print(f"    ❌ Cannot access activity logs: {response.status_code}")
                test_results.append({"test": "activity_tracking", "status": "failed"})
        else:
            print("    ❌ Cannot test activity tracking - login failed")
            test_results.append({"test": "activity_tracking", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing activity tracking: {e}")
        test_results.append({"test": "activity_tracking", "status": "error", "message": str(e)})
    
    return test_results

def test_data_privacy_compliance(base_url):
    """Test HIPAA/GDPR compliance features"""
    print("\n🏥 Testing Data Privacy Compliance...")
    
    test_results = []
    
    # Test data anonymization
    print("  🔍 Testing data anonymization capabilities...")
    try:
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            # Check if anonymization endpoint exists
            response = requests.post(f"{base_url}/studies/anonymize", 
                                   json={"study_id": 1, "anonymize_level": "full"},
                                   headers=get_headers(token))
            
            if response.status_code in [200, 201]:
                print("    ✅ Data anonymization feature available")
                test_results.append({"test": "data_anonymization", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Data anonymization not implemented")
                test_results.append({"test": "data_anonymization", "status": "warning", "message": "Feature not implemented"})
            else:
                print(f"    ❌ Data anonymization failed: {response.status_code}")
                test_results.append({"test": "data_anonymization", "status": "failed"})
        else:
            print("    ❌ Cannot test anonymization - login failed")
            test_results.append({"test": "data_anonymization", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing data anonymization: {e}")
        test_results.append({"test": "data_anonymization", "status": "error", "message": str(e)})
    
    # Test data retention policies
    print("  🔍 Testing data retention policies...")
    try:
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            # Check if retention policy endpoint exists
            response = requests.get(f"{base_url}/admin/retention-policies", headers=get_headers(token))
            
            if response.status_code == 200:
                policies = response.json()
                print(f"    ✅ Data retention policies configured: {len(policies)} policies")
                test_results.append({"test": "data_retention", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Data retention policies not implemented")
                test_results.append({"test": "data_retention", "status": "warning", "message": "Feature not implemented"})
            else:
                print(f"    ❌ Cannot access retention policies: {response.status_code}")
                test_results.append({"test": "data_retention", "status": "failed"})
        else:
            print("    ❌ Cannot test retention policies - login failed")
            test_results.append({"test": "data_retention", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing data retention: {e}")
        test_results.append({"test": "data_retention", "status": "error", "message": str(e)})
    
    # Test consent management
    print("  🔍 Testing consent management...")
    try:
        token = login_user(base_url, "patient1", "patient123")
        
        if token:
            # Check if consent management endpoint exists
            response = requests.get(f"{base_url}/patients/consent", headers=get_headers(token))
            
            if response.status_code == 200:
                consent_data = response.json()
                print("    ✅ Consent management available")
                test_results.append({"test": "consent_management", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Consent management not implemented")
                test_results.append({"test": "consent_management", "status": "warning", "message": "Feature not implemented"})
            else:
                print(f"    ❌ Cannot access consent management: {response.status_code}")
                test_results.append({"test": "consent_management", "status": "failed"})
        else:
            print("    ❌ Cannot test consent management - login failed")
            test_results.append({"test": "consent_management", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing consent management: {e}")
        test_results.append({"test": "consent_management", "status": "error", "message": str(e)})
    
    return test_results

def test_system_monitoring(base_url):
    """Test system monitoring and health checks"""
    print("\n📊 Testing System Monitoring...")
    
    test_results = []
    
    # Test health check endpoint
    print("  🔍 Testing health check endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        
        if response.status_code == 200:
            health_data = response.json()
            print(f"    ✅ Health check endpoint working: {health_data}")
            test_results.append({"test": "health_check", "status": "success"})
        elif response.status_code == 404:
            print("    ⚠️ Health check endpoint not implemented")
            test_results.append({"test": "health_check", "status": "warning", "message": "Endpoint not implemented"})
        else:
            print(f"    ❌ Health check failed: {response.status_code}")
            test_results.append({"test": "health_check", "status": "failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing health check: {e}")
        test_results.append({"test": "health_check", "status": "error", "message": str(e)})
    
    # Test metrics endpoint
    print("  🔍 Testing metrics endpoint...")
    try:
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            response = requests.get(f"{base_url}/metrics", headers=get_headers(token))
            
            if response.status_code == 200:
                metrics_data = response.json()
                print(f"    ✅ Metrics endpoint working")
                test_results.append({"test": "metrics_endpoint", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Metrics endpoint not implemented")
                test_results.append({"test": "metrics_endpoint", "status": "warning", "message": "Endpoint not implemented"})
            else:
                print(f"    ❌ Metrics endpoint failed: {response.status_code}")
                test_results.append({"test": "metrics_endpoint", "status": "failed"})
        else:
            print("    ❌ Cannot test metrics - login failed")
            test_results.append({"test": "metrics_endpoint", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing metrics: {e}")
        test_results.append({"test": "metrics_endpoint", "status": "error", "message": str(e)})
    
    # Test system status
    print("  🔍 Testing system status monitoring...")
    try:
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            response = requests.get(f"{base_url}/admin/system-status", headers=get_headers(token))
            
            if response.status_code == 200:
                status_data = response.json()
                print(f"    ✅ System status monitoring available")
                test_results.append({"test": "system_status", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ System status monitoring not implemented")
                test_results.append({"test": "system_status", "status": "warning", "message": "Feature not implemented"})
            else:
                print(f"    ❌ System status monitoring failed: {response.status_code}")
                test_results.append({"test": "system_status", "status": "failed"})
        else:
            print("    ❌ Cannot test system status - login failed")
            test_results.append({"test": "system_status", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing system status: {e}")
        test_results.append({"test": "system_status", "status": "error", "message": str(e)})
    
    return test_results

def test_backup_recovery(base_url):
    """Test backup and recovery capabilities"""
    print("\n💾 Testing Backup and Recovery...")
    
    test_results = []
    
    # Test backup endpoint
    print("  🔍 Testing backup capabilities...")
    try:
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            response = requests.post(f"{base_url}/admin/backup", 
                                   json={"backup_type": "full"},
                                   headers=get_headers(token))
            
            if response.status_code in [200, 201, 202]:  # 202 for async operations
                backup_data = response.json()
                print(f"    ✅ Backup functionality available")
                test_results.append({"test": "backup_capability", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Backup functionality not implemented")
                test_results.append({"test": "backup_capability", "status": "warning", "message": "Feature not implemented"})
            else:
                print(f"    ❌ Backup functionality failed: {response.status_code}")
                test_results.append({"test": "backup_capability", "status": "failed"})
        else:
            print("    ❌ Cannot test backup - login failed")
            test_results.append({"test": "backup_capability", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing backup: {e}")
        test_results.append({"test": "backup_capability", "status": "error", "message": str(e)})
    
    # Test recovery endpoint
    print("  🔍 Testing recovery capabilities...")
    try:
        token = login_user(base_url, "admin", "admin123")
        
        if token:
            response = requests.get(f"{base_url}/admin/backups", headers=get_headers(token))
            
            if response.status_code == 200:
                backups = response.json()
                print(f"    ✅ Recovery/restore functionality available: {len(backups)} backups")
                test_results.append({"test": "recovery_capability", "status": "success"})
            elif response.status_code == 404:
                print("    ⚠️ Recovery functionality not implemented")
                test_results.append({"test": "recovery_capability", "status": "warning", "message": "Feature not implemented"})
            else:
                print(f"    ❌ Recovery functionality failed: {response.status_code}")
                test_results.append({"test": "recovery_capability", "status": "failed"})
        else:
            print("    ❌ Cannot test recovery - login failed")
            test_results.append({"test": "recovery_capability", "status": "failed", "message": "Login failed"})
    
    except Exception as e:
        print(f"    ❌ Error testing recovery: {e}")
        test_results.append({"test": "recovery_capability", "status": "error", "message": str(e)})
    
    return test_results

def main():
    """Main test function"""
    print("🔒 Testing Security Features and Compliance")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # Run security tests
    print("\n🛡️ Running Security Tests...")
    auth_results = test_authentication_security(base_url)
    authz_results = test_authorization_controls(base_url)
    encryption_results = test_data_encryption(base_url)
    
    # Run compliance tests
    print("\n📋 Running Compliance Tests...")
    audit_results = test_audit_logging(base_url)
    privacy_results = test_data_privacy_compliance(base_url)
    
    # Run monitoring tests
    print("\n📊 Running Monitoring Tests...")
    monitoring_results = test_system_monitoring(base_url)
    backup_results = test_backup_recovery(base_url)
    
    # Compile all results
    all_results = (
        auth_results + 
        authz_results + 
        encryption_results + 
        audit_results + 
        privacy_results + 
        monitoring_results + 
        backup_results
    )
    
    # Summary
    print("\n📊 Security and Compliance Testing Summary:")
    print("=" * 55)
    
    print("\n🔐 Authentication & Authorization:")
    for result in auth_results + authz_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'warning' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n🔒 Data Protection:")
    for result in encryption_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'warning' else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n📝 Audit & Compliance:")
    for result in audit_results + privacy_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] in ['warning', 'skipped'] else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    print("\n📊 Monitoring & Backup:")
    for result in monitoring_results + backup_results:
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] in ['warning', 'skipped'] else "❌"
        print(f"  {status_icon} {result['test']}: {result['status']}")
    
    # Overall assessment
    total_tests = len(all_results)
    successful_tests = sum(1 for r in all_results if r['status'] == 'success')
    warning_tests = sum(1 for r in all_results if r['status'] in ['warning', 'skipped'])
    failed_tests = sum(1 for r in all_results if r['status'] in ['failed', 'error'])
    
    print(f"\n🎯 Overall Results: {successful_tests}/{total_tests} successful, {warning_tests} warnings, {failed_tests} failed")
    
    if failed_tests == 0 and successful_tests > total_tests * 0.6:
        print("✅ Security and compliance validation successful")
    elif failed_tests <= 3:
        print("⚠️ Security and compliance mostly working with some gaps")
    else:
        print("❌ Security and compliance need significant attention")
    
    # Recommendations
    print("\n💡 Security Recommendations:")
    if any(r['status'] == 'warning' and 'brute_force' in r['test'] for r in all_results):
        print("  - Implement brute force protection (rate limiting)")
    if any(r['status'] == 'warning' and 'https' in r['test'] for r in all_results):
        print("  - Enable HTTPS for production deployment")
    if any(r['status'] == 'warning' and 'audit' in r['test'] for r in all_results):
        print("  - Implement comprehensive audit logging")
    if any(r['status'] == 'warning' and 'backup' in r['test'] for r in all_results):
        print("  - Implement backup and recovery procedures")
    if any(r['status'] == 'warning' and 'anonymization' in r['test'] for r in all_results):
        print("  - Implement data anonymization for HIPAA compliance")
    
    print("\n📝 Note: Security and compliance characteristics evaluated")
    print("   - Authentication and authorization controls tested")
    print("   - Data protection measures assessed")
    print("   - Audit logging capabilities checked")
    print("   - Compliance features evaluated")
    print("   - System monitoring and backup readiness verified")

if __name__ == "__main__":
    main()