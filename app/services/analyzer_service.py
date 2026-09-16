"""DevHealth Analyzer Orchestration Service.
Coordinates all analyzer modules, computes overall scores, and produces unified reports.
"""

import uuid
from datetime import datetime
from pathlib import Path
from typing import List
from app.analyzers.build import analyze_build_health
from app.analyzers.dependencies import analyze_dependencies
from app.analyzers.documentation import analyze_documentation
from app.analyzers.performance import analyze_performance
from app.analyzers.production import analyze_production_readiness
from app.analyzers.project_detector import detect_project_type_and_languages
from app.analyzers.security import analyze_security
from app.analyzers.structure import analyze_structure
from app.analyzers.testing import analyze_testing
from app.config import SCORE_WEIGHTS
from app.database import save_project_analysis
from app.models.schemas import (
    AnalysisReport,
    Issue,
    ScoresBreakdown,
    Severity,
)
from app.utils.scoring import calculate_overall_health, get_health_status


def run_full_analysis(
    project_dir: Path,
    project_name: str,
    source_type: str = "upload",
    source_identifier: str = "",
) -> AnalysisReport:
    """Runs complete end-to-end static analysis pipeline on a project directory."""
    analysis_id = str(uuid.uuid4())
    created_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # 1. Project Type & Language Detection
    project_type, languages = detect_project_type_and_languages(project_dir)

    # 2. File Structure Analysis
    structure = analyze_structure(project_dir)

    all_issues: List[Issue] = []

    # 3. Build Analysis
    build_result, build_issues = analyze_build_health(project_dir, project_type)
    all_issues.extend(build_issues)

    # 4. Security Analysis
    security_result, security_issues = analyze_security(project_dir)
    all_issues.extend(security_issues)

    # 5. Testing Analysis
    testing_result, testing_issues = analyze_testing(project_dir, structure.source_files_count)
    all_issues.extend(testing_issues)

    # 6. Dependency Analysis
    dependency_result, dep_issues = analyze_dependencies(project_dir)
    all_issues.extend(dep_issues)

    # 7. Performance Analysis
    performance_result, perf_issues = analyze_performance(project_dir)
    all_issues.extend(perf_issues)

    # 8. Documentation Analysis
    doc_result, doc_issues = analyze_documentation(project_dir)
    all_issues.extend(doc_issues)

    # Count Critical Issues
    critical_count = sum(1 for i in all_issues if i.severity == Severity.CRITICAL)

    # 9. Production Readiness
    prod_result, prod_issues, prod_status = analyze_production_readiness(
        project_dir=project_dir,
        security_score=security_result.score,
        build_score=build_result.score,
        testing_score=testing_result.score,
        critical_issues_count=critical_count,
    )
    all_issues.extend(prod_issues)

    # 10. Overall Health Score Calculation
    overall_score = calculate_overall_health(
        build_score=build_result.score,
        security_score=security_result.score,
        testing_score=testing_result.score,
        dependencies_score=dependency_result.score,
        performance_score=performance_result.score,
        documentation_score=doc_result.score,
        production_score=prod_result.score,
        weights=SCORE_WEIGHTS,
    )

    health_status = get_health_status(overall_score, critical_issues_count=critical_count)

    scores = ScoresBreakdown(
        overall=overall_score,
        build=build_result.score,
        security=security_result.score,
        testing=testing_result.score,
        dependencies=dependency_result.score,
        performance=performance_result.score,
        documentation=doc_result.score,
        production_readiness=prod_result.score,
    )

    # Prioritize Recommended Actions
    actions: List[str] = []
    if critical_count > 0:
        actions.append(f"Remediate {critical_count} critical security vulnerabilities and purge exposed credentials.")
    for rec in security_result.recommendations:
        if rec not in actions:
            actions.append(rec)
    for rec in build_result.recommendations:
        if rec not in actions:
            actions.append(rec)
    for rec in testing_result.recommendations:
        if rec not in actions:
            actions.append(rec)
    for rec in prod_result.recommendations:
        if rec not in actions:
            actions.append(rec)
    for rec in dependency_result.recommendations:
        if rec not in actions:
            actions.append(rec)

    # Generate Executive Summary
    summary_parts = [
        f"DevHealth completed static audit for '{project_name}' ({project_type}).",
        f"The project received an overall health rating of {overall_score}/100 ({health_status.value}), with production readiness classified as {prod_status.value}.",
    ]
    if critical_count > 0:
        summary_parts.append(f"ATTENTION: {critical_count} critical security issue(s) were flagged, including potential leaked tokens or dangerous command executions.")
    else:
        summary_parts.append("No critical secrets or command injection vulnerabilities were detected.")

    if testing_result.score < 50:
        summary_parts.append("Testing coverage is severely lacking and requires immediate expansion.")
    elif testing_result.score >= 80:
        summary_parts.append("Testing architecture is solid with dedicated test suites detected.")

    executive_summary = " ".join(summary_parts)

    report = AnalysisReport(
        id=analysis_id,
        project_name=project_name,
        source_type=source_type,
        source_identifier=source_identifier,
        created_at=created_at,
        project_type=project_type,
        languages=languages,
        status=health_status,
        production_status=prod_status,
        scores=scores,
        structure=structure,
        build_health=build_result,
        security=security_result,
        testing=testing_result,
        dependencies=dependency_result,
        performance=performance_result,
        documentation=doc_result,
        production=prod_result,
        issues=all_issues,
        recommended_actions=actions[:8],
        executive_summary=executive_summary,
    )

    # Persist report in SQLite
    save_project_analysis(report.model_dump())

    return report
