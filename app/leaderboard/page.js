"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import leaderboardContract, { getContract } from "@/lib/leaderboardContract";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { sdk } from "@farcaster/miniapp-sdk";

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [canOpenProfiles, setCanOpenProfiles] = useState(false); // Track if we can open profiles
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  // Wagmi hooks for delete functionality
  const { address, isConnected } = useAccount();
  const {
    writeContract,
    data: deleteHash,
    isPending: isDeletePending,
    error: deleteError
  } = useWriteContract();

  const {
    isLoading: isDeleteConfirming,
    isSuccess: isDeleteConfirmed
  } = useWaitForTransactionReceipt({
    hash: deleteHash,
  });

  const OWNER_ADDRESS = "0xE595a019B48378FEE0971ee1703537964E2A3B05";
  const isOwner = isConnected && address?.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  // Initialize Farcaster SDK for safe area insets and profile capabilities
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

        // Check if we can open profiles (only available in Farcaster Mini App environment)
        const isInMiniApp = await sdk.isInMiniApp();
        setCanOpenProfiles(isInMiniApp);
        console.log("👤 Profile viewing available:", isInMiniApp);
        
      } catch (error) {
        console.warn("Farcaster SDK initialization failed in leaderboard:", error);
      }
    };

    initializeFarcaster();
  }, []);

  // Function to open a user's Farcaster profile
  const openUserProfile = async (entry) => {
    if (!canOpenProfiles) {
      console.log("❌ Profile viewing not available - not in Farcaster Mini App");
      return;
    }

    try {
      // Try to extract FID from display name if it follows the pattern "FCUser123456"
      let fid = null;
      
      if (entry.displayName && entry.displayName.startsWith('FCUser')) {
        const fidMatch = entry.displayName.match(/FCUser(\d+)/);
        if (fidMatch) {
          fid = parseInt(fidMatch[1]);
        }
      }

      if (fid && fid > 0) {
        console.log(`👤 Opening profile for FID: ${fid}`);
        await sdk.actions.openProfile({ fid: fid });
      } else {
        console.log("❌ No valid FID found for this user");
        // Fallback: show alert with user info
        alert(`User: ${entry.displayName}\nScore: ${entry.score}\nAddress: ${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`);
      }
      
    } catch (error) {
      console.error("❌ Failed to open profile:", error);
      
      if (error.message === "RejectedByUser") {
        console.log("User cancelled profile view");
      } else if (error.message === "InvalidFid") {
        console.log("Invalid FID provided");
        alert("Could not find this user's Farcaster profile");
      } else {
        console.log("Profile view error:", error.message);
        alert("Unable to open profile at this time");
      }
    }
  };

  // Refresh leaderboard after successful deletion
  useEffect(() => {
    if (isDeleteConfirmed) {
      console.log("Delete confirmed, refreshing leaderboard...");
      setSelectedEntries(new Set());
      setIsDeleteMode(false);
      setTimeout(() => {
        fetchLeaderboard(true);
      }, 2000);
    }
  }, [isDeleteConfirmed]);

  // Retry function for critical calls
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        console.log(`⏳ Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const fetchLeaderboard = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 Fetching leaderboard... ${forceRefresh ? '(Force refresh)' : ''}`);

      const timestamp = Date.now();
      const rpcProviders = [
        `https://mainnet.base.org?t=${timestamp}`,
        `https://base-mainnet.g.alchemy.com/v2/demo?t=${timestamp}`,
        `https://base.gateway.tenderly.co?t=${timestamp}`,
        "https://base.llamarpc.com",
      ];

      let provider;
      let contract;

      for (const rpcUrl of rpcProviders) {
        try {
          console.log(`🔗 Trying RPC: ${rpcUrl.split('?')[0]}`);
          provider = new ethers.JsonRpcProvider(rpcUrl);
          
          const network = await provider.getNetwork();
          if (network.chainId !== 8453n) {
            console.log(`❌ Wrong network: ${network.chainId}, expected Base (8453)`);
            continue;
          }

          contract = getContract(provider);
          const blockNumber = await provider.getBlockNumber();
          console.log(`✅ Connected to Base network, block: ${blockNumber}`);
          break;
        } catch (providerError) {
          console.warn(`❌ Failed RPC ${rpcUrl.split('?')[0]}:`, providerError.message);
          continue;
        }
      }

      if (!contract || !provider) {
        throw new Error("Unable to connect to Base network");
      }

      let total;
      try {
        total = await retryWithBackoff(() => contract.getTotalEntries());
        console.log(`📊 Total entries: ${total.toString()}`);
      } catch (contractError) {
        throw new Error(`Failed to get total entries: ${contractError.message}`);
      }

      const totalNum = parseInt(total.toString());
      let results = [];

      if (totalNum > 0) {
        console.log(`📥 Fetching all ${totalNum} entries in one call...`);
        
        try {
          const allEntries = await retryWithBackoff(() => contract.getAllEntries());
          console.log(`✅ Got ${allEntries.length} entries from getAllEntries()`);
          
          results = allEntries.map((entry, index) => ({
            index: index,
            displayName: entry.displayName || `Player ${index + 1}`,
            address: entry.user || "0x0000000000000000000000000000000000000000",
            score: parseInt(entry.score.toString()) || 0,
          }));

        } catch (getAllError) {
          console.warn(`⚠️ getAllEntries() failed: ${getAllError.message}`);
          console.log(`📥 Falling back to individual getEntry() calls...`);
          
          const batchSize = 3;
          
          for (let i = 0; i < totalNum; i += batchSize) {
            const batch = [];
            const endIndex = Math.min(i + batchSize, totalNum);
            
            for (let j = i; j < endIndex; j++) {
              batch.push(
                retryWithBackoff(() => contract.getEntry(j))
                  .then(result => ({ index: j, result }))
                  .catch(err => {
                    console.warn(`⚠️ Failed to fetch entry ${j} after retries:`, err.message);
                    return { index: j, result: null };
                  })
              );
            }

            const batchResults = await Promise.all(batch);
            
            for (const { index, result } of batchResults) {
              if (result) {
                const [name, user, score] = result;
                results.push({
                  index: index,
                  displayName: name || `Player ${index + 1}`,
                  address: user || "0x0000000000000000000000000000000000000000",
                  score: parseInt(score.toString()) || 0,
                });
              }
            }

            if (endIndex < totalNum) {
              console.log(`⏳ Processed ${endIndex}/${totalNum} entries, waiting...`);
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }
        }
      }

      console.log(`📊 Expected ${totalNum} entries, got ${results.length} entries`);
      
      if (results.length < totalNum) {
        console.warn(`⚠️ Missing ${totalNum - results.length} entries! Some entries failed to load.`);
      }

      const sorted = results
        .filter(entry => entry.score >= 0)
        .sort((a, b) => b.score - a.score);

      console.log(`✅ Leaderboard loaded: ${sorted.length} valid entries (${totalNum} total expected)`);
      setEntries(sorted);
      setLastRefresh(Date.now());

    } catch (err) {
      console.error("❌ Error fetching leaderboard:", err);
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    setEntries([]);
    setError(null);
    setLoading(true);
    setSelectedEntries(new Set());
    setIsDeleteMode(false);
    fetchLeaderboard(true);
  };

  const toggleEntrySelection = (index) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEntries(newSelected);
  };

  const deleteSelectedEntries = async () => {
    if (selectedEntries.size === 0) return;

    try {
      const indicesToDelete = Array.from(selectedEntries);
      console.log("🗑️ Deleting entries at indices:", indicesToDelete);

      if (indicesToDelete.length === 1) {
        await writeContract({
          address: leaderboardContract.address,
          abi: leaderboardContract.abi,
          functionName: "deleteEntry",
          args: [indicesToDelete[0]],
        });
      } else {
        await writeContract({
          address: leaderboardContract.address,
          abi: leaderboardContract.abi,
          functionName: "deleteMultipleEntries",
          args: [indicesToDelete],
        });
      }

    } catch (err) {
      console.error("❌ Delete error:", err);
      alert("Failed to delete entries: " + (err.message || "Unknown error"));
    }
  };

  const formatRefreshTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
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

        {/* Header with Home, Refresh, and Delete buttons */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition font-semibold"
          >
            🏠 Home
          </button>
          
          <div className="flex gap-2">
            {isOwner && (
              <button
                onClick={() => setIsDeleteMode(!isDeleteMode)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  isDeleteMode 
                    ? 'bg-red-600/30 text-red-300 hover:bg-red-600/40' 
                    : 'bg-red-600/20 text-red-300 hover:bg-red-600/30'
                }`}
              >
                {isDeleteMode ? "❌ Cancel" : "🗑️ Delete"}
              </button>
            )}
            
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 text-sm hover:bg-blue-600/30 transition font-semibold disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "⏳" : "🔄"} Refresh
            </button>
          </div>
        </div>

        {/* Delete controls when in delete mode */}
        {isDeleteMode && isOwner && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="text-sm text-red-300 mb-2">
              Select entries to delete ({selectedEntries.size} selected)
            </div>
            <div className="flex gap-2">
              <button
                onClick={deleteSelectedEntries}
                disabled={selectedEntries.size === 0 || isDeletePending || isDeleteConfirming}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:opacity-50"
              >
                {isDeletePending ? "⏳ Deleting..." : 
                 isDeleteConfirming ? "🔄 Confirming..." : 
                 `🗑️ Delete ${selectedEntries.size} entries`}
              </button>
              <button
                onClick={() => setSelectedEntries(new Set())}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-6 text-center">🏆 Leaderboard</h1>

        {/* Profile viewing info */}
        {canOpenProfiles && (
          <div className="text-center text-xs text-blue-400 mb-4">
            👤 Tap player names to view their Farcaster profiles
          </div>
        )}

        {/* Last refresh indicator */}
        <div className="text-center text-xs text-gray-400 mb-4">
          {lastRefresh && `Last updated: ${formatRefreshTime(lastRefresh)}`}
          {entries.length > 0 && ` • ${entries.length} players`}
        </div>

        {loading ? (
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">🎮</div>
            <div className="text-gray-300">Loading from Base blockchain...</div>
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
            {entries.slice(0, 100).map((entry, i) => (
              <div
                key={`${entry.address}-${entry.index}`}
                className={`flex justify-between items-center backdrop-blur-sm border px-4 py-2 rounded-lg transition-all hover:scale-[1.01] ${
                  isDeleteMode && selectedEntries.has(entry.index)
                    ? 'bg-red-500/20 border-red-500/40'
                    : i === 0 ? 'bg-yellow-500/20 border-yellow-500/40' :
                    i === 1 ? 'bg-gray-400/20 border-gray-400/40' :
                    i === 2 ? 'bg-orange-600/20 border-orange-600/40' :
                    'bg-white/10 border-white/20'
                } ${isDeleteMode ? 'cursor-pointer' : ''}`}
                onClick={() => isDeleteMode && isOwner && toggleEntrySelection(entry.index)}
              >
                <div className="flex items-center space-x-3">
                  {/* Delete mode checkbox */}
                  {isDeleteMode && isOwner && (
                    <input
                      type="checkbox"
                      checked={selectedEntries.has(entry.index)}
                      onChange={() => toggleEntrySelection(entry.index)}
                      className="w-4 h-4"
                    />
                  )}
                  
                  <span className={`w-8 text-center font-bold ${
                    i === 0 ? 'text-yellow-400' :
                    i === 1 ? 'text-gray-300' :
                    i === 2 ? 'text-orange-400' :
                    'text-white/80'
                  }`}>
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  
                  <div className="flex flex-col min-w-0 flex-1">
                    {/* Clickable player name for profile viewing */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering delete mode selection
                        if (!isDeleteMode) {
                          openUserProfile(entry);
                        }
                      }}
                      className={`text-sm font-semibold truncate max-w-[140px] text-left ${
                        canOpenProfiles && !isDeleteMode 
                          ? 'hover:text-blue-400 hover:underline cursor-pointer' 
                          : ''
                      }`}
                      disabled={isDeleteMode}
                    >
                      {entry.displayName || `Player ${i + 1}`}
                      {canOpenProfiles && !isDeleteMode && (
                        <span className="ml-1 text-xs opacity-60">👤</span>
                      )}
                    </button>
                    
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
          <p>📡 Live from Base blockchain</p>
          {isOwner && (
            <p className="mt-1 text-yellow-400">👑 Owner privileges active</p>
          )}
        </div>

        {/* Delete transaction status */}
        {deleteHash && (
          <div className="mt-2 text-xs text-gray-400 text-center">
            Delete TX: {deleteHash.slice(0, 8)}...{deleteHash.slice(-6)}
          </div>
        )}
          </div>
    </main>
  );
}
