"""DevHealth SQLite Persistence Layer.
Uses Python's standard sqlite3 module for zero-dependency local storage.
"""

import json
import sqlite3
from typing import Any, Dict, List, Optional
from datetime import datetime
from app.config import SQLITE_DB_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(SQLITE_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database tables."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_identifier TEXT,
                project_type TEXT NOT NULL,
                created_at TEXT NOT NULL,
                overall_score INTEGER NOT NULL,
                build_score INTEGER NOT NULL,
                security_score INTEGER NOT NULL,
                testing_score INTEGER NOT NULL,
                dependencies_score INTEGER NOT NULL,
                performance_score INTEGER NOT NULL,
                documentation_score INTEGER NOT NULL,
                production_score INTEGER NOT NULL,
                status TEXT NOT NULL,
                issue_count INTEGER NOT NULL,
                critical_issue_count INTEGER NOT NULL,
                result_json TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_projects_created_at 
            ON projects(created_at DESC)
        """)
        conn.commit()


def save_project_analysis(report_dict: Dict[str, Any]) -> str:
    """Save an entire analysis report into SQLite."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO projects (
                id, name, source_type, source_identifier, project_type,
                created_at, overall_score, build_score, security_score,
                testing_score, dependencies_score, performance_score,
                documentation_score, production_score, status,
                issue_count, critical_issue_count, result_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report_dict["id"],
            report_dict["project_name"],
            report_dict.get("source_type", "upload"),
            report_dict.get("source_identifier", ""),
            report_dict["project_type"],
            report_dict.get("created_at", datetime.utcnow().isoformat()),
            report_dict["scores"]["overall"],
            report_dict["scores"]["build"],
            report_dict["scores"]["security"],
            report_dict["scores"]["testing"],
            report_dict["scores"]["dependencies"],
            report_dict["scores"]["performance"],
            report_dict["scores"]["documentation"],
            report_dict["scores"]["production_readiness"],
            report_dict["status"],
            len(report_dict.get("issues", [])),
            sum(1 for i in report_dict.get("issues", []) if i.get("severity") == "CRITICAL"),
            json.dumps(report_dict)
        ))
        conn.commit()
    return report_dict["id"]


def get_project_by_id(project_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an analysis by its UUID."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT result_json FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        if row and row["result_json"]:
            return json.loads(row["result_json"])
    return None


def get_analysis_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Get summarized analysis history for the history timeline and list."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                id, name, source_type, project_type, created_at,
                overall_score, build_score, security_score, testing_score,
                dependencies_score, performance_score, documentation_score,
                production_score, status, issue_count, critical_issue_count
            FROM projects
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
