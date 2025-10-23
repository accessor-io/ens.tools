/**
 * Error Handling for Seaport Operations
 * Provides detailed error messages and recovery strategies
 */

export enum SeaportErrorType {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  ORDER_INVALID = 'ORDER_INVALID',
  ORDER_ALREADY_FULFILLED = 'ORDER_ALREADY_FULFILLED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  INSUFFICIENT_APPROVAL = 'INSUFFICIENT_APPROVAL',
  NONCE_INVALID = 'NONCE_INVALID',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface SeaportError {
  type: SeaportErrorType;
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

export class SeaportErrorHandler {
  /**
   * Parse and categorize Seaport errors
   */
  static parseError(error: any): SeaportError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorCode = error?.code || error?.error?.code;

    // Transaction execution errors
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
      return {
        type: SeaportErrorType.INSUFFICIENT_BALANCE,
        message: 'Insufficient balance to complete transaction',
        recoverable: true,
        suggestion: 'Please ensure you have enough ETH to cover the transaction and gas fees',
      };
    }

    if (errorMessage.includes('not authorized') || errorMessage.includes('approval')) {
      return {
        type: SeaportErrorType.INSUFFICIENT_APPROVAL,
        message: 'Token approval required',
        recoverable: true,
        suggestion: 'Please approve the marketplace to trade your tokens',
      };
    }

    if (errorMessage.includes('order expired') || errorMessage.includes('endTime')) {
      return {
        type: SeaportErrorType.ORDER_EXPIRED,
        message: 'Order has expired',
        recoverable: false,
        suggestion: 'The order is no longer valid. Please create a new order',
      };
    }

    if (errorMessage.includes('already fulfilled') || errorMessage.includes('filled')) {
      return {
        type: SeaportErrorType.ORDER_ALREADY_FULFILLED,
        message: 'Order has already been fulfilled',
        recoverable: false,
        suggestion: 'This order has already been completed',
      };
    }

    if (errorMessage.includes('cancelled')) {
      return {
        type: SeaportErrorType.ORDER_CANCELLED,
        message: 'Order has been cancelled',
        recoverable: false,
        suggestion: 'This order has been cancelled by the offerer',
      };
    }

    if (errorMessage.includes('signature') || errorMessage.includes('ECDSA')) {
      return {
        type: SeaportErrorType.SIGNATURE_INVALID,
        message: 'Invalid order signature',
        recoverable: false,
        suggestion: 'The order signature is invalid. Please contact support',
      };
    }

    if (errorMessage.includes('nonce') || errorMessage.includes('counter')) {
      return {
        type: SeaportErrorType.NONCE_INVALID,
        message: 'Invalid order nonce',
        recoverable: true,
        suggestion: 'The order nonce is outdated. Please refresh and try again',
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        type: SeaportErrorType.NETWORK_ERROR,
        message: 'Network error occurred',
        recoverable: true,
        suggestion: 'Network issue detected. Please try again',
      };
    }

    if (errorCode === 'ACTION_REJECTED' || errorMessage.includes('user rejected')) {
      return {
        type: SeaportErrorType.TRANSACTION_FAILED,
        message: 'Transaction was rejected',
        recoverable: true,
        suggestion: 'Transaction was cancelled. You can try again',
      };
    }

    return {
      type: SeaportErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      recoverable: false,
      suggestion: 'An unexpected error occurred. Please try again or contact support',
    };
  }

  /**
   * Format error for user display
   */
  static formatError(error: SeaportError): string {
    return `${error.message}${error.suggestion ? ` - ${error.suggestion}` : ''}`;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: SeaportError): boolean {
    return error.recoverable;
  }

  /**
   * Get suggested action for error
   */
  static getSuggestedAction(error: SeaportError): string | null {
    switch (error.type) {
      case SeaportErrorType.INSUFFICIENT_BALANCE:
        return 'Add more ETH to your wallet';
      case SeaportErrorType.INSUFFICIENT_APPROVAL:
        return 'Approve marketplace to trade tokens';
      case SeaportErrorType.NETWORK_ERROR:
        return 'Check your internet connection';
      case SeaportErrorType.NONCE_INVALID:
        return 'Refresh the page and try again';
      case SeaportErrorType.TRANSACTION_FAILED:
        return 'Try the transaction again';
      default:
        return null;
    }
  }

  /**
   * Log error with context
   */
  static logError(error: any, context: string): void {
    const parsedError = this.parseError(error);
    console.error(`[Seaport Error] ${context}:`, {
      type: parsedError.type,
      message: parsedError.message,
      originalError: error,
    });
  }
}

/**
 * Transaction retry handler
 */
export class TransactionRetryHandler {
  private maxRetries: number;
  private retryDelay: number;

  constructor(maxRetries: number = 3, retryDelay: number = 2000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Retry a transaction with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const parsedError = SeaportErrorHandler.parseError(error);
        
        if (!parsedError.recoverable) {
          SeaportErrorHandler.logError(error, context);
          throw error;
        }

        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying ${context} (attempt ${attempt + 1}/${this.maxRetries}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    SeaportErrorHandler.logError(lastError, context);
    throw lastError;
  }
}

/**
 * Order validation helper
 */
export class OrderValidator {
  /**
   * Validate order parameters before submission
   */
  static validateOrder(order: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.parameters) {
      errors.push('Order parameters are missing');
      return { valid: false, errors };
    }

    const params = order.parameters;

    // Check offerer
    if (!params.offerer || params.offerer === '0x0000000000000000000000000000000000000000') {
      errors.push('Invalid offerer address');
    }

    // Check offer items
    if (!params.offer || params.offer.length === 0) {
      errors.push('Order must have at least one offer item');
    }

    // Check consideration items
    if (!params.consideration || params.consideration.length === 0) {
      errors.push('Order must have at least one consideration item');
    }

    // Check timestamps
    const now = Math.floor(Date.now() / 1000);
    if (Number(params.endTime) < now) {
      errors.push('Order end time must be in the future');
    }

    if (Number(params.startTime) > Number(params.endTime)) {
      errors.push('Order start time must be before end time');
    }

    // Check signature
    if (!order.signature || order.signature === '0x') {
      errors.push('Order signature is missing');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate price format
   */
  static validatePrice(price: string): { valid: boolean; error?: string } {
    if (!price || price.trim() === '') {
      return { valid: false, error: 'Price is required' };
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) {
      return { valid: false, error: 'Price must be a valid number' };
    }

    if (numPrice <= 0) {
      return { valid: false, error: 'Price must be greater than 0' };
    }

    if (numPrice > 1000000) {
      return { valid: false, error: 'Price is too large' };
    }

    return { valid: true };
  }

  /**
   * Validate address format
   */
  static validateAddress(address: string): { valid: boolean; error?: string } {
    if (!address || address.trim() === '') {
      return { valid: false, error: 'Address is required' };
    }

    if (!address.startsWith('0x')) {
      return { valid: false, error: 'Address must start with 0x' };
    }

    if (address.length !== 42) {
      return { valid: false, error: 'Address must be 42 characters long' };
    }

    return { valid: true };
  }
}

