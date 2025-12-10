import type { Card, SessionResponse, CategoryType } from "../types/index.js";

// Use environment variable or default to current origin (works in Docker and dev)
const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:8000");

export async function createSession(): Promise<{ session_id: string }> {
  const response = await fetch(`${API_BASE}/api/session/create`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to create session");
  return response.json();
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE}/api/session/${sessionId}`);
  if (!response.ok) throw new Error("Failed to fetch session");
  return response.json();
}

export async function addCard(
  sessionId: string,
  category: CategoryType,
  content: string,
  author: string
): Promise<Card> {
  const response = await fetch(`${API_BASE}/api/session/${sessionId}/card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, content, author }),
  });
  if (!response.ok) throw new Error("Failed to add card");
  return response.json();
}

export async function updateCard(
  cardId: number,
  data: { content?: string; completed?: boolean }
): Promise<Card> {
  const response = await fetch(`${API_BASE}/api/card/${cardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update card");
  return response.json();
}

export async function deleteCard(cardId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/card/${cardId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete card");
}

export async function clearBoard(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/session/${sessionId}/cards`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to clear board");
}

export async function getSessions(): Promise<{ sessions: any[] }> {
  const response = await fetch(`${API_BASE}/api/sessions`);
  if (!response.ok) throw new Error("Failed to fetch sessions");
  return response.json();
}

export async function updateSessionName(
  sessionId: string,
  name: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/session/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to update session name");
}
