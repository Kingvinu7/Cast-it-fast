import { NextResponse } from "next/server";
import allQuestions from "@/lib/questions";

export async function POST(req) {
  const data = await req.json();
  const { untrustedData } = data;

  const gameState = JSON.parse(untrustedData.state || "{}");
  const selectedIndex = parseInt(untrustedData.buttonIndex); // 1 to 4
  const questionIndex = gameState.questionIndex || 0;

  const currentQuestion = allQuestions[questionIndex] || allQuestions[0];
  const isCorrect = selectedIndex === currentQuestion.answer + 1; // +1 because Frame buttons are 1-indexed

  const newGameState = {
    ...gameState,
    score: (gameState.score || 0) + (isCorrect ? 1 : 0),
    questionIndex: questionIndex + 1,
  };

  const isGameOver = newGameState.questionIndex >= 15;

  if (isGameOver) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://cast-it-fast.vercel.app/api/frame/image?gameOver=true&score=${newGameState.score}" />
          <meta property="fc:frame:button:1" content="🔄 Play Again" />
          <meta property="fc:frame:button:2" content="📊 Share Score" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:2:action" content="post" />
          <meta property="fc:frame:post_url" content="https://cast-it-fast.vercel.app/api/frame/restart" />
        </head>
        <body>
          <h1>Game Over - Score: ${newGameState.score}/15</h1>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  return NextResponse.json({
    type: "frame",
    frameUrl: `https://cast-it-fast.vercel.app/api/frame/question?state=${encodeURIComponent(
      JSON.stringify(newGameState)
    )}`,
  });
}
