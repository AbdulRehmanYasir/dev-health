"""DevHealth Audit Insights Service.

Provides reusable comparison and inventory utilities for static analysis reports.
This module is intentionally independent from the web layer so the CLI, API,
and future reporting interfaces can reuse the same logic.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

from app.config import IGNORED_DIRS, IGNORED_EXTENSIONS


SCORE_FIELDS = (
    "build",
    "security",
    "testing",
    "dependencies",
    "performance",
    "documentation",
    "production_readiness",
)

SEVERITY_ORDER = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFO": 1,
}


def _plain(value: Any) -> Any:
    """Convert Pydantic/enums/objects into plain Python values."""
    if hasattr(value, "model_dump"):
        return value.model_dump()

    if hasattr(value, "value") and not isinstance(value, (str, bytes)):
        return value.value

    if isinstance(value, Mapping):
        return {key: _plain(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_plain(item) for item in value]

    return value


def _report_dict(report: Any) -> Dict[str, Any]:
    """Normalize an AnalysisReport or report dictionary."""
    result = _plain(report)

    if not isinstance(result, dict):
        raise TypeError("report must be an AnalysisReport or dictionary")

    return result


def _scores(report: Any) -> Dict[str, float]:
    """Return normalized score fields from a report."""
    data = _report_dict(report)
    scores = data.get("scores", {})

    return {
        field: float(scores.get(field, 0))
        for field in ("overall", *SCORE_FIELDS)
    }


def overall_score(report: Any) -> float:
    """Return the overall audit score."""
    return _scores(report).get("overall", 0.0)


def score_deltas(
    previous: Any,
    current: Any,
) -> Dict[str, float]:
    """Calculate score changes between two audits.

    Positive values indicate improvement; negative values indicate regression.
    """
    before = _scores(previous)
    after = _scores(current)

    return {
        field: round(after[field] - before[field], 2)
        for field in ("overall", *SCORE_FIELDS)
    }


def improved_categories(
    previous: Any,
    current: Any,
    minimum_change: float = 1.0,
) -> List[Dict[str, float]]:
    """Return categories whose scores improved by at least minimum_change."""
    deltas = score_deltas(previous, current)

    return [
        {"category": category, "change": change}
        for category, change in deltas.items()
        if category != "overall" and change >= minimum_change
    ]


def regressed_categories(
    previous: Any,
    current: Any,
    minimum_change: float = 1.0,
) -> List[Dict[str, float]]:
    """Return categories whose scores regressed by at least minimum_change."""
    deltas = score_deltas(previous, current)

    return [
        {"category": category, "change": change}
        for category, change in deltas.items()
        if category != "overall" and change <= -minimum_change
    ]


def _issue_key(issue: Mapping[str, Any]) -> Tuple[str, str, str]:
    """Build a stable identity for an issue across two audits."""
    return (
        str(issue.get("title", "")),
        str(issue.get("file", "")),
        str(issue.get("line", "")),
    )


def issue_set(report: Any) -> Dict[Tuple[str, str, str], Dict[str, Any]]:
    """Return normalized issues keyed by title, file, and line."""
    data = _report_dict(report)

    result: Dict[Tuple[str, str, str], Dict[str, Any]] = {}

    for issue in data.get("issues", []):
        normalized = _plain(issue)
        if isinstance(normalized, Mapping):
            result[_issue_key(normalized)] = dict(normalized)

    return result


def issue_changes(
    previous: Any,
    current: Any,
) -> Dict[str, List[Dict[str, Any]]]:
    """Identify new, resolved, and persistent issues between audits."""
    before = issue_set(previous)
    after = issue_set(current)

    before_keys = set(before)
    after_keys = set(after)

    new_keys = after_keys - before_keys
    resolved_keys = before_keys - after_keys
    persistent_keys = before_keys & after_keys

    return {
        "new": [after[key] for key in sorted(new_keys)],
        "resolved": [before[key] for key in sorted(resolved_keys)],
        "persistent": [after[key] for key in sorted(persistent_keys)],
    }


def severity_counts(report: Any) -> Dict[str, int]:
    """Count issues by severity."""
    data = _report_dict(report)
    counts = Counter()

    for issue in data.get("issues", []):
        severity = _plain(issue.get("severity", "INFO"))
        counts[str(severity).upper()] += 1

    return {
        severity: counts.get(severity, 0)
        for severity in SEVERITY_ORDER
    }


def highest_issue_severity(report: Any) -> str:
    """Return the highest severity currently present in an audit."""
    counts = severity_counts(report)

    for severity in SEVERITY_ORDER:
        if counts[severity] > 0:
            return severity

    return "NONE"


def issue_delta(previous: Any, current: Any) -> Dict[str, int]:
    """Return issue-count changes between two audits."""
    before = severity_counts(previous)
    after = severity_counts(current)

    return {
        severity: after[severity] - before[severity]
        for severity in SEVERITY_ORDER
    }


def audit_comparison(
    previous: Any,
    current: Any,
) -> Dict[str, Any]:
    """Build a complete comparison between two DevHealth audits."""
    changes = issue_changes(previous, current)
    deltas = score_deltas(previous, current)

    return {
        "previous_score": overall_score(previous),
        "current_score": overall_score(current),
        "overall_change": deltas["overall"],
        "score_deltas": deltas,
        "improved_categories": improved_categories(previous, current),
        "regressed_categories": regressed_categories(previous, current),
        "new_issue_count": len(changes["new"]),
        "resolved_issue_count": len(changes["resolved"]),
        "persistent_issue_count": len(changes["persistent"]),
        "new_issues": changes["new"],
        "resolved_issues": changes["resolved"],
        "issue_delta": issue_delta(previous, current),
        "previous_highest_severity": highest_issue_severity(previous),
        "current_highest_severity": highest_issue_severity(current),
    }


def _iter_project_files(project_dir: Path) -> Iterable[Path]:
    """Yield analyzable project files while respecting DevHealth ignores."""
    project_dir = Path(project_dir)

    for root, dirs, files in project_dir.walk():
        dirs[:] = [
            directory
            for directory in dirs
            if directory not in IGNORED_DIRS
            and not directory.startswith(".")
        ]

        for filename in files:
            path = root / filename

            if path.suffix.lower() in IGNORED_EXTENSIONS:
                continue

            if filename.endswith((".min.js", ".min.css")):
                continue

            yield path


def project_inventory(project_dir: Path) -> Dict[str, Any]:
    """Create a lightweight inventory of a project directory.

    The inventory intentionally reads metadata only; it never executes
    project code.
    """
    project_dir = Path(project_dir)

    if not project_dir.exists():
        raise FileNotFoundError(f"Project directory does not exist: {project_dir}")

    files = list(_iter_project_files(project_dir))

    extension_counts: Counter[str] = Counter()
    directory_counts: Counter[str] = Counter()
    total_bytes = 0
    largest_files: List[Dict[str, Any]] = []

    for path in files:
        try:
            size = path.stat().st_size
        except OSError:
            continue

        extension = path.suffix.lower() or "[no extension]"
        extension_counts[extension] += 1
        total_bytes += size

        try:
            relative = path.relative_to(project_dir)
        except ValueError:
            relative = path

        parent = str(relative.parent)
        directory_counts[parent] += 1

        largest_files.append(
            {
                "path": str(relative),
                "size_bytes": size,
            }
        )

    largest_files.sort(key=lambda item: item["size_bytes"], reverse=True)

    return {
        "project_path": str(project_dir),
        "total_files": len(files),
        "total_bytes": total_bytes,
        "extensions": dict(extension_counts.most_common()),
        "directories": dict(directory_counts.most_common()),
        "largest_files": largest_files[:10],
    }


def inventory_summary(project_dir: Path) -> Dict[str, Any]:
    """Return a compact human-readable inventory summary."""
    inventory = project_inventory(project_dir)

    extensions = inventory["extensions"]

    return {
        "total_files": inventory["total_files"],
        "total_bytes": inventory["total_bytes"],
        "top_extensions": dict(list(extensions.items())[:10]),
        "largest_files": inventory["largest_files"][:5],
    }


def audit_health_summary(report: Any) -> Dict[str, Any]:
    """Return a concise health snapshot suitable for dashboards or APIs."""
    data = _report_dict(report)
    scores = _scores(data)
    severities = severity_counts(data)

    weakest = sorted(
        (
            {
                "category": category,
                "score": scores[category],
            }
            for category in SCORE_FIELDS
        ),
        key=lambda item: item["score"],
    )[:3]

    strongest = sorted(
        (
            {
                "category": category,
                "score": scores[category],
            }
            for category in SCORE_FIELDS
        ),
        key=lambda item: item["score"],
        reverse=True,
    )[:3]

    return {
        "project_name": data.get("project_name", "Unknown"),
        "overall_score": scores["overall"],
        "status": str(data.get("status", "Unknown")),
        "production_status": str(data.get("production_status", "Unknown")),
        "total_issues": len(data.get("issues", [])),
        "critical_issues": severities["CRITICAL"],
        "high_issues": severities["HIGH"],
        "highest_severity": highest_issue_severity(data),
        "weakest_categories": weakest,
        "strongest_categories": strongest,
    }