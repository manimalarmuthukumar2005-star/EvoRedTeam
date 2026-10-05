import sqlite3
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from ..config import DATA_DIR

logger = logging.getLogger(__name__)

DB_PATH = DATA_DIR / "evoredteam.db"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """)

        # 2. password_reset_tokens table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
        );
        """)

        # 3. experiments table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiments (
            experiment_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT,
            base_prompt TEXT,
            category TEXT,
            target_models TEXT,
            status TEXT NOT NULL,
            peak_risk_score REAL DEFAULT 0.0,
            total_prompts_tested INTEGER DEFAULT 0,
            generation_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
        );
        """)

        # Ensure system default user exists for background / system operations
        cursor.execute("""
        INSERT OR IGNORE INTO users (user_id, email, password_hash, created_at)
        VALUES ('usr_system', 'system@evoredteam.lab', 'system_internal_placeholder_hash', '2026-01-01T00:00:00')
        """)
        
        conn.commit()
    logger.info("SQLite database initialized at %s", DB_PATH)

# Initialize on import
init_db()

class UserDB:
    @staticmethod
    def create_user(user_id: str, email: str, password_hash: str) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO users (user_id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, email.lower().strip(), password_hash, now)
            )
            conn.commit()
        return {"user_id": user_id, "email": email.lower().strip(), "created_at": now}

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    @staticmethod
    def get_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    @staticmethod
    def update_password(user_id: str, password_hash: str) -> bool:
        with get_connection() as conn:
            cursor = conn.execute(
                "UPDATE users SET password_hash = ? WHERE user_id = ?",
                (password_hash, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0

class PasswordResetDB:
    @staticmethod
    def create_token(token_hash: str, user_id: str, expires_at: str):
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, used) VALUES (?, ?, ?, 0)",
                (token_hash, user_id, expires_at)
            )
            conn.commit()

    @staticmethod
    def get_token(token_hash: str) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM password_reset_tokens WHERE token_hash = ?",
                (token_hash,)
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    @staticmethod
    def mark_used(token_hash: str):
        with get_connection() as conn:
            conn.execute(
                "UPDATE password_reset_tokens SET used = 1 WHERE token_hash = ?",
                (token_hash,)
            )
            conn.commit()

    @staticmethod
    def invalidate_user_tokens(user_id: str):
        with get_connection() as conn:
            conn.execute(
                "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?",
                (user_id,)
            )
            conn.commit()

class ExperimentDB:
    @staticmethod
    def create_or_update_experiment(
        experiment_id: str,
        user_id: str,
        title: Optional[str] = None,
        base_prompt: Optional[str] = None,
        category: Optional[str] = None,
        target_models: Optional[List[str]] = None,
        status: str = "queued",
        peak_risk_score: float = 0.0,
        total_prompts_tested: int = 0,
        generation_count: int = 0
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        models_str = json.dumps(target_models or [])
        
        with get_connection() as conn:
            cursor = conn.execute("SELECT * FROM experiments WHERE experiment_id = ?", (experiment_id,))
            existing = cursor.fetchone()
            
            if existing:
                conn.execute("""
                UPDATE experiments SET
                    title = COALESCE(?, title),
                    base_prompt = COALESCE(?, base_prompt),
                    category = COALESCE(?, category),
                    target_models = COALESCE(?, target_models),
                    status = COALESCE(?, status),
                    peak_risk_score = COALESCE(?, peak_risk_score),
                    total_prompts_tested = COALESCE(?, total_prompts_tested),
                    generation_count = COALESCE(?, generation_count),
                    updated_at = ?
                WHERE experiment_id = ?
                """, (title, base_prompt, category, models_str, status, peak_risk_score, total_prompts_tested, generation_count, now, experiment_id))
            else:
                conn.execute("""
                INSERT INTO experiments (
                    experiment_id, user_id, title, base_prompt, category,
                    target_models, status, peak_risk_score, total_prompts_tested,
                    generation_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    experiment_id, user_id, title, base_prompt, category,
                    models_str, status, peak_risk_score, total_prompts_tested,
                    generation_count, now, now
                ))
            conn.commit()

        return ExperimentDB.get_experiment(experiment_id)

    @staticmethod
    def get_experiment(experiment_id: str) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.execute("SELECT * FROM experiments WHERE experiment_id = ?", (experiment_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                try:
                    d["target_models"] = json.loads(d["target_models"])
                except Exception:
                    d["target_models"] = []
                # Fallback title if None
                if not d.get("title") and d.get("base_prompt"):
                    bp = d["base_prompt"].strip()
                    d["display_title"] = bp[:60] + ("..." if len(bp) > 60 else "")
                else:
                    d["display_title"] = d.get("title") or experiment_id
                return d
        return None

    @staticmethod
    def list_user_experiments(
        user_id: str,
        status: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM experiments WHERE user_id = ?"
        params: List[Any] = [user_id]

        if status and status != "all":
            query += " AND status = ?"
            params.append(status)

        if category and category != "all":
            query += " AND category = ?"
            params.append(category)

        if search and search.strip():
            search_pattern = f"%{search.strip().lower()}%"
            query += " AND (LOWER(title) LIKE ? OR LOWER(base_prompt) LIKE ? OR LOWER(experiment_id) LIKE ?)"
            params.extend([search_pattern, search_pattern, search_pattern])

        if from_date:
            query += " AND created_at >= ?"
            params.append(from_date)

        if to_date:
            query += " AND created_at <= ?"
            params.append(to_date)

        query += " ORDER BY created_at DESC"

        with get_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                try:
                    d["target_models"] = json.loads(d["target_models"])
                except Exception:
                    d["target_models"] = []
                if not d.get("title") and d.get("base_prompt"):
                    bp = d["base_prompt"].strip()
                    d["display_title"] = bp[:60] + ("..." if len(bp) > 60 else "")
                else:
                    d["display_title"] = d.get("title") or d["experiment_id"]
                results.append(d)
            return results

    @staticmethod
    def rename_experiment(experiment_id: str, user_id: str, title: Optional[str]) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            cursor = conn.execute(
                "UPDATE experiments SET title = ?, updated_at = ? WHERE experiment_id = ? AND user_id = ?",
                (title.strip() if title else None, now, experiment_id, user_id)
            )
            conn.commit()
            if cursor.rowcount == 0:
                return None
        return ExperimentDB.get_experiment(experiment_id)

    @staticmethod
    def delete_experiment(experiment_id: str, user_id: str) -> bool:
        with get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM experiments WHERE experiment_id = ? AND user_id = ?",
                (experiment_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0
