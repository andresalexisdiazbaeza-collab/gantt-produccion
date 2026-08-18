import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, SessionLocal, engine
from .routers import auth_router, confection, dashboard, export, import_router, items, machines, materials, optimize
from .seed import seed_database

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gantt Producción API", version="0.3.2")

_default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8002"
_cors_origins = [o.strip() for o in os.environ.get("GANTT_CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(machines.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(import_router.router, prefix="/api")
app.include_router(optimize.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(confection.router, prefix="/api")

_STATIC_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@app.on_event("startup")
def startup():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "0.3.2",
        "features": [
            "nuevo-formato-import",
            "gantt-planning-import-optional",
            "gantt-optimize-optional",
            "gantt-filters",
            "excel-export",
            "confection-module",
        ],
    }


def _serve_frontend():
    if not _STATIC_DIR.exists():
        return

    assets_dir = _STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def spa_root():
        return FileResponse(_STATIC_DIR / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404)
        target = _STATIC_DIR / full_path
        if full_path and target.is_file():
            return FileResponse(target)
        return FileResponse(_STATIC_DIR / "index.html")


_serve_frontend()
