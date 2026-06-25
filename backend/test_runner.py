import sys
from sqlalchemy.orm import Session
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.models import User, MarketSignal, MarketOffer, Deal
from backend.app.services.trust_engine import update_trust_index
from backend.app.services.antifraud import run_registration_antifraud_checks, check_chat_bypass_attempt
from backend.app.services.ai_recommendations import generate_ai_recommendations
from backend.app.services.deal_engine import create_deal_from_match, accept_deal, pay_to_escrow, complete_deal
from backend.app.services.payment_service import payment_engine

def run_tests():
    print("🚀 Starting AgroBalance Backend Engine Verification tests...")
    
    # Initialize SQLite database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Clean previous test items
        db.query(Deal).delete()
        db.query(MarketOffer).delete()
        db.query(MarketSignal).delete()
        db.query(User).delete()
        db.commit()
        
        # 2. Test User Registration and Trust Index initialization
        print("➡️ [Test 1] Testing User and Trust Index init...")
        farmer = User(
            telegram_id="111222",
            role="Farmer",
            name="Тестовый Фермер",
            phone="+79997776655",
            region="Южный",
            latitude=45.0,
            longitude=38.0,
            area=50.0,
            crop="Пшеница",
            expected_yield=200.0,  # 4 t/ha (normal)
            trust_index=50.0
        )
        db.add(farmer)
        db.commit()
        db.refresh(farmer)
        
        assert farmer.trust_index == 50.0, "Initial Trust Index should be 50"
        print("✅ Trust Index initialized successfully.")

        # 3. Test AntiFraud Checks
        print("➡️ [Test 2] Testing AntiFraud rules...")
        # Check yield calculation and coordinate duplication
        flags = run_registration_antifraud_checks(db, farmer)
        # Should have no flags because yield is normal (4 t/ha) and coordinates are unique
        assert len(flags) == 0, "Unique farmer with normal yield should have 0 fraud flags"
        
        # Try creating another farmer with identical phone and abnormal yield
        suspicious_farmer = User(
            telegram_id="222333",
            role="Farmer",
            name="Фрод Фермер",
            phone="+79997776655",  # DUPLICATE phone
            region="Южный",
            latitude=45.00001,    # VERY close coordinates
            longitude=38.00001,
            area=10.0,
            crop="Пшеница",
            expected_yield=999.0,  # IMPOSSIBLE yield (99.9 t/ha)
            trust_index=50.0
        )
        db.add(suspicious_farmer)
        db.commit()
        db.refresh(suspicious_farmer)
        
        fraud_flags = run_registration_antifraud_checks(db, suspicious_farmer)
        assert len(fraud_flags) > 0, "Fraud flags should be triggered for abnormal yields and duplicate details"
        
        # Check rating drops due to fraud
        assert suspicious_farmer.trust_index < 50.0, "Trust index should drop after fraud detections"
        print(f"✅ AntiFraud triggered flags: {[f['rule'] for f in fraud_flags]}. Current trust score: {suspicious_farmer.trust_index}")

        # 4. Test Chat commission bypass filters
        print("➡️ [Test 3] Testing Chat Bypass scanner...")
        # Normal chat
        normal_msg = "Привет! Давай согласуем условия доставки зерна."
        assert not check_chat_bypass_attempt(db, farmer.id, normal_msg), "Normal message shouldn't trigger fraud engine"
        
        # Suspicious chat containing direct coordinates / phone number
        bypass_msg = "Переведи деньги напрямую на карту +79998887766 или напиши мне в тг @cheat_user"
        assert check_chat_bypass_attempt(db, farmer.id, bypass_msg), "Message with direct contact details should trigger fraud engine"
        
        # Check rating drop
        db.refresh(farmer)
        assert farmer.trust_index < 50.0, "Farmer trust index should drop after commission bypass trigger"
        print(f"✅ Chat Bypass filters verified. Farmer trust index dropped to: {farmer.trust_index}")

        # 5. Test AI Recommendations fallback scoring
        print("➡️ [Test 4] Testing AI Recommendation core...")
        # Seed a market signal
        signal = MarketSignal(
            crop="Пшеница",
            region="Южный",
            price_per_unit=15000.0,
            demand_volume=3000.0,
            supply_volume=1000.0,
            deficit_score=3.5,
            oversupply_score=0.1
        )
        db.add(signal)
        db.commit()
        
        recs = generate_ai_recommendations(db, farmer)
        assert len(recs) == 3, "Should generate 3 recommendation scenarios"
        assert any(r.scenario == "Safe" for r in recs), "Must include Safe scenario"
        assert any(r.scenario == "Profit" for r in recs), "Must include Profit scenario"
        assert any(r.scenario == "Aggressive" for r in recs), "Must include Aggressive scenario"
        print(f"✅ Generated scenarios: {[r.scenario for r in recs]}")
        print(f"Profit Scenario details: Crop: {recs[1].recommended_crop}, Expected Profit: {recs[1].expected_profit} руб, Action: {recs[1].action_type}")

        # 6. Test Deal Engine & Escrow flow
        print("➡️ [Test 5] Testing Deal Engine and Payment Escrow transitions...")
        buyer = User(
            role="Buyer",
            name="Тестовый Покупатель",
            phone="+79119998877",
            region="Южный",
            trust_index=90.0
        )
        db.add(buyer)
        db.commit()
        db.refresh(buyer)
        
        # Create Deal
        deal = create_deal_from_match(
            db,
            seller_id=farmer.id,
            buyer_id=buyer.id,
            crop="Пшеница",
            volume=50.0,
            price_per_unit=14000.0,
            region="Южный",
            delivery_type="delivery"
        )
        assert deal.status == "proposed", "Initial status should be proposed"
        
        # Accept Deal
        accept_deal(db, deal.id, buyer.id)
        assert deal.status == "accepted", "Status should transition to accepted"
        
        # Pay Escrow (Payment Engine webhook)
        payment_engine.process_webhook(db, deal.id, "ton", "ton_transaction_hash_999")
        assert deal.status == "paid_to_escrow", "Status should transition to paid_to_escrow"
        assert deal.payment_status == "holding", "Payment status should be holding"
        
        # Delivery Confirmation
        confirm_delivery(db, deal.id, farmer.id)
        assert deal.status == "delivered", "Status should transition to delivered"
        
        # Finalize and Payout
        complete_deal(db, deal.id, buyer.id)
        assert deal.status == "completed", "Status should transition to completed"
        assert deal.payment_status == "released", "Payment should be released to seller"
        assert deal.commission_status == "collected", "1% commission should be collected"
        
        print("✅ Deal state machine and escrow payment completed successfully.")
        print("🎉 All AgroBalance engine tests PASSED successfully!")
        
    except Exception as e:
        print(f"❌ Test verification failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
