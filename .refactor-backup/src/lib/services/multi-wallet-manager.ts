import { createWalletClient, custom, WalletClient, Chain } from 'viem';
import { mainnet, sepolia, optimism, base, arbitrum } from 'viem/chains';

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

export interface ManagedWallet {
  id: string;
  address: string;
  walletName: string;
  walletId: string;
  chainId: number;
  addedAt: number;
  isActive: boolean;
}

interface WalletConnection {
  wallet: ManagedWallet;
  provider: any;
  walletClient: WalletClient | null;
}

/**
 * Service for managing multiple wallet connections
 */
class MultiWalletManager {
  private readonly STORAGE_KEY = 'ens_managed_wallets';
  private wallets: Map<string, WalletConnection> = new Map();
  private activeWalletId: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load wallets from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      const wallets: ManagedWallet[] = data.wallets || [];
      this.activeWalletId = data.activeWalletId || (wallets.length > 0 ? wallets[0].id : null);

      // Note: Provider references can't be stored, so we'll need to reconnect on page load
      wallets.forEach((wallet) => {
        this.wallets.set(wallet.id, {
          wallet,
          provider: null,
          walletClient: null,
        });
      });
    } catch (error) {
      console.error('Error loading wallets from storage:', error);
    }
  }

  /**
   * Save wallets to localStorage
   */
  private saveToStorage(): void {
    try {
      const wallets = Array.from(this.wallets.values()).map((conn) => conn.wallet);
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          wallets,
          activeWalletId: this.activeWalletId,
        })
      );
    } catch (error) {
      console.error('Error saving wallets to storage:', error);
    }
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Subscribe to wallet changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Add a new wallet connection
   */
  async addWallet(
    address: string,
    provider: any,
    walletName: string,
    walletId: string,
    chainId: number
  ): Promise<string> {
    // Check if wallet already exists
    const existing = Array.from(this.wallets.values()).find(
      (conn) => conn.wallet.address.toLowerCase() === address.toLowerCase()
    );

    if (existing) {
      // Update existing wallet
      existing.wallet.chainId = chainId;
      existing.provider = provider;
      existing.wallet.walletName = walletName;
      existing.wallet.walletId = walletId;
      
      // Recreate wallet client with new provider
      const chain = getChainConfig(chainId);
      if (chain && provider) {
        try {
          existing.walletClient = createWalletClient({
            account: address as `0x${string}`,
            chain,
            transport: custom(provider),
          });
        } catch (error) {
          console.error('Error creating wallet client:', error);
        }
      }

      this.setActiveWallet(existing.wallet.id);
      this.saveToStorage();
      this.notifyListeners();
      return existing.wallet.id;
    }

    // Create new wallet
    const walletId_generated = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const wallet: ManagedWallet = {
      id: walletId_generated,
      address: address.toLowerCase(),
      walletName,
      walletId,
      chainId,
      addedAt: Date.now(),
      isActive: false,
    };

    // Create wallet client
    let walletClient: WalletClient | null = null;
    const chain = getChainConfig(chainId);
    if (chain && provider) {
      try {
        walletClient = createWalletClient({
          account: address as `0x${string}`,
          chain,
          transport: custom(provider),
        });
      } catch (error) {
        console.error('Error creating wallet client:', error);
      }
    }

    // Set as active if it's the first wallet
    if (this.wallets.size === 0) {
      wallet.isActive = true;
      this.activeWalletId = wallet.id;
    }

    this.wallets.set(wallet.id, {
      wallet,
      provider,
      walletClient,
    });

    this.saveToStorage();
    this.notifyListeners();
    return wallet.id;
  }

  /**
   * Remove a wallet
   */
  removeWallet(id: string): boolean {
    if (!this.wallets.has(id)) return false;

    // If removing active wallet, switch to another
    if (this.activeWalletId === id) {
      const remaining = Array.from(this.wallets.keys()).filter((key) => key !== id);
      if (remaining.length > 0) {
        this.setActiveWallet(remaining[0]);
      } else {
        this.activeWalletId = null;
      }
    }

    this.wallets.delete(id);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Set active wallet
   */
  setActiveWallet(id: string): boolean {
    if (!this.wallets.has(id)) return false;

    // Update all wallets' active status
    this.wallets.forEach((conn, key) => {
      conn.wallet.isActive = key === id;
    });

    this.activeWalletId = id;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Get all wallets
   */
  getAllWallets(): ManagedWallet[] {
    return Array.from(this.wallets.values()).map((conn) => conn.wallet);
  }

  /**
   * Get active wallet
   */
  getActiveWallet(): ManagedWallet | null {
    if (!this.activeWalletId) return null;
    return this.wallets.get(this.activeWalletId)?.wallet || null;
  }

  /**
   * Get active wallet connection (provider + client)
   */
  getActiveWalletConnection(): WalletConnection | null {
    if (!this.activeWalletId) return null;
    return this.wallets.get(this.activeWalletId) || null;
  }

  /**
   * Get wallet by ID
   */
  getWallet(id: string): ManagedWallet | null {
    return this.wallets.get(id)?.wallet || null;
  }

  /**
   * Get wallet connection by ID
   */
  getWalletConnection(id: string): WalletConnection | null {
    return this.wallets.get(id) || null;
  }

  /**
   * Update wallet chain ID
   */
  updateWalletChain(id: string, chainId: number): boolean {
    const conn = this.wallets.get(id);
    if (!conn) return false;

    conn.wallet.chainId = chainId;

    // Recreate wallet client with new chain
    const chain = getChainConfig(chainId);
    if (chain && conn.provider) {
      try {
        conn.walletClient = createWalletClient({
          account: conn.wallet.address as `0x${string}`,
          chain,
          transport: custom(conn.provider),
        });
      } catch (error) {
        console.error('Error updating wallet client:', error);
      }
    }

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Clear all wallets
   */
  clearAll(): void {
    this.wallets.clear();
    this.activeWalletId = null;
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Reconnect a wallet's provider (useful after page reload)
   */
  async reconnectWallet(id: string, provider: any): Promise<boolean> {
    const conn = this.wallets.get(id);
    if (!conn) return false;

    try {
      // Try to get accounts from provider
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        return false;
      }

      const address = accounts[0].toLowerCase();
      if (address !== conn.wallet.address.toLowerCase()) {
        return false;
      }

      // Update provider and recreate wallet client
      conn.provider = provider;
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);
      conn.wallet.chainId = chainId;

      const chain = getChainConfig(chainId);
      if (chain) {
        try {
          conn.walletClient = createWalletClient({
            account: conn.wallet.address as `0x${string}`,
            chain,
            transport: custom(provider),
          });
        } catch (error) {
          console.error('Error recreating wallet client:', error);
        }
      }

      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error reconnecting wallet:', error);
      return false;
    }
  }
}

export const multiWalletManager = new MultiWalletManager();

