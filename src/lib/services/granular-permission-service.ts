/**
 * Granular Permission Service
 * Service layer for interacting with ENSNamingDelegateGranular contract
 * Implements ENSIP GNA (Granular Name Assignment) specification
 */

import { PublicClient, WalletClient, Address, Hex, encodeFunctionData } from 'viem';
import { namehash } from '../ens/ens-helpers';

// Permission constants matching ENSNamingDelegateGranular.sol
export const GRANULAR_PERMISSIONS = {
  MANAGE_SUBDOMAINS: 1n << 0n,      // 1
  SET_ADDR_RECORD: 1n << 1n,       // 2
  SET_TEXT_RECORD: 1n << 2n,       // 4
  SET_CONTENT_HASH: 1n << 3n,      // 8
  SET_PUBKEY: 1n << 4n,            // 16
  SET_ABI: 1n << 5n,               // 32
  SET_ZONEHASH: 1n << 6n,          // 64
  SET_TTL: 1n << 7n,               // 128
  SET_RESOLVER: 1n << 8n,          // 256
  SET_OWNER: 1n << 9n,             // 512
  SET_FUSES: 1n << 10n,            // 1024
} as const;

// Permission labels for UI
export const PERMISSION_LABELS: Record<string, string> = {
  MANAGE_SUBDOMAINS: 'Manage Subdomains',
  SET_ADDR_RECORD: 'Set Address Records',
  SET_TEXT_RECORD: 'Set Text Records',
  SET_CONTENT_HASH: 'Set Content Hash',
  SET_PUBKEY: 'Set Public Key',
  SET_ABI: 'Set ABI',
  SET_ZONEHASH: 'Set Zone Hash',
  SET_TTL: 'Set TTL',
  SET_RESOLVER: 'Set Resolver',
  SET_OWNER: 'Set Owner',
  SET_FUSES: 'Set Fuses',
};

// Permission descriptions
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  MANAGE_SUBDOMAINS: 'Create and manage subdomains (setSubnodeOwner, setSubnodeRecord)',
  SET_ADDR_RECORD: 'Set address records for any coin type (setAddr)',
  SET_TEXT_RECORD: 'Set text records for any key (setText)',
  SET_CONTENT_HASH: 'Set content hash (setContenthash)',
  SET_PUBKEY: 'Set public key (setPubkey)',
  SET_ABI: 'Set ABI data (setABI)',
  SET_ZONEHASH: 'Set zone hash (setZonehash)',
  SET_TTL: 'Set TTL (setTTL)',
  SET_RESOLVER: 'Set resolver address (setResolver)',
  SET_OWNER: 'Set owner (Registry operations)',
  SET_FUSES: 'Set fuses (NameWrapper operations)',
};

export interface DelegatePermission {
  allowedOperations: bigint;
  expiresAt: bigint;
  enabled: boolean;
  locked: boolean;
  createdAt: bigint;
  createdBy: Address;
}

export interface DelegateInfo {
  address: Address;
  permission: DelegatePermission;
  permissions: string[]; // Human-readable permission names
}

export interface AddDelegateParams {
  node: Hex;
  delegate: Address;
  operations: bigint;
  expiresAt: bigint; // 0 for no expiration
}

export interface UpdateDelegateParams {
  node: Hex;
  delegate: Address;
  operations: bigint;
  expiresAt: bigint;
}

// ENSNamingDelegateGranular ABI
const ENS_NAMING_DELEGATE_GRANULAR_ABI = [
  {
    name: 'addDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'operations', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'removeDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'updateDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'operations', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'lockDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'unlockDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'enableDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'disableDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'isAuthorizedDelegate',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'requiredOperation', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'hasPermission',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'permission', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getPermissions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getDelegateInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'allowedOperations', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'enabled', type: 'bool' },
          { name: 'locked', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'createdBy', type: 'address' },
        ],
      },
    ],
  },
  {
    name: 'isEmergencyPaused',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getMaxDelegationDuration',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'emergencyPause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'paused', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'setMaxDelegationDuration',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'maxDuration', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'toggleWhitelist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'toggleBlacklist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'updateWhitelist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'added', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'updateBlacklist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'added', type: 'bool' },
    ],
    outputs: [],
  },
] as const;

export class GranularPermissionService {
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private contractAddress: Address;
  private eventTracker: DelegateEventTracker;

  constructor(contractAddress: Address) {
    this.contractAddress = contractAddress;
    this.eventTracker = new DelegateEventTracker(contractAddress);
  }

  setClients(publicClient: PublicClient, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    if (walletClient) {
      this.walletClient = walletClient;
    }
    this.eventTracker.setClient(publicClient);
  }

  /**
   * Get all delegates for a node using event tracking
   */
  async getAllDelegates(node: Hex): Promise<Address[]> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }
    return await this.eventTracker.getAllDelegates(node);
  }

  /**
   * Get all delegate info for a node
   */
  async getAllDelegateInfo(node: Hex): Promise<DelegateInfo[]> {
    if (!this.publicClient) {
      throw new Error('Public client not set');
    }

    const delegates = await this.getAllDelegates(node);
    const delegateInfo: DelegateInfo[] = [];

    for (const delegate of delegates) {
      try {
        const info = await this.getDelegateInfo(node, delegate);
        const permissions = parsePermissions(info.allowedOperations);
        delegateInfo.push({
          address: delegate,
          permissions,
          expiresAt: info.expiresAt,
          enabled: info.enabled,
          locked: info.locked,
        });
      } catch (error) {
        console.error(`Error getting info for delegate ${delegate}:`, error);
      }
    }

    return delegateInfo;
  }

  /**
   * Add a delegate with specific permissions
   */
  async addDelegate(params: AddDelegateParams): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'addDelegate',
        args: [params.node, params.delegate, params.operations, params.expiresAt],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error adding delegate:', error);
      throw error;
    }
  }

  /**
   * Remove a delegate
   */
  async removeDelegate(node: Hex, delegate: Address): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'removeDelegate',
        args: [node, delegate],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error removing delegate:', error);
      throw error;
    }
  }

  /**
   * Update delegate permissions
   */
  async updateDelegate(params: UpdateDelegateParams): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'updateDelegate',
        args: [params.node, params.delegate, params.operations, params.expiresAt],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error updating delegate:', error);
      throw error;
    }
  }

  /**
   * Check if a delegate is authorized for a specific operation
   */
  async isAuthorizedDelegate(
    node: Hex,
    delegate: Address,
    requiredOperation: bigint
  ): Promise<boolean> {
    if (!this.publicClient) {
      return false;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'isAuthorizedDelegate',
        args: [node, delegate, requiredOperation],
      });

      return result as boolean;
    } catch (error) {
      console.error('Error checking authorization:', error);
      return false;
    }
  }

  /**
   * Get delegate information
   */
  async getDelegateInfo(node: Hex, delegate: Address): Promise<DelegatePermission | null> {
    if (!this.publicClient) {
      return null;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'getDelegateInfo',
        args: [node, delegate],
      });

      const [allowedOperations, expiresAt, enabled, locked, createdAt, createdBy] = result as [
        bigint,
        bigint,
        boolean,
        boolean,
        bigint,
        Address,
      ];

      return {
        allowedOperations,
        expiresAt,
        enabled,
        locked,
        createdAt,
        createdBy,
      };
    } catch (error) {
      console.error('Error getting delegate info:', error);
      return null;
    }
  }

  /**
   * Get permissions for a delegate
   */
  async getPermissions(node: Hex, delegate: Address): Promise<bigint> {
    if (!this.publicClient) {
      return 0n;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'getPermissions',
        args: [node, delegate],
      });

      return result as bigint;
    } catch (error) {
      console.error('Error getting permissions:', error);
      return 0n;
    }
  }

  /**
   * Parse permissions bitmask into human-readable array
   */
  parsePermissions(permissions: bigint): string[] {
    const permissionNames: string[] = [];
    const entries = Object.entries(GRANULAR_PERMISSIONS);

    for (const [name, value] of entries) {
      if ((permissions & value) === value) {
        permissionNames.push(name);
      }
    }

    return permissionNames;
  }

  /**
   * Build permissions bitmask from permission names
   */
  buildPermissions(permissionNames: string[]): bigint {
    let permissions = 0n;

    for (const name of permissionNames) {
      const value = GRANULAR_PERMISSIONS[name as keyof typeof GRANULAR_PERMISSIONS];
      if (value) {
        permissions |= value;
      }
    }

    return permissions;
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): Array<{ name: string; value: bigint; label: string; description: string }> {
    return Object.entries(GRANULAR_PERMISSIONS).map(([name, value]) => ({
      name,
      value,
      label: PERMISSION_LABELS[name] || name,
      description: PERMISSION_DESCRIPTIONS[name] || '',
    }));
  }

  /**
   * Check if node is emergency paused
   */
  async isEmergencyPaused(node: Hex): Promise<boolean> {
    if (!this.publicClient) {
      return false;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'isEmergencyPaused',
        args: [node],
      });

      return result as boolean;
    } catch (error) {
      console.error('Error checking emergency pause:', error);
      return false;
    }
  }

  /**
   * Get maximum delegation duration for a node
   */
  async getMaxDelegationDuration(node: Hex): Promise<bigint> {
    if (!this.publicClient) {
      return 0n;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'getMaxDelegationDuration',
        args: [node],
      });

      return result as bigint;
    } catch (error) {
      console.error('Error getting max delegation duration:', error);
      return 0n;
    }
  }

  /**
   * Lock a delegate (prevents removal)
   */
  async lockDelegate(node: Hex, delegate: Address): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'lockDelegate',
        args: [node, delegate],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error locking delegate:', error);
      throw error;
    }
  }

  /**
   * Unlock a delegate
   */
  async unlockDelegate(node: Hex, delegate: Address): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'unlockDelegate',
        args: [node, delegate],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error unlocking delegate:', error);
      throw error;
    }
  }

  /**
   * Enable a delegate
   */
  async enableDelegate(node: Hex, delegate: Address): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'enableDelegate',
        args: [node, delegate],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error enabling delegate:', error);
      throw error;
    }
  }

  /**
   * Disable a delegate
   */
  async disableDelegate(node: Hex, delegate: Address): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'disableDelegate',
        args: [node, delegate],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error disabling delegate:', error);
      throw error;
    }
  }

  /**
   * Emergency pause a node
   */
  async emergencyPause(node: Hex, paused: boolean): Promise<string> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!this.walletClient.account) {
      throw new Error('No account available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ENS_NAMING_DELEGATE_GRANULAR_ABI,
        functionName: 'emergencyPause',
        args: [node, paused],
        account: this.walletClient.account,
      });

      return hash;
    } catch (error) {
      console.error('Error setting emergency pause:', error);
      throw error;
    }
  }
}

// Default instance - should be configured with deployed contract address
export const granularPermissionService = new GranularPermissionService(
  '0x0000000000000000000000000000000000000000' as Address
);

