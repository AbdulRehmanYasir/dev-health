import React from "react";
import {
  RotateCcw,
  Trash2,
  Sparkles,
  UploadCloud,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearActiveAudit: () => void;
  onResetToDefaultSample: () => void;
  onFactoryResetAll: () => void;
  hasActiveReport: boolean;
  historyCount: number;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onClearActiveAudit,
  onResetToDefaultSample,
  onFactoryResetAll,
  hasActiveReport,
  historyCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                Reset Workspace
              </h3>
              <p className="text-[11px] text-slate-400">
                Choose how you would like to reset DevHealth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 space-y-3">
          {/* Option 1: Clear current active audit and start fresh */}
          <button
            onClick={() => {
              onClearActiveAudit();
              onClose();
            }}
            disabled={!hasActiveReport}
            className="w-full p-4 rounded-xl border border-slate-800 hover:border-cyan-500/50 bg-slate-950/50 hover:bg-slate-800/60 text-left transition-all group disabled:opacity-40 disabled:pointer-events-none"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 font-mono transition-colors">
                  Clear Active Project & Start Fresh
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Unloads the currently active audit report and opens the clean scanner view to upload a new ZIP or GitHub repository.
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Reset to default sample project */}
          <button
            onClick={() => {
              onResetToDefaultSample();
              onClose();
            }}
            className="w-full p-4 rounded-xl border border-slate-800 hover:border-cyan-500/50 bg-slate-950/50 hover:bg-slate-800/60 text-left transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 font-mono transition-colors">
                  Reset to Default Demo Sample (Rayva Cloud)
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Restores the baseline pre-loaded repository fixture so you can explore full metrics, issues, and trees right away.
                </p>
              </div>
            </div>
          </button>

          {/* Option 3: Factory Reset All (Audit + History) */}
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to purge all audit records and reset DevHealth to its initial state?"
                )
              ) {
                onFactoryResetAll();
                onClose();
              }
            }}
            className="w-full p-4 rounded-xl border border-rose-900/40 hover:border-rose-500/60 bg-rose-950/10 hover:bg-rose-950/30 text-left transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 font-mono transition-colors flex items-center gap-1.5">
                  <span>Factory Reset (Clear Audit & All History)</span>
                  {historyCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-900/50 text-rose-300">
                      {historyCount} saved
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Deletes all locally saved audit logs, clears active projects, and restores pristine first-launch settings.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] font-mono text-slate-500 px-5">
          <span>DevHealth Static Analysis Sandbox</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
