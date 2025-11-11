/**
 * ENS Action Interpreter
 * Converts parsed actions into calldata for batch transactions
 */

import { Address, Hex, encodeFunctionData } from 'viem';
import { normalize } from 'viem/ens';
import { namehash, labelhash } from '../ens/ens-helpers';
import { 
  ENS_REGISTRY_ABI, 
  NAME_WRAPPER_ABI, 
  PUBLIC_RESOLVER_ABI 
} from '../ens/ens-contracts';
import { getEnsAddresses } from '../ens/ens-addresses';
import { ParsedAction, ParsedActionWithSchema } from './ens-action-parser';
import { getActionSchema } from './ens-console-schema';

export interface InterpretedAction {
  action: ParsedAction;
  contract: Address;
  functionName: string;
  args: any[];
  callData: Hex;
  callDataStart: number; // Start position in batch calldata
  callDataEnd: number; // End position in batch calldata
  description: string;
}

export interface BatchTransaction {
  actions: InterpretedAction[];
  batchCallData: Hex;
  totalGasEstimate?: bigint;
  contractAddress: Address; // Multicall3 address
}

/**
 * Interpret a single action into calldata
 */
export async function interpretAction(
  action: ParsedActionWithSchema,
  chainId: number = 1
): Promise<InterpretedAction> {
  const addresses = getEnsAddresses(chainId as any);
  const schema = action.schema;
  
  let contract: Address;
  let functionName: string;
  let args: any[] = [];
  let description: string = schema.label;
  
  const params = action.parameters;
  
  switch (action.action) {
    // ========== DOMAIN OPERATIONS ==========
    case 'transfer': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      contract = NAME_WRAPPER_ADDRESS;
      functionName = 'safeTransferFrom';
      args = [
        params.from || '0x0000000000000000000000000000000000000000', // Will be replaced with actual from
        params.to as Address,
        node,
        BigInt(1),
        '0x' as Hex,
      ];
      description = `Transfer ${params.domain} to ${params.to}`;
      break;
    }
    
    case 'wrap': {
      const normalizedName = normalize(params.domain);
      contract = NAME_WRAPPER_ADDRESS;
      functionName = 'wrap';
      args = [
        normalizedName,
        params.owner as Address,
        BigInt(params.fuses || 0),
        BigInt(params.expiry || 0),
        (params.resolver || addresses?.publicResolver || ENS_PUBLIC_RESOLVER) as Address,
      ];
      description = `Wrap ${params.domain}`;
      break;
    }
    
    case 'unwrap': {
      const normalizedName = normalize(params.domain);
      const parts = params.domain.split('.');
      const label = parts[0];
      const parentName = parts.slice(1).join('.');
      const parentNode = namehash(parentName);
      const labelHash = labelhash(label);
      
      contract = NAME_WRAPPER_ADDRESS;
      functionName = 'unwrap';
      args = [
        parentNode,
        labelHash,
        params.controller as Address,
      ];
      description = `Unwrap ${params.domain}`;
      break;
    }
    
    case 'renew': {
      contract = (addresses?.ethRegistrarController || ETH_REGISTRAR_CONTROLLER) as Address;
      functionName = 'renew';
      const normalizedName = normalize(params.domain);
      args = [
        normalizedName,
        BigInt(params.duration),
      ];
      description = `Renew ${params.domain} for ${params.duration} seconds`;
      break;
    }
    
    // ========== SUBDOMAIN OPERATIONS ==========
    case 'mintSubdomain': {
      const normalizedParent = normalize(params.parent);
      const parentNode = namehash(normalizedParent);
      
      contract = NAME_WRAPPER_ADDRESS;
      functionName = 'setSubnodeRecord';
      args = [
        parentNode,
        params.subname,
        (params.owner || '0x0000000000000000000000000000000000000000') as Address,
        (params.resolver || addresses?.publicResolver || ENS_PUBLIC_RESOLVER) as Address,
        BigInt(0), // TTL
        BigInt(params.fuses || 0),
        BigInt(params.expiry || 0),
      ];
      description = `Create subdomain ${params.subname}.${params.parent}`;
      break;
    }
    
    case 'removeSubdomain': {
      const normalizedParent = normalize(params.parent);
      const parentNode = namehash(normalizedParent);
      const labelHash = labelhash(params.subname);
      
      contract = ENS_REGISTRY_ADDRESS;
      functionName = 'setSubnodeOwner';
      args = [
        parentNode,
        params.subname,
        '0x0000000000000000000000000000000000000000' as Address,
      ];
      description = `Remove subdomain ${params.subname}.${params.parent}`;
      break;
    }
    
    case 'transferSubdomain': {
      const normalizedParent = normalize(params.parent);
      const parentNode = namehash(normalizedParent);
      
      contract = ENS_REGISTRY_ADDRESS;
      functionName = 'setSubnodeOwner';
      args = [
        parentNode,
        params.subname,
        params.to as Address,
      ];
      description = `Transfer ${params.subname}.${params.parent} to ${params.to}`;
      break;
    }
    
    // ========== RECORD OPERATIONS ==========
    case 'setAddr': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      const resolverAddress = addresses?.publicResolver || ENS_PUBLIC_RESOLVER;
      
      contract = resolverAddress as Address;
      
      if (params.coinType && params.coinType !== 60) {
        // Multi-chain address
        functionName = 'setAddr';
        args = [
          node,
          BigInt(params.coinType),
          params.address as Hex,
        ];
      } else {
        // Ethereum address
        functionName = 'setAddr';
        args = [
          node,
          params.address as Address,
        ];
      }
      description = `Set address record for ${params.domain}`;
      break;
    }
    
    case 'setText': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      const resolverAddress = addresses?.publicResolver || ENS_PUBLIC_RESOLVER;
      
      contract = resolverAddress as Address;
      functionName = 'setText';
      args = [
        node,
        params.key,
        params.value || '',
      ];
      description = `Set text record ${params.key} for ${params.domain}`;
      break;
    }
    
    case 'removeText': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      const resolverAddress = addresses?.publicResolver || ENS_PUBLIC_RESOLVER;
      
      contract = resolverAddress as Address;
      functionName = 'setText';
      args = [
        node,
        params.key,
        '', // Empty string removes the record
      ];
      description = `Remove text record ${params.key} for ${params.domain}`;
      break;
    }
    
    case 'setContentHash': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      const resolverAddress = addresses?.publicResolver || ENS_PUBLIC_RESOLVER;
      
      contract = resolverAddress as Address;
      functionName = 'setContenthash';
      
      // Content hash should already be encoded
      let contentHash: Hex;
      if (params.contentHash.startsWith('0x')) {
        contentHash = params.contentHash as Hex;
      } else {
        // Try to encode if it's a path like /ipfs/...
        const { encodeContenthash } = await import('../ens/ens-helpers');
        const encoded = encodeContenthash(params.contentHash);
        contentHash = `0x${Buffer.from(encoded).toString('hex')}` as Hex;
      }
      
      args = [node, contentHash];
      description = `Set content hash for ${params.domain}`;
      break;
    }
    
    case 'setTTL': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      const resolverAddress = addresses?.publicResolver || ENS_PUBLIC_RESOLVER;
      
      contract = resolverAddress as Address;
      functionName = 'setTTL';
      args = [
        node,
        BigInt(params.ttl),
      ];
      description = `Set TTL for ${params.domain}`;
      break;
    }
    
    case 'setABI': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      const resolverAddress = addresses?.publicResolver || ENS_PUBLIC_RESOLVER;
      
      contract = resolverAddress as Address;
      functionName = 'setABI';
      
      let abiData: Hex;
      if (params.data.startsWith('0x')) {
        abiData = params.data as Hex;
      } else {
        // Encode JSON string to bytes
        const jsonString = typeof params.data === 'string' ? params.data : JSON.stringify(params.data);
        abiData = `0x${Buffer.from(jsonString).toString('hex')}` as Hex;
      }
      
      args = [
        node,
        BigInt(params.contentType || 1),
        abiData,
      ];
      description = `Set ABI for ${params.domain}`;
      break;
    }
    
    case 'setResolver': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      
      contract = ENS_REGISTRY_ADDRESS;
      functionName = 'setResolver';
      args = [
        node,
        params.resolver as Address,
      ];
      description = `Set resolver for ${params.domain}`;
      break;
    }
    
    case 'setFuses': {
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      
      contract = NAME_WRAPPER_ADDRESS;
      functionName = 'setFuses';
      args = [
        node,
        BigInt(params.fuses),
      ];
      description = `Set fuses for ${params.domain}`;
      break;
    }
    
    case 'setReverseRecord': {
      contract = (addresses?.reverseRegistrar || '0x084b1c3C81545d370f3634392De611CaaBFf8148') as Address;
      functionName = 'setName';
      const normalizedName = normalize(params.name);
      args = [normalizedName];
      description = `Set reverse record for ${params.address}`;
      break;
    }
    
    case 'setApprovalForAll': {
      contract = NAME_WRAPPER_ADDRESS;
      functionName = 'setApprovalForAll';
      args = [
        params.operator as Address,
        params.approved === true || params.approved === 'true',
      ];
      description = `${params.approved ? 'Approve' : 'Revoke'} operator ${params.operator}`;
      break;
    }
    
    // ========== DELEGATION OPERATIONS ==========
    case 'delegateTo':
    case 'delegateAuthSelect':
    case 'removeDelegate':
    case 'updateDelegate':
    case 'lockDelegate':
    case 'unlockDelegate':
    case 'enableDelegate':
    case 'disableDelegate': {
      // These require the granular delegation contract address
      // For now, we'll need the contract address to be provided
      const delegateContract = params.delegateContract || addresses?.granularDelegate;
      if (!delegateContract) {
        throw new Error(`Delegation contract address required for action ${action.action}`);
      }
      
      contract = delegateContract as Address;
      const normalizedName = normalize(params.domain);
      const node = namehash(normalizedName);
      
      switch (action.action) {
        case 'delegateTo':
        case 'delegateAuthSelect': {
          functionName = 'addDelegate';
          let permissions: bigint;
          
          if (action.action === 'delegateAuthSelect' && params.permissionKeys) {
            // Convert permission keys to bitmask
            const { GRANULAR_PERMISSIONS } = await import('./ens-console-schema');
            permissions = 0n;
            const keys = Array.isArray(params.permissionKeys) 
              ? params.permissionKeys 
              : params.permissionKeys.split(',');
            
            for (const key of keys) {
              const perm = GRANULAR_PERMISSIONS[key.trim() as keyof typeof GRANULAR_PERMISSIONS];
              if (perm) permissions |= perm;
            }
          } else {
            permissions = BigInt(params.permissions || 0);
          }
          
          args = [
            node,
            params.delegate as Address,
            permissions,
            BigInt(params.expiresAt || 0),
          ];
          description = `Add delegate ${params.delegate} for ${params.domain}`;
          break;
        }
        
        case 'removeDelegate': {
          functionName = 'removeDelegate';
          args = [node, params.delegate as Address];
          description = `Remove delegate ${params.delegate} for ${params.domain}`;
          break;
        }
        
        case 'updateDelegate': {
          functionName = 'updateDelegate';
          args = [
            node,
            params.delegate as Address,
            BigInt(params.permissions || 0),
            BigInt(params.expiresAt || 0),
          ];
          description = `Update delegate ${params.delegate} for ${params.domain}`;
          break;
        }
        
        case 'lockDelegate': {
          functionName = 'lockDelegate';
          args = [node, params.delegate as Address];
          description = `Lock delegate ${params.delegate} for ${params.domain}`;
          break;
        }
        
        case 'unlockDelegate': {
          functionName = 'unlockDelegate';
          args = [node, params.delegate as Address];
          description = `Unlock delegate ${params.delegate} for ${params.domain}`;
          break;
        }
        
        case 'enableDelegate': {
          functionName = 'enableDelegate';
          args = [node, params.delegate as Address];
          description = `Enable delegate ${params.delegate} for ${params.domain}`;
          break;
        }
        
        case 'disableDelegate': {
          functionName = 'disableDelegate';
          args = [node, params.delegate as Address];
          description = `Disable delegate ${params.delegate} for ${params.domain}`;
          break;
        }
      }
      break;
    }
    
    default:
      throw new Error(`Unsupported action: ${action.action}`);
  }
  
  // Encode function call
  const abi = getABIForAction(action.action, contract);
  const callData = encodeFunctionData({
    abi,
    functionName: functionName as any,
    args,
  });
  
  return {
    action: action,
    contract,
    functionName,
    args,
    callData,
    callDataStart: 0, // Will be set when building batch
    callDataEnd: 0, // Will be set when building batch
    description,
  };
}

/**
 * Get ABI for a specific action
 */
function getABIForAction(action: string, contract: Address): any[] {
  // Determine which ABI to use based on contract address
  if (contract === ENS_REGISTRY_ADDRESS) {
    return ENS_REGISTRY_ABI;
  } else if (contract === NAME_WRAPPER_ADDRESS) {
    return NAME_WRAPPER_ABI;
  } else if (contract === ENS_PUBLIC_RESOLVER || contract.toLowerCase().includes('resolver')) {
    return PUBLIC_RESOLVER_ABI;
  }
  
  // Default to public resolver for most operations
  return PUBLIC_RESOLVER_ABI;
}

// Contract addresses
const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address;
const ENS_PUBLIC_RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63' as Address;
const NAME_WRAPPER_ADDRESS = '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401' as Address;
const ETH_REGISTRAR_CONTROLLER = '0x253553366Da8546fC250F225fe3d25d0C782303b' as Address;

/**
 * Interpret multiple actions
 */
export async function interpretActions(
  actions: ParsedActionWithSchema[],
  chainId: number = 1
): Promise<InterpretedAction[]> {
  return Promise.all(actions.map(action => interpretAction(action, chainId)));
}







