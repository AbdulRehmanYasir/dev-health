import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  FileCode,
  Layers,
  Rocket,
  Shield,
  ShieldAlert,
  Sliders,
  Terminal,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { AnalysisReport, Issue, Severity } from "../types/analyzer";

interface DashboardProps {
  report: AnalysisReport;
  onSelectCategory: (category: string) => void;
  onSelectIssue: (issue: Issue) => void;
  onResetClick?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  report,
  onSelectCategory,
  onSelectIssue,
  onResetClick,
}) => {
  const { scores } = report;

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "NEEDS ATTENTION":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "AT RISK":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "CRITICAL":
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 65) return "text-amber-400";
    if (score >= 50) return "text-orange-400";
    return "text-rose-400";
  };

  const criticalIssues = report.issues.filter((i) => i.severity === "CRITICAL");
  const highIssues = report.issues.filter((i) => i.severity === "HIGH");

  const categories = [
    {
      key: "Build",
      title: "Build Health",
      score: scores.build,
      weight: "20%",
      checks: report.buildHealth.checks,
      icon: Terminal,
    },
    {
      key: "Security",
      title: "Security",
      score: scores.security,
      weight: "25%",
      checks: report.security.checks,
      icon: Shield,
    },
    {
      key: "Testing",
      title: "Testing",
      score: scores.testing,
      weight: "15%",
      checks: report.testing.checks,
      icon: CheckCircle2,
    },
    {
      key: "Dependencies",
      title: "Dependencies",
      score: scores.dependencies,
      weight: "15%",
      checks: report.dependencies.checks,
      icon: Layers,
    },
    {
      key: "Performance",
      title: "Performance",
      score: scores.performance,
      weight: "10%",
      checks: report.performance.checks,
      icon: Sliders,
    },
    {
      key: "Documentation",
      title: "Documentation",
      score: scores.documentation,
      weight: "10%",
      checks: report.documentation.checks,
      icon: FileCode,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Project Meta Bar */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-100 font-mono break-all sm:break-normal">
              {report.projectName}
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-cyan-400 border border-slate-700">
              {report.projectType}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                report.status
              )}`}
            >
              {report.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-400">
            <span>
              Source: <strong className="text-slate-300">{report.sourceType}</strong>
              {report.sourceIdentifier && ` (${report.sourceIdentifier})`}
            </span>
            <span>&bull;</span>
            <span>
              Files Scanned: <strong className="text-slate-300">{report.structure.totalFiles}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Languages:{" "}
              <strong className="text-slate-300">
                {report.languages.join(", ")}
              </strong>
            </span>
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 font-mono shrink-0 flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-1 justify-start md:justify-end">
            <Clock className="w-3.5 h-3.5" />
            <span>{report.createdAt}</span>
          </div>
          {onResetClick && (
            <button
              onClick={onResetClick}
              title="Reset Workspace / Clear Project"
              className="px-2.5 py-1 rounded text-xs font-mono font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/40 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Scores Section: Overall Health + Production Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Central Overall Health Gauge Card */}
        <div className="md:col-span-2 p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 justify-center sm:justify-start">
              <Activity className="w-4 h-4 text-cyan-400" />
              Overall Project Health
            </span>
            <div className="flex items-baseline gap-3 justify-center sm:justify-start">
              <span
                className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${getScoreColor(
                  scores.overall
                )}`}
              >
                {scores.overall}
              </span>
              <span className="text-xl font-mono text-slate-500">/ 100</span>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Weighted composite evaluating Build (20%), Security (25%), Testing (15%), Dependencies (15%), Performance (10%), Documentation (10%), and Production Readiness (5%).
            </p>
          </div>

          {/* Radial progress ring */}
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-slate-800"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className={`transition-all duration-1000 ${
                  scores.overall >= 80
                    ? "stroke-emerald-500"
                    : scores.overall >= 65
                    ? "stroke-amber-500"
                    : scores.overall >= 50
                    ? "stroke-orange-500"
                    : "stroke-rose-500"
                }`}
                strokeWidth="10"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * scores.overall) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-mono font-bold text-slate-300">
                {report.status}
              </span>
            </div>
          </div>
        </div>

        {/* Production Readiness Status Card */}
        <div
          onClick={() => onSelectCategory("Production")}
          className="p-6 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 group-hover:text-cyan-400 transition-colors">
                <Rocket className="w-4 h-4 text-cyan-400" />
                Production Readiness
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1 rounded text-xs font-bold font-mono border ${
                  report.productionStatus === "PRODUCTION READY"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : report.productionStatus === "READY WITH IMPROVEMENTS"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                {report.productionStatus}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Evaluates container specifications, CI/CD workflows, configuration safety, error guards, and critical blockers.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Readiness Score:</span>
            <span className="font-bold text-slate-200">
              {scores.productionReadiness} / 100
            </span>
          </div>
        </div>
      </div>

      {/* 6 Category Health Score Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Category Health Breakdown
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Click any category to view full audit &amp; issues
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const passedChecks = cat.checks.filter((c) => c.passed).length;
            const totalChecks = cat.checks.length;

            return (
              <div
                key={cat.key}
                onClick={() => onSelectCategory(cat.key)}
                className="p-5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                          {cat.title}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Weight: {cat.weight}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-2xl font-black font-mono ${getScoreColor(
                          cat.score
                        )}`}
                      >
                        {cat.score}
                      </span>
                    </div>
                  </div>

                  {/* Top Checks list */}
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-800/80">
                    {cat.checks.slice(0, 3).map((chk, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 text-[11px] leading-tight"
                      >
                        {chk.passed ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        ) : chk.isWarning ? (
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={
                            chk.passed ? "text-slate-400" : "text-slate-200 font-medium"
                          }
                        >
                          {chk.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                  <span>
                    {passedChecks}/{totalChecks} Passed
                  </span>
                  <div className="flex items-center gap-0.5">
                    <span>Explore issues</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical & High Issues Priority Section */}
      {(criticalIssues.length > 0 || highIssues.length > 0) && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                Priority Action Items ({criticalIssues.length} Critical, {highIssues.length} High)
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Immediate developer intervention required
            </span>
          </div>

          <div className="space-y-2.5">
            {[...criticalIssues, ...highIssues].slice(0, 5).map((issue) => (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className="p-3.5 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        issue.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                      {issue.title}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                    <span>{issue.file}</span>
                    {issue.line && <span>Line {issue.line}</span>}
                    <span>&bull;</span>
                    <span className="text-slate-500">{issue.category}</span>
                  </div>
                </div>

                <div className="text-xs font-mono text-cyan-400 flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
                  <span>View Fix</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions Roadmap */}
      {report.recommendedActions.length > 0 && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
              Recommended Remediation Roadmap
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.recommendedActions.map((action, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300"
              >
                <span className="w-5 h-5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Summary */}
      <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 leading-relaxed font-mono">
        <strong className="text-slate-300 uppercase block mb-1">
          Executive Summary:
        </strong>
        {report.executiveSummary}
      </div>
    </div>
  );
};
