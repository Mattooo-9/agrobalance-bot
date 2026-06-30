"""
Market API — provides public offer and request listings for the Mini App market tab.
Sorted alphabetically by crop name. Includes seller/buyer names via JOIN.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.db.session import SessionLocal
from backend.app.db.models import MarketOffer, MarketRequest, User

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/offers")
def list_offers(
    crop: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Return active sale offers sorted alphabetically by crop name with anonymized seller names."""
    q = db.query(MarketOffer, User).join(
        User, MarketOffer.seller_id == User.id, isouter=True
    ).filter(MarketOffer.is_active == True)
    if crop:
        q = q.filter(MarketOffer.crop.ilike(f"%{crop}%"))
    if region:
        q = q.filter(MarketOffer.region.like(f"{region}%"))

    rows = q.order_by(MarketOffer.crop.asc()).limit(limit).all()

    role_map_ru = {
        "Farmer": "Фермер", "Buyer": "Покупатель", "Carrier": "Перевозчик",
        "Warehouse": "Элеватор", "Processor": "Переработчик", 
        "Supplier": "Поставщик", "Agronomist": "Агроэксперт"
    }

    result = []
    for offer, seller in rows:
        role_label = role_map_ru.get(seller.role, seller.role) if seller else "Участник"
        result.append({
            "id": offer.id,
            "seller_id": offer.seller_id,
            "seller_name": f"{role_label} #{offer.seller_id}",
            "crop": offer.crop,
            "volume": offer.volume,
            "price_per_unit": offer.price_per_unit,
            "region": offer.region,
            "created_at": offer.created_at.isoformat() if offer.created_at else None,
        })
    return result


@router.get("/requests")
def list_requests(
    crop: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Return active purchase requests sorted alphabetically by crop name with anonymized buyer names."""
    q = db.query(MarketRequest, User).join(
        User, MarketRequest.buyer_id == User.id, isouter=True
    ).filter(MarketRequest.is_active == True)
    if crop:
        q = q.filter(MarketRequest.crop.ilike(f"%{crop}%"))
    if region:
        q = q.filter(MarketRequest.region.like(f"{region}%"))

    rows = q.order_by(MarketRequest.crop.asc()).limit(limit).all()

    role_map_ru = {
        "Farmer": "Фермер", "Buyer": "Покупатель", "Carrier": "Перевозчик",
        "Warehouse": "Элеватор", "Processor": "Переработчик", 
        "Supplier": "Поставщик", "Agronomist": "Агроэксперт"
    }

    result = []
    for req, buyer in rows:
        role_label = role_map_ru.get(buyer.role, buyer.role) if buyer else "Участник"
        result.append({
            "id": req.id,
            "buyer_id": req.buyer_id,
            "buyer_name": f"{role_label} #{req.buyer_id}",
            "crop": req.crop,
            "volume": req.volume,
            "price_per_unit": req.price_per_unit,
            "region": req.region,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })
    return result
