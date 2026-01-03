import { useState, useCallback } from 'react';
import type { TransactionContextState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access transaction context state
 * Manages transaction state and pending transactions
 */
export function useTransactionContext(): TransactionContextState {
  return getDefaultContextState('transaction');
}

/**
 * Hook to manage transaction context state
 * Provides methods to update transaction state
 */
export function useTransactionContextManager() {
  const [transactionState, setTransactionState] = useState<TransactionContextState>(
    getDefaultContextState('transaction')
  );

  const setPendingTransactions = useCallback((count: number) => {
    setTransactionState((prev) => ({ ...prev, pendingTransactions: count }));
  }, []);

  const setLastTransactionHash = useCallback((hash: string | undefined) => {
    setTransactionState((prev) => ({ ...prev, lastTransactionHash: hash }));
  }, []);

  const setTransactionError = useCallback((error: string | null) => {
    setTransactionState((prev) => ({ ...prev, transactionError: error }));
  }, []);

  return {
    transactionState,
    setPendingTransactions,
    setLastTransactionHash,
    setTransactionError,
  };
}
