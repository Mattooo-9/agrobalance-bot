import time
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.models import User, MarketSignal, MarketOffer, MarketRequest
from backend.app.api.v1.endpoints import auth, users, deals, recommendations, payments, integrations, market

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 30, window: int = 10):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.ips = {}  # ip -> list of timestamps

    async def dispatch(self, request: Request, call_next):
        # Allow requests to API documentation or simple check
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/api/v1/bot/webhook", "/api/v1/auth/translate"]:
            return await call_next(request)
        
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        timestamps = self.ips.get(ip, [])
        timestamps = [t for t in timestamps if now - t < self.window]
        
        if len(timestamps) >= self.limit:
            return Response(content="Too many requests. Please wait.", status_code=429)
            
        timestamps.append(now)
        self.ips[ip] = timestamps
        
        return await call_next(request)


def run_db_maintenance():
    """Run database self-cleaning and optimization. Safe to call at any time."""
    import hashlib
    db = SessionLocal()
    try:
        # 1. Delete old antifraud logs (older than 30 days)
        db.execute(text("DELETE FROM antifraud_logs WHERE created_at < datetime('now', '-30 days')"))

        # 2. Delete cancelled/draft deals older than 30 days along with their events
        old_ids = db.execute(
            text("SELECT id FROM deals WHERE status IN ('cancelled', 'draft') AND created_at < datetime('now', '-30 days')")
        ).fetchall()
        old_deal_ids = [r[0] for r in old_ids]
        if old_deal_ids:
            db.execute(text(f"DELETE FROM deal_events WHERE deal_id IN ({','.join(str(i) for i in old_deal_ids)})"))
            db.execute(text(f"DELETE FROM deals WHERE id IN ({','.join(str(i) for i in old_deal_ids)})"))

        # 3. Auto-heal: clamp trust_index to [0, 100] for any broken records
        db.execute(text("UPDATE users SET trust_index = 0.0 WHERE trust_index < 0"))
        db.execute(text("UPDATE users SET trust_index = 100.0 WHERE trust_index > 100"))

        # 4. Auto-heal: generate missing referral codes
        users_no_ref = db.execute(
            text("SELECT id, telegram_id FROM users WHERE referral_code IS NULL OR referral_code = ''")
        ).fetchall()
        for row in users_no_ref:
            uid, tg_id = row[0], row[1] or str(row[0])
            code = "AB" + hashlib.md5(str(tg_id).encode()).hexdigest()[:8].upper()
            db.execute(text("UPDATE users SET referral_code = :code WHERE id = :uid"), {"code": code, "uid": uid})

        db.commit()

        # 5. Reclaim disk and optimize indexes (must be outside transaction)
        db.execute(text("PRAGMA optimize"))
        db.commit()
        # VACUUM cannot run inside a transaction — use separate connection
        from sqlalchemy import create_engine
        raw_engine = create_engine(str(engine.url))
        with raw_engine.connect() as conn:
            conn.execute(text("VACUUM"))
        raw_engine.dispose()

        print("[Maintenance] ✅ Database self-cleaning and optimization completed.")
    except Exception as e:
        print(f"[Maintenance] ⚠️ Error during maintenance: {e}")
        db.rollback()
    finally:
        db.close()


async def daily_maintenance_loop():
    """Background async task: runs DB maintenance every 24 hours."""
    while True:
        await asyncio.sleep(24 * 60 * 60)  # Wait 24h between runs
        print("[Maintenance] ⏰ Running scheduled daily database maintenance...")
        await asyncio.to_thread(run_db_maintenance)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup + background tasks."""
    # ── Startup ──────────────────────────────────────────────────────────────
    Base.metadata.create_all(bind=engine)

    # Seed initial data if DB is empty
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin = User(
                telegram_id=str(settings.USER_TELEGRAM_ID),
                role="Admin",
                name="Администратор",
                phone="+79998887766",
                region="СНГ",
                trust_index=100.0,
                verification_status="verified"
            )
            db.add(admin)
            buyer = User(
                role="Buyer",
                name="АгроХолдинг Восток",
                phone="+79001112233",
                region="СНГ",
                needed_crops="Пшеница,Кукуруза",
                desired_volume=1000.0,
                price_range="12000-15000",
                trust_index=85.0,
                verification_status="verified"
            )
            carrier = User(
                role="Carrier",
                name="ИП Иванов (Логистика)",
                phone="+79112223344",
                region="СНГ",
                vehicle_type="Зерновоз КАМАЗ",
                capacity=25.0,
                tariff_per_km=45.0,
                routes="СНГ",
                trust_index=90.0,
                verification_status="verified"
            )
            warehouse = User(
                role="Warehouse",
                name="Элеватор 'Золотой Колос'",
                phone="+79223334455",
                region="СНГ",
                capacity_tons=5000.0,
                storage_conditions="Сухой силос, вентиляция",
                storage_price=150.0,
                availability=True,
                trust_index=95.0,
                verification_status="verified"
            )
            db.add_all([buyer, carrier, warehouse])
            wheat_signal = MarketSignal(
                crop="Пшеница", region="СНГ",
                price_per_unit=14500.0, demand_volume=5000.0, supply_volume=3500.0,
                deficit_score=4.2, oversupply_score=0.2, weather_risk=1.5
            )
            corn_signal = MarketSignal(
                crop="Кукуруза", region="СНГ",
                price_per_unit=11000.0, demand_volume=2000.0, supply_volume=2500.0,
                deficit_score=1.8, oversupply_score=3.5, weather_risk=2.0
            )
            db.add_all([wheat_signal, corn_signal])
            # Also seed some market offers/requests for immediate display
            seed_farmer = User(
                role="Farmer", name="КФХ Рассвет",
                phone="+79334445566", region="СНГ",
                crop="Кукуруза", area=200.0, expected_yield=600.0,
                trust_index=78.0, verification_status="verified"
            )
            seed_farmer2 = User(
                role="Farmer", name="Фермер ИП Сидоров",
                phone="+79445556677", region="СНГ",
                crop="Пшеница", area=150.0, expected_yield=480.0,
                trust_index=82.0, verification_status="verified"
            )
            db.add_all([seed_farmer, seed_farmer2])
            db.commit()
            db.refresh(seed_farmer)
            db.refresh(seed_farmer2)
            db.refresh(buyer)
            offer1 = MarketOffer(seller_id=seed_farmer2.id, crop="Пшеница", volume=150, price_per_unit=14000, region="СНГ")
            offer2 = MarketOffer(seller_id=seed_farmer.id, crop="Кукуруза", volume=300, price_per_unit=11200, region="СНГ")
            req1 = MarketRequest(buyer_id=buyer.id, crop="Пшеница", volume=500, price_per_unit=14500, region="СНГ")
            req2 = MarketRequest(buyer_id=buyer.id, crop="Ячмень", volume=200, price_per_unit=12000, region="СНГ")
            db.add_all([offer1, offer2, req1, req2])
            db.commit()
            print("[Startup] ✅ Database initialized and seeded successfully.")
    except Exception as e:
        print(f"[Startup] ⚠️ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

    # Run maintenance immediately on startup
    await asyncio.to_thread(run_db_maintenance)

    # Start daily maintenance background task
    maintenance_task = asyncio.create_task(daily_maintenance_loop())
    print("[Startup] ✅ Daily maintenance scheduler started.")

    # Start Telegram bot in background (non-blocking)
    bot_task = None
    try:
        from bot.agrobot import main as agrobot_main
        bot_task = asyncio.create_task(agrobot_main(start_http=False))
        print("[Startup] ✅ Telegram bot started in background.")
    except Exception as e:
        print(f"[Startup] ⚠️ Could not start Telegram bot: {e}")

    yield  # ── App is running ──────────────────────────────────────────────

    # ── Shutdown ─────────────────────────────────────────────────────────────
    maintenance_task.cancel()
    if bot_task:
        bot_task.cancel()
    print("[Shutdown] Background tasks cancelled cleanly.")

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
app.add_middleware(RateLimitMiddleware, limit=30, window=10)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(deals.router, prefix="/api/v1/deals", tags=["deals"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["integrations"])
app.include_router(market.router, prefix="/api/v1/market", tags=["market"])


@app.post("/api/v1/bot/webhook")
async def bot_webhook(update: dict):
    from bot.agrobot import bot, dp
    from aiogram.types import Update
    try:
        telegram_update = Update.model_validate(update, context={"bot": bot})
        await dp.feed_update(bot, telegram_update)
    except Exception as e:
        print(f"[Webhook] Error processing update: {e}")
    return "ok"


@app.get("/")
def read_root():
    return {"message": "Welcome to AgroBalance API", "status": "running", "version": "2.0"}
