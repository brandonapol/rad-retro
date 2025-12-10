import { useState } from "react";
import type { CategoryType } from "../types/index.js";

interface AddCardButtonProps {
  category: CategoryType;
  onAdd: (content: string) => void;
}

export function AddCardButton({ category: _category, onAdd }: AddCardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAdd(content.trim());
      setContent("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-2 px-4 bg-green-700/50 hover:bg-green-600/60 rounded-md text-white font-medium transition border-2 border-white"
      >
        + Add Card
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3 py-2 bg-blue-950/70 border-2 border-white rounded-md focus:outline-none focus:ring-2 focus:ring-white resize-none text-white placeholder-white/60"
        placeholder="Enter your card content..."
        rows={3}
        autoFocus
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition border-2 border-white"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setContent("");
          }}
          className="flex-1 bg-blue-800 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition border-2 border-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
