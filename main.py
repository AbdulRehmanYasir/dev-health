"""DevHealth Main Application Entry Point.
Run with:
    pip install -r requirements.txt
    python main.py
"""

import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.config import APP_NAME, APP_TAGLINE, HOST, PORT, VERSION
from app.database import init_db
from app.routes.analysis import router as analysis_router
from app.routes.pages import router as pages_router

# Ensure app package is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

app = FastAPI(
    title=APP_NAME,
    description=f"{APP_TAGLINE} - Advanced developer static health, security, and production audit tool.",
    version=VERSION,
)

# Enable CORS for local development and web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc), "path": str(request.url)},
    )

# Static Files
STATIC_DIR = BASE_DIR / "static"
if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include Routers
app.include_router(analysis_router)
app.include_router(pages_router)


@app.on_event("startup")
def on_startup():
    """Ensure database schema is provisioned on startup."""
    init_db()


if __name__ == "__main__":
    print(f"Starting {APP_NAME} v{VERSION}...")
    print(f"Server exposing at: http://{HOST}:{PORT}")
    print(f"API documentation: http://{HOST}:{PORT}/docs")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
