import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, PublicClient, WalletClient, Chain, Address } from 'viem';
import { mainnet, sepolia, optimism, base, arbitrum } from 'viem/chains';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  publicClient: PublicClient | null;
  walletClient: WalletClient | null;
  connect: (provider?: any) => Promise<void>;
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
  connect: async (provider?: any) => {},
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
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Store the current provider reference
  const [currentProvider, setCurrentProvider] = useState<any>(null);

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection();
    
    // Listen for account changes on window.ethereum (for initial setup)
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      
      // Set up listeners on the main provider
      if (ethereum.on) {
        ethereum.on('accountsChanged', handleAccountsChanged);
        ethereum.on('chainChanged', handleChainChanged);
      }
      
      // Also listen on individual providers if they exist
      if (ethereum.providers && Array.isArray(ethereum.providers)) {
        ethereum.providers.forEach((provider: any) => {
          if (provider.on) {
            provider.on('accountsChanged', handleAccountsChanged);
            provider.on('chainChanged', handleChainChanged);
          }
        });
      }
    }

    return () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        if (ethereum.removeListener) {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('chainChanged', handleChainChanged);
        }
        
        if (ethereum.providers && Array.isArray(ethereum.providers)) {
          ethereum.providers.forEach((provider: any) => {
            if (provider.removeListener) {
              provider.removeListener('accountsChanged', handleAccountsChanged);
              provider.removeListener('chainChanged', handleChainChanged);
            }
          });
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      const account = accounts[0] as Address;
      setAddress(account);
      
      // Update wallet client with new account
      if (currentProvider && chainId) {
        try {
          const chain = getChainConfig(chainId);
          const wallet = createWalletClient({
            account: account,
            chain,
            transport: custom(currentProvider),
          });
          setWalletClient(wallet);
        } catch (error) {
          console.error('Error updating wallet client after account change:', error);
        }
      }
    }
  };

  const handleChainChanged = (chainIdHex: string) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    window.location.reload(); // Recommended by MetaMask
  };

  const checkConnection = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;

    try {
      const ethereum = (window as any).ethereum;
      let provider = ethereum;
      
      // If there are multiple providers, try the first one
      if (ethereum.providers && Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
        provider = ethereum.providers[0];
      }
      
      const accounts = await provider.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts && accounts.length > 0) {
        const account = accounts[0] as Address;
        setAddress(account);
        
        const chainIdHex = await provider.request({ 
          method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        setChainId(chainId);

        const chain = getChainConfig(chainId);
        const wallet = createWalletClient({
          account: account,
          chain,
          transport: custom(provider),
        });
        setWalletClient(wallet);
        setCurrentProvider(provider);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connect = async (customProvider?: any) => {
    // Use custom provider if provided, otherwise use window.ethereum
    let provider = customProvider;
    
    if (!provider) {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        provider = (window as any).ethereum;
        
        // If window.ethereum has providers array and no custom provider, use the first one
        if (provider.providers && Array.isArray(provider.providers) && provider.providers.length > 0) {
          provider = provider.providers[0];
        }
      }
    }
    
    if (typeof window === 'undefined' || !provider || !provider.request) {
      throw new Error('Web3 wallet not found. Please install MetaMask or another Web3 wallet.');
    }

    // Prevent duplicate connection attempts
    if (isConnecting) {
      throw new Error('Connection request already in progress. Please wait.');
    }

    // Wait for wallet to be ready (some wallets need initialization time)
    if (!customProvider && typeof window !== 'undefined' && (window as any).ethereum) {
      let retries = 0;
      while (retries < 10) {
        const eth = (window as any).ethereum;
        if (eth.isMetaMask || eth.selectedAddress || eth._state) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
    }

    // Check if already connected first (using eth_accounts which doesn't trigger a popup)
    // Only skip connection request if not using a custom provider (user explicitly selected a wallet)
    // This allows users to reconnect or switch wallets
    if (!customProvider) {
      try {
        const existingAccounts = await provider.request({ 
          method: 'eth_accounts' 
        });
        
        if (existingAccounts && existingAccounts.length > 0) {
          // Already connected, just update state
          const account = existingAccounts[0] as Address;
          setAddress(account);
          
          const chainIdHex = await provider.request({ 
            method: 'eth_chainId' 
          });
          const chainId = parseInt(chainIdHex, 16);
          setChainId(chainId);

          const chain = getChainConfig(chainId);
          const wallet = createWalletClient({
            account: account,
            chain,
            transport: custom(provider),
          });
          setWalletClient(wallet);
          setCurrentProvider(provider);
          
          // Set up listeners
          if (provider.on) {
            try {
              provider.on('accountsChanged', handleAccountsChanged);
              provider.on('chainChanged', handleChainChanged);
            } catch (e) {
              console.debug('Provider event listeners not available:', e);
            }
          }
          
          return; // Already connected, no need to request
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
        // Don't throw here, continue to request connection
      }
    }

    // Not connected, request connection
    setIsConnecting(true);
    try {
      // Check if permissions were previously denied
      try {
        const permissions = await provider.request({
          method: 'wallet_getPermissions',
        });
        
        // If site is in the permissions list but no accounts, user needs to reconnect
        if (permissions && permissions.length > 0) {
          const hasAccounts = permissions.some((p: any) => 
            p.parentCapability === 'eth_accounts' && p.caveats?.some((c: any) => c.value?.length > 0)
          );
          
          if (!hasAccounts) {
            // Permissions exist but no accounts - might need to clear and re-request
            console.warn('Permissions exist but no accounts found. Attempting to request accounts...');
          }
        }
      } catch (permError) {
        // Permissions API might not be available, that's okay
        console.debug('Permissions API not available:', permError);
      }

      // Add a small delay to ensure wallet UI is ready
      await new Promise(resolve => setTimeout(resolve, 200));

      // Make the connection request
      // Note: Some wallets may take time to show the popup, so we allow up to 30 seconds
      const accounts = await Promise.race([
        provider.request({
          method: 'eth_requestAccounts',
        }) as Promise<string[]>,
        // Add timeout to detect if request is stuck
        new Promise<string[]>((_, reject) => 
          setTimeout(() => reject(new Error('Connection request timed out. Please check your wallet and try again.')), 30000)
        )
      ]);

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet and ensure you have at least one account.');
      }

      const account = accounts[0] as Address;
      
      if (!account || !account.startsWith('0x') || account.length !== 42) {
        throw new Error('Invalid account address received from wallet.');
      }
      
      setAddress(account);

      const chainIdHex = await provider.request({ 
        method: 'eth_chainId' 
      });
      
      if (!chainIdHex || typeof chainIdHex !== 'string') {
        throw new Error('Invalid chain ID received from wallet.');
      }
      
      const chainId = parseInt(chainIdHex, 16);
      setChainId(chainId);

      const chain = getChainConfig(chainId);
      
      try {
        const wallet = createWalletClient({
          account: account,
          chain,
          transport: custom(provider),
        });
        setWalletClient(wallet);
        setCurrentProvider(provider);
      } catch (walletError: any) {
        console.error('Error creating wallet client:', walletError);
        throw new Error(`Failed to initialize wallet client: ${walletError?.message || 'Unknown error'}`);
      }
      
      // Set up listeners for account/chain changes on this provider
      if (provider.on) {
        try {
          provider.on('accountsChanged', handleAccountsChanged);
          provider.on('chainChanged', handleChainChanged);
        } catch (e) {
          console.debug('Provider event listeners not available:', e);
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      // Provide more specific error messages
      if (error?.code === 4001) {
        throw new Error('Connection was rejected. To fix this:\n1. Open your wallet extension\n2. Go to Settings → Security & Privacy → Connected Sites\n3. Remove this site from blocked/denied sites\n4. Try connecting again');
      } else if (error?.code === -32002) {
        throw new Error('Connection request already pending. Please check your wallet extension and approve the pending request.');
      } else if (error?.message?.includes('User rejected')) {
        throw new Error('Connection request was rejected. Please check your wallet and try again.');
      }
      
      // Re-throw to allow caller to handle
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    // Remove listeners from current provider
    if (currentProvider && currentProvider.removeListener) {
      try {
        currentProvider.removeListener('accountsChanged', handleAccountsChanged);
        currentProvider.removeListener('chainChanged', handleChainChanged);
      } catch (e) {
        console.debug('Error removing listeners:', e);
      }
    }
    
    setAddress(null);
    setChainId(null);
    setWalletClient(null);
    setCurrentProvider(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    const provider = currentProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (typeof window === 'undefined' || !provider) return;

    try {
      await provider.request({
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
          await provider.request({
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
      } else {
        console.error('Error switching network:', error);
      }
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
