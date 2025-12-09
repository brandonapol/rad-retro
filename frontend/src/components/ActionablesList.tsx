import type { Card } from "../types/index.js";
import { updateCard } from "../utils/api";

interface ActionablesListProps {
  actionables: Card[];
  onToggle: (id: number, completed: boolean) => void;
}

export function ActionablesList({
  actionables,
  onToggle,
}: ActionablesListProps) {
  const handleToggle = async (card: Card) => {
    try {
      await updateCard(card.id, { completed: !card.completed });
      onToggle(card.id, !card.completed);
    } catch (error) {
      console.error("Failed to toggle actionable:", error);
    }
  };

  if (actionables.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Action Items</h2>
      <div className="space-y-2">
        {actionables.map((card) => (
          <div key={card.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={card.completed || false}
              onChange={() => handleToggle(card)}
              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <p
                className={`text-gray-800 ${
                  card.completed ? "line-through text-gray-500" : ""
                }`}
              >
                {card.content}
              </p>
              <p className="text-xs text-gray-600">- {card.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
