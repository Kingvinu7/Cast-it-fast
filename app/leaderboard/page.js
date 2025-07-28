"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContract } from "@/lib/leaderboardContract";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  // Initialize Farcaster SDK for safe area insets
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        if (typeof window === 'undefined') return;
        
        await sdk.actions.ready();
        const context = sdk.context;
        
        if (context?.client?.safeAreaInsets) {
          setSafeAreaInsets(context.client.safeAreaInsets);
          console.log("📱 Leaderboard safe area insets:", context.client.safeAreaInsets);
        }
      } catch (error) {
        console.warn("Farcaster SDK initialization failed in leaderboard:", error);
      }
    };

    initializeFarcaster();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try multiple RPC providers as fallback
        const rpcProviders = [
          "https://mainnet.base.org",
          "https://base-mainnet.g.alchemy.com/v2/demo", // Public Alchemy endpoint
          "https://base.gateway.tenderly.co", // Tenderly public gateway
        ];

        let provider;
        let contract;
        
        // Try each provider until one works
        for (const rpcUrl of rpcProviders) {
          try {
            provider = new ethers.JsonRpcProvider(rpcUrl);
            contract = getContract(provider);
            
            // Test the connection with a simple call
            await provider.getBlockNumber();
            console.log(`Connected successfully to: ${rpcUrl}`);
            break;
          } catch (providerError) {
            console.warn(`Failed to connect to ${rpcUrl}:`, providerError);
            continue;
          }
        }

        if (!contract) {
          throw new Error("Unable to connect to any RPC provider");
        }

        // Get total entries with retry logic
        let total;
        try {
          total = await contract.getTotalEntries();
          console.log("Total entries:", total.toString());
        } catch (contractError) {
          console.error("Error calling getTotalEntries:", contractError);
          
          // If the contract call fails, it might be because the contract doesn't exist
          // or the method name is different. Let's try some alternatives:
          try {
            // Try alternative method names
            total = await contract.getEntriesCount();
          } catch (altError) {
            try {
              total = await contract.totalEntries();
            } catch (altError2) {
              throw new Error("Contract method not found. Check contract ABI.");
            }
          }
        }

        const totalNum = parseInt(total.toString());
        const results = [];

        if (totalNum > 0) {
          // Fetch entries with batch processing to avoid rate limits
          const batchSize = 5;
          for (let i = 0; i < totalNum; i += batchSize) {
            const batch = [];
            const endIndex = Math.min(i + batchSize, totalNum);
            
            for (let j = i; j < endIndex; j++) {
              batch.push(
                contract.getEntry(j).catch(err => {
                  console.error(`Error fetching entry ${j}:`, err);
                  return null;
                })
              );
            }

            const batchResults = await Promise.all(batch);
            
            for (let k = 0; k < batchResults.length; k++) {
              const result = batchResults[k];
              if (result) {
                const [name, user, score] = result;
                results.push({
                  displayName: name || `Player ${i + k + 1}`,
                  address: user || "0x0000000000000000000000000000000000000000",
                  score: parseInt(score.toString()) || 0,
                });
              }
            }

            // Add small delay between batches to avoid rate limiting
            if (endIndex < totalNum) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }

        // Sort by score (highest first)
        const sorted = results
          .filter(entry => entry.score > 0) // Filter out invalid entries
          .sort((a, b) => b.score - a.score);

        setEntries(sorted);
        console.log("Leaderboard loaded:", sorted);

      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const handleRefresh = () => {
    setEntries([]);
    setError(null);
    setLoading(true);
    // Re-trigger the useEffect
    window.location.reload();
  };

  return (
    <main 
      className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white flex items-center justify-center px-4 py-6"
      style={{
        paddingTop: Math.max(24, safeAreaInsets.top + 16),
        paddingBottom: Math.max(24, safeAreaInsets.bottom + 16),
        paddingLeft: Math.max(16, safeAreaInsets.left + 8),
        paddingRight: Math.max(16, safeAreaInsets.right + 8),
      }}
    >
      <div className="w-full max-w-md">

        {/* Header with Home and Refresh buttons */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition font-semibold"
          >
            🏠 Home
          </button>
          
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 text-sm hover:bg-blue-600/30 transition font-semibold disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "⏳" : "🔄"} Refresh
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">🏆 Leaderboard</h1>

        {loading ? (
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">🎮</div>
            <div className="text-gray-300">Loading leaderboard...</div>
            <div className="text-xs text-gray-500 mt-2">This may take a moment</div>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-red-400 mb-4">{error}</div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-red-600/20 text-red-300 text-sm hover:bg-red-600/30 transition font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-4">🎯</div>
            <div className="text-gray-400 mb-2">No scores yet!</div>
            <div className="text-sm text-gray-500">Be the first to submit your score</div>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 100).map((entry, i) => ( // Limit to top 100
              <div
                key={`${entry.address}-${i}`}
                className={`flex justify-between items-center backdrop-blur-sm border px-4 py-2 rounded-lg transition-all hover:scale-[1.01] ${
                  i === 0 ? 'bg-yellow-500/20 border-yellow-500/40' :
                  i === 1 ? 'bg-gray-400/20 border-gray-400/40' :
                  i === 2 ? 'bg-orange-600/20 border-orange-600/40' :
                  'bg-white/10 border-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-8 text-center font-bold ${
                    i === 0 ? 'text-yellow-400' :
                    i === 1 ? 'text-gray-300' :
                    i === 2 ? 'text-orange-400' :
                    'text-white/80'
                  }`}>
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate max-w-[140px]">
                      {entry.displayName || `Player ${i + 1}`}
                    </span>
                    <span className="text-xs text-gray-400 truncate max-w-[150px]">
                      {entry.address && entry.address !== "0x0000000000000000000000000000000000000000" 
                        ? `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`
                        : "Anonymous"
                      }
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-bold text-lg ${
                    i === 0 ? 'text-yellow-400' :
                    i === 1 ? 'text-gray-300' :
                    i === 2 ? 'text-orange-400' :
                    'text-white/90'
                  }`}>
                    {entry.score}
                  </span>
                  <span className="text-xs text-gray-500">points</span>
                </div>
              </div>
            ))}
            
            {entries.length > 100 && (
              <div className="text-center text-xs text-gray-500 mt-4">
                Showing top 100 entries
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Leaderboard updates in real-time</p>
          {entries.length > 0 && (
            <p className="mt-1">Total players: {entries.length}</p>
          )}
        </div>
      </div>
    </main>
  );
}
