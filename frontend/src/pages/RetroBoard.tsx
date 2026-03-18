import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import type { Card, WebSocketMessage } from "../types/index.js";
import { getSession, addCard, clearBoard, updateSessionName } from "../utils/api";
import { useWebSocket } from "../hooks/useWebSocket";
import { NamePrompt } from "../components/NamePrompt";
import { RetroColumn } from "../components/RetroColumn";
import { ActionablesList } from "../components/ActionablesList";
import { ActiveUsers } from "../components/ActiveUsers";
import { exportToCSV } from "../utils/exportCSV";

export function RetroBoard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [boardName, setBoardName] = useState<string>("");
  const [isEditingBoardName, setIsEditingBoardName] = useState<boolean>(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!sessionId) return;

    getSession(sessionId)
      .then((data) => {
        setCards(data.cards);
        if (data.session.name) {
          setBoardName(data.session.name);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load session");
        setLoading(false);
      });
  }, [sessionId]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.event === "card_added") {
      const card = message.data as Card;
      setCards((prev) => [...prev, card]);
    } else if (message.event === "card_updated") {
      const card = message.data as Card;
      setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    } else if (message.event === "card_deleted") {
      const { id } = message.data as { id: number };
      setCards((prev) => prev.filter((c) => c.id !== id));
    } else if (message.event === "user_list") {
      const { users } = message.data as { users: string[] };
      setActiveUsers(users);
    } else if (message.event === "board_cleared") {
      setCards([]);
    }
  }, []);

  useWebSocket(sessionId || "", userName, handleWebSocketMessage);

  const handleAddCard = async (category: string, content: string) => {
    if (!sessionId || !userName) return;
    try {
      await addCard(sessionId, category as any, content, userName);
    } catch {
      // WS broadcast will update state; silently ignore HTTP errors
    }
  };

  const handleDeleteCard = (id: number) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleActionable = (id: number, completed: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, completed } : c)));
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("URL copied to clipboard!");
  };

  const handleExportCSV = () => {
    if (!sessionId) return;
    exportToCSV(sessionId, cards);
  };

  const handleClearBoard = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear all cards from this board? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await clearBoard(sessionId);
    } catch {
      alert("Failed to clear board. Please try again.");
    }
  };

  const handleEditName = () => {
    setIsEditingName(true);
  };

  const handleSaveName = (newName: string) => {
    if (newName.trim()) {
      setUserName(newName.trim());
      setIsEditingName(false);
    }
  };

  const handleEditBoardName = () => {
    setIsEditingBoardName(true);
  };

  const handleSaveBoardName = async (newBoardName: string) => {
    const trimmedName = newBoardName.trim();
    setBoardName(trimmedName);
    setIsEditingBoardName(false);

    if (sessionId && trimmedName) {
      try {
        await updateSessionName(sessionId, trimmedName);
      } catch {
        // Non-critical — board name may not persist but UX is not broken
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  const wellCards = cards.filter((c) => c.category === "well");
  const badlyCards = cards.filter((c) => c.category === "badly");
  const continueCards = cards.filter((c) => c.category === "continue");
  const kudosCards = cards.filter((c) => c.category === "kudos");
  const actionables = cards.filter((c) => c.category === "actionables");

  return (
    <>
      <NamePrompt onNameSet={setUserName} />
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-green-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 bg-blue-950/60 backdrop-blur rounded-lg p-4 border-2 border-white">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                {isEditingBoardName ? (
                  <input
                    type="text"
                    defaultValue={boardName}
                    autoFocus
                    onBlur={(e) => handleSaveBoardName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveBoardName(e.currentTarget.value);
                      }
                    }}
                    className="text-3xl font-bold text-white border-b-2 border-white focus:outline-none bg-transparent"
                  />
                ) : (
                  <h1
                    onClick={handleEditBoardName}
                    className="text-3xl font-bold text-white cursor-pointer hover:text-white/80 transition"
                  >
                    {boardName || `Retro Board - ${sessionId}`}
                    <span className="text-sm ml-2 text-white/70">(click to edit)</span>
                  </h1>
                )}
                <p className="text-sm text-white/80 mt-1">Session: {sessionId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearBoard}
                  className="bg-red-700 text-white px-4 py-2 rounded-md hover:bg-red-800 transition border-2 border-white"
                >
                  Clear Board
                </button>
                <button
                  onClick={handleExportCSV}
                  className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition border-2 border-white"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition border-2 border-white"
                >
                  Copy URL
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <span>Logged in as:</span>
              {isEditingName ? (
                <input
                  type="text"
                  defaultValue={userName}
                  autoFocus
                  onBlur={(e) => handleSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveName(e.currentTarget.value);
                    }
                  }}
                  className="border-b border-white focus:outline-none bg-transparent font-semibold text-white"
                />
              ) : (
                <button
                  onClick={handleEditName}
                  className="font-semibold hover:text-white/80 transition text-white"
                >
                  {userName}
                  <span className="ml-1 text-xs text-white/70">(edit)</span>
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <ActiveUsers users={activeUsers} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <RetroColumn
              title="What Went Well"
              category="well"
              cards={wellCards}
              currentUser={userName}
              onAddCard={(content) => handleAddCard("well", content)}
              onDeleteCard={handleDeleteCard}
            />
            <RetroColumn
              title="What Went Badly"
              category="badly"
              cards={badlyCards}
              currentUser={userName}
              onAddCard={(content) => handleAddCard("badly", content)}
              onDeleteCard={handleDeleteCard}
            />
            <RetroColumn
              title="Continue Doing"
              category="continue"
              cards={continueCards}
              currentUser={userName}
              onAddCard={(content) => handleAddCard("continue", content)}
              onDeleteCard={handleDeleteCard}
            />
            <RetroColumn
              title="Kudos"
              category="kudos"
              cards={kudosCards}
              currentUser={userName}
              onAddCard={(content) => handleAddCard("kudos", content)}
              onDeleteCard={handleDeleteCard}
            />
          </div>

          <ActionablesList
            actionables={actionables}
            onToggle={handleToggleActionable}
          />
        </div>
      </div>
    </>
  );
}
