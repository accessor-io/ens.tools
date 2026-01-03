/**
 * Gas Estimation Utilities
 * Enhanced gas estimation with EIP-1559 support
 * Based on patterns from Mastering Ethereum 2nd Edition
 */

import { PublicClient, Address, EstimateGasParameters } from 'viem';

export interface GasEstimate {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface GasEstimateOptions {
  /**
   * Buffer percentage to add to gas estimate (default: 10%)
   * Helps prevent out-of-gas errors
   */
  gasBufferPercent?: number;
  
  /**
   * Minimum priority fee in gwei (default: 2 gwei)
   */
  minPriorityFeeGwei?: number;
  
  /**
   * Maximum priority fee in gwei (optional, no limit by default)
   */
  maxPriorityFeeGwei?: number;
}

/**
 * Estimate gas with EIP-1559 support and buffer
 */
export async function estimateGasWithBuffer(
  publicClient: PublicClient,
  params: EstimateGasParameters,
  options: GasEstimateOptions = {}
): Promise<GasEstimate> {
  const {
    gasBufferPercent = 10,
    minPriorityFeeGwei = 2,
    maxPriorityFeeGwei,
  } = options;

  // Estimate base gas limit
  let gasLimit: bigint;
  try {
    gasLimit = await publicClient.estimateGas(params);
  } catch (error) {
    // If estimation fails, transaction would likely revert
    // Return error with helpful message
    throw new Error(
      `Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      `This usually means the transaction would revert.`
    );
  }

  // Add buffer to gas limit (10% default)
  const bufferMultiplier = 100 + gasBufferPercent;
  const bufferedGasLimit = (gasLimit * BigInt(bufferMultiplier)) / 100n;

  // Get current fee estimates
  let maxFeePerGas: bigint;
  let maxPriorityFeePerGas: bigint;

  try {
    const feeData = await publicClient.estimateFeesPerGas();
    
    if (feeData.maxFeePerGas) {
      maxFeePerGas = feeData.maxFeePerGas;
    } else {
      // Fallback: estimate from gas price
      const gasPrice = await publicClient.getGasPrice();
      maxFeePerGas = gasPrice;
    }

    if (feeData.maxPriorityFeePerGas) {
      maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    } else {
      // Default priority fee: 2 gwei
      maxPriorityFeePerGas = BigInt(minPriorityFeeGwei) * 10n ** 9n;
    }
  } catch (error) {
    // Fallback: use gas price and default priority fee
    const gasPrice = await publicClient.getGasPrice();
    maxFeePerGas = gasPrice;
    maxPriorityFeePerGas = BigInt(minPriorityFeeGwei) * 10n ** 9n;
  }

  // Apply minimum priority fee
  const minPriorityFee = BigInt(minPriorityFeeGwei) * 10n ** 9n;
  if (maxPriorityFeePerGas < minPriorityFee) {
    maxPriorityFeePerGas = minPriorityFee;
  }

  // Apply maximum priority fee if specified
  if (maxPriorityFeeGwei !== undefined) {
    const maxPriorityFee = BigInt(maxPriorityFeeGwei) * 10n ** 9n;
    if (maxPriorityFeePerGas > maxPriorityFee) {
      maxPriorityFeePerGas = maxPriorityFee;
    }
  }

  return {
    gasLimit: bufferedGasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

/**
 * Get current gas prices for display
 */
export async function getGasPrices(
  publicClient: PublicClient
): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasPrice?: bigint; // Legacy gas price if available
}> {
  try {
    const feeData = await publicClient.estimateFeesPerGas();
    
    return {
      maxFeePerGas: feeData.maxFeePerGas || 0n,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 0n,
      gasPrice: feeData.gasPrice,
    };
  } catch (error) {
    // Fallback: use gas price
    const gasPrice = await publicClient.getGasPrice();
    return {
      maxFeePerGas: gasPrice,
      maxPriorityFeePerGas: 2n * 10n ** 9n, // 2 gwei default
      gasPrice,
    };
  }
}

/**
 * Format gas price for display
 */
export function formatGasPrice(gasPrice: bigint): string {
  const gwei = Number(gasPrice) / 1e9;
  if (gwei >= 1000) {
    return `${(gwei / 1000).toFixed(2)} Gwei`;
  }
  return `${gwei.toFixed(2)} Gwei`;
}

/**
 * Calculate total transaction cost
 */
export function calculateTransactionCost(
  gasLimit: bigint,
  maxFeePerGas: bigint,
  value: bigint = 0n
): bigint {
  return gasLimit * maxFeePerGas + value;
}
