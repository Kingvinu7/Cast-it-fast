"use client";
export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// Separate component that uses useSearchParams
function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = searchParams.get("score");
  const correct = searchParams.get("correct");
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);

  useEffect(() => {
    // Trigger animations on mount
    setShowConfetti(true);
    setTimeout(() => setAnimateScore(true), 500);

    // Save game history to localStorage only if we have valid data
    if (!score || !correct) return;

    const numScore = parseInt(score) || 0;
    const numCorrect = parseInt(correct) || 0;
    const totalQuestions = 15;
    const accuracy = Math.round((numCorrect / totalQuestions) * 100);

    // Don't save if score is 0 and correct is 0 (likely invalid data)
    if (numScore === 0 && numCorrect === 0) return;

    const gameResult = {
      score: numScore,
      correct: numCorrect,
      accuracy: accuracy,
      date: new Date().toISOString()
    };

    // Get existing history
    const existingHistory = JSON.parse(localStorage.getItem("playHistory") || "[]");
    
    // Check if we already saved a game with the exact same data recently (within 5 seconds)
    const now = new Date(gameResult.date).getTime();
    const isDuplicate = existingHistory.some(entry => 
      entry.score === gameResult.score && 
      entry.correct === gameResult.correct &&
      entry.accuracy === gameResult.accuracy &&
      Math.abs(new Date(entry.date).getTime() - now) < 5000 // 5 second threshold
    );
    
    if (isDuplicate) {
      console.log("Duplicate game entry detected, skipping save");
      return; // Don't save duplicate
    }
    
    // Add new game result to the beginning of the array
    const updatedHistory = [gameResult, ...existingHistory];
    
    // Keep only the last 10 games to avoid too much storage
    const limitedHistory = updatedHistory.slice(0, 10);
    
    // Save back to localStorage
    localStorage.setItem("playHistory", JSON.stringify(limitedHistory));
    console.log("Game result saved to history:", gameResult);
  }, [score, correct]);

  const getPerformanceMessage = (score, correct) => {
    const numScore = parseInt(score) || 0;
    const numCorrect = parseInt(correct) || 0;
    const accuracy = Math.round((numCorrect / 15) * 100);
    
    // Dynamic performance based on score AND accuracy
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

        {/* Stats Cards - Ultra Compact */}
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

        {/* Action Buttons - Ultra Compact */}
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

        {/* Share Score - Ultra Compact */}
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

// Loading fallback component
function ResultPageLoading() {
  return (
    <main className="h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">🎮</div>
        <div className="text-lg">Loading your results...</div>
      </div>
    </main>
  );
}

// Main export component with Suspense wrapper
export default function ResultPage() {
  return (
    <Suspense fallback={<ResultPageLoading />}>
      <ResultContent />
    </Suspense>
  );
}
