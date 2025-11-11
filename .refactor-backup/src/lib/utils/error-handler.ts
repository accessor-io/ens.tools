/**
 * Error Handler Utilities
 * Provides user-friendly error messages and recovery suggestions
 */

export interface ErrorRecovery {
  message: string;
  suggestion?: string;
  action?: string;
}

/**
 * Get user-friendly error message with recovery suggestions
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return getErrorRecovery(error).message;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get error recovery information
 */
export function getErrorRecovery(error: unknown): ErrorRecovery {
  if (!(error instanceof Error)) {
    return {
      message: 'An unexpected error occurred',
      suggestion: 'Please try again or contact support if the problem persists.',
    };
  }

  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code;

  // Gas-related errors
  if (errorMessage.includes('gas') || errorMessage.includes('insufficient funds')) {
    if (errorMessage.includes('estimate') || errorMessage.includes('gas required exceeds allowance')) {
      return {
        message: 'Transaction requires more gas than available',
        suggestion: 'Try increasing your gas limit by 20-30% or wait for lower network congestion.',
        action: 'Increase gas limit',
      };
    }
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('balance')) {
      return {
        message: 'Insufficient balance for transaction',
        suggestion: 'You need more ETH to cover the transaction cost and gas fees.',
        action: 'Add funds to wallet',
      };
    }
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorCode === 'NETWORK_ERROR') {
    return {
      message: 'Network connection error',
      suggestion: 'Check your internet connection and try again. The transaction will be retried automatically.',
      action: 'Retry',
    };
  }

  // User rejection
  if (
    errorCode === 4001 ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('user denied') ||
    errorMessage.includes('rejected')
  ) {
    return {
      message: 'Transaction rejected',
      suggestion: 'You cancelled the transaction in your wallet.',
    };
  }

  // Contract errors
  if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
    if (errorMessage.includes('insufficient allowance')) {
      return {
        message: 'Token approval required',
        suggestion: 'You need to approve the contract to spend your tokens first.',
        action: 'Approve token',
      };
    }
    if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
      return {
        message: 'Not authorized for this operation',
        suggestion: 'You do not have permission to perform this action. Check if you are the owner or have been granted delegate permissions.',
      };
    }
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      return {
        message: 'This operation has already been completed',
        suggestion: 'The record or permission you are trying to set already exists.',
      };
    }
    if (errorMessage.includes('expired') || errorMessage.includes('invalid expiration')) {
      return {
        message: 'Invalid expiration time',
        suggestion: 'The expiration time must be in the future.',
      };
    }
    return {
      message: 'Transaction failed',
      suggestion: 'The transaction was reverted by the smart contract. This could be due to invalid parameters or contract state.',
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('deadline')) {
    return {
      message: 'Transaction timeout',
      suggestion: 'The transaction took too long to process. It may still be pending. Check your wallet for transaction status.',
      action: 'Check transaction status',
    };
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      message: 'Too many requests',
      suggestion: 'Please wait a moment before trying again.',
      action: 'Wait and retry',
    };
  }

  // Default error handling
  return {
    message: error.message || 'An error occurred',
    suggestion: 'Please try again. If the problem persists, check your wallet connection and network settings.',
  };
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code;

  // Recoverable errors
  const recoverablePatterns = [
    'network',
    'timeout',
    'connection',
    'rate limit',
    'gas',
    'insufficient funds',
  ];

  // Non-recoverable errors
  if (errorCode === 4001) return false; // User rejection
  if (errorMessage.includes('user rejected')) return false;
  if (errorMessage.includes('execution reverted') && errorMessage.includes('not authorized')) return false;

  return recoverablePatterns.some((pattern) => errorMessage.includes(pattern));
}

/**
 * Get retry delay based on error type
 */
export function getRetryDelay(error: unknown, attempt: number): number {
  if (!(error instanceof Error)) return 1000 * attempt;

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('rate limit')) {
    return 5000 * attempt; // 5s, 10s, 15s...
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
    return 2000 * attempt; // 2s, 4s, 6s...
  }

  return 1000 * attempt; // Default: 1s, 2s, 3s...
}


