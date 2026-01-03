/**
 * Enhanced Delegate Event Tracker
 * Tracks delegates with real-time WebSocket support and improved event handling
 * Based on viem patterns and best practices
 */

import { PublicClient, Address, Hex, createPublicClient, webSocket, http, WatchEventReturnType } from 'viem';
import { mainnet } from 'viem/chains';
import { ENS_NAMING_DELEGATE_GRANULAR_ABI } from '../ens/granular-contracts';

export interface DelegateEvent {
  node: Hex;
  delegate: Address;
  operations: bigint;
  expiresAt: bigint;
  timestamp: bigint;
  blockNumber: bigint;
  transactionHash: Hex;
  eventType: 'added' | 'removed' | 'updated' | 'locked' | 'unlocked' | 'enabled' | 'disabled';
}

export interface DelegateState {
  delegate: Address;
  operations: bigint;
  expiresAt: bigint;
  addedAt: bigint;
  removedAt?: bigint;
  isActive: boolean;
}

export class EnhancedDelegateEventTracker {
  private publicClient: PublicClient | null = null;
  private wsClient: PublicClient | null = null;
  private contractAddress: Address;
  private eventWatchers: Map<string, WatchEventReturnType> = new Map();
  private delegateCache: Map<Hex, Map<Address, DelegateState>> = new Map();

  constructor(contractAddress: Address) {
    this.contractAddress = contractAddress;
  }

  /**
   * Set HTTP client for historical queries
   */
  setClient(publicClient: PublicClient) {
    this.publicClient = publicClient;
  }

  /**
   * Set WebSocket client for real-time event listening
   */
  setWebSocketClient(wsUrl: string) {
    this.wsClient = createPublicClient({
      chain: mainnet,
      transport: webSocket(wsUrl),
    });
  }

  /**
   * Get all delegates for a node by querying historical events
   * Enhanced with better error handling and caching
   */
  async getAllDelegates(node: Hex, fromBlock?: bigint): Promise<Address[]> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    // Check cache first
    const cached = this.delegateCache.get(node);
    if (cached) {
      return Array.from(cached.entries())
        .filter(([_, state]) => state.isActive)
        .map(([delegate]) => delegate);
    }

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const startBlock = fromBlock || (currentBlock > 10000n ? currentBlock - 10000n : 0n);

      // Query all delegate events
      const [addedEvents, removedEvents] = await Promise.all([
        this.queryDelegateAddedEvents(node, startBlock),
        this.queryDelegateRemovedEvents(node, startBlock),
      ]);

      // Build delegate state map
      const delegateMap = this.buildDelegateStateMap(addedEvents, removedEvents);

      // Cache the results
      this.delegateCache.set(node, delegateMap);

      // Return active delegates
      return Array.from(delegateMap.entries())
        .filter(([_, state]) => state.isActive)
        .map(([delegate]) => delegate);
    } catch (error) {
      console.error('Error querying delegate events:', error);
      return [];
    }
  }

  /**
   * Query DelegateAdded events
   */
  private async queryDelegateAddedEvents(node: Hex, fromBlock: bigint) {
    if (!this.publicClient) return [];

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

    try {
      return await this.publicClient.getLogs({
        address: this.contractAddress,
        event: delegateAddedAbi[0],
        args: { node },
        fromBlock,
        toBlock: 'latest',
      });
    } catch (error) {
      console.warn('Error querying DelegateAdded events:', error);
      return [];
    }
  }

  /**
   * Query DelegateRemoved events
   */
  private async queryDelegateRemovedEvents(node: Hex, fromBlock: bigint) {
    if (!this.publicClient) return [];

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

    try {
      return await this.publicClient.getLogs({
        address: this.contractAddress,
        event: delegateRemovedAbi[0],
        args: { node },
        fromBlock,
        toBlock: 'latest',
      });
    } catch (error) {
      console.warn('Error querying DelegateRemoved events:', error);
      return [];
    }
  }

  /**
   * Build delegate state map from events
   */
  private buildDelegateStateMap(
    addedEvents: any[],
    removedEvents: any[]
  ): Map<Address, DelegateState> {
    const delegateMap = new Map<Address, DelegateState>();

    // Process all events in chronological order
    const allEvents = [
      ...addedEvents.map(e => ({ ...e, type: 'added' as const })),
      ...removedEvents.map(e => ({ ...e, type: 'removed' as const })),
    ].sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber < b.blockNumber ? -1 : 1;
      }
      return a.logIndex < b.logIndex ? -1 : 1;
    });

    // Process events chronologically
    for (const event of allEvents) {
      if (!event.args || !('delegate' in event.args)) continue;

      const delegate = event.args.delegate as Address;
      const existing = delegateMap.get(delegate);

      if (event.type === 'added' && event.args && 'operations' in event.args && 'expiresAt' in event.args) {
        delegateMap.set(delegate, {
          delegate,
          operations: event.args.operations as bigint,
          expiresAt: event.args.expiresAt as bigint,
          addedAt: event.blockNumber,
          isActive: true,
        });
      } else if (event.type === 'removed') {
        if (existing) {
          delegateMap.set(delegate, {
            ...existing,
            removedAt: event.blockNumber,
            isActive: false,
          });
        } else {
          // Removed without being added (shouldn't happen, but handle gracefully)
          delegateMap.set(delegate, {
            delegate,
            operations: 0n,
            expiresAt: 0n,
            addedAt: 0n,
            removedAt: event.blockNumber,
            isActive: false,
          });
        }
      }
    }

    return delegateMap;
  }

  /**
   * Watch for new delegate events in real-time using WebSocket
   */
  watchDelegateEvents(
    node: Hex,
    onEvent: (event: DelegateEvent) => void
  ): () => void {
    if (!this.wsClient) {
      throw new Error('WebSocket client not set');
    }

    const watchKey = `${node}-delegate-events`;

    // Stop existing watcher if any
    const existingWatcher = this.eventWatchers.get(watchKey);
    if (existingWatcher) {
      existingWatcher();
    }

    // Watch DelegateAdded events
    const addedWatcher = this.wsClient.watchEvent({
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
      args: { node },
      onLogs: async (logs) => {
        for (const log of logs) {
          if (log.args && 'delegate' in log.args && 'operations' in log.args && 'expiresAt' in log.args) {
            const block = await this.wsClient!.getBlock({ blockNumber: log.blockNumber });
            const event: DelegateEvent = {
              node: log.args.node as Hex,
              delegate: log.args.delegate as Address,
              operations: log.args.operations as bigint,
              expiresAt: log.args.expiresAt as bigint,
              timestamp: BigInt(block.timestamp),
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              eventType: 'added',
            };
            onEvent(event);
            this.updateCache(node, event);
          }
        }
      },
    });

    // Watch DelegateRemoved events
    const removedWatcher = this.wsClient.watchEvent({
      address: this.contractAddress,
      event: {
        type: 'event',
        name: 'DelegateRemoved',
        inputs: [
          { name: 'node', type: 'bytes32', indexed: true },
          { name: 'delegate', type: 'address', indexed: true },
        ],
      } as const,
      args: { node },
      onLogs: async (logs) => {
        for (const log of logs) {
          if (log.args && 'delegate' in log.args) {
            const block = await this.wsClient!.getBlock({ blockNumber: log.blockNumber });
            const event: DelegateEvent = {
              node: log.args.node as Hex,
              delegate: log.args.delegate as Address,
              operations: 0n,
              expiresAt: 0n,
              timestamp: BigInt(block.timestamp),
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              eventType: 'removed',
            };
            onEvent(event);
            this.updateCache(node, event);
          }
        }
      },
    });

    // Store watchers
    this.eventWatchers.set(watchKey, () => {
      addedWatcher();
      removedWatcher();
    });

    // Return cleanup function
    return () => {
      addedWatcher();
      removedWatcher();
      this.eventWatchers.delete(watchKey);
    };
  }

  /**
   * Update cache when new event is received
   */
  private updateCache(node: Hex, event: DelegateEvent) {
    let nodeCache = this.delegateCache.get(node);
    if (!nodeCache) {
      nodeCache = new Map();
      this.delegateCache.set(node, nodeCache);
    }

    const existing = nodeCache.get(event.delegate);

    if (event.eventType === 'added') {
      nodeCache.set(event.delegate, {
        delegate: event.delegate,
        operations: event.operations,
        expiresAt: event.expiresAt,
        addedAt: event.blockNumber,
        isActive: true,
      });
    } else if (event.eventType === 'removed') {
      if (existing) {
        nodeCache.set(event.delegate, {
          ...existing,
          removedAt: event.blockNumber,
          isActive: false,
        });
      }
    }
  }

  /**
   * Get delegate state for a specific delegate
   */
  getDelegateState(node: Hex, delegate: Address): DelegateState | null {
    const nodeCache = this.delegateCache.get(node);
    return nodeCache?.get(delegate) || null;
  }

  /**
   * Clear cache for a node
   */
  clearCache(node?: Hex) {
    if (node) {
      this.delegateCache.delete(node);
    } else {
      this.delegateCache.clear();
    }
  }

  /**
   * Stop all event watchers
   */
  stopAllWatchers() {
    for (const [key, watcher] of this.eventWatchers.entries()) {
      watcher();
      this.eventWatchers.delete(key);
    }
  }
}
