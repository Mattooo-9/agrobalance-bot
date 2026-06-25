from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.models import User, MarketSignal, MarketOffer, MarketRequest
from backend.app.api.v1.endpoints import auth, users, deals, recommendations, payments, integrations

app = FastAPI(title=settings.PROJECT_NAME)

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

@app.on_event("startup")
def startup_event():
    # Create SQLite database tables if not exist
    Base.metadata.create_all(bind=engine)
    
    # Seed initial test data if DB is empty
    db = SessionLocal()
    try:
        # Check if database already has users
        if db.query(User).count() == 0:
            # Seed default admin
            admin = User(
                telegram_id=str(settings.USER_TELEGRAM_ID),
                role="Admin",
                name="Администратор",
                phone="+79998887766",
                region="Центральный",
                trust_index=100.0,
                verification_status="verified"
            )
            db.add(admin)

            # Seed some default stakeholders for the marketplace
            buyer = User(
                role="Buyer",
                name="АгроХолдинг Восток",
                phone="+79001112233",
                region="Южный",
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
                region="Южный",
                vehicle_type="Зерновоз КАМАЗ",
                capacity=25.0,
                tariff_per_km=45.0,
                routes="Южный, Центральный",
                trust_index=90.0,
                verification_status="verified"
            )
            warehouse = User(
                role="Warehouse",
                name="Элеватор 'Золотой Колос'",
                phone="+79223334455",
                region="Южный",
                capacity_tons=5000.0,
                storage_conditions="Сухой силос, вентиляция",
                storage_price=150.0,  # rub per ton / month
                availability=True,
                trust_index=95.0,
                verification_status="verified"
            )
            db.add_all([buyer, carrier, warehouse])

            # Seed market signals for the scoring formula
            wheat_signal = MarketSignal(
                crop="Пшеница",
                region="Южный",
                price_per_unit=14500.0,
                demand_volume=5000.0,
                supply_volume=3500.0,
                deficit_score=4.2,     # High deficit
                oversupply_score=0.2,
                weather_risk=1.5
            )
            corn_signal = MarketSignal(
                crop="Кукуруза",
                region="Южный",
                price_per_unit=11000.0,
                demand_volume=2000.0,
                supply_volume=2500.0,
                deficit_score=1.8,     # Oversupply risk
                oversupply_score=3.5,
                weather_risk=2.0
            )
            db.add_all([wheat_signal, corn_signal])
            
            db.commit()
            print("Database initialized and default data seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

    # Start Telegram bot in background
    try:
        import asyncio
        from bot.agrobot import main as agrobot_main
        asyncio.create_task(agrobot_main())
        print("Telegram bot started successfully in background.")
    except Exception as e:
        print(f"Error starting Telegram bot in background: {e}")

@app.get("/")
def read_root():
    return {"message": "Welcome to AgroBalance API", "status": "running"}
