from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, engine
from app.routers.api import router as api_router


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
FRONTEND_DIST = BASE_DIR / "templates"


@asynccontextmanager
async def lifespan(_: FastAPI):
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


settings = get_settings()
app = FastAPI(title=settings.app_title, lifespan=lifespan)

# Mount upload static files (for recipe images)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Mount Vue SPA built assets
if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

app.include_router(api_router)


def _serve_spa() -> HTMLResponse:
    """Serve the Vue SPA index.html (falls back to a placeholder if not built yet)."""
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))  # type: ignore[return-value]
    return HTMLResponse(
        "<h2>Frontend not built yet. Run: <code>cd frontend && npm run build</code></h2>",
        status_code=200,
    )


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def home() -> HTMLResponse:
    return _serve_spa()


@app.get("/admin", response_class=HTMLResponse, include_in_schema=False)
async def admin() -> HTMLResponse:
    return _serve_spa()
