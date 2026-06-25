from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, TrustEvent, AntiFraudLog
from backend.app.api.deps import get_current_user
from backend.app.services.trust_engine import update_trust_index

router = APIRouter()

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
