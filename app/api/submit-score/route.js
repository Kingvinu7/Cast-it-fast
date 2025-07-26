import { ethers } from 'ethers';
import leaderboardContract from '@/lib/leaderboardContract';

export async function POST(request) {
  try {
    const { displayName, score, fid, platform } = await request.json();
    
    // Better validation and conversion
    const cleanDisplayName = String(displayName || `User_${fid || 'unknown'}`).trim();
    const cleanScore = parseInt(score) || 0;
    
    if (!cleanDisplayName || cleanScore < 0) {
      return Response.json(
        { error: 'Invalid displayName or score', displayName: cleanDisplayName, score: cleanScore }, 
        { status: 400 }
      );
    }

    console.log('Processing submission:', { displayName: cleanDisplayName, score: cleanScore, fid, platform });

    // Initialize provider and wallet (you'll need to set these up)
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Create contract instance
    const contract = new ethers.Contract(
      leaderboardContract.address,
      leaderboardContract.abi,
      wallet
    );

    // Submit to blockchain with proper string conversion
    console.log('Calling contract with:', cleanDisplayName, cleanScore);
    const tx = await contract.submitScore(cleanDisplayName, cleanScore);
    const receipt = await tx.wait();

    console.log('Transaction successful:', receipt.hash);

    return Response.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      displayName: cleanDisplayName,
      score: cleanScore
    });

  } catch (error) {
    console.error('Score submission error:', error);
    return Response.json(
      { 
        error: 'Failed to submit score', 
        details: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      }, 
      { status: 500 }
    );
  }
}
