import hmac
import hashlib
import time
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

TOKEN_SECRET = os.getenv("TOKEN_SECRET", "change-this-secret-in-production")
WINDOW_SECONDS = 30  # token rotates every 30 seconds


def _current_window() -> int:
    """Returns an integer that changes every 30 seconds."""
    return int(time.time()) // WINDOW_SECONDS


def generate_token(session_id: str, window=None) -> str:
    """
    Generate a 12-character alphanumeric token for a given session_id
    and time window. Uses HMAC-SHA256 so it's unguessable without the secret.
    """
    if window is None:
        window = _current_window()
    message = f"{session_id}:{window}".encode()
    secret = TOKEN_SECRET.encode()
    digest = hmac.new(secret, message, hashlib.sha256).hexdigest()
    # Take first 12 hex characters — alphanumeric, unguessable
    return digest[:12]


def verify_token(session_id: str, token: str) -> bool:
    """
    Verify that the token matches the current OR previous window.
    Allowing the previous window (30s grace) prevents rejecting a student
    who scanned just as the token rotated.
    """
    current = _current_window()
    valid_tokens = {
        generate_token(session_id, current),
        generate_token(session_id, current - 1),  # 30s grace period
    }
    return token in valid_tokens


def current_token(session_id: str) -> str:
    """Returns the token that is valid right now for this session."""
    return generate_token(session_id)