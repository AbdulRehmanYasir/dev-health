"""DevHealth Data Models.
Provides Pydantic models with zero-dependency fallback for pure standard library environments.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

try:
    from pydantic import BaseModel, Field
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False

    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self) -> Dict[str, Any]:
            res = {}
            for k, v in self.__dict__.items():
                if hasattr(v, "model_dump"):
                    res[k] = v.model_dump()
                elif isinstance(v, list):
                    res[k] = [item.model_dump() if hasattr(item, "model_dump") else item for item in v]
                elif isinstance(v, Enum):
                    res[k] = v.value
                else:
                    res[k] = v
            return res

    def Field(*args, **kwargs):
        default = kwargs.get("default", None)
        default_factory = kwargs.get("default_factory", None)
        if default_factory is not None:
            return default_factory()
        return default


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class Category(str, Enum):
    SECURITY = "Security"
    BUILD = "Build"
    TESTING = "Testing"
    DEPENDENCIES = "Dependencies"
    PERFORMANCE = "Performance"
    DOCUMENTATION = "Documentation"
    PRODUCTION = "Production"


class HealthStatus(str, Enum):
    HEALTHY = "HEALTHY"
    NEEDS_ATTENTION = "NEEDS ATTENTION"
    AT_RISK = "AT RISK"
    CRITICAL = "CRITICAL"


class ProductionStatus(str, Enum):
    PRODUCTION_READY = "PRODUCTION READY"
    READY_WITH_IMPROVEMENTS = "READY WITH IMPROVEMENTS"
    NEEDS_WORK = "NEEDS WORK"
    NOT_READY = "NOT READY"


class Issue(BaseModel):
    id: str
    title: str
    severity: Severity
    category: Category
    file: str
    line: Optional[int] = None
    code_snippet: Optional[str] = None
    description: str
    why_it_matters: str
    recommended_fix: str

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.id = kwargs.get("id", "")
            self.title = kwargs.get("title", "")
            self.severity = kwargs.get("severity", Severity.INFO)
            self.category = kwargs.get("category", Category.SECURITY)
            self.file = kwargs.get("file", "")
            self.line = kwargs.get("line")
            self.code_snippet = kwargs.get("code_snippet")
            self.description = kwargs.get("description", "")
            self.why_it_matters = kwargs.get("why_it_matters", "")
            self.recommended_fix = kwargs.get("recommended_fix", "")


class CheckItem(BaseModel):
    label: str
    passed: bool
    is_warning: bool = False
    details: Optional[str] = None

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.label = kwargs.get("label", "")
            self.passed = kwargs.get("passed", False)
            self.is_warning = kwargs.get("is_warning", False)
            self.details = kwargs.get("details")


class CategoryResult(BaseModel):
    score: int
    checks: List[CheckItem] = Field(default_factory=list)
    findings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.score = kwargs.get("score", 100)
            self.checks = kwargs.get("checks", [])
            self.findings = kwargs.get("findings", [])
            self.recommendations = kwargs.get("recommendations", [])
            self.metrics = kwargs.get("metrics", {})


class TreeNode(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: int = 0
    children: Optional[List["TreeNode"]] = None

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.name = kwargs.get("name", "")
            self.path = kwargs.get("path", "")
            self.is_dir = kwargs.get("is_dir", False)
            self.size = kwargs.get("size", 0)
            self.children = kwargs.get("children")


class ProjectStructure(BaseModel):
    total_files: int
    total_dirs: int
    source_files_count: int
    test_files_count: int
    config_files_count: int
    doc_files_count: int
    large_files: List[Dict[str, Any]] = Field(default_factory=list)
    suspicious_files: List[Dict[str, Any]] = Field(default_factory=list)
    env_files: List[str] = Field(default_factory=list)
    tree: TreeNode
    languages: Dict[str, int] = Field(default_factory=dict)
    primary_language: str = "Unknown"

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.total_files = kwargs.get("total_files", 0)
            self.total_dirs = kwargs.get("total_dirs", 0)
            self.source_files_count = kwargs.get("source_files_count", 0)
            self.test_files_count = kwargs.get("test_files_count", 0)
            self.config_files_count = kwargs.get("config_files_count", 0)
            self.doc_files_count = kwargs.get("doc_files_count", 0)
            self.large_files = kwargs.get("large_files", [])
            self.suspicious_files = kwargs.get("suspicious_files", [])
            self.env_files = kwargs.get("env_files", [])
            self.tree = kwargs.get("tree")
            self.languages = kwargs.get("languages", {})
            self.primary_language = kwargs.get("primary_language", "Unknown")


class ScoresBreakdown(BaseModel):
    overall: int
    build: int
    security: int
    testing: int
    dependencies: int
    performance: int
    documentation: int
    production_readiness: int

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.overall = kwargs.get("overall", 0)
            self.build = kwargs.get("build", 0)
            self.security = kwargs.get("security", 0)
            self.testing = kwargs.get("testing", 0)
            self.dependencies = kwargs.get("dependencies", 0)
            self.performance = kwargs.get("performance", 0)
            self.documentation = kwargs.get("documentation", 0)
            self.production_readiness = kwargs.get("production_readiness", 0)


class AnalysisReport(BaseModel):
    id: str
    project_name: str
    source_type: str = "upload"
    source_identifier: Optional[str] = None
    created_at: str
    project_type: str
    languages: List[str]
    status: HealthStatus
    production_status: ProductionStatus
    scores: ScoresBreakdown
    structure: ProjectStructure
    build_health: CategoryResult
    security: CategoryResult
    testing: CategoryResult
    dependencies: CategoryResult
    performance: CategoryResult
    documentation: CategoryResult
    production: CategoryResult
    issues: List[Issue] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    executive_summary: str

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            for k, v in kwargs.items():
                setattr(self, k, v)


class GitHubAnalyzeRequest(BaseModel):
    github_url: str = Field(..., description="Public GitHub repository URL")

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.github_url = kwargs.get("github_url", "")


class HistoryItem(BaseModel):
    id: str
    name: str
    source_type: str
    project_type: str
    created_at: str
    overall_score: int
    build_score: int
    security_score: int
    testing_score: int
    dependencies_score: int
    performance_score: int
    documentation_score: int
    production_score: int
    status: str
    issue_count: int
    critical_issue_count: int

    if not HAS_PYDANTIC:
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            for k, v in kwargs.items():
                setattr(self, k, v)
