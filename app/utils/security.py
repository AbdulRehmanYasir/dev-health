"""DevHealth Security Utilities.
Hardened path verification, ZIP bomb protection, secret masking, and pattern detectors.
"""

import os
import re
import zipfile
from pathlib import Path
from typing import List, Optional, Tuple
from app.config import (
    MAX_UPLOAD_SIZE_BYTES,
    MAX_FILES_TO_EXTRACT,
    IGNORED_DIRS,
    IGNORED_EXTENSIONS,
)


def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    """Ensure target_path does not escape outside base_dir via symlinks or '..' traversal."""
    try:
        resolved_base = base_dir.resolve()
        resolved_target = target_path.resolve()
        return resolved_base in resolved_target.parents or resolved_base == resolved_target
    except (ValueError, RuntimeError):
        return False


def sanitize_filename(filename: str) -> str:
    """Remove path traversal sequences and dangerous characters."""
    clean = re.sub(r"[\\/]+", "_", filename)
    clean = re.sub(r"[^a-zA-Z0-9._-]", "", clean)
    return clean or "unnamed_project"


def mask_secret(secret_val: str) -> str:
    """Mask sensitive string, showing only first 2-3 chars and last 4 chars."""
    clean = secret_val.strip("'\" \t\r\n")
    length = len(clean)
    if length <= 8:
        return "********"
    prefix_len = 3 if length > 12 else 2
    suffix_len = 4 if length > 12 else 2
    masked_middle = "*" * max(8, length - prefix_len - suffix_len)
    return f"{clean[:prefix_len]}{masked_middle}{clean[-suffix_len:]}"


def safe_extract_zip(zip_path: Path, extract_to: Path) -> List[Path]:
    """Safely extract a ZIP archive while preventing path traversal and ZIP bombs."""
    extracted_files: List[Path] = []
    total_uncompressed_size = 0

    if not zipfile.is_zipfile(zip_path):
        raise ValueError("Uploaded file is not a valid ZIP archive.")

    with zipfile.ZipFile(zip_path, "r") as zf:
        infolist = zf.infolist()
        if len(infolist) > MAX_FILES_TO_EXTRACT:
            raise ValueError(f"ZIP contains too many entries ({len(infolist)} > {MAX_FILES_TO_EXTRACT}).")

        for member in infolist:
            # Check for suspicious compression ratio / zip bomb
            total_uncompressed_size += member.file_size
            if total_uncompressed_size > MAX_UPLOAD_SIZE_BYTES * 4:
                raise ValueError("ZIP uncompressed size exceeds maximum safety threshold (ZIP bomb protection).")

            # Check filename for traversal
            normalized_name = os.path.normpath(member.filename)
            if normalized_name.startswith("..") or os.path.isabs(normalized_name):
                continue  # Skip dangerous entry

            parts = normalized_name.split(os.sep)
            if any(part in IGNORED_DIRS for part in parts):
                continue  # Skip vendor / git / cache folders

            dest_path = extract_to / normalized_name
            if not is_safe_path(extract_to, dest_path):
                continue

            # Prevent directory or symlink tricks
            if member.is_dir():
                dest_path.mkdir(parents=True, exist_ok=True)
                continue

            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as source, open(dest_path, "wb") as target:
                target.write(source.read())

            extracted_files.append(dest_path)

    return extracted_files


# Common Secret and Credential Patterns with Category & Severity
SECRET_PATTERNS: List[Tuple[str, str, str, str]] = [
    (
        "OpenAI API Key",
        r"\b(sk-[a-zA-Z0-9_-]{20,64})\b",
        "CRITICAL",
        "Potential hardcoded OpenAI secret key found in source code.",
    ),
    (
        "AWS Access Key ID",
        r"\b(AKIA[0-9A-Z]{16})\b",
        "CRITICAL",
        "Potential hardcoded AWS Access Key ID detected.",
    ),
    (
        "GitHub Personal Access Token",
        r"\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{60,82})\b",
        "CRITICAL",
        "Hardcoded GitHub authentication token detected.",
    ),
    (
        "Google API Key",
        r"\b(AIza[0-9A-Za-z\\-_]{35})\b",
        "HIGH",
        "Exposed Google Cloud / Maps / Firebase API Key found.",
    ),
    (
        "Stripe Secret / Live Key",
        r"\b(sk_live_[0-9a-zA-Z]{24,34}|rk_live_[0-9a-zA-Z]{24,34})\b",
        "CRITICAL",
        "Live Stripe payment processing secret key exposed.",
    ),
    (
        "Slack Bot / User Token",
        r"\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b",
        "HIGH",
        "Slack OAuth/Bot token found in plain text.",
    ),
    (
        "Generic Private Key",
        r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
        "CRITICAL",
        "Cryptographic private key file or block committed to source control.",
    ),
    (
        "Hardcoded Password Assignment",
        r"""(?i)\b(?:password|passwd|pwd|secret|api_key|apikey)\s*[:=]\s*["']([^"'\s]{6,64})["']""",
        "HIGH",
        "Hardcoded password or secret string directly assigned in code.",
    ),
]
