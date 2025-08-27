from app.database import engine, Base, SessionLocal
from app.database import User, DiagnosticCenter, UserRole
from app.auth import get_password_hash

def init_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("Database tables created successfully with updated schema")
    print("New features:")
    print("- Added QUEUED and PROCESSING status values")
    print("- Added priority field to Study model")
    print("- Updated storage quota tracking")
    print("- Enhanced deletion request workflow")
    
    db = SessionLocal()
    
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                email="admin@pacs.com",
                username="admin",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            
        center = db.query(DiagnosticCenter).filter(DiagnosticCenter.name == "Main Diagnostic Center").first()
        if not center:
            center = DiagnosticCenter(
                name="Main Diagnostic Center",
                address="123 Medical Street, Healthcare City",
                phone="+1-555-0123",
                email="info@maindiagnostic.com",
                is_active=True
            )
            db.add(center)
            db.commit()
            db.refresh(center)
        
        sample_users = [
            {
                "email": "radiologist@pacs.com",
                "username": "radiologist1",
                "full_name": "Dr. John Radiologist",
                "password": "radio123",
                "role": UserRole.RADIOLOGIST,
                "diagnostic_center_id": center.id
            },
            {
                "email": "doctor@pacs.com", 
                "username": "doctor1",
                "full_name": "Dr. Jane Doctor",
                "password": "doctor123",
                "role": UserRole.DOCTOR,
                "diagnostic_center_id": center.id
            },
            {
                "email": "tech@pacs.com",
                "username": "tech1", 
                "full_name": "Mike Technician",
                "password": "tech123",
                "role": UserRole.TECHNICIAN,
                "diagnostic_center_id": center.id
            },
            {
                "email": "centeradmin@pacs.com",
                "username": "centeradmin1",
                "full_name": "Sarah Center Admin", 
                "password": "center123",
                "role": UserRole.DIAGNOSTIC_CENTER_ADMIN,
                "diagnostic_center_id": center.id
            }
        ]
        
        for user_data in sample_users:
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing_user:
                user = User(
                    email=user_data["email"],
                    username=user_data["username"],
                    full_name=user_data["full_name"],
                    hashed_password=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    diagnostic_center_id=user_data.get("diagnostic_center_id"),
                    is_active=True
                )
                db.add(user)
        
        db.commit()
        print("Database initialized successfully!")
        print("\nDefault users created:")
        print("Admin: admin / admin123")
        print("Radiologist: radiologist1 / radio123")
        print("Doctor: doctor1 / doctor123")
        print("Technician: tech1 / tech123")
        print("Center Admin: centeradmin1 / center123")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
