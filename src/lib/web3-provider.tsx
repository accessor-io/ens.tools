import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, PublicClient, WalletClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  publicClient: PublicClient | null;
  walletClient: WalletClient | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
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
});

export const useWeb3 = () => useContext(Web3Context);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  // Initialize clients
  useEffect(() => {
    const chain = chainId === 11155111 ? sepolia : mainnet;
    
    const client = createPublicClient({
      chain,
      transport: http(),
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

        const chain = chainId === 11155111 ? sepolia : mainnet;
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

        const chain = chainId === 11155111 ? sepolia : mainnet;
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
        const chain = targetChainId === 1 ? mainnet : sepolia;
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls.default.http,
                blockExplorerUrls: [chain.blockExplorers?.default.url],
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
