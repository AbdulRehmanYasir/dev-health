"""DevHealth Production Readiness Analyzer.
Assesses environmental resilience, error handling guards, structured logging,
containerization/CI workflows, and runtime robustness.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple
from app.config import IGNORED_DIRS
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category, ProductionStatus
from app.utils.files import read_text_safe


def analyze_production_readiness(
    project_dir: Path,
    security_score: int,
    build_score: int,
    testing_score: int,
    critical_issues_count: int,
) -> Tuple[CategoryResult, List[Issue], ProductionStatus]:
    """Calculates production readiness score based on operational robustness checks."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    has_docker = (project_dir / "Dockerfile").is_file() or (project_dir / "docker-compose.yml").is_file() or (project_dir / "docker-compose.yaml").is_file()
    has_ci = (project_dir / ".github" / "workflows").is_dir() or (project_dir / ".gitlab-ci.yml").is_file()
    has_env_example = (project_dir / ".env.example").is_file() or (project_dir / ".env.sample").is_file() or (project_dir / ".env.template").is_file()

    error_handling_count = 0
    structured_logging_count = 0

    # Scan code for error handling and logging
    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]

        for filename in files:
            file_path = Path(root) / filename
            ext = file_path.suffix.lower()
            if ext in (".py", ".js", ".ts", ".jsx", ".tsx"):
                content = read_text_safe(file_path)
                if not content:
                    continue

                # Error handling
                if "try:" in content or "try {" in content or "catch (" in content or "except " in content:
                    error_handling_count += 1

                # Structured logging
                if any(k in content for k in ("logger.", "logging.getLogger", "winston", "pino", "console.error")):
                    structured_logging_count += 1

    # 1. Critical Security Blocker
    if critical_issues_count > 0:
        score -= min(50, critical_issues_count * 25)
        checks.append(CheckItem(
            label=f"{critical_issues_count} Critical Security issue(s) block production deployment",
            passed=False,
            is_warning=False,
            details="Resolve critical secrets or injection vulnerabilities before deploying."
        ))
        recommendations.append("Production release must be blocked until all critical security vulnerabilities are remediated.")

    # 2. Containerization / Docker
    if has_docker:
        checks.append(CheckItem(label="Container specification (Dockerfile / Compose) detected", passed=True))
    else:
        score -= 10
        checks.append(CheckItem(
            label="No Dockerfile or container specification found",
            passed=False,
            is_warning=True,
            details="Containerizing standardizes deployment across environments."
        ))
        recommendations.append("Provide a multi-stage Dockerfile for isolated, immutable container releases.")

    # 3. CI/CD Workflows
    if has_ci:
        checks.append(CheckItem(label="Automated CI/CD pipeline configuration detected", passed=True))
    else:
        score -= 10
        checks.append(CheckItem(
            label="No automated CI/CD pipeline found (.github/workflows)",
            passed=False,
            is_warning=True,
            details="Automating lint, test, and build checks protects production."
        ))
        recommendations.append("Set up GitHub Actions or automated CI for testing pull requests.")

    # 4. Environment Template (.env.example)
    if has_env_example:
        checks.append(CheckItem(label="Sanitized .env.example configuration template provided", passed=True))
    else:
        score -= 10
        checks.append(CheckItem(
            label="Missing .env.example environment template",
            passed=False,
            is_warning=True,
            details="Prevents accidental runtime misconfiguration."
        ))
        recommendations.append("Commit a sanitized .env.example documenting all required variables.")
        issues.append(Issue(
            id="PROD-001",
            title="Missing .env.example Template",
            severity=Severity.LOW,
            category=Category.PRODUCTION,
            file=".env.example",
            description="Project has no .env.example template documenting runtime variables.",
            why_it_matters="Without a clear environment specification, production servers may fail startup due to missing required keys.",
            recommended_fix="Create a .env.example file listing all expected environment variables with dummy values."
        ))

    # 5. Error Handling Resilience
    if error_handling_count > 0:
        checks.append(CheckItem(
            label=f"Active exception handling detected across {error_handling_count} module(s)",
            passed=True
        ))
    else:
        score -= 15
        checks.append(CheckItem(
            label="Minimal error handling guards found",
            passed=False,
            is_warning=True,
            details="Unhandled exceptions cause ungraceful crashes in production."
        ))
        recommendations.append("Wrap external API calls and database connections with structured try/catch or try/except blocks.")

    # 6. Logging Architecture
    if structured_logging_count > 0:
        checks.append(CheckItem(
            label=f"Logging statements identified in {structured_logging_count} file(s)",
            passed=True
        ))
    else:
        score -= 10
        checks.append(CheckItem(
            label="No structured application logging found",
            passed=False,
            is_warning=True,
            details="Use logging libraries instead of raw print statements."
        ))
        recommendations.append("Integrate structured logging (JSON or formatted logger) for observability.")

    final_score = max(5, min(100, score))

    # Determine status
    if critical_issues_count > 0 or final_score < 50:
        prod_status = ProductionStatus.NOT_READY
    elif final_score < 72:
        prod_status = ProductionStatus.NEEDS_WORK
    elif final_score < 88:
        prod_status = ProductionStatus.READY_WITH_IMPROVEMENTS
    else:
        prod_status = ProductionStatus.PRODUCTION_READY

    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "has_docker": has_docker,
            "has_ci": has_ci,
            "has_env_example": has_env_example,
            "error_handling_modules": error_handling_count,
            "logging_modules": structured_logging_count,
        }
    ), issues, prod_status
