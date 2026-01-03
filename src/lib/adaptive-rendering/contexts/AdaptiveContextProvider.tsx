import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { AdaptiveContextState, UseAdaptiveContextReturn, AdaptiveContextProviderProps } from '../types';
import { getDefaultAdaptiveContextState } from '../context-registry';
import { useDomainContext } from './useDomainContext';
import { useThemeContext } from './useThemeContext';
import { useDeviceContext } from './useDeviceContext';
import { useWorkflowContext } from './useWorkflowContext';
import { useNetworkContext } from './useNetworkContext';
import { useUserContext } from './useUserContext';
import { useValidationContext } from './useValidationContext';
import { useTransactionContext } from './useTransactionContext';

const AdaptiveContext = createContext<UseAdaptiveContextReturn | undefined>(undefined);

/**
 * AdaptiveContextProvider
 * Main provider that aggregates all context states and provides unified access
 */
export function AdaptiveContextProvider({
  children,
  initialContext,
}: AdaptiveContextProviderProps) {
  const domainState = useDomainContext();
  const themeState = useThemeContext();
  const deviceState = useDeviceContext();
  const workflowState = useWorkflowContext();
  const networkState = useNetworkContext();
  const userState = useUserContext();
  const validationState = useValidationContext();
  const transactionState = useTransactionContext();

  const contextState = useMemo<AdaptiveContextState>(() => {
    const baseState: AdaptiveContextState = {
      domain: domainState,
      theme: themeState,
      device: deviceState,
      workflow: workflowState,
      network: networkState,
      user: userState,
      validation: validationState,
      transaction: transactionState,
    };

    if (initialContext) {
      return {
        domain: { ...baseState.domain, ...initialContext.domain },
        theme: { ...baseState.theme, ...initialContext.theme },
        device: { ...baseState.device, ...initialContext.device },
        workflow: { ...baseState.workflow, ...initialContext.workflow },
        network: { ...baseState.network, ...initialContext.network },
        user: { ...baseState.user, ...initialContext.user },
        validation: { ...baseState.validation, ...initialContext.validation },
        transaction: { ...baseState.transaction, ...initialContext.transaction },
      };
    }

    return baseState;
  }, [
    domainState,
    themeState,
    deviceState,
    workflowState,
    networkState,
    userState,
    validationState,
    transactionState,
    initialContext,
  ]);

  const updateContext = React.useCallback(
    <T extends keyof AdaptiveContextState>(
      type: T,
      updater: (prev: AdaptiveContextState[T]) => AdaptiveContextState[T]
    ) => {
      console.warn(
        `updateContext called for ${type}, but state updates should be managed by individual context hooks`
      );
    },
    []
  );

  const getContext = React.useCallback(
    <T extends keyof AdaptiveContextState>(type: T): AdaptiveContextState[T] => {
      return contextState[type];
    },
    [contextState]
  );

  const value = useMemo<UseAdaptiveContextReturn>(
    () => ({
      state: contextState,
      updateContext,
      getContext,
    }),
    [contextState, updateContext, getContext]
  );

  return <AdaptiveContext.Provider value={value}>{children}</AdaptiveContext.Provider>;
}

/**
 * Hook to access adaptive context
 */
export function useAdaptiveContext(): UseAdaptiveContextReturn {
  const context = useContext(AdaptiveContext);
  if (context === undefined) {
    throw new Error('useAdaptiveContext must be used within an AdaptiveContextProvider');
  }
  return context;
}

/**
 * Hook to get all context states
 */
export function useAdaptiveContexts(): AdaptiveContextState {
  const { state } = useAdaptiveContext();
  return state;
}
