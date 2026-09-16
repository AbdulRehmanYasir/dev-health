"""DevHealth Build Health Analyzer.
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
        recommendations.append("Add a formal dependency manifest (package.json or requirements.txt).")
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
            has_test = "test" in scripts

            if has_build:
                checks.append(CheckItem(label="Build script detected", passed=True, details=f"npm run build: {scripts['build']}"))
            elif any(k in project_type.lower() for k in ("react", "vite", "next", "vue", "typescript")):
                score -= 15
                checks.append(CheckItem(label="Missing 'build' script", passed=False, is_warning=True, details="Frontend/compiled project lacks a 'build' script."))
                recommendations.append("Define a 'build' script in package.json for production bundling.")
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
                checks.append(CheckItem(label="Production or start script detected", passed=True))
            else:
                score -= 10
                checks.append(CheckItem(label="No start or dev script defined", passed=False, is_warning=True))
                recommendations.append("Add a 'start' or 'dev' script in package.json.")

            # Check unpinned dependencies
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            unpinned = [k for k, v in deps.items() if v in ("*", "latest", "")]
            if unpinned:
                score -= 10
                checks.append(CheckItem(
                    label="Unpinned dependencies found",
                    passed=False,
                    is_warning=True,
                    details=f"Unpinned packages: {', '.join(unpinned[:3])}"
                ))
                recommendations.append("Pin specific dependency versions instead of '*' or 'latest'.")

        except json.JSONDecodeError as err:
            score -= 40
            checks.append(CheckItem(label="package.json has syntax errors", passed=False, details=str(err)))
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
        req_content = read_text_safe(requirements_path) if requirements_path.is_file() else read_text_safe(pyproject_path)
        lines = [line.strip() for line in req_content.splitlines() if line.strip() and not line.strip().startswith("#")]
        unpinned_py = [line for line in lines if not any(op in line for op in ("==", ">=", "<=", "~="))]
        
        if unpinned_py and len(unpinned_py) > len(lines) // 2:
            score -= 10
            checks.append(CheckItem(
                label="Unpinned Python dependency versions",
                passed=False,
                is_warning=True,
                details=f"{len(unpinned_py)} packages without version constraints."
            ))
            recommendations.append("Pin explicit version numbers (e.g. fastapi==0.110.0) in requirements.txt to prevent breaking upgrades.")

    # 4. Lockfile Check
    lockfiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock"]
    found_lockfile = any((project_dir / lf).is_file() for lf in lockfiles)
    if found_lockfile:
        checks.append(CheckItem(label="Deterministic dependency lockfile found", passed=True))
    else:
        score -= 15
        checks.append(CheckItem(
            label="Missing lockfile",
            passed=False,
            is_warning=True,
            details="No package-lock.json, yarn.lock, or poetry.lock found."
        ))
        recommendations.append("Commit your dependency lockfile (package-lock.json, yarn.lock, etc.) to guarantee reproducible builds.")

    final_score = max(10, min(100, score))
    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={"has_manifest": has_js_manifest or has_py_manifest, "has_lockfile": found_lockfile}
    ), issues
