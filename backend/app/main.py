from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import secrets
from typing import Dict

from .database import (
    init_db,
    create_session,
    get_session,
    get_all_sessions,
    update_session_name,
    update_session_activity,
    create_card,
    get_cards,
    update_card,
    toggle_actionable,
    delete_card,
    delete_all_cards,
    cleanup_old_sessions,
)
from .models import (
    CreateCardRequest,
    UpdateCardRequest,
    SessionResponse,
    CreateSessionResponse,
    Card,
    Session,
)
from .websocket_manager import WebSocketManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)
ws_manager = WebSocketManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/session/create", response_model=CreateSessionResponse)
async def create_new_session():
    session_id = secrets.token_urlsafe(6)[:8]
    await create_session(session_id)
    return CreateSessionResponse(session_id=session_id)


@app.get("/api/sessions")
async def list_sessions():
    sessions = await get_all_sessions()
    return {"sessions": sessions}


@app.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session_data(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cards = await get_cards(session_id)
    await update_session_activity(session_id)
    return SessionResponse(
        session=Session(**session),
        cards=[Card(**card) for card in cards]
    )


@app.patch("/api/session/{session_id}")
async def update_session(session_id: str, data: dict):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if "name" in data:
        updated_session = await update_session_name(session_id, data["name"])
        return updated_session

    raise HTTPException(status_code=400, detail="No valid update data provided")


@app.post("/api/session/{session_id}/card", response_model=Card)
async def add_card(session_id: str, card_data: CreateCardRequest):
    print(f"[API] Adding card: session={session_id}, author={card_data.author}, category={card_data.category}")
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    card = await create_card(
        session_id=session_id,
        category=card_data.category,
        content=card_data.content,
        author=card_data.author
    )

    card_obj = Card(**card)
    print(f"[API] Card created with ID: {card_obj.id}, broadcasting to session {session_id}")
    await ws_manager.broadcast(
        session_id,
        {"event": "card_added", "data": card_obj.model_dump(mode="json")}
    )

    return card_obj


@app.patch("/api/card/{card_id}", response_model=Card)
async def modify_card(card_id: int, update_data: UpdateCardRequest):
    if update_data.completed is not None:
        card = await toggle_actionable(card_id, update_data.completed)
    elif update_data.content is not None:
        card = await update_card(card_id, update_data.content)
    else:
        raise HTTPException(status_code=400, detail="No update data provided")

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    card_obj = Card(**card)
    await ws_manager.broadcast(
        card_obj.session_id,
        {"event": "card_updated", "data": card_obj.model_dump(mode="json")}
    )

    return card_obj


@app.delete("/api/card/{card_id}")
async def remove_card(card_id: int):
    from .database import get_db

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT session_id FROM cards WHERE id = ?",
            (card_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Card not found")
        session_id = row["session_id"]
    finally:
        await db.close()

    success = await delete_card(card_id)
    if not success:
        raise HTTPException(status_code=404, detail="Card not found")

    await ws_manager.broadcast(
        session_id,
        {"event": "card_deleted", "data": {"id": card_id}}
    )

    return {"success": True}


@app.delete("/api/session/{session_id}/cards")
async def clear_board(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    success = await delete_all_cards(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear board")

    await ws_manager.broadcast(
        session_id,
        {"event": "board_cleared", "data": {}}
    )

    return {"success": True}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, username: str = "Anonymous"):
    await ws_manager.connect(websocket, session_id, username)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect_async(websocket, session_id)
