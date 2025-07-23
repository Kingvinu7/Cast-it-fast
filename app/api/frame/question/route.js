import { NextResponse } from "next/server";
import allQuestions from "@/lib/questions"; // ✅ Reuse your existing questions

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const stateParam = searchParams.get("state");
  const gameState = JSON.parse(decodeURIComponent(stateParam || "{}"));

  const currentQuestion = getQuestion(gameState.questionIndex);

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://cast-it-fast.vercel.app/api/frame/image?question=${encodeURIComponent(currentQuestion.question)}" />
        <meta property="fc:frame:button:1" content="${currentQuestion.options[0]}" />
        <meta property="fc:frame:button:2" content="${currentQuestion.options[1]}" />
        <meta property="fc:frame:button:3" content="${currentQuestion.options[2]}" />
        <meta property="fc:frame:button:4" content="${currentQuestion.options[3]}" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:2:action" content="post" />
        <meta property="fc:frame:button:3:action" content="post" />
        <meta property="fc:frame:button:4:action" content="post" />
        <meta property="fc:frame:post_url" content="https://cast-it-fast.vercel.app/api/frame/answer" />
        <meta property="fc:frame:state" content="${encodeURIComponent(JSON.stringify(gameState))}" />
      </head>
      <body>
        <h1>Cast-it-Fast Question</h1>
      </body>
    </html>
    `,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}

function getQuestion(index) {
  return allQuestions[index] || allQuestions[0];
}
