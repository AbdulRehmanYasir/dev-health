import React, { useState } from "react";
import { X, Copy, Check, Terminal, ExternalLink } from "lucide-react";

interface PythonSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SourceFile {
  desc: string;
  code: string;
  github?: string;
}

export const PythonSourceModal: React.FC<PythonSourceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeFile, setActiveFile] = useState<string>("main.py");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const files: Record<string, SourceFile> = {
    "main.py": {
      desc: "FastAPI application entrypoint, middleware, routers, static files, and startup database initialization.",
      github:
        "https://github.com/AbdulRehmanYasir/dev-health/blob/main/main.py",
      code: `"""DevHealth Main Application Entry Point.
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
`,
    },

    "app/analyzers/security.py": {
      desc: "Static security scanner for hardcoded secrets, dangerous execution patterns, SQL injection risks, CORS issues, and unsafe JavaScript patterns.",
      github:
        "https://github.com/AbdulRehmanYasir/dev-health/blob/main/app/analyzers/security.py",
      code: `"""DevHealth Security Analyzer.
Static security scanner identifying hardcoded secrets, dangerous execution patterns,
SQL string injection risks, and misconfigurations.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple
from app.config import IGNORED_DIRS, IGNORED_EXTENSIONS
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe
from app.utils.security import SECRET_PATTERNS, mask_secret


DANGEROUS_PATTERNS = [
    (
        "Python Subprocess Shell=True",
        r"""subprocess\\.(?:Popen|call|run|check_output)\\s*\\([^)]*shell\\s*=\\s*True""",
        Severity.CRITICAL,
        "Command Injection Risk",
        "Executing subprocess with \`shell=True\` allows shell injection vulnerabilities if input is untrusted.",
        "Pass arguments as a list and remove \`shell=True\`."
    ),
    (
        "Python os.system Call",
        r"""\\bos\\.system\\s*\\(""",
        Severity.HIGH,
        "Shell Execution",
        "\`os.system()\` runs commands directly in the shell without sanitization, risking injection.",
        "Use \`subprocess.run(['command', 'arg'], check=True)\` instead of \`os.system()\`."
    ),
    (
        "Unsafe Eval / Exec Call",
        r"""\\b(?:eval|exec)\\s*\\([^)]+\\)""",
        Severity.CRITICAL,
        "Arbitrary Code Execution",
        "Dynamic evaluation of code via \`eval\` or \`exec\` can lead to remote code execution.",
        "Avoid dynamic evaluation; use standard data parsing libraries (e.g., json.loads or ast.literal_eval)."
    ),
    (
        "SQL String Concatenation",
        r"""(?i)(?:SELECT|INSERT|UPDATE|DELETE)\\s+.*?\\s+(?:WHERE|FROM|SET|INTO)\\b.*?[\"']\\s*\\+\\s*[a-zA-Z0-9_]+|\\bf[\"'][^\"']*(?:SELECT|INSERT|UPDATE|DELETE)\\s+[^\"']*\\{[a-zA-Z0-9_]+""",
        Severity.CRITICAL,
        "SQL Injection Vulnerability",
        "Constructing SQL queries via string concatenation or formatted f-strings bypasses query parameterization.",
        "Use parameterized SQL queries (e.g., cursor.execute('SELECT ... WHERE id = ?', (id,))) or an ORM."
    ),
    (
        "Unsafe PyYAML Load",
        r"""yaml\\.load\\s*\\([^)]*(?:Loader\\s*=\\s*yaml\\.(?:Loader|UnsafeLoader))?""",
        Severity.HIGH,
        "Insecure Deserialization",
        "Calling \`yaml.load()\` without \`SafeLoader\` can allow arbitrary Python object deserialization.",
        "Use \`yaml.safe_load(data)\` instead."
    ),
    (
        "Debug Mode Enabled in Source",
        r"""(?i)\\b(?:DEBUG\\s*=\\s*True|debug\\s*=\\s*true|app\\.run\\([^)]*debug\\s*=\\s*True)""",
        Severity.MEDIUM,
        "Debug Mode In Production",
        "Running with debug mode enabled reveals internal stack traces, interactive debuggers, and environment details.",
        "Disable debug mode or read it strictly from a secure environment variable (DEBUG=False in production)."
    ),
    (
        "Overly Permissive Wildcard CORS",
        r"""(?i)(?:allow_origins\\s*=\\s*\\[\\s*[\"']\\*[\"']\\s*\\]|cors\\(\\s*\\{?\\s*origin:\\s*[\"']\\*[\"']|Access-Control-Allow-Origin:\\s*\\*)""",
        Severity.MEDIUM,
        "Insecure CORS Configuration",
        "Configuring CORS with wildcard '*' allows any unauthorized origin to read resources if credentials or cookies are used.",
        "Explicitly specify allowed trusted domain origins."
    ),
    (
        "Dangerous JavaScript innerHTML Assignment",
        r"""\\.innerHTML\\s*=\\s*(?![\"'`][^\"'`]*[\"'`]\\s*;)[a-zA-Z0-9_.]+""",
        Severity.HIGH,
        "Cross-Site Scripting (XSS)",
        "Directly assigning variables or external content to \`innerHTML\` introduces DOM-based XSS vulnerabilities.",
        "Use \`textContent\` or sanitize inputs with DOMPurify."
    ),
    (
        "Dangerous JavaScript eval()",
        r"""\\beval\\s*\\([a-zA-Z0-9_.]+""",
        Severity.CRITICAL,
        "JavaScript Arbitrary Execution",
        "Calling \`eval()\` on variables executes arbitrary scripts with the application's privileges.",
        "Refactor to avoid \`eval()\`; use JSON.parse for JSON strings."
    ),
]


def analyze_security(project_dir: Path) -> Tuple[CategoryResult, List[Issue]]:
    """Scan project files for secrets, tokens, credentials, and vulnerable coding patterns."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    issue_id_counter = 1
    total_files_scanned = 0
    secrets_found = 0
    critical_pattern_found = False

    # Check for committed .env files
    env_files = list(project_dir.glob("**/.env*"))
    valid_env_files = [
        f
        for f in env_files
        if not f.name.endswith(".example")
        and not f.name.endswith(".sample")
        and not f.name.endswith(".template")
        and not any(p in IGNORED_DIRS for p in f.parts)
    ]

    if valid_env_files:
        score -= 25
        rel_path = os.path.relpath(valid_env_files[0], project_dir)
        checks.append(CheckItem(
            label="Committed .env file detected",
            passed=False,
            is_warning=False,
            details=f"Found: {rel_path}"
        ))
        issues.append(Issue(
            id=f"SEC-{issue_id_counter:03d}",
            title="Committed Environment (.env) File",
            severity=Severity.CRITICAL,
            category=Category.SECURITY,
            file=rel_path,
            line=1,
            description=f"Raw environment configuration file '{rel_path}' is committed to repository.",
            why_it_matters="Committed .env files often contain production database credentials, private API tokens, and session secrets.",
            recommended_fix="Add .env to .gitignore and provide only a sanitized .env.example."
        ))
        issue_id_counter += 1
    else:
        checks.append(CheckItem(label="No committed unmasked .env files", passed=True))

    # Scan code files
    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [
            d for d in dirs
            if d not in IGNORED_DIRS and not d.startswith(".")
        ]

        for filename in files:
            file_path = Path(root) / filename
            ext = file_path.suffix.lower()

            if (
                ext in IGNORED_EXTENSIONS
                or filename.endswith(".min.js")
                or filename.endswith(".min.css")
            ):
                continue

            rel_file_path = os.path.relpath(file_path, project_dir)
            content = read_text_safe(file_path)

            if not content:
                continue

            total_files_scanned += 1
            lines = content.splitlines()

            # 1. Scan for hardcoded secrets
            for pattern_name, regex, severity_str, desc in SECRET_PATTERNS:
                for line_num, line in enumerate(lines, start=1):
                    trimmed = line.strip()

                    if trimmed.startswith(("#", "//", "/*", "*")):
                        if (
                            "example" in trimmed.lower()
                            or "mock" in trimmed.lower()
                            or "my_api_key" in trimmed.lower()
                        ):
                            continue

                    matches = re.findall(regex, line)

                    for match in matches:
                        match_str = match if isinstance(match, str) else match[0]

                        if (
                            "EXAMPLE" in match_str
                            or "placeholder" in match_str.lower()
                            or "your_" in match_str.lower()
                        ):
                            continue

                        secrets_found += 1
                        masked = mask_secret(match_str)
                        safe_snippet = line.replace(match_str, masked).strip()

                        sev = Severity[severity_str]

                        if sev == Severity.CRITICAL:
                            score -= 20
                            critical_pattern_found = True
                        else:
                            score -= 10

                        issues.append(Issue(
                            id=f"SEC-{issue_id_counter:03d}",
                            title=f"Hardcoded {pattern_name}",
                            severity=sev,
                            category=Category.SECURITY,
                            file=rel_file_path,
                            line=line_num,
                            code_snippet=safe_snippet,
                            description=f"Found potential hardcoded secret: {masked}",
                            why_it_matters="Hardcoded secrets committed to source repositories can be scraped and exploited by attackers to gain unauthorized access.",
                            recommended_fix="Move the secret to an external environment variable and retrieve it via process.env or os.getenv()."
                        ))

                        issue_id_counter += 1
                        break

            # 2. Scan for dangerous code execution patterns
            for pattern_name, regex, sev, vuln_type, why, fix in DANGEROUS_PATTERNS:
                for line_num, line in enumerate(lines, start=1):
                    trimmed = line.strip()

                    if trimmed.startswith(("#", "//", "/*")):
                        continue

                    if re.search(regex, line):
                        if sev == Severity.CRITICAL:
                            score -= 15
                            critical_pattern_found = True
                        elif sev == Severity.HIGH:
                            score -= 10
                        else:
                            score -= 5

                        safe_snippet = trimmed[:100]

                        issues.append(Issue(
                            id=f"SEC-{issue_id_counter:03d}",
                            title=pattern_name,
                            severity=sev,
                            category=Category.SECURITY,
                            file=rel_file_path,
                            line=line_num,
                            code_snippet=safe_snippet,
                            description=f"Potentially unsafe coding pattern detected: {vuln_type}",
                            why_it_matters=why,
                            recommended_fix=fix
                        ))

                        issue_id_counter += 1
                        break

    if secrets_found == 0:
        checks.append(
            CheckItem(
                label="No hardcoded API keys or private tokens found",
                passed=True
            )
        )
    else:
        checks.append(CheckItem(
            label=f"{secrets_found} potential hardcoded secret(s) found",
            passed=False,
            is_warning=False,
            details="Immediate remediation required. Secrets must be revoked and rotated."
        ))
        recommendations.append(
            "Immediately revoke and rotate all discovered credentials."
        )

    if not critical_pattern_found:
        checks.append(
            CheckItem(
                label="No high-risk shell injection or eval patterns detected",
                passed=True
            )
        )
    else:
        checks.append(CheckItem(
            label="Dangerous execution patterns flagged",
            passed=False,
            is_warning=False,
            details="Review identified code points for command injection or arbitrary execution."
        ))
        recommendations.append(
            "Replace dynamic command strings and eval calls with parameterized APIs."
        )

    checks.append(
        CheckItem(
            label="Security database inspection: Local/static analysis only",
            passed=True
        )
    )

    final_score = max(5, min(100, score))

    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "files_scanned": total_files_scanned,
            "secrets_detected": secrets_found,
            "security_database": "Local/static analysis only",
        }
    ), issues
`,
    },

    "app/analyzers/build.py": {
      desc: "Evaluates package manifests, build scripts, dependency pinning, and lockfile presence.",
      github:
        "https://github.com/AbdulRehmanYasir/dev-health/blob/main/app/analyzers/build.py",
      code: `"""DevHealth Build Health Analyzer.
Evaluates build scripts, package manifests, lock files, and production startup configurations.
"""

import json
from pathlib import Path
from typing import List, Tuple
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe


def analyze_build_health(project_dir: Path, project_type: str) -> Tuple[CategoryResult, List[Issue]]:
    """Inspects manifests and configurations to score build health and identify build risks."""
    score = 100
    checks: List[CheckItem] = []
    recommendations: List[str] = []
    findings: List[str] = []
    issues: List[Issue] = []

    package_json_path = project_dir / "package.json"
    requirements_path = project_dir / "requirements.txt"
    pyproject_path = project_dir / "pyproject.toml"

    has_js_manifest = package_json_path.is_file()
    has_py_manifest = requirements_path.is_file() or pyproject_path.is_file()

    # 1. Manifest Presence
    if has_js_manifest or has_py_manifest:
        checks.append(CheckItem(
            label="Package configuration detected",
            passed=True,
            details="Found package.json or requirements.txt/pyproject.toml."
        ))
    else:
        score -= 30
        checks.append(CheckItem(
            label="No standard package configuration found",
            passed=False,
            details="Missing package.json, requirements.txt, or pyproject.toml."
        ))
        recommendations.append(
            "Add a formal dependency manifest (package.json or requirements.txt)."
        )
        issues.append(Issue(
            id="BUILD-001",
            title="Missing Package Manifest",
            severity=Severity.HIGH,
            category=Category.BUILD,
            file="root",
            description="Project lacks package.json, requirements.txt, or pyproject.toml.",
            why_it_matters="Without a manifest, automated CI/CD and deployment environments cannot build or run the project.",
            recommended_fix="Initialize a package.json (npm init) or requirements.txt (pip freeze)."
        ))

    # 2. JavaScript / Node Build Health
    if has_js_manifest:
        content = read_text_safe(package_json_path)

        try:
            pkg = json.loads(content)
            checks.append(CheckItem(label="package.json is valid JSON", passed=True))

            scripts = pkg.get("scripts", {})
            has_build = "build" in scripts
            has_start = "start" in scripts or "dev" in scripts or "preview" in scripts

            if has_build:
                checks.append(CheckItem(
                    label="Build script detected",
                    passed=True,
                    details=f"npm run build: {scripts['build']}"
                ))
            elif any(
                k in project_type.lower()
                for k in ("react", "vite", "next", "vue", "typescript")
            ):
                score -= 15
                checks.append(CheckItem(
                    label="Missing 'build' script",
                    passed=False,
                    is_warning=True,
                    details="Frontend/compiled project lacks a 'build' script."
                ))
                recommendations.append(
                    "Define a 'build' script in package.json for production bundling."
                )
                issues.append(Issue(
                    id="BUILD-002",
                    title="Missing Build Script in package.json",
                    severity=Severity.MEDIUM,
                    category=Category.BUILD,
                    file="package.json",
                    description="The project has no 'build' script defined in package.json scripts.",
                    why_it_matters="Production deployments rely on 'npm run build' to bundle assets and compile TypeScript/JSX.",
                    recommended_fix="Add 'build': 'vite build' or 'next build' to your package.json scripts."
                ))

            if has_start:
                checks.append(
                    CheckItem(
                        label="Production or start script detected",
                        passed=True
                    )
                )
            else:
                score -= 10
                checks.append(
                    CheckItem(
                        label="No start or dev script defined",
                        passed=False,
                        is_warning=True
                    )
                )
                recommendations.append(
                    "Add a 'start' or 'dev' script in package.json."
                )

            deps = {
                **pkg.get("dependencies", {}),
                **pkg.get("devDependencies", {})
            }

            unpinned = [
                k for k, v in deps.items()
                if v in ("*", "latest", "")
            ]

            if unpinned:
                score -= 10
                checks.append(CheckItem(
                    label="Unpinned dependencies found",
                    passed=False,
                    is_warning=True,
                    details=f"Unpinned packages: {', '.join(unpinned[:3])}"
                ))
                recommendations.append(
                    "Pin specific dependency versions instead of '*' or 'latest'."
                )

        except json.JSONDecodeError as err:
            score -= 40
            checks.append(CheckItem(
                label="package.json has syntax errors",
                passed=False,
                details=str(err)
            ))
            issues.append(Issue(
                id="BUILD-003",
                title="Malformed package.json",
                severity=Severity.CRITICAL,
                category=Category.BUILD,
                file="package.json",
                description=f"Syntax error in package.json: {str(err)}",
                why_it_matters="A malformed JSON manifest completely blocks package installation and build commands.",
                recommended_fix="Validate JSON syntax and fix commas or trailing quotes."
            ))

    # 3. Python Manifest Health
    if has_py_manifest:
        req_content = (
            read_text_safe(requirements_path)
            if requirements_path.is_file()
            else read_text_safe(pyproject_path)
        )

        lines = [
            line.strip()
            for line in req_content.splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]

        unpinned_py = [
            line
            for line in lines
            if not any(op in line for op in ("==", ">=", "<=", "~="))
        ]

        if unpinned_py and len(unpinned_py) > len(lines) // 2:
            score -= 10
            checks.append(CheckItem(
                label="Unpinned Python dependency versions",
                passed=False,
                is_warning=True,
                details=f"{len(unpinned_py)} packages without version constraints."
            ))
            recommendations.append(
                "Pin explicit version numbers in requirements.txt to prevent breaking upgrades."
            )

    # 4. Lockfile Check
    lockfiles = [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "poetry.lock",
        "Pipfile.lock"
    ]

    found_lockfile = any(
        (project_dir / lf).is_file()
        for lf in lockfiles
    )

    if found_lockfile:
        checks.append(
            CheckItem(
                label="Deterministic dependency lockfile found",
                passed=True
            )
        )
    else:
        score -= 15
        checks.append(CheckItem(
            label="Missing lockfile",
            passed=False,
            is_warning=True,
            details="No package-lock.json, yarn.lock, or poetry.lock found."
        ))
        recommendations.append(
            "Commit your dependency lockfile to guarantee reproducible builds."
        )

    final_score = max(10, min(100, score))

    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "has_manifest": has_js_manifest or has_py_manifest,
            "has_lockfile": found_lockfile
        }
    ), issues
`,
    },

    "app/analyzers/testing.py": {
      desc: "Detects testing frameworks, test files, source-to-test ratio, E2E coverage, and coverage artifacts.",
      github:
        "https://github.com/AbdulRehmanYasir/dev-health/blob/main/app/analyzers/testing.py",
      code: `"""DevHealth Testing Analyzer.
Detects test suites, frameworks (pytest, Jest, Vitest, Cypress, Playwright, etc.),
calculates source-to-test ratios, and generates actionable testing recommendations.
"""

import os
import re
from pathlib import Path
from typing import List, Set, Tuple
from app.config import IGNORED_DIRS
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe


TEST_FRAMEWORKS = [
    ("pytest", [r"\\bimport pytest\\b", r"\\bfrom pytest\\b", "pytest.ini", "pyproject.toml:pytest"]),
    ("unittest", [r"\\bimport unittest\\b", r"class .*\\(unittest\\.TestCase\\):"]),
    ("Jest", [r"\\bjest\\b", "jest.config.js", "jest.config.ts"]),
    ("Vitest", [r"\\bvitest\\b", "vitest.config.ts", "vitest.config.js"]),
    ("Mocha", [r"\\bmocha\\b", ".mocharc.json"]),
    ("Cypress", [r"\\bcypress\\b", "cypress.config.js", "cypress.config.ts"]),
    ("Playwright", [r"@playwright/test", "playwright.config.ts", "playwright.config.js"]),
]


def analyze_testing(project_dir: Path, source_files_count: int) -> Tuple[CategoryResult, List[Issue]]:
    """Evaluates testing presence, detected frameworks, test counts, and source-to-test ratio."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    detected_frameworks: Set[str] = set()
    test_files_list: List[str] = []
    has_e2e_tests = False
    has_unit_tests = False

    has_coverage_file = any(
        (project_dir / f).exists()
        for f in (
            ".coverage",
            "coverage.xml",
            "lcov.info",
            "coverage/lcov.info"
        )
    )

    pkg_json = project_dir / "package.json"

    if pkg_json.is_file():
        content = read_text_safe(pkg_json).lower()

        if "jest" in content:
            detected_frameworks.add("Jest")
        if "vitest" in content:
            detected_frameworks.add("Vitest")
        if "mocha" in content:
            detected_frameworks.add("Mocha")
        if "cypress" in content:
            detected_frameworks.add("Cypress")
            has_e2e_tests = True
        if "playwright" in content:
            detected_frameworks.add("Playwright")
            has_e2e_tests = True

    req_txt = project_dir / "requirements.txt"

    if req_txt.is_file():
        content = read_text_safe(req_txt).lower()

        if "pytest" in content:
            detected_frameworks.add("pytest")
        if "playwright" in content:
            detected_frameworks.add("Playwright")
            has_e2e_tests = True

    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [
            d for d in dirs
            if d not in IGNORED_DIRS and not d.startswith(".")
        ]

        rel_root = os.path.relpath(root, project_dir).lower()

        is_e2e_dir = (
            "e2e" in rel_root
            or "cypress" in rel_root
            or "playwright" in rel_root
        )

        is_test_dir = (
            is_e2e_dir
            or any(
                k in rel_root
                for k in ("test", "tests", "__tests__", "spec")
            )
        )

        for f in files:
            lower_name = f.lower()

            is_test_file = (
                is_test_dir
                or lower_name.startswith("test_")
                or lower_name.endswith("_test.py")
                or ".test." in lower_name
                or ".spec." in lower_name
            )

            if is_test_file:
                test_files_list.append(
                    os.path.join(rel_root, f)
                )

                if (
                    is_e2e_dir
                    or "e2e" in lower_name
                    or "cypress" in lower_name
                ):
                    has_e2e_tests = True
                else:
                    has_unit_tests = True

                file_path = Path(root) / f
                file_head = read_text_safe(
                    file_path,
                    max_bytes=4096
                )

                if "pytest" in file_head:
                    detected_frameworks.add("pytest")

                if "unittest" in file_head:
                    detected_frameworks.add("unittest")

                if (
                    "describe(" in file_head
                    or "it(" in file_head
                    or "test(" in file_head
                ):
                    if not detected_frameworks:
                        detected_frameworks.add("Jest / Vitest")

    test_count = len(test_files_list)

    if detected_frameworks:
        framework_names = ", ".join(
            sorted(detected_frameworks)
        )

        checks.append(CheckItem(
            label="Test framework detected",
            passed=True,
            details=f"Identified: {framework_names}"
        ))
    else:
        score -= 30

        checks.append(CheckItem(
            label="No standard test framework detected",
            passed=False,
            is_warning=True,
            details="Could not find pytest, Jest, Vitest, Mocha, etc."
        ))

        recommendations.append(
            "Configure a testing framework (e.g., pytest or Jest/Vitest) in your build pipeline."
        )

    if test_count > 0:
        checks.append(CheckItem(
            label=f"{test_count} test file(s) found",
            passed=True
        ))
    else:
        score -= 40

        checks.append(CheckItem(
            label="No test files found",
            passed=False,
            is_warning=False,
            details="Zero unit or integration test files located."
        ))

        recommendations.append(
            "Add unit tests for core domain logic and route handlers."
        )

        issues.append(Issue(
            id="TEST-001",
            title="Zero Test Coverage Detected",
            severity=Severity.HIGH,
            category=Category.TESTING,
            file="tests/",
            description="The repository contains zero test files or test directories.",
            why_it_matters="Unverified code has a significantly higher chance of regressions, runtime exceptions, and silent logic defects.",
            recommended_fix="Create a tests directory and write unit tests for key utility functions and API endpoints."
        ))

    if source_files_count > 0:
        ratio_pct = int(
            round((test_count / source_files_count) * 100)
        )

        if test_count > 0 and ratio_pct < 35:
            score -= 15

            checks.append(CheckItem(
                label=f"Low source-to-test ratio ({ratio_pct}%)",
                passed=False,
                is_warning=True,
                details=f"{test_count} test file(s) for {source_files_count} source modules."
            ))

            recommendations.append(
                f"Only ~{ratio_pct}% of source modules have corresponding tests. Increase test coverage for critical paths."
            )

        elif test_count > 0:
            checks.append(CheckItem(
                label=f"Healthy source-to-test ratio ({ratio_pct}%)",
                passed=True,
                details=f"{test_count} test files for {source_files_count} source files."
            ))

    if has_e2e_tests:
        checks.append(
            CheckItem(
                label="End-to-end (E2E) or integration tests detected",
                passed=True
            )
        )
    elif test_count > 0:
        score -= 10

        checks.append(CheckItem(
            label="No end-to-end tests detected",
            passed=False,
            is_warning=True,
            details="Consider adding Playwright or Cypress tests for user flows."
        ))

        recommendations.append(
            "Add end-to-end tests (e.g. Playwright) for critical user journeys."
        )

    if has_coverage_file:
        checks.append(
            CheckItem(
                label="Automated test coverage report found in project",
                passed=True
            )
        )
    else:
        checks.append(CheckItem(
            label="No static coverage artifact found",
            passed=False,
            is_warning=True,
            details="Generate and track coverage artifacts (e.g. lcov or coverage.xml) in CI."
        ))

    final_score = max(5, min(100, score))

    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "frameworks": list(detected_frameworks),
            "test_files_count": test_count,
            "source_to_test_ratio_pct": int(
                round(
                    (test_count / max(1, source_files_count)) * 100
                )
            ),
            "has_e2e": has_e2e_tests,
            "has_unit": has_unit_tests or test_count > 0,
        }
    ), issues
`,
    },

    "app/analyzers/dependencies.py": {
      desc: "Audits dependency counts, version bounds, lockfiles, duplicate declarations, and locally known deprecated packages.",
      github:
        "https://github.com/AbdulRehmanYasir/dev-health/blob/main/app/analyzers/dependencies.py",
      code: `"""DevHealth Dependency Analyzer.
Audits dependency counts, dev dependencies, lockfiles, duplicate declarations,
and flags known deprecated packages via local static rules.
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Tuple
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe


DEPRECATED_OR_DISCOURAGED_PACKAGES = {
    # Node
    "request": (
        "Deprecated HTTP client. Use fetch, axios, or got instead.",
        Severity.MEDIUM
    ),
    "querystring": (
        "Deprecated built-in. Use URLSearchParams instead.",
        Severity.LOW
    ),
    "node-sass": (
        "Deprecated libsass wrapper. Use sass (Dart Sass) instead.",
        Severity.MEDIUM
    ),

    # Python
    "pycrypto": (
        "Unmaintained since 2013 with critical security vulnerabilities. Use cryptography or pycryptodome.",
        Severity.HIGH
    ),
    "pep8": (
        "Renamed to pycodestyle. Do not use legacy pep8 package.",
        Severity.LOW
    ),
    "fabric": (
        "Check if fabric 1.x (Python 2 only). Upgrade to Fabric 2+ or Invoke.",
        Severity.LOW
    ),
}


def analyze_dependencies(project_dir: Path) -> Tuple[CategoryResult, List[Issue]]:
    """Analyzes declared dependencies, version pinning, lockfile presence, and known deprecated packages."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    package_json = project_dir / "package.json"
    requirements_txt = project_dir / "requirements.txt"
    pyproject_toml = project_dir / "pyproject.toml"

    direct_deps_count = 0
    dev_deps_count = 0
    duplicate_deps: List[str] = []
    unpinned_deps: List[str] = []
    deprecated_found: List[Tuple[str, str, Severity]] = []

    # 1. Parse Node package.json
    if package_json.is_file():
        try:
            data = json.loads(
                read_text_safe(package_json)
            )

            deps: Dict[str, str] = data.get(
                "dependencies",
                {}
            )

            dev_deps: Dict[str, str] = data.get(
                "devDependencies",
                {}
            )

            direct_deps_count += len(deps)
            dev_deps_count += len(dev_deps)

            overlap = set(deps.keys()).intersection(
                set(dev_deps.keys())
            )

            if overlap:
                duplicate_deps.extend(
                    list(overlap)
                )

                score -= 10

                issues.append(Issue(
                    id="DEP-001",
                    title="Duplicate Dependency Declaration",
                    severity=Severity.LOW,
                    category=Category.DEPENDENCIES,
                    file="package.json",
                    description=f"Packages declared in both dependencies and devDependencies: {', '.join(overlap)}",
                    why_it_matters="Redundant declarations inflate package size and cause ambiguity in production builds.",
                    recommended_fix="Remove duplicated dependencies from either dependencies or devDependencies."
                ))

            for pkg_name, ver in {
                **deps,
                **dev_deps
            }.items():
                if ver in ("*", "latest", ""):
                    unpinned_deps.append(pkg_name)

                if (
                    pkg_name.lower()
                    in DEPRECATED_OR_DISCOURAGED_PACKAGES
                ):
                    reason, sev = DEPRECATED_OR_DISCOURAGED_PACKAGES[
                        pkg_name.lower()
                    ]

                    deprecated_found.append(
                        (pkg_name, reason, sev)
                    )

        except Exception:
            pass

    # 2. Parse Python requirements.txt
    if requirements_txt.is_file():
        lines = [
            l.strip()
            for l in read_text_safe(
                requirements_txt
            ).splitlines()
            if l.strip()
            and not l.strip().startswith("#")
        ]

        direct_deps_count += len(lines)

        seen_py: Set[str] = set()

        for line in lines:
            pkg_name = (
                line.split("==")[0]
                .split(">=")[0]
                .split("<=")[0]
                .split("~=")[0]
                .strip()
            )

            clean_pkg = pkg_name.lower()

            if clean_pkg in seen_py:
                duplicate_deps.append(pkg_name)

            seen_py.add(clean_pkg)

            if (
                "==" not in line
                and ">=" not in line
                and "<=" not in line
                and "~=" not in line
            ):
                unpinned_deps.append(pkg_name)

            if (
                clean_pkg
                in DEPRECATED_OR_DISCOURAGED_PACKAGES
            ):
                reason, sev = DEPRECATED_OR_DISCOURAGED_PACKAGES[
                    clean_pkg
                ]

                deprecated_found.append(
                    (pkg_name, reason, sev)
                )

    lockfiles = [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "poetry.lock",
        "Pipfile.lock"
    ]

    has_lock = any(
        (project_dir / lf).is_file()
        for lf in lockfiles
    )

    if has_lock:
        checks.append(
            CheckItem(
                label="Dependency lockfile is committed",
                passed=True
            )
        )
    else:
        score -= 15

        checks.append(CheckItem(
            label="Missing lockfile",
            passed=False,
            is_warning=True,
            details="No package-lock.json or yarn.lock found."
        ))

        recommendations.append(
            "Commit a lockfile to ensure reproducible dependencies across developer machines and production."
        )

    total_deps = direct_deps_count + dev_deps_count

    if total_deps > 0:
        checks.append(CheckItem(
            label=f"{total_deps} total dependencies ({direct_deps_count} runtime, {dev_deps_count} dev)",
            passed=True
        ))
    else:
        checks.append(CheckItem(
            label="No direct dependencies found",
            passed=True,
            details="Project has zero external third-party dependencies."
        ))

    if unpinned_deps:
        score -= 10

        checks.append(CheckItem(
            label=f"{len(unpinned_deps)} unpinned dependency range(s)",
            passed=False,
            is_warning=True,
            details=f"Examples: {', '.join(unpinned_deps[:4])}"
        ))

        recommendations.append(
            "Use explicit semver constraints instead of unbounded ranges."
        )
    else:
        checks.append(
            CheckItem(
                label="All dependency versions have specified bounds",
                passed=True
            )
        )

    for pkg_name, reason, sev in deprecated_found:
        score -= 10 if sev == Severity.HIGH else 5

        issues.append(Issue(
            id="DEP-002",
            title=f"Deprecated or Unsafe Package: {pkg_name}",
            severity=sev,
            category=Category.DEPENDENCIES,
            file="manifest",
            description=f"Package '{pkg_name}' is deprecated or abandoned: {reason}",
            why_it_matters="Deprecated packages receive no bug fixes or security patches and often contain unpatched vulnerabilities.",
            recommended_fix=reason
        ))

    if deprecated_found:
        checks.append(CheckItem(
            label=f"{len(deprecated_found)} deprecated package(s) detected",
            passed=False,
            is_warning=True,
            details=", ".join(
                p[0] for p in deprecated_found
            )
        ))
    else:
        checks.append(
            CheckItem(
                label="No known deprecated or abandoned packages detected",
                passed=True
            )
        )

    checks.append(CheckItem(
        label="Security database: Local/static analysis only",
        passed=True,
        details="Evaluated against local static heuristic rules without external vulnerability feeds."
    ))

    final_score = max(20, min(100, score))

    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "direct_dependencies": direct_deps_count,
            "dev_dependencies": dev_deps_count,
            "total_dependencies": total_deps,
            "unpinned_count": len(unpinned_deps),
            "lockfile_present": has_lock,
            "security_database": "Local/static analysis only",
        }
    ), issues
`,
    },

    "app/analyzers/performance.py": {
      desc: "Static performance checks for oversized assets, monolithic files, nested loops, and repeated file I/O.",
      github:
        "https://github.com/AbdulRehmanYasir/dev-health/blob/main/app/analyzers/performance.py",
      code: `"""DevHealth Performance Analyzer.
Static performance checks detecting oversized bundles, unoptimized assets,
monolithic source files, and inefficient nested loops.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple
from app.config import IGNORED_DIRS
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe


def analyze_performance(project_dir: Path) -> Tuple[CategoryResult, List[Issue]]:
    """Heuristic static performance checks on asset sizes, file complexity, and loops."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    large_js_files: List[str] = []
    large_css_files: List[str] = []
    large_images: List[str] = []
    monolithic_files: List[str] = []
    nested_loop_locations: List[Tuple[str, int]] = []
    repeated_io_in_loops: List[Tuple[str, int]] = []

    image_extensions = {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".bmp"
    }

    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [
            d for d in dirs
            if d not in IGNORED_DIRS
            and not d.startswith(".")
        ]

        for filename in files:
            file_path = Path(root) / filename
            rel_file_path = os.path.relpath(
                file_path,
                project_dir
            )
            ext = file_path.suffix.lower()

            try:
                size_bytes = file_path.stat().st_size
            except Exception:
                size_bytes = 0

            if ext in image_extensions:
                if size_bytes > 800 * 1024:
                    large_images.append(
                        f"{rel_file_path} ({round(size_bytes / 1024)} KB)"
                    )

            if (
                ext in (".js", ".ts", ".jsx", ".tsx")
                and not filename.endswith(".min.js")
            ):
                if size_bytes > 250 * 1024:
                    large_js_files.append(
                        f"{rel_file_path} ({round(size_bytes / 1024)} KB)"
                    )

            elif (
                ext in (".css", ".scss")
                and not filename.endswith(".min.css")
            ):
                if size_bytes > 120 * 1024:
                    large_css_files.append(
                        f"{rel_file_path} ({round(size_bytes / 1024)} KB)"
                    )

            if ext in (
                ".py",
                ".js",
                ".ts",
                ".jsx",
                ".tsx"
            ):
                content = read_text_safe(file_path)

                if not content:
                    continue

                lines = content.splitlines()

                if len(lines) > 800:
                    monolithic_files.append(
                        f"{rel_file_path} ({len(lines)} lines)"
                    )

                if ext == ".py":
                    for i in range(len(lines) - 2):
                        l1 = lines[i]
                        l2 = lines[i + 1]

                        if (
                            re.match(
                                r"^\\s*for\\s+.*\\s+in\\s+.*:\\s*$",
                                l1
                            )
                            and re.match(
                                r"^\\s{4,}for\\s+.*\\s+in\\s+.*:\\s*$",
                                l2
                            )
                        ):
                            nested_loop_locations.append(
                                (rel_file_path, i + 1)
                            )
                            break

                        if "for " in l1 and "open(" in l2:
                            repeated_io_in_loops.append(
                                (rel_file_path, i + 2)
                            )
                            break

    if large_js_files:
        score -= 15

        checks.append(CheckItem(
            label=f"{len(large_js_files)} oversized script file(s) (>250KB)",
            passed=False,
            is_warning=True,
            details=f"Oversized: {', '.join(large_js_files[:2])}"
        ))

        recommendations.append(
            "Apply dynamic code-splitting (import()) to reduce primary bundle sizes."
        )

        issues.append(Issue(
            id="PERF-001",
            title="Oversized Source Scripts Detected",
            severity=Severity.MEDIUM,
            category=Category.PERFORMANCE,
            file=large_js_files[0].split()[0],
            description=f"Large script file found: {large_js_files[0]}",
            why_it_matters="Large unminified or monolithic scripts delay First Contentful Paint (FCP) and increase client CPU load.",
            recommended_fix="Split complex components into lazy-loaded modules and optimize third-party imports."
        ))
    else:
        checks.append(
            CheckItem(
                label="No excessively large client-side script bundles",
                passed=True
            )
        )

    if large_images:
        score -= 10

        checks.append(CheckItem(
            label=f"{len(large_images)} uncompressed image(s) (>800KB)",
            passed=False,
            is_warning=True,
            details=f"Large assets: {', '.join(large_images[:2])}"
        ))

        recommendations.append(
            "Compress heavy static assets using WebP/AVIF formats or image CDNs."
        )
    else:
        checks.append(
            CheckItem(
                label="Image asset sizes are within acceptable limits",
                passed=True
            )
        )

    if monolithic_files:
        score -= 10

        checks.append(CheckItem(
            label=f"{len(monolithic_files)} monolithic file(s) (>800 lines)",
            passed=False,
            is_warning=True,
            details=f"Monoliths: {', '.join(monolithic_files[:2])}"
        ))

        recommendations.append(
            "Break large modules exceeding 800 lines into focused, cohesive submodules."
        )
    else:
        checks.append(
            CheckItem(
                label="No monolithic single-file bottlenecks (>800 lines)",
                passed=True
            )
        )

    if repeated_io_in_loops:
        score -= 15

        file_name, line_num = repeated_io_in_loops[0]

        checks.append(CheckItem(
            label="Repeated file I/O operations inside loop",
            passed=False,
            is_warning=True,
            details=f"Detected at {file_name}:{line_num}"
        ))

        recommendations.append(
            "Buffer file reads outside of tight iterations to prevent filesystem bottlenecks."
        )

        issues.append(Issue(
            id="PERF-002",
            title="File I/O Inside Iteration Loop",
            severity=Severity.MEDIUM,
            category=Category.PERFORMANCE,
            file=file_name,
            line=line_num,
            description="Repeatedly calling open() or read inside a loop incurs significant disk I/O latency.",
            why_it_matters="Disk operations are thousands of times slower than memory operations; repeating them in loops severely degrades throughput.",
            recommended_fix="Read file contents into memory before the loop, or batch write operations."
        ))

    elif nested_loop_locations:
        checks.append(CheckItem(
            label="Nested quadratic loops detected (O(n²))",
            passed=False,
            is_warning=True,
            details=f"Found in {nested_loop_locations[0][0]}:{nested_loop_locations[0][1]}"
        ))

        recommendations.append(
            "Consider replacing nested loops with hash map / dictionary lookups for O(1) complexity."
        )

    else:
        checks.append(
            CheckItem(
                label="No obvious nested loop or I/O performance anti-patterns",
                passed=True
            )
        )

    final_score = max(20, min(100, score))

    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "large_scripts_count": len(large_js_files),
            "large_images_count": len(large_images),
            "monolithic_files_count": len(monolithic_files),
            "loop_warnings_count": (
                len(nested_loop_locations)
                + len(repeated_io_in_loops)
            ),
        }
    ), issues
`,
    },

    "requirements.txt": {
      desc: "Backend dependencies used by DevHealth. The project uses FastAPI, Uvicorn, Pydantic, Jinja2, HTTPX, and pytest.",
      github:
        "https://github.com/AbdulRehmanYasir/dev-health/blob/main/requirements.txt",
      code: `fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
jinja2>=3.1.3
aiofiles>=23.2.1
httpx>=0.27.0
pytest>=8.0.0
`,
    },

    "How to Run": {
      desc: "Run the DevHealth backend locally with Python 3.11+, FastAPI, and Uvicorn.",
      code: `# 1. Clone repository
git clone https://github.com/AbdulRehmanYasir/dev-health.git
cd dev-health

# 2. Create a virtual environment
python -m venv .venv

# Windows
.venv\\Scripts\\activate

# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start DevHealth
python main.py

# 5. Open in browser
http://127.0.0.1:8000

# OpenAPI documentation
http://127.0.0.1:8000/docs
`,
    },
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(files[activeFile].code);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  const currentFile = files[activeFile];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-5xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Terminal className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                Python 3.11 + FastAPI Architecture
              </h3>

              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                DevHealth backend source
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close source viewer"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          {Object.keys(files).map((fileName) => (
            <button
              key={fileName}
              onClick={() => {
                setActiveFile(fileName);
                setCopied(false);
              }}
              className={`shrink-0 px-3 py-2 rounded-t text-xs font-mono font-medium transition-colors ${
                activeFile === fileName
                  ? "bg-slate-900 text-cyan-400 border-t border-x border-slate-800"
                  : "text-slate-500 hover:text-slate-200"
              }`}
            >
              {fileName}
            </button>
          ))}
        </div>

        {/* File information */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            {currentFile.desc}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {currentFile.github && (
              <a
                href={currentFile.github}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                GitHub
              </a>
            )}

            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Source */}
        <div className="flex-1 overflow-auto bg-slate-950">
          <pre className="p-4 text-xs leading-relaxed font-mono text-slate-200 overflow-x-auto">
            <code>{currentFile.code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-slate-800 bg-slate-950/70">
          <span className="text-[10px] font-mono text-slate-600">
            {activeFile}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};