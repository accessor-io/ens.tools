import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, PublicClient, WalletClient, Chain } from 'viem';
import { mainnet, sepolia, optimism, base, arbitrum } from 'viem/chains';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  publicClient: PublicClient | null;
  walletClient: WalletClient | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getChainById: (chainId: number) => Chain | null;
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

interface Web3ProviderProps {
  children: ReactNode;
}

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  10: optimism,
  8453: base,
  42161: arbitrum,
  11155111: sepolia,
};

function getChainConfig(chainId: number | null): Chain {
  if (!chainId || !CHAIN_MAP[chainId]) {
    return mainnet;
  }
  return CHAIN_MAP[chainId];
}

function getRpcUrl(chainId: number): string {
  const env = (window as any).process?.env || {};
  const envMap: Record<number, string> = {
    1: env.VITE_RPC_MAINNET || '',
    10: env.VITE_RPC_OPTIMISM || '',
    8453: env.VITE_RPC_BASE || '',
    42161: env.VITE_RPC_ARBITRUM || '',
    11155111: env.VITE_RPC_SEPOLIA || '',
  };
  
  const customRpc = envMap[chainId];
  if (customRpc) return customRpc;
  
  const chain = CHAIN_MAP[chainId];
  return chain?.rpcUrls.default.http[0] || '';
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  const getChainById = (targetChainId: number): Chain | null => {
    return CHAIN_MAP[targetChainId] || null;
  };

  // Initialize clients
  useEffect(() => {
    if (!chainId) return;
    
    const chain = getChainConfig(chainId);
    const rpcUrl = getRpcUrl(chainId);
    
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl || undefined),
    });
    
    setPublicClient(client);
  }, [chainId]);

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection();
    
    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAddress(accounts[0]);
    }
  };

  const handleChainChanged = (chainIdHex: string) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    window.location.reload(); // Recommended by MetaMask
  };

  const checkConnection = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        
        const chainIdHex = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        setChainId(chainId);

        const chain = getChainConfig(chainId);
        const wallet = createWalletClient({
          account: accounts[0],
          chain,
          transport: custom(window.ethereum),
        });
        setWalletClient(wallet);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);

        const chainIdHex = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        setChainId(chainId);

        const chain = getChainConfig(chainId);
        const wallet = createWalletClient({
          account: accounts[0],
          chain,
          transport: custom(window.ethereum),
        });
        setWalletClient(wallet);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    setWalletClient(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        const chain = getChainConfig(targetChainId);
        if (!chain) {
          console.error('Unsupported chain:', targetChainId);
          return;
        }
        
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls.default.http,
                blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : undefined,
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding chain:', addError);
        }
      }
      console.error('Error switching network:', error);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        address,
        isConnected: !!address,
        chainId,
        publicClient,
        walletClient,
        connect,
        disconnect,
        switchNetwork,
        getChainById,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
