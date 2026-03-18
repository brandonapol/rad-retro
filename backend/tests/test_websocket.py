import pytest
import os
import tempfile
from pathlib import Path
from starlette.testclient import TestClient
import asyncio

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.database import init_db, create_session


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def test_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    original_path = os.environ.get("DATABASE_PATH")
    os.environ["DATABASE_PATH"] = path

    from app import database
    database.DATABASE_PATH = path

    run(init_db())

    yield path

    try:
        os.unlink(path)
    except FileNotFoundError:
        pass

    if original_path:
        os.environ["DATABASE_PATH"] = original_path
        database.DATABASE_PATH = original_path
    else:
        os.environ.pop("DATABASE_PATH", None)


def test_websocket_connection(test_db):
    run(create_session("test123"))
    with TestClient(app) as client:
        with client.websocket_connect("/ws/test123?username=Alice") as ws:
            assert ws is not None


def test_websocket_broadcast_on_card_add(test_db):
    run(create_session("test123"))
    with TestClient(app) as client:
        with client.websocket_connect("/ws/test123?username=Alice") as ws:
            ws.receive_json()  # user_list on connect

            client.post("/api/session/test123/card", json={
                "category": "well",
                "content": "New card",
                "author": "Alice",
            })

            message = ws.receive_json()
            assert message["event"] == "card_added"
            assert message["data"]["content"] == "New card"
            assert message["data"]["author"] == "Alice"


def test_websocket_broadcast_on_card_update(test_db):
    run(create_session("test123"))
    with TestClient(app) as client:
        card_resp = client.post("/api/session/test123/card", json={
            "category": "well", "content": "Original", "author": "Alice"
        })
        card_id = card_resp.json()["id"]

        with client.websocket_connect("/ws/test123?username=Alice") as ws:
            ws.receive_json()  # user_list

            client.patch(f"/api/card/{card_id}", json={"content": "Updated"})

            message = ws.receive_json()
            assert message["event"] == "card_updated"
            assert message["data"]["content"] == "Updated"
            assert message["data"]["id"] == card_id


def test_websocket_broadcast_on_card_delete(test_db):
    run(create_session("test123"))
    with TestClient(app) as client:
        card_resp = client.post("/api/session/test123/card", json={
            "category": "well", "content": "Delete me", "author": "Alice"
        })
        card_id = card_resp.json()["id"]

        with client.websocket_connect("/ws/test123?username=Alice") as ws:
            ws.receive_json()  # user_list

            client.delete(f"/api/card/{card_id}?author=Alice")

            message = ws.receive_json()
            assert message["event"] == "card_deleted"
            assert message["data"]["id"] == card_id


def test_websocket_broadcast_actionable_toggle(test_db):
    run(create_session("test123"))
    with TestClient(app) as client:
        card_resp = client.post("/api/session/test123/card", json={
            "category": "actionables", "content": "Task", "author": "Alice"
        })
        card_id = card_resp.json()["id"]

        with client.websocket_connect("/ws/test123?username=Alice") as ws:
            ws.receive_json()  # user_list

            client.patch(f"/api/card/{card_id}", json={"completed": True})

            message = ws.receive_json()
            assert message["event"] == "card_updated"
            assert message["data"]["completed"] is True


def test_websocket_multiple_clients(test_db):
    run(create_session("test123"))
    with TestClient(app) as client:
        with client.websocket_connect("/ws/test123?username=Alice") as ws1:
            ws1.receive_json()  # user_list: [Alice]

            with client.websocket_connect("/ws/test123?username=Bob") as ws2:
                ws1.receive_json()  # user_list: [Alice, Bob]
                ws2.receive_json()  # user_list: [Alice, Bob]

                client.post("/api/session/test123/card", json={
                    "category": "well",
                    "content": "Broadcast test",
                    "author": "Alice",
                })

                msg1 = ws1.receive_json()
                msg2 = ws2.receive_json()

                assert msg1["event"] == "card_added"
                assert msg2["event"] == "card_added"
                assert msg1["data"]["content"] == "Broadcast test"
                assert msg2["data"]["content"] == "Broadcast test"


def test_websocket_session_isolation(test_db):
    run(create_session("sess1"))
    run(create_session("sess2"))

    with TestClient(app) as client:
        with client.websocket_connect("/ws/sess1?username=Alice") as ws1:
            ws1.receive_json()  # user_list for sess1

            client.post("/api/session/sess1/card", json={
                "category": "well",
                "content": "Session 1 card",
                "author": "Alice",
            })

            msg = ws1.receive_json()
            assert msg["event"] == "card_added"
            assert msg["data"]["session_id"] == "sess1"

            with client.websocket_connect("/ws/sess2?username=Bob") as ws2:
                ws2.receive_json()  # user_list for sess2

                from app.main import ws_manager
                # sess2 connection should not have received sess1's card
                assert "sess1" in ws_manager.active_connections
                assert "sess2" in ws_manager.active_connections


def test_websocket_disconnect_cleanup(test_db):
    from app.main import ws_manager
    run(create_session("test123"))

    with TestClient(app) as client:
        with client.websocket_connect("/ws/test123?username=Alice") as ws:
            ws.receive_json()  # user_list
            assert "test123" in ws_manager.active_connections

    assert "test123" not in ws_manager.active_connections
