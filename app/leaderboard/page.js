"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContract } from "@/lib/leaderboardContract";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const contract = getContract(provider);

        const total = await contract.getTotalEntries();
        const results = [];

        for (let i = 0; i < total; i++) {
  const [name, user, score] = await contract.getEntry(i);

  results.push({
    displayName: name,
    address: user,
    score: parseInt(score.toString()),
  });
}

        // Sort descending by score
        const sorted = results.sort((a, b) => b.score - a.score);
        setEntries(sorted);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">🏆 Leaderboard</h1>

        {loading ? (
          <div className="text-center text-gray-300">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-400">No scores yet.</div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6">
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold truncate max-w-[140px]">
                      {entry.displayName}
                    </span>
                    <span className="text-xs text-gray-400 truncate max-w-[150px]">
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-white/80">{entry.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
