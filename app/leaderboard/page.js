"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import leaderboardContract from '@/lib/leaderboardContract';

export default function BlockchainLeaderboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Base network RPC URLs (primary and fallbacks)
      const baseRpcUrls = [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://base-mainnet.g.alchemy.com/v2/demo',
        process.env.NEXT_PUBLIC_RPC_URL // User's custom RPC if provided
      ].filter(Boolean); // Remove any undefined values
      
      let workingProvider = null;
      
      // Test Base RPC endpoints
      for (const rpcUrl of baseRpcUrls) {
        try {
          console.log(`Testing Base RPC: ${rpcUrl}`);
          const testProvider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Verify we're on Base network (chainId: 8453)
          const network = await testProvider.getNetwork();
          console.log(`Network chainId: ${network.chainId}`);
          
          if (network.chainId !== 8453n) {
            console.log(`❌ Wrong network, expected Base (8453), got ${network.chainId}`);
            continue;
          }
          
          // Create contract instance for testing
          const testContract = new ethers.Contract(
            leaderboardContract.address,
            leaderboardContract.abi,
            testProvider
          );

          // Test if we can read the contract
          const testTotal = await testContract.getTotalEntries();
          console.log(`✅ Found contract on Base network, total entries:`, testTotal.toString());
          
          workingProvider = testProvider;
          break;
          
        } catch (rpcError) {
          console.log(`❌ Failed on ${rpcUrl}:`, rpcError.message.slice(0, 100));
          continue;
        }
      }
      
      if (!workingProvider) {
        throw new Error("Cannot connect to Base network. Please check your internet connection and try again.");
      }
      
      console.log("✅ Successfully connected to Base network");
      
      // Create contract instance with working provider
      const contract = new ethers.Contract(
        leaderboardContract.address,
        leaderboardContract.abi,
        workingProvider
      );

      console.log("Fetching total entries from contract...");
      
      // Get total number of entries
      const total = await contract.getTotalEntries();
      const totalCount = parseInt(total.toString());
      
      console.log("Total entries found:", totalCount);
      setTotalEntries(totalCount);

      if (totalCount === 0) {
        setScores([]);
        setError(""); // Clear any previous errors
        setLoading(false);
        return;
      }

      // Fetch all entries
      const entries = [];
      for (let i = 0; i < totalCount; i++) {
        try {
          const entry = await contract.getEntry(i);
          entries.push({
            displayName: entry[0],
            userAddress: entry[1], 
            score: parseInt(entry[2].toString()),
            index: i
          });
        } catch (entryError) {
          console.error(`Error fetching entry ${i}:`, entryError);
          // Continue with other entries
        }
      }

      // Sort by score (highest first)
      entries.sort((a, b) => b.score - a.score);
      
      console.log("Fetched entries:", entries);
      setScores(entries);
      
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(`Failed to load leaderboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankEmoji = (index) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈"; 
      case 2: return "🥉";
      default: return `#${index + 1}`;
    }
  };

  const isMobileEntry = (displayName) => {
    return displayName.includes('(FC:');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🏆</div>
          <div className="text-lg">Loading leaderboard...</div>
          <div className="text-sm opacity-60 mt-2">Reading from blockchain...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            🏆 Leaderboard
          </h1>
          <div className="text-sm opacity-60">
            {totalEntries} total entries • Live from blockchain
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center mb-4">
          <button
            onClick={fetchLeaderboardData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
            <button 
              onClick={fetchLeaderboardData}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Leaderboard Entries */}
        {scores.length === 0 && !loading ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎮</div>
            <div className="text-lg mb-2">No scores yet!</div>
            <div className="text-sm opacity-60">Be the first to submit your score</div>
          </div>
        ) : (
          <div className="space-y-2">
            {scores.map((entry, index) => (
              <div
                key={`${entry.userAddress}-${entry.index}`}
                className={`p-3 rounded-lg border ${
                  index === 0 ? 'bg-yellow-500/20 border-yellow-500/30' :
                  index === 1 ? 'bg-gray-400/20 border-gray-400/30' :
                  index === 2 ? 'bg-amber-600/20 border-amber-600/30' :
                  'bg-white/10 border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-bold w-8">
                      {getRankEmoji(index)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {entry.displayName}
                      </div>
                      <div className="text-xs opacity-60">
                        {isMobileEntry(entry.displayName) ? (
                          <span>📱 Mobile User</span>
                        ) : (
                          <span>🌐 {formatAddress(entry.userAddress)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">
                      {entry.score}
                    </div>
                    <div className="text-xs opacity-60">points</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Game Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/game'}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 rounded-lg font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            🎮 Play Again
          </button>
        </div>
      </div>
    </main>
  );
}
