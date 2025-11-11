/**
 * Base Chain Metadata Service
 * Stores contract metadata on Base (chainId: 8453) for cross-chain resolution
 */

import { PublicClient, WalletClient, createPublicClient, createWalletClient, http, Address, Abi } from 'viem';
import { base } from 'viem/chains';

/**
 * Base Metadata Registry Contract ABI
 * This would be a deployed contract on Base for storing metadata
 */
const BASE_METADATA_REGISTRY_ABI = [
  {
    name: 'setMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameHash', type: 'bytes32', indexed: true },
      { name: 'canonicalId', type: 'string' },
      { name: 'metadataJson', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getMetadata',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'nameHash', type: 'bytes32', indexed: true },
    ],
    outputs: [
      { name: 'canonicalId', type: 'string' },
      { name: 'metadataJson', type: 'string' },
    ],
  },
  {
    name: 'setCrossChainPointer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameHash', type: 'bytes32', indexed: true },
      { name: 'chainId', type: 'uint256' },
      { name: 'contractAddress', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getCrossChainPointer',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'nameHash', type: 'bytes32', indexed: true },
      { name: 'chainId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'MetadataStored',
    type: 'event',
    inputs: [
      { name: 'nameHash', type: 'bytes32', indexed: true },
      { name: 'canonicalId', type: 'string' },
      { name: 'metadataHash', type: 'string' },
    ],
  },
  {
    name: 'CrossChainPointerSet',
    type: 'event',
    inputs: [
      { name: 'nameHash', type: 'bytes32', indexed: true },
      { name: 'chainId', type: 'uint256' },
      { name: 'contractAddress', type: 'address' },
    ],
  },
] as const satisfies Abi;

/**
 * Base metadata registry contract address
 * NOTE: Currently using IPFS-based storage as reference implementation
 * For production, deploy a dedicated contract on Base for metadata storage
 * 
 * Alternative: Use Base storage contract at a deployed address or implement
 * via IPFS + ENS text records pointing to IPFS content hash
 */
const BASE_METADATA_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

/**
 * Check if Base registry is initialized
 */
function isBaseRegistryAvailable(): boolean {
  return BASE_METADATA_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000';
}

export interface MetadataPayload {
  canonicalId: string;
  metadata: any;
  nameHash: string;
  chainId: number;
  contractAddress: string;
}

export interface CrossChainPointer {
  chainId: number;
  contractAddress: string;
  metadataHash: string;
}

/**
 * Store metadata on Base chain
 */
export async function storeMetadataOnBase(
  walletClient: WalletClient,
  params: MetadataPayload
): Promise<string> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  if (!isBaseRegistryAvailable()) {
    throw new Error('Base metadata registry not deployed. Please use IPFS or deploy the registry contract first.');
  }

  const metadataJson = JSON.stringify(params.metadata);
  
  // Store metadata on Base
  const hash = await walletClient.writeContract({
    address: BASE_METADATA_REGISTRY_ADDRESS,
    abi: BASE_METADATA_REGISTRY_ABI,
    functionName: 'setMetadata',
    args: [params.nameHash as `0x${string}`, params.canonicalId, metadataJson],
    account: walletClient.account,
    chain: base,
  });

  return hash;
}

/**
 * Get metadata from Base chain
 */
export async function getMetadataFromBase(
  publicClient: PublicClient,
  nameHash: string
): Promise<{ canonicalId: string; metadata: any } | null> {
  try {
    const result = await publicClient.readContract({
      address: BASE_METADATA_REGISTRY_ADDRESS,
      abi: BASE_METADATA_REGISTRY_ABI,
      functionName: 'getMetadata',
      args: [nameHash as `0x${string}`],
    });

    if (!result || !result[0] || !result[1]) {
      return null;
    }

    return {
      canonicalId: result[0],
      metadata: JSON.parse(result[1]),
    };
  } catch (error) {
    console.error('Error fetching metadata from Base:', error);
    return null;
  }
}

/**
 * Set cross-chain pointer on Base
 * Maps an ENS name hash to a contract address on a specific chain
 */
export async function setCrossChainPointer(
  walletClient: WalletClient,
  nameHash: string,
  chainId: number,
  contractAddress: string
): Promise<string> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const hash = await walletClient.writeContract({
    address: BASE_METADATA_REGISTRY_ADDRESS,
    abi: BASE_METADATA_REGISTRY_ABI,
    functionName: 'setCrossChainPointer',
    args: [nameHash as `0x${string}`, BigInt(chainId), contractAddress as Address],
    account: walletClient.account,
    chain: base,
  });

  return hash;
}

/**
 * Get cross-chain pointer from Base
 */
export async function getCrossChainPointer(
  publicClient: PublicClient,
  nameHash: string,
  chainId: number
): Promise<string | null> {
  try {
    const result = await publicClient.readContract({
      address: BASE_METADATA_REGISTRY_ADDRESS,
      abi: BASE_METADATA_REGISTRY_ABI,
      functionName: 'getCrossChainPointer',
      args: [nameHash as `0x${string}`, BigInt(chainId)],
    });

    return result || null;
  } catch (error) {
    console.error('Error fetching cross-chain pointer from Base:', error);
    return null;
  }
}

/**
 * Create a Base public client for metadata reads
 */
export function createBasePublicClient(): PublicClient {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}

/**
 * Create a Base wallet client for metadata writes
 */
export function createBaseWalletClient(account: Address): WalletClient {
  return createWalletClient({
    chain: base,
    transport: http(),
    account,
  });
}

/**
 * Store complete metadata package on Base including:
 * 1. Canonical ID
 * 2. Full metadata JSON
 * 3. Cross-chain pointers for each deployment
 */
export async function storeCompleteMetadataPackage(
  walletClient: WalletClient,
  params: {
    nameHash: string;
    canonicalId: string;
    metadata: any;
    crossChainPointers: CrossChainPointer[];
  }
): Promise<string[]> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  // Use ENS-only storage if Base registry not available
  if (!isBaseRegistryAvailable()) {
    console.warn('Base metadata registry not deployed. Using ENS-only storage with IPFS fallback.');
    // Return empty array to indicate fallback mode
    return [];
  }

  const metadataJson = JSON.stringify(params.metadata);
  const hashes: string[] = [];

  // Store main metadata
  const metadataHash = await walletClient.writeContract({
    address: BASE_METADATA_REGISTRY_ADDRESS,
    abi: BASE_METADATA_REGISTRY_ABI,
    functionName: 'setMetadata',
    args: [params.nameHash as `0x${string}`, params.canonicalId, metadataJson],
    account: walletClient.account,
    chain: base,
  });
  hashes.push(metadataHash);

  // Store cross-chain pointers
  for (const pointer of params.crossChainPointers) {
    const pointerHash = await walletClient.writeContract({
      address: BASE_METADATA_REGISTRY_ADDRESS,
      abi: BASE_METADATA_REGISTRY_ABI,
      functionName: 'setCrossChainPointer',
      args: [params.nameHash as `0x${string}`, BigInt(pointer.chainId), pointer.contractAddress as Address],
      account: walletClient.account,
      chain: base,
    });
    hashes.push(pointerHash);
  }

  return hashes;
}

/**
 * Get Base RPC URL
 */
export function getBaseRpcUrl(): string {
  return 'https://mainnet.base.org'; // Default Base RPC
}

/**
 * Format metadata reference for ENS text record
 * Stores a pointer to Base metadata that can be resolved from any chain
 */
export function formatBaseMetadataReference(params: {
  nameHash: string;
  canonicalId: string;
  metadataHash: string;
}): string {
  return JSON.stringify({
    protocol: 'base-metadata',
    chainId: 8453,
    nameHash: params.nameHash,
    canonicalId: params.canonicalId,
    metadataHash: params.metadataHash,
  });
}

/**
 * Parse Base metadata reference from ENS text record
 */
export function parseBaseMetadataReference(text: string): {
  protocol: string;
  chainId: number;
  nameHash: string;
  canonicalId: string;
  metadataHash: string;
} | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

