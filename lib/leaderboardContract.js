import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xD597C73a25cD96A65a4406D34526a40b4E047Bf1";

// Contract ABI (copied from your Remix deployment)
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "displayName", "type": "string" },
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "entries",
    "outputs": [
      { "internalType": "string", "name": "displayName", "type": "string" },
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
    "name": "getEntry",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalEntries",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Export a helper to create the contract
export const getContract = (signerOrProvider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};
