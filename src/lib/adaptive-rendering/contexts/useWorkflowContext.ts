import { useState, useCallback } from 'react';
import type { WorkflowContextState, ValidationState, TransactionState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access workflow context state
 * Manages workflow steps, validation, and transaction states
 */
export function useWorkflowContext(): WorkflowContextState {
  const [workflowState, setWorkflowState] = useState<WorkflowContextState>(
    getDefaultContextState('workflow')
  );

  return workflowState;
}

/**
 * Hook to manage workflow context state
 * Provides methods to update workflow state
 */
export function useWorkflowContextManager() {
  const [workflowState, setWorkflowState] = useState<WorkflowContextState>(
    getDefaultContextState('workflow')
  );

  const setCurrentStep = useCallback((step: string | undefined) => {
    setWorkflowState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const setWorkflowType = useCallback((type: string | undefined) => {
    setWorkflowState((prev) => ({ ...prev, workflowType: type }));
  }, []);

  const setValidationState = useCallback((state: ValidationState | undefined) => {
    setWorkflowState((prev) => ({ ...prev, validationState: state }));
  }, []);

  const setTransactionState = useCallback((state: TransactionState | undefined) => {
    setWorkflowState((prev) => ({ ...prev, transactionState: state }));
  }, []);

  const setIsProcessing = useCallback((processing: boolean) => {
    setWorkflowState((prev) => ({ ...prev, isProcessing: processing }));
  }, []);

  return {
    workflowState,
    setCurrentStep,
    setWorkflowType,
    setValidationState,
    setTransactionState,
    setIsProcessing,
  };
}
