from fastapi import WebSocket
from typing import Dict, List, Tuple
import json


class WebSocketManager:
    def __init__(self):
        # Maps session_id -> list of (websocket, username) tuples
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, username: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append((websocket, username))
        print(f"[WS] User '{username}' connected to session {session_id}. Total users: {len(self.active_connections[session_id])}")

        # Broadcast updated user list (with error handling)
        try:
            await self.broadcast_user_list(session_id)
        except Exception as e:
            print(f"[WS] Error broadcasting user list on connect: {e}")

    async def disconnect_async(self, websocket: WebSocket, session_id: str):
        """Async version of disconnect that broadcasts user list"""
        if session_id in self.active_connections:
            # Find the username before removing
            username = next((user for ws, user in self.active_connections[session_id] if ws == websocket), "Unknown")

            self.active_connections[session_id] = [
                (ws, user) for ws, user in self.active_connections[session_id]
                if ws != websocket
            ]

            print(f"[WS] User '{username}' disconnected from session {session_id}. Remaining users: {len(self.active_connections[session_id])}")

            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
            else:
                # Broadcast updated user list if there are still connections
                try:
                    await self.broadcast_user_list(session_id)
                except Exception as e:
                    print(f"[WS] Error broadcasting user list on disconnect: {e}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        """Sync version for compatibility"""
        if session_id in self.active_connections:
            self.active_connections[session_id] = [
                (ws, user) for ws, user in self.active_connections[session_id]
                if ws != websocket
            ]
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    def get_active_users(self, session_id: str) -> List[str]:
        """Get list of unique active usernames for a session"""
        if session_id not in self.active_connections:
            return []
        usernames = [user for _, user in self.active_connections[session_id]]
        # Return unique usernames
        return list(dict.fromkeys(usernames))

    async def broadcast_user_list(self, session_id: str):
        """Broadcast the current list of active users to all connections"""
        users = self.get_active_users(session_id)
        await self.broadcast(session_id, {
            "event": "user_list",
            "data": {"users": users}
        })

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            connections = self.active_connections[session_id].copy()
            print(f"[WS] Broadcasting {message.get('event')} to {len(connections)} connection(s) in session {session_id}")
            for connection, username in connections:
                try:
                    await connection.send_json(message)
                    print(f"[WS] Sent {message.get('event')} to user: {username}")
                except Exception as e:
                    print(f"[WS] Error sending to {username}: {e}")
                    self.disconnect(connection, session_id)
