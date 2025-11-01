import { WalletClient, PublicClient, Address, Hex, encodeFunctionData, decodeEventLog } from 'viem';
import { auditLogService, TransactionData } from './audit-log-service';
import { getAbiForContract } from '../ens/ens-contracts';

/**
 * Intercepts and logs all writeContract calls
 */
export async function trackedWriteContract(
  walletClient: WalletClient,
  publicClient: PublicClient | null,
  params: {
    address: Address;
    abi: any[];
    functionName: string;
    args?: any[];
    account?: Address;
    chain?: any;
    value?: bigint;
    gas?: bigint;
    gasPrice?: bigint;
  },
  options?: {
    action?: string;
    details?: string;
    domain?: string;
    actor?: string;
    metadata?: Record<string, any>;
  }
): Promise<Hex> {
  const account = params.account || walletClient.account?.address;
  if (!account) {
    throw new Error('Wallet not connected');
  }

  // Encode the call data
  let callData: string | undefined;
  try {
    callData = encodeFunctionData({
      abi: params.abi,
      functionName: params.functionName,
      args: params.args || [],
    });
  } catch (error) {
    console.warn('Failed to encode call data:', error);
  }

  // Estimate gas if publicClient is available
  let gasEstimate: bigint | undefined;
  if (publicClient) {
    try {
      gasEstimate = await publicClient.estimateGas({
        account,
        to: params.address,
        data: callData as Hex,
        value: params.value,
      });
    } catch (error) {
      console.warn('Failed to estimate gas:', error);
    }
  }

  // Build transaction data
  const transactionData: TransactionData = {
    contractAddress: params.address,
    functionName: params.functionName,
    functionArgs: params.args,
    callData,
    gasLimit: params.gas || gasEstimate,
    gasPrice: params.gasPrice,
  };

  // Log transaction attempt
  auditLogService.trackTransactionAttempt(
    (options?.action as any) || 'transaction_attempted',
    options?.details || `Attempting ${params.functionName} on ${params.address}`,
    transactionData,
    {
      domain: options?.domain,
      actor: options?.actor || account,
      metadata: {
        ...options?.metadata,
        chainId: walletClient.chain?.id,
        chainName: walletClient.chain?.name,
      },
    }
  );

  try {
    // Execute the transaction
    const hash = await walletClient.writeContract({
      ...params,
      account: account as Address,
    });

    // Update entry with hash
    const entry = auditLogService.getEntries().find(
      e => e.transaction?.contractAddress === params.address &&
           e.transaction?.functionName === params.functionName &&
           e.transaction?.txStatus === 'attempted'
    );
    
    if (entry && entry.transaction) {
      entry.transaction.txHash = hash;
      entry.transaction.txStatus = 'pending';
      entry.txHash = hash;
      entry.status = 'info';
      auditLogService['saveToStorage']();
      auditLogService['notifyListeners']();
    }

    // Monitor transaction confirmation if publicClient is available
    if (publicClient) {
      monitorTransactionConfirmation(publicClient, hash, params.address, params.abi);
    }

    return hash;
  } catch (error) {
    auditLogService.trackTransactionFailed(
      undefined,
      error instanceof Error ? error : new Error(String(error)),
      transactionData
    );
    throw error;
  }
}

/**
 * Monitor transaction and decode state changes on confirmation
 */
async function monitorTransactionConfirmation(
  publicClient: PublicClient,
  txHash: Hex,
  contractAddress: Address,
  abi: any[]
) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    // Decode logs
    const decodedLogs: any[] = [];
    const stateChanges: any[] = [];

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
        try {
          const decoded = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          });
          decodedLogs.push({
            ...decoded,
            address: log.address,
            blockNumber: log.blockNumber.toString(),
            transactionHash: log.transactionHash,
            transactionIndex: log.transactionIndex.toString(),
            logIndex: log.logIndex.toString(),
          });

          // Extract state changes from events
          if (decoded.eventName) {
            stateChanges.push({
              contract: log.address,
              event: decoded.eventName,
              decoded: decoded,
              blockNumber: log.blockNumber.toString(),
            });
          }
        } catch (error) {
          // Event not in ABI, skip
        }
      }
    }

    // Update audit log with confirmation and decoded data
    auditLogService.trackTransactionConfirmed(
      txHash,
      {
        gasUsed: receipt.gasUsed,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        status: receipt.status,
      },
      stateChanges,
      decodedLogs
    );
  } catch (error) {
    console.error('Failed to monitor transaction:', error);
    auditLogService.trackTransactionFailed(
      txHash,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Decode state changes from transaction receipt
 */
export async function decodeStateChanges(
  publicClient: PublicClient,
  txHash: Hex,
  contractAddresses: Address[],
  abis: Record<string, any[]>
): Promise<{ stateChanges: any[]; decodedLogs: any[] }> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    const decodedLogs: any[] = [];
    const stateChanges: any[] = [];

    for (const log of receipt.logs) {
      const contractAbi = Object.entries(abis).find(
        ([address]) => address.toLowerCase() === log.address.toLowerCase()
      )?.[1];

      if (contractAbi) {
        try {
          const decoded = decodeEventLog({
            abi: contractAbi,
            data: log.data,
            topics: log.topics,
          });
          
          decodedLogs.push({
            ...decoded,
            address: log.address,
            blockNumber: log.blockNumber.toString(),
            transactionHash: log.transactionHash,
          });

          if (decoded.eventName) {
            stateChanges.push({
              contract: log.address,
              event: decoded.eventName,
              decoded: decoded,
              blockNumber: log.blockNumber.toString(),
            });
          }
        } catch (error) {
          // Event not in ABI
        }
      }
    }

    return { stateChanges, decodedLogs };
  } catch (error) {
    console.error('Failed to decode state changes:', error);
    return { stateChanges: [], decodedLogs: [] };
  }
}

