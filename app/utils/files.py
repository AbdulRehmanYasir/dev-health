"""DevHealth File Processing and Hierarchy Utilities.
Safe directory reading, tree structure builder, and extension classifiers.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from app.config import (
    IGNORED_DIRS,
    IGNORED_EXTENSIONS,
    MAX_FILE_SIZE_BYTES_TO_ANALYZE,
)
from app.models.schemas import TreeNode


EXTENSION_TO_LANGUAGE: Dict[str, str] = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "React (JSX)",
    ".ts": "TypeScript",
    ".tsx": "React (TSX)",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sass": "Sass",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
    ".rst": "reStructuredText",
    ".sql": "SQL",
    ".sh": "Shell Script",
    ".bash": "Shell Script",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".c": "C",
    ".cpp": "C++",
    ".h": "C/C++ Header",
    ".php": "PHP",
    ".rb": "Ruby",
}


def read_text_safe(file_path: Path, max_bytes: int = MAX_FILE_SIZE_BYTES_TO_ANALYZE) -> str:
    """Safely read up to max_bytes of text from a file with encoding fallbacks."""
    try:
        with open(file_path, "rb") as f:
            raw = f.read(max_bytes)
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            return raw.decode("latin-1", errors="replace")
    except Exception:
        return ""


def build_directory_tree(root_dir: Path, max_depth: int = 4, current_depth: int = 0) -> TreeNode:
    """Build a serializable recursive directory tree for the project structure."""
    node = TreeNode(
        name=root_dir.name or "PROJECT",
        path=str(root_dir.name),
        is_dir=True,
        children=[],
        size=0,
    )

    if current_depth >= max_depth:
        return node

    try:
        entries = sorted(list(root_dir.iterdir()), key=lambda e: (not e.is_dir(), e.name.lower()))
    except Exception:
        return node

    for entry in entries:
        if entry.is_dir():
            if entry.name in IGNORED_DIRS or entry.name.startswith("."):
                continue
            child_node = build_directory_tree(entry, max_depth=max_depth, current_depth=current_depth + 1)
            if node.children is None:
                node.children = []
            node.children.append(child_node)
        else:
            if entry.suffix.lower() in IGNORED_EXTENSIONS:
                continue
            file_size = 0
            try:
                file_size = entry.stat().st_size
            except Exception:
                pass
            file_node = TreeNode(
                name=entry.name,
                path=str(entry.relative_to(root_dir.parent if current_depth > 0 else root_dir)),
                is_dir=False,
                size=file_size,
            )
            if node.children is None:
                node.children = []
            node.children.append(file_node)

    return node
