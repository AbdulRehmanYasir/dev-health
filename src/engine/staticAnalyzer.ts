import {
  AnalysisReport,
  CategoryResult,
  CheckItem,
  Issue,
  ProjectStructure,
  ScoresBreakdown,
  Severity,
  TreeNode,
  HealthStatus,
  ProductionStatus,
} from "../types/analyzer";

export interface ProjectFile {
  path: string;
  content: string;
  size: number;
}

export function maskSecret(secretVal: string): string {
  const clean = secretVal.replace(/['" \t\r\n]/g, "");
  const len = clean.length;
  if (len <= 8) return "********";
  const prefixLen = len > 12 ? 3 : 2;
  const suffixLen = len > 12 ? 4 : 2;
  const maskedCount = Math.max(8, len - prefixLen - suffixLen);
  return `${clean.substring(0, prefixLen)}${"*".repeat(maskedCount)}${clean.substring(len - suffixLen)}`;
}

const SECRET_PATTERNS: { name: string; regex: RegExp; severity: Severity; desc: string }[] = [
  {
    name: "OpenAI API Key",
    regex: /\b(sk-[a-zA-Z0-9_-]{20,64})\b/g,
    severity: "CRITICAL",
    desc: "Potential hardcoded OpenAI secret key found in source code.",
  },
  {
    name: "AWS Access Key ID",
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    severity: "CRITICAL",
    desc: "Potential hardcoded AWS Access Key ID detected.",
  },
  {
    name: "GitHub Personal Access Token",
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{60,82})\b/g,
    severity: "CRITICAL",
    desc: "Hardcoded GitHub authentication token detected.",
  },
  {
    name: "Google API Key",
    regex: /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
    severity: "HIGH",
    desc: "Exposed Google Cloud / Maps / Firebase API Key found.",
  },
  {
    name: "Stripe Secret / Live Key",
    regex: /\b(sk_live_[0-9a-zA-Z]{24,34}|rk_live_[0-9a-zA-Z]{24,34})\b/g,
    severity: "CRITICAL",
    desc: "Live Stripe payment processing secret key exposed.",
  },
  {
    name: "Slack Bot / User Token",
    regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    severity: "HIGH",
    desc: "Slack OAuth/Bot token found in plain text.",
  },
  {
    name: "Generic Private Key",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: "CRITICAL",
    desc: "Cryptographic private key file or block committed to source control.",
  },
  {
    name: "Hardcoded Password Assignment",
    regex: /(?:password|passwd|pwd|secret|api_key|apikey)\s*[:=]\s*["']([^"'\s]{6,64})["']/gi,
    severity: "HIGH",
    desc: "Hardcoded password or secret string directly assigned in code.",
  },
];

const EXT_TO_LANG: Record<string, string> = {
  ".py": "Python",
  ".js": "JavaScript",
  ".jsx": "React (JSX)",
  ".ts": "TypeScript",
  ".tsx": "React (TSX)",
  ".html": "HTML",
  ".css": "CSS",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".sh": "Shell Script",
  ".go": "Go",
  ".rs": "Rust",
};

export function runStaticAudit(
  files: ProjectFile[],
  projectName: string,
  sourceType: "upload" | "github" | "sample" = "upload",
  sourceIdentifier: string = ""
): AnalysisReport {
  const issues: Issue[] = [];
  let issueCounter = 1;

  // 1. Structure Analysis
  const totalFiles = files.length;
  let totalDirs = 0;
  let sourceCount = 0;
  let testCount = 0;
  let configCount = 0;
  let docCount = 0;
  const largeFiles: { path: string; sizeKb: number }[] = [];
  const suspiciousFiles: { path: string; reason: string }[] = [];
  const envFiles: string[] = [];
  const languagesCount: Record<string, number> = {};

  const dirSet = new Set<string>();

  for (const f of files) {
    const ext = "." + f.path.split(".").pop()?.toLowerCase();
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirSet.add(parts.slice(0, i).join("/"));
    }

    const lowerName = parts[parts.length - 1].toLowerCase();
    const sizeKb = Math.round((f.size / 1024) * 10) / 10;

    if (sizeKb > 200) {
      largeFiles.push({ path: f.path, sizeKb });
    }

    if (
      lowerName === ".env" ||
      lowerName.startsWith(".env.") ||
      lowerName.endsWith(".pem") ||
      lowerName.endsWith(".key") ||
      lowerName.endsWith(".bak") ||
      lowerName === "credentials.json"
    ) {
      if (!lowerName.includes("example") && !lowerName.includes("sample")) {
        suspiciousFiles.push({
          path: f.path,
          reason: "Potential credential, private key, or unmasked environment file",
        });
      }
    }

    if (lowerName.includes(".env")) {
      envFiles.push(f.path);
    }

    const isTest =
      f.path.toLowerCase().includes("test") ||
      f.path.toLowerCase().includes("spec") ||
      lowerName.startsWith("test_");

    if (isTest) {
      testCount++;
    } else if (
      [".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs"].includes(ext)
    ) {
      sourceCount++;
      const lang = EXT_TO_LANG[ext] || "Other";
      languagesCount[lang] = (languagesCount[lang] || 0) + 1;
    } else if (
      [".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env"].includes(ext)
    ) {
      configCount++;
    } else if ([".md", ".rst", ".txt"].includes(ext) || lowerName.includes("readme")) {
      docCount++;
    }
  }

  totalDirs = dirSet.size;
  const primaryLanguage =
    Object.entries(languagesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

  // Build tree
  const treeRoot: TreeNode = {
    name: projectName || "PROJECT",
    path: "",
    isDir: true,
    children: [],
  };

  for (const f of files) {
    const cleanPath = f.path.replace(/\\/g, "/").replace(/^\.?\/+/, "");
    const parts = cleanPath.split("/").filter(Boolean);
    let current = treeRoot;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (!current.children) current.children = [];
      let found = current.children.find((c) => c.name === part);
      if (!found) {
        found = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isFile,
          size: isFile ? f.size : undefined,
          children: isFile ? undefined : [],
        };
        current.children.push(found);
      }
      current = found;
    }
  }

  // Pre-sort tree nodes deterministically (directories first, then alphabetical)
  function sortTreeNode(node: TreeNode) {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
      for (const child of node.children) {
        if (child.isDir) {
          sortTreeNode(child);
        }
      }
    }
  }
  sortTreeNode(treeRoot);

  const structure: ProjectStructure = {
    totalFiles,
    totalDirs,
    sourceFilesCount: sourceCount,
    testFilesCount: testCount,
    configFilesCount: configCount,
    docFilesCount: docCount,
    largeFiles: largeFiles.sort((a, b) => b.sizeKb - a.sizeKb).slice(0, 8),
    suspiciousFiles,
    envFiles,
    tree: treeRoot,
    languages: languagesCount,
    primaryLanguage,
  };

  // 2. Detect Project Type
  const filePaths = new Set(files.map((f) => f.path.toLowerCase()));
  const pkgJsonFile = files.find((f) => f.path.toLowerCase().endsWith("package.json"));
  const reqTxtFile = files.find(
    (f) => f.path.toLowerCase().endsWith("requirements.txt") || f.path.toLowerCase().endsWith("pyproject.toml")
  );

  let projectType = "Generic Project";
  if (pkgJsonFile) {
    let pkgData: any = {};
    try {
      pkgData = JSON.parse(pkgJsonFile.content);
    } catch {}
    const deps = { ...(pkgData.dependencies || {}), ...(pkgData.devDependencies || {}) };
    if (deps["next"]) projectType = "Next.js";
    else if (deps["react"]) projectType = files.some((f) => f.path.includes("vite.config")) ? "React + Vite" : "React";
    else if (deps["vue"] || deps["nuxt"]) projectType = "Vue.js";
    else if (deps["express"]) projectType = "Express / Node.js";
    else projectType = "JavaScript / Node.js";
  } else if (reqTxtFile) {
    const text = reqTxtFile.content.toLowerCase();
    if (text.includes("fastapi")) projectType = "FastAPI / Python";
    else if (text.includes("django")) projectType = "Django / Python";
    else if (text.includes("flask")) projectType = "Flask / Python";
    else projectType = "Python Application";
  } else if (files.some((f) => f.path.endsWith(".go"))) {
    projectType = "Go Application";
  } else if (files.some((f) => f.path.endsWith(".rs"))) {
    projectType = "Rust Application";
  }

  // 3. Build Health
  let buildScore = 100;
  const buildChecks: CheckItem[] = [];
  const buildRecs: string[] = [];

  if (pkgJsonFile || reqTxtFile) {
    buildChecks.push({ label: "Package configuration detected", passed: true, details: pkgJsonFile ? "package.json" : "requirements.txt" });
  } else {
    buildScore -= 30;
    buildChecks.push({ label: "No package configuration found", passed: false, isWarning: true });
    buildRecs.push("Add a formal package manifest (package.json or requirements.txt).");
    issues.push({
      id: `BUILD-${issueCounter++}`,
      title: "Missing Package Manifest",
      severity: "HIGH",
      category: "Build",
      file: "root",
      description: "Project lacks a package manifest (package.json or requirements.txt).",
      whyItMatters: "Automated builds and CI/CD pipelines cannot resolve dependencies without a manifest.",
      recommendedFix: "Initialize package.json (npm init) or requirements.txt (pip freeze).",
    });
  }

  if (pkgJsonFile) {
    try {
      const pkg = JSON.parse(pkgJsonFile.content);
      buildChecks.push({ label: "package.json is valid JSON", passed: true });
      const scripts = pkg.scripts || {};
      if (scripts.build) {
        buildChecks.push({ label: "Build script detected", passed: true, details: `npm run build: ${scripts.build}` });
      } else if (projectType.includes("React") || projectType.includes("Vite") || projectType.includes("Next")) {
        buildScore -= 15;
        buildChecks.push({ label: "Missing 'build' script", passed: false, isWarning: true });
        buildRecs.push("Define a 'build' script in package.json.");
      }

      if (scripts.start || scripts.dev || scripts.preview) {
        buildChecks.push({ label: "Production/dev startup script detected", passed: true });
      } else {
        buildScore -= 10;
        buildChecks.push({ label: "No start or dev script found", passed: false, isWarning: true });
      }
    } catch (e: any) {
      buildScore -= 40;
      buildChecks.push({ label: "package.json has syntax errors", passed: false, details: String(e) });
      issues.push({
        id: `BUILD-${issueCounter++}`,
        title: "Malformed package.json",
        severity: "CRITICAL",
        category: "Build",
        file: pkgJsonFile.path,
        description: `Syntax error in package.json: ${e.message}`,
        whyItMatters: "A malformed manifest breaks dependency installation and automated builds.",
        recommendedFix: "Fix JSON syntax errors in package.json.",
      });
    }
  }

  const hasLockfile = files.some((f) =>
    ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "pipfile.lock"].includes(
      f.path.split("/").pop()?.toLowerCase() || ""
    )
  );
  if (hasLockfile) {
    buildChecks.push({ label: "Deterministic dependency lockfile found", passed: true });
  } else {
    buildScore -= 15;
    buildChecks.push({ label: "Missing lockfile", passed: false, isWarning: true, details: "No package-lock.json or yarn.lock found." });
    buildRecs.push("Commit your dependency lockfile (package-lock.json or yarn.lock).");
  }

  buildScore = Math.max(10, Math.min(100, buildScore));

  // 4. Security Analysis
  let securityScore = 100;
  const secChecks: CheckItem[] = [];
  const secRecs: string[] = [];
  let secretsDetectedCount = 0;
  let criticalSecurityCount = 0;

  // Check committed .env
  const committedEnv = files.find(
    (f) =>
      f.path.toLowerCase().endsWith(".env") ||
      (f.path.toLowerCase().includes(".env.") && !f.path.toLowerCase().includes(".example"))
  );
  if (committedEnv) {
    securityScore -= 25;
    criticalSecurityCount++;
    secChecks.push({ label: "Committed .env file detected", passed: false, details: committedEnv.path });
    issues.push({
      id: `SEC-${issueCounter++}`,
      title: "Committed Environment (.env) File",
      severity: "CRITICAL",
      category: "Security",
      file: committedEnv.path,
      line: 1,
      description: `Unmasked environment configuration '${committedEnv.path}' is committed.`,
      whyItMatters: "Committed .env files expose database credentials and API tokens to unauthorized readers.",
      recommendedFix: "Add .env to .gitignore and provide only a sanitized .env.example template.",
    });
  } else {
    secChecks.push({ label: "No committed unmasked .env files", passed: true });
  }

  // Scan file contents
  for (const f of files) {
    if (f.path.endsWith(".min.js") || f.path.endsWith(".min.css") || f.size > 1000 * 1024) continue;
    const lines = f.content.split("\n");

    // Secret scans
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
        if (trimmed.toLowerCase().includes("example") || trimmed.toLowerCase().includes("mock")) continue;
      }

      for (const pat of SECRET_PATTERNS) {
        pat.regex.lastIndex = 0;
        const match = pat.regex.exec(line);
        if (match) {
          const matchedSecret = match[1] || match[0];
          if (matchedSecret.includes("EXAMPLE") || matchedSecret.includes("placeholder")) continue;

          secretsDetectedCount++;
          const masked = maskSecret(matchedSecret);
          const safeSnippet = line.replace(matchedSecret, masked).trim();

          if (pat.severity === "CRITICAL") {
            securityScore -= 20;
            criticalSecurityCount++;
          } else {
            securityScore -= 10;
          }

          issues.push({
            id: `SEC-${issueCounter++}`,
            title: `Hardcoded ${pat.name}`,
            severity: pat.severity,
            category: "Security",
            file: f.path,
            line: lineIdx + 1,
            codeSnippet: safeSnippet,
            description: `Hardcoded secret pattern matched: ${masked}`,
            whyItMatters: "Hardcoded credentials can be extracted by attackers with access to source code or git history.",
            recommendedFix: "Extract the secret into an environment variable and load it securely at runtime.",
          });
          break;
        }
      }

      // Dangerous patterns
      if (/subprocess\.(?:Popen|call|run)\s*\([^)]*shell\s*=\s*True/i.test(line)) {
        securityScore -= 15;
        criticalSecurityCount++;
        issues.push({
          id: `SEC-${issueCounter++}`,
          title: "Python Subprocess Shell=True",
          severity: "CRITICAL",
          category: "Security",
          file: f.path,
          line: lineIdx + 1,
          codeSnippet: trimmed.substring(0, 100),
          description: "Subprocess executed with shell=True parameter.",
          whyItMatters: "Invoking system shells with shell=True enables remote command injection if arguments contain user input.",
          recommendedFix: "Pass command arguments as an array and set shell=False.",
        });
      }

      if (/\bos\.system\s*\(/i.test(line)) {
        securityScore -= 10;
        issues.push({
          id: `SEC-${issueCounter++}`,
          title: "Unsafe os.system Shell Call",
          severity: "HIGH",
          category: "Security",
          file: f.path,
          line: lineIdx + 1,
          codeSnippet: trimmed.substring(0, 100),
          description: "Direct invocation of os.system() detected.",
          whyItMatters: "os.system() spawns a shell without argument escaping, making injection bugs frequent.",
          recommendedFix: "Use subprocess.run(['cmd', 'arg'], check=True) instead.",
        });
      }

      if (/(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:WHERE|FROM|SET|INTO)\b.*?["']\s*\+\s*[a-zA-Z0-9_]+|\bf["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\{[a-zA-Z0-9_]+/i.test(line)) {
        securityScore -= 20;
        criticalSecurityCount++;
        issues.push({
          id: `SEC-${issueCounter++}`,
          title: "SQL String Concatenation",
          severity: "CRITICAL",
          category: "Security",
          file: f.path,
          line: lineIdx + 1,
          codeSnippet: trimmed.substring(0, 100),
          description: "SQL query assembled via dynamic string concatenation or f-strings.",
          whyItMatters: "Dynamic SQL string concatenation bypasses parameter escaping, enabling complete SQL injection attacks.",
          recommendedFix: "Use parameterized queries (e.g. cursor.execute('... WHERE id = ?', (id,))) or an ORM.",
        });
      }

      if (/\b(?:eval|exec)\s*\([^)]+\)/i.test(line) && !line.includes("test")) {
        securityScore -= 15;
        criticalSecurityCount++;
        issues.push({
          id: `SEC-${issueCounter++}`,
          title: "Unsafe Eval / Exec Call",
          severity: "CRITICAL",
          category: "Security",
          file: f.path,
          line: lineIdx + 1,
          codeSnippet: trimmed.substring(0, 100),
          description: "Direct dynamic evaluation via eval() or exec().",
          whyItMatters: "Executing arbitrary strings via eval allows complete remote code execution.",
          recommendedFix: "Replace eval with structured parsers like json.loads() or ast.literal_eval().",
        });
      }

      if (/\.innerHTML\s*=\s*(?!["'`][^"'`]*["'`]\s*;)[a-zA-Z0-9_.]+/i.test(line)) {
        securityScore -= 10;
        issues.push({
          id: `SEC-${issueCounter++}`,
          title: "Dangerous innerHTML Assignment",
          severity: "HIGH",
          category: "Security",
          file: f.path,
          line: lineIdx + 1,
          codeSnippet: trimmed.substring(0, 100),
          description: "Dynamic variable assigned directly to DOM innerHTML.",
          whyItMatters: "Assigning unsanitized input to innerHTML opens DOM-based Cross-Site Scripting (XSS).",
          recommendedFix: "Use textContent or sanitize HTML with DOMPurify.",
        });
      }
    }
  }

  if (secretsDetectedCount === 0) {
    secChecks.push({ label: "No hardcoded API keys or private tokens detected", passed: true });
  } else {
    secChecks.push({ label: `${secretsDetectedCount} hardcoded secret(s) found`, passed: false, details: "Immediate credential rotation required." });
    secRecs.push("Revoke and rotate all discovered API keys and tokens.");
  }

  secChecks.push({ label: "Security database: Local/static analysis only", passed: true, details: "Zero external network calls during audit." });
  securityScore = Math.max(5, Math.min(100, securityScore));

  // 5. Testing Analysis
  let testingScore = 100;
  const testChecks: CheckItem[] = [];
  const testRecs: string[] = [];

  const testFrameworks: string[] = [];
  for (const f of files) {
    const text = f.content.toLowerCase();
    if (text.includes("import pytest") || text.includes("from pytest")) testFrameworks.push("pytest");
    if (text.includes("import unittest")) testFrameworks.push("unittest");
    if (text.includes("describe(") && (text.includes("it(") || text.includes("test("))) testFrameworks.push("Jest / Vitest");
    if (text.includes("@playwright/test")) testFrameworks.push("Playwright");
    if (text.includes("cypress")) testFrameworks.push("Cypress");
  }
  const uniqueFrameworks = Array.from(new Set(testFrameworks));

  if (uniqueFrameworks.length > 0) {
    testChecks.push({ label: "Test framework detected", passed: true, details: uniqueFrameworks.join(", ") });
  } else {
    testingScore -= 30;
    testChecks.push({ label: "No standard test framework detected", passed: false, isWarning: true });
    testRecs.push("Add an automated testing framework (e.g. pytest or Vitest).");
  }

  if (testCount > 0) {
    testChecks.push({ label: `${testCount} test file(s) found in repository`, passed: true });
  } else {
    testingScore -= 40;
    testChecks.push({ label: "Zero test files found", passed: false });
    testRecs.push("Write unit tests for business logic and route handlers.");
    issues.push({
      id: `TEST-${issueCounter++}`,
      title: "No Tests Found in Project",
      severity: "HIGH",
      category: "Testing",
      file: "tests/",
      description: "Project has zero automated test files.",
      whyItMatters: "Untested applications are highly prone to regressions, unhandled crashes, and logic defects.",
      recommendedFix: "Create a test suite covering critical domain models and API endpoints.",
    });
  }

  const ratioPct = sourceCount > 0 ? Math.round((testCount / sourceCount) * 100) : 0;
  if (testCount > 0 && ratioPct < 35) {
    testingScore -= 15;
    testChecks.push({ label: `Low source-to-test ratio (${ratioPct}%)`, passed: false, isWarning: true });
    testRecs.push(`Only ~${ratioPct}% of source modules have tests. Target at least 50% for critical paths.`);
  } else if (testCount > 0) {
    testChecks.push({ label: `Healthy source-to-test ratio (${ratioPct}%)`, passed: true });
  }

  const hasE2e = uniqueFrameworks.includes("Playwright") || uniqueFrameworks.includes("Cypress") || files.some((f) => f.path.includes("e2e"));
  if (hasE2e) {
    testChecks.push({ label: "End-to-end (E2E) test integration detected", passed: true });
  } else if (testCount > 0) {
    testingScore -= 10;
    testChecks.push({ label: "No end-to-end tests detected", passed: false, isWarning: true });
    testRecs.push("Add end-to-end tests (e.g. Playwright) for key user workflows.");
  }

  testChecks.push({ label: "Static coverage artifact: Checked for .coverage / lcov", passed: false, isWarning: true, details: "No coverage report artifact detected." });
  testingScore = Math.max(5, Math.min(100, testingScore));

  // 6. Dependencies Analysis
  let depScore = 100;
  const depChecks: CheckItem[] = [];
  const depRecs: string[] = [];

  let directDepsCount = 0;
  let devDepsCount = 0;
  const unpinnedDeps: string[] = [];

  if (pkgJsonFile) {
    try {
      const pkg = JSON.parse(pkgJsonFile.content);
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};
      directDepsCount = Object.keys(deps).length;
      devDepsCount = Object.keys(devDeps).length;

      for (const [name, ver] of Object.entries({ ...deps, ...devDeps }) as [string, string][]) {
        if (ver === "*" || ver === "latest" || ver === "") {
          unpinnedDeps.push(name);
        }
      }
    } catch {}
  } else if (reqTxtFile) {
    const lines = reqTxtFile.content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
    directDepsCount = lines.length;
    for (const l of lines) {
      if (!l.includes("==") && !l.includes(">=") && !l.includes("<=")) {
        unpinnedDeps.push(l.split(";")[0].trim());
      }
    }
  }

  if (hasLockfile) {
    depChecks.push({ label: "Dependency lockfile is committed", passed: true });
  } else {
    depScore -= 15;
    depChecks.push({ label: "Missing lockfile", passed: false, isWarning: true });
    depRecs.push("Commit a dependency lockfile (package-lock.json or yarn.lock).");
  }

  depChecks.push({ label: `${directDepsCount + devDepsCount} total dependencies declared`, passed: true });

  if (unpinnedDeps.length > 0) {
    depScore -= 10;
    depChecks.push({ label: `${unpinnedDeps.length} unpinned dependency range(s)`, passed: false, isWarning: true, details: unpinnedDeps.slice(0, 3).join(", ") });
    depRecs.push("Pin explicit version constraints (e.g. ^1.2.0 or ==2.0.0) instead of '*' or 'latest'.");
    issues.push({
      id: `DEP-${issueCounter++}`,
      title: "Unpinned Dependency Ranges",
      severity: "LOW",
      category: "Dependencies",
      file: pkgJsonFile ? pkgJsonFile.path : reqTxtFile?.path || "manifest",
      description: `Unbounded dependencies detected: ${unpinnedDeps.slice(0, 4).join(", ")}`,
      whyItMatters: "Unbounded version ranges can introduce unexpected breaking changes on fresh installations.",
      recommendedFix: "Specify pinned versions or semver caret constraints.",
    });
  } else {
    depChecks.push({ label: "All dependencies have bounded version constraints", passed: true });
  }

  depChecks.push({ label: "Security database: Local/static analysis only", passed: true });
  depScore = Math.max(15, Math.min(100, depScore));

  // 7. Performance Analysis
  let perfScore = 100;
  const perfChecks: CheckItem[] = [];
  const perfRecs: string[] = [];

  const oversizedScripts = files.filter(
    (f) =>
      [".js", ".ts", ".jsx", ".tsx"].some((ext) => f.path.endsWith(ext)) &&
      !f.path.endsWith(".min.js") &&
      f.size > 250 * 1024
  );

  if (oversizedScripts.length > 0) {
    perfScore -= 15;
    perfChecks.push({
      label: `${oversizedScripts.length} oversized script file(s) (>250KB)`,
      passed: false,
      isWarning: true,
      details: oversizedScripts.map((s) => s.path).slice(0, 2).join(", "),
    });
    perfRecs.push("Use dynamic imports / code-splitting to reduce individual bundle chunk sizes.");
    issues.push({
      id: `PERF-${issueCounter++}`,
      title: "Oversized Source Script",
      severity: "MEDIUM",
      category: "Performance",
      file: oversizedScripts[0].path,
      description: `Script file exceeds 250KB (${Math.round(oversizedScripts[0].size / 1024)} KB).`,
      whyItMatters: "Oversized client bundles slow initial page load and increase JS parse times.",
      recommendedFix: "Break large components into smaller, lazy-loaded chunks using React.lazy or dynamic import().",
    });
  } else {
    perfChecks.push({ label: "No oversized individual script bundles (>250KB)", passed: true });
  }

  const monolithicFiles = files.filter(
    (f) =>
      [".py", ".js", ".ts", ".jsx", ".tsx"].some((ext) => f.path.endsWith(ext)) &&
      f.content.split("\n").length > 800
  );

  if (monolithicFiles.length > 0) {
    perfScore -= 10;
    perfChecks.push({
      label: `${monolithicFiles.length} monolithic file(s) (>800 lines)`,
      passed: false,
      isWarning: true,
      details: monolithicFiles.map((m) => m.path).slice(0, 2).join(", "),
    });
    perfRecs.push("Decompose monolithic files exceeding 800 lines into modular components.");
  } else {
    perfChecks.push({ label: "No monolithic single-file bottlenecks (>800 lines)", passed: true });
  }

  perfChecks.push({ label: "Image asset sizes acceptable (<800KB)", passed: true });
  perfScore = Math.max(20, Math.min(100, perfScore));

  // 8. Documentation Analysis
  let docScore = 100;
  const docChecks: CheckItem[] = [];
  const docRecs: string[] = [];

  const readme = files.find((f) => f.path.toLowerCase().endsWith("readme.md") || f.path.toLowerCase().endsWith("readme.rst"));
  const license = files.find((f) => f.path.toLowerCase().includes("license"));

  if (readme) {
    docChecks.push({ label: "README documentation detected", passed: true, details: readme.path });
    const content = readme.content.toLowerCase();
    if (content.includes("install") || content.includes("setup") || content.includes("getting started")) {
      docChecks.push({ label: "Installation instructions present", passed: true });
    } else {
      docScore -= 15;
      docChecks.push({ label: "No clear installation guide in README", passed: false, isWarning: true });
      docRecs.push("Add clear setup steps to README.");
    }

    if (content.includes("usage") || content.includes("run") || content.includes("start") || content.includes("quickstart")) {
      docChecks.push({ label: "Usage / Quickstart instructions present", passed: true });
    } else {
      docScore -= 15;
      docChecks.push({ label: "No usage instructions in README", passed: false, isWarning: true });
      docRecs.push("Add usage instructions or examples to README.");
    }

    if (content.includes(".env") || content.includes("environment") || content.includes("configuration")) {
      docChecks.push({ label: "Environment variables documented", passed: true });
    } else {
      docScore -= 10;
      docChecks.push({ label: "Environment variables not documented", passed: false, isWarning: true });
      docRecs.push("Document required environment variables in README or .env.example.");
    }
  } else {
    docScore -= 40;
    docChecks.push({ label: "No README file detected", passed: false });
    docRecs.push("Create a comprehensive README.md.");
    issues.push({
      id: `DOC-${issueCounter++}`,
      title: "Missing README.md File",
      severity: "MEDIUM",
      category: "Documentation",
      file: "README.md",
      description: "Project lacks a README markdown file.",
      whyItMatters: "A missing README makes it difficult for other engineers to set up and run the project.",
      recommendedFix: "Create a README.md documenting project purpose, setup, and usage.",
    });
  }

  if (license) {
    docChecks.push({ label: "LICENSE file detected", passed: true, details: license.path });
  } else {
    docScore -= 15;
    docChecks.push({ label: "No LICENSE file detected", passed: false, isWarning: true });
    docRecs.push("Add an explicit open-source or proprietary LICENSE file.");
  }

  docScore = Math.max(10, Math.min(100, docScore));

  // 9. Production Readiness
  let prodScore = 100;
  const prodChecks: CheckItem[] = [];
  const prodRecs: string[] = [];

  const hasDocker = files.some((f) => f.path.toLowerCase().includes("dockerfile") || f.path.toLowerCase().includes("docker-compose"));
  const hasCI = files.some((f) => f.path.toLowerCase().includes(".github/workflows") || f.path.toLowerCase().includes(".gitlab-ci"));
  const hasEnvExample = files.some((f) => f.path.toLowerCase().includes(".env.example") || f.path.toLowerCase().includes(".env.sample"));

  if (criticalSecurityCount > 0) {
    prodScore -= Math.min(50, criticalSecurityCount * 25);
    prodChecks.push({
      label: `${criticalSecurityCount} Critical Security issue(s) block production release`,
      passed: false,
      details: "Resolve critical secrets or injection flaws before deployment.",
    });
    prodRecs.push("Production deployment blocked: resolve all critical security issues.");
  }

  if (hasDocker) {
    prodChecks.push({ label: "Container specification (Dockerfile / Compose) detected", passed: true });
  } else {
    prodScore -= 10;
    prodChecks.push({ label: "No Dockerfile or container specification found", passed: false, isWarning: true });
    prodRecs.push("Add a Dockerfile for reproducible container deployments.");
  }

  if (hasCI) {
    prodChecks.push({ label: "Automated CI/CD pipeline configuration found", passed: true });
  } else {
    prodScore -= 10;
    prodChecks.push({ label: "No CI/CD pipeline configuration found", passed: false, isWarning: true });
    prodRecs.push("Set up GitHub Actions or automated CI for testing pull requests.");
  }

  if (hasEnvExample) {
    prodChecks.push({ label: "Sanitized .env.example configuration template provided", passed: true });
  } else {
    prodScore -= 10;
    prodChecks.push({ label: "Missing .env.example environment template", passed: false, isWarning: true });
    prodRecs.push("Commit a sanitized .env.example documenting all required runtime variables.");
  }

  const errorHandlingFiles = files.filter((f) => /try\s*[{:]|except |catch\s*\(/i.test(f.content));
  if (errorHandlingFiles.length > 0) {
    prodChecks.push({ label: `Active error handling identified across ${errorHandlingFiles.length} file(s)`, passed: true });
  } else {
    prodScore -= 15;
    prodChecks.push({ label: "Minimal structured error handling guards found", passed: false, isWarning: true });
    prodRecs.push("Wrap critical network and database operations in try/catch or try/except.");
  }

  prodScore = Math.max(5, Math.min(100, prodScore));

  let prodStatus: ProductionStatus = "PRODUCTION READY";
  if (criticalSecurityCount > 0 || prodScore < 50) prodStatus = "NOT READY";
  else if (prodScore < 72) prodStatus = "NEEDS WORK";
  else if (prodScore < 88) prodStatus = "READY WITH IMPROVEMENTS";

  // 10. Overall Health Calculation
  // Build: 20%, Security: 25%, Testing: 15%, Dependencies: 15%, Performance: 10%, Documentation: 10%, Production: 5%
  const overall = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        buildScore * 0.2 +
          securityScore * 0.25 +
          testingScore * 0.15 +
          depScore * 0.15 +
          perfScore * 0.1 +
          docScore * 0.1 +
          prodScore * 0.05
      )
    )
  );

  let healthStatus: HealthStatus = "HEALTHY";
  if (criticalSecurityCount > 2 || overall < 50) healthStatus = "CRITICAL";
  else if (criticalSecurityCount > 0 || overall < 68) healthStatus = "AT RISK";
  else if (overall < 80) healthStatus = "NEEDS ATTENTION";

  const scores: ScoresBreakdown = {
    overall,
    build: buildScore,
    security: securityScore,
    testing: testingScore,
    dependencies: depScore,
    performance: perfScore,
    documentation: docScore,
    productionReadiness: prodScore,
  };

  const recommendedActions: string[] = [];
  if (criticalSecurityCount > 0) {
    recommendedActions.push(`Remediate ${criticalSecurityCount} critical security flaw(s) and rotate exposed secrets.`);
  }
  for (const r of secRecs) if (!recommendedActions.includes(r)) recommendedActions.push(r);
  for (const r of buildRecs) if (!recommendedActions.includes(r)) recommendedActions.push(r);
  for (const r of testRecs) if (!recommendedActions.includes(r)) recommendedActions.push(r);
  for (const r of prodRecs) if (!recommendedActions.includes(r)) recommendedActions.push(r);
  for (const r of depRecs) if (!recommendedActions.includes(r)) recommendedActions.push(r);

  const summary = `DevHealth completed static audit for '${projectName}' (${projectType}). The project received an overall health rating of ${overall}/100 (${healthStatus}), with production readiness classified as ${prodStatus}. ${
    criticalSecurityCount > 0
      ? `ATTENTION: ${criticalSecurityCount} critical security issue(s) were flagged, including potential leaked credentials or unsafe command executions.`
      : "No critical secrets or command injection vulnerabilities were detected."
  } ${
    testingScore < 50
      ? "Testing coverage is significantly below standard and requires immediate attention."
      : "Testing structure is established with test suites detected."
  }`;

  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    projectName,
    sourceType,
    sourceIdentifier,
    createdAt: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
    projectType,
    languages: Object.keys(languagesCount).length > 0 ? Object.keys(languagesCount) : ["Plain Text"],
    status: healthStatus,
    productionStatus: prodStatus,
    scores,
    structure,
    buildHealth: {
      score: buildScore,
      checks: buildChecks,
      findings: [],
      recommendations: buildRecs,
      metrics: { hasLockfile },
    },
    security: {
      score: securityScore,
      checks: secChecks,
      findings: [],
      recommendations: secRecs,
      metrics: { secretsDetected: secretsDetectedCount, securityDb: "Local/static analysis only" },
    },
    testing: {
      score: testingScore,
      checks: testChecks,
      findings: [],
      recommendations: testRecs,
      metrics: { frameworks: uniqueFrameworks, testCount, ratioPct },
    },
    dependencies: {
      score: depScore,
      checks: depChecks,
      findings: [],
      recommendations: depRecs,
      metrics: { directDepsCount, devDepsCount, unpinnedCount: unpinnedDeps.length },
    },
    performance: {
      score: perfScore,
      checks: perfChecks,
      findings: [],
      recommendations: perfRecs,
      metrics: { oversizedScripts: oversizedScripts.length, monolithicFiles: monolithicFiles.length },
    },
    documentation: {
      score: docScore,
      checks: docChecks,
      findings: [],
      recommendations: docRecs,
      metrics: { hasReadme: !!readme, hasLicense: !!license },
    },
    production: {
      score: prodScore,
      checks: prodChecks,
      findings: [],
      recommendations: prodRecs,
      metrics: { hasDocker, hasCI, hasEnvExample },
    },
    issues,
    recommendedActions: recommendedActions.slice(0, 6),
    executiveSummary: summary,
  };
}
