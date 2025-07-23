"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import allQuestions from "@/lib/questions";

const QUESTIONS_PER_ROUND = 5;
const TOTAL_ROUNDS = 3;

export default function GamePage() {
  const router = useRouter();
  const [currentRound, setCurrentRound] = useState(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const [roundQuestions, setRoundQuestions] = useState([]);
  const [correctInRound, setCorrectInRound] = useState(0);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [questionAnimation, setQuestionAnimation] = useState("enter");
  const [showStreakBonus, setShowStreakBonus] = useState(null);

  useEffect(() => {
    // Load used questions from localStorage
    const storedUsedQuestions = localStorage.getItem('cast-it-fast-used-questions');
    const usedQuestions = storedUsedQuestions ? JSON.parse(storedUsedQuestions) : [];

    // Get questions that haven't been used yet
    const availableQuestions = allQuestions.filter(q => !usedQuestions.includes(q.question));

    let nextSet;
    // If we don't have enough available questions, show a message or loop back
    if (availableQuestions.length < QUESTIONS_PER_ROUND) {
      // You've used all questions! For demo, we'll reset, but in production you might want to add more questions
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      nextSet = shuffled.slice(0, QUESTIONS_PER_ROUND);
    } else {
      // Randomly select from available questions
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      nextSet = shuffled.slice(0, QUESTIONS_PER_ROUND);
    }

    // Save the newly selected questions as used
    const updatedUsedQuestions = [...usedQuestions, ...nextSet.map(q => q.question)];
    localStorage.setItem('cast-it-fast-used-questions', JSON.stringify(updatedUsedQuestions));
    
    setRoundQuestions(nextSet);
    setQuestionIndex(0);
    setCorrectInRound(0);
    setTimeLeft(10);
    setQuestionAnimation("enter");
  }, [currentRound]);

  useEffect(() => {
    if (timeLeft === 0) handleNext();
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  function handleAnswer(option) {
    if (selectedOption !== null) return;
    setSelectedOption(option);

    const current = roundQuestions[questionIndex];
    const correctAnswerText = current.options[current.answer];
    const isCorrect = option === correctAnswerText;

    if (isCorrect) {
      let bonus = 10;
      setCorrectInRound((c) => c + 1);
      setTotalCorrect((t) => t + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);

      // Cumulative streak bonus: 2x=+5, 3x=+10, 4x=+15, 5x=+20, etc.
      if (nextStreak >= 2) {
        const streakBonus = (nextStreak - 1) * 5;
        bonus += streakBonus;
        setShowStreakBonus(`${nextStreak}x Streak! +${streakBonus} bonus`);
        setTimeout(() => setShowStreakBonus(null), 2000);
      }

      setScore((s) => s + bonus);
    } else {
      setStreak(0);
    }

    setTimeout(() => handleNext(), 300);
  }

  function handleNext() {
    setQuestionAnimation("exit");

    setTimeout(() => {
      setSelectedOption(null);
      setTimeLeft(10);

      if (questionIndex + 1 < QUESTIONS_PER_ROUND) {
        setQuestionIndex((i) => i + 1);
        setQuestionAnimation("enter");
      } else {
        if (correctInRound === QUESTIONS_PER_ROUND) {
          setScore((s) => s + 20);
        }

        if (currentRound < TOTAL_ROUNDS) {
          setShowRoundTransition(true);
          setTimeout(() => {
            setCurrentRound((r) => r + 1);
            setShowRoundTransition(false);
          }, 1500);
        } else {
          // Navigate immediately to results when game ends
          router.push(`/result?score=${score}&correct=${totalCorrect}`);
        }
      }
    }, 100);
  }

  function handleReplay() {
    // Don't remove used questions - they should stay permanently used
    setCurrentRound(1);
    setQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setTotalCorrect(0);
    setSelectedOption(null);
    setTimeLeft(10);
    setShowRoundTransition(false);
    setQuestionAnimation("enter");
  }

  const current = roundQuestions[questionIndex] || {};
  const correctAnswerText = current.options ? current.options[current.answer] : '';
  const progress = ((questionIndex) / QUESTIONS_PER_ROUND) * 100;

  // Round Transition Screen
  if (showRoundTransition) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-indigo-600 text-white flex items-center justify-center p-2">
        <div className="text-center animate-pulse">
          <div className="text-2xl mb-2 animate-bounce">🎯</div>
          <h1 className="text-lg font-bold mb-1 animate-fade-in">Round {currentRound - 1} Complete!</h1>
          <div className="text-sm mb-1">
            Correct: {correctInRound}/{QUESTIONS_PER_ROUND}
          </div>
          {correctInRound === QUESTIONS_PER_ROUND && (
            <div className="text-base font-bold text-yellow-300 animate-bounce">
              Perfect! +20 Bonus! ⭐
            </div>
          )}
          <div className="mt-2 text-xs">
            Starting Round {currentRound}...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-indigo-600 text-white p-1 flex flex-col overflow-hidden">

      {/* Streak Bonus Popup */}
      {showStreakBonus && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-2 py-1 rounded-full font-bold text-xs animate-bounce z-50 shadow-lg">
          🔥 {showStreakBonus}
        </div>
      )}

      {/* Score and Stats Header - Ultra Compact */}
      <div className="flex justify-between items-center mb-1 px-1">
        <div className="bg-black/20 backdrop-blur-sm rounded-md px-2 py-1">
          <div className="text-xs opacity-80 leading-none">Score</div>
          <div className="text-sm font-bold leading-none">{score}</div>
        </div>
        <div className="bg-black/20 backdrop-blur-sm rounded-md px-2 py-1">
          <div className="text-xs opacity-80 leading-none">Streak</div>
          <div className="text-sm font-bold leading-none">{streak}🔥</div>
        </div>
      </div>

      {current.question ? (
        <div className={`bg-white/95 backdrop-blur-sm text-black p-2 rounded-lg shadow-2xl flex-1 flex flex-col transform transition-all duration-200 min-h-0 ${
          questionAnimation === "enter" ? "animate-slide-up" : 
          questionAnimation === "exit" ? "animate-slide-down opacity-0" : ""
        }`}>

          {/* Progress Bar - Ultra Compact */}
          <div className="mb-1">
            <div className="flex justify-between text-xs mb-1">
              <span>Round {currentRound}/{TOTAL_ROUNDS}</span>
              <span>Q{questionIndex + 1}/{QUESTIONS_PER_ROUND}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timer - Inline with progress */}
          <div className="text-center mb-1">
            <div className={`inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
              timeLeft <= 3 ? 'border-red-500 text-red-500 animate-pulse' : 
              timeLeft <= 5 ? 'border-yellow-500 text-yellow-500' : 
              'border-green-500 text-green-500'
            }`}>
              {timeLeft}
            </div>
          </div>

          {/* Question - Minimal margin */}
          <h2 className="text-sm font-bold mb-2 text-center leading-tight flex-shrink-0">{current.question}</h2>

          {/* Options - Minimal spacing and height */}
          <div className="grid gap-1 flex-1 min-h-0">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className={`p-1.5 rounded-md text-xs font-medium transition-all duration-75 transform hover:scale-102 active:scale-98 min-h-0 ${
                  selectedOption === opt
                    ? opt === correctAnswerText
                      ? "bg-green-500 text-white animate-pulse shadow-lg"
                      : "bg-red-500 text-white animate-shake shadow-lg"
                    : selectedOption === null
                      ? "bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-pink-50 active:from-purple-100 active:to-pink-100 border border-gray-200 hover:border-purple-300 active:border-purple-400 shadow-sm hover:shadow-md"
                      : opt === correctAnswerText
                        ? "bg-green-100 border border-green-300"
                        : "bg-gray-100 border border-gray-200 opacity-60"
                }`}
                disabled={selectedOption !== null}
              >
                <div className="flex items-center min-h-0">
                  <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center mr-1.5 text-xs font-bold flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-left leading-tight text-xs">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-slide-down { animation: slide-down 0.2s ease-in; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .hover\\:scale-102:hover { transform: scale(1.02); }
        .active\\:scale-95:active { transform: scale(0.95); }
        .active\\:scale-98:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
