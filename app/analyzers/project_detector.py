"""DevHealth Project Detector.
Detects project framework, runtime environment, and programming languages.
"""

from pathlib import Path
from typing import Dict, List, Set, Tuple
from app.utils.files import EXTENSION_TO_LANGUAGE, read_text_safe


def detect_project_type_and_languages(project_dir: Path) -> Tuple[str, List[str]]:
    """Inspects root files and manifests to infer primary framework and programming languages."""
    languages_set: Set[str] = set()
    indicators: List[str] = []

    # Check files at root and 1st depth
    root_files = {p.name.lower(): p for p in project_dir.glob("*")}
    has_package_json = "package.json" in root_files
    has_requirements = "requirements.txt" in root_files or "pyproject.toml" in root_files or "pipfile" in root_files
    has_vite = any("vite.config" in name for name in root_files)
    has_next = any("next.config" in name for name in root_files)
    has_docker = "dockerfile" in root_files or "docker-compose.yml" in root_files or "docker-compose.yaml" in root_files
    has_cargo = "cargo.toml" in root_files
    has_go_mod = "go.mod" in root_files

    # Package.json inspection for libraries
    package_deps: Set[str] = set()
    if has_package_json:
        content = read_text_safe(root_files["package.json"])
        import json
        try:
            pkg_data = json.loads(content)
            deps = pkg_data.get("dependencies", {})
            dev_deps = pkg_data.get("devDependencies", {})
            package_deps = set(deps.keys()).union(set(dev_deps.keys()))
        except Exception:
            pass

    # Detect Framework
    project_type = "Generic Project"

    if has_package_json:
        if has_next or "next" in package_deps:
            project_type = "Next.js"
        elif "react" in package_deps:
            project_type = "React + Vite" if has_vite else "React"
        elif "vue" in package_deps or "nuxt" in package_deps:
            project_type = "Vue.js"
        elif "express" in package_deps:
            project_type = "Express / Node.js"
        elif "fastify" in package_deps or "nestjs" in package_deps:
            project_type = "Node.js Backend"
        else:
            project_type = "JavaScript / Node.js"

    elif has_requirements:
        req_text = ""
        if "requirements.txt" in root_files:
            req_text += read_text_safe(root_files["requirements.txt"]).lower()
        if "pyproject.toml" in root_files:
            req_text += read_text_safe(root_files["pyproject.toml"]).lower()

        if "fastapi" in req_text:
            project_type = "FastAPI / Python"
        elif "django" in req_text:
            project_type = "Django / Python"
        elif "flask" in req_text:
            project_type = "Flask / Python"
        else:
            project_type = "Python Application"

    elif has_cargo:
        project_type = "Rust Cargo"
    elif has_go_mod:
        project_type = "Go Application"

    # Scan extensions to discover languages
    file_count = 0
    for path in project_dir.rglob("*"):
        if path.is_file() and file_count < 2000:
            ext = path.suffix.lower()
            if ext in EXTENSION_TO_LANGUAGE:
                languages_set.add(EXTENSION_TO_LANGUAGE[ext])
            file_count += 1

    if not languages_set:
        languages_set.add("Plain Text")

    # Order languages logically
    sorted_languages = sorted(list(languages_set))
    return project_type, sorted_languages
