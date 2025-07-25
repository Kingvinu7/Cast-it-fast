import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const abi = [
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

const contractAddress = '0x56357f65f33387ece9caf9b944029f98a2363c3a';

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

export const getLeaderboardContract = (walletClient) => {
  return {
    abi,
    address: contractAddress,
    client: walletClient,
  };
};
