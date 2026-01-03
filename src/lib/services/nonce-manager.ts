/**
 * Nonce Manager
 * Handles nonce tracking and reservation for concurrent transactions
 * Based on patterns from Mastering Ethereum 2nd Edition
 */

import { Address, PublicClient } from 'viem';

export class NonceManager {
  private nonceMap: Map<Address, number> = new Map();
  private nonceLocks: Map<Address, Promise<number>> = new Map();
  private publicClient: PublicClient | null = null;

  setPublicClient(publicClient: PublicClient) {
    this.publicClient = publicClient;
  }

  /**
   * Get the next nonce for an address, including pending transactions
   * Uses 'pending' block tag to include transactions in mempool
   */
  async getNextNonce(address: Address): Promise<number> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    // Query with 'pending' to include transactions in mempool
    const nonce = await this.publicClient.getTransactionCount({
      address,
      blockTag: 'pending',
    });

    // Cache the nonce
    this.nonceMap.set(address, nonce);
    return nonce;
  }

  /**
   * Reserve a nonce for a transaction
   * Prevents concurrent transactions from using the same nonce
   */
  async reserveNonce(address: Address): Promise<number> {
    // Wait for any pending nonce reservation for this address
    const existingLock = this.nonceLocks.get(address);
    if (existingLock) {
      await existingLock;
    }

    // Create new reservation promise
    const reservationPromise = this.getNextNonce(address);
    this.nonceLocks.set(address, reservationPromise);

    try {
      const nonce = await reservationPromise;
      return nonce;
    } finally {
      // Remove lock after reservation completes
      this.nonceLocks.delete(address);
    }
  }

  /**
   * Get cached nonce for an address
   */
  getCachedNonce(address: Address): number | undefined {
    return this.nonceMap.get(address);
  }

  /**
   * Invalidate cached nonce (e.g., after transaction confirmation)
   */
  invalidateNonce(address: Address): void {
    this.nonceMap.delete(address);
  }

  /**
   * Clear all cached nonces
   */
  clear(): void {
    this.nonceMap.clear();
    this.nonceLocks.clear();
  }
}

export const nonceManager = new NonceManager();
