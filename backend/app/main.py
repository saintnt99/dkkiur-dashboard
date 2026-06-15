from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import auth as auth_router
from .routers import data as data_router
from .routers import imports as imports_router

app = FastAPI(title="ДККиУР Дашборд", docs_url="/api/docs", openapi_url="/api/openapi.json")

if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(data_router.router, prefix="/api", tags=["data"])
app.include_router(imports_router.router, prefix="/api/import", tags=["import"])


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if settings.serve_static:
    static_dir = Path(__file__).resolve().parent.parent / "static"
    if static_dir.exists():
        app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa_fallback(full_path: str) -> FileResponse:
            target = static_dir / full_path
            if target.is_file():
                # ассеты с хешами в имени — кэшируем, остальное (index.html) — нет
                if target.suffix in (".js", ".css", ".woff", ".woff2", ".png", ".jpg", ".svg"):
                    return FileResponse(target, headers={"Cache-Control": "public, max-age=31536000, immutable"})
                return FileResponse(target, headers={"Cache-Control": "no-cache"})
            return FileResponse(static_dir / "index.html", headers={"Cache-Control": "no-cache"})
