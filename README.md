# DevHealth — Know Your Project Before Production Does

[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/build-production%20ready-success.svg)]()

> **DevHealth** is a developer-focused static project health analyzer. Users can upload a project ZIP file or provide a public GitHub repository URL. DevHealth inspects the project and produces an overall health rating (0–100) alongside deep audit reports for **Build Health**, **Security**, **Testing**, **Dependencies**, **Performance**, **Documentation**, and **Production Readiness**.

Designed strictly as a professional developer tool with no external paid APIs, zero code execution risks, and a dark-themed engineering dashboard.

---

## Architecture & Workflow

```text
UPLOAD PROJECT / GITHUB URL / SAMPLE
                 ↓
      PROJECT TYPE DETECTION
                 ↓
    FILE STRUCTURE HIERARCHY
                 ↓
          BUILD ANALYSIS
                 ↓
         SECURITY AUDIT (Masked Secrets)
                 ↓
        TESTING & COVERAGE
                 ↓
       DEPENDENCY EVALUATION
                 ↓
       PERFORMANCE HEURISTICS
                 ↓
       DOCUMENTATION QUALITY
                 ↓
       PRODUCTION READINESS
                 ↓
        OVERALL HEALTH SCORE
                 ↓
   DETAILED REPORT & EXPORT (PDF/HTML)
```

### Overall Health Formula

```text
Overall Health =
    Build               × 20%
  + Security            × 25%
  + Testing             × 15%
  + Dependencies        × 15%
  + Performance         × 10%
  + Documentation       × 10%
  + Production Ready    ×  5%
```

Statuses:
* `HEALTHY` (80–100)
* `NEEDS ATTENTION` (65–79)
* `AT RISK` (50–64)
* `CRITICAL` (< 50 or multiple critical vulnerabilities)

---

## Features

1. **Safe Project Ingestion**:
   - Drag-and-drop or browse `.zip` archives.
   - Public GitHub repository downloader (no GitHub tokens required).
   - In-memory traversal check preventing directory escapes (`../`) and decompression bombs.
   - Automatically skips `node_modules`, `.git`, `__pycache__`, `dist`, `.venv`, and other build caches.

2. **Project Type & Language Detection**:
   - Automatically detects React, Next.js, Vite, Vue, Node.js, FastAPI, Django, Flask, Rust, and Go.
   - Measures language distribution and primary programming language.

3. **File Structure Hierarchy**:
   - Visual collapsible directory tree.
   - Large files detector (>200KB).
   - Suspicious committed files detector (`.env`, private keys, backup `.bak` files).

4. **Deep Security Analysis**:
   - Scans for exposed API keys and secrets (OpenAI, AWS, GitHub PATs, Stripe live keys, Google API, Slack tokens).
   - **Secret Masking**: All UI previews strictly mask sensitive strings (`sk-****************92ab`).
   - Flags dangerous patterns: `eval()`, `document.write()`, Python `subprocess(..., shell=True)`, `os.system()`, SQL query string concatenations, debug mode in production, wildcard CORS.

5. **Build & Dependency Verification**:
   - Manifest validation (`package.json`, `requirements.txt`, `pyproject.toml`).
   - Checks for production build and start scripts.
   - Detects missing lockfiles (`package-lock.json`, `yarn.lock`, etc.).
   - Flags unpinned version ranges and known deprecated packages (e.g. `request`, `pycrypto`).
   - Clearly labeled: *Security database: Local/static analysis only*.

6. **Testing & Performance Metrics**:
   - Detects test frameworks (pytest, unittest, Jest, Vitest, Mocha, Cypress, Playwright).
   - Measures source-to-test ratio.
   - Evaluates client-side oversized script assets, uncompressed images, and loop bottlenecks.

7. **Production Readiness & Reports**:
   - Classifies readiness: `PRODUCTION READY`, `READY WITH IMPROVEMENTS`, `NEEDS WORK`, or `NOT READY`.
   - Issue Explorer with filtering by Severity and Category.
   - Exportable, print-friendly HTML and PDF reports.
   - Historical audits stored locally in SQLite (`data/devhealth.db`).

---

## Installation & Running Locally

### Prerequisites
* Python 3.10+ (Python 3.11+ recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/devhealth.git
cd devhealth

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Launch the DevHealth server
python main.py
```

Open your browser to:
```text
http://127.0.0.1:8000
```
Interactive API documentation is accessible at `http://127.0.0.1:8000/docs`.

---

## Project Structure

```text
devhealth/
│
├── main.py                     # Application entry point (FastAPI + Uvicorn)
├── requirements.txt            # Python dependencies
├── test_analyzer.py            # Analyzer verification test suite
├── README.md                   # Documentation
│
├── app/
│   ├── config.py               # Configurable thresholds, weights, and filters
│   ├── database.py             # SQLite persistence layer
│   │
│   ├── models/
│   │   └── schemas.py          # Pydantic schemas (with fallback)
│   │
│   ├── analyzers/
│   │   ├── project_detector.py # Framework and language detection
│   │   ├── structure.py        # File hierarchy and metrics
│   │   ├── build.py            # Manifest and script auditing
│   │   ├── security.py         # Static secret & vulnerability scanner
│   │   ├── testing.py          # Test framework & ratio analysis
│   │   ├── dependencies.py     # Lockfile & dependency auditing
│   │   ├── performance.py      # Bundle and algorithmic heuristics
│   │   ├── documentation.py    # README & LICENSE verification
│   │   └── production.py       # Production readiness calculation
│   │
│   ├── services/
│   │   ├── analyzer_service.py # Orchestrator pipeline
│   │   ├── github_service.py   # Public GitHub repository fetcher
│   │   └── report_service.py   # Print-friendly HTML report generator
│   │
│   ├── routes/
│   │   ├── analysis.py         # Upload, GitHub, and History endpoints
│   │   └── pages.py            # Template view endpoints
│   │
│   └── utils/
│       ├── security.py         # Safe extraction, secret masking & regex
│       ├── files.py            # Safe text reading & tree building
│       └── scoring.py          # Weight calculations & classifications
│
├── fixtures/                   # Sample project fixtures for automated testing
└── data/                       # Local SQLite database directory
```

---

## Security Model

DevHealth enforces strict security guarantees:

1. **NO CODE EXECUTION**: DevHealth never executes uploaded code, tests, build scripts, or server files. All analysis is 100% static AST/regex/file inspection.
2. **ZIP Traversal Protection**: Archive member paths are normalized; path components containing `..` or absolute paths are rejected.
3. **Secret Masking**: All discovered credentials are automatically masked before persisting or presenting in the UI (`sk-****************92ab`).
4. **Local Persistence**: All project audits remain strictly on the local machine in `data/devhealth.db`.

---

## Limitations

* **Static Analysis Only**: Does not execute dynamic sandbox tests or run live linters.
* **Heuristics-Based**: Does not substitute for a formal CVE scanner connected to live threat intelligence APIs.
* **File Size Ceiling**: Default maximum ZIP extraction is capped at 50MB and 5,000 files for local responsiveness.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
