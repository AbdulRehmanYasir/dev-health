
"""GitHub repository download service for DevHealth."""

import re
import tempfile
from pathlib import Path
from typing import Tuple

import httpx

from app.config import MAX_UPLOAD_SIZE_BYTES, REQUEST_TIMEOUT_SECONDS
from app.utils.security import safe_extract_zip


GITHUB_URL_REGEX = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/"
    r"([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?:/.*)?$"
)


def parse_github_url(url: str) -> Tuple[str, str]:
    """Extract owner and repository name from a GitHub URL."""
    clean_url = url.strip().rstrip("/")

    match = GITHUB_URL_REGEX.match(clean_url)

    if match:
        owner, repo = match.groups()
        return owner, repo.removesuffix(".git")

    shorthand = re.match(
        r"^([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)$",
        clean_url,
    )

    if shorthand:
        owner, repo = shorthand.groups()
        return owner, repo.removesuffix(".git")

    raise ValueError(
        "Invalid GitHub repository URL. Use "
        "'https://github.com/owner/repo' or 'owner/repo'."
    )


async def download_github_repo(
    owner: str,
    repo: str,
    destination_dir: Path,
) -> Tuple[Path, str]:
    """Download and safely extract a public GitHub repository."""

    candidates = [
        f"https://github.com/{owner}/{repo}/archive/refs/heads/main.zip",
        f"https://github.com/{owner}/{repo}/archive/refs/heads/master.zip",
    ]

    headers = {
        "User-Agent": "DevHealth/1.0",
        "Accept": "application/zip, application/octet-stream, */*",
    }

    zip_bytes = b""
    last_error = "Repository not found or private."

    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT_SECONDS,
        follow_redirects=True,
    ) as client:

        for archive_url in candidates:
            try:
                response = await client.get(
                    archive_url,
                    headers=headers,
                )

                if response.status_code != 200:
                    last_error = (
                        f"GitHub returned HTTP {response.status_code} "
                        f"for {archive_url}"
                    )
                    continue

                content = response.content

                if not content:
                    last_error = "GitHub returned an empty archive."
                    continue

                if len(content) > MAX_UPLOAD_SIZE_BYTES:
                    raise ValueError(
                        "Repository archive exceeds the maximum size limit "
                        f"of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB."
                    )

                # A ZIP file starts with PK.
                if not content.startswith(b"PK"):
                    content_type = response.headers.get(
                        "content-type",
                        "unknown",
                    )

                    last_error = (
                        "GitHub did not return a valid ZIP archive. "
                        f"Received Content-Type: {content_type}"
                    )
                    continue

                zip_bytes = content
                break

            except httpx.RequestError as exc:
                last_error = f"Connection error: {exc}"

    if not zip_bytes:
        raise ValueError(
            f"Could not download GitHub repository "
            f"'{owner}/{repo}'. {last_error}"
        )

    with tempfile.NamedTemporaryFile(
        suffix=".zip",
        delete=False,
    ) as tmp_zip:
        tmp_zip.write(zip_bytes)
        tmp_zip_path = Path(tmp_zip.name)

    try:
        extract_root = destination_dir / f"{owner}_{repo}"
        extract_root.mkdir(
            parents=True,
            exist_ok=True,
        )

        safe_extract_zip(
            tmp_zip_path,
            extract_root,
        )

        subdirs = [
            item
            for item in extract_root.iterdir()
            if item.is_dir()
        ]

        if len(subdirs) == 1:
            target_dir = subdirs[0]
        else:
            target_dir = extract_root

        return target_dir, f"{owner}/{repo}"

    finally:
        if tmp_zip_path.exists():
            tmp_zip_path.unlink()
