import type { Card as CardType } from "../types/index.js";
import { deleteCard } from "../utils/api";

interface CardProps {
  card: CardType;
  currentUser: string;
  onDelete: (id: number) => void;
}

export function Card({ card, currentUser, onDelete }: CardProps) {
  const isOwner = card.author === currentUser;

  const handleDelete = async () => {
    if (!isOwner) return;
    try {
      await deleteCard(card.id, currentUser);
      onDelete(card.id);
    } catch {
      // WS broadcast will reflect the state; silently ignore
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 relative group hover:shadow-lg transition-shadow">
      {isOwner && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 font-bold text-xl"
          aria-label="Delete card"
        >
          ×
        </button>
      )}
      <p className="text-gray-900 mb-2 pr-6">{card.content}</p>
      <p className="text-xs text-gray-600">- {card.author}</p>
    </div>
  );
}
