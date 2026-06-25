from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.app.db.session import get_db
from backend.app.db.models import User, Recommendation, RecommendationFeedback, MarketSignal
from backend.app.api.deps import get_current_user
from backend.app.services.ai_recommendations import generate_ai_recommendations

router = APIRouter()

class FeedbackCreate(BaseModel):
    recommendation_id: int
    feedback_type: str  # accept, reject, like, dislike
    comment: Optional[str] = None

@router.post("/generate")
def api_generate_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "Farmer":
        raise HTTPException(status_code=400, detail="Рекомендации генерируются только для роли Farmer")
    
    recs = generate_ai_recommendations(db, current_user)
    return recs

@router.get("/my")
def get_my_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recs = db.query(Recommendation).filter(Recommendation.user_id == current_user.id).order_by(Recommendation.created_at.desc()).all()
    return recs

@router.get("/market-summary")
def get_market_summary(db: Session = Depends(get_db)):
    # Returns market overview signals
    signals = db.query(MarketSignal).order_by(MarketSignal.created_at.desc()).limit(10).all()
    return signals

@router.post("/feedback")
def submit_recommendation_feedback(
    feed_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == feed_in.recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Рекомендация не найдена")

    feedback = RecommendationFeedback(
        recommendation_id=feed_in.recommendation_id,
        user_id=current_user.id,
        feedback_type=feed_in.feedback_type,
        comment=feed_in.comment
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
