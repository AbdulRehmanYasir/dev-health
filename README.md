<div align="center">

# 🛡 DEVHEALTH

### Developer Health & Security Analysis Platform

A developer-focused platform for analyzing projects before production through static code inspection, security auditing, dependency analysis, testing evaluation, performance heuristics, documentation checks, and production-readiness scoring.

**Inspect. Analyze. Secure. Ship.**

</div>

---

## 📌 About

**DevHealth** is a web-based developer health and security analyzer designed to help developers understand the condition of a project before it reaches production.

The platform allows users to upload a project ZIP file, provide a public GitHub repository URL, or analyze built-in sample projects.

DevHealth performs a complete **static project audit** and produces an overall **0–100 health score** alongside detailed reports covering build health, security, testing, dependencies, performance, documentation, and production readiness.

The project focuses on combining **static analysis, security inspection, project intelligence, weighted scoring, and developer-friendly reporting** into one complete application.

---

## ✨ Features

* 📦 ZIP project upload and analysis
* 🔗 Public GitHub repository analysis
* 🧪 Built-in sample projects
* 🔍 Automatic project type detection
* 💻 Programming language detection
* 🌳 Project structure analysis
* 🏗 Build health analysis
* 🔐 Static security auditing
* 🔑 Exposed secret detection
* 🎭 Automatic secret masking
* 🧪 Testing and test-ratio analysis
* 📦 Dependency analysis
* ⚡ Performance heuristics
* 📚 Documentation analysis
* 🚀 Production readiness assessment
* 📊 Weighted 0–100 health scoring
* 📝 Detailed issue explorer
* 🔎 Severity and category filtering
* 📄 HTML report generation
* 📑 PDF report generation
* 💾 Local SQLite audit history
* 🛡 ZIP traversal protection
* 🚫 No uploaded-code execution

---

## 📊 Health Score

DevHealth evaluates projects across seven engineering categories.

| Category             | Weight |
| -------------------- | -----: |
| Build Health         |    20% |
| Security             |    25% |
| Testing              |    15% |
| Dependencies         |    15% |
| Performance          |    10% |
| Documentation        |    10% |
| Production Readiness |     5% |

The final score is calculated using the weighted category results.

```text
Build Health          × 20%
Security              × 25%
Testing               × 15%
Dependencies          × 15%
Performance           × 10%
Documentation         × 10%
Production Readiness  ×  5%
```

### Health Classification

```text
80 – 100  → HEALTHY
65 – 79   → NEEDS ATTENTION
50 – 64   → AT RISK
0  – 49   → CRITICAL
```

---

## 🔐 Security Analysis

DevHealth performs static security inspection across project files.

The analyzer can identify patterns related to:

```text
Exposed API Keys
AWS Credentials
GitHub Tokens
Stripe Keys
Google API Keys
Slack Tokens
eval()
os.system()
subprocess(..., shell=True)
SQL Query Concatenation
Wildcard CORS
Production Debug Configuration
```

Sensitive values are masked before being displayed in reports.

```text
sk-****************92ab
```

The security analyzer is intentionally **static** and does not execute discovered code.

---

## 📦 Project Ingestion

Projects can enter DevHealth through three different sources.

```text
             PROJECT INPUT
                  │
       ┌──────────┼──────────┐
       │          │          │
       ▼          ▼          ▼
      ZIP      GitHub      Sample
       │          │          │
       └──────────┼──────────┘
                  ▼
          Project Extraction
                  │
                  ▼
           Structure Analysis
                  │
                  ▼
            Audit Pipeline
```

### ZIP Analysis

Uploaded archives are processed safely with:

* Directory traversal protection
* Absolute-path protection
* File-count limits
* Extraction-size limits
* Temporary extraction
* Ignored build/cache directories

DevHealth never executes files contained inside uploaded archives.

### GitHub Analysis

Public repositories can be analyzed directly through their GitHub URL.

```text
GitHub Repository
        ↓
Repository Download
        ↓
Safe Extraction
        ↓
Project Detection
        ↓
Static Audit
        ↓
Health Report
```

No GitHub token is required for public repositories.

---

## 🏗 Analysis Pipeline

```text
UPLOAD / GITHUB / SAMPLE
          ↓
   PROJECT DETECTION
          ↓
    FILE STRUCTURE
          ↓
     BUILD HEALTH
          ↓
      SECURITY
          ↓
       TESTING
          ↓
    DEPENDENCIES
          ↓
    PERFORMANCE
          ↓
   DOCUMENTATION
          ↓
 PRODUCTION READINESS
          ↓
    HEALTH SCORE
          ↓
 DETAILED AUDIT REPORT
```

---

## 🧠 Project Detection

DevHealth automatically identifies project technologies and frameworks based on project files and configuration.

Supported project types include:

```text
React
Next.js
Vite
Vue
Node.js
FastAPI
Django
Flask
Rust
Go
```

The analyzer also determines:

* Primary programming language
* Language distribution
* Project type
* Framework indicators
* Important project configuration files

---

## 🏗 Build Health

The Build analyzer evaluates the project's basic build configuration.

It checks:

* `package.json`
* `requirements.txt`
* `pyproject.toml`
* Build scripts
* Start scripts
* Manifest configuration
* Lockfiles
* Dependency version ranges
* Deprecated packages

The goal is to identify configuration problems that could affect project reliability and deployment.

---

## 🧪 Testing Analysis

DevHealth evaluates the project's testing setup.

Supported testing ecosystems include:

```text
pytest
unittest
Jest
Vitest
Mocha
Cypress
Playwright
```

The analyzer examines:

* Test framework detection
* Test file presence
* Source-to-test ratio
* Testing configuration
* Test organization

---

## ⚡ Performance Analysis

The performance analyzer uses static heuristics to identify potential performance problems.

It checks for:

* Large source files
* Oversized frontend assets
* Uncompressed images
* Potential loop bottlenecks
* Client-side performance concerns

The analysis is designed to highlight areas worth reviewing rather than replace runtime profiling.

---

## 📚 Documentation Analysis

DevHealth evaluates important project documentation.

It checks for:

```text
README
LICENSE
Project Metadata
Setup Instructions
Documentation Quality
```

Documentation contributes directly to the overall project health score.

---

## 🚀 Production Readiness

The production analyzer combines findings from the complete audit pipeline.

Projects are classified as:

```text
PRODUCTION READY
        ↓
READY WITH IMPROVEMENTS
        ↓
NEEDS WORK
        ↓
NOT READY
```

The classification considers the project's overall health, security findings, build configuration, testing, dependencies, documentation, and other detected issues.

---

## 📊 Audit Reports

Every completed analysis produces a detailed project report.

Reports include:

* Overall health score
* Category scores
* Project information
* Detected technologies
* Security findings
* Build issues
* Testing results
* Dependency findings
* Performance findings
* Documentation results
* Production-readiness status
* Severity levels
* Affected files
* Masked code snippets
* Recommendations

Reports can be exported for further review.

---

## 🗂 Issue Explorer

DevHealth provides an issue explorer for navigating detected problems.

Issues can be filtered by:

```text
Severity
    ↓
Critical
High
Medium
Low
Info

Category
    ↓
Build
Security
Testing
Dependencies
Performance
Documentation
Production
```

This allows developers to focus on specific areas of the project instead of reviewing the entire audit at once.

---

## 💾 Audit History

Completed audits can be stored locally using SQLite.

```text
Project Analysis
       ↓
Audit Result
       ↓
Health Score
       ↓
SQLite Storage
       ↓
Historical Audit
```

The application keeps this persistence local rather than requiring an external database service.

---

## 🏗 Architecture

```text
                         DEVHEALTH
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          ZIP Input      GitHub Input    Samples
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                   Analyzer Service
                            │
        ┌───────────────────┼───────────────────┐
        │         │         │         │          │
        ▼         ▼         ▼         ▼          ▼
      Build   Security  Testing  Dependencies Performance
        │         │         │         │          │
        └─────────┴─────────┼─────────┴──────────┘
                            │
                     Documentation
                            │
                            ▼
                  Production Analyzer
                            │
                            ▼
                      Scoring Engine
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
             Audit Report        SQLite History
```

---

## 🔄 Application Flow

```text
Project Input
      ↓
Detect Project
      ↓
Build Project Tree
      ↓
Analyze Build
      ↓
Audit Security
      ↓
Analyze Testing
      ↓
Analyze Dependencies
      ↓
Analyze Performance
      ↓
Analyze Documentation
      ↓
Calculate Production Readiness
      ↓
Calculate Overall Score
      ↓
Generate Report
      ↓
Store Audit History
```

---

## 🧩 Core Systems

### Project Detector

Responsible for:

* Project type detection
* Framework detection
* Language detection
* Language distribution
* Project metadata

### Structure Analyzer

Responsible for:

* Directory hierarchy
* File discovery
* File counts
* Large file detection
* Suspicious file detection

### Security Analyzer

Responsible for:

* Secret detection
* Credential detection
* Dangerous pattern detection
* Security issue classification
* Secret masking

### Build Analyzer

Responsible for:

* Manifest validation
* Build scripts
* Start scripts
* Lockfiles
* Dependency configuration

### Testing Analyzer

Responsible for:

* Test framework detection
* Test file discovery
* Source-to-test ratio
* Testing configuration

### Dependency Analyzer

Responsible for:

* Dependency discovery
* Version analysis
* Lockfile detection
* Deprecated dependency detection

### Performance Analyzer

Responsible for:

* Large assets
* Image analysis
* File-size heuristics
* Potential performance bottlenecks

### Production Analyzer

Responsible for:

* Combining audit results
* Production-readiness classification
* Critical issue evaluation

### Scoring Engine

Responsible for:

* Category scores
* Weighted calculations
* Overall health score
* Health classification

---

## 📂 Project Structure

```text
dev-health/
│
├── app/
│   ├── analyzers/
│   │   ├── build.py
│   │   ├── dependencies.py
│   │   ├── documentation.py
│   │   ├── performance.py
│   │   ├── production.py
│   │   ├── project_detector.py
│   │   ├── security.py
│   │   ├── structure.py
│   │   └── testing.py
│   │
│   ├── models/
│   │   └── schemas.py
│   │
│   ├── routes/
│   │   ├── analysis.py
│   │   └── pages.py
│   │
│   ├── services/
│   │   ├── analyzer_service.py
│   │   ├── github_service.py
│   │   └── report_service.py
│   │
│   └── utils/
│       ├── files.py
│       ├── scoring.py
│       └── security.py
│
├── fixtures/
│
├── data/
│
├── src/
│
├── main.py
├── requirements.txt
├── test_analyzer.py
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── README.md
```

---

## 🛠 Tech Stack

| Technology | Usage                   |
| ---------- | ----------------------- |
| React      | Frontend application    |
| TypeScript | Type-safe development   |
| Vite       | Frontend build tooling  |
| Python     | Backend analysis engine |
| FastAPI    | Backend API             |
| Uvicorn    | Application server      |
| Pydantic   | Data validation         |
| SQLite     | Local audit persistence |
| HTML / CSS | Interface and reports   |
| Git        | Version control         |
| GitHub     | Repository hosting      |

---

## 🔒 Security Model

DevHealth is designed around a **no-code-execution architecture**.

```text
Uploaded Project
       ↓
Read Files
       ↓
Inspect Structure
       ↓
Static Analysis
       ↓
Generate Findings
```

DevHealth does **not** execute:

* Uploaded applications
* Build scripts
* Test suites
* Server code
* Shell commands from analyzed projects

### ZIP Protection

```text
Maximum Extraction Size → 50 MB
Maximum File Count      → 5,000
```

Archives are checked before extraction to prevent directory traversal and excessive extraction.

---

## 🚀 Getting Started

DevHealth is a Python/FastAPI application with a React/TypeScript frontend. The
FastAPI service owns project ingestion, static analysis, scoring, report
generation, and SQLite history. The Vite application is a separate browser
client that calls the documented `/api/*` endpoints.

### 1. Clone the repository

```bash
git clone https://github.com/AbdulRehmanYasir/dev-health.git
cd dev-health
```

### 2. Create a virtual environment

#### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

#### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the backend

```bash
python main.py
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Start the frontend

```bash
npm install
npm run dev
```

The frontend will be available at the Vite development URL shown in the terminal.

The frontend uses `VITE_API_URL` for the backend origin. Create `.env.local`
when the backend is not running at the default local URL:

```text
VITE_API_URL=http://127.0.0.1:8000
```

The existing API contracts include ZIP upload, GitHub repository, and sample
analysis at `/api/analyze/upload`, `/api/analyze/github`, and
`/api/analyze/sample/{sample_id}`. History and HTML reports remain available
through `/api/history`, `/api/project/{project_id}`, and
`/api/report/{project_id}`.

## GitHub Pages

GitHub Pages hosts only the Vite frontend; it cannot run FastAPI or SQLite.
The workflow in `.github/workflows/deploy-pages.yml` builds the frontend with
the `/dev-health/` base path and deploys `dist/` to Pages. Set a repository
variable named `VITE_API_URL` to the public URL of a separately deployed
FastAPI backend before using the Pages site. The backend must allow the Pages
origin through its CORS policy.

For the repository's current remote, the Pages URL is:

```text
https://abdulrehmanyasir.github.io/dev-health/
```

In **Settings > Pages**, choose **GitHub Actions** as the source. The workflow
deploys from the `main` branch after a successful frontend build.

---

## 🏗 Production Build

Build the frontend:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## 🧪 Testing

Run the analyzer tests:

```bash
python -m pytest
```

Frontend checks:

```bash
npm run lint
npm run build
```

## Language and repository hygiene

The tracked application source consists of the Python backend in `app/` and
`main.py`, plus the required React/TypeScript client in `src/`. Generated
metadata, lockfiles, build output, caches, uploads, and local environments are
excluded from Linguist statistics through `.gitattributes` and `.gitignore`.
The real frontend source remains tracked and is not relabeled as generated or
vendored, so language percentages reflect the actual application rather than
an artificial Python increase.

Or:

```bash
python test_analyzer.py
```

---

## 📋 Current Status

```text
Project Detection          ✅
ZIP Project Analysis       ✅
GitHub Repository Analysis ✅
Structure Analysis         ✅
Build Analysis             ✅
Security Analysis          ✅
Secret Masking             ✅
Testing Analysis           ✅
Dependency Analysis        ✅
Performance Analysis       ✅
Documentation Analysis     ✅
Production Readiness       ✅
Health Scoring             ✅
Issue Explorer             ✅
HTML Reports               ✅
PDF Reports                ✅
SQLite History             ✅
Responsive Interface       ✅
```

---

## ⚠️ Limitations

DevHealth is a **static analysis platform** and does not replace a complete production security pipeline.

It does not currently:

```text
Execute Uploaded Code
        ✕
Run Dynamic Security Tests
        ✕
Perform Penetration Testing
        ✕
Replace Professional Security Audits
        ✕
Query Live CVE Databases
        ✕
Guarantee Production Security
        ✕
```

Findings are based on static inspection and heuristic analysis.

---

## 🎯 Project Goals

DevHealth was built around a simple idea:

```text
Before Production
       ↓
Understand Your Project
       ↓
Find Hidden Problems
       ↓
Fix Critical Issues
       ↓
Improve Project Health
       ↓
Ship With Confidence
```

The goal is to give developers a single place to understand the health of a project across **security, build quality, testing, dependencies, performance, documentation, and production readiness**.

---

## 👨‍💻 Author

<div align="center">

### Abdul Rehman Yasir

**BS Artificial Intelligence Student | Developer**

Building real-world software & AI projects.

[GitHub](https://github.com/AbdulRehmanYasir)

</div>

---

<div align="center">

### 🛡 DEVHEALTH

**Inspect. Analyze. Secure. Ship.**

Built with React + TypeScript + Python + FastAPI.

</div>
