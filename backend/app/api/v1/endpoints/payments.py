from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.api.deps import get_current_user
from backend.app.services.payment_service import payment_engine

router = APIRouter()

class FiatPaymentCreate(BaseModel):
    deal_id: int
    method: str  # card, stars, ton, usdt

class WebhookPayload(BaseModel):
    deal_id: int
    method: str
    transaction_id: str
    status: str

class EscrowAction(BaseModel):
    deal_id: int

@router.post("/create")
def create_payment(payment_in: FiatPaymentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        details = payment_engine.create_escrow_payment(db, payment_in.deal_id, payment_in.method)
        return details
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
def payment_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    if payload.status == "success":
        try:
            res = payment_engine.process_webhook(
                db, payload.deal_id, payload.method, payload.transaction_id
            )
            return res
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"status": "ignored", "reason": "unsuccessful status payload"}

@router.post("/escrow/create")
def create_ton_escrow(action: EscrowAction, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        details = payment_engine.create_escrow_payment(db, action.deal_id, "ton")
        return details
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/escrow/deposit")
def deposit_ton_escrow(action: EscrowAction, tx_hash: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        res = payment_engine.process_webhook(db, action.deal_id, "ton", tx_hash)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/escrow/release")
def release_ton_escrow(action: EscrowAction, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        res = payment_engine.release_escrow(db, action.deal_id, current_user.id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/escrow/refund")
def refund_ton_escrow(action: EscrowAction, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        res = payment_engine.refund_escrow(db, action.deal_id, current_user.id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
