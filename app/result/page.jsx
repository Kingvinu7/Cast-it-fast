"use client";
export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import leaderboardContract from "@/lib/leaderboardContract";
import { sdk } from "@farcaster/miniapp-sdk";

// Create a loading component
function LoadingSpinner() {
  return (
    <div className="h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading results...</p>
      </div>
    </div>
  );
}

// Separate component that uses useSearchParams
function ResultContent() {
  const { useSearchParams } = require("next/navigation");
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = searchParams.get("score");
  const correct = searchParams.get("correct");
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("");

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    // Initialize SDK and get user info
    const initializeUser = async () => {
      try {
        if (sdk.context) {
          const user = sdk.context.user;
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Error getting user info:", error);
      }
    };

    initializeUser();
    
    // Trigger animations on mount
    setShowConfetti(true);
    setTimeout(() => setAnimateScore(true), 500);
  }, []);

  const submitScore = async () => {
    if (!isConnected || !currentUser) {
      setSubmissionStatus("Please connect wallet and ensure you're logged in");
      return;
    }

    try {
      setSubmissionStatus("Submitting score...");
      
      await writeContract({
        address: leaderboardContract.address,
        abi: leaderboardContract.abi,
        functionName: 'submitScore',
        args: [
          currentUser.fid,
          currentUser.username || "Anonymous",
          BigInt(score || 0),
          BigInt(correct || 0)
        ],
      });
    } catch (error) {
      console.error("Error submitting score:", error);
      setSubmissionStatus("Error submitting score. Please try again.");
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setSubmissionStatus("Score submitted successfully!");
    } else if (isPending || isConfirming) {
      setSubmissionStatus("Transaction processing...");
    }
  }, [isConfirmed, isPending, isConfirming]);

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

  const performance = getPerformanceMessage(score, correct);

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

  return (
    <main className="h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center p-3 relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute animate-float opacity-20 text-lg ${showConfetti ? 'animate-bounce' : ''}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            {['🌟', '✨', '🎉', '🎊', '💫'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>

      <div className="relative z-10 text-center max-w-sm mx-auto w-full flex flex-col justify-center min-h-screen py-2">
        
        {/* Main Trophy Animation */}
        <div className={`text-3xl sm:text-4xl mb-2 transform transition-all duration-1000 ${
          showConfetti ? 'animate-bounce scale-100' : 'scale-0'
        }`}>
          {performance.emoji}
        </div>

        {/* Game Over Title */}
        <h1 className={`text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent transform transition-all duration-1000 ${
          showConfetti ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          Game Complete!
        </h1>

        {/* Performance Message */}
        <div className={`text-base sm:text-lg font-semibold mb-3 ${performance.color} transform transition-all duration-1000 delay-300 ${
          showConfetti ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          {performance.message}
        </div>

        {/* Score Display */}
        <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3 border border-white/20 shadow-2xl transform transition-all duration-1000 delay-500 ${
          animateScore ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}>
          <div className="text-xs mb-1 opacity-80">Your Final Score</div>
          <div className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent transform transition-all duration-500 ${
            animateScore ? 'scale-100' : 'scale-0'
          }`}>
            {score || 0}
          </div>
          <div className="text-xs opacity-60">points</div>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-3 gap-1.5 mb-3 transform transition-all duration-1000 delay-700 ${
          animateScore ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/20">
            <div className="text-sm mb-0.5">🎯</div>
            <div className="text-xs opacity-80">Questions</div>
            <div className="text-xs font-bold">15</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/20">
            <div className="text-sm mb-0.5">⭐</div>
            <div className="text-xs opacity-80">Accuracy</div>
            <div className="text-xs font-bold">{Math.round(((parseInt(correct) || 0) / 15) * 100)}%</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/20">
            <div className="text-sm mb-0.5">🏆</div>
            <div className="text-xs opacity-80">Rank</div>
            <div className="text-xs font-bold">
              {getRank(score, correct)}
            </div>
          </div>
        </div>

        {/* Leaderboard Submit Button */}
        {currentUser && (
          <div className={`mb-3 transform transition-all duration-1000 delay-800 ${
            animateScore ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <button
              onClick={submitScore}
              disabled={isPending || isConfirming}
              className="group bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transform hover:scale-[1.02] active:scale-95 transition-transform duration-75 shadow-lg hover:shadow-xl w-full touch-manipulation"
            >
              <span className="mr-2">🏆</span>
              {isPending || isConfirming ? "Submitting..." : "Submit to Leaderboard"}
            </button>
            {submissionStatus && (
              <p className="text-xs mt-1 opacity-80">{submissionStatus}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className={`space-y-1.5 transform transition-all duration-1000 delay-1000 ${
          animateScore ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <button
            onClick={() => router.push("/game")}
            className="group bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transform hover:scale-[1.02] active:scale-95 transition-transform duration-75 shadow-lg hover:shadow-xl w-full touch-manipulation"
          >
            <span className="mr-2">🎮</span>
            Play Again
            <span className="ml-2">↻</span>
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="group bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-2.5 rounded-lg text-sm font-bold transform hover:scale-[1.02] active:scale-95 transition-transform duration-75 border border-white/30 hover:border-white/50 w-full touch-manipulation"
          >
            <span className="mr-2">🏠</span>
            Home
            <span className="ml-2">→</span>
          </button>
        </div>

        {/* Share Score */}
        <div className={`mt-2 opacity-60 transform transition-all duration-1000 delay-1200 ${
          animateScore ? 'translate-y-0 opacity-60' : 'translate-y-10 opacity-0'
        }`}>
          <p className="text-xs">Challenge yourself again!</p>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(180deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}

// Main component with Suspense wrapper
export default function ResultPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResultContent />
    </Suspense>
  );
}
