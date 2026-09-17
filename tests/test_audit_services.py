from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from app.services.audit_export import (
    build_summary,
    export_csv,
    export_json,
    export_markdown,
    export_summary_json,
    issue_severity_counts,
    issue_type_counts,
    score_breakdown,
    timestamped_filename,
    write_export,
)
from app.services.audit_metrics import (
    audit_metrics,
    improvement_plan,
    issue_density,
    language_percentages,
    overall_score,
    priority_issues,
    risk_level,
    score_gap,
    severity_ratio,
    strongest_categories,
    weakest_categories,
)


@pytest.fixture
def sample_report() -> dict:
    return {
        "project_id": "test-project-123",
        "project_name": "Example Project",
        "overall_score": 72.5,
        "health_status": "warning",
        "critical_issues": 1,
        "file_count": 20,
        "scores": {
            "Build": 80,
            "Security": 55,
            "Testing": 70,
            "Dependencies": 75,
            "Performance": 90,
        },
        "languages": {
            "Python": {"bytes": 7000},
            "TypeScript": {"bytes": 3000},
        },
        "issues": [
            {
                "severity": "critical",
                "type": "security",
                "title": "Hardcoded secret",
                "description": "A secret was found in source code.",
                "file": "config.py",
                "line": 12,
            },
            {
                "severity": "high",
                "type": "dependencies",
                "title": "Outdated dependency",
                "description": "Dependency requires an update.",
                "file": "requirements.txt",
                "line": 4,
            },
            {
                "severity": "medium",
                "type": "testing",
                "title": "Missing tests",
                "description": "Important functionality lacks coverage.",
                "file": "app/service.py",
                "line": 20,
            },
            {
                "severity": "low",
                "type": "documentation",
                "title": "Missing documentation",
                "description": "Public functionality needs documentation.",
                "file": "app/api.py",
                "line": 8,
            },
        ],
    }


def test_score_breakdown(sample_report):
    scores = score_breakdown(sample_report)

    assert scores["Build"] == 80
    assert scores["Security"] == 55
    assert len(scores) == 5


def test_issue_severity_counts(sample_report):
    counts = issue_severity_counts(sample_report)

    assert counts["critical"] == 1
    assert counts["high"] == 1
    assert counts["medium"] == 1
    assert counts["low"] == 1
    assert counts["info"] == 0


def test_issue_type_counts(sample_report):
    counts = issue_type_counts(sample_report)

    assert counts["security"] == 1
    assert counts["dependencies"] == 1
    assert counts["testing"] == 1
    assert counts["documentation"] == 1


def test_build_summary(sample_report):
    summary = build_summary(sample_report)

    assert summary["project_name"] == "Example Project"
    assert summary["overall_score"] == 72.5
    assert summary["critical_issues"] == 1
    assert summary["issue_count"] == 4


def test_export_json(sample_report):
    content = export_json(sample_report)
    parsed = json.loads(content)

    assert parsed["project_name"] == "Example Project"
    assert parsed["overall_score"] == 72.5


def test_export_summary_json(sample_report):
    content = export_summary_json(sample_report)
    parsed = json.loads(content)

    assert parsed["project_name"] == "Example Project"
    assert parsed["issue_count"] == 4
    assert "severity_counts" in parsed


def test_export_csv(sample_report):
    content = export_csv(sample_report)

    assert "project_name" in content
    assert "Hardcoded secret" in content
    assert "Outdated dependency" in content
    assert "Example Project" in content


def test_export_markdown(sample_report):
    content = export_markdown(sample_report)

    assert "# DevHealth Report" in content
    assert "Example Project" in content
    assert "## Score Breakdown" in content
    assert "## Issue Severity" in content
    assert "Hardcoded secret" in content


def test_write_export(tmp_path: Path):
    output = tmp_path / "reports" / "audit.json"

    result = write_export('{"ok": true}', output)

    assert result == output
    assert output.exists()
    assert output.read_text(encoding="utf-8") == '{"ok": true}'


def test_timestamped_filename():
    timestamp = datetime(
        2026,
        9,
        18,
        2,
        30,
        45,
        tzinfo=timezone.utc,
    )

    filename = timestamped_filename(
        "devhealth",
        "json",
        timestamp,
    )

    assert filename == "devhealth_20260918_023045.json"


def test_overall_score(sample_report):
    assert overall_score(sample_report) == 72.5


def test_score_gap(sample_report):
    assert score_gap(sample_report, 80) == 7.5
    assert score_gap(sample_report, 70) == -2.5


def test_weakest_categories(sample_report):
    weakest = weakest_categories(sample_report, limit=2)

    assert weakest[0]["category"] == "Security"
    assert weakest[0]["score"] == 55
    assert weakest[1]["category"] == "Testing"


def test_strongest_categories(sample_report):
    strongest = strongest_categories(sample_report, limit=2)

    assert strongest[0]["category"] == "Performance"
    assert strongest[0]["score"] == 90
    assert strongest[1]["category"] == "Build"


def test_risk_level(sample_report):
    assert risk_level(sample_report) == "critical"


def test_issue_density(sample_report):
    assert issue_density(sample_report) == 0.2


def test_severity_ratio(sample_report):
    assert severity_ratio(sample_report, "critical") == 25.0
    assert severity_ratio(sample_report, "high") == 25.0

    with pytest.raises(ValueError):
        severity_ratio(sample_report, "unknown")


def test_priority_issues(sample_report):
    issues = priority_issues(sample_report, limit=2)

    assert len(issues) == 2
    assert issues[0]["severity"] == "critical"
    assert issues[1]["severity"] == "high"


def test_improvement_plan(sample_report):
    plan = improvement_plan(sample_report, limit=3)

    assert len(plan) == 3
    assert any("Security" in item for item in plan)


def test_language_percentages(sample_report):
    percentages = language_percentages(sample_report)

    assert percentages["Python"] == 70
    assert percentages["TypeScript"] == 30


def test_audit_metrics(sample_report):
    metrics = audit_metrics(sample_report)

    assert metrics["overall_score"] == 72.5
    assert metrics["risk_level"] == "critical"
    assert metrics["issue_density"] == 0.2
    assert metrics["severity_counts"]["critical"] == 1
    assert metrics["language_percentages"]["Python"] == 70


def test_empty_report_is_safe():
    report = {
        "project_name": "Empty",
        "overall_score": 100,
        "scores": {},
        "issues": [],
    }

    assert issue_severity_counts(report)["critical"] == 0
    assert issue_type_counts(report) == {}
    assert issue_density(report) == 0
    assert severity_ratio(report, "critical") == 0
    assert priority_issues(report) == []
    assert weakest_categories(report) == []
    assert strongest_categories(report) == []
    assert language_percentages(report) == {}