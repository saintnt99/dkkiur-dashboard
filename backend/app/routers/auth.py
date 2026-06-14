from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from ..auth import COOKIE_NAME, issue_token, require_auth, verify_password
from ..config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    password: str
    introduce: str | None = Field(default=None, max_length=80)


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response) -> dict[str, str]:
    if not verify_password(payload.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong password")
    identity = (payload.introduce or "").strip() or (request.client.host if request.client else "anonymous")
    token = issue_token(identity)
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.jwt_ttl_days * 24 * 3600,
    )
    return {"identity": identity}


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me")
def me(identity: str = Depends(require_auth)) -> dict[str, str]:
    return {"identity": identity}
