/**
 * Transaction Builder
 * Optimizes and batches ENS operations to reduce gas costs and transaction count
 */

import { WalletClient, PublicClient, Address, Hex, encodeFunctionData, decodeFunctionResult } from 'viem';
import { normalize } from 'viem/ens';
import { simulateContract, writeContract } from 'viem/actions';
import { namehash } from './ens-helpers';
import { PUBLIC_RESOLVER_ABI, ENS_REGISTRY_ABI, NAME_WRAPPER_ABI } from './ens-contracts';
import { getEnsAddresses } from './ens-addresses';

// Multicall3 ABI for batching operations
const MULTICALL3_ABI = [
  {
    name: 'aggregate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'blockNumber', type: 'uint256' },
      { name: 'returnData', type: 'bytes[]' },
    ],
  },
  {
    name: 'aggregate3',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
      },
    ],
  },
] as const;

export interface TextRecordOperation {
  type: 'setText';
  name: string;
  key: string;
  value: string;
}

export interface AddressRecordOperation {
  type: 'setAddress';
  name: string;
  coinType?: number; // Default: 60 (Ethereum)
  address: Address;
}

export interface SubdomainOperation {
  type: 'createSubdomain';
  parentName: string;
  label: string;
  owner: Address;
  resolver?: Address;
  fuses?: number;
  expiry?: bigint;
}

export interface TransferOperation {
  type: 'transfer';
  name: string;
  newOwner: Address;
}

export type ENSOperation = TextRecordOperation | AddressRecordOperation | SubdomainOperation | TransferOperation;

export interface BatchOperation {
  operations: ENSOperation[];
  description?: string;
}

export class TransactionBuilder {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private operations: ENSOperation[] = [];
  private feeOperations: Array<{ type: string; params: any }> = [];

  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  /**
   * Add a text record operation
   */
  addTextRecord(name: string, key: string, value: string): this {
    this.operations.push({
      type: 'setText',
      name,
      key,
      value,
    });
    return this;
  }

  /**
   * Add multiple text records for the same domain
   */
  addTextRecords(name: string, records: Record<string, string>): this {
    for (const [key, value] of Object.entries(records)) {
      if (value) {
        this.addTextRecord(name, key, value);
      }
    }
    return this;
  }

  /**
   * Add an address record operation
   */
  addAddressRecord(name: string, address: Address, coinType: number = 60): this {
    this.operations.push({
      type: 'setAddress',
      name,
      coinType,
      address,
    });
    return this;
  }

  /**
   * Add a subdomain creation operation
   */
  addSubdomain(params: {
    parentName: string;
    label: string;
    owner: Address;
    resolver?: Address;
    fuses?: number;
    expiry?: bigint;
  }): this {
    this.operations.push({
      type: 'createSubdomain',
      ...params,
    });
    return this;
  }

  /**
   * Add a transfer operation
   */
  addTransfer(name: string, newOwner: Address): this {
    this.operations.push({
      type: 'transfer',
      name,
      newOwner,
    });
    return this;
  }

  /**
   * Add a fee payment operation (separate transaction)
   */
  addFeePayment(type: string, params: any): this {
    this.feeOperations.push({ type, params });
    return this;
  }

  /**
   * Clear all operations
   */
  clear(): this {
    this.operations = [];
    this.feeOperations = [];
    return this;
  }

  /**
   * Get operation count
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Build and execute batched transactions
   * Groups operations by resolver/contract to minimize transactions
   */
  async execute(): Promise<Hex[]> {
    if (!this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const hashes: Hex[] = [];

    // Step 1: Execute fee payments first (if any)
    for (const feeOp of this.feeOperations) {
      // Fee payments are separate transactions
      // This would call feeCollectionService methods
      // For now, we'll skip as they're handled separately
    }

    // Step 2: Group operations by type and contract
    const grouped = this.groupOperations();

    // Store operation count before clearing
    const operationCount = this.operations.length;

    // Step 3: Execute grouped operations
    for (const group of grouped) {
      if (group.operations.length === 1) {
        // Single operation - execute directly
        const hash = await this.executeSingleOperation(group.operations[0]);
        hashes.push(hash);
      } else {
        // Multiple operations - batch using multicall
        const hash = await this.executeBatch(group);
        hashes.push(hash);
      }
    }

    this.clear();
    return hashes;
  }

  /**
   * Group operations by resolver/contract to optimize batching
   */
  private groupOperations(): Array<{ resolver: Address; operations: ENSOperation[] }> {
    const groups = new Map<Address, ENSOperation[]>();
    const chainId = this.publicClient.chain?.id || 1;
    const addresses = getEnsAddresses(chainId as any);

    for (const op of this.operations) {
      let resolver: Address;
      let contract: Address;

      if (op.type === 'setText' || op.type === 'setAddress') {
        // These need resolver - we'll resolve it during execution
        // For now, group by operation type
        resolver = addresses?.publicResolver || '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63' as Address;
      } else if (op.type === 'createSubdomain') {
        contract = addresses?.nameWrapper || '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401' as Address;
        resolver = contract;
      } else if (op.type === 'transfer') {
        contract = addresses?.registry || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address;
        resolver = contract;
      } else {
        continue;
      }

      if (!groups.has(resolver)) {
        groups.set(resolver, []);
      }
      groups.get(resolver)!.push(op);
    }

    return Array.from(groups.entries()).map(([resolver, operations]) => ({
      resolver,
      operations,
    }));
  }

  /**
   * Execute a single operation
   */
  private async executeSingleOperation(op: ENSOperation): Promise<Hex> {
    const chainId = await this.publicClient.getChainId();
    const addresses = getEnsAddresses(chainId as any);

    switch (op.type) {
      case 'setText': {
        const normalizedName = normalize(op.name);
        const resolverAddress = await this.publicClient.getEnsResolver({ name: normalizedName });
        if (!resolverAddress) {
          throw new Error(`No resolver set for ${op.name}`);
        }
        const node = namehash(normalizedName);
        return await writeContract(this.walletClient, {
          address: resolverAddress as Address,
          abi: PUBLIC_RESOLVER_ABI,
          functionName: 'setText',
          args: [node, op.key, op.value],
          account: this.walletClient.account,
        });
      }

      case 'setAddress': {
        const normalizedName = normalize(op.name);
        const resolverAddress = await this.publicClient.getEnsResolver({ name: normalizedName });
        if (!resolverAddress) {
          throw new Error(`No resolver set for ${op.name}`);
        }
        const node = namehash(normalizedName);
        const addressBytes = op.address.slice(2).toLowerCase();
        return await writeContract(this.walletClient, {
          address: resolverAddress as Address,
          abi: PUBLIC_RESOLVER_ABI,
          functionName: 'setAddr',
          args: [node, BigInt(op.coinType || 60), `0x${addressBytes}` as `0x${string}`],
          account: this.walletClient.account,
        });
      }

      case 'createSubdomain': {
        const nameWrapper = addresses?.nameWrapper || '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401' as Address;
        return await writeContract(this.walletClient, {
          address: nameWrapper,
          abi: NAME_WRAPPER_ABI,
          functionName: 'setSubnodeRecord',
          args: [
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            op.label,
            op.owner,
            op.resolver || addresses?.publicResolver || '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
            BigInt(0),
            op.fuses || 0,
            op.expiry || BigInt(0),
          ],
          account: this.walletClient.account,
        });
      }

      case 'transfer': {
        const registry = addresses?.registry || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address;
        const normalizedName = normalize(op.name);
        const node = namehash(normalizedName);
        return await writeContract(this.walletClient, {
          address: registry,
          abi: ENS_REGISTRY_ABI,
          functionName: 'setOwner',
          args: [node, op.newOwner],
          account: this.walletClient.account,
        });
      }
    }
  }

  /**
   * Execute a batch of operations using multicall
   * Groups operations by resolver to minimize resolver lookups
   */
  private async executeBatch(group: { resolver: Address; operations: ENSOperation[] }): Promise<Hex> {
    const chainId = await this.publicClient.getChainId();
    const addresses = getEnsAddresses(chainId as any);
    const multicallAddress = addresses?.multicall3 || '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;

    // Group operations by resolver to batch resolver lookups
    const resolverGroups = new Map<string, ENSOperation[]>();
    
    for (const op of group.operations) {
      if (op.type === 'setText' || op.type === 'setAddress') {
        const key = op.name;
        if (!resolverGroups.has(key)) {
          resolverGroups.set(key, []);
        }
        resolverGroups.get(key)!.push(op);
      } else {
        // Non-resolver operations go in a separate group
        const key = `_${op.type}`;
        if (!resolverGroups.has(key)) {
          resolverGroups.set(key, []);
        }
        resolverGroups.get(key)!.push(op);
      }
    }

    // Resolve all resolvers in parallel
    const resolverMap = new Map<string, Address>();
    for (const [domainName] of resolverGroups) {
      if (!domainName.startsWith('_')) {
        const normalizedName = normalize(domainName);
        const resolverAddress = await this.publicClient.getEnsResolver({ name: normalizedName });
        if (!resolverAddress) {
          throw new Error(`No resolver set for ${domainName}`);
        }
        resolverMap.set(domainName, resolverAddress as Address);
      }
    }

    // Build calls array
    const calls: Array<{ target: Address; allowFailure: boolean; callData: Hex }> = [];

    for (const [key, ops] of resolverGroups) {
      for (const op of ops) {
        let target: Address;
        let callData: Hex;

        switch (op.type) {
          case 'setText': {
            const normalizedName = normalize(op.name);
            const node = namehash(normalizedName);
            target = resolverMap.get(op.name)!;
            callData = encodeFunctionData({
              abi: PUBLIC_RESOLVER_ABI,
              functionName: 'setText',
              args: [node, op.key, op.value],
            });
            break;
          }

          case 'setAddress': {
            const normalizedName = normalize(op.name);
            const node = namehash(normalizedName);
            const addressBytes = op.address.slice(2).toLowerCase();
            target = resolverMap.get(op.name)!;
            callData = encodeFunctionData({
              abi: PUBLIC_RESOLVER_ABI,
              functionName: 'setAddr',
              args: [node, BigInt(op.coinType || 60), `0x${addressBytes}` as `0x${string}`],
            });
            break;
          }

          case 'createSubdomain': {
            const nameWrapper = addresses?.nameWrapper || '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401' as Address;
            target = nameWrapper;
            callData = encodeFunctionData({
              abi: NAME_WRAPPER_ABI,
              functionName: 'setSubnodeRecord',
              args: [
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                op.label,
                op.owner,
                op.resolver || addresses?.publicResolver || '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
                BigInt(0),
                op.fuses || 0,
                op.expiry || BigInt(0),
              ],
            });
            break;
          }

          case 'transfer': {
            const registry = addresses?.registry || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address;
            const normalizedName = normalize(op.name);
            const node = namehash(normalizedName);
            target = registry;
            callData = encodeFunctionData({
              abi: ENS_REGISTRY_ABI,
              functionName: 'setOwner',
              args: [node, op.newOwner],
            });
            break;
          }
        }

        calls.push({
          target,
          allowFailure: false,
          callData,
        });
      }
    }

    // If only one call, execute directly (more efficient)
    if (calls.length === 1) {
      const singleOp = group.operations[0];
      return await this.executeSingleOperation(singleOp);
    }

    // Check if all operations are on the same resolver - use resolver's multicall
    const allSameResolver = calls.every(call => {
      const firstTarget = calls[0].target;
      return call.target.toLowerCase() === firstTarget.toLowerCase();
    });

    if (allSameResolver && group.operations.every(op => op.type === 'setText' || op.type === 'setAddress')) {
      // Use resolver's built-in multicall (more efficient)
      const resolverAddress = calls[0].target;
      const callDataArray = calls.map(call => call.callData);

      await simulateContract(this.publicClient, {
        address: resolverAddress,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: 'multicall',
        args: [callDataArray],
        account: this.walletClient.account,
      });

      return await writeContract(this.walletClient, {
        address: resolverAddress,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: 'multicall',
        args: [callDataArray],
        account: this.walletClient.account,
      });
    }

    // Execute multicall for multiple operations
    await simulateContract(this.publicClient, {
      address: multicallAddress,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      args: [calls],
      account: this.walletClient.account,
    });

    return await writeContract(this.walletClient, {
      address: multicallAddress,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      args: [calls],
      account: this.walletClient.account,
    });
  }

  /**
   * Estimate total gas for all operations
   */
  async estimateGas(): Promise<bigint> {
    const grouped = this.groupOperations();
    let totalGas = 0n;

    for (const group of grouped) {
      if (group.operations.length === 1) {
        // Estimate single operation
        try {
          const op = group.operations[0];
          const gas = await this.estimateSingleOperation(op);
          totalGas += gas;
        } catch (error) {
          console.warn('Failed to estimate gas for operation:', error);
          totalGas += 100000n; // Fallback estimate
        }
      } else {
        // Estimate batch
        try {
          const gas = await this.estimateBatch(group);
          totalGas += gas;
        } catch (error) {
          console.warn('Failed to estimate batch gas:', error);
          totalGas += 200000n * BigInt(group.operations.length); // Fallback estimate
        }
      }
    }

    return totalGas;
  }

  /**
   * Estimate gas for a single operation
   */
  private async estimateSingleOperation(op: ENSOperation): Promise<bigint> {
    // This would estimate gas for the operation
    // For now, return a default estimate
    return 100000n;
  }

  /**
   * Estimate gas for a batch
   */
  private async estimateBatch(group: { resolver: Address; operations: ENSOperation[] }): Promise<bigint> {
    const chainId = await this.publicClient.getChainId();
    const addresses = getEnsAddresses(chainId as any);
    const multicallAddress = addresses?.multicall3 || '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;

    // Build calls (same as executeBatch)
    const calls: Array<{ target: Address; allowFailure: boolean; callData: Hex }> = [];
    
    for (const op of group.operations) {
      // Build call data (simplified - same logic as executeBatch)
      // ... (implementation similar to executeBatch)
    }

    try {
      const gas = await this.publicClient.estimateGas({
        account: this.walletClient.account?.address,
        to: multicallAddress,
        data: encodeFunctionData({
          abi: MULTICALL3_ABI,
          functionName: 'aggregate3',
          args: [calls],
        }),
      });
      return gas;
    } catch (error) {
      // Fallback: estimate based on operation count
      return 50000n + (100000n * BigInt(group.operations.length));
    }
  }
}

/**
 * Batch set multiple text records efficiently
 */
export async function batchSetTextRecords(
  walletClient: WalletClient,
  publicClient: PublicClient,
  records: Array<{ name: string; key: string; value: string }>
): Promise<Hex> {
  const builder = new TransactionBuilder(publicClient, walletClient);
  
  for (const record of records) {
    builder.addTextRecord(record.name, record.key, record.value);
  }

  const hashes = await builder.execute();
  return hashes[0]; // Return first hash (should be only one for batched operations)
}

/**
 * Batch set text records for a single domain
 */
export async function batchSetTextRecordsForDomain(
  walletClient: WalletClient,
  publicClient: PublicClient,
  name: string,
  records: Record<string, string>
): Promise<Hex> {
  const builder = new TransactionBuilder(publicClient, walletClient);
  builder.addTextRecords(name, records);
  const hashes = await builder.execute();
  return hashes[0];
}

/**
 * Batch set address records
 */
export async function batchSetAddressRecords(
  walletClient: WalletClient,
  publicClient: PublicClient,
  records: Array<{ name: string; address: Address; coinType?: number }>
): Promise<Hex> {
  const builder = new TransactionBuilder(publicClient, walletClient);
  
  for (const record of records) {
    builder.addAddressRecord(record.name, record.address, record.coinType);
  }

  const hashes = await builder.execute();
  return hashes[0];
}

