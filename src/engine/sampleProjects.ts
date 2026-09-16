
import { ProjectFile } from "./staticAnalyzer";

export interface SampleProjectFixture {
  id: string;
  name: string;
  tagline: string;
  type: string;
  description: string;
  files: ProjectFile[];
}

export const SAMPLE_PROJECTS: SampleProjectFixture[] = [
  {
    id: "rayva-cloud",
    name: "Rayva Cloud",
    tagline: "React + Vite Cloud Dashboard",
    type: "React + Vite",
    description:
      "Cloud management UI with exposed credentials, unpinned dependencies, and missing lockfile.",
    files: [
      {
        path: "package.json",
        size: 512,
        content: `{
  "name": "rayva-cloud",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "*",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}`,
      },
      {
        path: "src/config/api.ts",
        size: 780,
        content: `// Application Configuration
export const API_BASE = "https://api.rayvacloud.internal/v1";

// CRITICAL SECURITY FINDING: Leaked secret key
export const OPENAI_API_KEY = "your-openai-api-key-here";
export const AWS_ACCESS_KEY = "your-aws-access-key-here";

export const APP_SETTINGS = {
  timeout: 5000,
  maxRetries: 3,
};
`,
      },
      {
        path: "src/components/Dashboard.tsx",
        size: 1400,
        content: `import React, { useState, useEffect } from "react";
import { API_BASE } from "../config/api";

export function Dashboard() {
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    fetch(\`\${API_BASE}/clusters\`)
      .then(res => res.json())
      .then(data => setClusters(data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Rayva Cloud Clusters</h1>
      <p>Managing active distributed nodes.</p>
    </div>
  );
}
`,
      },
      {
        path: "README.md",
        size: 420,
        content: `# Rayva Cloud
Cloud orchestration interface for multi-region node deployments.

## Installation
\`\`\`bash
npm install
npm run dev
\`\`\`

## Architecture
Built on React 18, Vite, and Tailwind CSS.
`,
      },
      {
        path: "LICENSE",
        size: 1080,
        content: `MIT License
Copyright (c) 2026 Rayva Cloud Team
Permission is hereby granted, free of charge...
`,
      },
    ],
  },
  {
    id: "fastapi-service",
    name: "FastAPI Auth Service",
    tagline: "Python 3.11 Microservice",
    type: "FastAPI / Python",
    description:
      "Production-ready token authentication service with unit tests, Dockerfile, and safe configuration.",
    files: [
      {
        path: "requirements.txt",
        size: 240,
        content: `fastapi==0.110.0
uvicorn[standard]==0.28.0
pydantic==2.6.4
pytest==8.1.1
httpx==0.27.0
python-jose[cryptography]==3.3.0
`,
      },
      {
        path: "Dockerfile",
        size: 380,
        content: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
      },
      {
        path: ".env.example",
        size: 180,
        content: `DATABASE_URL=sqlite:///./auth.db
JWT_SECRET_KEY=change_this_secret_in_production
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=False
`,
      },
      {
        path: "app/main.py",
        size: 920,
        content: `import os
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="Auth Microservice", version="1.0.0")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "auth-microservice"}

@app.post("/token", response_model=TokenResponse)
def login():
    try:
        # Secure token generation
        token = "dummy_token_jwt"
        return TokenResponse(access_token=token)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Token issuance failed.")
`,
      },
      {
        path: "tests/test_auth.py",
        size: 550,
        content: `import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_token_endpoint():
    response = client.post("/token")
    assert response.status_code == 200
    assert "access_token" in response.json()
`,
      },
      {
        path: "README.md",
        size: 620,
        content: `# FastAPI Authentication Microservice
High-performance stateless authentication service.

## Installation
\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
\`\`\`

## Running
\`\`\`bash
uvicorn app.main:app --reload --port 8000
\`\`\`

## Environment Variables
- \`DATABASE_URL\`: Database connection string
- \`JWT_SECRET_KEY\`: JWT signing key
`,
      },
      {
        path: "LICENSE",
        size: 1080,
        content: `Apache License 2.0
Copyright 2026 Microservice Author
`,
      },
      {
        path: ".github/workflows/ci.yml",
        size: 420,
        content: `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest
`,
      },
    ],
  },
  {
    id: "legacy-ecommerce",
    name: "Legacy E-Commerce API",
    tagline: "Vulnerable Monolith",
    type: "Python Application",
    description:
      "High-risk legacy repository with SQL injection, shell command execution, committed .env credentials, and no tests.",
    files: [
      {
        path: ".env",
        size: 280,
        content: `DB_HOST=10.0.0.45
DB_USER=root
DB_PASSWORD=production_master_password_9988
STRIPE_SECRET_KEY=your-stripe-secret-key-here
DEBUG=True
`,
      },
      {
        path: "server.py",
        size: 1540,
        content: `import os
import subprocess
import sqlite3

def handle_backup(folder_name):
    # CRITICAL: Shell Injection
    command = "tar -czf backup.tar.gz " + folder_name
    subprocess.Popen(command, shell=True)

def query_user(user_id):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    # CRITICAL: SQL Injection via string concatenation
    sql = "SELECT * FROM users WHERE id = '" + str(user_id) + "'"
    cursor.execute(sql)
    return cursor.fetchall()

def run_arbitrary_calculator(formula):
    # CRITICAL: Arbitrary code execution
    return eval(formula)

def main():
    print("Legacy server started in DEBUG mode.")
`,
      },
      {
        path: "requirements.txt",
        size: 80,
        content: `pycrypto
request
flask
`,
      },
      {
        path: "README.md",
        size: 150,
        content: `# Legacy E-Commerce
Old backend code from 2019.
Run server.py to start.
`,
      },
    ],
  },
];