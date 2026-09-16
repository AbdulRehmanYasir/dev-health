"""DevHealth Performance Analyzer.
Static performance checks detecting oversized bundles, unoptimized assets,
monolithic source files, and inefficient nested loops.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple
from app.config import IGNORED_DIRS
from app.models.schemas import CategoryResult, CheckItem, Issue, Severity, Category
from app.utils.files import read_text_safe


def analyze_performance(project_dir: Path) -> Tuple[CategoryResult, List[Issue]]:
    """Heuristic static performance checks on asset sizes, file complexity, and loops."""
    score = 100
    checks: List[CheckItem] = []
    issues: List[Issue] = []
    findings: List[str] = []
    recommendations: List[str] = []

    large_js_files: List[str] = []
    large_css_files: List[str] = []
    large_images: List[str] = []
    monolithic_files: List[str] = []
    nested_loop_locations: List[Tuple[str, int]] = []
    repeated_io_in_loops: List[Tuple[str, int]] = []

    image_extensions = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}

    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]

        for filename in files:
            file_path = Path(root) / filename
            rel_file_path = os.path.relpath(file_path, project_dir)
            ext = file_path.suffix.lower()

            try:
                size_bytes = file_path.stat().st_size
            except Exception:
                size_bytes = 0

            # 1. Large Image Check (> 800 KB)
            if ext in image_extensions:
                if size_bytes > 800 * 1024:
                    large_images.append(f"{rel_file_path} ({round(size_bytes / 1024)} KB)")

            # 2. Large JS / CSS Check
            if ext in (".js", ".ts", ".jsx", ".tsx") and not filename.endswith(".min.js"):
                if size_bytes > 250 * 1024:
                    large_js_files.append(f"{rel_file_path} ({round(size_bytes / 1024)} KB)")
            elif ext in (".css", ".scss") and not filename.endswith(".min.css"):
                if size_bytes > 120 * 1024:
                    large_css_files.append(f"{rel_file_path} ({round(size_bytes / 1024)} KB)")

            # 3. Code complexity and loops for Python and JS
            if ext in (".py", ".js", ".ts", ".jsx", ".tsx"):
                content = read_text_safe(file_path)
                if not content:
                    continue

                lines = content.splitlines()
                # Monolithic file check (> 800 lines)
                if len(lines) > 800:
                    monolithic_files.append(f"{rel_file_path} ({len(lines)} lines)")

                # Python specific loop heuristics
                if ext == ".py":
                    for i in range(len(lines) - 2):
                        l1 = lines[i]
                        l2 = lines[i + 1]
                        # Check nested for loops with indentation
                        if re.match(r"^\s*for\s+.*\s+in\s+.*:\s*$", l1) and re.match(r"^\s{4,}for\s+.*\s+in\s+.*:\s*$", l2):
                            nested_loop_locations.append((rel_file_path, i + 1))
                            break

                        # Check file open inside loop
                        if "for " in l1 and "open(" in l2:
                            repeated_io_in_loops.append((rel_file_path, i + 2))
                            break

    # 1. Large JavaScript Files
    if large_js_files:
        score -= 15
        checks.append(CheckItem(
            label=f"{len(large_js_files)} oversized script file(s) (>250KB)",
            passed=False,
            is_warning=True,
            details=f"Oversized: {', '.join(large_js_files[:2])}"
        ))
        recommendations.append("Apply dynamic code-splitting (import()) to reduce primary bundle sizes.")
        issues.append(Issue(
            id="PERF-001",
            title="Oversized Source Scripts Detected",
            severity=Severity.MEDIUM,
            category=Category.PERFORMANCE,
            file=large_js_files[0].split()[0],
            description=f"Large script file found: {large_js_files[0]}",
            why_it_matters="Large unminified or monolithic scripts delay First Contentful Paint (FCP) and increase client CPU load.",
            recommended_fix="Split complex components into lazy-loaded modules and optimize third-party imports."
        ))
    else:
        checks.append(CheckItem(label="No excessively large client-side script bundles", passed=True))

    # 2. Images Check
    if large_images:
        score -= 10
        checks.append(CheckItem(
            label=f"{len(large_images)} uncompressed image(s) (>800KB)",
            passed=False,
            is_warning=True,
            details=f"Large assets: {', '.join(large_images[:2])}"
        ))
        recommendations.append("Compress heavy static assets using WebP/AVIF formats or image CDNs.")
    else:
        checks.append(CheckItem(label="Image asset sizes are within acceptable limits", passed=True))

    # 3. Monolithic Files
    if monolithic_files:
        score -= 10
        checks.append(CheckItem(
            label=f"{len(monolithic_files)} monolithic file(s) (>800 lines)",
            passed=False,
            is_warning=True,
            details=f"Monoliths: {', '.join(monolithic_files[:2])}"
        ))
        recommendations.append("Break large modules exceeding 800 lines into focused, cohesive submodules.")
    else:
        checks.append(CheckItem(label="No monolithic single-file bottlenecks (>800 lines)", passed=True))

    # 4. Nested Loops / Repeated IO
    if repeated_io_in_loops:
        score -= 15
        file_name, line_num = repeated_io_in_loops[0]
        checks.append(CheckItem(
            label="Repeated file I/O operations inside loop",
            passed=False,
            is_warning=True,
            details=f"Detected at {file_name}:{line_num}"
        ))
        recommendations.append("Buffer file reads outside of tight iterations to prevent filesystem bottlenecks.")
        issues.append(Issue(
            id="PERF-002",
            title="File I/O Inside Iteration Loop",
            severity=Severity.MEDIUM,
            category=Category.PERFORMANCE,
            file=file_name,
            line=line_num,
            description="Repeatedly calling open() or read inside a loop incurs significant disk I/O latency.",
            why_it_matters="Disk operations are thousands of times slower than memory operations; repeating them in loops severely degrades throughput.",
            recommended_fix="Read file contents into memory before the loop, or batch write operations."
        ))
    elif nested_loop_locations:
        checks.append(CheckItem(
            label="Nested quadratic loops detected (O(n²))",
            passed=False,
            is_warning=True,
            details=f"Found in {nested_loop_locations[0][0]}:{nested_loop_locations[0][1]}"
        ))
        recommendations.append("Consider replacing nested loops with hash map / dictionary lookups for O(1) complexity.")
    else:
        checks.append(CheckItem(label="No obvious nested loop or I/O performance anti-patterns", passed=True))

    final_score = max(20, min(100, score))
    return CategoryResult(
        score=final_score,
        checks=checks,
        findings=findings,
        recommendations=recommendations,
        metrics={
            "large_scripts_count": len(large_js_files),
            "large_images_count": len(large_images),
            "monolithic_files_count": len(monolithic_files),
            "loop_warnings_count": len(nested_loop_locations) + len(repeated_io_in_loops),
        }
    ), issues
