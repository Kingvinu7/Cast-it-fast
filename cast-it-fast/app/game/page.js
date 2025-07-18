"use client";

import { useState, useEffect } from "react";

const questions = [
  {
    question: "What’s the capital of France?",
    options: ["Paris", "Madrid", "Berlin", "Rome"],
    answer: "Paris",
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Van Gogh", "Da Vinci", "Picasso", "Michelangelo"],
    answer: "Da Vinci",
  },
  {
    question: "Which planet is closest to the sun?",
    options: ["Earth", "Venus", "Mercury", "Mars"],
    answer: "Mercury",
  },
];

export default function GamePage() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (timeLeft === 0) handleNext();
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelect = (option) => {
    setSelected(option);
    if (option === questions[current].answer) setScore(score + 1);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
      setTimeLeft(10);
    } else {
      window.location.href = "/result?score=" + score;
    }
  };

  const q = questions[current];

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">
        Question {current + 1} of {questions.length}
      </h2>
      <p className="mb-4">{q.question}</p>
      <div className="grid gap-2">
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={!!selected}
            className={`p-2 rounded border ${
              selected === opt
                ? opt === q.answer
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
                : "bg-white"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-gray-500">Time left: {timeLeft}s</span>
        {selected && (
          <button onClick={handleNext} className="text-blue-600 underline">
            Next
          </button>
        )}
      </div>
    </main>
  );
}