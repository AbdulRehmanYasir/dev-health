"""DevHealth Template Page Routes.
Serves server-rendered Jinja2 views for direct browser navigation.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.database import get_analysis_history, get_project_by_id


router = APIRouter(tags=["Pages"])


TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"

templates = (
    Jinja2Templates(directory=str(TEMPLATES_DIR))
    if TEMPLATES_DIR.is_dir()
    else None
)


@router.get("/", response_class=HTMLResponse)
def index_page(request: Request):
    if templates and (TEMPLATES_DIR / "index.html").is_file():
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "request": request,
                "history": get_analysis_history(5),
            },
        )

    return HTMLResponse(
        "<h1>DevHealth Backend Running</h1>"
        "<p>API docs at <a href='/docs'>/docs</a></p>"
    )


@router.get("/dashboard/{project_id}", response_class=HTMLResponse)
def dashboard_page(request: Request, project_id: str):
    data = get_project_by_id(project_id)

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    if templates and (TEMPLATES_DIR / "dashboard.html").is_file():
        return templates.TemplateResponse(
            request=request,
            name="dashboard.html",
            context={
                "request": request,
                "project": data,
            },
        )

    return HTMLResponse(
        f"<h1>Dashboard: {data['project_name']}</h1>"
    )