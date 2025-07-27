// app/api/submit-score/route.js - Hybrid approach

import { ethers } from 'ethers';
import leaderboardContract from '@/lib/leaderboardContract';

export async function POST(request) {
  try {
    const { displayName, score, fid, platform, userAddress } = await request.json();
    
    // Enhanced validation
    const cleanDisplayName = String(displayName || `User_${fid || Date.now()}`).trim();
    const cleanScore = parseInt(score) || 0;
    const cleanFid = String(fid || '0');
    
    if (!cleanDisplayName || cleanScore < 0) {
      return Response.json(
        { 
          error: 'Invalid data', 
          details: { displayName: cleanDisplayName, score: cleanScore }
        }, 
        { status: 400 }
      );
    }

    console.log('Processing hybrid submission:', { 
      displayName: cleanDisplayName, 
      score: cleanScore, 
      fid: cleanFid,
      platform,
      userAddress: userAddress || 'server-signed'
    });

    // Initialize provider and wallet (server wallet for mobile users)
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const serverWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Create contract instance
    const contract = new ethers.Contract(
      leaderboardContract.address,
      leaderboardContract.abi,
      serverWallet
    );

    // For mobile users, we'll include their FID in the display name for identification
    // This way each mobile user has a unique identifier on the blockchain
    const blockchainName = platform === 'mobile' 
      ? `${cleanDisplayName} (FC:${cleanFid})`  // e.g., "John (FC:12345)"
      : cleanDisplayName;

    console.log('Submitting to blockchain:', { name: blockchainName, score: cleanScore });
    
    // Submit to blockchain
    const tx = await contract.submitScore(blockchainName, cleanScore);
    const receipt = await tx.wait();

    console.log('Transaction successful:', {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return Response.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      displayName: blockchainName,
      score: cleanScore,
      method: platform === 'mobile' ? 'server-signed-mobile' : 'server-signed-web',
      gasUsed: receipt.gasUsed.toString(),
      farcasterFid: cleanFid
    });

  } catch (error) {
    console.error('Blockchain submission error:', error);
    
    // Detailed error handling
    let errorResponse = {
      error: 'Failed to submit score',
      timestamp: new Date().toISOString(),
      details: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      }
    };
    
    // Handle specific error types
    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorResponse.userMessage = 'Server wallet needs more ETH for gas fees';
    } else if (error.code === 'INVALID_ARGUMENT') {
      errorResponse.userMessage = 'Invalid data sent to smart contract';
    } else if (error.message.includes('revert')) {
      errorResponse.userMessage = 'Smart contract rejected the transaction';
    } else if (error.message.includes('network')) {
      errorResponse.userMessage = 'Blockchain network error - please try again';
    }
    
    return Response.json(errorResponse, { status: 500 });
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
