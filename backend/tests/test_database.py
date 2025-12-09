import pytest
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import (
    init_db,
    create_session,
    get_session,
    create_card,
    get_cards,
    update_card,
    toggle_actionable,
    delete_card,
    cleanup_old_sessions,
    get_db,
)


@pytest.fixture
async def test_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    original_path = os.environ.get("DATABASE_PATH")
    os.environ["DATABASE_PATH"] = path

    from app import database
    database.DATABASE_PATH = path

    await init_db()

    yield path

    try:
        os.unlink(path)
    except FileNotFoundError:
        pass

    if original_path:
        os.environ["DATABASE_PATH"] = original_path
        database.DATABASE_PATH = original_path


@pytest.mark.asyncio
async def test_init_db(test_db):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        tables = await cursor.fetchall()
        table_names = [row[0] for row in tables]

        assert "sessions" in table_names
        assert "cards" in table_names
        assert "actionables" in table_names
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_create_and_get_session(test_db):
    session_id = "test123"
    session = await create_session(session_id)

    assert session["session_id"] == session_id
    assert "created_at" in session

    retrieved = await get_session(session_id)
    assert retrieved is not None
    assert retrieved["session_id"] == session_id


@pytest.mark.asyncio
async def test_get_nonexistent_session(test_db):
    session = await get_session("nonexistent")
    assert session is None


@pytest.mark.asyncio
async def test_create_card(test_db):
    session_id = "test123"
    await create_session(session_id)

    card = await create_card(
        session_id=session_id,
        category="well",
        content="Great sprint!",
        author="Alice"
    )

    assert card["id"] is not None
    assert card["session_id"] == session_id
    assert card["category"] == "well"
    assert card["content"] == "Great sprint!"
    assert card["author"] == "Alice"
    assert card["completed"] is None


@pytest.mark.asyncio
async def test_create_actionable_card(test_db):
    session_id = "test123"
    await create_session(session_id)

    card = await create_card(
        session_id=session_id,
        category="actionables",
        content="Fix the bug",
        author="Bob"
    )

    assert card["category"] == "actionables"
    assert card["completed"] == 0


@pytest.mark.asyncio
async def test_get_cards(test_db):
    session_id = "test123"
    await create_session(session_id)

    await create_card(session_id, "well", "Content 1", "Alice")
    await create_card(session_id, "badly", "Content 2", "Bob")
    await create_card(session_id, "actionables", "Content 3", "Charlie")

    cards = await get_cards(session_id)

    assert len(cards) == 3
    assert cards[0]["category"] == "well"
    assert cards[1]["category"] == "badly"
    assert cards[2]["category"] == "actionables"


@pytest.mark.asyncio
async def test_get_cards_empty_session(test_db):
    session_id = "test123"
    await create_session(session_id)

    cards = await get_cards(session_id)
    assert len(cards) == 0


@pytest.mark.asyncio
async def test_update_card(test_db):
    session_id = "test123"
    await create_session(session_id)

    card = await create_card(session_id, "well", "Original", "Alice")
    card_id = card["id"]

    updated = await update_card(card_id, content="Updated content")

    assert updated is not None
    assert updated["content"] == "Updated content"
    assert updated["author"] == "Alice"


@pytest.mark.asyncio
async def test_update_nonexistent_card(test_db):
    updated = await update_card(9999, content="Should not exist")
    assert updated is None


@pytest.mark.asyncio
async def test_toggle_actionable(test_db):
    session_id = "test123"
    await create_session(session_id)

    card = await create_card(session_id, "actionables", "Task", "Alice")
    card_id = card["id"]

    assert card["completed"] == 0

    toggled = await toggle_actionable(card_id, True)
    assert toggled["completed"] == 1

    toggled_again = await toggle_actionable(card_id, False)
    assert toggled_again["completed"] == 0


@pytest.mark.asyncio
async def test_toggle_nonexistent_actionable(test_db):
    result = await toggle_actionable(9999, True)
    assert result is None


@pytest.mark.asyncio
async def test_delete_card(test_db):
    session_id = "test123"
    await create_session(session_id)

    card = await create_card(session_id, "well", "Delete me", "Alice")
    card_id = card["id"]

    success = await delete_card(card_id)
    assert success is True

    cards = await get_cards(session_id)
    assert len(cards) == 0


@pytest.mark.asyncio
async def test_delete_nonexistent_card(test_db):
    success = await delete_card(9999)
    assert success is False


@pytest.mark.asyncio
async def test_delete_card_cascades_actionable(test_db):
    session_id = "test123"
    await create_session(session_id)

    card = await create_card(session_id, "actionables", "Task", "Alice")
    card_id = card["id"]

    await delete_card(card_id)

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM actionables WHERE card_id = ?",
            (card_id,)
        )
        row = await cursor.fetchone()
        assert row is None
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_cleanup_old_sessions(test_db):
    old_session = "old123"
    new_session = "new123"

    db = await get_db()
    try:
        old_time = datetime.now() - timedelta(hours=25)
        await db.execute(
            "INSERT INTO sessions (session_id, created_at) VALUES (?, ?)",
            (old_session, old_time)
        )
        await db.commit()
    finally:
        await db.close()

    await create_session(new_session)

    deleted_count = await cleanup_old_sessions(hours=24)
    assert deleted_count == 1

    old_exists = await get_session(old_session)
    new_exists = await get_session(new_session)

    assert old_exists is None
    assert new_exists is not None


@pytest.mark.asyncio
async def test_foreign_key_cascade_on_session_delete(test_db):
    session_id = "test123"
    await create_session(session_id)

    card = await create_card(session_id, "well", "Test", "Alice")
    card_id = card["id"]

    db = await get_db()
    try:
        await db.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        await db.commit()

        cursor = await db.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
        row = await cursor.fetchone()
        assert row is None
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_category_constraint(test_db):
    session_id = "test123"
    await create_session(session_id)

    db = await get_db()
    try:
        with pytest.raises(Exception):
            await db.execute(
                "INSERT INTO cards (session_id, category, content, author) VALUES (?, ?, ?, ?)",
                (session_id, "invalid_category", "Test", "Alice")
            )
            await db.commit()
    finally:
        await db.close()
