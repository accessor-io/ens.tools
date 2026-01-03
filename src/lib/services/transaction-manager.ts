/**
 * Transaction Manager Service
 * Handles transaction queue, status tracking, and execution
 * Enhanced with patterns from Mastering Ethereum 2nd Edition:
 * - Nonce management with pending block tag
 * - EIP-1559 gas estimation
 * - Better error handling for nonce/gas errors
 * - Transaction replacement support
 */

import { Hash, Address, PublicClient, WalletClient } from 'viem';
import { toast } from 'sonner';
import { getErrorMessage, getErrorRecovery } from '../utils/error-handler';
import { nonceManager } from './nonce-manager';

export type TransactionStatus = 'pending' | 'submitted' | 'confirmed' | 'failed' | 'replaced';

export interface Transaction {
  id: string;
  hash?: Hash;
  description: string;
  status: TransactionStatus;
  submittedAt?: Date;
  confirmedAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  nonce?: number;
  account?: Address;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
  execute: () => Promise<Hash>;
}

export interface TransactionOptions {
  description: string;
  maxRetries?: number;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
  account?: Address;
}

export class TransactionManager {
  private transactions: Map<string, Transaction> = new Map();
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 2000; // 2 seconds

  setClients(publicClient: PublicClient, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    if (walletClient) {
      this.walletClient = walletClient;
    }
    // Initialize nonce manager
    if (publicClient) {
      nonceManager.setPublicClient(publicClient);
    }
  }

  /**
   * Add a transaction to the queue
   * Enhanced to track account and nonce for better error handling
   */
  async addTransaction(
    executeFn: () => Promise<Hash>,
    options: TransactionOptions
  ): Promise<string> {
    const id = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction: Transaction = {
      id,
      description: options.description,
      status: 'pending',
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      account: options.account || this.walletClient?.account?.address,
      onSuccess: options.onSuccess,
      onFailure: options.onFailure,
      execute: executeFn,
    };

    this.transactions.set(id, transaction);
    
    // Start polling if not already started
    if (!this.pollingInterval) {
      this.startPolling();
    }

    // Execute immediately
    this.executeTransaction(id).catch((error) => {
      console.error('Transaction execution error:', error);
    });

    return id;
  }

  /**
   * Replace a pending transaction with higher gas price
   * Useful for canceling stuck transactions or speeding up confirmation
   */
  async replaceTransaction(
    id: string,
    options?: {
      maxFeePerGasMultiplier?: number;
      maxPriorityFeePerGasMultiplier?: number;
    }
  ): Promise<string | null> {
    const transaction = this.transactions.get(id);
    if (!transaction || !transaction.hash || !transaction.account) {
      throw new Error('Transaction not found or not suitable for replacement');
    }

    if (transaction.status !== 'submitted') {
      throw new Error('Can only replace submitted transactions');
    }

    if (!this.publicClient || !this.walletClient) {
      throw new Error('Clients not initialized');
    }

    try {
      // Get current transaction details
      const currentTx = await this.publicClient.getTransaction({ hash: transaction.hash });
      
      if (!currentTx) {
        throw new Error('Transaction not found on chain');
      }

      // Calculate higher fees (default 10% increase)
      const feeMultiplier = options?.maxFeePerGasMultiplier || 1.1;
      const priorityMultiplier = options?.maxPriorityFeePerGasMultiplier || 1.1;

      let maxFeePerGas: bigint;
      let maxPriorityFeePerGas: bigint;

      if (currentTx.type === 'eip1559' && currentTx.maxFeePerGas && currentTx.maxPriorityFeePerGas) {
        maxFeePerGas = (currentTx.maxFeePerGas * BigInt(Math.floor(feeMultiplier * 100))) / 100n;
        maxPriorityFeePerGas = (currentTx.maxPriorityFeePerGas * BigInt(Math.floor(priorityMultiplier * 100))) / 100n;
      } else if (currentTx.gasPrice) {
        // Legacy transaction - convert to EIP-1559
        const newGasPrice = (currentTx.gasPrice * BigInt(Math.floor(feeMultiplier * 100))) / 100n;
        maxFeePerGas = newGasPrice;
        maxPriorityFeePerGas = (newGasPrice * 20n) / 100n; // 20% of max fee as priority
      } else {
        // Fallback: get current fee estimates
        const feeData = await this.publicClient.estimateFeesPerGas();
        maxFeePerGas = feeData.maxFeePerGas || 20n * 10n ** 9n; // 20 gwei default
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 2n * 10n ** 9n; // 2 gwei default
      }

      // Create replacement transaction (send to self with zero value)
      const replacementHash = await this.walletClient.sendTransaction({
        account: transaction.account,
        to: transaction.account, // Send to self
        value: 0n,
        nonce: currentTx.nonce, // Same nonce
        maxFeePerGas,
        maxPriorityFeePerGas,
        gas: currentTx.gas,
      });

      // Update transaction status
      transaction.status = 'replaced';
      transaction.hash = replacementHash;
      transaction.submittedAt = new Date();

      toast.info('Transaction replaced', {
        description: `Replaced with higher gas price`,
        action: {
          label: 'View',
          onClick: () => this.openEtherscan(replacementHash),
        },
      });

      // Track the replacement transaction
      this.trackTransaction(id, replacementHash);

      return replacementHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to replace transaction', {
        description: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   * Enhanced with better error handling for nonce and gas errors
   */
  private async executeTransaction(id: string): Promise<void> {
    const transaction = this.transactions.get(id);
    if (!transaction) return;

    try {
      transaction.status = 'submitted';
      const hash = await transaction.execute();
      transaction.hash = hash;
      transaction.submittedAt = new Date();
      transaction.status = 'submitted';
      
      toast.success('Transaction submitted', {
        description: transaction.description,
        action: {
          label: 'View',
          onClick: () => this.openEtherscan(hash),
        },
      });

      // Start tracking this transaction
      this.trackTransaction(id, hash);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      transaction.status = 'failed';
      transaction.failedAt = new Date();
      transaction.error = errorMessage;
      
      // Handle specific error types
      const isNonceError = this.isNonceError(errorMessage);
      const isGasError = this.isGasError(errorMessage);
      const isInsufficientFundsError = this.isInsufficientFundsError(errorMessage);
      
      // Invalidate nonce cache on nonce errors
      if (isNonceError && transaction.account) {
        nonceManager.invalidateNonce(transaction.account);
      }
      
      const shouldRetry = transaction.retryCount < transaction.maxRetries;
      
      if (shouldRetry) {
        transaction.retryCount++;
        
        // Longer delay for nonce errors to allow mempool to catch up
        const retryDelay = isNonceError ? 5000 : 3000;
        
        toast.warning('Transaction failed, retrying...', {
          description: `${transaction.description} (Attempt ${transaction.retryCount}/${transaction.maxRetries})`,
        });
        
        setTimeout(() => {
          this.executeTransaction(id);
        }, retryDelay);
      } else {
        let errorDescription = errorMessage;
        if (isNonceError) {
          errorDescription = 'Nonce error: Transaction may be stuck. Try canceling pending transactions.';
        } else if (isGasError) {
          errorDescription = 'Gas estimation failed: Transaction would likely revert.';
        } else if (isInsufficientFundsError) {
          errorDescription = 'Insufficient funds: Not enough ETH for gas and value.';
        }
        
        const errorRecovery = getErrorRecovery(new Error(errorDescription));
        toast.error('Transaction failed', {
          description: errorRecovery.message + (errorRecovery.suggestion ? ` ${errorRecovery.suggestion}` : ''),
          duration: 8000,
        });
        
        if (transaction.onFailure) {
          transaction.onFailure(new Error(errorDescription));
        }
      }
    }
  }

  /**
   * Check if error is a nonce-related error
   */
  private isNonceError(errorMessage: string): boolean {
    const lowerMessage = errorMessage.toLowerCase();
    return (
      lowerMessage.includes('nonce') ||
      lowerMessage.includes('replacement transaction underpriced') ||
      lowerMessage.includes('already known')
    );
  }

  /**
   * Check if error is a gas-related error
   */
  private isGasError(errorMessage: string): boolean {
    const lowerMessage = errorMessage.toLowerCase();
    return (
      lowerMessage.includes('gas') ||
      lowerMessage.includes('execution reverted') ||
      lowerMessage.includes('revert')
    );
  }

  /**
   * Check if error is an insufficient funds error
   */
  private isInsufficientFundsError(errorMessage: string): boolean {
    const lowerMessage = errorMessage.toLowerCase();
    return (
      lowerMessage.includes('insufficient funds') ||
      lowerMessage.includes('insufficient balance') ||
      lowerMessage.includes('exceeds balance')
    );
  }

  /**
   * Track transaction status
   */
  private async trackTransaction(id: string, hash: Hash): Promise<void> {
    if (!this.publicClient) return;

    const transaction = this.transactions.get(id);
    if (!transaction) return;

    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        timeout: 120000, // 2 minutes
      });

      if (receipt.status === 'success') {
        transaction.status = 'confirmed';
        transaction.confirmedAt = new Date();
        
        // Invalidate nonce cache on confirmation
        if (transaction.account) {
          nonceManager.invalidateNonce(transaction.account);
        }
        
        toast.success('Transaction confirmed', {
          description: transaction.description,
          action: {
            label: 'View',
            onClick: () => this.openEtherscan(hash),
          },
        });

        if (transaction.onSuccess) {
          transaction.onSuccess();
        }
      } else {
        transaction.status = 'failed';
        transaction.failedAt = new Date();
        transaction.error = 'Transaction reverted';
        
        const errorRecovery = getErrorRecovery(new Error('Transaction reverted'));
        toast.error('Transaction reverted', {
          description: errorRecovery.message + (errorRecovery.suggestion ? ` ${errorRecovery.suggestion}` : ''),
          duration: 8000,
        });

        if (transaction.onFailure) {
          transaction.onFailure(new Error('Transaction reverted'));
        }
      }
    } catch (error) {
      // Timeout or error - keep polling
      console.error('Error tracking transaction:', error);
    }
  }

  /**
   * Start polling for transaction status
   */
  private startPolling(): void {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(() => {
      this.pollTransactions();
    }, this.POLL_INTERVAL);
  }

  /**
   * Poll all submitted transactions
   */
  private async pollTransactions(): void {
    if (!this.publicClient) return;

    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.status === 'submitted' && transaction.hash) {
        try {
          const receipt = await this.publicClient.getTransactionReceipt({
            hash: transaction.hash,
          });

          if (receipt) {
            if (receipt.status === 'success') {
              transaction.status = 'confirmed';
              transaction.confirmedAt = new Date();
              
              if (transaction.onSuccess) {
                transaction.onSuccess();
              }
            } else {
              transaction.status = 'failed';
              transaction.failedAt = new Date();
              transaction.error = 'Transaction reverted';
              
              if (transaction.onFailure) {
                transaction.onFailure(new Error('Transaction reverted'));
              }
            }
          }
        } catch (error) {
          // Transaction not yet mined, continue polling
        }
      }
    }

    // Clean up old confirmed/failed transactions (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, transaction] of this.transactions.entries()) {
      if (
        (transaction.status === 'confirmed' || transaction.status === 'failed') &&
        transaction.confirmedAt &&
        transaction.confirmedAt.getTime() < oneHourAgo
      ) {
        this.transactions.delete(id);
      }
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions(): Transaction[] {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.status === 'pending' || tx.status === 'submitted'
    );
  }

  /**
   * Retry a failed transaction
   */
  async retryTransaction(id: string): Promise<void> {
    const transaction = this.transactions.get(id);
    if (!transaction) return;

    if (transaction.status !== 'failed') {
      toast.error('Can only retry failed transactions');
      return;
    }

    transaction.status = 'pending';
    transaction.retryCount = 0;
    transaction.error = undefined;
    transaction.failedAt = undefined;

    await this.executeTransaction(id);
  }

  /**
   * Clear completed transactions
   */
  clearCompleted(): void {
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.status === 'confirmed' || transaction.status === 'failed') {
        this.transactions.delete(id);
      }
    }
  }

  /**
   * Open transaction on Etherscan
   */
  private openEtherscan(hash: Hash): void {
    if (!this.publicClient) return;
    
    const chainId = this.publicClient.chain?.id || 1;
    const explorerUrl = this.getExplorerUrl(chainId);
    window.open(`${explorerUrl}/tx/${hash}`, '_blank');
  }

  /**
   * Get explorer URL for chain
   */
  private getExplorerUrl(chainId: number): string {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      8453: 'https://basescan.org',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      137: 'https://polygonscan.com',
    };
    return explorers[chainId] || 'https://etherscan.io';
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const transactionManager = new TransactionManager();


