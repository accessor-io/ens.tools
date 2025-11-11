/**
 * ENS Action Executor
 * Integrates action interpreter, batch builder, and audit logging
 */

import { WalletClient, PublicClient, Address, Hex } from 'viem';
import { parseAndValidateActions } from './ens-action-parser';
import { buildBatchTransaction, executeBatchTransaction, BatchTransactionResult } from './ens-batch-builder';
import { auditLogService, BatchAction, BatchTransactionData } from '../security/audit-log-service';

export interface ExecuteActionsOptions {
  walletClient: WalletClient;
  publicClient: PublicClient;
  chainId?: number;
  allowFailures?: boolean;
  actor?: string;
  metadata?: Record<string, any>;
}

export interface ExecuteActionsResult {
  txHash: Hex;
  batchResult: BatchTransactionResult;
  auditEntryId: string;
}

/**
 * Execute actions from bracket notation string
 */
export async function executeActionsFromString(
  actionString: string,
  options: ExecuteActionsOptions
): Promise<ExecuteActionsResult> {
  // Parse actions
  const parsedActions = parseAndValidateActions(actionString);
  
  // Build batch transaction
  const chainId = options.chainId || (await options.publicClient.getChainId());
  const batchResult = await buildBatchTransaction(
    parsedActions,
    chainId,
    options.allowFailures || false
  );
  
  // Convert to batch actions for audit log
  const batchActions: BatchAction[] = batchResult.interpretedActions.map((action, index) => ({
    actionName: action.action.action,
    description: action.description,
    contract: action.contract,
    functionName: action.functionName,
    callData: action.callData,
    callDataStart: action.callDataStart,
    callDataEnd: action.callDataEnd,
    args: action.args,
  }));
  
  // Log batch transaction attempt
  const batchTransactionData: BatchTransactionData = {
    callData: batchResult.batchCallData,
    contractAddress: batchResult.calls[0]?.target || '0x0000000000000000000000000000000000000000',
    functionName: 'aggregate3',
    functionArgs: [batchResult.calls.map(c => ({
      target: c.target,
      allowFailure: c.allowFailure,
      callData: c.callData,
    }))],
    batchActions,
    totalActions: batchResult.totalActions,
    txStatus: 'attempted',
  };
  
  const auditEntry = auditLogService.trackAction(
    'batch_action_tx',
    `Batch transaction with ${batchResult.totalActions} actions`,
    {
      actor: options.actor,
      status: 'info',
      transaction: batchTransactionData,
      metadata: {
        ...options.metadata,
        actionCount: batchResult.totalActions,
        actions: parsedActions.map(a => ({
          action: a.action,
          operator: a.operator,
          parameters: a.parameters,
        })),
      },
    }
  );
  
  // Execute transaction
  try {
    const txHash = await executeBatchTransaction(
      options.walletClient,
      options.publicClient,
      batchResult,
      {}
    );
    
    // Update audit log with transaction hash
    auditLogService.trackTransactionConfirmed(
      txHash,
      {
        ...batchTransactionData,
        txHash,
        txStatus: 'pending',
      }
    );
    
    return {
      txHash,
      batchResult,
      auditEntryId: auditEntry.id,
    };
  } catch (error) {
    // Log failure
    auditLogService.trackTransactionFailed(
      undefined,
      error instanceof Error ? error : new Error('Unknown error'),
      batchTransactionData
    );
    
    throw error;
  }
}

/**
 * Upload and execute custom actions from file or string
 */
export async function uploadAndExecuteActions(
  actions: string | File,
  options: ExecuteActionsOptions
): Promise<ExecuteActionsResult> {
  let actionString: string;
  
  if (typeof actions === 'string') {
    actionString = actions;
  } else {
    // Read file
    actionString = await actions.text();
  }
  
  return executeActionsFromString(actionString, options);
}

/**
 * Get audit entry for a batch transaction
 */
export function getBatchTransactionAuditEntry(auditEntryId: string) {
  const entries = auditLogService.getEntries();
  return entries.find(e => e.id === auditEntryId);
}







