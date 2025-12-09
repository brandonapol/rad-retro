import pytest
import os
import tempfile
from pathlib import Path
from httpx import AsyncClient, ASGITransport

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.database import init_db, create_session, create_card


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


@pytest.fixture
async def client(test_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_session(client):
    response = await client.post("/api/session/create")
    assert response.status_code == 200

    data = response.json()
    assert "session_id" in data
    assert len(data["session_id"]) == 8


@pytest.mark.asyncio
async def test_get_session_data(client):
    session_id = "test123"
    await create_session(session_id)
    await create_card(session_id, "well", "Great work", "Alice")

    response = await client.get(f"/api/session/{session_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["session"]["session_id"] == session_id
    assert len(data["cards"]) == 1
    assert data["cards"][0]["content"] == "Great work"


@pytest.mark.asyncio
async def test_get_nonexistent_session(client):
    response = await client.get("/api/session/nonexistent")
    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


@pytest.mark.asyncio
async def test_add_card(client):
    session_id = "test123"
    await create_session(session_id)

    card_data = {
        "category": "well",
        "content": "Sprint went smoothly",
        "author": "Bob"
    }

    response = await client.post(f"/api/session/{session_id}/card", json=card_data)
    assert response.status_code == 200

    data = response.json()
    assert data["category"] == "well"
    assert data["content"] == "Sprint went smoothly"
    assert data["author"] == "Bob"
    assert data["session_id"] == session_id
    assert "id" in data


@pytest.mark.asyncio
async def test_add_card_to_nonexistent_session(client):
    card_data = {
        "category": "well",
        "content": "Test",
        "author": "Alice"
    }

    response = await client.post("/api/session/nonexistent/card", json=card_data)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_add_card_invalid_category(client):
    session_id = "test123"
    await create_session(session_id)

    card_data = {
        "category": "invalid",
        "content": "Test",
        "author": "Alice"
    }

    response = await client.post(f"/api/session/{session_id}/card", json=card_data)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_add_card_missing_fields(client):
    session_id = "test123"
    await create_session(session_id)

    card_data = {
        "category": "well"
    }

    response = await client.post(f"/api/session/{session_id}/card", json=card_data)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_add_actionable_card(client):
    session_id = "test123"
    await create_session(session_id)

    card_data = {
        "category": "actionables",
        "content": "Fix authentication bug",
        "author": "Charlie"
    }

    response = await client.post(f"/api/session/{session_id}/card", json=card_data)
    assert response.status_code == 200

    data = response.json()
    assert data["category"] == "actionables"
    assert data["completed"] == False


@pytest.mark.asyncio
async def test_update_card_content(client):
    session_id = "test123"
    await create_session(session_id)
    card = await create_card(session_id, "well", "Original", "Alice")
    card_id = card["id"]

    update_data = {"content": "Updated content"}

    response = await client.patch(f"/api/card/{card_id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["content"] == "Updated content"
    assert data["author"] == "Alice"


@pytest.mark.asyncio
async def test_toggle_actionable_completion(client):
    session_id = "test123"
    await create_session(session_id)
    card = await create_card(session_id, "actionables", "Task", "Alice")
    card_id = card["id"]

    update_data = {"completed": True}

    response = await client.patch(f"/api/card/{card_id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["completed"] == True

    update_data = {"completed": False}
    response = await client.patch(f"/api/card/{card_id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["completed"] == False


@pytest.mark.asyncio
async def test_update_nonexistent_card(client):
    update_data = {"content": "Test"}

    response = await client.patch("/api/card/9999", json=update_data)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_card_no_data(client):
    session_id = "test123"
    await create_session(session_id)
    card = await create_card(session_id, "well", "Test", "Alice")
    card_id = card["id"]

    response = await client.patch(f"/api/card/{card_id}", json={})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_card(client):
    session_id = "test123"
    await create_session(session_id)
    card = await create_card(session_id, "well", "Delete me", "Alice")
    card_id = card["id"]

    response = await client.delete(f"/api/card/{card_id}")
    assert response.status_code == 200
    assert response.json()["success"] == True

    get_response = await client.get(f"/api/session/{session_id}")
    data = get_response.json()
    assert len(data["cards"]) == 0


@pytest.mark.asyncio
async def test_delete_nonexistent_card(client):
    response = await client.delete("/api/card/9999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_session_with_multiple_cards(client):
    session_id = "test123"
    await create_session(session_id)

    await create_card(session_id, "well", "Good communication", "Alice")
    await create_card(session_id, "badly", "Too many bugs", "Bob")
    await create_card(session_id, "continue", "Daily standups", "Charlie")
    await create_card(session_id, "kudos", "Great teamwork!", "Dave")
    await create_card(session_id, "actionables", "Fix CI pipeline", "Eve")

    response = await client.get(f"/api/session/{session_id}")
    assert response.status_code == 200

    data = response.json()
    assert len(data["cards"]) == 5

    categories = [card["category"] for card in data["cards"]]
    assert "well" in categories
    assert "badly" in categories
    assert "continue" in categories
    assert "kudos" in categories
    assert "actionables" in categories


@pytest.mark.asyncio
async def test_card_ordering(client):
    session_id = "test123"
    await create_session(session_id)

    card1 = await create_card(session_id, "well", "First", "Alice")
    card2 = await create_card(session_id, "well", "Second", "Bob")
    card3 = await create_card(session_id, "well", "Third", "Charlie")

    response = await client.get(f"/api/session/{session_id}")
    data = response.json()

    assert data["cards"][0]["id"] == card1["id"]
    assert data["cards"][1]["id"] == card2["id"]
    assert data["cards"][2]["id"] == card3["id"]
