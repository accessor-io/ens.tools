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

  constructor(contractAddress: Address) {
    this.contractAddress = contractAddress;
  }

  setClient(publicClient: PublicClient) {
    this.publicClient = publicClient;
  }

  /**
   * Get all delegates for a node by querying events
   */
  async getAllDelegates(node: Hex, fromBlock?: bigint): Promise<Address[]> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const startBlock = fromBlock || (currentBlock > 10000n ? currentBlock - 10000n : 0n);

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

      // Query DelegateAdded events
      const addedEvents = await this.publicClient.getLogs({
        address: this.contractAddress,
        event: delegateAddedAbi[0],
        args: {
          node,
        },
        fromBlock: startBlock,
        toBlock: 'latest',
      }).catch((err) => {
        console.warn('Error querying DelegateAdded events:', err);
        return [];
      });

      // Query DelegateRemoved events
      const removedEvents = await this.publicClient.getLogs({
        address: this.contractAddress,
        event: delegateRemovedAbi[0],
        args: {
          node,
        },
        fromBlock: startBlock,
        toBlock: 'latest',
      }).catch((err) => {
        console.warn('Error querying DelegateRemoved events:', err);
        return [];
      });

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
      return Array.from(delegateMap.entries())
        .filter(([_, state]) => state.added)
        .map(([delegate]) => delegate);
    } catch (error) {
      console.error('Error querying delegate events:', error);
      return [];
    }
  }

  /**
   * Get delegate events for a node
   */
  async getDelegateEvents(node: Hex, fromBlock?: bigint): Promise<DelegateEvent[]> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    const currentBlock = await this.publicClient.getBlockNumber();
    const startBlock = fromBlock || (currentBlock - 10000n);

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

