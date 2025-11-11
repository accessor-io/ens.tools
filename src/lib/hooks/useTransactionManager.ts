import { useEffect } from 'react';
import { useWeb3 } from '../services';
import { transactionManager } from '../services/transaction-manager';

/**
 * Hook to automatically initialize transaction manager with Web3 clients
 */
export function useTransactionManager() {
  const { publicClient, walletClient } = useWeb3();

  useEffect(() => {
    if (publicClient) {
      transactionManager.setClients(publicClient, walletClient || undefined);
    }
  }, [publicClient, walletClient]);

  return transactionManager;
}

