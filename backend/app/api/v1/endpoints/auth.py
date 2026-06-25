from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.core.security import create_access_token
from backend.app.services.antifraud import run_registration_antifraud_checks

router = APIRouter()

class UserRegister(BaseModel):
    telegram_id: Optional[str] = None
    role: str  # Farmer, Buyer, Carrier, Warehouse, Processor, Supplier, Agronomist, Admin
    name: str
    phone: str
    region: Optional[str] = None
    
    # Farmer fields
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area: Optional[float] = None
    crop: Optional[str] = None
    expected_yield: Optional[float] = None
    planting_date_str: Optional[str] = None
    harvest_date_str: Optional[str] = None
    photo_url: Optional[str] = None
    photo_hash: Optional[str] = None
    
    # Buyer fields
    needed_crops: Optional[str] = None
    desired_volume: Optional[float] = None
    price_range: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    
    # Carrier fields
    vehicle_type: Optional[str] = None
    capacity: Optional[float] = None
    tariff_per_km: Optional[float] = None
    routes: Optional[str] = None
    
    # Warehouse fields
    capacity_tons: Optional[float] = None
    storage_conditions: Optional[str] = None
    storage_price: Optional[float] = None


class UserLogin(BaseModel):
    telegram_id: str
    phone: Optional[str] = None

@router.post("/register")
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    if user_in.telegram_id:
        existing = db.query(User).filter(User.telegram_id == user_in.telegram_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Пользователь с таким Telegram ID уже зарегистрирован")

    user = User(
        telegram_id=user_in.telegram_id,
        role=user_in.role,
        name=user_in.name,
        phone=user_in.phone,
        region=user_in.region,
        latitude=user_in.latitude,
        longitude=user_in.longitude,
        area=user_in.area,
        crop=user_in.crop,
        expected_yield=user_in.expected_yield,
        photo_url=user_in.photo_url,
        photo_hash=user_in.photo_hash,
        needed_crops=user_in.needed_crops,
        desired_volume=user_in.desired_volume,
        price_range=user_in.price_range,
        payment_terms=user_in.payment_terms,
        delivery_terms=user_in.delivery_terms,
        vehicle_type=user_in.vehicle_type,
        capacity=user_in.capacity,
        tariff_per_km=user_in.tariff_per_km,
        routes=user_in.routes,
        capacity_tons=user_in.capacity_tons,
        storage_conditions=user_in.storage_conditions,
        storage_price=user_in.storage_price,
        trust_index=50.0,  # starts mid-tier
        verification_status="pending"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Run AntiFraud Checks (modifies trust index & logs)
    fraud_flags = run_registration_antifraud_checks(db, user)

    # Generate token
    token = create_access_token(user.id)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "trust_index": user.trust_index,
        "fraud_flags_triggered": len(fraud_flags) > 0,
        "fraud_details": fraud_flags
    }

@router.post("/login")
def login_user(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == login_in.telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден. Пройдите регистрацию.")
        
    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "trust_index": user.trust_index
    }
