"""DevHealth Scoring Calculator and Status Determination.
Implements the configured weighting matrix and status classifications.
"""

from typing import Dict
from app.config import SCORE_WEIGHTS
from app.models.schemas import HealthStatus, ProductionStatus, ScoresBreakdown


def calculate_overall_health(
    build_score: int,
    security_score: int,
    testing_score: int,
    dependencies_score: int,
    performance_score: int,
    documentation_score: int,
    production_score: int,
    weights: Dict[str, float] = SCORE_WEIGHTS,
) -> int:
    """Calculate overall weighted score from 0 to 100."""
    weighted = (
        build_score * weights.get("build", 0.20)
        + security_score * weights.get("security", 0.25)
        + testing_score * weights.get("testing", 0.15)
        + dependencies_score * weights.get("dependencies", 0.15)
        + performance_score * weights.get("performance", 0.10)
        + documentation_score * weights.get("documentation", 0.10)
        + production_score * weights.get("production_readiness", 0.05)
    )
    return max(0, min(100, int(round(weighted))))


def get_health_status(overall_score: int, critical_issues_count: int = 0) -> HealthStatus:
    """Determine high-level health status."""
    if critical_issues_count > 2 or overall_score < 50:
        return HealthStatus.CRITICAL
    if critical_issues_count > 0 or overall_score < 68:
        return HealthStatus.AT_RISK
    if overall_score < 80:
        return HealthStatus.NEEDS_ATTENTION
    return HealthStatus.HEALTHY


def get_production_status(prod_score: int, critical_issues_count: int = 0) -> ProductionStatus:
    """Determine production readiness classification."""
    if critical_issues_count > 0 or prod_score < 50:
        return ProductionStatus.NOT_READY
    if prod_score < 72:
        return ProductionStatus.NEEDS_WORK
    if prod_score < 88:
        return ProductionStatus.READY_WITH_IMPROVEMENTS
    return ProductionStatus.PRODUCTION_READY
