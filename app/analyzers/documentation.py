"""DevHealth Documentation Analyzer.
Evaluates presence and quality of README, LICENSE, installation guides,
environment documentation, API specs, and contribution guidelines.
"""

from pathlib import Path
from typing import List, Tuple
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe


def analyze_documentation(project_dir: Path) -> Tuple[CategoryResult, List[Issue]]:
    """Inspects project documentation completeness, installation instructions, and licensing."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    # 1. README presence and content
    readme_candidates = [
        project_dir / "README.md",
        project_dir / "README.rst",
        project_dir / "README.txt",
        project_dir / "readme.md",
    ]
    readme_path = next((p for p in readme_candidates if p.is_file()), None)

    has_readme = readme_path is not None
    readme_content = read_text_safe(readme_path).lower() if readme_path else ""

    if has_readme:
        checks.append(CheckItem(label="README documentation found", passed=True, details=readme_path.name))
        
        # Check sections in README
        has_install = any(k in readme_content for k in ("install", "setup", "getting started", "pip install", "npm install", "yarn add"))
        has_usage = any(k in readme_content for k in ("usage", "quickstart", "how to run", "start", "run"))
        has_env_docs = any(k in readme_content for k in ("environment", ".env", "api key", "configuration", "credentials"))
        has_api_docs = any(k in readme_content for k in ("api", "endpoints", "swagger", "openapi", "routes"))

        if has_install:
            checks.append(CheckItem(label="Installation instructions detected", passed=True))
        else:
            score -= 15
            checks.append(CheckItem(label="No clear installation guide in README", passed=False, is_warning=True))
            recommendations.append("Add explicit step-by-step setup and installation instructions to README.")

        if has_usage:
            checks.append(CheckItem(label="Usage / Quickstart instructions detected", passed=True))
        else:
            score -= 15
            checks.append(CheckItem(label="No usage instructions in README", passed=False, is_warning=True))
            recommendations.append("Provide run or usage examples so new developers can verify functionality.")

        if has_env_docs:
            checks.append(CheckItem(label="Environment variables documented", passed=True))
        else:
            score -= 10
            checks.append(CheckItem(
                label="Environment variables not documented",
                passed=False,
                is_warning=True,
                details="No .env table or required environment variables listed."
            ))
            recommendations.append("Document all required environment variables and configuration secrets in README or .env.example.")
    else:
        score -= 40
        checks.append(CheckItem(label="No README file detected", passed=False, is_warning=False))
        recommendations.append("Create a comprehensive README.md describing the project purpose and setup.")
        issues.append(Issue(
            id="DOC-001",
            title="Missing README File",
            severity=Severity.MEDIUM,
            category=Category.DOCUMENTATION,
            file="README.md",
            description="The project root does not contain a README.md file.",
            why_it_matters="Without a README, onboarded developers and automated tools cannot understand the architecture or deployment requirements.",
            recommended_fix="Create a standard README.md with overview, prerequisites, installation steps, and usage commands."
        ))

    # 2. LICENSE presence
    license_candidates = [
        project_dir / "LICENSE",
        project_dir / "LICENSE.md",
        project_dir / "LICENSE.txt",
        project_dir / "COPYING",
    ]
    has_license = any(p.is_file() for p in license_candidates)
    if has_license:
        checks.append(CheckItem(label="Open source or commercial LICENSE file detected", passed=True))
    else:
        score -= 15
        checks.append(CheckItem(
            label="No LICENSE file detected",
            passed=False,
            is_warning=True,
            details="Repository lacks explicit licensing terms."
        ))
        recommendations.append("Add an explicit LICENSE file (e.g., MIT, Apache-2.0, or Proprietary) to clarify usage rights.")
        issues.append(Issue(
            id="DOC-002",
            title="Missing LICENSE Declaration",
            severity=Severity.LOW,
            category=Category.DOCUMENTATION,
            file="LICENSE",
            description="No legal license was found in the project root.",
            why_it_matters="Without a license, default copyright laws apply, which may restrict legal collaboration or open source contributions.",
            recommended_fix="Include a LICENSE file (such as MIT or Apache-2.0) defining terms of distribution."
        ))

    # 3. Contributing / Code of Conduct
    has_contrib = (project_dir / "CONTRIBUTING.md").is_file() or "contributing" in readme_content
    if has_contrib:
        checks.append(CheckItem(label="Contribution guidelines detected", passed=True))
    else:
        checks.append(CheckItem(
            label="No CONTRIBUTING.md guide",
            passed=False,
            is_warning=True,
            details="Useful for multi-developer collaboration and PR standards."
        ))

    final_score = max(10, min(100, score))
    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "has_readme": has_readme,
            "has_license": has_license,
            "has_contributing": has_contrib,
            "readme_words_count": len(readme_content.split()) if has_readme else 0,
        }
    ), issues
