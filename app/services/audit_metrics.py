"""
Reusable metrics for DevHealth analysis reports.

This module turns raw analyzer results into higher-level measurements
that can be used by the API, CLI, reports, and tests.
"""

from __future__ import annotations

from typing import Any

from .audit_export import (
    SEVERITIES,
    issue_severity_counts,
    issue_type_counts,
    report_to_dict,
    score_breakdown,
)


def overall_score(report: Any) -> float:
    """Return the report's overall score."""
    data = report_to_dict(report)

    value = data.get("overall_score")

    if value is None:
        value = data.get("score", 0)

    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def score_gap(report: Any, target: float = 80.0) -> float:
    """Return how far the project is below or above a target score."""
    return round(float(target) - overall_score(report), 2)


def weakest_categories(
    report: Any,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """Return the lowest-scoring analysis categories."""
    if limit <= 0:
        return []

    scores = score_breakdown(report)

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1],
    )

    return [
        {
            "category": category,
            "score": round(float(score), 2),
        }
        for category, score in ranked[:limit]
    ]


def strongest_categories(
    report: Any,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """Return the highest-scoring analysis categories."""
    if limit <= 0:
        return []

    scores = score_breakdown(report)

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    return [
        {
            "category": category,
            "score": round(float(score), 2),
        }
        for category, score in ranked[:limit]
    ]


def risk_level(report: Any) -> str:
    """
    Determine a descriptive risk level from score and critical issues.

    This is a deterministic project-health classification, not a
    security certification.
    """
    score = overall_score(report)
    severity = issue_severity_counts(report)

    if severity.get("critical", 0) > 0:
        return "critical"

    if score < 50 or severity.get("high", 0) >= 5:
        return "high"

    if score < 70 or severity.get("high", 0) > 0:
        return "medium"

    if score < 85 or severity.get("medium", 0) > 0:
        return "low"

    return "minimal"


def issue_density(report: Any) -> float:
    """Calculate issues per reported source file."""
    data = report_to_dict(report)

    issues = data.get("issues", [])
    files = data.get("file_count")

    if files is None:
        files = data.get("files_analyzed")

    if not isinstance(issues, list):
        return 0.0

    try:
        file_count = float(files)
    except (TypeError, ValueError):
        return 0.0

    if file_count <= 0:
        return 0.0

    return round(len(issues) / file_count, 3)


def severity_ratio(report: Any, severity: str) -> float:
    """Return the percentage of issues matching a severity."""
    normalized = severity.lower()
    counts = issue_severity_counts(report)

    if normalized not in SEVERITIES:
        raise ValueError(
            f"Unsupported severity '{severity}'. "
            f"Expected one of: {', '.join(SEVERITIES)}."
        )

    total = sum(counts.values())

    if total == 0:
        return 0.0

    return round((counts[normalized] / total) * 100, 2)


def priority_issues(
    report: Any,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Return the highest-priority issues first."""
    if limit <= 0:
        return []

    data = report_to_dict(report)
    issues = data.get("issues", [])

    if not isinstance(issues, list):
        return []

    severity_order = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 3,
        "info": 4,
    }

    valid_issues = [
        issue for issue in issues
        if isinstance(issue, dict)
    ]

    valid_issues.sort(
        key=lambda issue: severity_order.get(
            str(issue.get("severity", "info")).lower(),
            5,
        )
    )

    return valid_issues[:limit]


def improvement_plan(
    report: Any,
    limit: int = 5,
) -> list[str]:
    """Generate concise improvement actions from the audit."""
    actions: list[str] = []

    weak = weakest_categories(report, limit=limit)

    for item in weak:
        category = item["category"]
        score = item["score"]

        actions.append(
            f"Improve {category} coverage and raise its score "
            f"from {score:.1f}/100."
        )

    issues = priority_issues(report, limit=limit)

    for issue in issues:
        title = issue.get("title") or issue.get("message")

        if title:
            actions.append(str(title))

    # Preserve order while removing duplicates.
    unique: list[str] = []

    for action in actions:
        if action not in unique:
            unique.append(action)

    return unique[:limit]


def language_percentages(report: Any) -> dict[str, float]:
    """Calculate language percentages when byte counts are available."""
    data = report_to_dict(report)
    languages = data.get("languages")

    if not isinstance(languages, dict):
        return {}

    byte_counts: dict[str, float] = {}

    for language, details in languages.items():
        if isinstance(details, dict):
            value = (
                details.get("bytes")
                or details.get("size")
                or details.get("lines")
            )
        else:
            value = details

        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            continue

        if numeric_value >= 0:
            byte_counts[str(language)] = numeric_value

    total = sum(byte_counts.values())

    if total <= 0:
        return {}

    return {
        language: round((value / total) * 100, 2)
        for language, value in sorted(
            byte_counts.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    }


def audit_metrics(report: Any) -> dict[str, Any]:
    """Return a complete reusable metrics snapshot."""
    return {
        "overall_score": overall_score(report),
        "score_gap_to_80": score_gap(report, 80),
        "risk_level": risk_level(report),
        "issue_density": issue_density(report),
        "severity_counts": issue_severity_counts(report),
        "severity_percentages": {
            severity: severity_ratio(report, severity)
            for severity in SEVERITIES
        },
        "issue_types": issue_type_counts(report),
        "weakest_categories": weakest_categories(report),
        "strongest_categories": strongest_categories(report),
        "priority_issues": priority_issues(report),
        "improvement_plan": improvement_plan(report),
        "language_percentages": language_percentages(report),
    }