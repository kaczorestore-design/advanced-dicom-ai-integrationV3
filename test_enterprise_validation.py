#!/usr/bin/env python3
"""
Enterprise PACS Feature Validation Script
Tests all enterprise features without using python -c
"""

import sys
import os
sys.path.append('/home/ubuntu/pacs-system/pacs-backend')

def test_enterprise_imports():
    """Test that all enterprise modules can be imported"""
    try:
        from app.database import Base, engine, AuditLog
        from app.auth import generate_mfa_secret, generate_qr_code, verify_mfa_token
        from app.dicom_service import DicomNodeConnector
        from app.monitoring import get_metrics
        from app.audit import log_audit_event
        from app.celery_app import process_dicom_study_async
        print('✅ All enterprise modules imported successfully')
        return True
    except Exception as e:
        print(f'❌ Import failed: {e}')
        return False

def test_mfa_functionality():
    """Test MFA functions"""
    try:
        from app.auth import generate_mfa_secret, verify_mfa_token
        secret = generate_mfa_secret()
        print(f'✅ MFA secret generated: {secret[:8]}...')
        return True
    except Exception as e:
        print(f'❌ MFA test failed: {e}')
        return False

def test_dicom_service():
    """Test DICOM service initialization"""
    try:
        from app.dicom_service import DicomNodeConnector
        dicom_service = DicomNodeConnector()
        print('✅ DICOM Node Connector initialized')
        return True
    except Exception as e:
        print(f'❌ DICOM service test failed: {e}')
        return False

def test_database_schema():
    """Test database schema with enterprise features"""
    try:
        from app.database import Base, engine
        Base.metadata.create_all(bind=engine)
        print('✅ Database schema updated with enterprise features')
        return True
    except Exception as e:
        print(f'❌ Database schema test failed: {e}')
        return False

def main():
    """Run all enterprise feature tests"""
    print('🩻 Testing Enterprise PACS Features')
    print('=' * 50)
    
    tests = [
        test_enterprise_imports,
        test_mfa_functionality,
        test_dicom_service,
        test_database_schema
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f'\n📊 Test Results: {passed}/{total} tests passed')
    
    if passed == total:
        print('🎉 All enterprise features ready!')
        return True
    else:
        print('❌ Some enterprise features failed')
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
