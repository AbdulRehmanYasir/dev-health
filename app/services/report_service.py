"""DevHealth Report Service.
Generates self-contained, print-friendly HTML reports that users can save as PDF.
"""

from app.models.schemas import AnalysisReport


def generate_html_report(report: AnalysisReport) -> str:
    """Renders a comprehensive, print-styled HTML report from an AnalysisReport object."""
    scores = report.scores
    issues = report.issues

    critical_issues = [i for i in issues if i.severity == "CRITICAL"]
    high_issues = [i for i in issues if i.severity == "HIGH"]
    other_issues = [i for i in issues if i.severity not in ("CRITICAL", "HIGH")]

    issues_html = ""
    for issue in issues:
        sev_color = "#ef4444" if issue.severity == "CRITICAL" else "#f59e0b" if issue.severity == "HIGH" else "#38bdf8"
        code_block = f"<pre style='background:#0f172a;padding:8px 12px;border-radius:4px;overflow-x:auto;color:#38bdf8;font-size:12px;'><code>{issue.code_snippet}</code></pre>" if issue.code_snippet else ""
        line_str = f":{issue.line}" if issue.line else ""
        issues_html += f"""
        <div style="border: 1px solid #334155; border-radius: 6px; padding: 14px; margin-bottom: 12px; background: #1e293b;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-weight:700; font-size:15px; color:#f8fafc;">{issue.title}</span>
                <span style="background:{sev_color}; color:#000; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">{issue.severity}</span>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:8px; font-family:monospace;">{issue.file}{line_str} &bull; Category: {issue.category}</div>
            <div style="font-size:13px; color:#cbd5e1; margin-bottom:6px;">{issue.description}</div>
            {code_block}
            <div style="font-size:12px; color:#cbd5e1; margin-top:8px;"><strong>Why it matters:</strong> {issue.why_it_matters}</div>
            <div style="font-size:12px; color:#34d399; margin-top:4px;"><strong>Recommended Fix:</strong> {issue.recommended_fix}</div>
        </div>
        """

    actions_html = "".join(f"<li style='margin-bottom:6px; color:#cbd5e1;'>&rarr; {action}</li>" for action in report.recommended_actions)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>DevHealth Report — {report.project_name}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 30px; margin: 0; line-height: 1.5; }}
        .container {{ max-width: 900px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 36px; }}
        h1, h2, h3 {{ color: #ffffff; margin-top: 0; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
        .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 20px 0; }}
        .score-card {{ background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 14px; text-align: center; }}
        .score-num {{ font-size: 28px; font-weight: 800; font-family: monospace; color: #38bdf8; }}
        .score-lbl {{ font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-top: 4px; letter-spacing: 0.5px; }}
        @media print {{
            body {{ background: #ffffff; color: #000000; padding: 0; }}
            .container {{ border: none; padding: 0; background: #ffffff; color: #000000; }}
            .score-card {{ border: 1px solid #ccc; background: #f8f9fa; }}
            .score-num {{ color: #0284c7; }}
            .score-lbl {{ color: #475569; }}
            pre {{ background: #f1f5f9 !important; color: #0f172a !important; }}
            button {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #374151; padding-bottom:20px; margin-bottom:24px;">
            <div>
                <h1 style="font-size:26px; margin-bottom:4px;">DevHealth Project Audit</h1>
                <div style="font-size:14px; color:#94a3b8;">{report.project_name} &bull; Type: <strong>{report.project_type}</strong> &bull; Generated: {report.created_at}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:42px; font-weight:900; font-family:monospace; color:#38bdf8;">{scores.overall} <span style="font-size:18px; color:#94a3b8;">/ 100</span></div>
                <div class="badge" style="background:#0284c7; color:#fff;">{report.status}</div>
                <div style="margin-top:10px;">
                    <button onclick="window.print()" style="background:#0284c7; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">Print / Save PDF</button>
                </div>
            </div>
        </div>

        <section style="margin-bottom:28px;">
            <h2 style="font-size:18px; border-bottom:1px solid #374151; padding-bottom:6px;">Executive Summary</h2>
            <p style="color:#cbd5e1; font-size:14px; line-height:1.6;">{report.executive_summary}</p>
            <div style="background:#1e293b; padding:12px; border-radius:6px; font-size:13px; color:#94a3b8;">
                <strong>Production Readiness:</strong> <span style="color:#38bdf8; font-weight:700;">{report.production_status}</span> &bull; 
                <strong>Files Scanned:</strong> {report.structure.total_files} &bull; 
                <strong>Languages:</strong> {', '.join(report.languages)}
            </div>
        </section>

        <section style="margin-bottom:28px;">
            <h2 style="font-size:18px; border-bottom:1px solid #374151; padding-bottom:6px;">Health Breakdown</h2>
            <div class="grid">
                <div class="score-card">
                    <div class="score-num">{scores.build}</div>
                    <div class="score-lbl">Build Health (20%)</div>
                </div>
                <div class="score-card">
                    <div class="score-num">{scores.security}</div>
                    <div class="score-lbl">Security (25%)</div>
                </div>
                <div class="score-card">
                    <div class="score-num">{scores.testing}</div>
                    <div class="score-lbl">Testing (15%)</div>
                </div>
                <div class="score-card">
                    <div class="score-num">{scores.dependencies}</div>
                    <div class="score-lbl">Dependencies (15%)</div>
                </div>
                <div class="score-card">
                    <div class="score-num">{scores.performance}</div>
                    <div class="score-lbl">Performance (10%)</div>
                </div>
                <div class="score-card">
                    <div class="score-num">{scores.documentation}</div>
                    <div class="score-lbl">Documentation (10%)</div>
                </div>
            </div>
        </section>

        <section style="margin-bottom:28px;">
            <h2 style="font-size:18px; border-bottom:1px solid #374151; padding-bottom:6px;">Recommended Actions Roadmap</h2>
            <ul style="padding-left:20px; font-size:14px;">
                {actions_html}
            </ul>
        </section>

        <section style="margin-bottom:28px;">
            <h2 style="font-size:18px; border-bottom:1px solid #374151; padding-bottom:6px;">Detected Issues ({len(issues)})</h2>
            {issues_html if issues else "<p style='color:#34d399;'>No issues flagged during static analysis.</p>"}
        </section>

        <footer style="margin-top:40px; padding-top:16px; border-top:1px solid #374151; font-size:12px; color:#64748b; text-align:center;">
            DevHealth — Know Your Project Before Production Does. Static code analysis performed safely without execution.
        </footer>
    </div>
</body>
</html>
"""
