"use client";
export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import leaderboardContract from "@/lib/leaderboardContract";
import { sdk } from "@farcaster/miniapp-sdk";

// SDK validation function
const validateSDK = () => {
  if (!sdk) {
    throw new Error("Farcaster SDK not available");
  }
  if (!sdk.actions || !sdk.actions.ready) {
    throw new Error("Farcaster SDK actions not available");
  }
  return true;
};

// Safe user display component
const SafeUserDisplay = ({ user }) => {
  if (!user) return null;
  
  const displayName = user.displayName || user.username || `Player${user.fid}` || 'Anonymous';
  
  return (
    <div className="mb-3 text-sm text-green-400 bg-green-400/10 rounded-lg p-2 border border-green-400/20">
      👋 Hey {displayName}!
    </div>
  );
};

// Separate component that uses useSearchParams
function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = searchParams.get("score");
  const correct = searchParams.get("correct");
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error: writeError,
    isError: isWriteError 
  } = useWriteContract();
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Auto-connect wallet when component loads
  useEffect(() => {
    const connectWallet = async () => {
      try {
        if (!isConnected && connectors.length > 0) {
          await connect({ connector: connectors[0] });
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    };

    connectWallet();
  }, [isConnected, connectors, connect]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setSubmissionStatus("🎉 Score successfully submitted to leaderboard!");
    } else if (isWriteError || receiptError) {
      setSubmissionStatus("❌ Failed to submit score. Please try again.");
      console.error("Transaction error:", writeError || receiptError);
    }
  }, [isConfirmed, isWriteError, receiptError, writeError]);

  // Initialize Farcaster SDK with comprehensive error handling
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        // Validate SDK first
        validateSDK();

        // Check if we're in a Mini App environment
        const isInMiniApp = await sdk.isInMiniApp();
        if (!isInMiniApp) {
          console.warn("Not running in a Farcaster Mini App environment");
          return;
        }

        // Initialize SDK properly
        await sdk.actions.ready();
        
        // Get context asynchronously
        const context = await sdk.context;
        console.log("🧠 Farcaster Context:", context);

        if (context?.user) {
          // Safe property access with proper fallbacks
          const user = context.user;
          let displayName = "Anonymous Player";

          // Safely extract displayName with multiple fallbacks
          if (user.displayName && typeof user.displayName === 'string' && user.displayName.trim()) {
            displayName = String(user.displayName).trim();
          } else if (user.username && typeof user.username === 'string' && user.username.trim()) {
            displayName = String(user.username).trim();
          } else if (user.fid) {
            displayName = `Player${user.fid}`;
          }

          // Clean displayName to prevent conversion errors
          displayName = displayName.replace(/[^\w\s-_.]/g, '').substring(0, 30).trim();
          
          if (!displayName) {
            displayName = `Player${user.fid || Date.now()}`;
          }

          setCurrentUser({
            fid: user.fid || 0,
            username: user.username || '',
            displayName: displayName,
            pfpUrl: user.pfpUrl || '',
          });

          console.log("✅ User loaded:", { displayName, fid: user.fid });
        }

        // Set safe area insets for mobile
        if (context?.client?.safeAreaInsets) {
          setSafeAreaInsets(context.client.safeAreaInsets);
          console.log("📱 Safe area insets:", context.client.safeAreaInsets);
        }

        setSdkReady(true);

      } catch (error) {
        console.error("Farcaster SDK error:", error);
        setInitError(error.message);
        setSdkReady(false);
        
        // Set a fallback user to prevent blocking
        setCurrentUser({
          fid: 0,
          username: 'anonymous',
          displayName: 'Anonymous Player',
          pfpUrl: '',
        });
      }
    };

    initializeFarcaster();
  }, []);

  // Submit to leaderboard with fixed type conversion
  const submitToLeaderboard = async () => {
    if (!isConnected) {
      setSubmissionStatus("❌ Wallet not connected");
      return;
    }

    if (!score || !currentUser?.displayName) {
      setSubmissionStatus("❌ Missing score or user data");
      return;
    }

    try {
      setSubmissionStatus("📝 Submitting to leaderboard...");

      // Ensure safe type conversion
      const scoreValue = Math.floor(Number(score));
      const displayName = String(currentUser.displayName || '').trim();

      // Validate inputs
      if (!Number.isInteger(scoreValue) || scoreValue < 0 || scoreValue > 10000) {
        setSubmissionStatus("❌ Invalid score value");
        console.error("Invalid score:", scoreValue);
        return;
      }

      if (!displayName || displayName.length === 0 || displayName.length > 50) {
        setSubmissionStatus("❌ Invalid player name");
        console.error("Invalid displayName:", displayName);
        return;
      }

      // Additional cleaning for contract safety
      const cleanDisplayName = displayName
        .replace(/[^\w\s-_.]/g, '')
        .substring(0, 30)
        .trim();
        
      if (!cleanDisplayName) {
        setSubmissionStatus("❌ Invalid player name after cleaning");
        return;
      }

      // Validate contract configuration
      if (!leaderboardContract?.address || !leaderboardContract?.abi) {
        setSubmissionStatus("❌ Contract configuration error");
        console.error("Contract config:", leaderboardContract);
        return;
      }

      console.log("Submitting with cleaned data:", { 
        displayName: cleanDisplayName, 
        scoreValue, 
        address: leaderboardContract.address
      });

      // Use regular number for better compatibility
      const result = await writeContract({
        address: leaderboardContract.address,
        abi: leaderboardContract.abi,
        functionName: "submitScore",
        args: [cleanDisplayName, scoreValue], // Use regular number instead of BigInt
      });

      console.log("Write contract result:", result);
      setSubmissionStatus("⏳ Confirming transaction...");

    } catch (err) {
      console.error("Submission error details:", err);
      
      // Enhanced error handling
      const errorMessage = err?.message || String(err);
      
      if (errorMessage.includes("User rejected") || errorMessage.includes("user rejected")) {
        setSubmissionStatus("❌ Transaction cancelled by user");
      } else if (errorMessage.includes("insufficient funds")) {
        setSubmissionStatus("❌ Insufficient funds for gas");
      } else if (errorMessage.includes("execution reverted")) {
        setSubmissionStatus("❌ Contract execution failed");
      } else if (errorMessage.includes("network")) {
        setSubmissionStatus("❌ Network connection error");
      } else if (errorMessage.includes("Cannot convert object to primitive")) {
        setSubmissionStatus("❌ Data format error");
        console.error("Primitive conversion error - check data types");
      } else if (err.code === 4001) {
        setSubmissionStatus("❌ Transaction rejected");
      } else {
        setSubmissionStatus("❌ Submission failed - please try again");
        console.error("Detailed error:", {
          message: errorMessage,
          code: err.code,
          data: err.data,
        });
      }
    }
  };

  // Save game history
  useEffect(() => {
    const saveGameHistory = () => {
      if (!score || !correct) return;

      try {
        const numScore = parseInt(score) || 0;
        const numCorrect = parseInt(correct) || 0;
        const accuracy = Math.round((numCorrect / 15) * 100);

        if (numScore === 0 && numCorrect === 0) return;

        const gameResult = {
          score: numScore,
          correct: numCorrect,
          accuracy: accuracy,
          date: new Date().toISOString()
        };

        const existingHistory = JSON.parse(localStorage.getItem("playHistory") || "[]");
        
        // Check for duplicates
        const isDuplicate = existingHistory.some(entry =>
          entry.score === gameResult.score &&
          entry.correct === gameResult.correct &&
          Math.abs(new Date(entry.date).getTime() - new Date(gameResult.date).getTime()) < 5000
        );

        if (!isDuplicate) {
          const updatedHistory = [gameResult, ...existingHistory].slice(0, 10);
          localStorage.setItem("playHistory", JSON.stringify(updatedHistory));
          console.log("Game saved:", gameResult);
        }
      } catch (error) {
        console.error("Failed to save game:", error);
      }
    };

    // Trigger animations
    setShowConfetti(true);
    setTimeout(() => setAnimateScore(true), 500);
    
    // Save game
    saveGameHistory();
  }, [score, correct]);

  const getPerformanceMessage = (score, correct) => {
    const numScore = parseInt(score) || 0;
    const numCorrect = parseInt(correct) || 0;
    const accuracy = Math.round((numCorrect / 15) * 100);

    if (numScore >= 100 && accuracy >= 90) return { message: "Perfect Master! 🏆", emoji: "👑", color: "text-yellow-400" };
    if (numScore >= 80 && accuracy >= 80) return { message: "Outstanding! 🌟", emoji: "⭐", color: "text-yellow-300" };
    if (numScore >= 70 && accuracy >= 70) return { message: "Excellent Work! 🎯", emoji: "🎯", color: "text-green-400" };
    if (numScore >= 50 && accuracy >= 60) return { message: "Great Job! 👏", emoji: "🎉", color: "text-green-300" };
    if (numScore >= 30 && accuracy >= 40) return { message: "Good Effort! 👍", emoji: "💪", color: "text-blue-400" };
    if (numScore >= 15) return { message: "Nice Try! 🎮", emoji: "🎮", color: "text-purple-400" };
    return { message: "Keep Practicing! 💪", emoji: "🎯", color: "text-red-400" };
  };

  const getRank = (score, correct) => {
    const numScore = parseInt(score) || 0;
    const numCorrect = parseInt(correct) || 0;
    const accuracy = Math.round((numCorrect / 15) * 100);

    if (numScore >= 100 && accuracy >= 90) return 'Legend';
    if (numScore >= 80 && accuracy >= 80) return 'Master';
    if (numScore >= 70 && accuracy >= 70) return 'Expert';
    if (numScore >= 50 && accuracy >= 60) return 'Advanced';
    if (numScore >= 30 && accuracy >= 40) return 'Good';
    if (numScore >= 15) return 'Novice';
    return 'Beginner';
  };

  const shareToFarcaster = () => {
    const numScore = parseInt(score) || 0;
    const numCorrect = parseInt(correct) || 0;

    const shareText = `I scored ${numScore} points and got ${numCorrect}/15 questions right on Cast It Fast! Can you beat my score? 🎮`;
    const encodedText = encodeURIComponent(shareText);
    const miniappUrl = encodeURIComponent("https://farcaster.xyz/miniapps/Y6Z-3Zz-bf_T/cast-it-fast");
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${miniappUrl}`;

    // Try to use Farcaster SDK share if available, otherwise fallback to URL
    try {
      if (sdk.actions.openUrl) {
        sdk.actions.openUrl(farcasterUrl);
      } else {
        window.open(farcasterUrl, '_blank');
      }
    } catch (error) {
      window.open(farcasterUrl, '_blank');
    }
  };

  const performance = getPerformanceMessage(score, correct);

  return (
    <main 
      className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center relative overflow-hidden"
      style={{
        paddingTop: Math.max(16, safeAreaInsets.top + 8),
        paddingBottom: Math.max(16, safeAreaInsets.bottom + 8),
        paddingLeft: Math.max(16, safeAreaInsets.left + 8),
        paddingRight: Math.max(16, safeAreaInsets.right + 8),
      }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse opacity-10 text-2xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            {['🌟', '✨', '🎉', '🎊', '💫', '🎯', '🏆'][Math.floor(Math.random() * 7)]}
          </div>
        ))}
      </div>

      <div className="relative z-10 text-center max-w-sm mx-auto w-full px-4">
        {/* Trophy Animation */}
        <div className={`text-4xl mb-3 transform transition-all duration-1000 ${
          showConfetti ? 'animate-bounce scale-100' : 'scale-0'
        }`}>
          {performance.emoji}
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent transform transition-all duration-1000 ${
          showConfetti ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          Game Complete!
        </h1>

        {/* Performance Message */}
        <div className={`text-lg font-semibold mb-4 ${performance.color} transform transition-all duration-1000 delay-300 ${
          showConfetti ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          {performance.message}
        </div>

        {/* Score Display */}
        <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20 shadow-2xl transform transition-all duration-1000 delay-500 ${
          animateScore ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}>
          <div className="text-xs mb-1 opacity-80">Final Score</div>
          <div className={`text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent transform transition-all duration-500 ${
            animateScore ? 'scale-100' : 'scale-0'
          }`}>
            {score || 0}
          </div>
          <div className="text-xs opacity-60 mt-1">points</div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-3 gap-2 mb-4 transform transition-all duration-1000 delay-700 ${
          animateScore ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
            <div className="text-lg mb-1">🎯</div>
            <div className="text-xs opacity-80 mb-1">Questions</div>
            <div className="text-sm font-bold">15</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
            <div className="text-lg mb-1">✅</div>
            <div className="text-xs opacity-80 mb-1">Correct</div>
            <div className="text-sm font-bold">{correct || 0}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
            <div className="text-lg mb-1">🏆</div>
            <div className="text-xs opacity-80 mb-1">Rank</div>
            <div className="text-xs font-bold">{getRank(score, correct)}</div>
          </div>
        </div>

        {/* SDK Error Display */}
        {initError && (
          <div className="mb-3 text-sm text-red-400 bg-red-400/10 rounded-lg p-2 border border-red-400/20">
            ⚠️ SDK Error: {initError}
          </div>
        )}

        {/* User Info - Using Safe Component */}
        <SafeUserDisplay user={currentUser} />

        {/* Wallet Status */}
        {isConnected && address ? (
          <div className="mb-3 text-xs text-green-400 bg-green-400/10 rounded-lg p-2 border border-green-400/20">
            ✅ Wallet: {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        ) : (
          <div className="mb-3 text-sm text-yellow-400 bg-yellow-400/10 rounded-lg p-2 border border-yellow-400/20">
            🔌 Connecting wallet...
          </div>
        )}

        {/* Action Buttons */}
        <div className={`space-y-2 transform transition-all duration-1000 delay-1000 ${
          animateScore ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          
          {/* Play Again */}
          <button
            onClick={() => router.push("/game")}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg text-base font-bold transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
          >
            🎮 Play Again
          </button>

          {/* Share Button */}
          <button
            onClick={shareToFarcaster}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white px-4 py-3 rounded-lg text-base font-bold transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
          >
            🚀 Share Your Score
          </button>

          {/* Submit to Leaderboard */}
          {currentUser && score && (
            <button
              onClick={submitToLeaderboard}
              disabled={!isConnected || isPending || isConfirming || isConfirmed}
              className={`w-full px-4 py-3 rounded-lg text-base font-bold transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg ${
                (!isConnected || isPending || isConfirming || isConfirmed)
                  ? 'bg-gray-600 cursor-not-allowed opacity-60' 
                  : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'
              }`}
            >
              {isPending ? "📝 Preparing..." : 
               isConfirming ? "⏳ Confirming..." : 
               isConfirmed ? "✅ Submitted!" : 
               "🏆 Submit to Leaderboard"}
            </button>
          )}

          {/* Home Button */}
          <button
            onClick={() => router.push("/")}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-3 rounded-lg text-base font-bold transform hover:scale-105 active:scale-95 transition-all duration-200 border border-white/30"
          >
            🏠 Home
          </button>
        </div>

        {/* Status Message */}
        {submissionStatus && (
          <div className={`mt-3 text-sm font-medium rounded-lg p-2 ${
            submissionStatus.includes('🎉') ? 'text-green-400 bg-green-400/10 border border-green-400/20' :
            submissionStatus.includes('❌') ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
            'text-blue-400 bg-blue-400/10 border border-blue-400/20'
          }`}>
            {submissionStatus}
          </div>
        )}

        {/* Transaction Hash */}
        {hash && (
          <div className="mt-2 text-xs text-gray-400">
            TX: {hash.slice(0, 8)}...{hash.slice(-6)}
          </div>
        )}
      </div>
    </main>
  );
}

// Loading Component
function ResultPageLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">🎮</div>
        <div className="text-xl font-semibold">Loading your results...</div>
        <div className="text-sm opacity-60 mt-2">Preparing your score</div>
      </div>
    </main>
  );
}

// Main Export
export default function ResultPage() {
  return (
    <Suspense fallback={<ResultPageLoading />}>
      <ResultContent />
    </Suspense>
  );
}
       
