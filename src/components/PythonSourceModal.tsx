import React, { useState } from "react";
import { X, Copy, Check, Terminal, FileCode, CheckCircle2 } from "lucide-react";

interface PythonSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonSourceModal: React.FC<PythonSourceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeFile, setActiveFile] = useState<string>("main.py");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const files: Record<string, { desc: string; code: string }> = {
    "main.py": {
      desc: "FastAPI server entrypoint mounting API routers and SQLite schema.",
      code: `import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.config import APP_NAME, APP_TAGLINE, HOST, PORT, VERSION
from app.database import init_db
from app.routes.analysis import router as analysis_router
from app.routes.pages import router as pages_router

app = FastAPI(title=APP_NAME, description=APP_TAGLINE, version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(pages_router)

@app.on_event("startup")
def on_startup():
    init_db()

if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
`,
    },
    "app/analyzers/security.py": {
      desc: "Scans for hardcoded secrets, shell=True, SQL injection, and masks sensitive data.",
      code: `import re
from pathlib import Path
from typing import List, Tuple
from app.models.schemas import Category, CategoryResult, CheckItem, Issue, Severity
from app.utils.security import mask_secret, DANGEROUS_PATTERNS, SECRET_PATTERNS
from app.utils.files import is_text_file, read_text_safe

def analyze_security(project_dir: Path) -> Tuple[CategoryResult, List[Issue]]:
    issues: List[Issue] = []
    score = 100
    # AST and regex scanning with strict secret masking...
    # (Inspect full file in /app/analyzers/security.py)
    return CategoryResult(score=score, ...), issues
`,
    },
    "requirements.txt": {
      desc: "Zero paid APIs. Python standard library + FastAPI + Uvicorn.",
      code: `fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
jinja2>=3.1.3
httpx>=0.27.0
pytest>=8.0.0
`,
    },
    "How to Run": {
      desc: "Terminal instructions to run DevHealth natively on any machine.",
      code: `# 1. Clone repository
git clone https://github.com/your-org/devhealth.git
cd devhealth

# 2. Set up virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install requirements
pip install -r requirements.txt

# 4. Start DevHealth server
python main.py

# 5. Open in browser
http://127.0.0.1:8000
# OpenAPI Docs: http://127.0.0.1:8000/docs
`,
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
              Python 3.11 + FastAPI Architecture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          {Object.keys(files).map((fileName) => (
            <button
              key={fileName}
              onClick={() => setActiveFile(fileName)}
              className={`px-3 py-1.5 rounded-t text-xs font-mono font-medium transition-colors ${
                activeFile === fileName
                  ? "bg-slate-900 text-cyan-400 border-t border-x border-slate-800"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {fileName}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{files[activeFile].desc}</span>
            <button
              onClick={handleCopy}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy Snippet
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 overflow-x-auto leading-relaxed">
            <code>{files[activeFile].code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
