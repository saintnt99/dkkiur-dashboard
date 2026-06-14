import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, HTTPException, status

from .config import settings

COOKIE_NAME = "dkkiur_auth"


def verify_password(candidate: str) -> bool:
    return hmac.compare_digest(candidate.strip(), settings.site_password)


def issue_token(identity: str | None = None) -> str:
    payload = {
        "sub": identity or "anonymous",
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_ttl_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def require_auth(dkkiur_auth: str | None = Cookie(default=None)) -> str:
    if not dkkiur_auth:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "auth required")
    try:
        payload = jwt.decode(dkkiur_auth, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token") from exc
    return str(payload.get("sub", "anonymous"))
