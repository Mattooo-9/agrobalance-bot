import uuid
from sqlalchemy.orm import Session
from backend.app.db.models import Deal, EscrowPayment, Commission, DealEvent
from backend.app.services.deal_engine import pay_to_escrow, complete_deal, cancel_deal, dispute_deal

class PaymentProviderInterface:
    def initiate_payment(self, deal_id: int, amount: float, currency: str) -> dict:
        raise NotImplementedError

    def verify_payment(self, reference_id: str) -> bool:
        raise NotImplementedError


class FiatMockProvider(PaymentProviderInterface):
    """
    Mock Integration for Visa/Mastercard/Apple Pay/Google Pay.
    """
    def initiate_payment(self, deal_id: int, amount: float, currency: str = "RUB") -> dict:
        tx_id = f"fiat_tx_{uuid.uuid4().hex[:8]}"
        return {
            "status": "success",
            "redirect_url": f"https://checkout.agrobalance.ru/pay/{tx_id}?amount={amount}",
            "transaction_id": tx_id
        }

    def verify_payment(self, reference_id: str) -> bool:
        return True


class TelegramStarsProvider(PaymentProviderInterface):
    """
    Telegram Stars payments for smaller digital products/upgrades or minor deposits.
    """
    def initiate_payment(self, deal_id: int, amount: float, currency: str = "XTR") -> dict:
        stars_amount = int(amount / 2.0)  # simple conversion rate for demo
        return {
            "status": "success",
            "stars_required": stars_amount,
            "invoice_link": f"https://t.me/invoice/agrobalance_{deal_id}"
        }

    def verify_payment(self, reference_id: str) -> bool:
        return True


class TONCryptoProvider(PaymentProviderInterface):
    """
    Simulates TON and USDT crypto escrow deployments.
    Tracks state of deployed escrow smart contract details.
    """
    def initiate_payment(self, deal_id: int, amount: float, currency: str = "TON") -> dict:
        contract_addr = f"EQA_escrow_deal_{deal_id}_{uuid.uuid4().hex[:8]}"
        return {
            "status": "success",
            "escrow_contract_address": contract_addr,
            "required_amount_crypto": round(amount / 120.0, 4),  # fake rate e.g. 1 TON = 120 RUB for demo
            "wallet_payload": {
                "address": contract_addr,
                "amount": int(amount * 1000000),  # nanotons
                "payload": f"deposit:{deal_id}"
            }
        }

    def verify_payment(self, reference_id: str) -> bool:
        return True


class PaymentEngine:
    def __init__(self):
        self.providers = {
            "card": FiatMockProvider(),
            "stars": TelegramStarsProvider(),
            "ton": TONCryptoProvider(),
            "usdt": TONCryptoProvider()
        }

    def create_escrow_payment(self, db: Session, deal_id: int, method: str) -> dict:
        deal = db.query(Deal).filter(Deal.id == deal_id).first()
        if not deal:
            raise ValueError("Сделка не найдена")

        provider = self.providers.get(method)
        if not provider:
            raise ValueError(f"Провайдер платежей {method} не поддерживается")

        payment_details = provider.initiate_payment(deal_id, deal.total_price)
        
        # Log event
        event = DealEvent(
            deal_id=deal_id,
            user_id=deal.buyer_id,
            action="escrow_pending",
            comment=f"Инициализирован платеж через {method}. Ожидание оплаты."
        )
        db.add(event)
        
        deal.status = "escrow_pending"
        db.commit()
        
        return payment_details

    def process_webhook(self, db: Session, deal_id: int, method: str, transaction_id: str) -> dict:
        """
        Receives notification from provider that deposit is successful.
        Moves deal to paid_to_escrow.
        """
        deal = pay_to_escrow(db, deal_id, method, transaction_id)
        return {"status": "payment_secured", "deal_id": deal.id, "current_status": deal.status}

    def release_escrow(self, db: Session, deal_id: int, confirmed_by_user_id: int) -> dict:
        """
        Releases funds from escrow (99% to seller, 1% to platform).
        """
        deal = complete_deal(db, deal_id, confirmed_by_user_id)
        return {"status": "funds_released", "deal_id": deal.id, "commission": deal.total_price * 0.01}

    def refund_escrow(self, db: Session, deal_id: int, actor_user_id: int, reason: str = "Отмена сделки") -> dict:
        """
        Refunds the buyer fully.
        """
        deal = cancel_deal(db, deal_id, actor_user_id, reason)
        return {"status": "funds_refunded", "deal_id": deal.id}

    def handle_dispute(self, db: Session, deal_id: int, actor_user_id: int, reason: str) -> dict:
        """
        Locks funds under dispute.
        """
        deal = dispute_deal(db, deal_id, actor_user_id, reason)
        return {"status": "deal_disputed", "deal_id": deal.id}

payment_engine = PaymentEngine()
