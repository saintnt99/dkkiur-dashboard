import hashlib
import re

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_ETAG_NORMALIZE = re.compile(r"-(gzip|zstd|br|deflate)$")


def _normalize_etag(value: str) -> str:
    value = value.strip()
    if value.startswith("W/"):
        value = value[2:]
    value = value.strip('"')
    return _ETAG_NORMALIZE.sub("", value)


class ETagMiddleware(BaseHTTPMiddleware):
    """ETag для GET /api/*: при повторном опросе сервер отдаёт 304 без тела,
    клиент использует кэш браузера. Поведение приложения не меняется,
    но polling каждые 10с перестаёт качать одни и те же 70 KB."""

    async def dispatch(self, request: Request, call_next):
        if request.method != "GET" or not request.url.path.startswith("/api/"):
            return await call_next(request)

        response = await call_next(request)
        if response.status_code != 200:
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        etag = '"' + hashlib.md5(body).hexdigest() + '"'
        headers = dict(response.headers)
        headers["etag"] = etag
        headers["cache-control"] = "private, max-age=0, must-revalidate"

        client = request.headers.get("if-none-match")
        if client and _normalize_etag(client) == _normalize_etag(etag):
            return Response(
                status_code=304,
                headers={"etag": etag, "cache-control": headers["cache-control"]},
            )

        headers.pop("content-length", None)
        return Response(
            content=body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )
