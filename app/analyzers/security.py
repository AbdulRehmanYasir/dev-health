"""DevHealth Security Analyzer.
Static security scanner identifying hardcoded secrets, dangerous execution patterns,
SQL string injection risks, and misconfigurations.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple
from app.config import IGNORED_DIRS, IGNORED_EXTENSIONS
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe
from app.utils.security import SECRET_PATTERNS, mask_secret


DANGEROUS_PATTERNS = [
    (
        "Python Subprocess Shell=True",
        r"""subprocess\.(?:Popen|call|run|check_output)\s*\([^)]*shell\s*=\s*True""",
        Severity.CRITICAL,
        "Command Injection Risk",
        "Executing subprocess with `shell=True` allows shell injection vulnerabilities if input is untrusted.",
        "Pass arguments as a list and remove `shell=True`."
    ),
    (
        "Python os.system Call",
        r"""\bos\.system\s*\(""",
        Severity.HIGH,
        "Shell Execution",
        "`os.system()` runs commands directly in the shell without sanitization, risking injection.",
        "Use `subprocess.run(['command', 'arg'], check=True)` instead of `os.system()`."
    ),
    (
        "Unsafe Eval / Exec Call",
        r"""\b(?:eval|exec)\s*\([^)]+\)""",
        Severity.CRITICAL,
        "Arbitrary Code Execution",
        "Dynamic evaluation of code via `eval` or `exec` can lead to remote code execution.",
        "Avoid dynamic evaluation; use standard data parsing libraries (e.g., json.loads or ast.literal_eval)."
    ),
    (
        "SQL String Concatenation",
        r"""(?i)(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:WHERE|FROM|SET|INTO)\b.*?["']\s*\+\s*[a-zA-Z0-9_]+|\bf["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE)\s+[^"']*\{[a-zA-Z0-9_]+""",
        Severity.CRITICAL,
        "SQL Injection Vulnerability",
        "Constructing SQL queries via string concatenation or formatted f-strings bypasses query parameterization.",
        "Use parameterized SQL queries (e.g., cursor.execute('SELECT ... WHERE id = ?', (id,))) or an ORM."
    ),
    (
        "Unsafe PyYAML Load",
        r"""yaml\.load\s*\([^)]*(?:Loader\s*=\s*yaml\.(?:Loader|UnsafeLoader))?""",
        Severity.HIGH,
        "Insecure Deserialization",
        "Calling `yaml.load()` without `SafeLoader` can allow arbitrary Python object deserialization.",
        "Use `yaml.safe_load(data)` instead."
    ),
    (
        "Debug Mode Enabled in Source",
        r"""(?i)\b(?:DEBUG\s*=\s*True|debug\s*=\s*true|app\.run\([^)]*debug\s*=\s*True)""",
        Severity.MEDIUM,
        "Debug Mode In Production",
        "Running with debug mode enabled reveals internal stack traces, interactive debuggers, and environment details.",
        "Disable debug mode or read it strictly from a secure environment variable (DEBUG=False in production)."
    ),
    (
        "Overly Permissive Wildcard CORS",
        r"""(?i)(?:allow_origins\s*=\s*\[\s*["']\*["']\s*\]|cors\(\s*\{?\s*origin:\s*["']\*["']|Access-Control-Allow-Origin:\s*\*)""",
        Severity.MEDIUM,
        "Insecure CORS Configuration",
        "Configuring CORS with wildcard '*' allows any unauthorized origin to read resources if credentials or cookies are used.",
        "Explicitly specify allowed trusted domain origins."
    ),
    (
        "Dangerous JavaScript innerHTML Assignment",
        r"""\.innerHTML\s*=\s*(?!["'`][^"'`]*["'`]\s*;)[a-zA-Z0-9_.]+""",
        Severity.HIGH,
        "Cross-Site Scripting (XSS)",
        "Directly assigning variables or external content to `innerHTML` introduces DOM-based XSS vulnerabilities.",
        "Use `textContent` or sanitize inputs with DOMPurify."
    ),
    (
        "Dangerous JavaScript eval()",
        r"""\beval\s*\([a-zA-Z0-9_.]+""",
        Severity.CRITICAL,
        "JavaScript Arbitrary Execution",
        "Calling `eval()` on variables executes arbitrary scripts with the application's privileges.",
        "Refactor to avoid `eval()`; use JSON.parse for JSON strings."
    ),
]


def analyze_security(project_dir: Path) -> Tuple[CategoryResult, List[Issue]]:
    """Scan project files for secrets, tokens, credentials, and vulnerable coding patterns."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    issue_id_counter = 1
    total_files_scanned = 0
    secrets_found = 0
    critical_pattern_found = False

    # Check for committed .env files
    env_files = list(project_dir.glob("**/.env*"))
    valid_env_files = [
        f for f in env_files 
        if not f.name.endswith(".example") and not f.name.endswith(".sample") and not f.name.endswith(".template")
        and not any(p in IGNORED_DIRS for p in f.parts)
    ]

    if valid_env_files:
        score -= 25
        rel_path = os.path.relpath(valid_env_files[0], project_dir)
        checks.append(CheckItem(
            label="Committed .env file detected",
            passed=False,
            is_warning=False,
            details=f"Found: {rel_path}"
        ))
        issues.append(Issue(
            id=f"SEC-{issue_id_counter:03d}",
            title="Committed Environment (.env) File",
            severity=Severity.CRITICAL,
            category=Category.SECURITY,
            file=rel_path,
            line=1,
            description=f"Raw environment configuration file '{rel_path}' is committed to repository.",
            why_it_matters="Committed .env files often contain production database credentials, private API tokens, and session secrets.",
            recommended_fix="Add .env to .gitignore and provide only a sanitized .env.example."
        ))
        issue_id_counter += 1
    else:
        checks.append(CheckItem(label="No committed unmasked .env files", passed=True))

    # Scan code files
    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]

        for filename in files:
            file_path = Path(root) / filename
            ext = file_path.suffix.lower()
            if ext in IGNORED_EXTENSIONS or filename.endswith(".min.js") or filename.endswith(".min.css"):
                continue

            rel_file_path = os.path.relpath(file_path, project_dir)
            content = read_text_safe(file_path)
            if not content:
                continue

            total_files_scanned += 1
            lines = content.splitlines()

            # 1. Scan for hardcoded secrets
            for pattern_name, regex, severity_str, desc in SECRET_PATTERNS:
                for line_num, line in enumerate(lines, start=1):
                    # Skip comment-only lines or examples
                    trimmed = line.strip()
                    if trimmed.startswith(("#", "//", "/*", "*")):
                        if "example" in trimmed.lower() or "mock" in trimmed.lower() or "my_api_key" in trimmed.lower():
                            continue

                    matches = re.findall(regex, line)
                    for match in matches:
                        match_str = match if isinstance(match, str) else match[0]
                        if "EXAMPLE" in match_str or "placeholder" in match_str.lower() or "your_" in match_str.lower():
                            continue

                        secrets_found += 1
                        masked = mask_secret(match_str)
                        # Replace the actual secret in line preview with masked version
                        safe_snippet = line.replace(match_str, masked).strip()

                        sev = Severity[severity_str]
                        if sev == Severity.CRITICAL:
                            score -= 20
                            critical_pattern_found = True
                        else:
                            score -= 10

                        issues.append(Issue(
                            id=f"SEC-{issue_id_counter:03d}",
                            title=f"Hardcoded {pattern_name}",
                            severity=sev,
                            category=Category.SECURITY,
                            file=rel_file_path,
                            line=line_num,
                            code_snippet=safe_snippet,
                            description=f"Found potential hardcoded secret: {masked}",
                            why_it_matters="Hardcoded secrets committed to source repositories can be scraped and exploited by attackers to gain unauthorized access.",
                            recommended_fix="Move the secret to an external environment variable and retrieve it via process.env or os.getenv()."
                        ))
                        issue_id_counter += 1
                        break  # Report once per pattern per line

            # 2. Scan for dangerous code execution patterns
            for pattern_name, regex, sev, vuln_type, why, fix in DANGEROUS_PATTERNS:
                for line_num, line in enumerate(lines, start=1):
                    trimmed = line.strip()
                    if trimmed.startswith(("#", "//", "/*")):
                        continue

                    if re.search(regex, line):
                        if sev == Severity.CRITICAL:
                            score -= 15
                            critical_pattern_found = True
                        elif sev == Severity.HIGH:
                            score -= 10
                        else:
                            score -= 5

                        safe_snippet = trimmed[:100]
                        issues.append(Issue(
                            id=f"SEC-{issue_id_counter:03d}",
                            title=pattern_name,
                            severity=sev,
                            category=Category.SECURITY,
                            file=rel_file_path,
                            line=line_num,
                            code_snippet=safe_snippet,
                            description=f"Potentially unsafe coding pattern detected: {vuln_type}",
                            why_it_matters=why,
                            recommended_fix=fix
                        ))
                        issue_id_counter += 1
                        break

    if secrets_found == 0:
        checks.append(CheckItem(label="No hardcoded API keys or private tokens found", passed=True))
    else:
        checks.append(CheckItem(
            label=f"{secrets_found} potential hardcoded secret(s) found",
            passed=False,
            is_warning=False,
            details="Immediate remediation required. Secrets must be revoked and rotated."
        ))
        recommendations.append("Immediately revoke and rotate all discovered credentials.")

    if not critical_pattern_found:
        checks.append(CheckItem(label="No high-risk shell injection or eval patterns detected", passed=True))
    else:
        checks.append(CheckItem(
            label="Dangerous execution patterns flagged",
            passed=False,
            is_warning=False,
            details="Review identified code points for command injection or arbitrary execution."
        ))
        recommendations.append("Replace dynamic command strings and eval calls with parameterized APIs.")

    checks.append(CheckItem(label="Security database inspection: Local/static analysis only", passed=True))

    final_score = max(5, min(100, score))
    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "files_scanned": total_files_scanned,
            "secrets_detected": secrets_found,
            "security_database": "Local/static analysis only",
        }
    ), issues
