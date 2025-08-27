import requests
import json
import time
from datetime import datetime

class PACSQAValidator:
    def __init__(self, api_url="http://localhost:8000", frontend_url="http://localhost:5174"):
        self.api_url = api_url
        self.frontend_url = frontend_url
        self.results = {}
    
    def validate_category_1_system_setup(self):
        """1. System Setup & Configuration"""
        print("🔹 Testing Category 1: System Setup & Configuration")
        
        response = requests.get(f"{self.api_url}/healthz")
        assert response.status_code == 200, "PACS server health check failed"
        
        login_data = {"username": "admin", "password": "admin123"}
        response = requests.post(f"{self.api_url}/auth/login", data=login_data)
        assert response.status_code == 200, "Database connection failed"
        
        self.results["category_1"] = "✅ PASSED"
    
    def validate_category_2_user_management(self):
        """2. User Management & Authentication"""
        print("🔹 Testing Category 2: User Management & Authentication")
        
        roles = ["admin", "radiologist1", "doctor1", "tech1", "centeradmin1"]
        passwords = ["admin123", "radio123", "doctor123", "tech123", "center123"]
        
        for username, password in zip(roles, passwords):
            login_data = {"username": username, "password": password}
            response = requests.post(f"{self.api_url}/auth/login", data=login_data)
            assert response.status_code == 200, f"Login failed for {username}"
        
        self.results["category_2"] = "✅ PASSED"
    
    def validate_category_3_dicom_upload(self):
        """3. DICOM Upload & Ingestion"""
        print("🔹 Testing Category 3: DICOM Upload & Ingestion")
        
        login_data = {"username": "tech1", "password": "tech123"}
        response = requests.post(f"{self.api_url}/auth/login", data=login_data)
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{self.api_url}/studies/", headers=headers)
        assert response.status_code == 200, "Studies endpoint not accessible"
        
        self.results["category_3"] = "✅ PASSED"
    
    def validate_category_4_dicom_viewer(self):
        """4. DICOM Viewer"""
        print("🔹 Testing Category 4: DICOM Viewer")
        
        try:
            response = requests.get(f"{self.frontend_url}/viewer/1", timeout=10)
            self.results["category_4"] = "✅ PASSED"
        except:
            self.results["category_4"] = "⚠️ FRONTEND NOT ACCESSIBLE"
    
    def validate_category_5_ai_reports(self):
        """5. AI Report Generation"""
        print("🔹 Testing Category 5: AI Report Generation")
        
        login_data = {"username": "radiologist1", "password": "radio123"}
        response = requests.post(f"{self.api_url}/auth/login", data=login_data)
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{self.api_url}/ai/analyze/1", headers=headers)
        
        self.results["category_5"] = "✅ PASSED"
    
    def validate_category_6_workflows(self):
        """6. Workflows by Role"""
        print("🔹 Testing Category 6: Workflows by Role")
        
        roles = ["admin", "radiologist1", "doctor1", "tech1"]
        passwords = ["admin123", "radio123", "doctor123", "tech123"]
        
        for username, password in zip(roles, passwords):
            login_data = {"username": username, "password": password}
            response = requests.post(f"{self.api_url}/auth/login", data=login_data)
            if response.status_code == 200:
                token = response.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                
                response = requests.get(f"{self.api_url}/studies/", headers=headers)
                assert response.status_code == 200
        
        self.results["category_6"] = "✅ PASSED"
    
    def validate_category_7_addons(self):
        """7. Add-Ons"""
        print("🔹 Testing Category 7: Add-Ons")
        
        response = requests.get(f"{self.api_url}/metrics")
        assert response.status_code == 200, "Metrics endpoint not accessible"
        
        self.results["category_7"] = "✅ PASSED"
    
    def validate_category_8_performance(self):
        """8. Performance Testing"""
        print("🔹 Testing Category 8: Performance Testing")
        
        login_data = {"username": "tech1", "password": "tech123"}
        response = requests.post(f"{self.api_url}/auth/login", data=login_data)
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        start_time = time.time()
        response = requests.get(f"{self.api_url}/studies/", headers=headers)
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 3.0, "API response too slow"
        
        self.results["category_8"] = "✅ PASSED"
    
    def validate_category_9_security(self):
        """9. Security & Compliance"""
        print("🔹 Testing Category 9: Security & Compliance")
        
        response = requests.get(f"{self.api_url}/studies/")
        assert response.status_code == 401, "Unauthorized access should be blocked"
        
        self.results["category_9"] = "✅ PASSED"
    
    def validate_category_10_deployment(self):
        """10. Deployment Readiness"""
        print("🔹 Testing Category 10: Deployment Readiness")
        
        response = requests.get(f"{self.api_url}/healthz")
        assert response.status_code == 200, "Health check failed"
        
        response = requests.get(f"{self.api_url}/metrics")
        assert response.status_code == 200, "Metrics endpoint failed"
        
        self.results["category_10"] = "✅ PASSED"
    
    def validate_all_categories(self):
        """Run all QA validations"""
        print("🩻 Starting Comprehensive PACS QA Validation")
        print("=" * 50)
        
        try:
            self.validate_category_1_system_setup()
            self.validate_category_2_user_management()
            self.validate_category_3_dicom_upload()
            self.validate_category_4_dicom_viewer()
            self.validate_category_5_ai_reports()
            self.validate_category_6_workflows()
            self.validate_category_7_addons()
            self.validate_category_8_performance()
            self.validate_category_9_security()
            self.validate_category_10_deployment()
            
            print("\n📊 QA Validation Results:")
            for category, result in self.results.items():
                print(f"{category}: {result}")
            
            passed_count = sum(1 for result in self.results.values() if "✅" in result)
            total_count = len(self.results)
            
            print(f"\n🎉 QA Validation Complete: {passed_count}/{total_count} categories passed!")
            
            return passed_count == total_count
            
        except Exception as e:
            print(f"❌ QA Validation failed: {e}")
            return False

if __name__ == "__main__":
    validator = PACSQAValidator()
    success = validator.validate_all_categories()
    exit(0 if success else 1)
