"use client";
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi.config'

export function WagmiWrapper({ children }) {
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  )
}
