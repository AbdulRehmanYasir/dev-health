"""
DevHealth command-line interface.

Examples:

    python -m app.cli samples
    python -m app.cli analyze "E:\\my-project"
    python -m app.cli analyze "E:\\my-project" --format markdown
    python -m app.cli analyze "E:\\my-project" --format json --output report.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from app.services.analyzer_service import run_full_analysis
from app.services.audit_export import (
    build_summary,
    export_csv,
    export_json,
    export_markdown,
    write_export,
)
from app.services.audit_metrics import audit_metrics


SAMPLE_PROJECTS = {
    "fastapi-service": "FastAPI service fixture",
    "legacy-vulnerable": "Legacy vulnerable fixture",
    "rayva-cloud": "Rayva Cloud fixture",
}


def create_parser() -> argparse.ArgumentParser:
    """Create the command-line argument parser."""
    parser = argparse.ArgumentParser(
        prog="devhealth",
        description="Static project health and security analyzer.",
    )

    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
    )

    samples_parser = subparsers.add_parser(
        "samples",
        help="List built-in analysis samples.",
    )
    samples_parser.set_defaults(handler=handle_samples)

    analyze_parser = subparsers.add_parser(
        "analyze",
        help="Analyze a local project directory.",
    )

    analyze_parser.add_argument(
        "path",
        type=Path,
        help="Path to the project directory to analyze.",
    )

    analyze_parser.add_argument(
        "--name",
        default=None,
        help="Optional project name.",
    )

    analyze_parser.add_argument(
        "--format",
        choices=("summary", "json", "csv", "markdown"),
        default="summary",
        help="Output format.",
    )

    analyze_parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Write the generated report to a file.",
    )

    analyze_parser.add_argument(
        "--metrics",
        action="store_true",
        help="Include detailed audit metrics.",
    )

    analyze_parser.set_defaults(handler=handle_analyze)

    return parser


def handle_samples(_: argparse.Namespace) -> int:
    """Print the available built-in sample projects."""
    print("Available DevHealth samples:")
    print()

    for sample_id, description in SAMPLE_PROJECTS.items():
        print(f"  {sample_id:<22} {description}")

    return 0


def validate_project_path(project_path: Path) -> Path:
    """Validate and normalize a project directory."""
    resolved = project_path.expanduser().resolve()

    if not resolved.exists():
        raise FileNotFoundError(
            f"Project path does not exist: {resolved}"
        )

    if not resolved.is_dir():
        raise NotADirectoryError(
            f"Project path is not a directory: {resolved}"
        )

    return resolved


def analyze_project(
    project_path: Path,
    project_name: str | None = None,
) -> Any:
    """Run the existing DevHealth analysis pipeline."""
    project_path = validate_project_path(project_path)

    name = project_name or project_path.name

    return run_full_analysis(
        project_dir=project_path,
        project_name=name,
        source_type="cli",
        source_identifier=str(project_path),
    )


def format_summary(report: Any) -> str:
    """Create a concise terminal summary."""
    summary = build_summary(report)
    metrics = audit_metrics(report)

    lines = [
        "",
        "DevHealth Analysis",
        "=" * 60,
        f"Project:         {summary.get('project_name') or 'Unknown'}",
        f"Overall score:   {summary['overall_score']:.1f}/100",
        f"Health status:   {summary.get('health_status') or 'Unknown'}",
        f"Risk level:      {metrics['risk_level']}",
        f"Total issues:    {summary['issue_count']}",
        f"Critical issues: {summary['critical_issues']}",
        "",
        "Category scores:",
    ]

    for category, score in summary["scores"].items():
        lines.append(
            f"  {category:<22} {score:>6.1f}"
        )

    lines.extend(
        [
            "",
            "Issue severity:",
        ]
    )

    for severity, count in summary["severity_counts"].items():
        lines.append(
            f"  {severity:<12} {count}"
        )

    weakest = metrics["weakest_categories"]

    if weakest:
        lines.extend(
            [
                "",
                "Areas needing attention:",
            ]
        )

        for item in weakest:
            lines.append(
                f"  {item['category']}: {item['score']:.1f}/100"
            )

    lines.append("")

    return "\n".join(lines)


def render_report(
    report: Any,
    output_format: str,
    include_metrics: bool = False,
) -> str:
    """Render a report using the selected output format."""
    if output_format == "json":
        return export_json(report)

    if output_format == "csv":
        return export_csv(report)

    if output_format == "markdown":
        return export_markdown(report)

    if include_metrics:
        result = {
            "summary": build_summary(report),
            "metrics": audit_metrics(report),
        }

        return json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
            default=str,
        )

    return format_summary(report)


def handle_analyze(args: argparse.Namespace) -> int:
    """Analyze a local project and render the selected output."""
    try:
        report = analyze_project(
            args.path,
            project_name=args.name,
        )
    except (FileNotFoundError, NotADirectoryError) as exc:
        print(
            f"Error: {exc}",
            file=sys.stderr,
        )
        return 2
    except Exception as exc:
        print(
            f"Analysis failed: {exc}",
            file=sys.stderr,
        )
        return 1

    content = render_report(
        report,
        args.format,
        include_metrics=args.metrics,
    )

    if args.output:
        output_path = write_export(
            content,
            args.output,
        )

        print(f"Report written to: {output_path}")
    else:
        print(content)

    return 0


def main(argv: list[str] | None = None) -> int:
    """Run the DevHealth CLI."""
    parser = create_parser()
    args = parser.parse_args(argv)

    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())