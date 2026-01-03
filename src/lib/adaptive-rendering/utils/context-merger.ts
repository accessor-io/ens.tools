import type { AdaptiveContextState } from '../types';

/**
 * Merge multiple context states
 * Combines context states with priority handling
 */
export function mergeContextStates(
  ...states: Partial<AdaptiveContextState>[]
): AdaptiveContextState {
  return states.reduce(
    (acc, state) => ({
      domain: { ...acc.domain, ...state.domain },
      theme: { ...acc.theme, ...state.theme },
      device: { ...acc.device, ...state.device },
      workflow: { ...acc.workflow, ...state.workflow },
      network: { ...acc.network, ...state.network },
      user: { ...acc.user, ...state.user },
      validation: { ...acc.validation, ...state.validation },
      transaction: { ...acc.transaction, ...state.transaction },
    }),
    {} as AdaptiveContextState
  );
}

/**
 * Get context state by type
 */
export function getContextByType<T extends keyof AdaptiveContextState>(
  state: AdaptiveContextState,
  type: T
): AdaptiveContextState[T] {
  return state[type];
}
