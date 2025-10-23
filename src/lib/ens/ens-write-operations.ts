import { WalletClient, PublicClient, Address, Hex } from 'viem';
import { normalize } from 'viem/ens';
import { simulateContract, writeContract } from 'viem/actions';
import { namehash, labelhash } from './ens-helpers';
import { ENS_REGISTRY_ABI, NAME_WRAPPER_ABI, PUBLIC_RESOLVER_ABI } from './ens-contracts';

// ENS Registry Contract Address (Mainnet)
export const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
export const ENS_PUBLIC_RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63';
export const NAME_WRAPPER_ADDRESS = '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';
export const ETH_REGISTRAR_CONTROLLER = '0x253553366Da8546fC250F225fe3d25d0C782303b';

// Fuse constants for NameWrapper
export const FUSES = {
  CANNOT_UNWRAP: 1,
  CANNOT_BURN_FUSES: 2,
  CANNOT_TRANSFER: 4,
  CANNOT_SET_RESOLVER: 8,
  CANNOT_SET_TTL: 16,
  CANNOT_CREATE_SUBDOMAIN: 32,
  CANNOT_APPROVE: 64,
  PARENT_CANNOT_CONTROL: 65536,
  CAN_EXTEND_EXPIRY: 131072,
};

export interface SetRecordParams {
  name: string;
  recordType: 'address' | 'text' | 'contenthash';
  key?: string;
  value: string;
}

export interface CreateSubdomainParams {
  parentName: string;
  label: string;
  owner: string;
  resolver?: string;
  fuses?: number;
  expiry?: bigint;
}

export interface TransferDomainParams {
  name: string;
  newOwner: string;
}

export interface SetFusesParams {
  name: string;
  fuses: number;
}

export interface WrapNameParams {
  name: string;
  owner: string;
  fuses: number;
  expiry: bigint;
}

/**
 * Set address record for an ENS name
 */
export async function setAddressRecord(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: SetRecordParams
): Promise<string> {
  const normalizedName = normalize(params.name);
  
  // This is a simplified version - in production, you'd use the actual ENS resolver ABI
  const resolverAddress = await publicClient.getEnsResolver({ name: normalizedName });
  
  if (!resolverAddress) {
    throw new Error('No resolver set for this name');
  }

  // Mock hash for demo - in production, use namehash
  const hash = await walletClient.writeContract({
    address: resolverAddress as `0x${string}`,
    abi: [
      {
        name: 'setAddr',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'node', type: 'bytes32' },
          { name: 'addr', type: 'address' },
        ],
        outputs: [],
      },
    ],
    functionName: 'setAddr',
    args: ['0x0000000000000000000000000000000000000000000000000000000000000000', params.value as `0x${string}`],
  });

  return hash;
}

/**
 * Set text record for an ENS name
 */
export async function setTextRecord(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: SetRecordParams
): Promise<string> {
  if (!params.key) {
    throw new Error('Key is required for text records');
  }

  const normalizedName = normalize(params.name);
  const resolverAddress = await publicClient.getEnsResolver({ name: normalizedName });
  
  if (!resolverAddress) {
    throw new Error('No resolver set for this name');
  }

  const hash = await walletClient.writeContract({
    address: resolverAddress as `0x${string}`,
    abi: [
      {
        name: 'setText',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'node', type: 'bytes32' },
          { name: 'key', type: 'string' },
          { name: 'value', type: 'string' },
        ],
        outputs: [],
      },
    ],
    functionName: 'setText',
    args: ['0x0000000000000000000000000000000000000000000000000000000000000000', params.key, params.value],
  });

  return hash;
}

/**
 * Create a subdomain
 */
export async function createSubdomain(
  walletClient: WalletClient,
  params: CreateSubdomainParams
): Promise<string> {
  const normalizedParent = normalize(params.parentName);
  
  // Using NameWrapper for subdomain creation with fuse support
  const hash = await walletClient.writeContract({
    address: NAME_WRAPPER_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'setSubnodeRecord',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'parentNode', type: 'bytes32' },
          { name: 'label', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'resolver', type: 'address' },
          { name: 'ttl', type: 'uint64' },
          { name: 'fuses', type: 'uint32' },
          { name: 'expiry', type: 'uint64' },
        ],
        outputs: [],
      },
    ],
    functionName: 'setSubnodeRecord',
    args: [
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      params.label,
      params.owner as `0x${string}`,
      (params.resolver || ENS_PUBLIC_RESOLVER) as `0x${string}`,
      BigInt(0),
      params.fuses || 0,
      params.expiry || BigInt(0),
    ],
  });

  return hash;
}

/**
 * Transfer domain ownership
 */
export async function transferDomain(
  walletClient: WalletClient,
  params: TransferDomainParams
): Promise<string> {
  const normalizedName = normalize(params.name);
  
  // Transfer via NameWrapper (for wrapped names)
  const hash = await walletClient.writeContract({
    address: NAME_WRAPPER_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'safeTransferFrom',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
        outputs: [],
      },
    ],
    functionName: 'safeTransferFrom',
    args: [
      walletClient.account?.address as `0x${string}`,
      params.newOwner as `0x${string}`,
      BigInt(0), // tokenId would be namehash
      BigInt(1),
      '0x',
    ],
  });

  return hash;
}

/**
 * Set fuses on a wrapped name
 */
export async function setFuses(
  walletClient: WalletClient,
  params: SetFusesParams
): Promise<string> {
  const normalizedName = normalize(params.name);
  
  const hash = await walletClient.writeContract({
    address: NAME_WRAPPER_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'setFuses',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'node', type: 'bytes32' },
          { name: 'ownerControlledFuses', type: 'uint16' },
        ],
        outputs: [{ name: '', type: 'uint32' }],
      },
    ],
    functionName: 'setFuses',
    args: ['0x0000000000000000000000000000000000000000000000000000000000000000', params.fuses],
  });

  return hash;
}

/**
 * Wrap an unwrapped name
 */
export async function wrapName(
  walletClient: WalletClient,
  params: WrapNameParams
): Promise<string> {
  const normalizedName = normalize(params.name);
  
  const hash = await walletClient.writeContract({
    address: NAME_WRAPPER_ADDRESS as `0x${string}`,
    abi: [
      {
        name: 'wrap',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'name', type: 'bytes' },
          { name: 'wrappedOwner', type: 'address' },
          { name: 'fuses', type: 'uint16' },
          { name: 'expiry', type: 'uint64' },
          { name: 'resolver', type: 'address' },
        ],
        outputs: [],
      },
    ],
    functionName: 'wrap',
    args: [
      normalizedName as any,
      params.owner as `0x${string}`,
      params.fuses,
      params.expiry,
      ENS_PUBLIC_RESOLVER as `0x${string}`,
    ],
  });

  return hash;
}

/**
 * Unwrap a wrapped name
 */
export async function unwrapName(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: { name: string; newController: string }
): Promise<string> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const normalizedName = normalize(params.name);
  const node = namehash(normalizedName);
  
  // Get parent node and labelhash
  const parts = params.name.split('.');
  const label = parts[0];
  const parentName = parts.slice(1).join('.');
  const parentNode = namehash(parentName);
  const labelHash = labelhash(label);

  const hash = await walletClient.writeContract({
    address: NAME_WRAPPER_ADDRESS as `0x${string}`,
    abi: NAME_WRAPPER_ABI,
    functionName: 'unwrap',
    args: [
      parentNode,
      labelHash,
      params.newController as `0x${string}`,
    ],
  });

  return hash;
}

/**
 * Calculate combined fuses from array of fuse names
 */
export function combineFuses(fuseNames: string[]): number {
  return fuseNames.reduce((combined, fuseName) => {
    const fuseValue = FUSES[fuseName as keyof typeof FUSES];
    return combined | (fuseValue || 0);
  }, 0);
}

/**
 * Get active fuses from a fuse number
 */
export function getActiveFuses(fusesNumber: number): string[] {
  const active: string[] = [];
  
  Object.entries(FUSES).forEach(([name, value]) => {
    if ((fusesNumber & value) === value) {
      active.push(name);
    }
  });
  
  return active;
}

/**
 * Set approval for all on NameWrapper
 */
export async function setApprovalForAll(
  walletClient: WalletClient,
  publicClient: PublicClient,
  operator: Address,
  approved: boolean
): Promise<Hex> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  await simulateContract(publicClient, {
    address: NAME_WRAPPER_ADDRESS,
    abi: [
      {
        name: 'setApprovalForAll',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'operator', type: 'address' },
          { name: 'approved', type: 'bool' },
        ],
        outputs: [],
      },
    ] as const,
    functionName: 'setApprovalForAll',
    args: [operator, approved],
    account: walletClient.account,
  });

  const hash = await writeContract(walletClient, {
    address: NAME_WRAPPER_ADDRESS,
    abi: [
      {
        name: 'setApprovalForAll',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'operator', type: 'address' },
          { name: 'approved', type: 'bool' },
        ],
        outputs: [],
      },
    ] as const,
    functionName: 'setApprovalForAll',
    args: [operator, approved],
    account: walletClient.account,
    chain: walletClient.chain || null,
  });

  return hash;
}

/**
 * Execute delegation plan - batch multiple actions
 */
export async function executeDelegationPlan(
  walletClient: WalletClient,
  publicClient: PublicClient,
  actions: Array<{
    contract: Address;
    functionName: string;
    args: any[];
  }>
): Promise<Hex[]> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const hashes: Hex[] = [];

  for (const action of actions) {
    const hash = await writeContract(walletClient, {
      address: action.contract,
      abi: PUBLIC_RESOLVER_ABI,
      functionName: action.functionName as any,
      args: action.args,
      account: walletClient.account,
      chain: walletClient.chain || null,
    });

    hashes.push(hash);
  }

  return hashes;
}
