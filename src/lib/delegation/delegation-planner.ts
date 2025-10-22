import { Address, Hex, encodeFunctionData } from 'viem';
import { PublicClient } from 'viem';
import { PermissionCheckResult } from './permission-service';
import { ENS_REGISTRY_ABI, NAME_WRAPPER_ABI, PUBLIC_RESOLVER_ABI } from './ens-contracts';
import { ENS_REGISTRY_ADDRESS, NAME_WRAPPER_ADDRESS, ENS_PUBLIC_RESOLVER } from './ens-write-operations';
import { namehash } from './ens-helpers';

export interface DelegationAction {
  type: 'transfer' | 'approval' | 'setResolver' | 'setText' | 'setAddr';
  contract: Address;
  functionName: string;
  args: any[];
  description: string;
  critical: boolean;
}

export interface DelegationPlan {
  actions: DelegationAction[];
  requiresSafe: boolean;
  estimatedGas: bigint;
  recommendedManager: Address | null;
  backupManager: Address | null;
  metadataRecords: Array<{ key: string; value: string }>;
}

export class DelegationPlanner {
  async createDelegationPlan(
    publicClient: PublicClient,
    permissionCheck: PermissionCheckResult,
    managerAddress: Address,
    backupManagerAddress?: Address
  ): Promise<DelegationPlan> {
    const actions: DelegationAction[] = [];
    let requiresSafe = false;
    let estimatedGas = 0n;

    if (!permissionCheck.ensControl) {
      return {
        actions: [],
        requiresSafe: false,
        estimatedGas: 0n,
        recommendedManager: managerAddress,
        backupManager: backupManagerAddress,
        metadataRecords: [],
      };
    }

    const ensControl = permissionCheck.ensControl;
    const node = ensControl.node;
    const domainName = ensControl.existingName!;

    if (ensControl.isWrapped) {
      if (permissionCheck.recommendation === 'transfer') {
        actions.push({
          type: 'transfer',
          contract: NAME_WRAPPER_ADDRESS,
          functionName: 'safeTransferFrom',
          args: [
            ensControl.wrappedOwner!,
            managerAddress,
            BigInt(node),
            BigInt(1),
            '0x',
          ],
          description: `Transfer wrapped domain ${domainName} to manager`,
          critical: true,
        });
        estimatedGas += 100000n;
      } else if (permissionCheck.recommendation === 'approval') {
        actions.push({
          type: 'approval',
          contract: NAME_WRAPPER_ADDRESS,
          functionName: 'setApprovalForAll',
          args: [managerAddress, true],
          description: `Approve manager to control wrapped domain ${domainName}`,
          critical: true,
        });
        estimatedGas += 50000n;
      }
    } else {
      if (permissionCheck.recommendation === 'transfer') {
        actions.push({
          type: 'transfer',
          contract: ENS_REGISTRY_ADDRESS,
          functionName: 'setOwner',
          args: [node, managerAddress],
          description: `Transfer domain ${domainName} ownership to manager`,
          critical: true,
        });
        estimatedGas += 100000n;
      }
    }

    if (!ensControl.resolver || ensControl.resolver === '0x0000000000000000000000000000000000000000') {
      actions.push({
        type: 'setResolver',
        contract: ENS_REGISTRY_ADDRESS,
        functionName: 'setResolver',
        args: [node, ENS_PUBLIC_RESOLVER],
        description: `Set resolver for ${domainName}`,
        critical: true,
      });
      estimatedGas += 80000n;
    }

    const metadataRecords: Array<{ key: string; value: string }> = [
      {
        key: 'ens.manager',
        value: managerAddress,
      },
    ];

    if (backupManagerAddress) {
      metadataRecords.push({
        key: 'ens.manager.backup',
        value: backupManagerAddress,
      });
    }

    metadataRecords.push({
      key: 'ens.permissions',
      value: permissionCheck.recommendation,
    });

    if (permissionCheck.contractOwnership.isSafe) {
      requiresSafe = true;
      metadataRecords.push({
        key: 'security.multisig.address',
        value: permissionCheck.contractAddress,
      });
      metadataRecords.push({
        key: 'security.multisig.threshold',
        value: permissionCheck.contractOwnership.safeThreshold.toString(),
      });
    }

    for (const record of metadataRecords) {
      actions.push({
        type: 'setText',
        contract: ensControl.resolver || ENS_PUBLIC_RESOLVER,
        functionName: 'setText',
        args: [node, record.key, record.value],
        description: `Set ${record.key} = ${record.value}`,
        critical: false,
      });
      estimatedGas += 50000n;
    }

    return {
      actions,
      requiresSafe,
      estimatedGas,
      recommendedManager: managerAddress,
      backupManager: backupManagerAddress,
      metadataRecords,
    };
  }

  async simulateDelegationPlan(
    publicClient: PublicClient,
    plan: DelegationPlan,
    executor: Address
  ): Promise<{ success: boolean; error?: string }> {
    try {
      for (const action of plan.actions) {
        if (action.critical) {
          try {
            await publicClient.simulateContract({
              address: action.contract,
              abi: this.getABIForAction(action.type),
              functionName: action.functionName as any,
              args: action.args,
              account: executor,
            });
          } catch (error) {
            return {
              success: false,
              error: `Simulation failed for ${action.description}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        }
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getABIForAction(type: DelegationAction['type']) {
    switch (type) {
      case 'transfer':
        return NAME_WRAPPER_ABI;
      case 'approval':
        return NAME_WRAPPER_ABI;
      case 'setResolver':
        return ENS_REGISTRY_ABI;
      case 'setText':
        return PUBLIC_RESOLVER_ABI;
      case 'setAddr':
        return PUBLIC_RESOLVER_ABI;
      default:
        return PUBLIC_RESOLVER_ABI;
    }
  }

  encodeActions(plan: DelegationPlan): Hex[] {
    return plan.actions.map(action => {
      const abi = this.getABIForAction(action.type);
      return encodeFunctionData({
        abi,
        functionName: action.functionName as any,
        args: action.args,
      });
    });
  }
}

export const delegationPlanner = new DelegationPlanner();

