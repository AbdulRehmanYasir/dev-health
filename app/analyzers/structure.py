"""DevHealth Project Structure Analyzer.
Scans file hierarchies, detects suspicious files, large files, and builds the visual tree.
"""

import os
from pathlib import Path
from typing import Any, Dict, List
from app.config import IGNORED_DIRS, IGNORED_EXTENSIONS
from app.models.schemas import ProjectStructure
from app.utils.files import build_directory_tree, EXTENSION_TO_LANGUAGE


CONFIG_EXTENSIONS = {".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".xml", ".env"}
DOC_EXTENSIONS = {".md", ".rst", ".txt", ".pdf"}
SOURCE_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".c", ".cpp", ".rb", ".php"}

SUSPICIOUS_NAMES = {
    ".env", ".env.local", ".env.production", ".env.secret",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
    "credentials.json", "service-account.json", "secrets.json",
    "server.key", "privkey.pem", "private.key",
    ".bak", ".old", ".backup", "debug.log"
}


def analyze_structure(project_dir: Path) -> ProjectStructure:
    """Analyze file counts, categories, large/suspicious files, and directory tree."""
    total_files = 0
    total_dirs = 0
    source_count = 0
    test_count = 0
    config_count = 0
    doc_count = 0

    large_files: List[Dict[str, Any]] = []
    suspicious_files: List[Dict[str, Any]] = []
    env_files: List[str] = []
    lang_counter: Dict[str, int] = {}

    for root, dirs, files in os.walk(project_dir):
        # Prune ignored directories in-place
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]
        total_dirs += len(dirs)

        rel_dir = os.path.relpath(root, project_dir)
        is_test_dir = any(part.lower() in ("test", "tests", "__tests__", "spec", "specs") for part in Path(rel_dir).parts)

        for filename in files:
            file_path = Path(root) / filename
            rel_file_path = os.path.relpath(file_path, project_dir)
            total_files += 1

            ext = file_path.suffix.lower()
            if ext in IGNORED_EXTENSIONS:
                continue

            try:
                size_bytes = file_path.stat().st_size
            except Exception:
                size_bytes = 0

            # Check large files (> 200 KB)
            if size_bytes > 200 * 1024:
                large_files.append({
                    "path": rel_file_path,
                    "size_kb": round(size_bytes / 1024, 1),
                })

            # Check suspicious files
            lower_name = filename.lower()
            if lower_name in SUSPICIOUS_NAMES or any(lower_name.endswith(s) for s in (".pem", ".key", ".pfx", ".p12", ".bak", ".old")):
                suspicious_files.append({
                    "path": rel_file_path,
                    "reason": "Potential sensitive credential or backup file committed to repository",
                })

            # Check env files
            if ".env" in lower_name:
                env_files.append(rel_file_path)

            # Categorize
            is_test_file = is_test_dir or "test" in lower_name or "spec" in lower_name
            if is_test_file:
                test_count += 1
            elif ext in SOURCE_EXTENSIONS:
                source_count += 1
                lang = EXTENSION_TO_LANGUAGE.get(ext, "Other")
                lang_counter[lang] = lang_counter.get(lang, 0) + 1
            elif ext in CONFIG_EXTENSIONS or filename.startswith("."):
                config_count += 1
            elif ext in DOC_EXTENSIONS or "readme" in lower_name or "license" in lower_name:
                doc_count += 1

    primary_lang = max(lang_counter.items(), key=lambda x: x[1])[0] if lang_counter else "Unknown"

    tree = build_directory_tree(project_dir, max_depth=4)

    return ProjectStructure(
        total_files=total_files,
        total_dirs=total_dirs,
        source_files_count=source_count,
        test_files_count=test_count,
        config_files_count=config_count,
        doc_files_count=doc_count,
        large_files=sorted(large_files, key=lambda x: x["size_kb"], reverse=True)[:10],
        suspicious_files=suspicious_files,
        env_files=env_files,
        tree=tree,
        languages=lang_counter,
        primary_language=primary_lang,
    )
