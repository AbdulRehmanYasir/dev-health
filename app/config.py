"""DevHealth Configuration Module.
Centralized settings, scoring weights, and security parameters.
"""

from pathlib import Path
from typing import Dict, List, Set

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"
DATA_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)

# Application Settings
APP_NAME = "DevHealth"
APP_TAGLINE = "Know Your Project Before Production Does."
VERSION = "1.0.0"

HOST = "127.0.0.1"
PORT = 8000

# Database
DATABASE_URL = f"sqlite:///{DATA_DIR / 'devhealth.db'}"
SQLITE_DB_PATH = DATA_DIR / "devhealth.db"

# Security & Upload Boundaries
MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_FILES_TO_EXTRACT = 5000
MAX_FILE_SIZE_BYTES_TO_ANALYZE = 2 * 1024 * 1024  # 2MB per text file for regex scanning
REQUEST_TIMEOUT_SECONDS = 30

# Ignored Folders (Unnecessary / Vendored / Build artifacts)
IGNORED_DIRS: Set[str] = {
    "node_modules",
    ".git",
    "__pycache__",
    "dist",
    "build",
    ".venv",
    "venv",
    "env",
    ".tox",
    ".pytest_cache",
    ".mypy_cache",
    ".idea",
    ".vscode",
    ".next",
    ".nuxt",
    ".turbo",
    "coverage",
    ".nyc_output",
    "vendor",
    "Pods",
    "target",
}

# Ignored File Extensions
IGNORED_EXTENSIONS: Set[str] = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".class",
    ".o",
    ".so",
    ".dll",
    ".dylib",
    ".exe",
    ".bin",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".mp4",
    ".mp3",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".bz2",
}

# Overall Health Score Configurable Weights (Must sum to 1.0)
SCORE_WEIGHTS: Dict[str, float] = {
    "build": 0.20,
    "security": 0.25,
    "testing": 0.15,
    "dependencies": 0.15,
    "performance": 0.10,
    "documentation": 0.10,
    "production_readiness": 0.05,
}
