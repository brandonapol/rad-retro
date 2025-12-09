import aiosqlite
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

DATABASE_PATH = os.getenv("DATABASE_PATH", "/tmp/retro.db")
SCHEMA_PATH = Path(__file__).parent.parent / "schema.sql"


async def get_db():
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    await db.execute("PRAGMA journal_mode = WAL")
    return db


async def init_db():
    db = await get_db()
    try:
        with open(SCHEMA_PATH, "r") as f:
            schema = f.read()
        await db.executescript(schema)
        await db.commit()
    finally:
        await db.close()


async def create_session(session_id: str) -> Dict[str, Any]:
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO sessions (session_id) VALUES (?)",
            (session_id,)
        )
        await db.commit()
        cursor = await db.execute(
            "SELECT * FROM sessions WHERE session_id = ?",
            (session_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else {}
    finally:
        await db.close()


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM sessions WHERE session_id = ?",
            (session_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def create_card(
    session_id: str,
    category: str,
    content: str,
    author: str
) -> Dict[str, Any]:
    db = await get_db()
    try:
        cursor = await db.execute(
            """
            INSERT INTO cards (session_id, category, content, author)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, category, content, author)
        )
        await db.commit()
        card_id = cursor.lastrowid

        if category == "actionables":
            await db.execute(
                "INSERT INTO actionables (card_id) VALUES (?)",
                (card_id,)
            )
            await db.commit()

        cursor = await db.execute(
            """
            SELECT c.*, a.completed
            FROM cards c
            LEFT JOIN actionables a ON c.id = a.card_id
            WHERE c.id = ?
            """,
            (card_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else {}
    finally:
        await db.close()


async def get_cards(session_id: str) -> List[Dict[str, Any]]:
    db = await get_db()
    try:
        cursor = await db.execute(
            """
            SELECT c.*, a.completed
            FROM cards c
            LEFT JOIN actionables a ON c.id = a.card_id
            WHERE c.session_id = ?
            ORDER BY c.created_at ASC
            """,
            (session_id,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def update_card(card_id: int, content: Optional[str] = None) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        if content is not None:
            await db.execute(
                "UPDATE cards SET content = ? WHERE id = ?",
                (content, card_id)
            )
            await db.commit()

        cursor = await db.execute(
            """
            SELECT c.*, a.completed
            FROM cards c
            LEFT JOIN actionables a ON c.id = a.card_id
            WHERE c.id = ?
            """,
            (card_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def toggle_actionable(card_id: int, completed: bool) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE actionables SET completed = ? WHERE card_id = ?",
            (completed, card_id)
        )
        await db.commit()

        cursor = await db.execute(
            """
            SELECT c.*, a.completed
            FROM cards c
            LEFT JOIN actionables a ON c.id = a.card_id
            WHERE c.id = ?
            """,
            (card_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def delete_card(card_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM cards WHERE id = ?",
            (card_id,)
        )
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def delete_all_cards(session_id: str) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM cards WHERE session_id = ?",
            (session_id,)
        )
        await db.commit()
        return cursor.rowcount >= 0
    finally:
        await db.close()


async def get_all_sessions() -> List[Dict[str, Any]]:
    db = await get_db()
    try:
        cursor = await db.execute(
            """
            SELECT s.*, COUNT(c.id) as card_count
            FROM sessions s
            LEFT JOIN cards c ON s.session_id = c.session_id
            GROUP BY s.session_id
            ORDER BY s.last_activity DESC
            LIMIT 50
            """
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def update_session_name(session_id: str, name: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE sessions SET name = ?, last_activity = CURRENT_TIMESTAMP WHERE session_id = ?",
            (name, session_id)
        )
        await db.commit()

        cursor = await db.execute(
            "SELECT * FROM sessions WHERE session_id = ?",
            (session_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_session_activity(session_id: str) -> bool:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?",
            (session_id,)
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def cleanup_old_sessions(hours: int = 24) -> int:
    cutoff_time = datetime.now() - timedelta(hours=hours)
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM sessions WHERE created_at < ?",
            (cutoff_time,)
        )
        await db.commit()
        return cursor.rowcount
    finally:
        await db.close()
