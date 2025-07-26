"use client";
export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import leaderboardContract from "@/lib/leaderboardContract";
import { sdk } from "@farcaster/miniapp-sdk";

// Simple and safe Farcaster detection
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};

// Separate component that uses useSearchParams
function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = searchParams.get("score");
  const correct = searchParams.get("correct");
  
  // Basic state
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [isMobileFarcaster, setIsMobileFarcaster] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  // Wagmi hooks - only use if not mobile
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Simple environment detection
  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobileFarcaster(mobile);
    setDebugInfo(`Environment: ${mobile ? 'Mobile' : 'Desktop'}`);
  }, []);

  // Initialize Farcaster user
  useEffect(() => {
    const initUser = async () => {
      try {
        await sdk.actions.ready();
        const context = sdk.context;
        
        if (context?.user) {
          let displayName = "UnknownUser";
          
          try {
            if (context.user.displayName) {
              if (typeof context.user.displayName === 'function') {
                displayName = await context.user.displayName();
              } else {
                displayName = String(context.user.displayName);
              }
            } else if (context.user.username) {
              displayName = context.user.username;
            } else {
              displayName = `User_${context.user.fid}`;
            }
          } catch (e) {
            displayName = `User_${context.user.fid}`;
          }

          setCurrentUser({
            fid: context.user.fid,
            username: context.user.username || "",
            displayName: displayName,
            pfpUrl: context.user.pfpUrl || "",
          });
          
          setDebugInfo(prev => prev + ` | User: ${displayName}`);
        }
      } catch (error) {
        console.error("SDK init failed:", error);
      }
    };

    initUser();
  }, []);

  // Handle wagmi connection for desktop only
  useEffect(() => {
    if (isMobileFarcaster) return;
    
    if (!isConnected && connectors.length > 0) {
      const timer = setTimeout(() => {
        try {
          connect({ connector: connectors[0] });
        } catch (error) {
          console.error("Wagmi connection failed:", error);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, connectors, connect, isMobileFarcaster]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setSubmissionStatus("🎉 Score successfully submitted to leaderboard!");
    } else if (error) {
      setSubmissionStatus("❌ Failed to submit score. Please try again.");
    }
  }, [isConfirmed, error]);

  // Mobile submission function
  const submitToLeaderboardMobile = async () => {
    if (!score) {
      setSubmissionStatus("❌ No score available");
      return;
    }

    try {
      setSubmissionStatus("📱 Submitting to blockchain...");
      
      // Use fallback name if currentUser not available
      const userName = currentUser?.displayName || currentUser?.username || `User_${currentUser?.fid || 'guest'}`;
      
      const payload = {
        displayName: userName,
        score: parseInt(score),
        fid: currentUser?.fid || 0,
        platform: 'mobile'
      };

      const response = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setSubmissionStatus("🎉 Score submitted to blockchain!");
        
        if (result.transactionHash) {
          setTimeout(() => {
            setSubmissionStatus(`✅ Confirmed! Tx: ${result.transactionHash.slice(0,10)}...`);
          }, 2000);
        }
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
      
    } catch (err) {
      console.error("Mobile submission failed:", err);
      setSubmissionStatus("❌ Submission failed - saved locally");
      
      // Simple local backup
      try {
        localStorage.setItem("lastScore", JSON.stringify({
          score: parseInt(score),
          user: currentUser?.displayName || `User_${currentUser?.fid || 'guest'}`,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error("Local save failed:", e);
      }
    }
  };

  // Desktop submission function
  const submitToLeaderboardWeb = async () => {
    if (!score || !currentUser?.displayName) {
      setSubmissionStatus("❌ Please ensure user data is available");
      return;
    }

    if (!isConnected) {
      setSubmissionStatus("🔌 Connecting wallet...");
      try {
        if (connectors.length === 0) {
          throw new Error("No connectors available");
        }
        await connect({ connector: connectors[0] });
        setSubmissionStatus("✅ Wallet connected! Submitting score...");
      } catch (err) {
        setSubmissionStatus(`❌ Wallet connection failed: ${err.message}`);
        return;
      }
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
      setSubmissionStatus(`❌ ${err.message || "Failed to submit score"}`);
    }
  };

  // Unified submit function
  const submitToLeaderboard = () => {
    if (isMobileFarcaster) {
      submitToLeaderboardMobile();
    } else {
      submitToLeaderboardWeb();
    }
  };

  // Animation effects
  useEffect(() => {
    setShowConfetti(true);
    setTimeout(() => setAnimateScore(true), 500);

    // Save game history
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

    try {
      const existingHistory = JSON.parse(localStorage.getItem("playHistory") || "[]");  
      const updatedHistory = [gameResult, ...existingHistory].slice(0, 10);  
      localStorage.setItem("playHistory", JSON.stringify(updatedHistory));  
    } catch (e) {
      console.error("History save failed:", e);
    }
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

    const shareText = `I scored ${numScore} and answered ${numCorrect} questions on Cast It Fast trivia game on Farcaster, can you beat me?`;  
    const encodedText = encodeURIComponent(shareText);  
    const miniappUrl = encodeURIComponent("https://farcaster.xyz/miniapps/Y6Z-3Zz-bf_T/cast-it-fast");  
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${miniappUrl}`;  
    window.open(farcasterUrl, '_blank', 'noopener,noreferrer');
  };

  const getLeaderboardButtonText = () => {
    if (isMobileFarcaster) {
      return "📱 Submit Score (Mobile)";
    }
    
    if (!isConnected) return "🔌 Connect Wallet First";
    if (isPending) return "📝 Preparing Transaction...";
    if (isConfirming) return "⏳ Confirming Transaction...";
    if (isConfirmed) return "✅ Score Submitted!";
    return "📝 Submit Score to Leaderboard";
  };

  const isLeaderboardButtonDisabled = () => {
    if (isMobileFarcaster) {
      return !score || submissionStatus.includes("🎉");
    }
    return !isConnected || !score || isPending || isConfirming || isConfirmed;
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
          
        {/* Simple Debug Info */}
        {debugInfo && (
          <div className="mb-2 text-xs bg-black/50 backdrop-blur-sm rounded-lg p-2 border border-white/20 text-left">
            <div className="font-bold text-yellow-400 mb-1">🔧 Info:</div>
            <div className="text-xs">{debugInfo}</div>
            <div className="text-xs mt-1">Score: {score || 'None'} | User: {currentUser ? 'Yes' : 'No'}</div>
            <button 
              onClick={() => setIsMobileFarcaster(!isMobileFarcaster)}
              className="mt-1 px-2 py-0.5 bg-yellow-600 text-black text-xs rounded w-full"
            >
              Toggle: {isMobileFarcaster ? 'Force Web' : 'Force Mobile'}
            </button>
          </div>
        )}

        {/* Environment Indicator */}
        <div className="mb-2 text-xs opacity-60">
          {isMobileFarcaster ? "📱 Farcaster Mobile" : "🌐 Web Version"}
        </div>

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

        {/* Wallet Connection Status */}  
        {!isMobileFarcaster && !isConnected && (  
          <div className="mb-3 text-sm text-yellow-400 bg-yellow-400/10 rounded-lg p-2 border border-yellow-400/20">  
            🔌 Wallet connecting... Please wait  
          </div>  
        )}  

        {!isMobileFarcaster && isConnected && address && (  
          <div className="mb-3 text-xs text-green-400 bg-green-400/10 rounded-lg p-2 border border-green-400/20">  
            ✅ Wallet Connected: {address.slice(0, 6)}...{address.slice(-4)}  
          </div>  
        )}  

        {/* Mobile Wallet Status */}
        {isMobileFarcaster && (
          <div className="mb-3 text-xs text-blue-400 bg-blue-400/10 rounded-lg p-2 border border-blue-400/20">
            📱 Using Mobile Submission
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

        {/* Leaderboard Submit Button - Always show if we have a score */}  
        {score && (  
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

        {/* Submission Status */}  
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
        {!isMobileFarcaster && hash && (  
          <div className="mt-2 text-xs text-gray-400 break-all">  
            Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}  
          </div>  
        )}  

        {/* Share Message */}  
        <div className={`mt-2 opacity-60 transform transition-all duration-1000 delay-1200 ${  
          animateScore ? 'translate-y-0 opacity-60' : 'translate-y-10 opacity-0'  
        }`}>  
          <p className="text-xs">Challenge your friends on Farcaster!</p>  
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
