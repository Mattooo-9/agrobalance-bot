from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from backend.app.db.session import get_db
from backend.app.db.models import User, Deal, MarketOffer, MarketRequest, DealEvent
from backend.app.api.deps import get_current_user
from backend.app.services.deal_engine import (
    match_offers_and_requests, create_deal_from_match, accept_deal,
    pay_to_escrow, confirm_delivery, complete_deal, dispute_deal, cancel_deal
)
from backend.app.services.antifraud import check_chat_bypass_attempt

router = APIRouter()

class DealCreate(BaseModel):
    seller_id: int
    buyer_id: int
    crop: str
    volume: float
    price_per_unit: float
    region: str
    delivery_type: str  # pickup, delivery, warehouse
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None
    carrier_id: Optional[int] = None
    warehouse_id: Optional[int] = None

class MessageInChat(BaseModel):
    text: str

class OfferCreate(BaseModel):
    crop: str
    volume: float
    price_per_unit: float
    region: str

class RequestCreate(BaseModel):
    crop: str
    volume: float
    price_per_unit: float
    region: str

@router.post("/create")
def api_create_deal(deal_in: DealCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != deal_in.seller_id and current_user.id != deal_in.buyer_id:
        raise HTTPException(status_code=403, detail="Вы не являетесь стороной сделки")
    
    deal = create_deal_from_match(
        db,
        seller_id=deal_in.seller_id,
        buyer_id=deal_in.buyer_id,
        crop=deal_in.crop,
        volume=deal_in.volume,
        price_per_unit=deal_in.price_per_unit,
        region=deal_in.region,
        delivery_type=deal_in.delivery_type,
        pickup_location=deal_in.pickup_location,
        delivery_location=deal_in.delivery_location,
        carrier_id=deal_in.carrier_id,
        warehouse_id=deal_in.warehouse_id
    )
    return deal

@router.get("/my")
def get_my_deals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deals = db.query(Deal).filter(
        (Deal.seller_id == current_user.id) |
        (Deal.buyer_id == current_user.id) |
        (Deal.carrier_id == current_user.id) |
        (Deal.warehouse_id == current_user.id)
    ).all()
    return deals

@router.get("/matches")
def get_deal_matches(crop: Optional[str] = None, region: Optional[str] = None, db: Session = Depends(get_db)):
    return match_offers_and_requests(db, crop, region)

# Market Offer / Request listing (no auth required to browse)
@router.get("/offers")
def get_offers(crop: Optional[str] = None, region: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(MarketOffer).filter(MarketOffer.is_active == True)
    if crop:
        q = q.filter(MarketOffer.crop == crop)
    if region:
        q = q.filter(MarketOffer.region == region)
    return q.all()

@router.get("/requests")
def get_requests(crop: Optional[str] = None, region: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(MarketRequest).filter(MarketRequest.is_active == True)
    if crop:
        q = q.filter(MarketRequest.crop == crop)
    if region:
        q = q.filter(MarketRequest.region == region)
    return q.all()

# ── Wildcard /{id} MUST come after all static routes ──────────────────────────────────
@router.get("/{id}")
def get_deal_by_id(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deal = db.query(Deal).filter(Deal.id == id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Сделка не найдена")
    if current_user.id not in [deal.seller_id, deal.buyer_id, deal.carrier_id, deal.warehouse_id, 1]:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    events = db.query(DealEvent).filter(DealEvent.deal_id == deal.id).order_by(DealEvent.created_at.asc()).all()
    return {
        "deal": deal,
        "events": events
    }

@router.post("/{id}/accept")
def api_accept_deal(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        deal = accept_deal(db, id, current_user.id)
        return deal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/cancel")
def api_cancel_deal(id: int, reason: str = "Отменено пользователем", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        deal = cancel_deal(db, id, current_user.id, reason)
        return deal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/pay-escrow")
def api_pay_escrow(id: int, payment_method: str = "card", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        deal = pay_to_escrow(db, id, payment_method, tx_hash="dummy_tx_hash_123")
        return deal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/confirm-delivery")
def api_confirm_delivery(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        deal = confirm_delivery(db, id, current_user.id)
        return deal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/complete")
def api_complete_deal(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        deal = complete_deal(db, id, current_user.id)
        return deal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/dispute")
def api_dispute_deal(id: int, reason: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        deal = dispute_deal(db, id, current_user.id, reason)
        return deal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/chat")
def analyze_deal_chat(id: int, msg: MessageInChat, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Checks if message contains direct contacts and triggers AntiFraud core.
    """
    is_bypass = check_chat_bypass_attempt(db, current_user.id, msg.text)

    event = DealEvent(
        deal_id=id,
        user_id=current_user.id,
        action="chat_message",
        comment=f"{current_user.name}: {msg.text}"
    )
    db.add(event)
    db.commit()

    return {"is_bypass_attempt": is_bypass, "trust_index": current_user.trust_index}

# Market Offer / Request creation (auth required)
@router.post("/offers")
def create_offer(offer_in: OfferCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = MarketOffer(
        seller_id=current_user.id,
        crop=offer_in.crop,
        volume=offer_in.volume,
        price_per_unit=offer_in.price_per_unit,
        region=offer_in.region,
        is_active=True
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer

@router.post("/requests")
def create_request(req_in: RequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = MarketRequest(
        buyer_id=current_user.id,
        crop=req_in.crop,
        volume=req_in.volume,
        price_per_unit=req_in.price_per_unit,
        region=req_in.region,
        is_active=True
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req
