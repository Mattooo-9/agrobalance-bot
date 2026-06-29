import asyncio
import sys
import os
import re
from pathlib import Path
from datetime import datetime
from unittest.mock import AsyncMock

# Add root folder to python path so we can import backend/bot
sys.path.append(str(Path(__file__).parent))

# Set dummy environment variables for bot import
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:dummy_token")
os.environ.setdefault("USER_TELEGRAM_ID", "8017348770")

from aiogram.client.session.aiohttp import AiohttpSession

# Override AiohttpSession.make_request directly
async def mock_make_request(self, bot, method, timeout=None):
    from aiogram.methods import SendMessage
    if isinstance(method, SendMessage):
        # Strip all non-ascii / emoji characters to prevent cp1251 print crashes on Windows terminal
        clean_text = re.sub(r'[^\x00-\x7F\u0400-\u04FF\s\.,!\?\-@#:\(\)]', '', method.text)
        print(f"   [Mock Bot Output] -> To chat {method.chat_id}: {clean_text}")
        sent_messages.append(method)
    
    # Return a mock response dict or custom response matching Bot method requirements
    mock_msg = AsyncMock()
    mock_msg.message_id = 999
    mock_msg.text = "Mocked message response"
    return mock_msg

AiohttpSession.make_request = mock_make_request

from bot.agrobot import dp, bot, get_db, init_db
from aiogram.types import Update, Message, User, Chat
from aiogram.methods import SendMessage

sent_messages = []

async def run_tests():
    print("[TEST] Starting Automated Telegram Bot Tests...")

    # Initialize test database
    init_db()

    # Clear old logs and populate test users
    conn = get_db()
    try:
        conn.execute("DELETE FROM users WHERE telegram_id IN ('999999', '888888')")
        # 1. Normal user (TI = 50)
        conn.execute(
            "INSERT INTO users(telegram_id, role, name, phone, trust_index, state) VALUES (?,?,?,?,?,?)",
            ("999999", "Farmer", "Test Farmer", "+79999999999", 50.0, "idle")
        )
        # 2. Blocked user (TI = 10)
        conn.execute(
            "INSERT INTO users(telegram_id, role, name, phone, trust_index, state) VALUES (?,?,?,?,?,?)",
            ("888888", "Farmer", "Suspicious User", "+78888888888", 10.0, "idle")
        )
        conn.commit()
    finally:
        conn.close()

    # Test 1: Start Command for Normal User (TI = 50)
    print("\n[TEST] Test 1: Sending /start command from normal user (TI=50)...")
    message = Message(
        message_id=1,
        date=datetime.now(),
        chat=Chat(id=999999, type="private"),
        from_user=User(id=999999, is_bot=False, first_name="Test", username="test_farmer"),
        text="/start"
    )
    update = Update(update_id=1, message=message)
    
    await dp.feed_update(bot, update)
    
    assert len(sent_messages) > 0, "No reply sent to normal user!"
    assert "Test Farmer" in sent_messages[-1].text, f"Incorrect start response! Text was: {sent_messages[-1].text}"
    print("SUCCESS: Test 1 Passed: Normal user start handler works perfectly.")

    # Test 2: Start Command for Blocked User (TI < 20)
    print("\n[TEST] Test 2: Sending /start command from blocked user (TI=10)...")
    sent_messages.clear()
    
    message_blocked = Message(
        message_id=2,
        date=datetime.now(),
        chat=Chat(id=888888, type="private"),
        from_user=User(id=888888, is_bot=False, first_name="Suspicious", username="suspicious_user"),
        text="/start"
    )
    update_blocked = Update(update_id=2, message=message_blocked)
    
    await dp.feed_update(bot, update_blocked)
    
    assert len(sent_messages) > 0, "No response sent to blocked user!"
    assert "заблокирован" in sent_messages[-1].text or "blocked" in sent_messages[-1].text.lower(), f"Blocked user was not stopped by middleware! Text was: {sent_messages[-1].text}"
    print("SUCCESS: Test 2 Passed: Low trust index user is correctly blocked by security middleware.")

    print("\nALL AUTOMATED TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
