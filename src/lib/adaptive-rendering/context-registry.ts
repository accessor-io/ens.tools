import type {
  ContextType,
  AdaptiveContextState,
  DomainContextState,
  ThemeContextState,
  DeviceContextState,
  WorkflowContextState,
  NetworkContextState,
  UserContextState,
  ValidationContextState,
  TransactionContextState,
} from './types';

/**
 * Context Registry
 * Central registry for all context types and their default state configurations
 */

export interface ContextRegistryEntry<T = any> {
  type: ContextType;
  defaultState: T;
  validator?: (state: any) => boolean;
  transformer?: (state: any) => T;
}

/**
 * Default context states
 */

const defaultDomainState: DomainContextState = {
  selectedDomain: null,
  selectedDomains: [],
  isBulkMode: false,
  domainPermissions: undefined,
  domainMetadata: undefined,
};

const defaultThemeState: ThemeContextState = {
  theme: 'auto',
  compactMode: false,
  highContrast: false,
  reducedMotion: false,
};

const defaultDeviceState: DeviceContextState = {
  viewport: { width: typeof window !== 'undefined' ? window.innerWidth : 1920, height: typeof window !== 'undefined' ? window.innerHeight : 1080 },
  deviceType: 'desktop',
  orientation: 'landscape',
  touchSupport: typeof window !== 'undefined' && 'ontouchstart' in window,
  prefersReducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

const defaultWorkflowState: WorkflowContextState = {
  currentStep: undefined,
  workflowType: undefined,
  validationState: undefined,
  transactionState: undefined,
  isProcessing: false,
};

const defaultNetworkState: NetworkContextState = {
  chainId: undefined,
  networkStatus: 'disconnected',
  account: null,
  isConnected: false,
};

const defaultUserState: UserContextState = {
  preferences: undefined,
  permissions: undefined,
  role: undefined,
};

const defaultValidationState: ValidationContextState = {
  isValid: undefined,
  errors: undefined,
  warnings: undefined,
};

const defaultTransactionState: TransactionContextState = {
  pendingTransactions: 0,
  lastTransactionHash: undefined,
  transactionError: null,
};

/**
 * Context Registry
 * Maps context types to their registry entries
 */

export const contextRegistry: Record<ContextType, ContextRegistryEntry> = {
  domain: {
    type: 'domain',
    defaultState: defaultDomainState,
    validator: (state): state is DomainContextState => {
      return (
        typeof state === 'object' &&
        state !== null &&
        Array.isArray(state.selectedDomains) &&
        typeof state.isBulkMode === 'boolean'
      );
    },
  },
  theme: {
    type: 'theme',
    defaultState: defaultThemeState,
    validator: (state): state is ThemeContextState => {
      return (
        typeof state === 'object' &&
        state !== null &&
        ['light', 'dark', 'auto'].includes(state.theme) &&
        typeof state.compactMode === 'boolean'
      );
    },
  },
  device: {
    type: 'device',
    defaultState: defaultDeviceState,
    validator: (state): state is DeviceContextState => {
      return (
        typeof state === 'object' &&
        state !== null &&
        typeof state.viewport === 'object' &&
        ['mobile', 'tablet', 'desktop'].includes(state.deviceType)
      );
    },
  },
  workflow: {
    type: 'workflow',
    defaultState: defaultWorkflowState,
    validator: (state): state is WorkflowContextState => {
      return typeof state === 'object' && state !== null;
    },
  },
  network: {
    type: 'network',
    defaultState: defaultNetworkState,
    validator: (state): state is NetworkContextState => {
      return (
        typeof state === 'object' &&
        state !== null &&
        ['connected', 'disconnected', 'switching'].includes(state.networkStatus)
      );
    },
  },
  user: {
    type: 'user',
    defaultState: defaultUserState,
    validator: (state): state is UserContextState => {
      return typeof state === 'object' && state !== null;
    },
  },
  validation: {
    type: 'validation',
    defaultState: defaultValidationState,
    validator: (state): state is ValidationContextState => {
      return typeof state === 'object' && state !== null;
    },
  },
  transaction: {
    type: 'transaction',
    defaultState: defaultTransactionState,
    validator: (state): state is TransactionContextState => {
      return (
        typeof state === 'object' &&
        state !== null &&
        typeof state.pendingTransactions === 'number'
      );
    },
  },
};

/**
 * Get default state for a context type
 */
export function getDefaultContextState<T extends ContextType>(
  type: T
): AdaptiveContextState[T] {
  return contextRegistry[type].defaultState as AdaptiveContextState[T];
}

/**
 * Get default adaptive context state
 */
export function getDefaultAdaptiveContextState(): AdaptiveContextState {
  return {
    domain: defaultDomainState,
    theme: defaultThemeState,
    device: defaultDeviceState,
    workflow: defaultWorkflowState,
    network: defaultNetworkState,
    user: defaultUserState,
    validation: defaultValidationState,
    transaction: defaultTransactionState,
  };
}

/**
 * Validate context state
 */
export function validateContextState<T extends ContextType>(
  type: T,
  state: any
): state is AdaptiveContextState[T] {
  const entry = contextRegistry[type];
  if (!entry.validator) {
    return true;
  }
  return entry.validator(state);
}

/**
 * Transform context state
 */
export function transformContextState<T extends ContextType>(
  type: T,
  state: any
): AdaptiveContextState[T] {
  const entry = contextRegistry[type];
  if (entry.transformer) {
    return entry.transformer(state);
  }
  return state as AdaptiveContextState[T];
}

/**
 * Merge context states
 */
export function mergeContextStates(
  base: AdaptiveContextState,
  updates: Partial<AdaptiveContextState>
): AdaptiveContextState {
  return {
    domain: { ...base.domain, ...updates.domain },
    theme: { ...base.theme, ...updates.theme },
    device: { ...base.device, ...updates.device },
    workflow: { ...base.workflow, ...updates.workflow },
    network: { ...base.network, ...updates.network },
    user: { ...base.user, ...updates.user },
    validation: { ...base.validation, ...updates.validation },
    transaction: { ...base.transaction, ...updates.transaction },
  };
}
