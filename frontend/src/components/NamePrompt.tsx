import { useState, useEffect } from "react";

interface NamePromptProps {
  onNameSet: (name: string) => void;
}

export function NamePrompt({ onNameSet }: NamePromptProps) {
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) {
      onNameSet(storedName);
    } else {
      setIsOpen(true);
    }
  }, [onNameSet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem("userName", name.trim());
      onNameSet(name.trim());
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Welcome to Retro Board</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Enter your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            placeholder="Your name"
            autoFocus
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            Start
          </button>
        </form>
      </div>
    </div>
  );
}
