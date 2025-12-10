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
  well: "bg-white/20 border-green-500",
  badly: "bg-white/20 border-red-500",
  continue: "bg-white/20 border-blue-400",
  kudos: "bg-white/20 border-purple-500",
  actionables: "bg-white/20 border-emerald-500",
};

const headerColors: Record<CategoryType, string> = {
  well: "text-green-300",
  badly: "text-red-300",
  continue: "text-blue-300",
  kudos: "text-purple-300",
  actionables: "text-emerald-300",
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
      className={`flex flex-col p-4 rounded-lg border-2 backdrop-blur-sm ${columnColors[category]}`}
    >
      <h2 className={`text-xl font-bold mb-4 ${headerColors[category]}`}>{title}</h2>
      <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
        {cards.map((card) => (
          <Card key={card.id} card={card} onDelete={onDeleteCard} />
        ))}
      </div>
      <AddCardButton category={category} onAdd={onAddCard} />
    </div>
  );
}
