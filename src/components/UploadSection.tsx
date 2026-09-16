import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Github,
  ShieldCheck,
  AlertCircle,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { SAMPLE_PROJECTS, SampleProjectFixture } from "../engine/sampleProjects";
import { runStaticAudit } from "../engine/staticAnalyzer";
import { AnalysisReport } from "../types/analyzer";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface UploadSectionProps {
  onAuditComplete: (report: AnalysisReport) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  progressPercent: number;
  setProgressPercent: (pct: number) => void;
  progressText: string;
  setProgressText: (text: string) => void;
}

/**
 * Convert API response keys from snake_case to camelCase.
 *
 * Example:
 * project_name      -> projectName
 * build_health      -> buildHealth
 * production_status -> productionStatus
 * recommended_actions -> recommendedActions
 */
const camelizeKeys = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(camelizeKeys);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        camelizeKeys(val),
      ])
    );
  }

  return value;
};

/**
 * Normalize a backend AnalysisReport into the frontend AnalysisReport shape.
 */
const normalizeApiReport = (data: any): AnalysisReport => {
  return camelizeKeys(data) as AnalysisReport;
};

export const UploadSection: React.FC<UploadSectionProps> = ({
  onAuditComplete,
  isLoading,
  setIsLoading,
  progressPercent,
  setProgressPercent,
  progressText,
  setProgressText,
}) => {
  const [githubUrl, setGithubUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setErrorMessage("Please select a standard .zip archive file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("ZIP archive exceeds the maximum 50MB limit.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setProgressPercent(5);
    setProgressText("Uploading project archive...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgressPercent(20);
      setProgressText("Sending project to DevHealth backend...");

      const response = await fetch(`${API_BASE_URL}/api/analyze/upload`, {
        method: "POST",
        body: formData,
      });

      setProgressPercent(70);
      setProgressText(
        "Running security & production readiness analysis..."
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.error || "Failed to analyze ZIP archive."
        );
      }

      const normalizedReport = normalizeApiReport(data);

      setProgressPercent(100);
      setProgressText("Audit complete!");

      await new Promise((r) => setTimeout(r, 250));

      onAuditComplete(normalizedReport);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to analyze ZIP archive.");
      setProgressPercent(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!githubUrl.trim()) return;

    setErrorMessage(null);
    setIsLoading(true);
    setProgressPercent(10);
    setProgressText("Connecting to DevHealth backend...");

    try {
      setProgressPercent(25);
      setProgressText("Fetching public GitHub repository...");

      const response = await fetch(`${API_BASE_URL}/api/analyze/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          github_url: githubUrl.trim(),
        }),
      });

      setProgressPercent(70);
      setProgressText("Analyzing source code and dependencies...");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            "Could not analyze GitHub repository."
        );
      }

      const normalizedReport = normalizeApiReport(data);

      setProgressPercent(100);
      setProgressText("Audit complete!");

      await new Promise((r) => setTimeout(r, 250));

      onAuditComplete(normalizedReport);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          "Could not analyze GitHub repository. Verify that the URL is public."
      );
      setProgressPercent(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleSelect = async (sample: SampleProjectFixture) => {
    setErrorMessage(null);
    setIsLoading(true);
    setProgressPercent(20);
    setProgressText(`Loading fixture: ${sample.name}...`);

    await new Promise((r) => setTimeout(r, 250));

    setProgressPercent(60);
    setProgressText(
      "Running security regex heuristics & AST pattern scans..."
    );

    await new Promise((r) => setTimeout(r, 200));

    const report = runStaticAudit(
      sample.files,
      sample.name,
      "sample",
      sample.tagline
    );

    setProgressPercent(100);
    setProgressText("Audit complete!");

    await new Promise((r) => setTimeout(r, 250));

    onAuditComplete(report);
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Hero Badge & Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Execution Sandbox &bull; Static Analysis Only</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Audit Repository Health & Production Readiness
        </h1>

        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
          Upload a project archive or enter a public GitHub URL to inspect
          build configuration, detect exposed secrets, test coverage, and
          dependency vulnerabilities.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />

          <div className="flex-1">
            <span className="font-semibold">Analysis Failed:</span>{" "}
            {errorMessage}
          </div>

          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Loading Progress Bar */}
      {isLoading ? (
        <div className="p-8 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4 animate-spin" />
              {progressText}
            </span>

            <span className="text-xs font-mono text-slate-400">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Safe Extraction
            </div>

            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              AST Regex Scans
            </div>

            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Secret Masking
            </div>

            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Health Scoring
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ingestion Panel: Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Drag & Drop ZIP */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);

                if (e.dataTransfer.files?.[0]) {
                  handleZipFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                isDragging
                  ? "border-cyan-400 bg-cyan-950/20"
                  : "border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleZipFile(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-semibold text-slate-100">
                Upload Project ZIP
              </h3>

              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Drag & drop your repository archive here or browse files.
              </p>

              <span className="mt-3 inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium text-slate-500 bg-slate-800/80">
                Max 50MB &bull; .zip archives
              </span>
            </div>

            {/* 2. Public GitHub URL */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200">
                    <Github className="w-4 h-4" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Public GitHub Repository
                    </h3>

                    <p className="text-xs text-slate-400">
                      Direct scan without tokens or authentication.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleGithubSubmit}
                  className="mt-3 space-y-2"
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full pl-3 pr-8 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-600 font-mono"
                    />

                    {githubUrl && (
                      <button
                        type="button"
                        onClick={() => setGithubUrl("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 text-xs transition-colors p-0.5"
                        title="Clear URL input"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!githubUrl.trim()}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Audit GitHub Repository</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              <p className="text-[11px] text-slate-500 mt-3">
                Fetches and analyzes the public repository through the DevHealth
                backend.
              </p>
            </div>
          </div>

          {/* 3. Sample Repositories */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Or Select a Pre-Configured Sample Project</span>
              </div>

              <span className="text-[11px] text-slate-500">
                Instant audit demonstration
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_PROJECTS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSampleSelect(sample)}
                  className="p-3.5 rounded-lg border border-slate-800 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-900 transition-all text-left flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                        {sample.name}
                      </span>

                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {sample.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Audit Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};