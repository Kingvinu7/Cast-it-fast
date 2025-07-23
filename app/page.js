"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark that we're on the client side
    setIsClient(true);
    
    // Generate random positions on client side to avoid hydration mismatch
    const emojis = [...Array(15)].map((_, i) => ({
      id: i,
      emoji: ['✨', '🎯', '🧠', '🎉', '⭐'][Math.floor(Math.random() * 5)],
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 2,
      animationDuration: 3 + Math.random() * 2,
    }));
    setFloatingEmojis(emojis);
  }, []);

  return (
    <main className="h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* History Button - Top Right */}
      <button
        onClick={() => router.push("/history")}
        className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-bold text-white hover:bg-white/20 transform hover:scale-[1.02] active:scale-95 transition-transform duration-75 z-50 touch-manipulation"
      >
        📜 History
      </button>

      {/* Floating background emojis */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {isClient && floatingEmojis.map((item) => (
          <div
            key={item.id}
            className="absolute animate-float opacity-20"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              animationDelay: `${item.animationDelay}s`,
              animationDuration: `${item.animationDuration}s`,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="z-10 text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent animate-fade-in">
          🎮 Cast-it-Fast
        </h1>

        <p className="text-sm text-white/70 mb-6">
          Fast-paced trivia. 3 rounds. 15 questions. Can you beat the game?
        </p>

        <button
          onClick={() => router.push("/game")}
          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl text-lg font-bold transform hover:scale-[1.02] active:scale-95 transition-transform duration-75 shadow-lg hover:shadow-xl w-full touch-manipulation"
        >
          ▶️ Play Now
        </button>
      </div>

      {/* Credits */}
      <div className="absolute bottom-4 text-xs text-white/60 z-10 text-center">
        Made by{" "}
        <a
          href="https://farcaster.xyz/vinu07"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          vinu07
        </a>
      </div>

      {/* Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
