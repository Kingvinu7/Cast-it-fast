"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
    const storedUsedQuestions = localStorage.getItem("cast-it-fast-used-questions");
    const usedQuestions = storedUsedQuestions ? JSON.parse(storedUsedQuestions) : [];
    const availableQuestions = allQuestions.filter((q) => !usedQuestions.includes(q.question));

    let nextSet;
    if (availableQuestions.length < QUESTIONS_PER_ROUND) {
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      nextSet = shuffled.slice(0, QUESTIONS_PER_ROUND);
    } else {
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      nextSet = shuffled.slice(0, QUESTIONS_PER_ROUND);
    }

    const updatedUsedQuestions = [...usedQuestions, ...nextSet.map((q) => q.question)];
    localStorage.setItem("cast-it-fast-used-questions", JSON.stringify(updatedUsedQuestions));

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
          router.push(`/result?score=${score}&correct=${totalCorrect}`);
        }
      }
    }, 100);
  }

  const current = roundQuestions[questionIndex] || {};
  const correctAnswerText = current.options ? current.options[current.answer] : '';
  const progress = ((questionIndex) / QUESTIONS_PER_ROUND) * 100;

  if (showRoundTransition) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-indigo-600 text-white p-4">
        <div className="text-center animate-pulse">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-lg font-bold mb-1">Round {currentRound - 1} Complete!</h1>
          <p className="text-sm mb-2">Correct: {correctInRound}/{QUESTIONS_PER_ROUND}</p>
          {correctInRound === QUESTIONS_PER_ROUND && (
            <div className="text-yellow-300 text-base font-bold animate-bounce">Perfect! +20 ⭐</div>
          )}
          <p className="mt-2 text-sm">Starting Round {currentRound}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-indigo-600 text-white p-3 overflow-hidden flex flex-col">

      {/* Streak Popup */}
      {showStreakBonus && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-md z-50">
          🔥 {showStreakBonus}
        </div>
      )}

      {/* Stats Header */}
      <div className="flex justify-between items-center text-xs mb-2">
        <div className="bg-black/20 px-3 py-1 rounded">Score: <span className="font-bold">{score}</span></div>
        <div className="bg-black/20 px-3 py-1 rounded">Streak: <span className="font-bold">{streak}🔥</span></div>
      </div>

      {/* Main Game Card */}
      {current.question && (
        <div className={`bg-white text-black p-3 rounded-lg shadow-lg flex-1 w-full flex flex-col transition-all duration-200 overflow-hidden ${
          questionAnimation === "enter" ? "animate-slide-up" : 
          questionAnimation === "exit" ? "animate-slide-down opacity-0" : ""
        }`}>
          <div className="mb-2">
            <div className="flex justify-between text-[10px] mb-1">
              <span>Round {currentRound}/{TOTAL_ROUNDS}</span>
              <span>Q{questionIndex + 1}/{QUESTIONS_PER_ROUND}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className="text-center mb-2">
            <div className={`inline-block w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              timeLeft <= 3 ? 'border-red-500 text-red-500 animate-pulse' :
              timeLeft <= 5 ? 'border-yellow-500 text-yellow-500' :
              'border-green-500 text-green-500'
            }`}>
              {timeLeft}
            </div>
          </div>

          {/* Question Text */}
          <h2 className="text-sm font-bold text-center mb-2 leading-tight">{current.question}</h2>

          {/* Options */}
          <div className="grid gap-2 flex-1">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className={`text-xs font-medium p-2 rounded-lg transition-all duration-100 flex items-center w-full disabled:opacity-60 ${
                  selectedOption === opt
                    ? opt === correctAnswerText
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-red-500 text-white animate-shake"
                    : selectedOption === null
                      ? "bg-gray-100 border border-gray-300 hover:bg-purple-100 active:bg-pink-100"
                      : opt === correctAnswerText
                        ? "bg-green-100 border border-green-300"
                        : "bg-gray-100 border border-gray-200"
                }`}
                disabled={selectedOption !== null}
              >
                <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px] mr-2 font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-left">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-slide-down { animation: slide-down 0.2s ease-in; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}
