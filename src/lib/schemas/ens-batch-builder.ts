/**
 * ENS Batch Transaction Builder
 * Builds batch transactions using Multicall3 for multiple actions
 */

import { WalletClient, PublicClient, Address, Hex, encodeFunctionData } from 'viem';
import { simulateContract, writeContract } from 'viem/actions';
import { InterpretedAction, interpretActions } from './ens-action-interpreter';
import { ParsedActionWithSchema } from './ens-action-parser';
import { getEnsAddresses } from '../ens/ens-addresses';

// Multicall3 ABI
const MULTICALL3_ABI = [
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

export interface BatchCall {
  target: Address;
  allowFailure: boolean;
  callData: Hex;
  action: InterpretedAction;
}

export interface BatchTransactionResult {
  batchCallData: Hex;
  calls: BatchCall[];
  interpretedActions: InterpretedAction[];
  txHash?: Hex;
  gasEstimate?: bigint;
  totalActions: number;
}

/**
 * Build batch transaction from interpreted actions
 */
export async function buildBatchTransaction(
  actions: ParsedActionWithSchema[],
  chainId: number = 1,
  allowFailures: boolean = false
): Promise<BatchTransactionResult> {
  // Interpret all actions
  const interpretedActions = await interpretActions(actions, chainId);
  
  // Get Multicall3 address
  const addresses = getEnsAddresses(chainId as any);
  const multicallAddress = (addresses?.multicall3 || '0xcA11bde05977b3631167028862bE2a173976CA11') as Address;
  
  // Build calls array
  const calls: BatchCall[] = interpretedActions.map((action, index) => {
    // Calculate call data position in batch
    // This is approximate - actual position depends on encoding
    const previousCallsLength = calls.length;
    const estimatedStart = previousCallsLength * 100; // Rough estimate
    
    return {
      target: action.contract,
      allowFailure: allowFailures,
      callData: action.callData,
      action: {
        ...action,
        callDataStart: estimatedStart,
        callDataEnd: estimatedStart + action.callData.length / 2 - 1, // Convert hex length to bytes
      },
    };
  });
  
  // Encode batch call
  const batchCallData = encodeFunctionData({
    abi: MULTICALL3_ABI,
    functionName: 'aggregate3',
    args: [calls.map(c => ({
      target: c.target,
      allowFailure: c.allowFailure,
      callData: c.callData,
    }))],
  });
  
  // Calculate actual call data positions
  let currentPosition = 4; // Function selector (4 bytes)
  const updatedActions = interpretedActions.map((action, index) => {
    const call = calls[index];
    const callDataHex = call.callData;
    const callDataLength = (callDataHex.length - 2) / 2; // Remove '0x' and convert to bytes
    
    // Position in the aggregate3 call data
    // Format: functionSelector (4) + offset to calls array (32) + length (32) + ...calls
    const startPos = currentPosition;
    currentPosition += 32; // Each call takes 32 bytes for offset/length in encoding
    
    return {
      ...action,
      callDataStart: startPos,
      callDataEnd: startPos + callDataLength - 1,
    };
  });
  
  return {
    batchCallData,
    calls,
    interpretedActions: updatedActions,
    totalActions: actions.length,
  };
}

/**
 * Execute batch transaction
 */
export async function executeBatchTransaction(
  walletClient: WalletClient,
  publicClient: PublicClient,
  batch: BatchTransactionResult,
  options?: {
    gas?: bigint;
    gasPrice?: bigint;
  }
): Promise<Hex> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }
  
  const chainId = await publicClient.getChainId();
  const addresses = getEnsAddresses(chainId as any);
  const multicallAddress = (addresses?.multicall3 || '0xcA11bde05977b3631167028862bE2a173976CA11') as Address;
  
  // Estimate gas if not provided
  let gasEstimate = options?.gas;
  if (!gasEstimate) {
    try {
      gasEstimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        to: multicallAddress,
        data: batch.batchCallData,
      });
    } catch (error) {
      console.warn('Failed to estimate gas, using default:', error);
      gasEstimate = 500000n; // Default estimate
    }
  }
  
  // Simulate transaction
  try {
    await simulateContract(publicClient, {
      address: multicallAddress,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      args: [batch.calls.map(c => ({
        target: c.target,
        allowFailure: c.allowFailure,
        callData: c.callData,
      }))],
      account: walletClient.account.address,
    });
  } catch (error) {
    console.error('Transaction simulation failed:', error);
    throw new Error(`Transaction simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Execute transaction
  const txHash = await writeContract(walletClient, {
    address: multicallAddress,
    abi: MULTICALL3_ABI,
    functionName: 'aggregate3',
    args: [batch.calls.map(c => ({
      target: c.target,
      allowFailure: c.allowFailure,
      callData: c.callData,
    }))],
    account: walletClient.account,
    gas: gasEstimate,
    gasPrice: options?.gasPrice,
  });
  
  return txHash;
}

/**
 * Estimate gas for batch transaction
 */
export async function estimateBatchGas(
  publicClient: PublicClient,
  batch: BatchTransactionResult,
  account: Address
): Promise<bigint> {
  const chainId = await publicClient.getChainId();
  const addresses = getEnsAddresses(chainId as any);
  const multicallAddress = (addresses?.multicall3 || '0xcA11bde05977b3631167028862bE2a173976CA11') as Address;
  
  try {
    const gas = await publicClient.estimateGas({
      account,
      to: multicallAddress,
      data: batch.batchCallData,
    });
    
    return gas;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Fallback: estimate based on number of actions
    return 100000n + (50000n * BigInt(batch.totalActions));
  }
}

/**
 * Find call data position for a specific action in batch calldata
 */
export function findCallDataPosition(
  batchCallData: Hex,
  actionCallData: Hex,
  actionIndex: number
): { start: number; end: number } {
  // Remove 0x prefix
  const batchHex = batchCallData.slice(2);
  const actionHex = actionCallData.slice(2);
  
  // Find the action call data in the batch
  const searchStart = batchHex.indexOf(actionHex);
  
  if (searchStart === -1) {
    // Fallback: estimate position based on index
    const estimatedStart = 4 + (actionIndex * 100); // Function selector + estimated per action
    return {
      start: estimatedStart * 2, // Convert to hex string position
      end: (estimatedStart + actionHex.length / 2) * 2,
    };
  }
  
  // Convert to byte positions (each byte is 2 hex chars)
  const startByte = searchStart / 2;
  const endByte = startByte + (actionHex.length / 2);
  
  return {
    start: searchStart, // Position in hex string
    end: searchStart + actionHex.length, // End position in hex string
  };
}

/**
 * Highlight call data for a specific action
 */
export function highlightCallDataForAction(
  batchCallData: Hex,
  actionCallData: Hex,
  actionIndex: number
): { before: string; highlighted: string; after: string } {
  const position = findCallDataPosition(batchCallData, actionCallData, actionIndex);
  
  const fullHex = batchCallData.slice(2); // Remove 0x
  const before = fullHex.slice(0, position.start);
  const highlighted = fullHex.slice(position.start, position.end);
  const after = fullHex.slice(position.end);
  
  return {
    before: before || '',
    highlighted: highlighted || '',
    after: after || '',
  };
}







