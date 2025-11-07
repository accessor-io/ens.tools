/**
 * Transaction Manager Service
 * Handles transaction queue, status tracking, and execution
 */

import { Hash, Address, PublicClient, WalletClient } from 'viem';
import { toast } from 'sonner';

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
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
  execute: () => Promise<Hash>;
}

export interface TransactionOptions {
  description: string;
  maxRetries?: number;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
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
  }

  /**
   * Add a transaction to the queue
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
   * Execute a transaction
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
      transaction.status = 'failed';
      transaction.failedAt = new Date();
      transaction.error = error instanceof Error ? error.message : 'Unknown error';
      
      const shouldRetry = transaction.retryCount < transaction.maxRetries;
      
      if (shouldRetry) {
        transaction.retryCount++;
        toast.warning('Transaction failed, retrying...', {
          description: `${transaction.description} (Attempt ${transaction.retryCount}/${transaction.maxRetries})`,
        });
        
        // Retry after delay
        setTimeout(() => {
          this.executeTransaction(id);
        }, 3000);
      } else {
        toast.error('Transaction failed', {
          description: transaction.error,
        });
        
        if (transaction.onFailure) {
          transaction.onFailure(new Error(transaction.error));
        }
      }
    }
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
        
        toast.error('Transaction reverted', {
          description: transaction.description,
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

