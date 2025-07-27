"use client";
export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import leaderboardContract from "@/lib/leaderboardContract";
import { sdk } from "@farcaster/miniapp-sdk";

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

// Wagmi hooks
const { address, isConnected } = useAccount();
const { connect, connectors } = useConnect();
const { writeContract, data: hash, isPending, error } = useWriteContract();
const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
hash,
});

// Auto-connect wallet when component loads
useEffect(() => {
if (!isConnected && connectors.length > 0) {
connect({ connector: connectors[0] });
}
}, [isConnected, connectors, connect]);

// Handle transaction confirmation
useEffect(() => {
if (isConfirmed) {
setSubmissionStatus("🎉 Score successfully submitted to leaderboard!");
} else if (error) {
setSubmissionStatus("❌ Failed to submit score. Please try again.");
console.error("Transaction error:", error);
}
}, [isConfirmed, error]);

// Submit to leaderboard using Wagmi
const submitToLeaderboard = async () => {
if (!isConnected || !score || !currentUser?.displayName) {
setSubmissionStatus("❌ Please ensure wallet is connected and user data is available");
return;
}

try {
setSubmissionStatus("📝 Submitting to leaderboard...");
const displayName = currentUser?.displayName?.toString?.() ?? "";

writeContract({
address: leaderboardContract.address,
abi: leaderboardContract.abi,
functionName: 'submitScore',
args: [displayName, parseInt(score)],
});
} catch (err) {
console.error("Submission failed:", err);
if (err?.message) {
setSubmissionStatus(`❌ ${err.message}`);
} else {
setSubmissionStatus("❌ Failed to submit score. Please try again.");
}
}

};

useEffect(() => {
// Initialize SDK and get user context
const initializeUser = async () => {
try {
await sdk.actions.ready();
const context = sdk.context;

if (context?.user) {
console.log("🧠 Farcaster User Context:", context.user);

let displayName;
try {
displayName = await context.user.displayName();
} catch {
displayName = context.user.displayName;
}

setCurrentUser({
fid: context.user.fid,
username: context.user.username,
displayName,
pfpUrl: context.user.pfpUrl,
});
}
} catch (error) {
console.error("Farcaster SDK initialization failed:", error);
}
};

initializeUser();

}, []);

useEffect(() => {
// Trigger animations on mount
setShowConfetti(true);
setTimeout(() => setAnimateScore(true), 500);

// Save game history - same logic as before
if (!score || !correct) return;

const numScore = parseInt(score) || 0;
const numCorrect = parseInt(correct) || 0;
const totalQuestions = 15;
const accuracy = Math.round((numCorrect / totalQuestions) * 100);

if (numScore === 0 && numCorrect === 0) return;

const gameResult = {
score: numScore,
correct: numCorrect,
accuracy: accuracy,
date: new Date().toISOString()
};

const existingHistory = JSON.parse(localStorage.getItem("playHistory") || "[]");

const now = new Date(gameResult.date).getTime();
const isDuplicate = existingHistory.some(entry =>
entry.score === gameResult.score &&
entry.correct === gameResult.correct &&
entry.accuracy === gameResult.accuracy &&
Math.abs(new Date(entry.date).getTime() - now) < 5000
);

if (isDuplicate) {
console.log("Duplicate game entry detected, skipping save");
return;
}

const updatedHistory = [gameResult, ...existingHistory];
const limitedHistory = updatedHistory.slice(0, 10);

localStorage.setItem("playHistory", JSON.stringify(limitedHistory));
console.log("Game result saved to history:", gameResult);

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

const shareTofarcaster = () => {
const numScore = parseInt(score) || 0;
const numCorrect = parseInt(correct) || 0;

const shareText = I scored ${numScore} and answered ${numCorrect} questions on Cast It Fast trivia game on Farcaster, can you beat me?;

const encodedText = encodeURIComponent(shareText);
const miniappUrl = encodeURIComponent("https://farcaster.xyz/miniapps/Y6Z-3Zz-bf_T/cast-it-fast");

const farcasterUrl = https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${miniappUrl};

window.open(farcasterUrl, '_blank', 'noopener,noreferrer');

};

// Get button text and status for leaderboard submission
const getLeaderboardButtonText = () => {
if (!isConnected) return "🔌 Connect Wallet First";
if (isPending) return "📝 Preparing Transaction...";
if (isConfirming) return "⏳ Confirming Transaction...";
if (isConfirmed) return "✅ Score Submitted!";
return "📝 Submit Score to Leaderboard";
};

const isLeaderboardButtonDisabled = () => {
return !isConnected || !currentUser || !score || isPending || isConfirming || isConfirmed;
};

return (

<main className="h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center p-3 relative overflow-hidden">  {/* Animated Background Elements */}

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
  </div>      <div className="relative z-10 text-center max-w-sm mx-auto w-full flex flex-col justify-center min-h-screen py-2">    {/* Main Trophy Animation */}    
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

{/* Wallet Connection Status */}    
{!isConnected && (    
  <div className="mb-3 text-sm text-yellow-400 bg-yellow-400/10 rounded-lg p-2 border border-yellow-400/20">    
    🔌 Wallet connecting... Please wait    
  </div>    
)}    

{isConnected && address && (    
  <div className="mb-3 text-xs text-green-400 bg-green-400/10 rounded-lg p-2 border border-green-400/20">    
    ✅ Wallet Connected: {address.slice(0, 6)}...{address.slice(-4)}    
  </div>    
)}    

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
      
  {/* Farcaster Share Button */}    
  <button    
    onClick={shareTofarcaster}    
    className="group bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transform hover:scale-[1.02] active:scale-95 transition-transform duration-75 shadow-lg hover:shadow-xl w-full touch-manipulation"    
  >    
    <span className="mr-2">🚀</span>    
    Share Your Score    
    <span className="ml-2">📢</span>    
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

{/* Leaderboard Submit Button with Enhanced Status */}    
{currentUser && score && (    
  <button    
    onClick={submitToLeaderboard}    
    disabled={isLeaderboardButtonDisabled()}    
    className={`group px-5 py-2.5 rounded-lg text-sm font-bold transform hover:scale-[1.02] active:scale-95 transition-transform duration-75 shadow-lg hover:shadow-xl w-full mt-2 ${    
      isLeaderboardButtonDisabled()     
        ? 'bg-gray-600 cursor-not-allowed opacity-60'     
        : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'    
    }`}    
  >    
    {getLeaderboardButtonText()}    
  </button>    
)}    

{/* Enhanced Submission Status Message */}    
{submissionStatus && (    
  <div className={`mt-3 text-sm font-medium rounded-lg p-2 ${    
    submissionStatus.includes('🎉') ? 'text-green-400 bg-green-400/10 border border-green-400/20' :    
    submissionStatus.includes('❌') ? 'text-red-400 bg-red-400/10 border border-red-400/20' :    
    'text-blue-400 bg-blue-400/10 border border-blue-400/20'    
  }`}>    
    {submissionStatus}    
  </div>    
)}    

{/* Transaction Hash Display */}    
{hash && (    
  <div className="mt-2 text-xs text-gray-400 break-all">    
    Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}    
  </div>    
)}    

{/* Share Score - Ultra Compact */}    
<div className={`mt-2 opacity-60 transform transition-all duration-1000 delay-1200 ${    
  animateScore ? 'translate-y-0 opacity-60' : 'translate-y-10 opacity-0'    
}`}>    
  <p className="text-xs">Challenge your friends on Farcaster!</p>    
</div>

  </div>    {/* Custom Animations */}

  <style jsx>{`    
    @keyframes float {    
      0%, 100% { transform: translateY(0px) rotate(0deg); }    
      50% { transform: translateY(-15px) rotate(180deg); }    
    }    
    .animate-float {    
      animation: float 6s ease-in-out infinite;    
    }    
  `}</style>    </main>  );
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
}  // Main export component with Suspense wrapper
export default function ResultPage() {
return (
<Suspense fallback={<ResultPageLoading />}>
<ResultContent />
</Suspense>
);
}
