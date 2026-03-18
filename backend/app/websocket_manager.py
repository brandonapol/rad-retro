from fastapi import WebSocket
from typing import Dict, List, Tuple
import json


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, username: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append((websocket, username))

        try:
            await self.broadcast_user_list(session_id)
        except Exception:
            pass

    async def disconnect_async(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id] = [
                (ws, user) for ws, user in self.active_connections[session_id]
                if ws != websocket
            ]

            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
            else:
                try:
                    await self.broadcast_user_list(session_id)
                except Exception:
                    pass

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id] = [
                (ws, user) for ws, user in self.active_connections[session_id]
                if ws != websocket
            ]
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    def get_active_users(self, session_id: str) -> List[str]:
        if session_id not in self.active_connections:
            return []
        usernames = [user for _, user in self.active_connections[session_id]]
        return list(dict.fromkeys(usernames))

    async def broadcast_user_list(self, session_id: str):
        users = self.get_active_users(session_id)
        await self.broadcast(session_id, {
            "event": "user_list",
            "data": {"users": users}
        })

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            connections = self.active_connections[session_id].copy()
            for connection, username in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(connection, session_id)
