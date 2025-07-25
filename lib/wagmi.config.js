import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterFrame as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    miniAppConnector({
      // Add these options to prevent conflicts
      shimDisconnect: true,
      // Don't auto-connect to avoid conflicts with existing providers
      autoConnect: false,
    })
  ],
  // Add this to prevent SSR issues
  ssr: false,
  // Disable wallet connection modal that might conflict
  multiInjectedProviderDiscovery: false,
})
