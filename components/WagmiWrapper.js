"use client";
import { WagmiConfig } from 'wagmi'; // ❗️ not WagmiProvider
import { config } from '@/lib/wagmi.config';

export function WagmiWrapper({ children }) {
  return (
    <WagmiConfig config={config}>
      {children}
    </WagmiConfig>
  );
}
