import type { Card as CardType, CategoryType } from "../types/index.js";
import { Card } from "./Card";
import { AddCardButton } from "./AddCardButton";

interface RetroColumnProps {
  title: string;
  category: CategoryType;
  cards: CardType[];
  onAddCard: (content: string) => void;
  onDeleteCard: (id: number) => void;
}

const columnColors: Record<CategoryType, string> = {
  well: "bg-green-50 border-green-300",
  badly: "bg-red-50 border-red-300",
  continue: "bg-blue-50 border-blue-300",
  kudos: "bg-purple-50 border-purple-300",
  actionables: "bg-yellow-50 border-yellow-300",
};

export function RetroColumn({
  title,
  category,
  cards,
  onAddCard,
  onDeleteCard,
}: RetroColumnProps) {
  return (
    <div
      className={`flex flex-col p-4 rounded-lg border-2 ${columnColors[category]}`}
    >
      <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
      <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
        {cards.map((card) => (
          <Card key={card.id} card={card} onDelete={onDeleteCard} />
        ))}
      </div>
      <AddCardButton category={category} onAdd={onAddCard} />
    </div>
  );
}
