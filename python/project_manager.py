import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class ProjectManager:
    def __init__(self, db_path: Optional[str] = None) -> None:
        if db_path is None:
            base_dir = Path.home() / ".bioviz_local"
            base_dir.mkdir(parents=True, exist_ok=True)
            db_path = str(base_dir / "project_memory.db")
        self.db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    file_path TEXT,
                    file_name TEXT,
                    created_at TEXT,
                    data_type TEXT,
                    pathway_id TEXT,
                    pathway_name TEXT,
                    gene_count INTEGER,
                    has_pvalue INTEGER,
                    insights_summary TEXT,
                    config_json TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS project_genes (
                    project_id INTEGER,
                    gene TEXT,
                    score REAL,
                    direction TEXT,
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS enrichment_audits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT,
                    file_path TEXT,
                    method TEXT,
                    gene_set_source TEXT,
                    metadata_json TEXT,
                    summary_json TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS de_analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT,
                    file_path TEXT,
                    method TEXT,
                    group1_json TEXT,
                    group2_json TEXT,
                    qc_json TEXT,
                    summary_json TEXT
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_projects_pathway ON projects(pathway_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_project_genes_gene ON project_genes(gene)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_enrichment_audits_created ON enrichment_audits(created_at)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_enrichment_audits_file ON enrichment_audits(file_path)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_de_analyses_created ON de_analyses(created_at)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_de_analyses_file ON de_analyses(file_path)"
            )

    def record_analysis(
        self,
        *,
        file_path: Optional[str],
        data_type: str,
        pathway_id: Optional[str],
        pathway_name: Optional[str],
        gene_count: int,
        has_pvalue: bool,
        insights_summary: Optional[str],
        top_genes: Optional[List[Dict[str, Any]]],
        config: Optional[Dict[str, Any]] = None,
    ) -> Optional[int]:
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        file_name = None
        if file_path:
            file_name = Path(file_path).name

        config_json = json.dumps(config or {}, ensure_ascii=False)

        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO projects (
                    session_id, file_path, file_name, created_at, data_type,
                    pathway_id, pathway_name, gene_count, has_pvalue, insights_summary,
                    config_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    file_path,
                    file_name,
                    created_at,
                    data_type,
                    pathway_id,
                    pathway_name,
                    gene_count,
                    1 if has_pvalue else 0,
                    insights_summary,
                    config_json,
                ),
            )
            project_id = cursor.lastrowid

            if top_genes:
                conn.executemany(
                    """
                    INSERT INTO project_genes (project_id, gene, score, direction)
                    VALUES (?, ?, ?, ?)
                    """,
                    [
                        (
                            project_id,
                            g.get("gene"),
                            float(g.get("score") or 0.0),
                            g.get("direction"),
                        )
                        for g in top_genes
                        if g.get("gene")
                    ],
                )

            return project_id

    def list_recent(self, limit: int = 8) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, session_id, file_path, file_name, created_at,
                       pathway_id, pathway_name, gene_count, has_pvalue
                FROM projects
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_pathway_frequency(self, limit: int = 6) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT pathway_id, pathway_name, COUNT(*) as count
                FROM projects
                WHERE pathway_id IS NOT NULL
                GROUP BY pathway_id, pathway_name
                ORDER BY count DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_gene_context(self, genes: List[str], limit: int = 5) -> List[Dict[str, Any]]:
        if not genes:
            return []
        placeholders = ",".join(["?"] * len(genes))
        query = f"""
            SELECT p.id, p.file_name, p.pathway_id, p.pathway_name, p.created_at,
                   g.gene, g.score, g.direction
            FROM project_genes g
            JOIN projects p ON p.id = g.project_id
            WHERE g.gene IN ({placeholders})
            ORDER BY p.created_at DESC
            LIMIT ?
        """
        with self._connect() as conn:
            rows = conn.execute(query, (*genes, limit)).fetchall()
        return [dict(row) for row in rows]

    def record_enrichment_run(
        self,
        *,
        file_path: Optional[str],
        method: str,
        gene_set_source: Optional[str],
        metadata: Optional[Dict[str, Any]],
        summary: Optional[Dict[str, Any]] = None,
    ) -> Optional[int]:
        created_at = datetime.utcnow().isoformat()
        metadata_json = json.dumps(metadata or {}, ensure_ascii=False)
        summary_json = json.dumps(summary or {}, ensure_ascii=False)

        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO enrichment_audits (
                    created_at, file_path, method, gene_set_source,
                    metadata_json, summary_json
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    created_at,
                    file_path,
                    method,
                    gene_set_source,
                    metadata_json,
                    summary_json,
                ),
            )
            return cursor.lastrowid

    def list_enrichment_audits(
        self,
        *,
        file_path: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        query = """
            SELECT id, created_at, file_path, method, gene_set_source,
                   metadata_json, summary_json
            FROM enrichment_audits
        """
        params: List[Any] = []
        if file_path:
            query += " WHERE file_path = ?"
            params.append(file_path)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()

        results = []
        for row in rows:
            item = dict(row)
            try:
                item["metadata"] = json.loads(item.get("metadata_json") or "{}")
            except Exception:
                item["metadata"] = {}
            try:
                item["summary"] = json.loads(item.get("summary_json") or "{}")
            except Exception:
                item["summary"] = {}
            results.append(item)
        return results

    def record_de_analysis(
        self,
        *,
        file_path: Optional[str],
        method: str,
        group1_samples: List[str],
        group2_samples: List[str],
        qc_report: Optional[Dict[str, Any]],
        summary: Optional[Dict[str, Any]] = None,
    ) -> Optional[int]:
        created_at = datetime.utcnow().isoformat()
        group1_json = json.dumps(group1_samples or [], ensure_ascii=False)
        group2_json = json.dumps(group2_samples or [], ensure_ascii=False)
        qc_json = json.dumps(qc_report or {}, ensure_ascii=False)
        summary_json = json.dumps(summary or {}, ensure_ascii=False)

        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO de_analyses (
                    created_at, file_path, method, group1_json, group2_json,
                    qc_json, summary_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    created_at,
                    file_path,
                    method,
                    group1_json,
                    group2_json,
                    qc_json,
                    summary_json,
                ),
            )
            return cursor.lastrowid
