from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio
import secrets
import os
from pathlib import Path
from typing import Dict

SESSION_RETENTION_HOURS = int(os.getenv("SESSION_RETENTION_HOURS", "336"))  # 14 days default
MAX_CARDS_PER_SESSION = int(os.getenv("MAX_CARDS_PER_SESSION", "200"))

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


async def _cleanup_loop():
    while True:
        await asyncio.sleep(3600)
        await cleanup_old_sessions(hours=SESSION_RETENTION_HOURS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


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
    for _ in range(5):
        session_id = secrets.token_urlsafe(8)[:8]
        try:
            await create_session(session_id)
            return CreateSessionResponse(session_id=session_id)
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Failed to generate unique session ID")


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
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    existing_cards = await get_cards(session_id)
    if len(existing_cards) >= MAX_CARDS_PER_SESSION:
        raise HTTPException(
            status_code=400,
            detail=f"Session has reached the maximum of {MAX_CARDS_PER_SESSION} cards"
        )

    card = await create_card(
        session_id=session_id,
        category=card_data.category,
        content=card_data.content,
        author=card_data.author
    )

    card_obj = Card(**card)
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
async def remove_card(card_id: int, author: str = Query(...)):
    from .database import get_db

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT session_id, author FROM cards WHERE id = ?",
            (card_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Card not found")
        session_id = row["session_id"]
        if row["author"] != author:
            raise HTTPException(status_code=403, detail="You can only delete your own cards")
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


# Serve static files (frontend) if they exist
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    # Mount static files for assets
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    # Mount static files for fonts
    fonts_dir = static_dir / "fonts"
    if fonts_dir.exists():
        app.mount("/fonts", StaticFiles(directory=fonts_dir), name="fonts")

    # Catch-all route for SPA - must be last
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve index.html for all non-API routes
        if not full_path.startswith("api/") and not full_path.startswith("ws/"):
            index_file = static_dir / "index.html"
            if index_file.exists():
                return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not found")
