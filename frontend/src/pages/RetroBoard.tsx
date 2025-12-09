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
  console.log("[RETROBOARD] Component rendered");
  const { sessionId } = useParams<{ sessionId: string }>();
  console.log("[RETROBOARD] sessionId:", sessionId);
  const [cards, setCards] = useState<Card[]>([]);
  const [userName, setUserName] = useState<string>("");
  console.log("[RETROBOARD] userName state:", userName);
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
      .catch((err) => {
        console.error("Failed to load session:", err);
        setError("Failed to load session");
        setLoading(false);
      });
  }, [sessionId]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log("[RETROBOARD] handleWebSocketMessage called");
    console.log("[FRONTEND WS] Received message:", message.event, message.data);

    if (message.event === "card_added") {
      const card = message.data as Card;
      console.log("[FRONTEND WS] Adding card to state:", card.id);
      setCards((prev) => [...prev, card]);
    } else if (message.event === "card_updated") {
      const card = message.data as Card;
      console.log("[FRONTEND WS] Updating card in state:", card.id);
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? card : c))
      );
    } else if (message.event === "card_deleted") {
      const { id } = message.data as { id: number };
      console.log("[FRONTEND WS] Removing card from state:", id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } else if (message.event === "user_list") {
      const { users } = message.data as { users: string[] };
      console.log("[FRONTEND WS] Updating active users:", users);
      setActiveUsers(users);
    } else if (message.event === "board_cleared") {
      console.log("[FRONTEND WS] Clearing all cards");
      setCards([]);
    }
  }, []);

  // Only connect to WebSocket after username is set
  console.log("[RETROBOARD] About to call useWebSocket with userName:", userName || "Anonymous");
  useWebSocket(sessionId || "", userName || "Anonymous", handleWebSocketMessage);
  console.log("[RETROBOARD] useWebSocket hook called");

  const handleAddCard = async (category: string, content: string) => {
    if (!sessionId || !userName) return;

    console.log("[FRONTEND API] Calling addCard:", { sessionId, category, userName, content });
    try {
      const result = await addCard(sessionId, category as any, content, userName);
      console.log("[FRONTEND API] Card added successfully:", result);
    } catch (error) {
      console.error("[FRONTEND API] Failed to add card:", error);
    }
  };

  const handleDeleteCard = (id: number) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleActionable = (id: number, completed: boolean) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed } : c))
    );
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
      console.log("[FRONTEND] Board cleared successfully");
    } catch (error) {
      console.error("[FRONTEND] Failed to clear board:", error);
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
      } catch (error) {
        console.error("Failed to save board name:", error);
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
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
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
                    className="text-3xl font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                  />
                ) : (
                  <h1
                    onClick={handleEditBoardName}
                    className="text-3xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition"
                  >
                    {boardName || `Retro Board - ${sessionId}`}
                    <span className="text-sm ml-2 text-gray-500">(click to edit)</span>
                  </h1>
                )}
                <p className="text-sm text-gray-600 mt-1">Session: {sessionId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearBoard}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                >
                  Clear Board
                </button>
                <button
                  onClick={handleExportCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  Copy URL
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
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
                  className="border-b border-blue-500 focus:outline-none bg-transparent font-semibold"
                />
              ) : (
                <button
                  onClick={handleEditName}
                  className="font-semibold hover:text-blue-600 transition"
                >
                  {userName}
                  <span className="ml-1 text-xs text-gray-400">(edit)</span>
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
              onAddCard={(content) => handleAddCard("well", content)}
              onDeleteCard={handleDeleteCard}
            />
            <RetroColumn
              title="What Went Badly"
              category="badly"
              cards={badlyCards}
              onAddCard={(content) => handleAddCard("badly", content)}
              onDeleteCard={handleDeleteCard}
            />
            <RetroColumn
              title="Continue Doing"
              category="continue"
              cards={continueCards}
              onAddCard={(content) => handleAddCard("continue", content)}
              onDeleteCard={handleDeleteCard}
            />
            <RetroColumn
              title="Kudos"
              category="kudos"
              cards={kudosCards}
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
