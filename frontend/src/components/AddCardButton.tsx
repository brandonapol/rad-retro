import { useState } from "react";
import type { CategoryType } from "../types/index.js";

interface AddCardButtonProps {
  category: CategoryType;
  onAdd: (content: string) => void;
}

export function AddCardButton({ category, onAdd }: AddCardButtonProps) {
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
        className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 font-medium transition"
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
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="Enter your card content..."
        rows={3}
        autoFocus
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setContent("");
          }}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
