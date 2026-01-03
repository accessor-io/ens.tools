/**
 * Unit Tests for DelegateEventTracker
 * Tests event tracking logic without requiring a deployed contract
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPublicClient, http, Address, Hex } from 'viem';
import { mainnet } from 'viem/chains';
import { DelegateEventTracker } from '../delegate-event-tracker';

// Mock viem public client
const createMockPublicClient = () => {
  return {
    getBlockNumber: vi.fn(),
    getCode: vi.fn(),
    getLogs: vi.fn(),
    getBlock: vi.fn(),
  } as any;
};

describe('DelegateEventTracker', () => {
  let tracker: DelegateEventTracker;
  let mockClient: ReturnType<typeof createMockPublicClient>;
  const contractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as Address;
  const testNode = '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae' as Hex;

  beforeEach(() => {
    tracker = new DelegateEventTracker(contractAddress);
    mockClient = createMockPublicClient();
    tracker.setClient(mockClient as any);
  });

  describe('Contract Deployment Block Detection', () => {
    it('should cache deployment block after first detection', async () => {
      mockClient.getCode.mockResolvedValue('0x1234');
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      
      // First call - should query
      const trackerAny = tracker as any;
      const block1 = await trackerAny.getContractDeploymentBlock();
      
      // Second call - should use cache
      const block2 = await trackerAny.getContractDeploymentBlock();
      
      expect(block1).toBe(block2);
      expect(mockClient.getCode).toHaveBeenCalled();
    });

    it('should return 0n if contract does not exist', async () => {
      mockClient.getCode.mockResolvedValue('0x');
      
      const trackerAny = tracker as any;
      const block = await trackerAny.getContractDeploymentBlock();
      
      expect(block).toBe(0n);
    });

    it('should use binary search to find deployment block', async () => {
      const currentBlock = 1000000n;
      mockClient.getBlockNumber.mockResolvedValue(currentBlock);
      
      // Contract exists at block 500000
      mockClient.getCode.mockImplementation(({ blockNumber }: { blockNumber?: bigint }) => {
        if (!blockNumber || blockNumber >= 500000n) {
          return Promise.resolve('0x1234');
        }
        return Promise.resolve('0x');
      });
      
      const trackerAny = tracker as any;
      const block = await trackerAny.getContractDeploymentBlock();
      
      expect(block).toBeGreaterThanOrEqual(500000n);
      expect(block).toBeLessThanOrEqual(1000000n);
    });

    it('should fallback to last 100k blocks on error', async () => {
      mockClient.getCode.mockRejectedValue(new Error('RPC error'));
      mockClient.getBlockNumber.mockResolvedValue(2000000n);
      
      const trackerAny = tracker as any;
      const block = await trackerAny.getContractDeploymentBlock();
      
      expect(block).toBe(1900000n); // 2000000 - 100000
    });
  });

  describe('getAllDelegates', () => {
    it('should return empty array if no events found', async () => {
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getCode.mockResolvedValue('0x1234');
      mockClient.getLogs.mockResolvedValue([]);
      
      const delegates = await tracker.getAllDelegates(testNode);
      
      expect(delegates).toEqual([]);
    });

    it('should return active delegates from events', async () => {
      const delegate1 = '0x1111111111111111111111111111111111111111' as Address;
      const delegate2 = '0x2222222222222222222222222222222222222222' as Address;
      
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getCode.mockResolvedValue('0x1234');
      
      // Mock DelegateAdded events
      mockClient.getLogs.mockImplementation(({ event }: any) => {
        if (event.name === 'DelegateAdded') {
          return Promise.resolve([
            {
              args: { node: testNode, delegate: delegate1, operations: 1n, expiresAt: 0n },
              blockNumber: 1000n,
            },
            {
              args: { node: testNode, delegate: delegate2, operations: 2n, expiresAt: 0n },
              blockNumber: 2000n,
            },
          ]);
        }
        return Promise.resolve([]); // DelegateRemoved events
      });
      
      const delegates = await tracker.getAllDelegates(testNode);
      
      expect(delegates).toHaveLength(2);
      expect(delegates).toContain(delegate1);
      expect(delegates).toContain(delegate2);
    });

    it('should exclude removed delegates', async () => {
      const delegate1 = '0x1111111111111111111111111111111111111111' as Address;
      const delegate2 = '0x2222222222222222222222222222222222222222' as Address;
      
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getCode.mockResolvedValue('0x1234');
      
      // Mock events: delegate1 added, delegate2 added, delegate1 removed
      mockClient.getLogs.mockImplementation(({ event }: any) => {
        if (event.name === 'DelegateAdded') {
          return Promise.resolve([
            {
              args: { node: testNode, delegate: delegate1, operations: 1n, expiresAt: 0n },
              blockNumber: 1000n,
            },
            {
              args: { node: testNode, delegate: delegate2, operations: 2n, expiresAt: 0n },
              blockNumber: 2000n,
            },
          ]);
        }
        if (event.name === 'DelegateRemoved') {
          return Promise.resolve([
            {
              args: { node: testNode, delegate: delegate1 },
              blockNumber: 3000n, // Removed after delegate2 was added
            },
          ]);
        }
        return Promise.resolve([]);
      });
      
      const delegates = await tracker.getAllDelegates(testNode);
      
      expect(delegates).toHaveLength(1);
      expect(delegates).toContain(delegate2);
      expect(delegates).not.toContain(delegate1);
    });

    it('should handle later add events overriding earlier removes', async () => {
      const delegate1 = '0x1111111111111111111111111111111111111111' as Address;
      
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getCode.mockResolvedValue('0x1234');
      
      // Mock events: add, remove, add again (should be active)
      mockClient.getLogs.mockImplementation(({ event }: any) => {
        if (event.name === 'DelegateAdded') {
          return Promise.resolve([
            {
              args: { node: testNode, delegate: delegate1, operations: 1n, expiresAt: 0n },
              blockNumber: 1000n,
            },
            {
              args: { node: testNode, delegate: delegate1, operations: 2n, expiresAt: 0n },
              blockNumber: 4000n, // Added again after removal
            },
          ]);
        }
        if (event.name === 'DelegateRemoved') {
          return Promise.resolve([
            {
              args: { node: testNode, delegate: delegate1 },
              blockNumber: 2000n, // Removed
            },
          ]);
        }
        return Promise.resolve([]);
      });
      
      const delegates = await tracker.getAllDelegates(testNode);
      
      expect(delegates).toHaveLength(1);
      expect(delegates).toContain(delegate1);
    });

    it('should retry with smaller block range on error', async () => {
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getCode.mockResolvedValue('0x1234');
      
      // First call fails, retry succeeds with smaller range
      // Note: getAllDelegates queries both DelegateAdded and DelegateRemoved events
      mockClient.getLogs
        .mockRejectedValueOnce(new Error('Query too large')) // First DelegateAdded query fails
        .mockResolvedValueOnce([]) // Retry DelegateAdded query succeeds
        .mockResolvedValueOnce([]); // DelegateRemoved query succeeds
      
      const delegates = await tracker.getAllDelegates(testNode);
      
      expect(delegates).toEqual([]);
      // Should be called 3 times: DelegateAdded (fail), DelegateAdded (retry), DelegateRemoved
      expect(mockClient.getLogs).toHaveBeenCalledTimes(3);
    });

    it('should use provided fromBlock if specified', async () => {
      const customFromBlock = 500000n;
      
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getLogs.mockResolvedValue([]);
      
      await tracker.getAllDelegates(testNode, customFromBlock);
      
      expect(mockClient.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: customFromBlock,
        })
      );
    });
  });

  describe('getDelegateEvents', () => {
    it('should return events sorted by timestamp (newest first)', async () => {
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getCode.mockResolvedValue('0x1234');
      
      const delegate1 = '0x1111111111111111111111111111111111111111' as Address;
      
      mockClient.getLogs.mockResolvedValue([
        {
          args: { node: testNode, delegate: delegate1, operations: 1n, expiresAt: 0n },
          blockNumber: 1000n,
        },
        {
          args: { node: testNode, delegate: delegate1, operations: 2n, expiresAt: 0n },
          blockNumber: 2000n,
        },
      ]);
      
      mockClient.getBlock.mockImplementation(({ blockNumber }: { blockNumber: bigint }) => {
        return Promise.resolve({
          timestamp: blockNumber * 12n, // Simulate timestamp
        });
      });
      
      const events = await tracker.getDelegateEvents(testNode);
      
      expect(events).toHaveLength(2);
      // Events are sorted by timestamp (newest first), so first event should have later timestamp
      expect(events[0].timestamp).toBeGreaterThan(events[1].timestamp);
    });

    it('should include all event properties', async () => {
      mockClient.getBlockNumber.mockResolvedValue(1000000n);
      mockClient.getCode.mockResolvedValue('0x1234');
      
      const delegate1 = '0x1111111111111111111111111111111111111111' as Address;
      
      mockClient.getLogs.mockResolvedValue([
        {
          args: {
            node: testNode,
            delegate: delegate1,
            operations: 5n,
            expiresAt: 1000000n,
          },
          blockNumber: 1000n,
        },
      ]);
      
      mockClient.getBlock.mockResolvedValue({
        timestamp: 1234567890n,
      });
      
      const events = await tracker.getDelegateEvents(testNode);
      
      expect(events[0]).toMatchObject({
        node: testNode,
        delegate: delegate1,
        operations: 5n,
        expiresAt: 1000000n,
        timestamp: 1234567890n,
        eventType: 'added',
      });
    });
  });

  describe('Error Handling', () => {
    it('should return empty array on error in getAllDelegates', async () => {
      mockClient.getBlockNumber.mockRejectedValue(new Error('Network error'));
      
      const delegates = await tracker.getAllDelegates(testNode);
      
      expect(delegates).toEqual([]);
    });

    it('should clear deployment block cache when client changes', () => {
      const newClient = createMockPublicClient();
      
      // Set initial client and cache
      tracker.setClient(mockClient as any);
      const trackerAny = tracker as any;
      trackerAny.deploymentBlockCache = 1000n;
      
      // Change client
      tracker.setClient(newClient as any);
      
      expect(trackerAny.deploymentBlockCache).toBeNull();
    });
  });
});
