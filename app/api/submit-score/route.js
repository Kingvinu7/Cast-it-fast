import { ethers } from 'ethers';
import leaderboardContract from '@/lib/leaderboardContract';

export async function POST(request) {
  try {
    const { displayName, score, fid, platform } = await request.json();
    
    if (!displayName || !score) {
      return Response.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Initialize provider and wallet (you'll need to set these up)
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Create contract instance
    const contract = new ethers.Contract(
      leaderboardContract.address,
      leaderboardContract.abi,
      wallet
    );

    // Submit to blockchain
    const tx = await contract.submitScore(displayName, parseInt(score));
    const receipt = await tx.wait();

    return Response.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {
    console.error('Score submission error:', error);
    return Response.json(
      { error: 'Failed to submit score', details: error.message }, 
      { status: 500 }
    );
  }
}
