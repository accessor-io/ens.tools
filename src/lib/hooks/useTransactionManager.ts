import { useEffect } from 'react';
import { useWeb3 } from '../services';
import { transactionManager } from '../services/transaction-manager';
import { nonceManager } from '../services/nonce-manager';

/**
 * Hook to automatically initialize transaction manager with Web3 clients
 * Also initializes nonce manager for proper nonce tracking
 */
export function useTransactionManager() {
  const { publicClient, walletClient } = useWeb3();

  useEffect(() => {
    if (publicClient) {
      transactionManager.setClients(publicClient, walletClient || undefined);
      // Nonce manager is initialized inside transactionManager.setClients
      // but we can also set it here for direct access if needed
      nonceManager.setPublicClient(publicClient);
    }
  }, [publicClient, walletClient]);

  return transactionManager;
}


