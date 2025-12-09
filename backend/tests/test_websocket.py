import pytest
import os
import tempfile
from pathlib import Path
from httpx import AsyncClient, ASGITransport
import asyncio

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.database import init_db, create_session


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
async def test_websocket_connection(test_db):
    session_id = "test123"
    await create_session(session_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.websocket_connect(f"/ws/{session_id}") as websocket:
            assert websocket is not None


@pytest.mark.asyncio
async def test_websocket_broadcast_on_card_add(test_db):
    session_id = "test123"
    await create_session(session_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.websocket_connect(f"/ws/{session_id}") as websocket:
            card_data = {
                "category": "well",
                "content": "New card",
                "author": "Alice"
            }

            await client.post(f"/api/session/{session_id}/card", json=card_data)

            message = await websocket.receive_json()

            assert message["event"] == "card_added"
            assert message["data"]["content"] == "New card"
            assert message["data"]["author"] == "Alice"


@pytest.mark.asyncio
async def test_websocket_broadcast_on_card_update(test_db):
    session_id = "test123"
    await create_session(session_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        card_response = await client.post(
            f"/api/session/{session_id}/card",
            json={"category": "well", "content": "Original", "author": "Alice"}
        )
        card_id = card_response.json()["id"]

        async with client.websocket_connect(f"/ws/{session_id}") as websocket:
            await client.patch(
                f"/api/card/{card_id}",
                json={"content": "Updated"}
            )

            message = await websocket.receive_json()

            assert message["event"] == "card_updated"
            assert message["data"]["content"] == "Updated"
            assert message["data"]["id"] == card_id


@pytest.mark.asyncio
async def test_websocket_broadcast_on_card_delete(test_db):
    session_id = "test123"
    await create_session(session_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        card_response = await client.post(
            f"/api/session/{session_id}/card",
            json={"category": "well", "content": "Delete me", "author": "Alice"}
        )
        card_id = card_response.json()["id"]

        async with client.websocket_connect(f"/ws/{session_id}") as websocket:
            await client.delete(f"/api/card/{card_id}")

            message = await websocket.receive_json()

            assert message["event"] == "card_deleted"
            assert message["data"]["id"] == card_id


@pytest.mark.asyncio
async def test_websocket_broadcast_actionable_toggle(test_db):
    session_id = "test123"
    await create_session(session_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        card_response = await client.post(
            f"/api/session/{session_id}/card",
            json={"category": "actionables", "content": "Task", "author": "Alice"}
        )
        card_id = card_response.json()["id"]

        async with client.websocket_connect(f"/ws/{session_id}") as websocket:
            await client.patch(
                f"/api/card/{card_id}",
                json={"completed": True}
            )

            message = await websocket.receive_json()

            assert message["event"] == "card_updated"
            assert message["data"]["completed"] == True


@pytest.mark.asyncio
async def test_websocket_multiple_clients(test_db):
    session_id = "test123"
    await create_session(session_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.websocket_connect(f"/ws/{session_id}") as ws1:
            async with client.websocket_connect(f"/ws/{session_id}") as ws2:
                card_data = {
                    "category": "well",
                    "content": "Broadcast test",
                    "author": "Alice"
                }

                await client.post(f"/api/session/{session_id}/card", json=card_data)

                message1 = await ws1.receive_json()
                message2 = await ws2.receive_json()

                assert message1["event"] == "card_added"
                assert message2["event"] == "card_added"
                assert message1["data"]["content"] == "Broadcast test"
                assert message2["data"]["content"] == "Broadcast test"


@pytest.mark.asyncio
async def test_websocket_session_isolation(test_db):
    session_id1 = "test123"
    session_id2 = "test456"
    await create_session(session_id1)
    await create_session(session_id2)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.websocket_connect(f"/ws/{session_id1}") as ws1:
            async with client.websocket_connect(f"/ws/{session_id2}") as ws2:
                card_data = {
                    "category": "well",
                    "content": "Session 1 card",
                    "author": "Alice"
                }

                await client.post(f"/api/session/{session_id1}/card", json=card_data)

                message1 = await ws1.receive_json()
                assert message1["event"] == "card_added"

                with pytest.raises(asyncio.TimeoutError):
                    await asyncio.wait_for(ws2.receive_json(), timeout=0.5)


@pytest.mark.asyncio
async def test_websocket_disconnect_cleanup(test_db):
    from app.main import ws_manager

    session_id = "test123"
    await create_session(session_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.websocket_connect(f"/ws/{session_id}") as websocket:
            assert session_id in ws_manager.active_connections

        await asyncio.sleep(0.1)
        assert session_id not in ws_manager.active_connections
