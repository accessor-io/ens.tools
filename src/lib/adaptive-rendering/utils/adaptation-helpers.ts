import type { ComponentAdaptation } from '../types';

/**
 * Adaptation Helpers
 * Shared utility functions for common adaptation patterns
 */

/**
 * Creates an adaptation for invalid/error state
 * Applies red border, ring, and aria-invalid attribute
 */
export function createInvalidStateAdaptation(
  options?: {
    className?: string;
    includeRing?: boolean;
  }
): ComponentAdaptation {
  const { className = '', includeRing = true } = options || {};
  const baseClasses = 'border-red-500';
  const ringClasses = includeRing ? ' ring-red-500/20' : '';
  const customClasses = className ? ` ${className}` : '';
  
  return {
    className: `${baseClasses}${ringClasses}${customClasses}`.trim(),
    'aria-invalid': true,
  };
}

/**
 * Creates an adaptation for valid state
 * Applies green border and ring
 */
export function createValidStateAdaptation(
  options?: {
    className?: string;
    includeRing?: boolean;
  }
): ComponentAdaptation {
  const { className = '', includeRing = true } = options || {};
  const baseClasses = 'border-green-500';
  const ringClasses = includeRing ? ' ring-green-500/20' : '';
  const customClasses = className ? ` ${className}` : '';
  
  return {
    className: `${baseClasses}${ringClasses}${customClasses}`.trim(),
  };
}

/**
 * Creates an adaptation for disabled state
 * Applies disabled attribute and opacity/cursor styling
 */
export function createDisabledStateAdaptation(
  options?: {
    className?: string;
    opacity?: string;
    cursor?: string;
  }
): ComponentAdaptation {
  const { 
    className = '', 
    opacity = 'opacity-50',
    cursor = 'cursor-not-allowed'
  } = options || {};
  
  const customClasses = className ? ` ${className}` : '';
  
  return {
    disabled: true,
    className: `${opacity} ${cursor}${customClasses}`.trim(),
  };
}

/**
 * Creates an adaptation for processing/loading state
 * Applies disabled attribute and wait cursor
 */
export function createProcessingStateAdaptation(
  options?: {
    className?: string;
  }
): ComponentAdaptation {
  const { className = '' } = options || {};
  const baseClasses = 'opacity-50 cursor-wait';
  const customClasses = className ? ` ${className}` : '';
  
  return {
    disabled: true,
    className: `${baseClasses}${customClasses}`.trim(),
  };
}
