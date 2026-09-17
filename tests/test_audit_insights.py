from pathlib import Path

import pytest

from app.services.audit_insights import (
    audit_comparison,
    audit_health_summary,
    highest_issue_severity,
    improved_categories,
    inventory_summary,
    issue_changes,
    issue_delta,
    project_inventory,
    regressed_categories,
    score_deltas,
    severity_counts,
)


def make_report(
    overall=80,
    security=90,
    testing=70,
    issues=None,
):
    return {
        "project_name": "Demo",
        "status": "NEEDS ATTENTION",
        "production_status": "READY WITH IMPROVEMENTS",
        "scores": {
            "overall": overall,
            "build": 80,
            "security": security,
            "testing": testing,
            "dependencies": 80,
            "performance": 85,
            "documentation": 75,
            "production_readiness": 70,
        },
        "issues": issues or [],
    }


def issue(
    title,
    file="src/app.py",
    line=10,
    severity="MEDIUM",
):
    return {
        "id": f"ISSUE-{title}",
        "title": title,
        "severity": severity,
        "category": "Security",
        "file": file,
        "line": line,
        "description": "Test issue",
        "why_it_matters": "Test",
        "recommended_fix": "Fix it",
    }


def test_score_deltas():
    before = make_report(overall=70, security=80)
    after = make_report(overall=85, security=95)

    result = score_deltas(before, after)

    assert result["overall"] == 15
    assert result["security"] == 15


def test_improved_categories():
    before = make_report(security=70)
    after = make_report(security=85)

    result = improved_categories(before, after)

    assert {"category": "security", "change": 15} in result


def test_regressed_categories():
    before = make_report(testing=90)
    after = make_report(testing=70)

    result = regressed_categories(before, after)

    assert {"category": "testing", "change": -20} in result


def test_issue_changes():
    old_issue = issue("Old issue")
    persistent = issue("Persistent issue")
    new_issue = issue("New issue")

    before = make_report(
        issues=[old_issue, persistent],
    )
    after = make_report(
        issues=[persistent, new_issue],
    )

    result = issue_changes(before, after)

    assert len(result["new"]) == 1
    assert result["new"][0]["title"] == "New issue"

    assert len(result["resolved"]) == 1
    assert result["resolved"][0]["title"] == "Old issue"

    assert len(result["persistent"]) == 1
    assert result["persistent"][0]["title"] == "Persistent issue"


def test_severity_counts():
    report = make_report(
        issues=[
            issue("Critical", severity="CRITICAL"),
            issue("High", severity="HIGH"),
            issue("Medium 1", severity="MEDIUM"),
            issue("Medium 2", severity="MEDIUM"),
        ]
    )

    result = severity_counts(report)

    assert result["CRITICAL"] == 1
    assert result["HIGH"] == 1
    assert result["MEDIUM"] == 2
    assert result["LOW"] == 0


def test_highest_issue_severity():
    report = make_report(
        issues=[
            issue("Low", severity="LOW"),
            issue("Critical", severity="CRITICAL"),
        ]
    )

    assert highest_issue_severity(report) == "CRITICAL"


def test_issue_delta():
    before = make_report(
        issues=[
            issue("Critical", severity="CRITICAL"),
            issue("Medium", severity="MEDIUM"),
        ]
    )
    after = make_report(
        issues=[
            issue("Medium", severity="MEDIUM"),
            issue("New High", severity="HIGH"),
        ]
    )

    result = issue_delta(before, after)

    assert result["CRITICAL"] == -1
    assert result["HIGH"] == 1
    assert result["MEDIUM"] == 0


def test_audit_comparison():
    before = make_report(overall=70, security=70)
    after = make_report(overall=85, security=90)

    result = audit_comparison(before, after)

    assert result["previous_score"] == 70
    assert result["current_score"] == 85
    assert result["overall_change"] == 15
    assert result["score_deltas"]["security"] == 20


def test_audit_health_summary():
    report = make_report(
        overall=82,
        security=95,
        testing=55,
        issues=[
            issue("Critical", severity="CRITICAL"),
            issue("High", severity="HIGH"),
        ],
    )

    result = audit_health_summary(report)

    assert result["project_name"] == "Demo"
    assert result["overall_score"] == 82
    assert result["total_issues"] == 2
    assert result["critical_issues"] == 1
    assert result["highest_severity"] == "CRITICAL"
    assert result["weakest_categories"][0]["category"] == "testing"


def test_project_inventory(tmp_path: Path):
    source = tmp_path / "src"
    source.mkdir()

    (source / "main.py").write_text("print('hello')", encoding="utf-8")
    (source / "app.tsx").write_text("export default function App() {}", encoding="utf-8")
    (tmp_path / "README.md").write_text("# Demo", encoding="utf-8")

    result = project_inventory(tmp_path)

    assert result["total_files"] == 3
    assert result["total_bytes"] > 0
    assert result["extensions"][".py"] == 1
    assert result["extensions"][".tsx"] == 1
    assert result["extensions"][".md"] == 1
    assert result["largest_files"]


def test_inventory_summary(tmp_path: Path):
    (tmp_path / "main.py").write_text("print('hello')", encoding="utf-8")
    (tmp_path / "README.md").write_text("# Demo", encoding="utf-8")

    result = inventory_summary(tmp_path)

    assert result["total_files"] == 2
    assert ".py" in result["top_extensions"]
    assert ".md" in result["top_extensions"]