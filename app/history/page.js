"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("playHistory") || "[]");
    setHistory(stored);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("playHistory");
    setHistory([]);
    setShowConfirm(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPerformanceColor = (accuracy) => {
    if (accuracy >= 80) return "text-green-400";
    if (accuracy >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getPerformanceEmoji = (accuracy) => {
    if (accuracy >= 80) return "🔥";
    if (accuracy >= 60) return "👍";
    return "💪";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-indigo-600 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/")}
            className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/20 transition-all"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">📜 Game History</h1>
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-500/20 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-all"
          >
            🗑️ Clear
          </button>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎮</div>
              <p className="text-white/70">No games played yet!</p>
              <button
                onClick={() => router.push("/game")}
                className="mt-4 bg-gradient-to-r from-green-500 to-blue-600 px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-700 transition-all"
              >
                Play Your First Game
              </button>
            </div>
          ) : (
            history.map((game, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getPerformanceEmoji(game.accuracy)}</span>
                    <div>
                      <div className="font-bold text-lg">{game.score} points</div>
                      <div className="text-sm text-white/70">{formatDate(game.date)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getPerformanceColor(game.accuracy)}`}>
                      {game.accuracy}%
                    </div>
                    <div className="text-sm text-white/70">
                      {game.correct}/15 correct
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clear Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white text-black p-6 rounded-xl max-w-sm mx-4">
              <h3 className="font-bold text-lg mb-2">Clear History?</h3>
              <p className="text-gray-600 mb-4">This will permanently delete all your game history.</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-gray-200 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={clearHistory}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}