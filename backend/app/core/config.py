import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "AgroBalance API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agrobalance.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_agrobalance_key_1597")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))
    
    # API Keys
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    USER_TELEGRAM_ID: int = int(os.getenv("USER_TELEGRAM_ID", "8017348770"))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Payments
    PLATFORM_WALLET_ADDRESS: str = os.getenv("PLATFORM_WALLET_ADDRESS", "EQA_t-t_dummy_wallet_address_platform")

settings = Settings()
