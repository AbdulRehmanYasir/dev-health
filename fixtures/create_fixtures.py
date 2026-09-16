from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent


def create_sample_projects():
    rayva_dir = FIXTURES_DIR / "rayva_cloud"
    rayva_dir.mkdir(parents=True, exist_ok=True)
    (rayva_dir / "src").mkdir(exist_ok=True)

    with open(rayva_dir / "package.json", "w", encoding="utf-8") as f:
        f.write(
            """{
  "name": "rayva-cloud",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "*"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}"""
        )

    with open(rayva_dir / "src" / "config.js", "w", encoding="utf-8") as f:
        f.write(
            """// Configuration module
export const API_ENDPOINT = "https://api.rayvacloud.internal";
export const OPENAI_API_KEY = "your-openai-api-key-here";
export const DB_PASSWORD = "your-database-password-here";
"""
        )

    with open(rayva_dir / "README.md", "w", encoding="utf-8") as f:
        f.write(
            """# Rayva Cloud

Cloud orchestration interface built with React & Vite.

Installation

npm install
npm run dev
"""
        )

    py_dir = FIXTURES_DIR / "fastapi_service"
    py_dir.mkdir(parents=True, exist_ok=True)
    (py_dir / "app").mkdir(exist_ok=True)
    (py_dir / "tests").mkdir(exist_ok=True)

    with open(py_dir / "requirements.txt", "w", encoding="utf-8") as f:
        f.write(
            """fastapi==0.110.0
uvicorn==0.28.0
pydantic==2.6.0
pytest==8.0.0
httpx==0.27.0
"""
        )

    with open(py_dir / "Dockerfile", "w", encoding="utf-8") as f:
        f.write(
            """FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main", "--host", "0.0.0.0", "--port", "8000"]
"""
        )

    with open(py_dir / ".env.example", "w", encoding="utf-8") as f:
        f.write(
            """DATABASE_URL=sqlite:///./app.db
SECRET_KEY=change-this-in-production
DEBUG=False
"""
        )

    with open(py_dir / "README.md", "w", encoding="utf-8") as f:
        f.write(
            """# User Auth Service

FastAPI microservice handling token issuance.

Setup

pip install -r requirements.txt
python main.py

Environment Variables

DATABASE_URL: Connection string
SECRET_KEY: JWT signing secret
"""
        )

    with open(py_dir / "tests" / "test_auth.py", "w", encoding="utf-8") as f:
        f.write(
            """from app.main import app


def test_health():
    assert 200 == 200
"""
        )

    vuln_dir = FIXTURES_DIR / "legacy_vulnerable"
    vuln_dir.mkdir(parents=True, exist_ok=True)

    with open(vuln_dir / "server.py", "w", encoding="utf-8") as f:
        f.write(
            """import sqlite3
import subprocess


def run_backup(folder):
    # Intentional shell injection example
    subprocess.Popen(
        "tar -czf backup.tar.gz " + folder,
        shell=True,
    )


def find_user(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()

    # Intentional SQL injection example
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)

    return cursor.fetchall()


def execute_debug(code):
    # Intentional unsafe eval example
    return eval(code)
"""
        )

    with open(vuln_dir / ".env", "w", encoding="utf-8") as f:
        f.write(
            """DB_USER=root
DB_PASSWORD=your-database-password-here
STRIPE_SECRET_KEY=your-stripe-secret-key-here
"""
        )


if __name__ == "__main__":
    create_sample_projects()
    print("Created fixtures successfully.")