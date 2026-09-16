import React from "react";
import {
  Activity,
  AlertTriangle,
  FileCode,
  FolderTree,
  History,
  FileText,
  UploadCloud,
  Code2,
  Terminal,
  RotateCcw,
  Shield,
  CheckCircle2,
  Layers,
  Sliders,
  Rocket,
} from "lucide-react";
import { AnalysisReport } from "../types/analyzer";

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  report: AnalysisReport | null;
  onNewAuditClick: () => void;
  onOpenPythonModal: () => void;
  onResetClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  report,
  onNewAuditClick,
  onOpenPythonModal,
  onResetClick,
}) => {
  const criticalCount = report?.issues.filter((i) => i.severity === "CRITICAL").length || 0;
  const totalIssues = report?.issues.length || 0;

  const handleTabClick = (tab: string) => {
    // Idempotent: avoid re-running if clicking the active tab
    if (currentTab !== tab) {
      setCurrentTab(tab);
    }
  };

  const auditViews = [
    { key: "dashboard", label: "Dashboard", icon: Activity },
    { key: "issues", label: "Issues", icon: AlertTriangle },
    { key: "tree", label: "Project Tree", icon: FolderTree },
    { key: "security", label: "Security", icon: Shield },
    { key: "dependencies", label: "Dependencies", icon: Layers },
    { key: "testing", label: "Testing", icon: CheckCircle2 },
    { key: "performance", label: "Performance", icon: Sliders },
    { key: "documentation", label: "Documentation", icon: FileCode },
    { key: "production", label: "Production Readiness", icon: Rocket },
    { key: "build", label: "Build Health", icon: Terminal },
    { key: "report", label: "Full Report", icon: FileText },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTabClick("dashboard")}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/60 transition-colors">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm tracking-widest text-slate-100 uppercase">
                    DevHealth
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    v1.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 tracking-tight hidden sm:block">
                  Know Your Project Before Production Does
                </p>
              </div>
            </button>
          </div>

          {/* Top-Level Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleTabClick("dashboard")}
              title="Dashboard"
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === "dashboard"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick("issues")}
              title="Discovered Issues"
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 relative ${
                currentTab === "issues"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Issues</span>
              {totalIssues > 0 && (
                <span
                  className={`ml-0.5 sm:ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    criticalCount > 0
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {totalIssues}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick("tree")}
              title="Project File System Tree"
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === "tree"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Project Tree</span>
              <span className="hidden sm:inline md:hidden">Tree</span>
            </button>

            <button
              onClick={() => handleTabClick("report")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === "report"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>

            <button
              onClick={() => handleTabClick("history")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === "history"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">History</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onResetClick}
              title="Reset Workspace / Clear Project"
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800 hover:border-rose-500/40 hover:text-rose-400 hover:bg-rose-950/20 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={onOpenPythonModal}
              title="Inspect Python 3.11 + FastAPI Server Code"
              className="px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">FastAPI Backend</span>
            </button>

            <button
              onClick={onNewAuditClick}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-900/30"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audit Project</span>
              <span className="sm:hidden">Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Navigation Sub-bar (Direct access to all categories and views) */}
      {report && (
        <div className="border-t border-slate-800/80 bg-slate-950/90 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800/80 touch-pan-x">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-w-max">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">
                Audit Views:
              </span>
              {auditViews.map((item) => {
                const ItemIcon = item.icon;
                const isActive = currentTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabClick(item.key)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-950/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <ItemIcon className="w-3 h-3" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-800/80 text-[11px] font-mono shrink-0">
              <span className="text-slate-400 font-semibold truncate max-w-[160px]">
                {report.projectName}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
                {report.scores.overall}/100
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
