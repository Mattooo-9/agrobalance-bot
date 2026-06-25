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
    """Return active sale offers sorted alphabetically by crop name."""
    q = db.query(MarketOffer, User.name).join(
        User, MarketOffer.seller_id == User.id, isouter=True
    ).filter(MarketOffer.is_active == True)
    if crop:
        q = q.filter(MarketOffer.crop.ilike(f"%{crop}%"))
    if region:
        q = q.filter(MarketOffer.region == region)

    rows = q.order_by(MarketOffer.crop.asc()).limit(limit).all()

    result = []
    for offer, seller_name in rows:
        result.append({
            "id": offer.id,
            "seller_id": offer.seller_id,
            "seller_name": seller_name or "—",
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
    """Return active purchase requests sorted alphabetically by crop name."""
    q = db.query(MarketRequest, User.name).join(
        User, MarketRequest.buyer_id == User.id, isouter=True
    ).filter(MarketRequest.is_active == True)
    if crop:
        q = q.filter(MarketRequest.crop.ilike(f"%{crop}%"))
    if region:
        q = q.filter(MarketRequest.region == region)

    rows = q.order_by(MarketRequest.crop.asc()).limit(limit).all()

    result = []
    for req, buyer_name in rows:
        result.append({
            "id": req.id,
            "buyer_id": req.buyer_id,
            "buyer_name": buyer_name or "—",
            "crop": req.crop,
            "volume": req.volume,
            "price_per_unit": req.price_per_unit,
            "region": req.region,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })
    return result
