from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.db.models import (
    Deal, DealEvent, User, MarketOffer, MarketRequest, EscrowPayment, Commission, TrustEvent, ReferralReward
)
from backend.app.services.trust_engine import update_trust_index
from backend.app.services.antifraud import check_chat_bypass_attempt

def match_offers_and_requests(db: Session, crop: str = None, region: str = None) -> list:
    """
    Find matching market offers and requests by crop type and region.
    """
    query_offers = db.query(MarketOffer).filter(MarketOffer.is_active == True)
    query_requests = db.query(MarketRequest).filter(MarketRequest.is_active == True)

    if crop:
        query_offers = query_offers.filter(MarketOffer.crop == crop)
        query_requests = query_requests.filter(MarketRequest.crop == crop)
    if region:
        query_offers = query_offers.filter(MarketOffer.region == region)
        query_requests = query_requests.filter(MarketRequest.region == region)

    offers = query_offers.all()
    requests = query_requests.all()

    matches = []
    for offer in offers:
        for request in requests:
            # Match condition: same crop and overlap in region, volume compatibility
            if offer.crop.lower() == request.crop.lower() and offer.region.lower() == request.region.lower():
                matches.append({
                    "offer": {
                        "id": offer.id,
                        "seller_id": offer.seller_id,
                        "seller_name": offer.seller.name,
                        "seller_trust": offer.seller.trust_index,
                        "crop": offer.crop,
                        "volume": offer.volume,
                        "price": offer.price_per_unit
                    },
                    "request": {
                        "id": request.id,
                        "buyer_id": request.buyer_id,
                        "buyer_name": request.buyer.name,
                        "buyer_trust": request.buyer.trust_index,
                        "crop": request.crop,
                        "volume": request.volume,
                        "price": request.price_per_unit
                    },
                    "price_difference": abs(offer.price_per_unit - request.price_per_unit)
                })
    return matches

def create_deal_from_match(
    db: Session,
    seller_id: int,
    buyer_id: int,
    crop: str,
    volume: float,
    price_per_unit: float,
    region: str,
    delivery_type: str,
    pickup_location: str = None,
    delivery_location: str = None,
    carrier_id: int = None,
    warehouse_id: int = None
) -> Deal:
    seller = db.query(User).filter(User.id == seller_id).first()
    buyer = db.query(User).filter(User.id == buyer_id).first()

    total_price = volume * price_per_unit

    deal = Deal(
        seller_id=seller_id,
        buyer_id=buyer_id,
        carrier_id=carrier_id,
        warehouse_id=warehouse_id,
        crop=crop,
        volume=volume,
        price_per_unit=price_per_unit,
        total_price=total_price,
        region=region,
        delivery_type=delivery_type,
        pickup_location=pickup_location,
        delivery_location=delivery_location,
        status="proposed",
        payment_status="pending",
        commission_status="pending",
        trust_snapshot_seller=seller.trust_index if seller else 50.0,
        trust_snapshot_buyer=buyer.trust_index if buyer else 50.0
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)

    # Log initial event
    log_deal_event(db, deal.id, seller_id, "created", "Сделка предложена")
    return deal

def accept_deal(db: Session, deal_id: int, user_id: int) -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise ValueError("Сделка не найдена")

    # Mark as accepted and request payment
    deal.status = "accepted"
    db.commit()
    db.refresh(deal)

    log_deal_event(db, deal.id, user_id, "accepted", "Сделка принята сторонами")
    return deal

def pay_to_escrow(db: Session, deal_id: int, payment_method: str, tx_hash: str = None) -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise ValueError("Сделка не найдена")

    deal.status = "paid_to_escrow"
    deal.payment_status = "holding"
    
    # Calculate 1% commission
    commission_amount = deal.total_price * 0.01
    
    # Write Escrow payment details
    escrow = EscrowPayment(
        deal_id=deal.id,
        payment_method=payment_method,
        amount=deal.total_price,
        platform_fee=commission_amount,
        status="locked",
        tx_hash=tx_hash
    )
    db.add(escrow)
    db.commit()

    log_deal_event(db, deal.id, deal.buyer_id, "deposited", f"Сумма заблокирована в Escrow ({payment_method})")
    return deal

def confirm_delivery(db: Session, deal_id: int, user_id: int) -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise ValueError("Сделка не найдена")

    deal.status = "delivered"
    db.commit()

    log_deal_event(db, deal.id, user_id, "delivered", "Доставка груза подтверждена перевозчиком/продавцом")
    return deal

def complete_deal(db: Session, deal_id: int, user_id: int) -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise ValueError("Сделка не найдена")

    deal.status = "completed"
    deal.payment_status = "released"
    deal.commission_status = "collected"
    deal.completed_at = datetime.utcnow()

    # Calculate fee & record commission earned (1%)
    commission_amount = deal.total_price * 0.01
    commission = Commission(
        deal_id=deal.id,
        amount=commission_amount,
        status="earned"
    )
    db.add(commission)

    # Handle Referral Reward splits (referrer gets 20% of the 1% fee)
    seller_user = db.query(User).filter(User.id == deal.seller_id).first()
    if seller_user and seller_user.referred_by_id:
        referrer_reward = commission_amount * 0.20
        reward = ReferralReward(
            referrer_id=seller_user.referred_by_id,
            referee_id=deal.seller_id,
            deal_id=deal.id,
            reward_amount=referrer_reward
        )
        db.add(reward)
        # Boost referrer rating by +2 for referee's successful deal
        update_trust_index(db, seller_user.referred_by_id, "completed_deal", "Сделка приглашенного фермера (+2 TI)")

    db.commit()

    # Update Trust Ratings for both Farmer & Buyer
    update_trust_index(db, deal.seller_id, "completed_deal")
    update_trust_index(db, deal.buyer_id, "completed_deal")
    update_trust_index(db, deal.buyer_id, "timely_payment")

    log_deal_event(db, deal.id, user_id, "completed", "Сделка успешно завершена. Средства переведены продавцу.")
    return deal

def dispute_deal(db: Session, deal_id: int, user_id: int, reason: str) -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise ValueError("Сделка не найдена")

    deal.status = "disputed"
    db.commit()

    log_deal_event(db, deal.id, user_id, "disputed", f"Спор открыт пользователем ID {user_id}. Причина: {reason}")
    update_trust_index(db, user_id, "complaint", "Участие в споре (открытие арбитража)")
    return deal

def cancel_deal(db: Session, deal_id: int, user_id: int, reason: str = "") -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise ValueError("Сделка не найдена")

    # Capture status BEFORE changing it
    original_status = deal.status
    is_paid = original_status in ["paid_to_escrow", "in_delivery", "delivered"]

    deal.status = "cancelled"
    deal.payment_status = "refunded" if is_paid else "pending"
    db.commit()

    log_deal_event(db, deal.id, user_id, "cancelled", f"Сделка отменена. Причина: {reason}")

    # Penalize trust if cancelled after being accepted or paid
    if is_paid or original_status == "accepted":
        update_trust_index(db, user_id, "broken_deal", "Отмена сделки после принятия")

    return deal

def log_deal_event(db: Session, deal_id: int, user_id: int, action: str, comment: str):
    event = DealEvent(
        deal_id=deal_id,
        user_id=user_id,
        action=action,
        comment=comment
    )
    db.add(event)
    db.commit()
