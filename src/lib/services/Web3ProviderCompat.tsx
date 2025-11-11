import React, { createContext, useContext, ReactNode } from 'react';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { PublicClient, WalletClient, Address } from 'viem';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  publicClient: PublicClient | null;
  walletClient: WalletClient | null;
  connect: (provider?: any) => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getChainById: (chainId: number) => any;
}

const Web3Context = createContext<Web3ContextType>({
  address: null,
  isConnected: false,
  chainId: null,
  publicClient: null,
  walletClient: null,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
  getChainById: () => null,
});

export const useWeb3 = () => useContext(Web3Context);

interface Web3ProviderCompatProps {
  children: ReactNode;
}

export function Web3ProviderCompat({ children }: Web3ProviderCompatProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Debug: Log wallet connection state changes
  React.useEffect(() => {
    if (isConnected && address) {
      console.log('Web3ProviderCompat: Wallet connected', { address, chainId, isConnected });
    } else if (!isConnected) {
      console.log('Web3ProviderCompat: Wallet disconnected');
    }
  }, [address, isConnected, chainId]);

  // Compatibility functions - these are no-ops since RainbowKit handles connection
  const connect = async () => {
    // Connection is handled by RainbowKit's ConnectButton
    console.warn('connect() called - use RainbowKit ConnectButton instead');
  };

  const disconnect = () => {
    // Disconnection is handled by RainbowKit's ConnectButton
    console.warn('disconnect() called - use RainbowKit ConnectButton instead');
  };

  const switchNetwork = async (targetChainId: number) => {
    // Network switching is handled by RainbowKit
    console.warn('switchNetwork() called - use RainbowKit chain selector instead');
  };

  const getChainById = (targetChainId: number) => {
    // Return chain info if needed
    return null;
  };

  // Convert address from Address type (which is a string) to string | null
  const addressString: string | null = address ? (address as string) : null;

  const value: Web3ContextType = {
    address: addressString,
    isConnected: isConnected,
    chainId: chainId || null,
    publicClient: (publicClient as PublicClient) || null,
    walletClient: (walletClient as WalletClient) || null,
    connect,
    disconnect,
    switchNetwork,
    getChainById,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

