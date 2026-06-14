from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import auth as auth_router

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
                return FileResponse(target)
            return FileResponse(static_dir / "index.html")
