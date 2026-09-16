import React from "react";
import {
  History,
  Activity,
  Trash2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import { AnalysisReport } from "../types/analyzer";

interface HistoryViewProps {
  history: AnalysisReport[];
  onSelectAudit: (report: AnalysisReport) => void;
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectAudit,
  onClearHistory,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Audit History & Trends
          </h2>
          <p className="text-xs text-slate-400">
            Timeline of past static project scans and health ratings.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/40 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* History Timeline Trend Graph */}
      {history.length > 1 && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Health Score Trend
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Last {history.length} audits
            </span>
          </div>

          <div className="h-32 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
            {history.slice(0, 10).map((audit, idx) => {
              const height = Math.max(15, (audit.scores.overall / 100) * 100);
              const color =
                audit.scores.overall >= 80
                  ? "bg-emerald-500"
                  : audit.scores.overall >= 65
                  ? "bg-amber-500"
                  : "bg-rose-500";
              return (
                <div
                  key={audit.id}
                  onClick={() => onSelectAudit(audit)}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                >
                  <span className="text-[10px] font-mono font-bold text-slate-300 group-hover:text-cyan-400 transition-colors">
                    {audit.scores.overall}
                  </span>
                  <div
                    className={`w-full max-w-[28px] rounded-t transition-all ${color} opacity-80 group-hover:opacity-100 group-hover:scale-y-105`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-500 truncate max-w-[40px]">
                    {audit.projectName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/80">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300">
            No Project Audits Recorded Yet
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Audits from uploaded ZIPs, GitHub URLs, or sample projects will be saved here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectAudit(item)}
              className="p-4 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-cyan-400 transition-colors font-mono">
                    {item.projectName}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                    {item.projectType}
                  </span>
                  <span
                    className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                      item.status === "HEALTHY"
                        ? "text-emerald-400 bg-emerald-500/10"
                        : item.status === "NEEDS ATTENTION"
                        ? "text-amber-400 bg-amber-500/10"
                        : "text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
                  <span>{item.createdAt}</span>
                  <span>&bull;</span>
                  <span>{item.issues.length} issues flagged</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-cyan-400">
                    {item.scores.overall}
                    <span className="text-xs font-mono text-slate-500"> / 100</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Overall Score
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
