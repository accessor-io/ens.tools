import { useState, useCallback } from 'react';
import type { ValidationContextState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access validation context state
 * Manages validation state for forms and workflows
 */
export function useValidationContext(): ValidationContextState {
  return getDefaultContextState('validation');
}

/**
 * Hook to manage validation context state
 * Provides methods to update validation state
 */
export function useValidationContextManager() {
  const [validationState, setValidationState] = useState<ValidationContextState>(
    getDefaultContextState('validation')
  );

  const setValid = useCallback((isValid: boolean) => {
    setValidationState((prev) => ({ ...prev, isValid }));
  }, []);

  const setErrors = useCallback((errors: string[]) => {
    setValidationState((prev) => ({ ...prev, errors, isValid: errors.length === 0 }));
  }, []);

  const setWarnings = useCallback((warnings: string[]) => {
    setValidationState((prev) => ({ ...prev, warnings }));
  }, []);

  return {
    validationState,
    setValid,
    setErrors,
    setWarnings,
  };
}
