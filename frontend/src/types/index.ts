export type CategoryType = "well" | "badly" | "continue" | "kudos" | "actionables";

export interface Card {
  id: number;
  session_id: string;
  category: CategoryType;
  content: string;
  author: string;
  created_at: string;
  completed?: boolean;
}

export interface Session {
  session_id: string;
  name?: string;
  created_at: string;
  last_activity?: string;
  card_count?: number;
}

export interface SessionResponse {
  session: Session;
  cards: Card[];
}

export interface WebSocketMessage {
  event: "card_added" | "card_updated" | "card_deleted" | "user_list" | "board_cleared";
  data: Card | { id: number } | { users: string[] } | {};
}
