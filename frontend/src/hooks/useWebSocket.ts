import { useEffect, useRef, useCallback } from "react";
import type { WebSocketMessage } from "../types/index.js";

// Use environment variable or construct from current location (works in Docker and dev)
const WS_BASE = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : "ws://localhost:8000");

export function useWebSocket(
  sessionId: string,
  username: string,
  onMessage: (message: WebSocketMessage) => void
) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number>();
  const onMessageRef = useRef(onMessage);

  console.log("[FRONTEND WS HOOK] Called with:", { sessionId, username, onMessageType: typeof onMessage });

  // Keep the ref updated with the latest onMessage callback
  useEffect(() => {
    console.log("[FRONTEND WS HOOK] onMessage ref updated");
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    console.log("[FRONTEND WS] connect() called with username:", username, "type:", typeof username);
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log("[FRONTEND WS] Already connected, skipping");
      return;
    }

    const wsUrl = `${WS_BASE}/ws/${sessionId}?username=${encodeURIComponent(username)}`;
    console.log("[FRONTEND WS] Connecting to:", wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("[FRONTEND WS] Connected successfully");
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log("[FRONTEND WS] Raw message received:", event.data);
      onMessageRef.current(message);
    };

    ws.current.onerror = (error) => {
      console.error("[FRONTEND WS] Error:", error);
    };

    ws.current.onclose = (event) => {
      console.log("[FRONTEND WS] Closed, will reconnect in 3s. Code:", event.code, "Reason:", event.reason);
      reconnectTimeout.current = window.setTimeout(() => {
        console.log("[FRONTEND WS] Attempting reconnect...");
        connect();
      }, 3000);
    };
  }, [sessionId, username]);

  useEffect(() => {
    console.log("[FRONTEND WS HOOK] useEffect triggered, calling connect()");
    connect();

    return () => {
      console.log("[FRONTEND WS HOOK] Cleanup - closing connection");
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);
}
