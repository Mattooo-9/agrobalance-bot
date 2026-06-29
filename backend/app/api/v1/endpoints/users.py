from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.app.db.session import get_db
from backend.app.db.models import User, TrustEvent, AntiFraudLog
from backend.app.api.deps import get_current_user
from backend.app.services.trust_engine import update_trust_index

router = APIRouter()

class RoleVerificationDetails(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area: Optional[float] = None
    crop: Optional[str] = None
    expected_yield: Optional[float] = None
    photo_url: Optional[str] = None
    
    needed_crops: Optional[str] = None
    desired_volume: Optional[float] = None
    price_range: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    
    vehicle_type: Optional[str] = None
    capacity: Optional[float] = None
    tariff_per_km: Optional[float] = None
    routes: Optional[str] = None
    
    capacity_tons: Optional[float] = None
    storage_conditions: Optional[str] = None
    storage_price: Optional[float] = None


@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "telegram_id": current_user.telegram_id,
        "role": current_user.role,
        "name": current_user.name,
        "phone": current_user.phone,
        "region": current_user.region,
        "trust_index": current_user.trust_index,
        "verification_status": current_user.verification_status,
        
        # Role specific data
        "area": current_user.area,
        "crop": current_user.crop,
        "expected_yield": current_user.expected_yield,
        "photo_url": current_user.photo_url,
        
        "needed_crops": current_user.needed_crops,
        "desired_volume": current_user.desired_volume,
        "price_range": current_user.price_range,
        
        "vehicle_type": current_user.vehicle_type,
        "capacity": current_user.capacity,
        "tariff_per_km": current_user.tariff_per_km,
        
        "capacity_tons": current_user.capacity_tons,
        "storage_price": current_user.storage_price
    }

@router.get("/me/trust-events")
def get_my_trust_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(TrustEvent).filter(TrustEvent.user_id == current_user.id).order_by(TrustEvent.created_at.desc()).all()
    return [{
        "id": e.id,
        "score_change": e.score_change,
        "factor": e.factor,
        "description": e.description,
        "created_at": e.created_at
    } for e in events]

@router.post("/verify-field")
def verify_field_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "Farmer":
        raise HTTPException(status_code=400, detail="Только фермер может верифицировать поле")
    
    # Simulates validation of coordinates & image region match
    update_trust_index(db, current_user.id, "verified_geo")
    update_trust_index(db, current_user.id, "actual_photo")
    update_trust_index(db, current_user.id, "photo_region_match")
    
    current_user.verification_status = "verified"
    db.commit()
    
    return {"status": "success", "trust_index": current_user.trust_index, "verification": "verified"}

@router.post("/verify-role-details")
def verify_role_details(
    details: RoleVerificationDetails,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for field, val in details.dict(exclude_unset=True).items():
        if val is not None:
            setattr(current_user, field, val)
            
    update_trust_index(db, current_user.id, "verified_geo")
    update_trust_index(db, current_user.id, "actual_photo")
    update_trust_index(db, current_user.id, "photo_region_match")
    
    current_user.verification_status = "verified"
    db.commit()
    db.refresh(current_user)
    return read_current_user(current_user)

@router.get("/admin/antifraud-logs")
def get_all_antifraud_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуется роль Admin.")
        
    logs = db.query(AntiFraudLog).order_by(AntiFraudLog.created_at.desc()).all()
    return [{
        "id": l.id,
        "user_id": l.user_id,
        "user_name": l.user.name if l.user else "System",
        "rule_triggered": l.rule_triggered,
        "severity": l.severity,
        "details": l.details,
        "created_at": l.created_at
    } for l in logs]

@router.get("/admin/users")
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуется роль Admin.")
    users = db.query(User).order_by(User.id.desc()).all()
    return [{
        "id": u.id,
        "telegram_id": u.telegram_id,
        "role": u.role,
        "name": u.name,
        "phone": u.phone,
        "region": u.region,
        "trust_index": u.trust_index,
        "verification_status": u.verification_status
    } for u in users]

class AdjustTrustInput(BaseModel):
    user_id: int
    change: float
    reason: str

@router.post("/admin/users/adjust-trust")
def adjust_user_trust(
    input_data: AdjustTrustInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуется роль Admin.")
    user = db.query(User).filter(User.id == input_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.trust_index = max(0.0, min(100.0, user.trust_index + input_data.change))
    
    event = TrustEvent(
        user_id=user.id,
        score_change=input_data.change,
        factor="admin_adjustment",
        description=input_data.reason
    )
    db.add(event)
    db.commit()
    db.refresh(user)
    return {"status": "success", "new_trust_index": user.trust_index}
