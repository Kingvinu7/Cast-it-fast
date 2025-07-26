"use client";
export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import leaderboardContract from "@/lib/leaderboardContract";
import { sdk } from "@farcaster/miniapp-sdk";

// Simple and reliable Farcaster detection
const detectFarcasterEnvironment = () => {
  const debug = { ...debugInfo };
  
  try {
    debug.userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Server';
    debug.hasSDK = typeof sdk !== 'undefined';
    
    // Check user agent first - most reliable for mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(debug.userAgent);
    const hasFarcaster = debug.userAgent.includes('Farcaster') || debug.userAgent.includes('Warpcast');
    
    // If mobile OR has user context from previous checks, treat as Farcaster
    const hasPreviousUserContext = currentUser !== null;
    
    if (isMobile || hasFarcaster || hasPreviousUserContext) {
      debug.environmentDetected = `Farcaster Mobile detected - Mobile: ${isMobile}, HasFC: ${hasFarcaster}, HasUser: ${hasPreviousUserContext}`;
      setDebugInfo(debug);
      return true;
    }
    
    debug.environmentDetected = 'Desktop Web detected';
    setDebugInfo(debug);
    return false;
  } catch (error) {
    debug.errors.push(`Detection Error: ${error.message}`);
    debug.environmentDetected = 'Error in detection, assuming mobile for safety';
    setDebugInfo(debug);
    return true; // Assume mobile to be safe
  }
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
  const [isMobileFarcaster, setIsMobileFarcaster] = useState(false);
  const [farcasterWallet, setFarcasterWallet] = useState(null);
  
  const [debugInfo, setDebugInfo] = useState({
    userAgent: '',
    hasSDK: false,
    hasContext: false,
    hasUser: false,
    hasClient: false,
    clientInfo: '',
    environmentDetected: '',
    wagmiSkipped: false,
    errors: [],
    apiLogs: [] // Add API debugging logs
  });

  // Wagmi hooks (only used for web)
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Detect environment on mount
  useEffect(() => {
    // Simple detection that runs after user context is potentially available
    const timer = setTimeout(() => {
      const isFarcasterClient = detectFarcasterEnvironment();
      setIsMobileFarcaster(isFarcasterClient);
    }, 500); // Small delay to let user context load
    
    return () => clearTimeout(timer);
  }, [currentUser]); // Re-run when currentUser changes

  // Initialize Farcaster wallet for mobile
  useEffect(() => {
    const initializeFarcasterWallet = async () => {
      if (!isMobileFarcaster) return;
      
      try {
        await sdk.actions.ready();
        
        // Check if wallet is available in the SDK context
        if (sdk.context?.wallet) {
          setFarcasterWallet(sdk.context.wallet);
          console.log("Farcaster wallet initialized:", sdk.context.wallet);
        } else {
          console.log("Farcaster wallet not available in SDK context");
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster wallet:", error);
      }
    };

    initializeFarcasterWallet();
  }, [isMobileFarcaster]);

  // Handle wagmi connection for web only
  useEffect(() => {
    const debug = { ...debugInfo };
    
    if (isMobileFarcaster) {
      debug.wagmiSkipped = true;
      debug.environmentDetected += " - Wagmi SKIPPED";
      setDebugInfo(debug);
      return; // Skip wagmi for Farcaster clients
    }
    
    // Auto-connect for web users
    if (!isConnected && connectors.length > 0) {
      debug.wagmiSkipped = false;
      debug.environmentDetected += " - Wagmi CONNECTING";
      setDebugInfo(debug);
      
      const timer = setTimeout(() => {
        try {
          connect({ connector: connectors[0] });
        } catch (error) {
          const newDebug = { ...debugInfo };
          newDebug.errors.push(`Wagmi Error: ${error.message}`);
          setDebugInfo(newDebug);
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
      console.error("Transaction error:", error);
    }
  }, [isConfirmed, error]);

  // Mobile-specific wallet transaction
  const submitToLeaderboardMobile = async () => {
    if (!score || !currentUser) {
      setSubmissionStatus("❌ Please ensure user data is available");
      return;
    }

    try {
      setSubmissionStatus("📱 Submitting to blockchain...");
      
      // Extract display name safely
      let safeName;
      try {
        safeName = currentUser.displayName || currentUser.username || `User_${currentUser.fid}`;
        // Ensure it's a string and clean it
        safeName = String(safeName).trim();
        if (!safeName) {
          safeName = `User_${currentUser.fid}`;
        }
      } catch (nameError) {
        console.error("Name extraction error:", nameError);
        safeName = `User_${currentUser.fid}`;
      }
      
      const payload = {
        displayName: safeName,
        score: parseInt(score),
        fid: currentUser.fid,
        platform: 'mobile'
      };
      
      // Log the request for debugging
      console.log("Making API request:", payload);
      
      // Add to debug logs for mobile viewing
      const newDebug = { ...debugInfo };
      newDebug.apiLogs.push(`Sending: ${safeName}, Score: ${score}`);
      setDebugInfo(newDebug);
      
      const response = await fetch('/api/submit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log("API Response status:", response.status);
      console.log("API Response ok:", response.ok);
      
      // Add response to debug logs
      const responseDebug = { ...debugInfo };
      responseDebug.apiLogs.push(`Response: ${response.status} ${response.ok ? 'OK' : 'ERROR'}`);
      setDebugInfo(responseDebug);

      if (response.ok) {
        const result = await response.json();
        console.log("API Success result:", result);
        setSubmissionStatus("🎉 Score submitted to blockchain!");
        
        // Show transaction details
        if (result.transactionHash) {
          setTimeout(() => {
            setSubmissionStatus(`✅ Blockchain confirmed! Tx: ${result.transactionHash.slice(0,10)}...`);
          }, 2000);
        }
      } else {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
    } catch (err) {
      console.error("Full error details:", err);
      
      // Show specific error types
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setSubmissionStatus("🌐 Network connection failed - check internet");
      } else if (err.message.includes('API Error 500')) {
        setSubmissionStatus("⚠️ Blockchain error - server issue");
      } else if (err.message.includes('API Error 400')) {
        setSubmissionStatus("❌ Invalid data - please try again");
      } else if (err.message.includes('primitive value')) {
        setSubmissionStatus("❌ Data format error - trying backup...");
      } else {
        setSubmissionStatus(`❌ Failed: ${err.message.slice(0, 30)}...`);
      }
      
      // Still save locally as backup, but make it clear this is a fallback
      try {
        const leaderboardData = {
          displayName: `User_${currentUser.fid}`, // Use safe fallback name
          score: parseInt(score),
          fid: currentUser.fid,
          timestamp: new Date().toISOString(),
          platform: 'mobile',
          error: err.message,
          originalStatus: submissionStatus
        };
        
        const existingLeaderboard = JSON.parse(localStorage.getItem("pendingLeaderboardEntries") || "[]");
        existingLeaderboard.push(leaderboardData);
        localStorage.setItem("pendingLeaderboardEntries", JSON.stringify(existingLeaderboard));
        
        console.log("Backup saved to localStorage:", leaderboardData);
        
        // Update status to show it's backed up
        setTimeout(() => {
          setSubmissionStatus(submissionStatus + " (saved as backup)");
        }, 3000);
        
      } catch (localError) {
        console.error("Backup save failed:", localError);
      }
    }
  };

  // Web-specific wallet transaction (existing logic)
  const submitToLeaderboardWeb = async () => {
    if (!score || !currentUser?.displayName) {
      setSubmissionStatus("❌ Please ensure user data is available");
      return;
    }

    // Manual connect if not already connected
    if (!isConnected) {
      setSubmissionStatus("🔌 Connecting wallet...");
      try {
        if (connectors.length === 0) {
          throw new Error("No connectors available");
        }
        await connect({ connector: connectors[0] });
        setSubmissionStatus("✅ Wallet connected! Submitting score...");
      } catch (err) {
        console.error("Wallet connection failed:", err);
        setSubmissionStatus(`❌ Wallet connection failed: ${err.message}`);
        return;
      }
    }

    // Proceed with submission
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

  // Unified submit function that routes to appropriate method
  const submitToLeaderboard = async () => {
    if (isMobileFarcaster) {
      await submitToLeaderboardMobile();
    } else {
      await submitToLeaderboardWeb();
    }
  };

  // Initialize user context with better error handling
  useEffect(() => {
    const initializeUser = async () => {
      const debug = { ...debugInfo };
      
      try {
        debug.errors.push("Initializing SDK...");
        await sdk.actions.ready();
        const context = sdk.context;
        
        debug.hasContext = !!context;
        debug.hasUser = !!context?.user;
        debug.hasClient = !!context?.client;
        debug.clientInfo = context?.client || 'No client';

        if (context?.user) {
          debug.errors.push("User context found!");

          let displayName;
          try {
            // Handle different possible formats of displayName
            if (typeof context.user.displayName === 'function') {
              displayName = await context.user.displayName();
            } else if (context.user.displayName) {
              displayName = String(context.user.displayName);
            } else {
              displayName = context.user.username || `User_${context.user.fid}`;
            }
            
            // Ensure it's always a string
            displayName = String(displayName || context.user.username || `User_${context.user.fid}`);
            
          } catch (nameError) {
            console.log("DisplayName error:", nameError);
            displayName = context.user.username || `User_${context.user.fid}`;
          }

          setCurrentUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: displayName, // Now guaranteed to be a string
            pfpUrl: context.user.pfpUrl,
          });
          
          debug.errors.push(`User set: ${displayName}`);
        } else {
          debug.errors.push("No user context available");
        }
        
        setDebugInfo(debug);
      } catch (error) {  
        debug.errors.push(`SDK Init Failed: ${error.message}`);
        setDebugInfo(debug);
      }  
    };  

    initializeUser();
  }, []);

  // Animation and game history effects (unchanged)
  useEffect(() => {
    setShowConfetti(true);
    setTimeout(() => setAnimateScore(true), 500);

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

    const shareText = `I scored ${numScore} and answered ${numCorrect} questions on Cast It Fast trivia game on Farcaster, can you beat me?`;  
      
    const encodedText = encodeURIComponent(shareText);  
    const miniappUrl = encodeURIComponent("https://farcaster.xyz/miniapps/Y6Z-3Zz-bf_T/cast-it-fast");  
      
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${miniappUrl}`;  
      
    window.open(farcasterUrl, '_blank', 'noopener,noreferrer');
  };

  // Get button text and status for leaderboard submission
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
      return !currentUser || !score || submissionStatus.includes("🎉");
    }
    return !isConnected || !currentUser || !score || isPending || isConfirming || isConfirmed;
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
          
        {/* Compact Debug Panel for mobile */}
        {(debugInfo.errors.length > 0 || debugInfo.environmentDetected || debugInfo.apiLogs.length > 0) && (
          <div className="mb-2 text-xs bg-black/50 backdrop-blur-sm rounded-lg p-2 border border-white/20 text-left">
            <div className="font-bold text-yellow-400 mb-1">🔧 Debug:</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Wagmi: {debugInfo.wagmiSkipped ? '✅ Skip' : '❌ Run'}</div>
              <div>Env: {isMobileFarcaster ? '📱 Mobile' : '🌐 Web'}</div>
            </div>
            {/* Show API logs if any */}
            {debugInfo.apiLogs.length > 0 && (
              <div className="mt-1 text-xs opacity-80">
                <div className="font-bold text-blue-400">API:</div>
                {debugInfo.apiLogs.slice(-2).map((log, i) => (
                  <div key={i} className="text-xs">{log}</div>
                ))}
              </div>
            )}
            {/* Compact Manual Override Button */}
            <button 
              onClick={() => setIsMobileFarcaster(!isMobileFarcaster)}
              className="mt-1 px-2 py-0.5 bg-yellow-600 text-black text-xs rounded w-full"
            >
              Toggle Mode
            </button>
          </div>
        )}

        {/* Environment Indicator */}
        <div className="mb-2 text-xs opacity-60">
          {isMobileFarcaster ? "📱 Farcaster Client" : "🌐 Web Version"}
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

        {/* Wallet Connection Status - Web Only */}  
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
            📱 Using Farcaster Client Wallet
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

        {/* Transaction Hash Display - Web Only */}  
        {!isMobileFarcaster && hash && (  
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
