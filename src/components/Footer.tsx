import React from "react";
import { Activity, ShieldCheck, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 mt-auto py-5 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left / Brand Info */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <div className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity className="w-3 h-3" />
          </div>
          <span className="font-mono font-bold text-slate-300 tracking-wider uppercase">
            DevHealth
          </span>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
          <span className="text-slate-400 font-normal hidden sm:inline">
            Know Your Project Before Production Does
          </span>
        </div>

        {/* Center / Right: Required Footer Credit */}
        <div className="flex items-center gap-1.5 font-sans text-slate-300">
          <span>Built with ❤️ by Abdul Rehman Yasir</span>
        </div>

        {/* Right / Status Pill */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Zero Leaks Safe
          </span>
          <span>&bull;</span>
          <span>FastAPI + React</span>
        </div>
      </div>
    </footer>
  );
};
