"""DevHealth Analysis API Routes.
Exposes endpoints for ZIP uploads, public GitHub repository audits, sample analysis, and reports.
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import HTMLResponse
from app.config import MAX_UPLOAD_SIZE_BYTES
from app.database import get_analysis_history, get_project_by_id
from app.models.schemas import AnalysisReport, GitHubAnalyzeRequest, HistoryItem
from app.services.analyzer_service import run_full_analysis
from app.services.github_service import download_github_repo, parse_github_url
from app.services.report_service import generate_html_report
from app.utils.security import safe_extract_zip, sanitize_filename

router = APIRouter(prefix="/api", tags=["Analysis"])


@router.get("/health")
def api_health() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "app": "DevHealth", "version": "1.0.0"}


@router.post("/analyze/upload", response_model=AnalysisReport)
async def analyze_upload(file: UploadFile = File(...)) -> AnalysisReport:
    """Accepts a .zip file, validates size, safely extracts, and executes static audit."""
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .zip archives are supported for file upload.",
        )

    # Read uploaded bytes and verify size
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded ZIP exceeds max limit of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    project_name = sanitize_filename(Path(file.filename).stem)
    temp_dir = Path(tempfile.mkdtemp(prefix="devhealth_upload_"))
    zip_temp_path = temp_dir / "upload.zip"

    try:
        with open(zip_temp_path, "wb") as f:
            f.write(contents)

        extract_dir = temp_dir / "extracted"
        extract_dir.mkdir(parents=True, exist_ok=True)
        safe_extract_zip(zip_temp_path, extract_dir)

        # Detect if extracted contents are nested in a single folder
        children = [c for c in extract_dir.iterdir() if c.is_dir() and not c.name.startswith(".")]
        working_dir = children[0] if len(children) == 1 else extract_dir

        report = run_full_analysis(
            project_dir=working_dir,
            project_name=project_name,
            source_type="upload",
            source_identifier=file.filename,
        )
        return report

    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Analysis failed: {str(exc)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/analyze/github", response_model=AnalysisReport)
async def analyze_github(request: GitHubAnalyzeRequest) -> AnalysisReport:
    """Clones public GitHub repository archive and performs static analysis."""
    try:
        owner, repo = parse_github_url(request.github_url)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    temp_dir = Path(tempfile.mkdtemp(prefix="devhealth_gh_"))
    try:
        working_dir, repo_identifier = await download_github_repo(owner, repo, temp_dir)
        report = run_full_analysis(
            project_dir=working_dir,
            project_name=repo,
            source_type="github",
            source_identifier=f"github.com/{repo_identifier}",
        )
        return report
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"GitHub analysis failed: {str(exc)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.get("/project/{project_id}", response_model=AnalysisReport)
def get_project(project_id: str) -> AnalysisReport:
    """Retrieve historical project analysis report by ID."""
    data = get_project_by_id(project_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project analysis not found.")
    return AnalysisReport(**data)


@router.get("/history", response_model=List[HistoryItem])
def get_history() -> List[HistoryItem]:
    """Retrieve analysis history timeline."""
    history = get_analysis_history()
    return [HistoryItem(**item) for item in history]


@router.get("/report/{project_id}", response_class=HTMLResponse)
def get_html_report_view(project_id: str) -> HTMLResponse:
    """Downloadable / print-ready HTML report view."""
    data = get_project_by_id(project_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    report = AnalysisReport(**data)
    html_content = generate_html_report(report)
    return HTMLResponse(content=html_content)
