from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from uuid import uuid4

from app.core.settings import FULI_FEATURES_FILE, FULI_METADATA_FILE, PREFERENCE_DB_FILE


@dataclass
class PreferenceProfile:
    liked_ids: list[str]
    disliked_ids: list[str]
    locked_candidate_ids: list[str]


@dataclass
class PreferenceProfileItem:
    id: str
    title: str
    image_url: str
    source_url: str
    liked_count: int
    disliked_count: int
    net_score: int
    locked: bool


@dataclass
class PreferenceEventRecord:
    event_id: str
    session_id: str
    client_id: str
    candidate_id: str
    feedback_type: str
    created_at: str


def init_preference_db() -> None:
    PREFERENCE_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS preference_sessions (
                session_id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                reference_image_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS preference_events (
                event_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                candidate_id TEXT NOT NULL,
                feedback_type TEXT NOT NULL CHECK(feedback_type IN ('liked', 'disliked')),
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_preference_events_client ON preference_events(client_id, created_at)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_preference_events_session ON preference_events(session_id, created_at)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS preference_anchor_locks (
                client_id TEXT NOT NULL,
                candidate_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (client_id, candidate_id)
            )
            """
        )


def create_session(client_id: str, reference_image_name: str) -> str:
    session_id = f"sess_{uuid4().hex[:16]}"
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO preference_sessions (session_id, client_id, reference_image_name, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, client_id, reference_image_name, _now_iso()),
        )
    return session_id


def record_feedback(session_id: str, client_id: str, liked_ids: list[str], disliked_ids: list[str]) -> None:
    rows = [
        (f"evt_{uuid4().hex[:20]}", session_id, client_id, candidate_id, "liked", _now_iso())
        for candidate_id in liked_ids
    ] + [
        (f"evt_{uuid4().hex[:20]}", session_id, client_id, candidate_id, "disliked", _now_iso())
        for candidate_id in disliked_ids
    ]
    if not rows:
        return

    with _connect() as conn:
        conn.executemany(
            """
            INSERT INTO preference_events (event_id, session_id, client_id, candidate_id, feedback_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )


def resolve_client_id(client_id: str | None, session_id: str | None = None) -> str | None:
    if client_id:
        return client_id
    if not session_id:
        return None
    with _connect() as conn:
        row = conn.execute(
            "SELECT client_id FROM preference_sessions WHERE session_id = ? LIMIT 1",
            (session_id,),
        ).fetchone()
    return str(row[0]) if row else None


def load_preference_profile(client_id: str | None, session_id: str | None = None) -> PreferenceProfile:
    resolved_client_id = resolve_client_id(client_id, session_id)
    if not resolved_client_id:
        return PreferenceProfile(liked_ids=[], disliked_ids=[], locked_candidate_ids=[])

    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT candidate_id, feedback_type, COUNT(*) AS total
            FROM preference_events
            WHERE client_id = ?
            GROUP BY candidate_id, feedback_type
            ORDER BY total DESC, candidate_id ASC
            """,
            (resolved_client_id,),
        ).fetchall()

    liked_scores: dict[str, int] = {}
    disliked_scores: dict[str, int] = {}
    for candidate_id, feedback_type, total in rows:
        if feedback_type == "liked":
            liked_scores[str(candidate_id)] = int(total)
        else:
            disliked_scores[str(candidate_id)] = int(total)

    liked_ids = [
        candidate_id
        for candidate_id, score in sorted(liked_scores.items(), key=lambda item: (-item[1], item[0]))
        if score > disliked_scores.get(candidate_id, 0)
    ]
    disliked_ids = [
        candidate_id
        for candidate_id, score in sorted(disliked_scores.items(), key=lambda item: (-item[1], item[0]))
        if score >= liked_scores.get(candidate_id, 0)
    ]
    return PreferenceProfile(
        liked_ids=liked_ids[:20],
        disliked_ids=disliked_ids[:20],
        locked_candidate_ids=load_locked_candidate_ids(resolved_client_id),
    )


def load_preference_profile_items(client_id: str | None, session_id: str | None = None) -> tuple[str | None, list[PreferenceProfileItem]]:
    resolved_client_id = resolve_client_id(client_id, session_id)
    if not resolved_client_id:
        return None, []

    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT
                candidate_id,
                SUM(CASE WHEN feedback_type = 'liked' THEN 1 ELSE 0 END) AS liked_count,
                SUM(CASE WHEN feedback_type = 'disliked' THEN 1 ELSE 0 END) AS disliked_count
            FROM preference_events
            WHERE client_id = ?
            GROUP BY candidate_id
            ORDER BY ABS(
                SUM(CASE WHEN feedback_type = 'liked' THEN 1 ELSE 0 END) -
                SUM(CASE WHEN feedback_type = 'disliked' THEN 1 ELSE 0 END)
            ) DESC, candidate_id ASC
            """,
            (resolved_client_id,),
        ).fetchall()

    metadata_by_id = _load_reference_metadata()
    locked_ids = set(load_locked_candidate_ids(resolved_client_id))
    items: list[PreferenceProfileItem] = []
    for candidate_id, liked_count, disliked_count in rows:
        meta = metadata_by_id.get(str(candidate_id), {})
        items.append(
            PreferenceProfileItem(
                id=str(candidate_id),
                title=str(meta.get("title") or candidate_id),
                image_url=f"/data/fuli_products/images/{meta.get('filename')}" if meta.get("filename") else "",
                source_url=str(meta.get("source_url") or "https://fuli-plus.com/product"),
                liked_count=int(liked_count),
                disliked_count=int(disliked_count),
                net_score=int(liked_count) - int(disliked_count),
                locked=str(candidate_id) in locked_ids,
            )
        )
    return resolved_client_id, items


def clear_preference_profile(client_id: str | None, session_id: str | None = None) -> str | None:
    resolved_client_id = resolve_client_id(client_id, session_id)
    if not resolved_client_id:
        return None

    with _connect() as conn:
        conn.execute("DELETE FROM preference_events WHERE client_id = ?", (resolved_client_id,))
        conn.execute("DELETE FROM preference_anchor_locks WHERE client_id = ?", (resolved_client_id,))
    return resolved_client_id


def undo_latest_feedback(client_id: str | None, session_id: str | None = None) -> PreferenceEventRecord | None:
    resolved_client_id = resolve_client_id(client_id, session_id)
    if not resolved_client_id:
        return None

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT event_id, session_id, client_id, candidate_id, feedback_type, created_at
            FROM preference_events
            WHERE client_id = ?
            ORDER BY created_at DESC, event_id DESC
            LIMIT 1
            """,
            (resolved_client_id,),
        ).fetchone()
        if not row:
            return None
        conn.execute("DELETE FROM preference_events WHERE event_id = ?", (row[0],))

    return PreferenceEventRecord(
        event_id=str(row[0]),
        session_id=str(row[1]),
        client_id=str(row[2]),
        candidate_id=str(row[3]),
        feedback_type=str(row[4]),
        created_at=str(row[5]),
    )


def load_locked_candidate_ids(client_id: str) -> list[str]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT candidate_id
            FROM preference_anchor_locks
            WHERE client_id = ?
            ORDER BY created_at DESC, candidate_id ASC
            """,
            (client_id,),
        ).fetchall()
    return [str(row[0]) for row in rows]


def set_anchor_lock(client_id: str | None, candidate_id: str, session_id: str | None = None) -> str | None:
    resolved_client_id = resolve_client_id(client_id, session_id)
    if not resolved_client_id:
        return None
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO preference_anchor_locks (client_id, candidate_id, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(client_id, candidate_id) DO NOTHING
            """,
            (resolved_client_id, candidate_id, _now_iso()),
        )
    return resolved_client_id


def remove_anchor_lock(client_id: str | None, candidate_id: str, session_id: str | None = None) -> str | None:
    resolved_client_id = resolve_client_id(client_id, session_id)
    if not resolved_client_id:
        return None
    with _connect() as conn:
        conn.execute(
            "DELETE FROM preference_anchor_locks WHERE client_id = ? AND candidate_id = ?",
            (resolved_client_id, candidate_id),
        )
    return resolved_client_id


@contextmanager
def _connect():
    conn = sqlite3.connect(PREFERENCE_DB_FILE)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_reference_metadata() -> dict[str, dict]:
    source_file = FULI_FEATURES_FILE if FULI_FEATURES_FILE.exists() else FULI_METADATA_FILE
    if not source_file.exists():
        return {}
    payload = json.loads(source_file.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return {}
    return {
        str(item.get("id")): item
        for item in payload
        if isinstance(item, dict) and item.get("id")
    }
