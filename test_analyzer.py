"""Unit tests for DevHealth analyzers using Python standard library."""

import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.analyzers.project_detector import detect_project_type_and_languages
from app.analyzers.structure import analyze_structure
from app.analyzers.security import analyze_security
from app.analyzers.build import analyze_build_health
from app.analyzers.testing import analyze_testing
from app.analyzers.dependencies import analyze_dependencies
from app.analyzers.performance import analyze_performance
from app.analyzers.documentation import analyze_documentation
from app.analyzers.production import analyze_production_readiness
from app.utils.scoring import calculate_overall_health, get_health_status


def test_rayva_cloud():
    rayva_dir = BASE_DIR / "fixtures" / "rayva_cloud"
    if not rayva_dir.exists():
        print("Fixtures not generated yet, skipping.")
        return

    ptype, langs = detect_project_type_and_languages(rayva_dir)
    assert "React" in ptype, f"Expected React in ptype, got {ptype}"

    struct = analyze_structure(rayva_dir)
    assert struct.total_files >= 3

    build_res, build_issues = analyze_build_health(rayva_dir, ptype)
    assert build_res.score >= 50

    sec_res, sec_issues = analyze_security(rayva_dir)
    # Must detect hardcoded OpenAI key
    assert any("OpenAI" in i.title for i in sec_issues), "Did not detect OpenAI secret"

    # Verify secret is masked
    masked_issue = next(i for i in sec_issues if "OpenAI" in i.title)
    assert "sk-" in masked_issue.code_snippet
    assert "********" in masked_issue.code_snippet
    assert "sk-proj-998811223344556677889900aabbccddeeff" not in masked_issue.code_snippet, "Raw secret leaked in issue!"

    print("✓ test_rayva_cloud passed with masked secrets verified!")


def test_legacy_vulnerable():
    vuln_dir = BASE_DIR / "fixtures" / "legacy_vulnerable"
    if not vuln_dir.exists():
        return

    sec_res, sec_issues = analyze_security(vuln_dir)
    titles = [i.title for i in sec_issues]
    assert any("SQL" in t for t in titles), f"Expected SQL injection detection in {titles}"
    assert any("Shell" in t or "Subprocess" in t for t in titles), f"Expected Shell injection detection in {titles}"
    assert any("eval" in t.lower() for t in titles), f"Expected eval detection in {titles}"
    print("✓ test_legacy_vulnerable passed!")


if __name__ == "__main__":
    test_rayva_cloud()
    test_legacy_vulnerable()
    print("ALL PYTHON ANALYZER TESTS PASSED!")
