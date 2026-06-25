import re
import math
from sqlalchemy.orm import Session
from backend.app.db.models import User, AntiFraudLog, TrustEvent
from backend.app.services.trust_engine import update_trust_index

# Standard average yields (tons per hectare)
CROP_YIELD_LIMITS = {
    "wheat": {"max": 10.0, "min": 1.0},
    "pshenica": {"max": 10.0, "min": 1.0},
    "пшеница": {"max": 10.0, "min": 1.0},
    "corn": {"max": 15.0, "min": 2.0},
    "kukuruza": {"max": 15.0, "min": 2.0},
    "кукуруза": {"max": 15.0, "min": 2.0},
    "sunflower": {"max": 5.0, "min": 0.5},
    "podsolnechnik": {"max": 5.0, "min": 0.5},
    "подсолнух": {"max": 5.0, "min": 0.5},
    "barley": {"max": 8.0, "min": 1.0},
    "yachmen": {"max": 8.0, "min": 1.0},
    "ячмень": {"max": 8.0, "min": 1.0},
    "potato": {"max": 50.0, "min": 5.0},
    "kartofel": {"max": 50.0, "min": 5.0},
    "картофель": {"max": 50.0, "min": 5.0},
}

def calculate_distance(lat1, lon1, lat2, lon2):
    if not (lat1 and lon1 and lat2 and lon2):
        return float('inf')
    # Haversine formula
    R = 6371000  # radius of Earth in meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi_1) * math.cos(phi_2) *
         math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c  # in meters

def run_registration_antifraud_checks(db: Session, user: User) -> list:
    flags = []
    
    # 1. Check duplicate phone numbers
    dup_phone = db.query(User).filter(User.phone == user.phone, User.id != user.id).first()
    if dup_phone:
        flags.append({
            "rule": "duplicate_phone",
            "severity": "high",
            "details": f"Совпадение номера телефона с пользователем ID {dup_phone.id}"
        })
        update_trust_index(db, user.id, "duplicate_account", f"Дубликат телефона с ID {dup_phone.id}")

    # 2. Check duplicate field photo hash
    if user.photo_hash:
        dup_photo = db.query(User).filter(User.photo_hash == user.photo_hash, User.id != user.id).first()
        if dup_photo:
            flags.append({
                "rule": "duplicate_photo",
                "severity": "high",
                "details": f"Совпадение хеша фотографии с пользователем ID {dup_photo.id}"
            })
            update_trust_index(db, user.id, "duplicate_photo", f"Дубликат фотографии поля с ID {dup_photo.id}")

    # 3. Check duplicate GPS coordinates (if within 10 meters of an existing field)
    if user.latitude and user.longitude:
        other_farmers = db.query(User).filter(
            User.role == "Farmer",
            User.latitude.isnot(None),
            User.longitude.isnot(None),
            User.id != user.id
        ).all()
        
        for other in other_farmers:
            dist = calculate_distance(user.latitude, user.longitude, other.latitude, other.longitude)
            if dist < 20.0:  # 20 meters
                flags.append({
                    "rule": "coordinate_match",
                    "severity": "high",
                    "details": f"Координаты поля совпадают с полем пользователя ID {other.id} (расстояние {dist:.1f}м)"
                })
                update_trust_index(db, user.id, "geo_mismatch", f"Координаты поля совпадают с полем ID {other.id}")
                break

    # 4. Check impossible crop yields (expected yield per hectare)
    if user.area and user.expected_yield and user.crop:
        yield_per_hectare = user.expected_yield / user.area
        crop_lower = user.crop.lower().strip()
        
        limit = None
        for crop_key, crop_limit in CROP_YIELD_LIMITS.items():
            if crop_key in crop_lower:
                limit = crop_limit
                break
                
        if limit:
            if yield_per_hectare > limit["max"]:
                flags.append({
                    "rule": "impossible_yield_high",
                    "severity": "high",
                    "details": f"Заявлена аномально высокая урожайность: {yield_per_hectare:.1f} т/га (макс {limit['max']} т/га)"
                })
                update_trust_index(db, user.id, "sharp_anomaly", f"Аномально высокая урожайность: {yield_per_hectare:.1f} т/га")
            elif yield_per_hectare < limit["min"]:
                flags.append({
                    "rule": "impossible_yield_low",
                    "severity": "medium",
                    "details": f"Заявлена аномально низкая урожайность: {yield_per_hectare:.1f} т/га (мин {limit['min']} т/га)"
                })
                update_trust_index(db, user.id, "sharp_anomaly", f"Аномально низкая урожайность: {yield_per_hectare:.1f} т/га")

    # Save to logs
    for flag in flags:
        log = AntiFraudLog(
            user_id=user.id,
            rule_triggered=flag["rule"],
            severity=flag["severity"],
            details=flag["details"]
        )
        db.add(log)
    db.commit()
    
    return flags

def check_chat_bypass_attempt(db: Session, user_id: int, message_text: str) -> bool:
    """
    Looks for attempts to send telephone numbers, bank cards, direct contacts
    to bypass escrow and platform fee.
    """
    # Regex to find phone numbers, email, card numbers, or usernames
    phone_pattern = r"(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})"
    email_pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    card_pattern = r"\b(?:\d[ -]*?){13,16}\b"
    username_pattern = r"(?:^|\s)@([A-Za-z0-9_]{5,32})"
    
    phone_matches = re.findall(phone_pattern, message_text)
    # Filter matches to avoid false positives (e.g. simple short numbers)
    phone_matches = [m for m in phone_matches if len(re.sub(r'\D', '', m)) >= 9]
    
    email_matches = re.findall(email_pattern, message_text)
    card_matches = re.findall(card_pattern, message_text)
    username_matches = re.findall(username_pattern, message_text)

    is_suspicious = False
    details_list = []
    
    if phone_matches:
        is_suspicious = True
        details_list.append(f"Обнаружен номер телефона: {phone_matches}")
    if email_matches:
        is_suspicious = True
        details_list.append(f"Обнаружен email: {email_matches}")
    if card_matches:
        is_suspicious = True
        details_list.append(f"Обнаружен номер карты: {card_matches}")
    if username_matches:
        is_suspicious = True
        details_list.append(f"Обнаружен контакт @{username_matches}")

    if is_suspicious:
        # Trigger penalty
        update_trust_index(db, user_id, "commission_bypass", "; ".join(details_list))
        
        # Log to fraud engine
        log = AntiFraudLog(
            user_id=user_id,
            rule_triggered="commission_bypass_attempt",
            severity="high",
            details="; ".join(details_list) + f" | Сообщение: {message_text}"
        )
        db.add(log)
        db.commit()
        return True
        
    return False
