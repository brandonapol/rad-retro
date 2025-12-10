import type { Card as CardType } from "../types/index.js";
import { deleteCard } from "../utils/api";

interface CardProps {
  card: CardType;
  onDelete: (id: number) => void;
}

export function Card({ card, onDelete }: CardProps) {
  const handleDelete = async () => {
    try {
      await deleteCard(card.id);
      onDelete(card.id);
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 relative group hover:shadow-lg transition-shadow">
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 font-bold text-xl"
        aria-label="Delete card"
      >
        ×
      </button>
      <p className="text-gray-900 mb-2 pr-6">{card.content}</p>
      <p className="text-xs text-gray-600">- {card.author}</p>
    </div>
  );
}
