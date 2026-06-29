import logging
import asyncio
import os
import httpx
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

load_dotenv()

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = "http://127.0.0.1:8000/api/v1"
TMA_URL = os.getenv("TMA_URL", "http://localhost:5173")

# Bot token
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN is missing in .env file")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

async def check_user_registered(telegram_id: int) -> tuple[bool, dict]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.post(f"{API_URL}/auth/login", json={"telegram_id": str(telegram_id)})
            if res.status_code == 200:
                return True, res.json()
    except Exception as e:
        logger.error(f"Error checking registration on backend: {e}")
    return False, {}

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    first_name = message.from_user.first_name
    
    is_reg, user_data = await check_user_registered(telegram_id)
    
    welcome_text = (
        f"Привет, {first_name}! 👋\n\n"
        "Добро пожаловать в **AgroBalance / АгроБаланс** — "
        "единую экосистему агрорынка на базе AI и доверия.\n\n"
        "Здесь фермеры продают урожай, покупатели находят надежных поставщиков, "
        "а перевозчики и склады зарабатывают на логистике."
    )
    
    if is_reg:
        welcome_text += (
            f"\n\nВаш аккаунт найден! 🌾\n"
            f"Текущий **Trust Index**: {user_data.get('trust_index', 50.0)}/100"
        )
        
        # Keyboard for registered user
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🌾 Войти в АгроБаланс (Mini App)", web_app=WebAppInfo(url=TMA_URL))],
            [InlineKeyboardButton(text="📊 Проверить мой рейтинг", callback_data="check_trust")],
            [InlineKeyboardButton(text="❓ Справка", callback_data="help")]
        ])
    else:
        welcome_text += (
            "\n\nДля доступа к сделкам, AI-рекомендациям и рынку, "
            "пожалуйста, пройдите простую регистрацию."
        )
        
        # Keyboard for new user
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📝 Зарегистрироваться в Mini App", web_app=WebAppInfo(url=f"{TMA_URL}/#/register"))]
        ])
        
    await message.answer(welcome_text, reply_markup=keyboard, parse_mode="Markdown")

@dp.callback_query(lambda c: c.data == "check_trust")
async def process_check_trust(callback_query: types.CallbackQuery):
    telegram_id = callback_query.from_user.id
    is_reg, user_data = await check_user_registered(telegram_id)
    
    if is_reg:
        trust_score = user_data.get('trust_index', 50.0)
        
        # Interpret score
        if trust_score >= 80:
            status = "Зеленая зона 🟢 (Максимальное доверие, приоритет в выдаче, лучшие сделки)"
        elif trust_score >= 50:
            status = "Желтая зона 🟡 (Средний уровень доверия, базовые лимиты)"
        else:
            status = "Красная зона 🔴 (Подозрительный аккаунт, доступ к сделкам ограничен)"
            
        await callback_query.answer()
        await callback_query.message.answer(
            f"📊 **Ваш AgroBalance Trust Index**: {trust_score}/100\n\n"
            f"Статус: {status}\n\n"
            f"Повышайте рейтинг, совершая сделки в системе и верифицируя поля в Mini App!",
            parse_mode="Markdown"
        )
    else:
        await callback_query.answer("Пожалуйста, зарегистрируйтесь сначала!")

@dp.callback_query(lambda c: c.data == "help")
async def process_help(callback_query: types.CallbackQuery):
    await callback_query.answer()
    help_text = (
        "💡 **AgroBalance Справка**\n\n"
        "🔒 **Безопасная сделка (Escrow)**: Все расчеты проводятся через блокировку средств. "
        "Покупатель вносит оплату, деньги удерживаются в Escrow (карта или TON смарт-контракт) "
        "и выплачиваются продавцу только после подтверждения доставки.\n\n"
        "🌾 **AI Рекомендации**: Алгоритм анализирует спрос, регион и погодные условия "
        "и предлагает 3 сценария для посевов/продаж: Safe (мин. риск), Profit (оптимально), "
        "и Aggressive (макс. доход).\n\n"
        "🛡️ **Антифрод**: AntiFraud Core блокирует фальшивые координаты, одинаковые фото "
        "и попытки обхода комиссии (3% с завершенных сделок)."
    )
    await callback_query.message.answer(help_text, parse_mode="Markdown")

async def main():
    logger.info("Starting Telegram Bot...")
    logger.info("Clearing active webhooks...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
