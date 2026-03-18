import { useNavigate } from "react-router-dom";
import { createSession } from "../utils/api";
import { useState } from "react";

export function Landing() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [joinId, setJoinId] = useState("");

  const handleCreateRetro = async () => {
    setIsCreating(true);
    try {
      const { session_id } = await createSession();
      navigate(`/retro/${session_id}`);
    } catch {
      alert("Failed to create retro session. Please try again.");
      setIsCreating(false);
    }
  };

  const handleJoinRetro = () => {
    const id = joinId.trim();
    if (!id) return;
    navigate(`/retro/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-green-900 p-6">
      <div className="max-w-xl mx-auto">
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
            className="bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border-2 border-white w-full mb-6"
          >
            {isCreating ? "Creating..." : "Create New Retro"}
          </button>

          <div className="bg-blue-950/60 backdrop-blur rounded-lg p-6 border-2 border-white">
            <p className="text-white font-medium mb-3">Already have a board?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRetro()}
                placeholder="Enter session ID"
                className="flex-1 px-4 py-2 rounded-lg border-2 border-white bg-blue-900/50 text-white placeholder-white/50 focus:outline-none focus:border-green-400"
              />
              <button
                onClick={handleJoinRetro}
                disabled={!joinId.trim()}
                className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
            <p className="text-white/60 text-sm mt-2">
              Or share your retro URL directly with your team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
