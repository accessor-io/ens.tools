import { PublicClient, Address, Hex } from 'viem';
import { normalize } from 'viem/ens';
import { namehash } from '../ens/ens-helpers';
import { ENS_REGISTRY_ABI, NAME_WRAPPER_ABI, PUBLIC_RESOLVER_ABI } from '../ens/ens-contracts';
import { ENS_REGISTRY_ADDRESS, NAME_WRAPPER_ADDRESS, ENS_PUBLIC_RESOLVER } from '../ens/ens-write-operations';
import { granularPermissionService, GRANULAR_PERMISSIONS } from '../services/granular-permission-service';

export interface ContractOwnershipInfo {
  owner: Address | null;
  isOwnable: boolean;
  isAccessControl: boolean;
  roles: Record<string, Address[]>;
  isProxy: boolean;
  proxyAdmin: Address | null;
  isSafe: boolean;
  safeOwners: Address[];
  safeThreshold: number;
}

export interface ENSControlInfo {
  node: Hex;
  hasName: boolean;
  existingName: string | null;
  owner: Address | null;
  isWrapped: boolean;
  wrappedOwner: Address | null;
  fuses: number;
  resolver: Address | null;
  hasResolverAuthorization: boolean;
  tokenId: bigint | null;
}

export interface PermissionCheckResult {
  contractAddress: Address;
  contractOwnership: ContractOwnershipInfo;
  ensControl: ENSControlInfo | null;
  canManageENS: boolean;
  recommendation: 'transfer' | 'approval' | 'granular' | 'none';
  safeForManagement: boolean;
  hasGranularPermissions?: boolean;
  granularDelegateAddress?: Address;
  granularPermissions?: bigint;
}

const PROXY_STORAGE_SLOTS = {
  EIP_1967: {
    IMPLEMENTATION: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
    ADMIN: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
  },
  EIP_1822: {
    IMPLEMENTATION: '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7',
  },
};

export class PermissionService {
  async checkContractOwnership(
    publicClient: PublicClient,
    contractAddress: Address
  ): Promise<ContractOwnershipInfo> {
    const OWNER_ABI = [
      {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
      },
    ] as const;

    const ACCESS_CONTROL_ABI = [
      {
        name: 'hasRole',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'role', type: 'bytes32' },
          { name: 'account', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
      {
        name: 'getRoleAdmin',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'role', type: 'bytes32' }],
        outputs: [{ name: '', type: 'bytes32' }],
      },
    ] as const;

    const result: ContractOwnershipInfo = {
      owner: null,
      isOwnable: false,
      isAccessControl: false,
      roles: {},
      isProxy: false,
      proxyAdmin: null,
      isSafe: false,
      safeOwners: [],
      safeThreshold: 0,
    };

    try {
      const code = await publicClient.getBytecode({ address: contractAddress });
      if (!code || code === '0x') {
        return result;
      }

      try {
        const owner = await publicClient.readContract({
          address: contractAddress,
          abi: OWNER_ABI,
          functionName: 'owner',
        });
        result.owner = owner as Address;
        result.isOwnable = true;
      } catch {
        result.isOwnable = false;
      }

      const proxyAdmin = await publicClient.getStorageAt({
        address: contractAddress,
        slot: PROXY_STORAGE_SLOTS.EIP_1967.ADMIN,
      });

      if (proxyAdmin && proxyAdmin !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        result.isProxy = true;
        result.proxyAdmin = `0x${proxyAdmin.slice(-40)}` as Address;
      }

      const gnosisProxyCode = await publicClient.getBytecode({ 
        address: contractAddress 
      });
      
      if (gnosisProxyCode && gnosisProxyCode.includes('0xcf7fff18')) {
        try {
          const safeOwners = await publicClient.readContract({
            address: contractAddress,
            abi: [
              {
                name: 'getOwners',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'address[]' }],
              },
              {
                name: 'getThreshold',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'uint256' }],
              },
            ] as const,
            functionName: 'getOwners',
          });

          const threshold = await publicClient.readContract({
            address: contractAddress,
            abi: [
              {
                name: 'getThreshold',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'uint256' }],
              },
            ] as const,
            functionName: 'getThreshold',
          });

          result.isSafe = true;
          result.safeOwners = safeOwners as Address[];
          result.safeThreshold = Number(threshold);
        } catch {
          result.isSafe = false;
        }
      }
    } catch (error) {
      console.error('Error checking contract ownership:', error);
    }

    return result;
  }

  async checkENSControl(
    publicClient: PublicClient,
    contractAddress: Address,
    suggestedName?: string
  ): Promise<ENSControlInfo | null> {
    try {
      const reverseName = await publicClient.getEnsName({ address: contractAddress });
      
      let existingName = reverseName || null;
      if (suggestedName) {
        existingName = suggestedName;
      }

      if (!existingName) {
        return null;
      }

      const normalizedName = normalize(existingName);
      const node = namehash(normalizedName);

      const resolver = await publicClient.readContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ENS_REGISTRY_ABI,
        functionName: 'resolver',
        args: [node],
      });

      const owner = await publicClient.readContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ENS_REGISTRY_ABI,
        functionName: 'owner',
        args: [node],
      });

      let isWrapped = false;
      let wrappedOwner: Address | null = null;
      let fuses = 0;
      let tokenId: bigint | null = null;

      try {
        const balance = await publicClient.readContract({
          address: NAME_WRAPPER_ADDRESS,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ] as const,
          functionName: 'balanceOf',
          args: [owner as Address, BigInt(node)],
        });

        if (balance > 0n) {
          isWrapped = true;
          wrappedOwner = owner as Address;
          tokenId = BigInt(node);

          try {
            const fusesResult = await publicClient.readContract({
              address: NAME_WRAPPER_ADDRESS,
              abi: NAME_WRAPPER_ABI,
              functionName: 'getFuses',
              args: [node],
            });
            fuses = Number(fusesResult);
          } catch {
            fuses = 0;
          }
        }
      } catch {
        isWrapped = false;
      }

      let hasResolverAuthorization = false;
      if (resolver && resolver !== '0x0000000000000000000000000000000000000000') {
        try {
          const hasAuth = await publicClient.readContract({
            address: resolver as Address,
            abi: [
              {
                name: 'isAuthorised',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'node', type: 'bytes32' }],
                outputs: [{ name: '', type: 'bool' }],
              },
            ] as const,
            functionName: 'isAuthorised',
            args: [node],
          });
          hasResolverAuthorization = hasAuth as boolean;
        } catch {
          hasResolverAuthorization = false;
        }
      }

      return {
        node,
        hasName: true,
        existingName: normalizedName,
        owner: owner as Address,
        isWrapped,
        wrappedOwner,
        fuses,
        resolver: resolver as Address,
        hasResolverAuthorization,
        tokenId,
      };
    } catch (error) {
      console.error('Error checking ENS control:', error);
      return null;
    }
  }

  async checkPermissions(
    publicClient: PublicClient,
    contractAddress: Address,
    managerAddress: Address,
    suggestedName?: string,
    granularDelegateAddress?: Address
  ): Promise<PermissionCheckResult> {
    const contractOwnership = await this.checkContractOwnership(publicClient, contractAddress);
    const ensControl = await this.checkENSControl(publicClient, contractAddress, suggestedName);

    let canManageENS = false;
    let recommendation: 'transfer' | 'approval' | 'granular' | 'none' = 'none';
    let safeForManagement = false;
    let hasGranularPermissions = false;
    let granularPermissions: bigint | undefined;

    // Check for granular permissions if delegate address is provided
    if (granularDelegateAddress && ensControl?.node) {
      try {
        granularPermissionService.setClients(publicClient);
        const permissions = await granularPermissionService.getPermissions(
          ensControl.node as Hex,
          granularDelegateAddress
        );
        if (permissions > 0n) {
          hasGranularPermissions = true;
          granularPermissions = permissions;
          recommendation = 'granular';
          canManageENS = true;
        }
      } catch (error) {
        console.error('Error checking granular permissions:', error);
      }
    }

    if (ensControl) {
      if (ensControl.isWrapped) {
        canManageENS = ensControl.wrappedOwner?.toLowerCase() === managerAddress.toLowerCase();
        if (!hasGranularPermissions) {
          recommendation = canManageENS ? 'transfer' : 'approval';
        }
        safeForManagement = !contractOwnership.isSafe && contractOwnership.isOwnable;
      } else {
        canManageENS = ensControl.owner?.toLowerCase() === managerAddress.toLowerCase();
        if (!hasGranularPermissions) {
          recommendation = canManageENS ? 'transfer' : 'none';
        }
        safeForManagement = !contractOwnership.isSafe && contractOwnership.isOwnable;
      }
    } else {
      if (!hasGranularPermissions) {
        recommendation = 'none';
      }
      safeForManagement = contractOwnership.isOwnable || contractOwnership.isAccessControl;
    }

    if (contractOwnership.isSafe) {
      safeForManagement = true;
      canManageENS = contractOwnership.safeOwners.includes(managerAddress);
    }

    return {
      contractAddress,
      contractOwnership,
      ensControl,
      canManageENS,
      recommendation,
      safeForManagement,
      hasGranularPermissions,
      granularDelegateAddress: hasGranularPermissions ? granularDelegateAddress : undefined,
      granularPermissions,
    };
  }

  /**
   * Check if a delegate has a specific granular permission
   */
  async checkGranularPermission(
    publicClient: PublicClient,
    node: Hex,
    delegate: Address,
    requiredPermission: bigint
  ): Promise<boolean> {
    try {
      granularPermissionService.setClients(publicClient);
      return await granularPermissionService.isAuthorizedDelegate(node, delegate, requiredPermission);
    } catch (error) {
      console.error('Error checking granular permission:', error);
      return false;
    }
  }
}

export const permissionService = new PermissionService();

