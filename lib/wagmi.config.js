import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniapp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
  connectors: [
    miniAppConnector()
  ]
})
