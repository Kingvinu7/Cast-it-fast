// lib/leaderboardContract.js - Updated version
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x8e04a35502aa7915b2834774Eb33d9e3e4cE29c7";

// Contract ABI (copied from your Remix deployment)
const CONTRACT_ABI = [
   
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "displayName",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			}
		],
		"name": "submitScore",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "entries",
		"outputs": [
			{
				"internalType": "string",
				"name": "displayName",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "getEntry",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getTotalEntries",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// Create interface for encoding function calls (needed for Farcaster SDK)
const contractInterface = new ethers.Interface(CONTRACT_ABI);

// Wagmi-compatible contract configuration
const leaderboardContract = {
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  interface: contractInterface  // Add this line for Farcaster SDK
};

// Export the contract config for Wagmi (default export)
export default leaderboardContract;

// Keep the existing ethers helper for backward compatibility (named export)
export const getContract = (signerOrProvider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};

// Export individual parts for convenience
export const CONTRACT_ADDRESS_EXPORT = CONTRACT_ADDRESS;
export const CONTRACT_ABI_EXPORT = CONTRACT_ABI;
