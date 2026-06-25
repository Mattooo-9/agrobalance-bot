from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import MarketSignal, MarketOffer
from typing import Optional

router = APIRouter()

# Simple token based authorization for external partners
PARTNER_TOKEN = "AgroBalancePartnerSecureToken1597!"

def verify_partner_token(x_partner_token: str = Header(...)):
    if x_partner_token != PARTNER_TOKEN:
        raise HTTPException(status_code=401, detail="Неверный токен партнера")

@router.get("/market-rates", dependencies=[Depends(verify_partner_token)])
def get_external_market_rates(crop: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Allows external bots and platforms to retrieve current market rates.
    """
    query = db.query(MarketSignal)
    if crop:
        query = query.filter(MarketSignal.crop.ilike(f"%{crop}%"))
    signals = query.order_by(MarketSignal.created_at.desc()).limit(20).all()
    
    return [{
        "crop": s.crop,
        "region": s.region,
        "price_per_unit": s.price_per_unit,
        "deficit_score": s.deficit_score,
        "oversupply_score": s.oversupply_score,
        "weather_risk": s.weather_risk,
        "updated_at": s.created_at
    } for s in signals]

@router.get("/supply-volume", dependencies=[Depends(verify_partner_token)])
def get_supply_statistics(crop: str, db: Session = Depends(get_db)):
    """
    Returns aggregated supply volumes across active offers.
    """
    offers = db.query(MarketOffer).filter(
        MarketOffer.crop.ilike(f"%{crop}%"),
        MarketOffer.is_active == True
    ).all()
    
    total_volume = sum(o.volume for o in offers)
    regions = list(set(o.region for o in offers))
    
    return {
        "crop": crop,
        "active_offers_count": len(offers),
        "total_volume_tons": total_volume,
        "regions": regions
    }
