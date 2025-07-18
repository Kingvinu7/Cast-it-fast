"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function ResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = searchParams.get("score");

  return (
    <main className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">Game Over 🎉</h1>
      <p className="text-lg mb-6">You scored: {score} / 3</p>
      <button
        onClick={() => router.push("/game")}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Play Again
      </button>
    </main>
  );
}