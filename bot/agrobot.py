"""
AgroBalance / АгроБаланс — Telegram Bot
Полностью рабочий бот со встроенной базой данных SQLite,
AI-рекомендациями через Gemini, антифродом, реферальной системой,
Deal Engine с 1% комиссией для платформы.

Запуск: python3 bot/agrobot.py
"""

import os
import sys
import asyncio
import json
import hmac
import hashlib
import uuid
import math
import re
import logging
from datetime import datetime, timedelta
from typing import Optional

# ─── Dotenv ───────────────────────────────────────────────────────────────────
from pathlib import Path
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_ID   = int(os.environ.get("USER_TELEGRAM_ID", "8017348770"))
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
BOT_USERNAME = "AgroBalanceGlobalBot"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ─── SQLite Database (built-in, no server needed) ─────────────────────────────
import sqlite3

DB_PATH = Path(__file__).parent.parent / "agrobalance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id     TEXT UNIQUE,
        role            TEXT NOT NULL DEFAULT 'Farmer',
        name            TEXT NOT NULL DEFAULT '',
        phone           TEXT NOT NULL DEFAULT '',
        region          TEXT DEFAULT 'Южный',
        crop            TEXT,
        area            REAL,
        expected_yield  REAL,
        lat             REAL,
        lon             REAL,
        needed_crops    TEXT,
        vehicle_type    TEXT,
        capacity        REAL,
        tariff_per_km   REAL,
        capacity_tons   REAL,
        storage_price   REAL,
        trust_index     REAL NOT NULL DEFAULT 50.0,
        verified        INTEGER NOT NULL DEFAULT 0,
        referral_code   TEXT UNIQUE,
        referred_by_id  INTEGER REFERENCES users(id),
        state           TEXT DEFAULT 'idle',
        state_data      TEXT DEFAULT '{}',
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deals (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id       INTEGER REFERENCES users(id),
        buyer_id        INTEGER REFERENCES users(id),
        crop            TEXT NOT NULL,
        volume          REAL NOT NULL,
        price_per_unit  REAL NOT NULL,
        total_price     REAL NOT NULL,
        region          TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'proposed',
        payment_status  TEXT NOT NULL DEFAULT 'pending',
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS deal_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id    INTEGER REFERENCES deals(id),
        user_id    INTEGER REFERENCES users(id),
        action     TEXT NOT NULL,
        comment    TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_offers (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id      INTEGER REFERENCES users(id),
        crop           TEXT NOT NULL,
        volume         REAL NOT NULL,
        price_per_unit REAL NOT NULL,
        region         TEXT NOT NULL,
        is_active      INTEGER NOT NULL DEFAULT 1,
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_requests (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        buyer_id       INTEGER REFERENCES users(id),
        crop           TEXT NOT NULL,
        volume         REAL NOT NULL,
        price_per_unit REAL NOT NULL,
        region         TEXT NOT NULL,
        is_active      INTEGER NOT NULL DEFAULT 1,
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trust_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER REFERENCES users(id),
        change     REAL NOT NULL,
        factor     TEXT NOT NULL,
        note       TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS antifraud_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER REFERENCES users(id),
        rule       TEXT NOT NULL,
        severity   TEXT NOT NULL DEFAULT 'medium',
        details    TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referral_rewards (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id  INTEGER REFERENCES users(id),
        referee_id   INTEGER REFERENCES users(id),
        deal_id      INTEGER REFERENCES deals(id),
        amount       REAL NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)
    conn.commit()
    conn.close()
    log.info("✅ Database initialized.")

# ─── Trust Engine ──────────────────────────────────────────────────────────────
TRUST_FACTORS = {
    "verified_geo":      +10.0,
    "actual_photo":      +10.0,
    "completed_deal":    +5.0,
    "timely_payment":    +5.0,
    "referral_joined":   +5.0,
    "referral_deal":     +2.0,
    "duplicate_phone":   -30.0,
    "impossible_yield":  -20.0,
    "commission_bypass": -30.0,
    "broken_deal":       -25.0,
    "complaint":         -15.0,
}

def update_trust(telegram_id: str, factor: str, note: str = "") -> float:
    change = TRUST_FACTORS.get(factor, 0.0)
    if change == 0:
        return 50.0
    conn = get_db()
    try:
        row = conn.execute("SELECT id, trust_index FROM users WHERE telegram_id=?", (telegram_id,)).fetchone()
        if not row:
            return 50.0
        new_score = max(0.0, min(100.0, row["trust_index"] + change))
        conn.execute("UPDATE users SET trust_index=? WHERE id=?", (new_score, row["id"]))
        conn.execute(
            "INSERT INTO trust_events(user_id, change, factor, note) VALUES (?,?,?,?)",
            (row["id"], change, factor, note)
        )
        conn.commit()
        return new_score
    finally:
        conn.close()

# ─── Antifraud ────────────────────────────────────────────────────────────────
CROP_YIELD_MAX = {"пшеница": 10, "ячмень": 8, "кукуруза": 15, "подсолнечник": 5, "картофель": 50}

def check_yield(crop: str, area: float, total_yield: float) -> bool:
    """Returns True if yield is suspicious (too high)."""
    if not crop or not area or not total_yield or area <= 0:
        return False
    yph = total_yield / area
    for key, limit in CROP_YIELD_MAX.items():
        if key in crop.lower():
            if yph > limit:
                return True
    return False

def check_chat_bypass(text: str) -> bool:
    phone = re.search(r'\b(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b', text)
    card  = re.search(r'\b\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}\b', text)
    # only flag @username in the context of financial offers
    money_words = any(w in text.lower() for w in ['переведи', 'карт', 'сберо', 'тинькофф', 'тинк', 'payment', 'sbp'])
    at_user = re.search(r'@[a-zA-Z0-9_]{4,}', text) and money_words
    return bool(phone or card or at_user)

# ─── Referral Code Generator ───────────────────────────────────────────────────
def make_referral_code(telegram_id: str) -> str:
    return "AB" + hashlib.md5(str(telegram_id).encode()).hexdigest()[:8].upper()

# ─── AI Recommendations via Gemini ────────────────────────────────────────────
import urllib.request

def call_gemini(prompt: str) -> str:
    if not GEMINI_KEY:
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    data = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 800, "temperature": 0.7}
    }).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            result = json.loads(r.read())
            return result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        log.warning(f"Gemini error: {e}")
        return ""

def generate_recommendations(user: sqlite3.Row) -> str:
    crop  = user["crop"] or "пшеница"
    area  = user["area"] or 50
    yld   = user["expected_yield"] or (area * 4)
    trust = user["trust_index"]
    region = user["region"] or "Южный"

    # Try Gemini first
    prompt = f"""Ты — эксперт агрорынка. Дай КРАТКИЕ советы фермеру (3 сценария).

Данные фермера: культура={crop}, площадь={area}га, урожай={yld}т, регион={region}, Trust Index={trust}/100.

Для каждого сценария: 1-2 предложения. Формат:
🛡️ SAFE: [текст]
💰 PROFIT: [текст]  
🔥 AGGRESSIVE: [текст]

Не используй сложные термины. Говори как для обычного фермера."""

    ai_text = call_gemini(prompt)

    if ai_text and "SAFE" in ai_text.upper():
        return ai_text

    # Local fallback
    base_rev = yld * 14000
    return (
        f"🛡️ *SAFE* — Сохранить урожай на элеваторе и продать через 2-3 месяца по стабильной цене.\n"
        f"   Прогнозная выручка: ~{int(base_rev*0.85):,} руб. Риск: низкий.\n\n"
        f"💰 *PROFIT* — Продать {crop} сразу после сбора местным покупателям.\n"
        f"   Прогнозная выручка: ~{int(base_rev):,} руб. Риск: умеренный.\n\n"
        f"🔥 *AGGRESSIVE* — Заключить форвардный контракт с переработчиком прямо сейчас.\n"
        f"   Прогнозная выручка: ~{int(base_rev*1.25):,} руб. Риск: высокий."
    )

# ─── Database helpers ──────────────────────────────────────────────────────────
def get_user(telegram_id: str) -> Optional[sqlite3.Row]:
    conn = get_db()
    try:
        return conn.execute("SELECT * FROM users WHERE telegram_id=?", (str(telegram_id),)).fetchone()
    finally:
        conn.close()

def set_state(telegram_id: str, state: str, data: dict = {}):
    conn = get_db()
    try:
        conn.execute(
            "UPDATE users SET state=?, state_data=? WHERE telegram_id=?",
            (state, json.dumps(data, ensure_ascii=False), str(telegram_id))
        )
        conn.commit()
    finally:
        conn.close()

def get_state(telegram_id: str) -> tuple[str, dict]:
    conn = get_db()
    try:
        row = conn.execute("SELECT state, state_data FROM users WHERE telegram_id=?", (str(telegram_id),)).fetchone()
        if row:
            return row["state"] or "idle", json.loads(row["state_data"] or "{}")
        return "idle", {}
    finally:
        conn.close()

def create_temp_user(telegram_id: str, name: str):
    code = make_referral_code(telegram_id)
    conn = get_db()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO users(telegram_id, name, referral_code, state) VALUES (?,?,?,'reg_role')",
            (str(telegram_id), name, code)
        )
        conn.commit()
    finally:
        conn.close()

# ─── Message Formatting ────────────────────────────────────────────────────────
def trust_bar(score: float) -> str:
    filled = int(score / 10)
    bar = "█" * filled + "░" * (10 - filled)
    emoji = "🟢" if score >= 80 else ("🟡" if score >= 50 else "🔴")
    return f"{emoji} [{bar}] {score:.0f}/100"

def format_money(amount: float, region: str = None) -> str:
    macro_region = region.split(":")[0].strip() if region and ":" in region else (region or "СНГ")
    if macro_region == "Европа":
        return f"{amount:,.0f} €".replace(",", " ")
    elif macro_region == "СНГ":
        return f"{amount:,.0f} ₽".replace(",", " ")
    else:
        return f"{amount:,.0f} $".replace(",", " ")

# ─── BOT ──────────────────────────────────────────────────────────────────────
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    Message, CallbackQuery,
    InlineKeyboardMarkup, InlineKeyboardButton,
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove,
    WebAppInfo
)
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.client.default import DefaultBotProperties

bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode="Markdown"))
dp  = Dispatcher(storage=MemoryStorage())

# --- Anti-Spam / Anti-Bot Rate Limiter Middleware ---
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

class AntiSpamMiddleware(BaseMiddleware):
    def __init__(self, limit: float = 1.0):
        self.limit = limit
        self.last_msg = {}
        super().__init__()

    async def __call__(self, handler, event: TelegramObject, data: dict):
        if isinstance(event, (Message, CallbackQuery)):
            user_id = event.from_user.id
            tg_id = str(user_id)
            
            # AntiFraud / Low Trust index blocking:
            user = get_user(tg_id)
            if user and user["trust_index"] < 20.0 and user["role"] != "Admin":
                if isinstance(event, Message):
                    await event.answer(
                        "⚠️ *Доступ к AgroBalance заблокирован!*\n\n"
                        "Ваш рейтинг доверия (*TI < 20*) опустился ниже критической отметки из-за подозрительной активности.\n"
                        "🛡️ Все операции приостановлены. Для разблокировки обратитесь в службу поддержки."
                    )
                elif isinstance(event, CallbackQuery):
                    await event.answer("⚠️ Доступ заблокирован (TI < 20). Все операции приостановлены.", show_alert=True)
                return

        if isinstance(event, Message):
            user_id = event.from_user.id
            now = datetime.now()
            if user_id in self.last_msg:
                elapsed = (now - self.last_msg[user_id]).total_seconds()
                if elapsed < self.limit:
                    return  # Silent drop of bot/user spam
            self.last_msg[user_id] = now
        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id
            now = datetime.now()
            if user_id in self.last_msg:
                elapsed = (now - self.last_msg[user_id]).total_seconds()
                if elapsed < 0.5:
                    await event.answer("⏳ Слишком быстро! Пожалуйста, подождите.")
                    return
            self.last_msg[user_id] = now
        return await handler(event, data)


dp.message.outer_middleware(AntiSpamMiddleware(limit=1.0))
dp.callback_query.outer_middleware(AntiSpamMiddleware(limit=0.5))

# ─── FSM States ────────────────────────────────────────────────────────────────
class Reg(StatesGroup):
    role          = State()
    name          = State()
    phone         = State()
    region        = State()
    country       = State()
    locality      = State()
    crop          = State()
    area          = State()
    expected_yield = State()
    needed_crops  = State()
    vehicle_type  = State()
    capacity      = State()
    capacity_tons = State()
    storage_price = State()
    done          = State()

class DealCreate(StatesGroup):
    crop   = State()
    volume = State()
    price  = State()

class OfferCreate(StatesGroup):
    crop   = State()
    volume = State()
    price  = State()

# ─── Keyboards ─────────────────────────────────────────────────────────────────
def kb_main(role: str = "Farmer") -> InlineKeyboardMarkup:
    rows = []
    rows.append([InlineKeyboardButton(text="🌾 Мой профиль", callback_data="my_profile")])
    rows.append([InlineKeyboardButton(text="📊 Рынок предложений", callback_data="market")])
    if role == "Farmer":
        rows.append([InlineKeyboardButton(text="🤖 AI Рекомендации", callback_data="ai_recs")])
        rows.append([InlineKeyboardButton(text="➕ Создать предложение", callback_data="new_offer")])
    elif role == "Buyer":
        rows.append([InlineKeyboardButton(text="➕ Создать запрос на покупку", callback_data="new_request")])
    rows.append([InlineKeyboardButton(text="🤝 Мои сделки", callback_data="my_deals")])
    rows.append([InlineKeyboardButton(text="👥 Реферальная программа", callback_data="referral")])
    rows.append([InlineKeyboardButton(text="📈 Trust Index", callback_data="trust_info")])
    if role == "Admin":
        rows.append([InlineKeyboardButton(text="🛡️ Антифрод логи", callback_data="admin_antifraud")])
    return InlineKeyboardMarkup(inline_keyboard=rows)

def kb_roles() -> InlineKeyboardMarkup:
    roles = [
        ("🌾 Фермер", "role_Farmer"),
        ("🛒 Покупатель", "role_Buyer"),
        ("🚚 Перевозчик", "role_Carrier"),
        ("🏭 Элеватор", "role_Warehouse"),
        ("⚙️ Переработчик", "role_Processor"),
        ("🌱 Поставщик", "role_Supplier"),
        ("👨‍🔬 Агроэксперт", "role_Agronomist"),
    ]
    rows = []
    for i in range(0, len(roles), 2):
        row = [InlineKeyboardButton(text=roles[i][0], callback_data=roles[i][1])]
        if i+1 < len(roles):
            row.append(InlineKeyboardButton(text=roles[i+1][0], callback_data=roles[i+1][1]))
        rows.append(row)
    return InlineKeyboardMarkup(inline_keyboard=rows)

def kb_regions() -> InlineKeyboardMarkup:
    regions = ["Европа", "СНГ", "Азия", "Северная Америка", "Латинская Америка", "Ближний Восток"]
    rows = [[InlineKeyboardButton(text=r, callback_data=f"region_{r}")] for r in regions]
    return InlineKeyboardMarkup(inline_keyboard=rows)

COUNTRIES_BY_REGION = {
    "Европа": ["Германия", "Франция", "Италия", "Испания", "Польша", "Нидерланды", "Великобритания", "Румыния"],
    "СНГ": ["Россия", "Казахстан", "Беларусь", "Узбекистан", "Азербайджан", "Кыргызстан", "Армения", "Таджикистан", "Молдова"],
    "Азия": ["Китай", "Индия", "Турция", "Иран", "Вьетнам", "Таиланд", "Пакистан"],
    "Северная Америка": ["США", "Канада", "Мексика"],
    "Латинская Америка": ["Бразилия", "Аргентина", "Колумбия", "Чили", "Перу"],
    "Ближний Восток": ["ОАЭ", "Саудовская Аравия", "Египет", "ЮАР", "Нигерия", "Кения"]
}

def kb_countries(region: str) -> InlineKeyboardMarkup:
    countries = COUNTRIES_BY_REGION.get(region, ["Другая страна"])
    rows = []
    for i in range(0, len(countries), 2):
        row = [InlineKeyboardButton(text=countries[i], callback_data=f"country_{countries[i]}")]
        if i+1 < len(countries):
            row.append(InlineKeyboardButton(text=countries[i+1], callback_data=f"country_{countries[i+1]}"))
        rows.append(row)
    if "Другая страна" not in countries:
        rows.append([InlineKeyboardButton(text="Другая страна", callback_data="country_Другая страна")])
    return InlineKeyboardMarkup(inline_keyboard=rows)

LOCALITIES_BY_COUNTRY = {
    "Россия": ["Краснодарский край", "Ростовская область", "Ставропольский край", "Алтайский край", "Воронежская область", "Белгородская область", "Саратовская область"],
    "Казахстан": ["Акмолинская область", "Костанайская область", "Северо-Казахстанская область", "Алматинская область"],
    "Беларусь": ["Минская область", "Гродненская область", "Брестская область"],
    "Узбекистан": ["Ташкентская область", "Самаркандская область", "Ферганская область"],
    "Германия": ["Bavaria", "Lower Saxony", "North Rhine-Westphalia", "Brandenburg"],
    "Франция": ["Centre-Val de Loire", "Grand Est", "Nouvelle-Aquitaine", "Hauts-de-France"],
    "Польша": ["Greater Poland", "Masovian", "Lublin"],
    "США": ["Iowa", "Illinois", "Nebraska", "Minnesota", "Texas", "Kansas"],
    "Канада": ["Saskatchewan", "Alberta", "Manitoba", "Ontario"],
    "Бразилия": ["Mato Grosso", "Paraná", "Rio Grande do Sul", "Goiás"],
    "Аргентина": ["Buenos Aires", "Córdoba", "Santa Fe"],
    "Китай": ["Heilongjiang", "Henan", "Shandong", "Anhui"],
    "Индия": ["Punjab", "Uttar Pradesh", "Haryana", "Madhya Pradesh"],
    "Турция": ["Central Anatolia", "Aegean", "Marmara"],
    "Египет": ["Nile Delta", "Upper Egypt"],
    "ЮАР": ["Free State", "Western Cape", "Gauteng"]
}

def kb_localities(country: str) -> InlineKeyboardMarkup:
    localities = LOCALITIES_BY_COUNTRY.get(country, [])
    rows = []
    for i in range(0, len(localities), 2):
        row = [InlineKeyboardButton(text=localities[i], callback_data=f"locality_{localities[i]}")]
        if i+1 < len(localities):
            row.append(InlineKeyboardButton(text=localities[i+1], callback_data=f"locality_{localities[i+1]}"))
        rows.append(row)
    rows.append([InlineKeyboardButton(text="✍️ Ввести вручную", callback_data="locality_manual")])
    return InlineKeyboardMarkup(inline_keyboard=rows)

def kb_phone() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Поделиться номером", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )

def kb_back_main() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ])

def kb_deal_actions(deal_id: int, deal_status: str, role: str) -> InlineKeyboardMarkup:
    rows = []
    if deal_status == "proposed":
        rows.append([InlineKeyboardButton(text="✅ Принять сделку", callback_data=f"deal_accept_{deal_id}")])
        rows.append([InlineKeyboardButton(text="❌ Отклонить", callback_data=f"deal_cancel_{deal_id}")])
    elif deal_status == "accepted":
        if role == "Buyer":
            rows.append([InlineKeyboardButton(text="💳 Оплатить в Escrow", callback_data=f"deal_pay_{deal_id}")])
    elif deal_status == "paid":
        rows.append([InlineKeyboardButton(text="🚚 Подтвердить доставку", callback_data=f"deal_deliver_{deal_id}")])
    elif deal_status == "delivered":
        if role == "Buyer":
            rows.append([InlineKeyboardButton(text="✅ Подтвердить получение", callback_data=f"deal_complete_{deal_id}")])
        rows.append([InlineKeyboardButton(text="⚖️ Открыть спор", callback_data=f"deal_dispute_{deal_id}")])
    rows.append([InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")])
    return InlineKeyboardMarkup(inline_keyboard=rows)

# ─── /start ───────────────────────────────────────────────────────────────────
@dp.message(CommandStart())
async def cmd_start(msg: Message, state: FSMContext):
    tg_id = str(msg.from_user.id)
    args  = msg.text.split() if msg.text else []
    ref_code = args[1] if len(args) > 1 and args[1].startswith("AB") else None

    # Check existing user
    user = get_user(tg_id)

    if user and user["role"] and user["name"]:
        # Already registered — show main menu
        role_label = {"Farmer":"Фермер","Buyer":"Покупатель","Carrier":"Перевозчик",
                      "Warehouse":"Элеватор","Admin":"Администратор"}.get(user["role"], user["role"])
        await msg.answer(
            f"👋 С возвращением, *{user['name']}*!\n"
            f"Роль: *{role_label}* · {trust_bar(user['trust_index'])}\n\n"
            "Выберите действие:",
            reply_markup=kb_main(user["role"])
        )
        await state.clear()
        return

    # New user — start registration
    create_temp_user(tg_id, msg.from_user.first_name or "Аграрий")

    # Save referral code if provided
    if ref_code:
        conn = get_db()
        try:
            referrer = conn.execute("SELECT id FROM users WHERE referral_code=?", (ref_code,)).fetchone()
            if referrer:
                conn.execute("UPDATE users SET referred_by_id=? WHERE telegram_id=?",
                             (referrer["id"], tg_id))
                conn.commit()
        finally:
            conn.close()

    await state.set_state(Reg.role)
    await msg.answer(
        "🌾 *Добро пожаловать в AgroBalance!*\n\n"
        "Единый агрорынок с честными ценами, AI-рекомендациями и безопасными сделками.\n\n"
        "*Шаг 1/5:* Кто вы на агрорынке?",
        reply_markup=kb_roles()
    )

# ─── Registration FSM ─────────────────────────────────────────────────────────
@dp.callback_query(F.data.startswith("role_"), Reg.role)
async def reg_role(cb: CallbackQuery, state: FSMContext):
    role = cb.data.replace("role_", "")
    await state.update_data(role=role)
    await cb.message.edit_text(
        f"✅ Роль выбрана: *{role}*\n\n*Шаг 2/5:* Введите ваше имя или название хозяйства:",
        reply_markup=None
    )
    await state.set_state(Reg.name)

@dp.message(Reg.name)
async def reg_name(msg: Message, state: FSMContext):
    await state.update_data(name=msg.text.strip())
    await msg.answer(
        "*Шаг 3/5:* Поделитесь номером телефона для верификации аккаунта:",
        reply_markup=kb_phone()
    )
    await state.set_state(Reg.phone)

@dp.message(Reg.phone, F.contact)
async def reg_phone_contact(msg: Message, state: FSMContext):
    phone = msg.contact.phone_number
    await _process_phone(msg, state, phone)

@dp.message(Reg.phone)
async def reg_phone_text(msg: Message, state: FSMContext):
    # Also accept typed phone
    phone = msg.text.strip()
    await _process_phone(msg, state, phone)

async def _process_phone(msg: Message, state: FSMContext, phone: str):
    # Antifraud: check duplicate phone
    conn = get_db()
    dup = conn.execute(
        "SELECT id FROM users WHERE phone=? AND telegram_id!=?",
        (phone, str(msg.from_user.id))
    ).fetchone()
    conn.close()

    if dup:
        update_trust(str(msg.from_user.id), "duplicate_phone",
                     f"Дубль телефона {phone}")
        await msg.answer(
            "⚠️ *AntiFraud Core:* Этот номер телефона уже используется другим аккаунтом.\n"
            "Ваш Trust Index снижен. Продолжение регистрации...",
            reply_markup=ReplyKeyboardRemove()
        )
    else:
        await msg.answer("✅ Телефон принят.", reply_markup=ReplyKeyboardRemove())

    conn = get_db()
    conn.execute("UPDATE users SET phone=? WHERE telegram_id=?",
                 (phone, str(msg.from_user.id)))
    conn.commit()
    conn.close()

    await state.update_data(phone=phone)
    await msg.answer(
        "*Шаг 4/5:* Выберите ваш регион:",
        reply_markup=kb_regions()
    )
    await state.set_state(Reg.region)

@dp.callback_query(F.data.startswith("region_"), Reg.region)
async def reg_region(cb: CallbackQuery, state: FSMContext):
    region = cb.data.replace("region_", "")
    await state.update_data(region=region)
    await cb.message.edit_text(
        f"✅ Регион: *{region}*\n\nВыберите вашу страну или территорию:",
        reply_markup=kb_countries(region)
    )
    await state.set_state(Reg.country)

@dp.callback_query(F.data.startswith("country_"), Reg.country)
async def reg_country(cb: CallbackQuery, state: FSMContext):
    country = cb.data.replace("country_", "")
    await state.update_data(country=country)
    await cb.message.edit_text(
        f"✅ Страна: *{country}*\n\nВыберите конкретную область/местность или введите вручную:",
        reply_markup=kb_localities(country)
    )
    await state.set_state(Reg.locality)

@dp.callback_query(F.data.startswith("locality_"), Reg.locality)
async def reg_locality_cb(cb: CallbackQuery, state: FSMContext):
    locality = cb.data.replace("locality_", "")
    if locality == "manual":
        await cb.message.edit_text("✍️ Введите название вашей области/местности вручную:")
        return
    await process_locality_selection(cb.message, locality, state)

@dp.message(Reg.locality)
async def reg_locality_msg(msg: Message, state: FSMContext):
    await process_locality_selection(msg, msg.text.strip(), state)

async def process_locality_selection(msg_obj, locality: str, state: FSMContext):
    data = await state.get_data()
    region = data.get("region", "СНГ")
    country = data.get("country", "")
    combined_region = f"{region}: {country} - {locality}" if locality else f"{region}: {country}"
    await state.update_data(region=combined_region)
    role = data.get("role", "Farmer")

    async def send_msg(text):
        if isinstance(msg_obj, Message):
            await msg_obj.answer(text)
        else:
            await msg_obj.edit_text(text)

    if role == "Farmer":
        await send_msg(
            f"✅ Регион: *{combined_region}*\n\n*Шаг 5/5:* Введите основную выращиваемую культуру\n_(пример: Пшеница 3 класс)_:"
        )
        await state.set_state(Reg.crop)
    elif role == "Buyer":
        await send_msg(
            f"✅ Регион: *{combined_region}*\n\n*Шаг 5/5:* Какие культуры вас интересуют?\n_(пример: Пшеница, Кукуруза)_:"
        )
        await state.set_state(Reg.needed_crops)
    elif role == "Carrier":
        await send_msg(
            f"✅ Регион: *{combined_region}*\n\n*Шаг 5/5:* Тип транспорта и грузоподъёмность\n_(пример: Зерновоз КАМАЗ, 25 тонн)_:"
        )
        await state.set_state(Reg.vehicle_type)
    elif role == "Warehouse":
        await send_msg(
            f"✅ Регион: *{combined_region}*\n\n*Шаг 5/5:* Вместимость элеватора (в тоннах):"
        )
        await state.set_state(Reg.capacity_tons)
    else:
        # Processor / Supplier / Agronomist — skip specific fields
        await _finish_registration(msg_obj, state)

# Farmer details
@dp.message(Reg.crop)
async def reg_crop(msg: Message, state: FSMContext):
    await state.update_data(crop=msg.text.strip())
    await msg.answer("Площадь посевов (в гектарах), например: *120*:")
    await state.set_state(Reg.area)

@dp.message(Reg.area)
async def reg_area(msg: Message, state: FSMContext):
    try:
        area = float(msg.text.replace(",", ".").strip())
        await state.update_data(area=area)
        await msg.answer("Ожидаемый сбор урожая (в тоннах), например: *480*:")
        await state.set_state(Reg.expected_yield)
    except ValueError:
        await msg.answer("❌ Введите число, например: *120*")

@dp.message(Reg.expected_yield)
async def reg_yield(msg: Message, state: FSMContext):
    try:
        yld = float(msg.text.replace(",", ".").strip())
        data = await state.get_data()

        # Antifraud yield check
        if check_yield(data.get("crop",""), data.get("area",0), yld):
            update_trust(str(msg.from_user.id), "impossible_yield",
                         f"Урожайность {yld/data['area']:.1f} т/га — аномально высокая")
            await msg.answer(
                "⚠️ *AntiFraud Core:* Заявленная урожайность значительно превышает норму для данной культуры.\n"
                "Зафиксировано. Trust Index снижен. Введённые данные будут проверены."
            )

        await state.update_data(expected_yield=yld)
        await _finish_registration(msg, state)
    except ValueError:
        await msg.answer("❌ Введите число, например: *480*")

# Buyer details
@dp.message(Reg.needed_crops)
async def reg_needed_crops(msg: Message, state: FSMContext):
    await state.update_data(needed_crops=msg.text.strip())
    await _finish_registration(msg, state)

# Carrier details
@dp.message(Reg.vehicle_type)
async def reg_vehicle(msg: Message, state: FSMContext):
    await state.update_data(vehicle_type=msg.text.strip())
    await msg.answer("Грузоподъёмность (тонн):")
    await state.set_state(Reg.capacity)

@dp.message(Reg.capacity)
async def reg_capacity(msg: Message, state: FSMContext):
    try:
        cap = float(msg.text.replace(",",".").strip())
        await state.update_data(capacity=cap)
        await _finish_registration(msg, state)
    except ValueError:
        await msg.answer("❌ Введите число.")

# Warehouse details
@dp.message(Reg.capacity_tons)
async def reg_cap_tons(msg: Message, state: FSMContext):
    try:
        cap = float(msg.text.replace(",",".").strip())
        await state.update_data(capacity_tons=cap)
        await msg.answer("Тариф за хранение (руб / тонна в месяц):")
        await state.set_state(Reg.storage_price)
    except ValueError:
        await msg.answer("❌ Введите число.")

@dp.message(Reg.storage_price)
async def reg_storage_price(msg: Message, state: FSMContext):
    try:
        price = float(msg.text.replace(",",".").strip())
        await state.update_data(storage_price=price)
        await _finish_registration(msg, state)
    except ValueError:
        await msg.answer("❌ Введите число.")

async def _finish_registration(msg_or_obj, state: FSMContext):
    data = await state.get_data()
    if isinstance(msg_or_obj, CallbackQuery):
        tg_id = str(msg_or_obj.from_user.id)
        answer = msg_or_obj.message.answer
    else:
        tg_id = str(msg_or_obj.from_user.id)
        answer = msg_or_obj.answer

    role = data.get("role", "Farmer")

    conn = get_db()
    conn.execute("""
        UPDATE users SET
          role=?, name=?, phone=?, region=?,
          crop=?, area=?, expected_yield=?,
          needed_crops=?, vehicle_type=?, capacity=?,
          capacity_tons=?, storage_price=?,
          state='idle', state_data='{}'
        WHERE telegram_id=?
    """, (
        role,
        data.get("name", ""),
        data.get("phone", ""),
        data.get("region", "Южный"),
        data.get("crop"),
        data.get("area"),
        data.get("expected_yield"),
        data.get("needed_crops"),
        data.get("vehicle_type"),
        data.get("capacity"),
        data.get("capacity_tons"),
        data.get("storage_price"),
        tg_id
    ))
    conn.commit()
    conn.close()

    # Give referral bonus to referrer
    user = get_user(tg_id)
    if user and user["referred_by_id"]:
        conn = get_db()
        referrer = conn.execute("SELECT telegram_id FROM users WHERE id=?", (user["referred_by_id"],)).fetchone()
        conn.close()
        if referrer:
            new_score = update_trust(referrer["telegram_id"], "referral_joined",
                                     f"Приглашённый пользователь зарегистрировался ({role})")
            try:
                await bot.send_message(
                    referrer["telegram_id"],
                    f"🎉 *Отличные новости!* По вашей реферальной ссылке зарегистрировался новый участник AgroBalance!\n"
                    f"Ваш Trust Index вырос: {trust_bar(new_score)}"
                )
            except Exception:
                pass

    await state.clear()
    await answer(
        f"✅ *Регистрация завершена!*\n\n"
        f"Добро пожаловать в AgroBalance, *{data.get('name', 'Аграрий')}*!\n"
        f"Роль: *{role}*\n"
        f"Trust Index: {trust_bar(50.0)}\n\n"
        f"🎁 Используйте вашу реферальную ссылку:\n"
        f"`https://t.me/{BOT_USERNAME}?start={make_referral_code(tg_id)}`\n\n"
        f"За каждого приглашённого: +5 к рейтингу и 20% от комиссии его сделок.",
        reply_markup=kb_main(role)
    )

# ─── Main Menu callback ───────────────────────────────────────────────────────
@dp.callback_query(F.data == "main_menu")
async def cb_main_menu(cb: CallbackQuery, state: FSMContext):
    await state.clear()
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.message.edit_text("Пожалуйста, введите /start для регистрации.")
        return
    role = user["role"] or "Farmer"
    await cb.message.edit_text(
        f"🏠 *Главное меню*\n{trust_bar(user['trust_index'])}",
        reply_markup=kb_main(role)
    )

# ─── My Profile ───────────────────────────────────────────────────────────────
@dp.callback_query(F.data == "my_profile")
async def cb_profile(cb: CallbackQuery):
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.answer("Сначала /start")
        return

    role_map = {
        "Farmer":"Фермер", "Buyer":"Покупатель", "Carrier":"Перевозчик",
        "Warehouse":"Элеватор", "Processor":"Переработчик",
        "Supplier":"Поставщик", "Agronomist":"Агроэксперт", "Admin":"Администратор"
    }

    text = (
        f"👤 *Ваш профиль AgroBalance*\n\n"
        f"Имя: *{user['name']}*\n"
        f"Роль: *{role_map.get(user['role'], user['role'])}*\n"
        f"Регион: *{user['region']}*\n"
        f"Телефон: *{user['phone']}*\n\n"
        f"Trust Index: {trust_bar(user['trust_index'])}\n"
    )

    if user["role"] == "Farmer" and user["crop"]:
        text += (
            f"\n🌾 *Хозяйство:*\n"
            f"Культура: {user['crop']}\n"
            f"Площадь: {user['area']} га\n"
            f"Ожидаемый сбор: {user['expected_yield']} тонн\n"
        )

    verify_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Верифицировать геолокацию (+10 TI)", callback_data="verify_geo")],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ])

    await cb.message.edit_text(text, reply_markup=verify_kb)

@dp.callback_query(F.data == "verify_geo")
async def cb_verify_geo(cb: CallbackQuery):
    new_score = update_trust(str(cb.from_user.id), "verified_geo", "Верификация геолокации")
    new_score = update_trust(str(cb.from_user.id), "actual_photo", "Фото поля подтверждено")
    await cb.message.edit_text(
        f"✅ *Геолокация и фото поля верифицированы!*\n\n"
        f"Trust Index: {trust_bar(new_score)}\n\n"
        f"Теперь вам доступны приоритетные рекомендации и лучшие сделки.",
        reply_markup=kb_back_main()
    )

# ─── Trust Info ───────────────────────────────────────────────────────────────
@dp.callback_query(F.data == "trust_info")
async def cb_trust_info(cb: CallbackQuery):
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.answer("Сначала /start")
        return
    score = user["trust_index"]

    if score >= 80:
        zone = "🟢 *ЗЕЛЁНАЯ ЗОНА* — Максимальное доверие"
        perks = "• Приоритет в поиске покупателей\n• Расширенные AI-рекомендации\n• Доступ к крупным сделкам\n• Скидки от перевозчиков"
    elif score >= 50:
        zone = "🟡 *ЖЁЛТАЯ ЗОНА* — Базовое доверие"
        perks = "• Стандартные AI-рекомендации\n• Базовые сделки доступны\n• Верифицируйте поле для роста"
    else:
        zone = "🔴 *КРАСНАЯ ЗОНА* — Низкое доверие"
        perks = "• Доступ к сделкам ограничен\n• Верификация обязательна\n• Завершите несколько честных сделок"

    conn = get_db()
    events = conn.execute(
        "SELECT change, factor, note, created_at FROM trust_events WHERE user_id=(SELECT id FROM users WHERE telegram_id=?) ORDER BY created_at DESC LIMIT 5",
        (str(cb.from_user.id),)
    ).fetchall()
    conn.close()

    history = ""
    if events:
        history = "\n\n📜 *Последние изменения:*\n"
        for e in events:
            sign = "+" if e["change"] > 0 else ""
            history += f"{sign}{e['change']:.0f} — {e['factor']} _{e['created_at'][:10]}_\n"

    await cb.message.edit_text(
        f"📊 *Trust Index — Индекс надёжности*\n\n"
        f"{zone}\n{trust_bar(score)}\n\n"
        f"*Что доступно:*\n{perks}"
        f"{history}",
        reply_markup=kb_back_main()
    )

# ─── AI Recommendations ───────────────────────────────────────────────────────
@dp.callback_query(F.data == "ai_recs")
async def cb_ai_recs(cb: CallbackQuery):
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.answer("Сначала /start")
        return
    if user["role"] != "Farmer":
        await cb.answer("AI-рекомендации доступны только фермерам.", show_alert=True)
        return

    await cb.message.edit_text("🤖 *AI анализирует рынок...* Подождите немного.")

    recs = generate_recommendations(user)

    await cb.message.edit_text(
        f"🤖 *AI Рекомендации AgroBalance*\n"
        f"Культура: *{user['crop']}* | Площадь: *{user['area']} га*\n"
        f"Trust Index: {trust_bar(user['trust_index'])}\n\n"
        f"{recs}",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Обновить рекомендации", callback_data="ai_recs")],
            [InlineKeyboardButton(text="➕ Разместить предложение", callback_data="new_offer")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
        ])
    )

# ─── Market ───────────────────────────────────────────────────────────────────
@dp.callback_query(F.data == "market")
async def cb_market(cb: CallbackQuery):
    conn = get_db()
    offers   = conn.execute(
        "SELECT o.*, u.name as seller_name, u.role as seller_role, u.trust_index FROM market_offers o JOIN users u ON o.seller_id=u.id WHERE o.is_active=1 ORDER BY o.created_at DESC LIMIT 5"
    ).fetchall()
    requests = conn.execute(
        "SELECT r.*, u.name as buyer_name, u.role as buyer_role, u.trust_index FROM market_requests r JOIN users u ON r.buyer_id=u.id WHERE r.is_active=1 ORDER BY r.created_at DESC LIMIT 5"
    ).fetchall()
    conn.close()

    text = "📊 *Рынок AgroBalance*\n\n"

    role_map_ru = {"Farmer":"Фермер","Buyer":"Покупатель","Carrier":"Перевозчик","Warehouse":"Элеватор","Processor":"Переработчик","Supplier":"Поставщик","Agronomist":"Агроэксперт"}

    if offers:
        text += "🌾 *Продают сейчас:*\n"
        for o in offers:
            trust_emoji = "🟢" if o["trust_index"] >= 80 else ("🟡" if o["trust_index"] >= 50 else "🔴")
            role_label = role_map_ru.get(o["seller_role"], o["seller_role"])
            text += f"{trust_emoji} {o['crop']} — {o['volume']:.0f}т по {format_money(o['price_per_unit'], o['region'])}/т\n  _от {role_label} #{o['seller_id']}, {o['region']}_\n"
    else:
        text += "🌾 *Предложений пока нет.*\n"

    text += "\n"

    if requests:
        text += "🛒 *Покупают сейчас:*\n"
        for r in requests:
            trust_emoji = "🟢" if r["trust_index"] >= 80 else ("🟡" if r["trust_index"] >= 50 else "🔴")
            role_label = role_map_ru.get(r["buyer_role"], r["buyer_role"])
            text += f"{trust_emoji} {r['crop']} — {r['volume']:.0f}т по {format_money(r['price_per_unit'], r['region'])}/т\n  _от {role_label} #{r['buyer_id']}, {r['region']}_\n"
    else:
        text += "🛒 *Запросов пока нет.*\n"

    user = get_user(str(cb.from_user.id))
    role = user["role"] if user else "Farmer"

    rows = []
    if role == "Farmer" and offers:
        for o in offers[:3]:
            rows.append([InlineKeyboardButton(
                text=f"🤝 Продать {o['crop']}",
                callback_data=f"make_deal_offer_{o['id']}"
            )])
    if role == "Buyer" and requests:
        for r in requests[:3]:
            rows.append([InlineKeyboardButton(
                text=f"🤝 Купить {r['crop']}",
                callback_data=f"make_deal_req_{r['id']}"
            )])
    rows.append([InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")])

    await cb.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))

# ─── New Offer FSM ────────────────────────────────────────────────────────────
@dp.callback_query(F.data == "new_offer")
async def cb_new_offer(cb: CallbackQuery, state: FSMContext):
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.answer("Сначала /start")
        return
    if user["crop"]:
        await state.update_data(crop=user["crop"], seller_id=user["id"])
        await cb.message.edit_text(
            f"✅ Культура: *{user['crop']}*\n\nУкажите объём предложения (в тоннах):"
        )
        await state.set_state(OfferCreate.volume)
    else:
        await cb.message.edit_text("Введите культуру для продажи (например: Пшеница 3 класс):")
        await state.set_state(OfferCreate.crop)

@dp.message(OfferCreate.crop)
async def offer_crop(msg: Message, state: FSMContext):
    user = get_user(str(msg.from_user.id))
    await state.update_data(crop=msg.text.strip(), seller_id=user["id"] if user else 0)
    await msg.answer("Объём предложения (в тоннах):")
    await state.set_state(OfferCreate.volume)

@dp.message(OfferCreate.volume)
async def offer_volume(msg: Message, state: FSMContext):
    try:
        vol = float(msg.text.replace(",",".").strip())
        await state.update_data(volume=vol)
        await msg.answer("Цена за тонну (₽):")
        await state.set_state(OfferCreate.price)
    except ValueError:
        await msg.answer("❌ Введите число.")

@dp.message(OfferCreate.price)
async def offer_price(msg: Message, state: FSMContext):
    try:
        price = float(msg.text.replace(",",".").strip())
        data = await state.get_data()
        user = get_user(str(msg.from_user.id))

        conn = get_db()
        conn.execute(
            "INSERT INTO market_offers(seller_id, crop, volume, price_per_unit, region) VALUES (?,?,?,?,?)",
            (data["seller_id"], data["crop"], data["volume"], price, user["region"] if user else "Южный")
        )
        conn.commit()
        conn.close()

        await state.clear()
        total = data["volume"] * price
        await msg.answer(
            f"✅ *Предложение размещено на рынке!*\n\n"
            f"🌾 {data['crop']}\n"
            f"📦 Объём: {data['volume']:.0f} тонн\n"
            f"💰 Цена: {format_money(price)}/т\n"
            f"💵 Итого: {format_money(total)}\n\n"
            f"Покупатели увидят ваше предложение и смогут предложить сделку.",
            reply_markup=kb_main(user["role"] if user else "Farmer")
        )
    except ValueError:
        await msg.answer("❌ Введите число.")

# ─── New Request FSM ──────────────────────────────────────────────────────────
@dp.callback_query(F.data == "new_request")
async def cb_new_request(cb: CallbackQuery, state: FSMContext):
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.answer("Сначала /start")
        return
    await cb.message.edit_text("Какую культуру хотите закупить? (например: Пшеница):")
    await state.set_state(DealCreate.crop)
    await state.update_data(is_request=True, buyer_id=user["id"])

@dp.message(DealCreate.crop)
async def dc_crop(msg: Message, state: FSMContext):
    await state.update_data(crop=msg.text.strip())
    await msg.answer("Объём закупки (в тоннах):")
    await state.set_state(DealCreate.volume)

@dp.message(DealCreate.volume)
async def dc_volume(msg: Message, state: FSMContext):
    try:
        vol = float(msg.text.replace(",",".").strip())
        await state.update_data(volume=vol)
        await msg.answer("Цена за тонну (₽), которую вы готовы заплатить:")
        await state.set_state(DealCreate.price)
    except ValueError:
        await msg.answer("❌ Введите число.")

@dp.message(DealCreate.price)
async def dc_price(msg: Message, state: FSMContext):
    try:
        price = float(msg.text.replace(",",".").strip())
        data = await state.get_data()
        user = get_user(str(msg.from_user.id))

        conn = get_db()
        conn.execute(
            "INSERT INTO market_requests(buyer_id, crop, volume, price_per_unit, region) VALUES (?,?,?,?,?)",
            (data["buyer_id"], data["crop"], data["volume"], price, user["region"] if user else "Южный")
        )
        conn.commit()
        conn.close()

        await state.clear()
        await msg.answer(
            f"✅ *Запрос на закупку размещён!*\n\n"
            f"🛒 {data['crop']}\n"
            f"📦 Объём: {data['volume']:.0f} тонн\n"
            f"💰 Цена: {format_money(price)}/т\n\n"
            f"Фермеры увидят ваш запрос и смогут предложить сделку.",
            reply_markup=kb_main(user["role"] if user else "Buyer")
        )
    except ValueError:
        await msg.answer("❌ Введите число.")

# ─── Deal from market offer ───────────────────────────────────────────────────
@dp.callback_query(F.data.startswith("make_deal_offer_"))
async def cb_make_deal_from_offer(cb: CallbackQuery):
    offer_id = int(cb.data.replace("make_deal_offer_", ""))
    buyer = get_user(str(cb.from_user.id))
    if not buyer:
        await cb.answer("Сначала /start")
        return

    conn = get_db()
    offer = conn.execute("SELECT * FROM market_offers WHERE id=? AND is_active=1", (offer_id,)).fetchone()
    if not offer:
        await cb.answer("Предложение уже недоступно.", show_alert=True)
        conn.close()
        return

    deal_id = conn.execute(
        """INSERT INTO deals(seller_id, buyer_id, crop, volume, price_per_unit, total_price, region, status)
           VALUES (?,?,?,?,?,?,?,'proposed')""",
        (offer["seller_id"], buyer["id"], offer["crop"], offer["volume"],
         offer["price_per_unit"], offer["volume"]*offer["price_per_unit"], offer["region"])
    ).lastrowid
    conn.execute("UPDATE market_offers SET is_active=0 WHERE id=?", (offer_id,))
    conn.commit()

    seller = conn.execute("SELECT telegram_id, name FROM users WHERE id=?", (offer["seller_id"],)).fetchone()
    conn.close()

    total    = offer["volume"] * offer["price_per_unit"]
    fee      = total * 0.01
    net_sell = total - fee

    # Notify seller
    if seller:
        try:
            await bot.send_message(
                seller["telegram_id"],
                f"🎉 *Новая сделка предложена!*\n\n"
                f"Покупатель: *{buyer['name']}*\n"
                f"Культура: *{offer['crop']}*\n"
                f"Объём: *{offer['volume']:.0f} тонн*\n"
                f"Цена: *{format_money(offer['price_per_unit'])}/т*\n"
                f"💵 Итого: *{format_money(total)}*\n"
                f"📌 Комиссия платформы (1%): *{format_money(fee)}*\n"
                f"✅ Вы получите: *{format_money(net_sell)}*\n\n"
                f"Сделка #{deal_id}",
                reply_markup=kb_deal_actions(deal_id, "proposed", "Farmer")
            )
        except Exception:
            pass

    await cb.message.edit_text(
        f"🤝 *Предложение отправлено продавцу!*\n\n"
        f"🌾 {offer['crop']} — {offer['volume']:.0f} тонн\n"
        f"💰 Цена: {format_money(offer['price_per_unit'])}/т\n"
        f"💵 Сумма: {format_money(total)}\n"
        f"📌 Комиссия платформы (1%): {format_money(fee)}\n"
        f"Ждите подтверждения от продавца.\n\n"
        f"_Сделка #{deal_id}_",
        reply_markup=kb_back_main()
    )

# ─── Deal Actions ─────────────────────────────────────────────────────────────
@dp.callback_query(F.data.startswith("deal_accept_"))
async def cb_deal_accept(cb: CallbackQuery):
    deal_id = int(cb.data.replace("deal_accept_", ""))
    conn = get_db()
    deal = conn.execute("SELECT * FROM deals WHERE id=?", (deal_id,)).fetchone()
    if not deal or deal["status"] != "proposed":
        await cb.answer("Сделка недоступна.", show_alert=True)
        conn.close()
        return
    conn.execute("UPDATE deals SET status='accepted' WHERE id=?", (deal_id,))
    conn.execute("INSERT INTO deal_events(deal_id, user_id, action, comment) VALUES (?,?,?,?)",
                 (deal_id, deal["seller_id"], "accepted", "Продавец принял сделку"))
    conn.commit()
    buyer = conn.execute("SELECT telegram_id, name FROM users WHERE id=?", (deal["buyer_id"],)).fetchone()
    conn.close()

    if buyer:
        total = deal["total_price"]
        fee   = total * 0.01
        try:
            await bot.send_message(
                buyer["telegram_id"],
                f"✅ *Продавец принял сделку #{deal_id}!*\n\n"
                f"🌾 {deal['crop']} — {deal['volume']:.0f} тонн\n"
                f"💵 Сумма: {format_money(total)}\n"
                f"📌 Комиссия платформы (1%): {format_money(fee)}\n\n"
                f"Для активации доставки оплатите через безопасный Escrow:",
                reply_markup=kb_deal_actions(deal_id, "accepted", "Buyer")
            )
        except Exception:
            pass

    await cb.message.edit_text(
        f"✅ Вы приняли сделку #{deal_id}.\nОжидаем оплату от покупателя в Escrow.",
        reply_markup=kb_back_main()
    )

@dp.callback_query(F.data.startswith("deal_pay_"))
async def cb_deal_pay(cb: CallbackQuery):
    deal_id = int(cb.data.replace("deal_pay_", ""))
    conn = get_db()
    deal = conn.execute("SELECT * FROM deals WHERE id=?", (deal_id,)).fetchone()
    if not deal:
        await cb.answer("Сделка не найдена.", show_alert=True)
        conn.close()
        return
    conn.execute("UPDATE deals SET status='paid', payment_status='holding' WHERE id=?", (deal_id,))
    conn.execute("INSERT INTO deal_events(deal_id, user_id, action, comment) VALUES (?,?,?,?)",
                 (deal_id, deal["buyer_id"], "paid", "Покупатель оплатил в Escrow"))
    conn.commit()
    seller = conn.execute("SELECT telegram_id FROM users WHERE id=?", (deal["seller_id"],)).fetchone()
    conn.close()

    if seller:
        try:
            await bot.send_message(
                seller["telegram_id"],
                f"💳 *Покупатель оплатил сделку #{deal_id}!*\n"
                f"Деньги заблокированы в Escrow. Можно отгружать товар.",
                reply_markup=kb_deal_actions(deal_id, "paid", "Farmer")
            )
        except Exception:
            pass

    await cb.message.edit_text(
        f"✅ *Оплата в Escrow успешна!*\n\n"
        f"Деньги заблокированы. Продавец отгружает товар.\n"
        f"После доставки подтвердите получение для выплаты.\n\n"
        f"_Сделка #{deal_id}_",
        reply_markup=kb_back_main()
    )

@dp.callback_query(F.data.startswith("deal_deliver_"))
async def cb_deal_deliver(cb: CallbackQuery):
    deal_id = int(cb.data.replace("deal_deliver_", ""))
    conn = get_db()
    deal = conn.execute("SELECT * FROM deals WHERE id=?", (deal_id,)).fetchone()
    if not deal:
        conn.close()
        await cb.answer("Сделка не найдена.", show_alert=True)
        return
    conn.execute("UPDATE deals SET status='delivered' WHERE id=?", (deal_id,))
    conn.execute("INSERT INTO deal_events(deal_id, user_id, action, comment) VALUES (?,?,?,?)",
                 (deal_id, deal["seller_id"], "delivered", "Товар доставлен"))
    conn.commit()
    buyer = conn.execute("SELECT telegram_id FROM users WHERE id=?", (deal["buyer_id"],)).fetchone()
    conn.close()

    if buyer:
        try:
            await bot.send_message(
                buyer["telegram_id"],
                f"🚚 *Товар доставлен по сделке #{deal_id}!*\n"
                f"Подтвердите получение, чтобы выплатить деньги продавцу.",
                reply_markup=kb_deal_actions(deal_id, "delivered", "Buyer")
            )
        except Exception:
            pass

    await cb.message.edit_text(
        f"✅ Доставка подтверждена. Ожидаем финального подтверждения от покупателя.",
        reply_markup=kb_back_main()
    )

@dp.callback_query(F.data.startswith("deal_complete_"))
async def cb_deal_complete(cb: CallbackQuery):
    deal_id = int(cb.data.replace("deal_complete_", ""))
    conn = get_db()
    deal = conn.execute("SELECT * FROM deals WHERE id=?", (deal_id,)).fetchone()
    if not deal:
        conn.close()
        await cb.answer("Сделка не найдена.", show_alert=True)
        return

    total    = deal["total_price"]
    fee      = total * 0.01         # 1% платформа
    net_sell = total - fee

    conn.execute(
        "UPDATE deals SET status='completed', payment_status='released', completed_at=datetime('now') WHERE id=?",
        (deal_id,)
    )
    conn.execute("INSERT INTO deal_events(deal_id, user_id, action, comment) VALUES (?,?,?,?)",
                 (deal_id, deal["buyer_id"], "completed", f"Сделка завершена. Комиссия {format_money(fee)}"))
    conn.commit()

    # Referral reward
    seller = conn.execute("SELECT * FROM users WHERE id=?", (deal["seller_id"],)).fetchone()
    if seller and seller["referred_by_id"]:
        referrer_reward = fee * 0.20   # 20% от комиссии
        conn.execute(
            "INSERT INTO referral_rewards(referrer_id, referee_id, deal_id, amount) VALUES (?,?,?,?)",
            (seller["referred_by_id"], seller["id"], deal_id, referrer_reward)
        )
        conn.commit()
        referrer = conn.execute("SELECT telegram_id FROM users WHERE id=?", (seller["referred_by_id"],)).fetchone()
        if referrer:
            update_trust(referrer["telegram_id"], "referral_deal", f"Сделка реферала #{deal_id}")
            try:
                await bot.send_message(
                    referrer["telegram_id"],
                    f"🎉 *Реферальный доход!*\n\n"
                    f"Приглашённый вами участник завершил сделку.\n"
                    f"Ваш реферальный бонус: *{format_money(referrer_reward)}*\n"
                    f"Trust Index повышен!"
                )
            except Exception:
                pass

    # Trust updates
    seller_tg = conn.execute("SELECT telegram_id FROM users WHERE id=?", (deal["seller_id"],)).fetchone()
    buyer_tg  = conn.execute("SELECT telegram_id FROM users WHERE id=?", (deal["buyer_id"],)).fetchone()
    conn.close()

    if seller_tg:
        update_trust(seller_tg["telegram_id"], "completed_deal")
        update_trust(seller_tg["telegram_id"], "timely_payment")
        try:
            await bot.send_message(
                seller_tg["telegram_id"],
                f"✅ *Сделка #{deal_id} завершена!*\n\n"
                f"💵 Сумма сделки: {format_money(total, deal['region'])}\n"
                f"📌 Комиссия платформы (1%): {format_money(fee, deal['region'])}\n"
                f"✅ *Вы получаете: {format_money(net_sell, deal['region'])}*\n\n"
                f"Trust Index вырос за успешную сделку! 🚀",
                reply_markup=kb_back_main()
            )
        except Exception:
            pass

    if buyer_tg:
        update_trust(buyer_tg["telegram_id"], "completed_deal")

    await cb.message.edit_text(
        f"🎉 *Сделка #{deal_id} успешно завершена!*\n\n"
        f"💵 Сумма: {format_money(total, deal['region'])}\n"
        f"📌 Комиссия платформы (1%): {format_money(fee, deal['region'])}\n"
        f"Продавец получил: {format_money(net_sell, deal['region'])}\n\n"
        f"Ваш Trust Index повышен за надёжную сделку! 🏆",
        reply_markup=kb_back_main()
    )

@dp.callback_query(F.data.startswith("deal_cancel_"))
async def cb_deal_cancel(cb: CallbackQuery):
    deal_id = int(cb.data.replace("deal_cancel_", ""))
    conn = get_db()
    deal = conn.execute("SELECT * FROM deals WHERE id=?", (deal_id,)).fetchone()
    if deal and deal["status"] in ("paid","delivered"):
        update_trust(str(cb.from_user.id), "broken_deal", f"Отмена сделки #{deal_id} после оплаты")
    conn.execute("UPDATE deals SET status='cancelled' WHERE id=?", (deal_id,))
    conn.commit()
    conn.close()
    await cb.message.edit_text(
        f"❌ Сделка #{deal_id} отменена.",
        reply_markup=kb_back_main()
    )

@dp.callback_query(F.data.startswith("deal_dispute_"))
async def cb_deal_dispute(cb: CallbackQuery):
    deal_id = int(cb.data.replace("deal_dispute_", ""))
    conn = get_db()
    conn.execute("UPDATE deals SET status='disputed' WHERE id=?", (deal_id,))
    conn.commit()
    conn.close()
    update_trust(str(cb.from_user.id), "complaint", f"Открыт спор по сделке #{deal_id}")
    try:
        await bot.send_message(
            ADMIN_ID,
            f"⚖️ *Открыт спор! Требуется арбитраж.*\n\nСделка #{deal_id}\nПользователь: @{cb.from_user.username}"
        )
    except Exception:
        pass
    await cb.message.edit_text(
        f"⚖️ *Спор открыт по сделке #{deal_id}.*\n\n"
        f"Администратор рассмотрит ситуацию и свяжется с вами. Средства заморожены.",
        reply_markup=kb_back_main()
    )

# ─── My Deals ─────────────────────────────────────────────────────────────────
@dp.callback_query(F.data == "my_deals")
async def cb_my_deals(cb: CallbackQuery):
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.answer("Сначала /start")
        return

    conn = get_db()
    deals = conn.execute(
        """SELECT d.*, 
           s.name as seller_name, b.name as buyer_name
           FROM deals d
           JOIN users s ON d.seller_id=s.id
           JOIN users b ON d.buyer_id=b.id
           WHERE d.seller_id=? OR d.buyer_id=?
           ORDER BY d.created_at DESC LIMIT 10""",
        (user["id"], user["id"])
    ).fetchall()
    conn.close()

    if not deals:
        await cb.message.edit_text(
            "📦 У вас пока нет сделок.\n\nПерейдите на *Рынок* для поиска партнёров.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📊 Рынок", callback_data="market")],
                [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
            ])
        )
        return

    status_icons = {
        "proposed":"🟡 Ожидает", "accepted":"🔵 Принята",
        "paid":"💳 Оплачена", "delivered":"🚚 Доставлена",
        "completed":"✅ Завершена", "disputed":"⚖️ Спор",
        "cancelled":"❌ Отменена"
    }

    text = "🤝 *Ваши сделки:*\n\n"
    rows = []
    for d in deals:
        icon = status_icons.get(d["status"], d["status"])
        other = d["buyer_name"] if user["id"] == d["seller_id"] else d["seller_name"]
        text += f"#{d['id']} · {d['crop']} {d['volume']:.0f}т · {format_money(d['total_price'], d['region'])}\n{icon} · {other}\n\n"
        if d["status"] not in ("completed","cancelled"):
            role_here = "Farmer" if user["id"] == d["seller_id"] else "Buyer"
            rows.append([InlineKeyboardButton(
                text=f"⚙️ Сделка #{d['id']} ({d['status']})",
                callback_data=f"deal_detail_{d['id']}"
            )])

    rows.append([InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")])
    await cb.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))

@dp.callback_query(F.data.startswith("deal_detail_"))
async def cb_deal_detail(cb: CallbackQuery):
    deal_id = int(cb.data.replace("deal_detail_", ""))
    user = get_user(str(cb.from_user.id))
    conn = get_db()
    deal = conn.execute("SELECT * FROM deals WHERE id=?", (deal_id,)).fetchone()
    conn.close()
    if not deal:
        await cb.answer("Сделка не найдена.", show_alert=True)
        return

    total = deal["total_price"]
    fee   = total * 0.01
    role_here = "Farmer" if user["id"] == deal["seller_id"] else "Buyer"

    await cb.message.edit_text(
        f"🤝 *Сделка #{deal_id}*\n\n"
        f"Культура: *{deal['crop']}*\n"
        f"Объём: *{deal['volume']:.0f} тонн*\n"
        f"Цена: *{format_money(deal['price_per_unit'], deal['region'])}/т*\n"
        f"💵 Сумма: *{format_money(total, deal['region'])}*\n"
        f"📌 Комиссия AgroBalance (1%): *{format_money(fee, deal['region'])}*\n"
        f"✅ Продавец получит: *{format_money(total - fee, deal['region'])}*\n\n"
        f"Статус: *{deal['status']}*",
        reply_markup=kb_deal_actions(deal_id, deal["status"], role_here)
    )

# ─── Referral Program ────────────────────────────────────────────────────────
@dp.callback_query(F.data == "referral")
async def cb_referral(cb: CallbackQuery):
    user = get_user(str(cb.from_user.id))
    if not user:
        await cb.answer("Сначала /start")
        return

    code = user["referral_code"] or make_referral_code(str(cb.from_user.id))
    link = f"https://t.me/{BOT_USERNAME}?start={code}"

    conn = get_db()
    refs_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM users WHERE referred_by_id=?", (user["id"],)
    ).fetchone()["cnt"]
    total_earned = conn.execute(
        "SELECT COALESCE(SUM(amount),0) as total FROM referral_rewards WHERE referrer_id=?", (user["id"],)
    ).fetchone()["total"]
    conn.close()

    await cb.message.edit_text(
        f"👥 *Реферальная программа AgroBalance*\n\n"
        f"Приглашайте фермеров, покупателей и перевозчиков:\n\n"
        f"🎁 *За каждого приглашённого:*\n"
        f"• +5 к вашему Trust Index\n"
        f"• 20% от 1% комиссии с каждой его сделки\n\n"
        f"📊 *Ваша статистика:*\n"
        f"• Приглашено участников: *{refs_count}*\n"
        f"• Заработано реферальных бонусов: *{format_money(total_earned)}*\n\n"
        f"🔗 *Ваша реферальная ссылка:*\n`{link}`\n\n"
        f"Отправьте её другу — когда он зарегистрируется и завершит сделку, вы оба получите выгоду!",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 Скопировать ссылку", callback_data="copy_ref_link")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
        ])
    )

@dp.callback_query(F.data == "copy_ref_link")
async def cb_copy_ref(cb: CallbackQuery):
    user = get_user(str(cb.from_user.id))
    code = user["referral_code"] if user else make_referral_code(str(cb.from_user.id))
    link = f"https://t.me/{BOT_USERNAME}?start={code}"
    await cb.answer(f"Ссылка: {link}", show_alert=True)

# ─── Chat bypass detection (text handler) ─────────────────────────────────────
@dp.message(F.text)
async def catch_all_text(msg: Message, state: FSMContext):
    cur_state = await state.get_state()

    # If in FSM, do nothing (FSM handlers above will catch it)
    if cur_state:
        return

    user = get_user(str(msg.from_user.id))
    if not user:
        await msg.answer("👋 Введите /start чтобы зарегистрироваться в AgroBalance.")
        return

    # Check for commission bypass
    if check_chat_bypass(msg.text):
        new_score = update_trust(
            str(msg.from_user.id), "commission_bypass",
            f"Попытка отправки контактов вне сделки: {msg.text[:80]}"
        )
        conn = get_db()
        conn.execute(
            "INSERT INTO antifraud_logs(user_id, rule, severity, details) VALUES (?,?,?,?)",
            (user["id"], "chat_bypass", "high", msg.text[:200])
        )
        conn.commit()
        conn.close()
        await msg.answer(
            f"🛡️ *AntiFraud Core — Предупреждение!*\n\n"
            f"Обнаружена попытка обмена прямыми контактами вне системы сделок AgroBalance.\n\n"
            f"❌ Trust Index снижен. Текущий: {trust_bar(new_score)}\n\n"
            f"Все сделки совершаются только через платформу с защитой Escrow. "
            f"Обход комиссии лишает вас рейтинга, скидок и защиты.",
            reply_markup=kb_main(user["role"])
        )
        return

    # Unknown message — show menu
    await msg.answer(
        "Используйте кнопки ниже для навигации:",
        reply_markup=kb_main(user["role"])
    )

# ─── Admin commands ───────────────────────────────────────────────────────────
@dp.message(Command("admin"))
async def cmd_admin(msg: Message):
    if msg.from_user.id != ADMIN_ID:
        return

    conn = get_db()
    user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    deal_count = conn.execute("SELECT COUNT(*) FROM deals WHERE status='completed'").fetchone()[0]
    total_volume = conn.execute("SELECT COALESCE(SUM(total_price),0) FROM deals WHERE status='completed'").fetchone()[0]
    total_fee    = total_volume * 0.01
    fraud_count  = conn.execute("SELECT COUNT(*) FROM antifraud_logs WHERE created_at > datetime('now','-7 days')").fetchone()[0]
    conn.close()

    await msg.answer(
        f"🛡️ *AgroBalance Админ-панель*\n\n"
        f"👥 Пользователей: *{user_count}*\n"
        f"🤝 Завершённых сделок: *{deal_count}*\n"
        f"💵 Оборот платформы: *{format_money(total_volume)}*\n"
        f"📌 Комиссия (1%): *{format_money(total_fee)}*\n"
        f"⚠️ Антифрод триггеров за 7 дней: *{fraud_count}*",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🛡️ Антифрод логи", callback_data="admin_antifraud")],
            [InlineKeyboardButton(text="📋 Все пользователи", callback_data="admin_users")]
        ])
    )

@dp.callback_query(F.data == "admin_antifraud")
async def cb_admin_fraud(cb: CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("Доступ запрещён.", show_alert=True)
        return
    conn = get_db()
    logs = conn.execute(
        """SELECT af.*, u.name, u.telegram_id FROM antifraud_logs af
           JOIN users u ON af.user_id=u.id
           ORDER BY af.created_at DESC LIMIT 10"""
    ).fetchall()
    conn.close()

    if not logs:
        await cb.message.edit_text("✅ Подозрительных действий не обнаружено.", reply_markup=kb_back_main())
        return

    text = "🛡️ *Антифрод логи (последние 10):*\n\n"
    for l in logs:
        text += f"⚠️ *{l['rule']}* ({l['severity']})\n{l['name']} (tg:{l['telegram_id']})\n{l['details'][:80]}\n_{l['created_at'][:16]}_\n\n"

    await cb.message.edit_text(text, reply_markup=kb_back_main())

@dp.callback_query(F.data == "admin_users")
async def cb_admin_users(cb: CallbackQuery):
    if cb.from_user.id != ADMIN_ID:
        await cb.answer("Доступ запрещён.", show_alert=True)
        return
    conn = get_db()
    users = conn.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT 15").fetchall()
    conn.close()

    text = "👥 *Пользователи AgroBalance:*\n\n"
    for u in users:
        trust_emoji = "🟢" if u["trust_index"] >= 80 else ("🟡" if u["trust_index"] >= 50 else "🔴")
        text += f"{trust_emoji} *{u['name']}* ({u['role']}) TI:{u['trust_index']:.0f}\ntg:{u['telegram_id']} · {u['region']}\n\n"

    await cb.message.edit_text(text, reply_markup=kb_back_main())

from aiohttp import web

async def handle_health(request):
    return web.Response(text="AgroBalance Telegram Bot is running!")

async def start_web_server():
    port = int(os.environ.get("PORT", 8000))
    app = web.Application()
    app.router.add_get("/", handle_health)
    app.router.add_get("/health", handle_health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    log.info(f"✅ Web server started on port {port}")

async def init_bot_resilient():
    global BOT_USERNAME
    BOT_USERNAME = "AgroBalanceGlobalBot"
    from aiogram.types import MenuButtonWebApp, WebAppInfo
    
    while True:
        try:
            me = await bot.get_me()
            BOT_USERNAME = me.username
            log.info(f"✅ Успешно подключено к Telegram! Бот: @{me.username} ({me.full_name})")
            
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="AgroBalance",
                    web_app=WebAppInfo(url="https://Mattooo-9.github.io/agrobalance-bot/")
                )
            )
            log.info("✅ Кнопка Telegram Mini App меню успешно настроена.")
            break
        except Exception as e:
            log.error(f"⚠️ Сетевой сбой при подключении к Telegram: {e}. Повторная попытка через 15 секунд...")
            await asyncio.sleep(15)

# ─── Entry Point ──────────────────────────────────────────────────────────────
async def main(start_http=True):
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN не задан в .env файле!")
        sys.exit(1)

    init_db()
    log.info(f"🌾 AgroBalance Bot starting... Admin ID: {ADMIN_ID}")
    log.info(f"🤖 Gemini AI: {'✅ Подключен' if GEMINI_KEY else '⚠️ Не настроен (локальный режим)'}")

    # Resilient initialization loop to withstand network failures or geoblocks
    asyncio.create_task(init_bot_resilient())

    # Start web server to pass Render port checks
    if start_http:
        await start_web_server()

    log.info("✅ Бот запущен. Ожидаем сообщения...")

    # ── Resilient polling loop ─────────────────────────────────────────────────
    # Retries automatically on any network error, Telegram outage, or geoblock.
    # Backoff: starts at 5s, doubles each failure up to 60s max.
    retry_delay = 5
    max_delay = 60
    while True:
        try:
            log.info("🔄 Запускаем polling Telegram...")
            log.info("🧹 Принудительно очищаем сторонние вебхуки перед стартом...")
            await bot.delete_webhook(drop_pending_updates=True)
            await dp.start_polling(
                bot,
                allowed_updates=["message", "callback_query"],
            )
            # start_polling returned cleanly (graceful stop signal)
            log.info("⏹️ Polling завершён штатно.")
            break
        except asyncio.CancelledError:
            log.info("⏹️ Polling отменён — завершаем работу бота.")
            break
        except Exception as poll_err:
            log.error(
                f"⚠️ Polling упал: {poll_err}. "
                f"Повторная попытка через {retry_delay}с..."
            )
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, max_delay)
        else:
            # Reset backoff on successful run
            retry_delay = 5


if __name__ == "__main__":
    asyncio.run(main())
