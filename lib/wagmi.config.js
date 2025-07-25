import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp} from '@farcaster/miniapp-wagmi-connector';

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp({
      shimDisconnect: true,
      autoConnect: false,
    }),
  ],
  ssr: false,
  multiInjectedProviderDiscovery: false,
});
