import os
import re
import time
import hashlib
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import bcrypt
import jwt
from fastapi import Request, HTTPException, status, Depends
from ..storage.db import UserDB

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "evoredteam-super-secure-evolution-jwt-secret-key-2026")
JWT_ALGORITHM = "HS256"
SESSION_COOKIE_NAME = "evoredteam_session"
SESSION_DURATION_DAYS = 7

# Email regex validator
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# In-memory rate limiting for login attempts
# key: ip_or_email -> list of failed attempt timestamps
_login_attempts: Dict[str, list] = {}
RATE_LIMIT_WINDOW_SECONDS = 300 # 5 minutes
MAX_FAILED_ATTEMPTS = 5

def validate_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    return bool(EMAIL_REGEX.match(email)) and len(email) <= 255

def validate_password_policy(password: str) -> Tuple[bool, str]:
    if not password or len(password) < 10:
        return False, "Password must be at least 10 characters long."
    return True, ""

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.warning("Error verifying password: %s", e)
        return False

def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

def create_session_jwt(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=SESSION_DURATION_DAYS)).timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_session_jwt(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return None

def check_login_rate_limit(identifier: str) -> bool:
    now = time.time()
    attempts = _login_attempts.get(identifier, [])
    # Filter attempts within window
    recent_attempts = [t for t in attempts if now - t < RATE_LIMIT_WINDOW_SECONDS]
    _login_attempts[identifier] = recent_attempts
    return len(recent_attempts) < MAX_FAILED_ATTEMPTS

def record_failed_login(identifier: str):
    now = time.time()
    if identifier not in _login_attempts:
        _login_attempts[identifier] = []
    _login_attempts[identifier].append(now)

def clear_failed_logins(identifier: str):
    if identifier in _login_attempts:
        del _login_attempts[identifier]

async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    # Check session cookie
    token = request.cookies.get(SESSION_COOKIE_NAME)
    
    # Optional Bearer token header fallback
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        return None

    payload = decode_session_jwt(token)
    if not payload or "sub" not in payload:
        return None

    user = UserDB.get_by_id(payload["sub"])
    return user

async def get_current_user(request: Request) -> Dict[str, Any]:
    user = await get_optional_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user
