from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, User, DiagnosticCenter, UserRole
from ..auth import require_diagnostic_center_admin, get_current_user, get_password_hash
from .. import schemas

router = APIRouter(prefix="/diagnostic-center", tags=["diagnostic-center"])


@router.get("/users", response_model=List[schemas.User])
async def get_center_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_diagnostic_center_admin),
):
    if current_user.role == UserRole.ADMIN:
        users = db.query(User).all()
    else:
        users = (
            db.query(User)
            .filter(User.diagnostic_center_id == current_user.diagnostic_center_id)
            .all()
        )
    return users


@router.post("/users", response_model=schemas.User)
async def create_center_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_diagnostic_center_admin),
):
    if current_user.role != UserRole.ADMIN:
        user_data.diagnostic_center_id = current_user.diagnostic_center_id

    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        diagnostic_center_id=user_data.diagnostic_center_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_diagnostic_center_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if (
        current_user.role != UserRole.ADMIN
        and user.diagnostic_center_id != current_user.diagnostic_center_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    user.is_active = is_active
    db.commit()
    return {
        "message": f"User {'activated' if is_active else 'deactivated'} successfully"
    }


@router.get("/info", response_model=schemas.DiagnosticCenter)
async def get_center_info(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    from ..error_handlers import NotFoundError

    if not current_user.diagnostic_center_id:
        raise NotFoundError(
            "Diagnostic Center",
            details={
                "user_id": current_user.id,
                "reason": "No diagnostic center associated with user",
            },
        )

    center = (
        db.query(DiagnosticCenter)
        .filter(DiagnosticCenter.id == current_user.diagnostic_center_id)
        .first()
    )
    if not center:
        raise NotFoundError(
            "Diagnostic Center",
            current_user.diagnostic_center_id,
            details={"user_id": current_user.id},
        )

    return center
