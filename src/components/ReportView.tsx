import React from "react";
import {
  Printer,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowDownToLine,
} from "lucide-react";
import { AnalysisReport } from "../types/analyzer";

interface ReportViewProps {
  report: AnalysisReport;
}

export const ReportView: React.FC<ReportViewProps> = ({ report }) => {
  const { scores } = report;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    // Generate standalone self-contained HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DevHealth Audit Report — ${report.projectName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 40px 20px; line-height: 1.5; margin: 0; }
    .report-wrap { max-width: 880px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 36px; }
    h1, h2, h3 { color: #fff; margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
    .card { background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 14px; text-align: center; }
    .num { font-size: 28px; font-weight: 800; font-family: monospace; color: #38bdf8; }
    .lbl { font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-top: 4px; }
    .issue-box { border: 1px solid #334155; border-radius: 6px; padding: 14px; margin-bottom: 12px; background: #0f172a; }
    pre { background: #0b0f19; padding: 8px 12px; border-radius: 4px; overflow-x: auto; color: #38bdf8; font-size: 12px; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .report-wrap { border: none; padding: 0; background: #fff; color: #000; }
      .card { border: 1px solid #ccc; background: #f8f9fa; }
      .num { color: #0284c7; }
      .lbl { color: #475569; }
      .issue-box { background: #fff; border: 1px solid #ddd; color: #000; }
      pre { background: #f1f5f9 !important; color: #0f172a !important; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="report-wrap">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #374151; padding-bottom:20px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:24px; margin-bottom:4px;">DevHealth Project Audit Report</h1>
        <div style="font-size:13px; color:#94a3b8;">${report.projectName} &bull; ${report.projectType} &bull; Generated: ${report.createdAt}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:40px; font-weight:900; font-family:monospace; color:#38bdf8;">${scores.overall} <span style="font-size:16px; color:#94a3b8;">/ 100</span></div>
        <div style="background:#0284c7; color:#fff; display:inline-block; padding:3px 10px; border-radius:4px; font-weight:bold; font-size:11px;">${report.status}</div>
      </div>
    </div>

    <h2>Executive Summary</h2>
    <p style="color:#cbd5e1; font-size:14px; line-height:1.6;">${report.executiveSummary}</p>
    <p style="font-size:13px; color:#94a3b8;"><strong>Production Readiness:</strong> ${report.productionStatus} &bull; <strong>Files:</strong> ${report.structure.totalFiles}</p>

    <h2>Health Breakdown</h2>
    <div class="grid">
      <div class="card"><div class="num">${scores.build}</div><div class="lbl">Build Health (20%)</div></div>
      <div class="card"><div class="num">${scores.security}</div><div class="lbl">Security (25%)</div></div>
      <div class="card"><div class="num">${scores.testing}</div><div class="lbl">Testing (15%)</div></div>
      <div class="card"><div class="num">${scores.dependencies}</div><div class="lbl">Dependencies (15%)</div></div>
      <div class="card"><div class="num">${scores.performance}</div><div class="lbl">Performance (10%)</div></div>
      <div class="card"><div class="num">${scores.documentation}</div><div class="lbl">Documentation (10%)</div></div>
    </div>

    <h2>Recommended Remediation Actions</h2>
    <ul>
      ${report.recommendedActions.map((a) => `<li style="margin-bottom:6px; color:#cbd5e1;">${a}</li>`).join("")}
    </ul>

    <h2>Detailed Issues (${report.issues.length})</h2>
    ${report.issues
      .map(
        (i) => `
      <div class="issue-box">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <strong style="color:#f8fafc;">${i.title}</strong>
          <span style="font-size:11px; font-weight:bold; color:#ef4444;">${i.severity}</span>
        </div>
        <div style="font-size:12px; color:#94a3b8; font-family:monospace; margin-bottom:6px;">${i.file}${i.line ? ":" + i.line : ""} &bull; ${i.category}</div>
        <div style="font-size:13px; color:#cbd5e1; margin-bottom:6px;">${i.description}</div>
        ${i.codeSnippet ? `<pre><code>${i.codeSnippet}</code></pre>` : ""}
        <div style="font-size:12px; color:#34d399; margin-top:6px;"><strong>Fix:</strong> ${i.recommendedFix}</div>
      </div>
    `
      )
      .join("")}
    <div style="margin-top:28px; padding-top:16px; border-top:1px solid #374151; text-align:center; font-size:12px; color:#94a3b8;">
      Built with ❤️ by Abdul Rehman Yasir
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DevHealth-${report.projectName.replace(/\s+/g, "_")}-Report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
            Project Health Audit Report
          </h2>
          <p className="text-xs text-slate-400">
            Export or print this comprehensive static audit for your team or client.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadHtml}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download HTML</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-900/40"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet View */}
      <div className="p-6 sm:p-8 rounded-xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
        {/* Header Title Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-xs tracking-widest text-cyan-400 uppercase">
                DevHealth Static Audit
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs font-mono text-slate-400">
                {report.createdAt}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-mono">
              {report.projectName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Project Archetype:{" "}
              <strong className="text-slate-200">{report.projectType}</strong>{" "}
              &bull; Languages: {report.languages.join(", ")}
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
            <div className="text-4xl sm:text-5xl font-black font-mono text-cyan-400">
              {scores.overall}
              <span className="text-sm font-mono text-slate-500"> / 100</span>
            </div>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
              {report.status}
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Executive Summary
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            {report.executiveSummary}
          </p>
        </section>

        {/* Category Scores Grid */}
        <section className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Health Dimension Scores
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { title: "Build Health", score: scores.build, weight: "20%" },
              { title: "Security", score: scores.security, weight: "25%" },
              { title: "Testing", score: scores.testing, weight: "15%" },
              { title: "Dependencies", score: scores.dependencies, weight: "15%" },
              { title: "Performance", score: scores.performance, weight: "10%" },
              { title: "Documentation", score: scores.documentation, weight: "10%" },
            ].map((cat) => (
              <div
                key={cat.title}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-center"
              >
                <div className="text-2xl font-black font-mono text-cyan-400">
                  {cat.score}
                </div>
                <div className="text-[11px] font-mono font-semibold text-slate-200 mt-1">
                  {cat.title}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Weight: {cat.weight}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Actions */}
        <section className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Remediation Roadmap
          </h2>
          <div className="space-y-2">
            {report.recommendedActions.map((action, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-300 font-mono"
              >
                <span className="text-cyan-400 font-bold">&rarr;</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Issues */}
        <section className="space-y-3 pt-4 border-t border-slate-800">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Discovered Issues ({report.issues.length})
          </h2>
          <div className="space-y-3">
            {report.issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                      {issue.severity}
                    </span>
                    <strong className="text-slate-100">{issue.title}</strong>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {issue.file} {issue.line ? `:${issue.line}` : ""}
                  </span>
                </div>
                <p className="text-slate-300">{issue.description}</p>
                {issue.codeSnippet && (
                  <pre className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                    <code>{issue.codeSnippet}</code>
                  </pre>
                )}
                <div className="text-[11px] text-emerald-400 font-mono">
                  <strong>Recommended Fix:</strong> {issue.recommendedFix}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security & Static Notice */}
        <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DevHealth &bull; Static Analysis Performed Locally &bull; Zero Code Execution &bull; Secrets Masked</span>
          <span className="font-sans text-slate-300 font-medium">Built with ❤️ by Abdul Rehman Yasir</span>
        </div>
      </div>
    </div>
  );
};
