import React from 'react';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, sepolia, optimism, base, arbitrum, polygon } from 'viem/chains';
import '@rainbow-me/rainbowkit/styles.css';

// Get project ID from environment
// You can get a free project ID from https://cloud.walletconnect.com
// Note: Injected wallets (MetaMask, etc.) work without a project ID, but WalletConnect requires one
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId && typeof window !== 'undefined') {
  console.warn(
    'RainbowKit: WalletConnect project ID not set. ' +
    'Get a free project ID from https://cloud.walletconnect.com and set VITE_WALLETCONNECT_PROJECT_ID. ' +
    'Injected wallets (MetaMask, etc.) will still work.'
  );
}

// RainbowKit requires a project ID, but it can be a placeholder for injected wallets only
// For production, you should set a real project ID from WalletConnect Cloud
const config = getDefaultConfig({
  appName: 'ens.tools',
  projectId: projectId || '00000000000000000000000000000000',
  chains: [mainnet, sepolia, optimism, base, arbitrum, polygon],
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export function RainbowKitWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

