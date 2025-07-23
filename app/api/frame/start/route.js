import { NextResponse } from "next/server";

export async function POST(req) {
  const data = await req.json();
  const { untrustedData } = data;

  // Initialize game state
  const gameState = {
    round: 1,
    score: 0,
    questionIndex: 0,
    playerFid: untrustedData?.fid || null,
  };

  // Respond with the URL to the first question frame
  return NextResponse.json({
    type: "frame",
    frameUrl: `https://cast-it-fast.vercel.app/api/frame/question?state=${encodeURIComponent(
      JSON.stringify(gameState)
    )}`,
  });
}
