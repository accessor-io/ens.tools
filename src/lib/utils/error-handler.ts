import { toast } from 'sonner';

/**
 * Standardized error handling utility for consistent user-facing error messages
 */

export interface ErrorContext {
  action?: string;
  component?: string;
  metadata?: Record<string, any>;
}

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown, defaultMessage?: string): string {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('user rejected') || error.message.includes('rejected')) {
      return 'Operation was cancelled';
    }
    if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
      return 'Insufficient balance to complete this operation';
    }
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'Network error. Please check your connection and try again';
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      return 'Resource not found';
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'You do not have permission to perform this action';
    }
    
    // Return the error message if it's user-friendly, otherwise use default
    if (error.message && error.message.length < 200 && !error.message.includes('Error: ')) {
      return error.message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage || 'An unexpected error occurred. Please try again.';
}

/**
 * Log error with context for debugging
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const logContext = context ? `[${context.component || 'Unknown'}] ${context.action || 'Operation'}` : 'Unknown operation';
  
  console.error(`${logContext} failed:`, {
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
    ...context?.metadata,
  });
}

/**
 * Handle error with standardized user feedback
 */
export function handleError(
  error: unknown,
  options: {
    defaultMessage?: string;
    context?: ErrorContext;
    showToast?: boolean;
    toastDuration?: number;
  } = {}
): string {
  const {
    defaultMessage,
    context,
    showToast = true,
    toastDuration = 5000,
  } = options;

  // Log error for debugging
  logError(error, context);

  // Get user-friendly message
  const message = getErrorMessage(error, defaultMessage);

  // Show toast notification if enabled
  if (showToast) {
    toast.error(message, {
      duration: toastDuration,
    });
  }

  return message;
}

/**
 * Wrap async function with standardized error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    defaultMessage?: string;
    context?: ErrorContext;
    showToast?: boolean;
    onError?: (error: unknown) => void;
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }) as T;
}

/**
 * Create error handler with pre-configured context
 */
export function createErrorHandler(context: ErrorContext) {
  return {
    handle: (error: unknown, options?: { defaultMessage?: string; showToast?: boolean }) => {
      return handleError(error, {
        ...options,
        context,
      });
    },
    log: (error: unknown) => {
      logError(error, context);
    },
    getMessage: (error: unknown, defaultMessage?: string) => {
      return getErrorMessage(error, defaultMessage);
    },
  };
}
