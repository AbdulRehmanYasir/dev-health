"""
DevHealth report export utilities.

Provides reusable transformations and exports for analysis reports.
The functions in this module are intentionally independent from FastAPI
so they can be used by the CLI, API routes, tests, or future integrations.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SEVERITIES = ("critical", "high", "medium", "low", "info")


def _plain(value: Any) -> Any:
    """Convert Pydantic models and nested objects into JSON-safe data."""
    if hasattr(value, "model_dump"):
        return value.model_dump()

    if hasattr(value, "dict"):
        return value.dict()

    if isinstance(value, dict):
        return {str(key): _plain(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_plain(item) for item in value]

    if isinstance(value, datetime):
        return value.isoformat()

    return value


def report_to_dict(report: Any) -> dict[str, Any]:
    """Return an analysis report as a plain dictionary."""
    result = _plain(report)

    if not isinstance(result, dict):
        raise TypeError("Analysis report must convert to a dictionary.")

    return result


def score_breakdown(report: Any) -> dict[str, float]:
    """Extract category scores from an analysis report."""
    data = report_to_dict(report)
    scores = data.get("scores")

    if isinstance(scores, dict):
        return {
            str(name): float(value)
            for name, value in scores.items()
            if isinstance(value, (int, float))
        }

    return {}


def issue_severity_counts(report: Any) -> dict[str, int]:
    """Count issues by severity."""
    data = report_to_dict(report)
    issues = data.get("issues", [])

    counts = {severity: 0 for severity in SEVERITIES}

    if not isinstance(issues, list):
        return counts

    for issue in issues:
        if not isinstance(issue, dict):
            continue

        severity = str(issue.get("severity", "info")).lower()

        if severity not in counts:
            severity = "info"

        counts[severity] += 1

    return counts


def issue_type_counts(report: Any) -> dict[str, int]:
    """Count issues by analyzer/category type."""
    data = report_to_dict(report)
    issues = data.get("issues", [])

    counts: dict[str, int] = {}

    if not isinstance(issues, list):
        return counts

    for issue in issues:
        if not isinstance(issue, dict):
            continue

        issue_type = (
            issue.get("type")
            or issue.get("category")
            or issue.get("analyzer")
            or "unknown"
        )

        key = str(issue_type)
        counts[key] = counts.get(key, 0) + 1

    return dict(
        sorted(
            counts.items(),
            key=lambda item: (-item[1], item[0]),
        )
    )


def build_summary(report: Any) -> dict[str, Any]:
    """Build a compact machine-readable summary."""
    data = report_to_dict(report)
    scores = score_breakdown(data)

    overall_score = data.get("overall_score")

    if overall_score is None:
        overall_score = data.get("overall")

    if overall_score is None:
        overall_score = data.get("score")

    if overall_score is None:
        overall_score = scores.get("overall", 0)

    return {
        "project_id": data.get("project_id"),
        "project_name": data.get("project_name"),
        "overall_score": float(overall_score or 0),
        "health_status": data.get("health_status"),
        "critical_issues": int(
            data.get("critical_issues", 0) or 0
        ),
        "issue_count": (
            len(data.get("issues", []))
            if isinstance(data.get("issues", []), list)
            else 0
        ),
        "scores": scores,
        "severity_counts": issue_severity_counts(data),
        "issue_types": issue_type_counts(data),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def export_json(report: Any, indent: int = 2) -> str:
    """Serialize a complete analysis report as JSON."""
    return json.dumps(
        report_to_dict(report),
        indent=indent,
        ensure_ascii=False,
        default=str,
    )


def export_summary_json(report: Any, indent: int = 2) -> str:
    """Serialize the compact report summary as JSON."""
    return json.dumps(
        build_summary(report),
        indent=indent,
        ensure_ascii=False,
        default=str,
    )


def export_csv(report: Any) -> str:
    """Export report issues and severity information as CSV."""
    data = report_to_dict(report)
    issues = data.get("issues", [])

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "project_name",
            "overall_score",
            "health_status",
            "severity",
            "type",
            "title",
            "description",
            "file",
            "line",
        ]
    )

    if not isinstance(issues, list):
        issues = []

    overall_score = data.get("overall_score")

    if overall_score is None:
        overall_score = data.get("overall")

    if overall_score is None:
        overall_score = data.get("score")

    if overall_score is None:
        overall_score = score_breakdown(data).get("overall", "")

    for issue in issues:
        if not isinstance(issue, dict):
            continue

        writer.writerow(
            [
                data.get("project_name", ""),
                overall_score,
                data.get("health_status", ""),
                issue.get("severity", ""),
                issue.get(
                    "type",
                    issue.get("category", ""),
                ),
                issue.get("title", ""),
                issue.get(
                    "description",
                    issue.get("message", ""),
                ),
                issue.get(
                    "file",
                    issue.get("path", ""),
                ),
                issue.get("line", ""),
            ]
        )

    return output.getvalue()


def _iter_languages(
    report: Any,
) -> Iterable[tuple[str, Any]]:
    """Yield language names and their reported statistics."""
    data = report_to_dict(report)
    languages = data.get("languages", {})

    if isinstance(languages, dict):
        return languages.items()

    if isinstance(languages, list):
        result: list[tuple[str, Any]] = []

        for language in languages:
            if isinstance(language, dict):
                name = (
                    language.get("name")
                    or language.get("language")
                )

                if name:
                    result.append(
                        (
                            str(name),
                            language,
                        )
                    )

        return result

    return []


def export_markdown(report: Any) -> str:
    """Generate a human-readable Markdown audit report."""
    data = report_to_dict(report)
    summary = build_summary(data)

    lines = [
        (
            f"# DevHealth Report — "
            f"{summary.get('project_name') or 'Unknown Project'}"
        ),
        "",
        (
            f"**Overall Score:** "
            f"{summary['overall_score']:.1f}/100"
        ),
        (
            f"**Health Status:** "
            f"{summary.get('health_status') or 'Unknown'}"
        ),
        f"**Total Issues:** {summary['issue_count']}",
        f"**Critical Issues:** {summary['critical_issues']}",
        "",
        "## Score Breakdown",
        "",
        "| Category | Score |",
        "|---|---:|",
    ]

    for category, score in summary["scores"].items():
        lines.append(
            f"| {category} | {score:.1f} |"
        )

    lines.extend(
        [
            "",
            "## Issue Severity",
            "",
            "| Severity | Count |",
            "|---|---:|",
        ]
    )

    for severity, count in summary["severity_counts"].items():
        lines.append(
            f"| {severity.title()} | {count} |"
        )

    lines.extend(
        [
            "",
            "## Issues",
            "",
        ]
    )

    issues = data.get("issues", [])

    if not issues:
        lines.append("No issues were reported.")
    else:
        for index, issue in enumerate(
            issues,
            start=1,
        ):
            if not isinstance(issue, dict):
                continue

            severity = str(
                issue.get("severity", "info")
            ).upper()

            title = (
                issue.get("title")
                or issue.get("message")
                or "Untitled issue"
            )

            description = (
                issue.get("description")
                or issue.get("message")
                or ""
            )

            lines.append(
                f"### {index}. [{severity}] {title}"
            )

            if description:
                lines.append("")
                lines.append(str(description))

            file_name = (
                issue.get("file")
                or issue.get("path")
            )

            if file_name:
                lines.append("")
                lines.append(
                    f"**File:** `{file_name}`"
                )

            lines.append("")

    languages = list(_iter_languages(data))

    if languages:
        lines.extend(
            [
                "## Languages",
                "",
                "| Language | Details |",
                "|---|---|",
            ]
        )

        for language, details in languages:
            if isinstance(details, dict):
                formatted = ", ".join(
                    f"{key}: {value}"
                    for key, value in details.items()
                    if key != "name"
                )
            else:
                formatted = str(details)

            lines.append(
                f"| {language} | {formatted} |"
            )

        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def write_export(
    content: str,
    output_path: str | Path,
) -> Path:
    """Write generated export content to disk."""
    path = Path(output_path)

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        content,
        encoding="utf-8",
    )

    return path


def timestamped_filename(
    prefix: str,
    extension: str,
    now: datetime | None = None,
) -> str:
    """Generate a deterministic timestamp-based filename."""
    current = now or datetime.now(timezone.utc)

    clean_extension = extension.lstrip(".")
    timestamp = current.strftime(
        "%Y%m%d_%H%M%S"
    )

    return (
        f"{prefix}_{timestamp}.{clean_extension}"
    )