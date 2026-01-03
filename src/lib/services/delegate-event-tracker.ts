/**
 * Delegate Event Tracker
 * Tracks delegates by querying events from ENSNamingDelegateGranular contract
 */

import { PublicClient, Address, Hex } from 'viem';
import { ENS_NAMING_DELEGATE_GRANULAR_ABI } from '../ens/granular-contracts';

export interface DelegateEvent {
  node: Hex;
  delegate: Address;
  operations: bigint;
  expiresAt: bigint;
  timestamp: bigint;
  eventType: 'added' | 'removed' | 'updated' | 'locked' | 'unlocked' | 'enabled' | 'disabled';
}

export class DelegateEventTracker {
  private publicClient: PublicClient | null = null;
  private contractAddress: Address;
  private deploymentBlockCache: bigint | null = null;

  constructor(contractAddress: Address) {
    this.contractAddress = contractAddress;
  }

  setClient(publicClient: PublicClient) {
    this.publicClient = publicClient;
    // Clear cache when client changes (might be different chain)
    this.deploymentBlockCache = null;
  }

  /**
   * Get contract deployment block (first block where contract exists)
   * Uses cached value if available to avoid repeated queries
   */
  private async getContractDeploymentBlock(): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    // Return cached value if available
    if (this.deploymentBlockCache !== null) {
      return this.deploymentBlockCache;
    }

    try {
      // Check if contract exists at current block
      const currentCode = await this.publicClient.getCode({
        address: this.contractAddress,
      });

      if (!currentCode || currentCode === '0x') {
        // Contract doesn't exist - return 0 to query from genesis anyway
        this.deploymentBlockCache = 0n;
        return 0n;
      }

      // For efficiency, start searching from a reasonable point
      // Most contracts are deployed relatively recently, so start from 50% back
      const currentBlock = await this.publicClient.getBlockNumber();
      
      // If chain is very new, just use genesis
      if (currentBlock < 1000n) {
        this.deploymentBlockCache = 0n;
        return 0n;
      }

      // Check if contract exists at a point 50% back
      const midPoint = currentBlock / 2n;
      const midCode = await this.publicClient.getCode({
        address: this.contractAddress,
        blockNumber: midPoint,
      });

      let low: bigint;
      let high: bigint;

      if (midCode && midCode !== '0x') {
        // Contract existed at midpoint, search from genesis to midpoint
        low = 0n;
        high = midPoint;
      } else {
        // Contract didn't exist at midpoint, search from midpoint to current
        low = midPoint;
        high = currentBlock;
      }

      // Binary search for first block with code
      let deploymentBlock = high;
      while (low <= high) {
        const mid = (low + high) / 2n;
        const code = await this.publicClient.getCode({
          address: this.contractAddress,
          blockNumber: mid,
        });

        if (code && code !== '0x') {
          deploymentBlock = mid;
          high = mid - 1n;
        } else {
          low = mid + 1n;
        }
      }

      // Cache the result
      this.deploymentBlockCache = deploymentBlock;
      return deploymentBlock;
    } catch (error) {
      console.warn('Error finding contract deployment block, using fallback:', error);
      // Fallback: use a reasonable default (last 100,000 blocks or genesis)
      const currentBlock = await this.publicClient.getBlockNumber();
      const fallback = currentBlock > 100000n ? currentBlock - 100000n : 0n;
      this.deploymentBlockCache = fallback;
      return fallback;
    }
  }

  /**
   * Get all delegates for a node by querying events
   * Enhanced to query from contract deployment block or genesis
   */
  async getAllDelegates(node: Hex, fromBlock?: bigint): Promise<Address[]> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      
      // Determine start block
      let startBlock: bigint;
      if (fromBlock !== undefined) {
        startBlock = fromBlock;
      } else {
        // Try to get contract deployment block, fallback to last 10,000 blocks
        try {
          const deploymentBlock = await this.getContractDeploymentBlock();
          startBlock = deploymentBlock;
          console.log(`Querying delegate events from block ${startBlock} (contract deployment)`);
        } catch (error) {
          // Fallback to last 10,000 blocks if deployment block detection fails
          startBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;
          console.warn('Using fallback block range:', startBlock);
        }
      }

      // Define event ABIs for viem
      const delegateAddedAbi = [
        {
          type: 'event',
          name: 'DelegateAdded',
          inputs: [
            { name: 'node', type: 'bytes32', indexed: true },
            { name: 'delegate', type: 'address', indexed: true },
            { name: 'operations', type: 'uint256', indexed: false },
            { name: 'expiresAt', type: 'uint256', indexed: false },
          ],
        },
      ] as const;

      const delegateRemovedAbi = [
        {
          type: 'event',
          name: 'DelegateRemoved',
          inputs: [
            { name: 'node', type: 'bytes32', indexed: true },
            { name: 'delegate', type: 'address', indexed: true },
          ],
        },
      ] as const;

      // Query DelegateAdded events with better error handling
      console.log(`Querying DelegateAdded events for node ${node} from block ${startBlock}`);
      const addedEvents = await this.publicClient.getLogs({
        address: this.contractAddress,
        event: delegateAddedAbi[0],
        args: {
          node,
        },
        fromBlock: startBlock,
        toBlock: 'latest',
      }).catch((err) => {
        console.error('Error querying DelegateAdded events:', err);
        // If query fails, try with smaller block range
        if (startBlock < currentBlock - 10000n) {
          console.log('Retrying with smaller block range (last 10,000 blocks)');
          return this.publicClient!.getLogs({
            address: this.contractAddress,
            event: delegateAddedAbi[0],
            args: { node },
            fromBlock: currentBlock > 10000n ? currentBlock - 10000n : 0n,
            toBlock: 'latest',
          }).catch(() => []);
        }
        return [];
      });

      console.log(`Found ${addedEvents.length} DelegateAdded events`);

      // Query DelegateRemoved events with better error handling
      console.log(`Querying DelegateRemoved events for node ${node} from block ${startBlock}`);
      const removedEvents = await this.publicClient.getLogs({
        address: this.contractAddress,
        event: delegateRemovedAbi[0],
        args: {
          node,
        },
        fromBlock: startBlock,
        toBlock: 'latest',
      }).catch((err) => {
        console.error('Error querying DelegateRemoved events:', err);
        // If query fails, try with smaller block range
        if (startBlock < currentBlock - 10000n) {
          console.log('Retrying with smaller block range (last 10,000 blocks)');
          return this.publicClient!.getLogs({
            address: this.contractAddress,
            event: delegateRemovedAbi[0],
            args: { node },
            fromBlock: currentBlock > 10000n ? currentBlock - 10000n : 0n,
            toBlock: 'latest',
          }).catch(() => []);
        }
        return [];
      });

      console.log(`Found ${removedEvents.length} DelegateRemoved events`);

      // Build map of delegates with their latest state
      const delegateMap = new Map<Address, { added: boolean; blockNumber: bigint }>();
      
      // Process DelegateAdded events (later events override earlier ones)
      for (const event of addedEvents) {
        if (event.args && 'delegate' in event.args) {
          const delegate = event.args.delegate as Address;
          const existing = delegateMap.get(delegate);
          if (!existing || event.blockNumber > existing.blockNumber) {
            delegateMap.set(delegate, { added: true, blockNumber: event.blockNumber });
          }
        }
      }

      // Process DelegateRemoved events (later removals override earlier adds)
      for (const event of removedEvents) {
        if (event.args && 'delegate' in event.args) {
          const delegate = event.args.delegate as Address;
          const existing = delegateMap.get(delegate);
          if (!existing || event.blockNumber > existing.blockNumber) {
            delegateMap.set(delegate, { added: false, blockNumber: event.blockNumber });
          }
        }
      }

      // Return only delegates that are currently active (added and not removed)
      const activeDelegates = Array.from(delegateMap.entries())
        .filter(([_, state]) => state.added)
        .map(([delegate]) => delegate);

      console.log(`Found ${activeDelegates.length} active delegates out of ${delegateMap.size} total delegate events`);
      return activeDelegates;
    } catch (error) {
      console.error('Error querying delegate events:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get delegate events for a node
   * Enhanced to query from contract deployment block
   */
  async getDelegateEvents(node: Hex, fromBlock?: bigint): Promise<DelegateEvent[]> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    const currentBlock = await this.publicClient.getBlockNumber();
    
    // Determine start block
    let startBlock: bigint;
    if (fromBlock !== undefined) {
      startBlock = fromBlock;
    } else {
      // Try to get contract deployment block, fallback to last 10,000 blocks
      try {
        const deploymentBlock = await this.getContractDeploymentBlock();
        startBlock = deploymentBlock;
      } catch (error) {
        startBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;
      }
    }

    const events: DelegateEvent[] = [];

    try {
      // Query all delegate-related events
      const logs = await this.publicClient.getLogs({
        address: this.contractAddress,
        event: {
          type: 'event',
          name: 'DelegateAdded',
          inputs: [
            { name: 'node', type: 'bytes32', indexed: true },
            { name: 'delegate', type: 'address', indexed: true },
            { name: 'operations', type: 'uint256', indexed: false },
            { name: 'expiresAt', type: 'uint256', indexed: false },
          ],
        } as const,
        args: {
          node,
        },
        fromBlock: startBlock,
        toBlock: 'latest',
      }).catch(() => []);

      for (const log of logs) {
        if (log.args && 'delegate' in log.args && 'operations' in log.args && 'expiresAt' in log.args) {
          const block = await this.publicClient.getBlock({ blockNumber: log.blockNumber });
          events.push({
            node: log.args.node as Hex,
            delegate: log.args.delegate as Address,
            operations: log.args.operations as bigint,
            expiresAt: log.args.expiresAt as bigint,
            timestamp: BigInt(block.timestamp),
            eventType: 'added',
          });
        }
      }
    } catch (error) {
      console.error('Error querying delegate events:', error);
    }

    return events.sort((a, b) => Number(b.timestamp - a.timestamp));
  }
}

