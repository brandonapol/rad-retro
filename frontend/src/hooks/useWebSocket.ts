import { useEffect, useRef, useCallback } from "react";
import type { WebSocketMessage } from "../types/index.js";

const WS_BASE = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : "ws://localhost:8000");

export function useWebSocket(
  sessionId: string,
  username: string,
  onMessage: (message: WebSocketMessage) => void
) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | undefined>(undefined);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!username) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${WS_BASE}/ws/${sessionId}?username=${encodeURIComponent(username)}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage;
      onMessageRef.current(message);
    };

    ws.current.onerror = () => {};

    ws.current.onclose = () => {
      reconnectTimeout.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [sessionId, username]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);
}
