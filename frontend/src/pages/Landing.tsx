import { useNavigate } from "react-router-dom";
import { createSession, getSessions } from "../utils/api";
import { useState, useEffect } from "react";
import type { Session } from "../types/index.js";

export function Landing() {
  console.log("[LANDING] Component rendered");
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[LANDING] useEffect triggered, loading sessions");
    loadSessions();
  }, []);

  const loadSessions = async () => {
    console.log("[LANDING] loadSessions() called");
    try {
      console.log("[LANDING] Calling getSessions() API");
      const data = await getSessions();
      console.log("[LANDING] Received sessions data:", data);
      setSessions(data.sessions);
      console.log("[LANDING] Set sessions state with", data.sessions.length, "sessions");
    } catch (error) {
      console.error("[LANDING] Failed to load sessions:", error);
    } finally {
      setLoading(false);
      console.log("[LANDING] Loading complete");
    }
  };

  const handleCreateRetro = async () => {
    console.log("[LANDING] handleCreateRetro() called");
    setIsCreating(true);
    try {
      console.log("[LANDING] Calling createSession() API");
      const { session_id } = await createSession();
      console.log("[LANDING] Session created:", session_id);
      console.log("[LANDING] Navigating to /retro/" + session_id);
      navigate(`/retro/${session_id}`);
    } catch (error) {
      console.error("[LANDING] Failed to create session:", error);
      alert("Failed to create retro session. Please try again.");
      setIsCreating(false);
    }
  };

  const handleJoinBoard = (sessionId: string) => {
    console.log("[LANDING] handleJoinBoard() called with sessionId:", sessionId);
    navigate(`/retro/${sessionId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 pt-12">
          <h1 className="text-6xl font-bold text-white mb-4">Retro Board</h1>
          <p className="text-xl text-white mb-8">
            Collaborative retrospective boards for agile teams
          </p>
          <button
            onClick={handleCreateRetro}
            disabled={isCreating}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-xl font-semibold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isCreating ? "Creating..." : "Create New Retro"}
          </button>
        </div>

        {!loading && sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Existing Boards ({sessions.length})
            </h2>
            <div className="grid gap-3">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  onClick={() => handleJoinBoard(session.session_id)}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {session.name || `Board ${session.session_id}`}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Session ID: {session.session_id}
                      </p>
                      {session.card_count !== undefined && (
                        <p className="text-sm text-gray-500 mt-1">
                          {session.card_count} {session.card_count === 1 ? 'card' : 'cards'}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Last active</p>
                      <p>{formatDate(session.last_activity || session.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center text-white text-lg">
            No boards yet. Create your first one!
          </div>
        )}
      </div>
    </div>
  );
}
