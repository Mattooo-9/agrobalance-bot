from sqlalchemy.orm import Session
from backend.app.db.models import User, TrustEvent

FACTORS = {
    # Positive
    "verified_geo": {"change": 10.0, "desc": "Подтвержденная геолокация поля"},
    "actual_photo": {"change": 10.0, "desc": "Актуальное фото поля"},
    "photo_region_match": {"change": 10.0, "desc": "Совпадение фото с регионом"},
    "verified_yield": {"change": 15.0, "desc": "Подтвержденный урожай"},
    "completed_deal": {"change": 5.0, "desc": "Завершенная сделка"},
    "timely_payment": {"change": 5.0, "desc": "Своевременная оплата сделки"},
    "no_complaints": {"change": 5.0, "desc": "Отсутствие жалоб (стабильная история)"},
    "data_match": {"change": 10.0, "desc": "Совпадение заявленных и фактических данных"},
    
    # Negative
    "duplicate_account": {"change": -30.0, "desc": "Дублирование аккаунта"},
    "duplicate_photo": {"change": -20.0, "desc": "Использование чужих/одинаковых фото"},
    "geo_mismatch": {"change": -25.0, "desc": "Несоответствие геолокации региону"},
    "fake_data": {"change": -40.0, "desc": "Предоставление поддельных данных"},
    "sharp_anomaly": {"change": -20.0, "desc": "Резкие аномалии в показателях"},
    "complaint": {"change": -15.0, "desc": "Жалоба от другого участника"},
    "broken_deal": {"change": -25.0, "desc": "Сорванная сделка"},
    "yield_confirm_refusal": {"change": -15.0, "desc": "Отказ от подтверждения урожая"},
    "commission_bypass": {"change": -30.0, "desc": "Попытка обхода комиссии платформы (прямые контакты)"},
}

def update_trust_index(db: Session, user_id: int, factor_key: str, custom_description: str = None) -> float:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return 50.0

    factor = FACTORS.get(factor_key)
    if not factor:
        return user.trust_index

    change = factor["change"]
    description = custom_description or factor["desc"]

    # Calculate new score, bounds between 0 and 100
    new_score = max(0.0, min(100.0, user.trust_index + change))
    actual_change = new_score - user.trust_index

    if actual_change != 0:
        user.trust_index = new_score
        
        # Log the trust event
        event = TrustEvent(
            user_id=user.id,
            score_change=actual_change,
            factor=factor_key,
            description=description
        )
        db.add(event)
        db.commit()
        db.refresh(user)

    return user.trust_index
