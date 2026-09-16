"""DevHealth Testing Analyzer.
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
    ("pytest", [r"\bimport pytest\b", r"\bfrom pytest\b", "pytest.ini", "pyproject.toml:pytest"]),
    ("unittest", [r"\bimport unittest\b", r"class .*\(unittest\.TestCase\):"]),
    ("Jest", [r"\bjest\b", "jest.config.js", "jest.config.ts"]),
    ("Vitest", [r"\bvitest\b", "vitest.config.ts", "vitest.config.js"]),
    ("Mocha", [r"\bmocha\b", ".mocharc.json"]),
    ("Cypress", [r"\bcypress\b", "cypress.config.js", "cypress.config.ts"]),
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

    # Check for coverage report files
    has_coverage_file = any((project_dir / f).exists() for f in (".coverage", "coverage.xml", "lcov.info", "coverage/lcov.info"))

    # Scan package.json or requirements.txt for framework dependencies
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

    # Scan project tree for test files and directories
    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]
        rel_root = os.path.relpath(root, project_dir).lower()

        is_e2e_dir = "e2e" in rel_root or "cypress" in rel_root or "playwright" in rel_root
        is_test_dir = is_e2e_dir or any(k in rel_root for k in ("test", "tests", "__tests__", "spec"))

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
                test_files_list.append(os.path.join(rel_root, f))
                if is_e2e_dir or "e2e" in lower_name or "cypress" in lower_name:
                    has_e2e_tests = True
                else:
                    has_unit_tests = True

                # Heuristic framework check in file
                file_path = Path(root) / f
                file_head = read_text_safe(file_path, max_bytes=4096)
                if "pytest" in file_head:
                    detected_frameworks.add("pytest")
                if "unittest" in file_head:
                    detected_frameworks.add("unittest")
                if "describe(" in file_head or "it(" in file_head or "test(" in file_head:
                    if not detected_frameworks:
                        detected_frameworks.add("Jest / Vitest")

    test_count = len(test_files_list)

    # 1. Framework Evaluation
    if detected_frameworks:
        framework_names = ", ".join(sorted(detected_frameworks))
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
        recommendations.append("Configure a testing framework (e.g., pytest or Jest/Vitest) in your build pipeline.")

    # 2. Test File Volume & Ratio
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
        recommendations.append("Add unit tests for core domain logic and route handlers.")
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

    # Calculate Source-to-Test ratio
    if source_files_count > 0:
        ratio_pct = int(round((test_count / source_files_count) * 100))
        if test_count > 0 and ratio_pct < 35:
            score -= 15
            checks.append(CheckItem(
                label=f"Low source-to-test ratio ({ratio_pct}%)",
                passed=False,
                is_warning=True,
                details=f"{test_count} test file(s) for {source_files_count} source modules."
            ))
            recommendations.append(f"Only ~{ratio_pct}% of source modules have corresponding tests. Increase test coverage for critical paths.")
        elif test_count > 0:
            checks.append(CheckItem(
                label=f"Healthy source-to-test ratio ({ratio_pct}%)",
                passed=True,
                details=f"{test_count} test files for {source_files_count} source files."
            ))

    # E2E test detection
    if has_e2e_tests:
        checks.append(CheckItem(label="End-to-end (E2E) or integration tests detected", passed=True))
    elif test_count > 0:
        score -= 10
        checks.append(CheckItem(
            label="No end-to-end tests detected",
            passed=False,
            is_warning=True,
            details="Consider adding Playwright or Cypress tests for user flows."
        ))
        recommendations.append("Add end-to-end tests (e.g. Playwright) for critical user journeys.")

    if has_coverage_file:
        checks.append(CheckItem(label="Automated test coverage report found in project", passed=True))
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
            "source_to_test_ratio_pct": int(round((test_count / max(1, source_files_count)) * 100)),
            "has_e2e": has_e2e_tests,
            "has_unit": has_unit_tests or test_count > 0,
        }
    ), issues
