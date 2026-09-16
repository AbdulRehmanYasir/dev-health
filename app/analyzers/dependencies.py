"""DevHealth Dependency Analyzer.
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
    "request": ("Deprecated HTTP client. Use fetch, axios, or got instead.", Severity.MEDIUM),
    "querystring": ("Deprecated built-in. Use URLSearchParams instead.", Severity.LOW),
    "node-sass": ("Deprecated libsass wrapper. Use sass (Dart Sass) instead.", Severity.MEDIUM),
    # Python
    "pycrypto": ("Unmaintained since 2013 with critical security vulnerabilities. Use cryptography or pycryptodome.", Severity.HIGH),
    "pep8": ("Renamed to pycodestyle. Do not use legacy pep8 package.", Severity.LOW),
    "fabric": ("Check if fabric 1.x (Python 2 only). Upgrade to Fabric 2+ or Invoke.", Severity.LOW),
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
            data = json.loads(read_text_safe(package_json))
            deps: Dict[str, str] = data.get("dependencies", {})
            dev_deps: Dict[str, str] = data.get("devDependencies", {})

            direct_deps_count += len(deps)
            dev_deps_count += len(dev_deps)

            # Check overlap / duplicate
            overlap = set(deps.keys()).intersection(set(dev_deps.keys()))
            if overlap:
                duplicate_deps.extend(list(overlap))
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

            # Check unpinned versions
            for pkg_name, ver in {**deps, **dev_deps}.items():
                if ver in ("*", "latest", ""):
                    unpinned_deps.append(pkg_name)
                if pkg_name.lower() in DEPRECATED_OR_DISCOURAGED_PACKAGES:
                    reason, sev = DEPRECATED_OR_DISCOURAGED_PACKAGES[pkg_name.lower()]
                    deprecated_found.append((pkg_name, reason, sev))

        except Exception:
            pass

    # 2. Parse Python requirements.txt
    if requirements_txt.is_file():
        lines = [l.strip() for l in read_text_safe(requirements_txt).splitlines() if l.strip() and not l.strip().startswith("#")]
        direct_deps_count += len(lines)
        seen_py: Set[str] = set()
        for line in lines:
            pkg_name = line.split("==")[0].split(">=")[0].split("<=")[0].split("~=")[0].strip()
            clean_pkg = pkg_name.lower()
            if clean_pkg in seen_py:
                duplicate_deps.append(pkg_name)
            seen_py.add(clean_pkg)

            if "==" not in line and ">=" not in line and "<=" not in line and "~=" not in line:
                unpinned_deps.append(pkg_name)

            if clean_pkg in DEPRECATED_OR_DISCOURAGED_PACKAGES:
                reason, sev = DEPRECATED_OR_DISCOURAGED_PACKAGES[clean_pkg]
                deprecated_found.append((pkg_name, reason, sev))

    # Evaluate Lockfiles
    lockfiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock"]
    has_lock = any((project_dir / lf).is_file() for lf in lockfiles)
    if has_lock:
        checks.append(CheckItem(label="Dependency lockfile is committed", passed=True))
    else:
        score -= 15
        checks.append(CheckItem(
            label="Missing lockfile",
            passed=False,
            is_warning=True,
            details="No package-lock.json or yarn.lock found."
        ))
        recommendations.append("Commit a lockfile to ensure reproducible dependencies across developer machines and production.")

    # Evaluate Counts
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

    # Unpinned versions check
    if unpinned_deps:
        score -= 10
        checks.append(CheckItem(
            label=f"{len(unpinned_deps)} unpinned dependency range(s)",
            passed=False,
            is_warning=True,
            details=f"Examples: {', '.join(unpinned_deps[:4])}"
        ))
        recommendations.append("Use explicit semver constraints (e.g. ^1.2.0 or ==2.0.0) instead of unbounded ranges.")
    else:
        checks.append(CheckItem(label="All dependency versions have specified bounds", passed=True))

    # Deprecated packages
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
            details=", ".join(p[0] for p in deprecated_found)
        ))
    else:
        checks.append(CheckItem(label="No known deprecated or abandoned packages detected", passed=True))

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
