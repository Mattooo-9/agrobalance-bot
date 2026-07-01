from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
import json
import httpx
import re
from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.core.security import create_access_token
from backend.app.services.antifraud import run_registration_antifraud_checks
from backend.app.core.config import settings

router = APIRouter()

class ParseDescription(BaseModel):
    description: str

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

@router.post("/parse-desc")
def parse_description(payload: ParseDescription):
    desc = payload.description
    
    # Try calling Gemini
    if settings.GEMINI_API_KEY:
        prompt = f"""
        Вы — ИИ-ассистент платформы AgroBalance. Проанализируйте следующий текст регистрации пользователя и извлеките все возможные параметры:
        "{desc}"
        
        Верните строго JSON-объект со следующими полями (если какое-то поле не найдено, оставьте null или пустую строку):
        {{
          "role": "Farmer" | "Buyer" | "Carrier" | "Warehouse" | "Processor" | "Supplier" | "Agronomist",
          "name": "Название организации или имя пользователя",
          "phone": "номер телефона",
          "region": "Европа" | "СНГ" | "Азия" | "Северная Америка" | "Латинская Америка" | "Ближний Восток",
          "country": "название страны",
          "locality": "область/штат/район",
          "crop": "выращиваемая культура (только для Farmer)",
          "area": число (площадь в га, только для Farmer),
          "expected_yield": число (урожай в тоннах, только для Farmer),
          "needed_crops": "интересующие культуры (только для Buyer)",
          "payment_terms": "условия оплаты",
          "delivery_terms": "условия доставки",
          "vehicle_type": "тип транспорта (только для Carrier)",
          "capacity": число (грузоподъемность в тоннах, только для Carrier),
          "tariff_per_km": число (тариф за км, только для Carrier),
          "capacity_tons": число (вместимость склада в тоннах, только для Warehouse),
          "storage_price": число (цена хранения за тонну, только для Warehouse)
        }}
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        req_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, headers=headers, json=req_payload)
                if res.status_code == 200:
                    data = res.json()
                    text = data['candidates'][0]['content']['parts'][0]['text']
                    return json.loads(text)
        except Exception as e:
            print(f"Gemini API parse failed: {e}")
            
    # Local fallback nlp parser
    desc_lower = desc.lower()
    role = "Farmer"
    if any(k in desc_lower for k in ["покуп", "купл", "buyer", "приобрет"]):
        role = "Buyer"
    elif any(k in desc_lower for k in ["перевоз", "трансп", "carrier", "груз", "достав", "фура"]):
        role = "Carrier"
    elif any(k in desc_lower for k in ["склад", "элев", "warehouse", "хран"]):
        role = "Warehouse"
        
    numbers = [float(n) for n in re.findall(r'\d+(?:\.\d+)?', desc)]
    
    phone = ""
    phone_match = re.search(r'\+?\d[\d\-\s\(\)]{8,15}\d', desc)
    if phone_match:
        phone = phone_match.group(0)
        
    # Extract region / country / locality guesses
    region = "СНГ"
    if any(k in desc_lower for k in ["герм", "германия", "франц", "европ", "germany", "france"]):
        region = "Европа"
    elif any(k in desc_lower for k in ["сша", "usa", "америк", "canada", "канад"]):
        region = "Северная Америка"
    elif any(k in desc_lower for k in ["китай", "индия", "азия", "china", "india"]):
        region = "Азия"

    country = "Россия"
    if region == "Европа":
        country = "Германия"
    elif region == "Северная Америка":
        country = "США"
    elif region == "Азия":
        country = "Китай"

    locality = ""
    if "краснодар" in desc_lower:
        locality = "Краснодарский край"
    elif "ростов" in desc_lower:
        locality = "Ростовская область"

    crop = ""
    if "пшениц" in desc_lower or "wheat" in desc_lower:
        crop = "Пшеница"
    elif "кукуруз" in desc_lower or "corn" in desc_lower:
        crop = "Кукуруза"

    return {
        "role": role,
        "name": "ИП " + crop + " Агро" if crop else "Новое Агро-Предприятие",
        "phone": phone or "+79991112233",
        "region": region,
        "country": country,
        "locality": locality,
        "crop": crop if role == "Farmer" else "",
        "area": numbers[0] if len(numbers) > 0 and role == "Farmer" else 50.0,
        "expected_yield": numbers[1] if len(numbers) > 1 and role == "Farmer" else 200.0,
        "needed_crops": crop if role == "Buyer" else "",
        "payment_terms": "Безналичный расчет с НДС" if role == "Buyer" else "",
        "delivery_terms": "Самовывоз" if role == "Buyer" else "",
        "vehicle_type": "Зерновоз" if role == "Carrier" else "",
        "capacity": numbers[0] if len(numbers) > 0 and role == "Carrier" else 20.0,
        "tariff_per_km": numbers[1] if len(numbers) > 1 and role == "Carrier" else 85.0,
        "capacity_tons": numbers[0] if len(numbers) > 0 and role == "Warehouse" else 1000.0,
        "storage_price": numbers[1] if len(numbers) > 1 and role == "Warehouse" else 450.0
    }

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
