import React, { useState, useMemo } from "react";
import {
  Shield,
  Terminal,
  CheckCircle2,
  Layers,
  Sliders,
  FileCode,
  Rocket,
  ArrowLeft,
  AlertTriangle,
  XCircle,
  Check,
  Copy,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  AnalysisReport,
  Category,
  CategoryResult,
  Issue,
  Severity,
} from "../types/analyzer";

interface CategoryDetailViewProps {
  report: AnalysisReport;
  category: Category;
  onNavigateCategory: (cat: Category) => void;
  onBackToDashboard: () => void;
  onSelectIssue: (issue: Issue) => void;
}

const CATEGORY_CONFIG: Record<
  Category,
  {
    title: string;
    description: string;
    weight: string;
    icon: React.ElementType;
    getCategoryResult: (report: AnalysisReport) => CategoryResult;
  }
> = {
  Build: {
    title: "Build Health",
    description: "Static audit of build configuration, scripts, lockfiles, and compiler settings.",
    weight: "20%",
    icon: Terminal,
    getCategoryResult: (r) => r.buildHealth,
  },
  Security: {
    title: "Security & Secrets",
    description: "Deep regex heuristics scanning for leaked API keys, tokens, and unsafe patterns.",
    weight: "25%",
    icon: Shield,
    getCategoryResult: (r) => r.security,
  },
  Testing: {
    title: "Testing Maturity",
    description: "Test framework detection, test-to-source file ratios, and coverage setup verification.",
    weight: "15%",
    icon: CheckCircle2,
    getCategoryResult: (r) => r.testing,
  },
  Dependencies: {
    title: "Dependency Hygiene",
    description: "Audit of pinned dependencies, manifest health, wildcard versions, and lockfile presence.",
    weight: "15%",
    icon: Layers,
    getCategoryResult: (r) => r.dependencies,
  },
  Performance: {
    title: "Performance Indicators",
    description: "Evaluation of bundle size hazards, large source files, unoptimized assets, and heavy modules.",
    weight: "10%",
    icon: Sliders,
    getCategoryResult: (r) => r.performance,
  },
  Documentation: {
    title: "Documentation Quality",
    description: "Verification of README presence, installation instructions, license, and architectural docs.",
    weight: "10%",
    icon: FileCode,
    getCategoryResult: (r) => r.documentation,
  },
  Production: {
    title: "Production Readiness",
    description: "Pre-deployment checks: containerization, environment security, CI/CD pipelines, and health gates.",
    weight: "5%",
    icon: Rocket,
    getCategoryResult: (r) => r.production,
  },
};

const ALL_CATEGORIES: Category[] = [
  "Build",
  "Security",
  "Testing",
  "Dependencies",
  "Performance",
  "Documentation",
  "Production",
];

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  report,
  category,
  onNavigateCategory,
  onBackToDashboard,
  onSelectIssue,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Security;
  const Icon = config.icon;
  const result = config.getCategoryResult(report);

  // Filter issues belonging to this category
  const categoryIssues = useMemo(() => {
    return report.issues.filter((i) => i.category === category);
  }, [report.issues, category]);

  const filteredIssues = useMemo(() => {
    return categoryIssues.filter((issue) => {
      if (severityFilter !== "ALL" && issue.severity !== severityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          issue.title.toLowerCase().includes(q) ||
          issue.file.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          (issue.codeSnippet && issue.codeSnippet.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [categoryIssues, severityFilter, searchQuery]);

  const copySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 65) return "text-amber-400";
    if (score >= 50) return "text-orange-400";
    return "text-rose-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    if (score >= 65) return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    if (score >= 50) return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    return "bg-rose-500/10 border-rose-500/30 text-rose-400";
  };

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "LOW":
        return "bg-slate-700/50 text-slate-300 border-slate-600/40";
      case "INFO":
      default:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    }
  };

  const passedChecksCount = result.checks.filter((c) => c.passed).length;
  const warningChecksCount = result.checks.filter((c) => c.isWarning).length;
  const failedChecksCount = result.checks.filter((c) => !c.passed && !c.isWarning).length;

  return (
    <div className="space-y-6">
      {/* Top Navigation / Breadcrumbs & Category Switcher */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBackToDashboard}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Audit Category:
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
              {config.title}
            </span>
          </div>
        </div>

        {/* Quick Category Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-800/80">
          <span className="text-xs font-mono text-slate-500 mr-1">Switch:</span>
          {ALL_CATEGORIES.map((catKey) => {
            const catConf = CATEGORY_CONFIG[catKey];
            const CatIcon = catConf.icon;
            const isCurrent = catKey === category;
            const catResult = catConf.getCategoryResult(report);

            return (
              <button
                key={catKey}
                onClick={() => onNavigateCategory(catKey)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 border border-slate-700/60"
                }`}
              >
                <CatIcon className="w-3 h-3" />
                <span>{catConf.title}</span>
                <span
                  className={`text-[10px] px-1 rounded font-bold ${
                    isCurrent ? "bg-slate-950/30 text-slate-950" : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {catResult.score}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Overview Card */}
      <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold font-mono text-slate-100">
                {config.title}
              </h1>
              <span className="text-xs font-mono text-slate-400">
                Overall Health Contribution Weight: <strong>{config.weight}</strong>
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* Score & Checks Summary */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center md:text-right">
            <div className="flex items-baseline gap-1.5 justify-center md:justify-end">
              <span
                className={`text-5xl font-black font-mono tracking-tight ${getScoreColor(
                  result.score
                )}`}
              >
                {result.score}
              </span>
              <span className="text-lg font-mono text-slate-500">/ 100</span>
            </div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border mt-1 ${getScoreBg(
                result.score
              )}`}
            >
              {result.score >= 80
                ? "HEALTHY"
                : result.score >= 65
                ? "ACCEPTABLE"
                : result.score >= 50
                ? "NEEDS ATTENTION"
                : "AT RISK"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{passedChecksCount} Passed</span>
            </div>
            {warningChecksCount > 0 && (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{warningChecksCount} Warnings</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>{failedChecksCount} Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Checks List + Metrics & Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Checks List */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Static Verification Checks ({result.checks.length})
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Deterministic Rules
            </span>
          </div>

          <div className="space-y-2.5">
            {result.checks.map((chk, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0">
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : chk.isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        chk.passed
                          ? "text-slate-200"
                          : chk.isWarning
                          ? "text-amber-200"
                          : "text-rose-200"
                      }`}
                    >
                      {chk.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        chk.passed
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : chk.isWarning
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {chk.passed ? "PASSED" : chk.isWarning ? "WARNING" : "FAILED"}
                    </span>
                  </div>
                  {chk.details && (
                    <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                      {chk.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Key Metrics & Recommendations */}
        <div className="space-y-4">
          {/* Key Metrics */}
          {result.metrics && Object.keys(result.metrics).length > 0 && (
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3">
                Key Metrics
              </h3>
              <div className="space-y-2">
                {Object.entries(result.metrics).map(([mKey, mVal]) => (
                  <div
                    key={mKey}
                    className="flex items-center justify-between text-xs font-mono p-2 rounded bg-slate-950/40 border border-slate-800/80"
                  >
                    <span className="text-slate-400 capitalize">
                      {mKey.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="text-cyan-400 font-bold">
                      {typeof mVal === "boolean"
                        ? mVal
                          ? "Yes"
                          : "No"
                        : String(mVal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Recommendations
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {result.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded bg-slate-950/40 border border-slate-800/60 leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-cyan-400 font-bold">&bull;</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Category Specific Issues Section */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
              Issues Detected in {config.title} ({categoryIssues.length})
            </h2>
            <p className="text-xs text-slate-400">
              Filtered specifically to {category.toLowerCase()} findings.
            </p>
          </div>

          {/* Search & Severity Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter category issues..."
                className="pl-8 pr-3 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    severityFilter === sev
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center rounded-lg bg-slate-950/40 border border-slate-800/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-200">
              No Issues Found in {config.title}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {categoryIssues.length === 0
                ? "This category passed all security and health checks cleanly."
                : "No issues match the selected severity or search filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadge(
                        issue.severity
                      )}`}
                    >
                      {issue.severity}
                    </span>
                    <h3 className="text-xs font-bold text-slate-100">
                      {issue.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {issue.id}
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1 rounded border border-slate-800/80 flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-slate-200">{issue.file}</span>
                  {issue.line && (
                    <span className="text-cyan-400">Line {issue.line}</span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {issue.description}
                </p>

                {issue.codeSnippet && (
                  <div className="relative group">
                    <pre className="p-3 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                      <code>{issue.codeSnippet}</code>
                    </pre>
                    <button
                      onClick={() => copySnippet(issue.id, issue.codeSnippet!)}
                      title="Copy snippet"
                      className="absolute top-2 right-2 p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedId === issue.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/60">
                    <span className="font-mono font-bold text-[10px] text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> Why It Matters:
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {issue.whyItMatters}
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-emerald-950/10 border border-emerald-500/20">
                    <span className="font-mono font-bold text-[10px] text-emerald-400 uppercase flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Recommended Fix:
                    </span>
                    <p className="text-emerald-200/90 leading-relaxed text-[11px]">
                      {issue.recommendedFix}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
