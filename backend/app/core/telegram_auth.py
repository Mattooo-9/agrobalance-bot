import hmac
import hashlib
import urllib.parse
from backend.app.core.config import settings

def verify_telegram_webapp_signature(init_data: str) -> tuple[bool, dict]:
    """
    Verifies the cryptographic signature of Telegram WebApp initData.
    Returns (is_valid, user_data_dict)
    """
    if not init_data:
        return False, {}

    try:
        # Parse query string
        parsed = urllib.parse.parse_qsl(init_data, keep_blank_values=True)
        params = dict(parsed)
        
        if "hash" not in params:
            return False, {}
            
        received_hash = params.pop("hash")
        
        # Sort key=value pairs alphabetically and join with newlines
        sorted_keys = sorted(params.keys())
        data_check_list = [f"{key}={params[key]}" for key in sorted_keys]
        data_check_string = "\n".join(data_check_list)
        
        # Calculate secret key: HMAC-SHA256(bot_token, "WebAppData")
        secret_key = hmac.new(
            b"WebAppData",
            settings.TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate local hash: HMAC-SHA256(data_check_string, secret_key)
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        is_valid = calculated_hash == received_hash
        
        # Decode user parameters
        user_data = {}
        if is_valid and "user" in params:
            import json
            user_data = json.loads(params["user"])
            
        return is_valid, user_data
    except Exception as e:
        print(f"Error validating Telegram signature: {e}")
        return False, {}
