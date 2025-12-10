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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-green-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 pt-12">
          <h1 className="text-7xl font-bold text-white mb-4" style={{ fontFamily: 'VGPisgah, serif' }}>
            Retro Board
          </h1>
          <p className="text-xl text-white mb-8 font-medium">
            Collaborative retrospective boards for agile teams
          </p>
          <button
            onClick={handleCreateRetro}
            disabled={isCreating}
            className="bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border-2 border-white"
          >
            {isCreating ? "Creating..." : "Create New Retro"}
          </button>
        </div>

        {!loading && sessions.length > 0 && (
          <div className="bg-blue-950/80 backdrop-blur rounded-lg shadow-lg p-6 border-2 border-white">
            <h2 className="text-2xl font-bold text-white mb-4">
              Existing Boards ({sessions.length})
            </h2>
            <div className="grid gap-3">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  onClick={() => handleJoinBoard(session.session_id)}
                  className="border-2 border-white bg-blue-900/50 rounded-lg p-4 hover:bg-green-900/30 hover:border-gray-200 transition cursor-pointer shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {session.name || `Board ${session.session_id}`}
                      </h3>
                      <p className="text-sm text-white/80 mt-1">
                        Session ID: {session.session_id}
                      </p>
                      {session.card_count !== undefined && (
                        <p className="text-sm text-white/70 mt-1">
                          {session.card_count} {session.card_count === 1 ? 'card' : 'cards'}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-white/80">
                      <p className="font-medium">Last active</p>
                      <p>{formatDate(session.last_activity || session.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center text-white text-lg font-medium bg-blue-950/70 backdrop-blur rounded-lg p-6 border border-white">
            No boards yet. Create your first one!
          </div>
        )}
      </div>
    </div>
  );
}
