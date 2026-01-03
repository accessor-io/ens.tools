import * as React from 'react';
import type { ENSDomain } from '../ens/ens-utils';

/**
 * Context State Interfaces
 * Each context type defines its state structure
 */

export interface DomainContextState {
  selectedDomain: ENSDomain | null;
  selectedDomains: ENSDomain[];
  isBulkMode: boolean;
  domainPermissions?: PermissionSet;
  domainMetadata?: Record<string, any>;
}

export interface ThemeContextState {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  isDarkMode: boolean;
}

export interface DeviceContextState {
  viewport: { width: number; height: number };
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  prefersReducedMotion: boolean;
}

export interface WorkflowContextState {
  currentStep?: string;
  workflowType?: string;
  validationState?: ValidationState;
  transactionState?: TransactionState;
  isProcessing?: boolean;
}

export interface NetworkContextState {
  chainId?: number;
  networkStatus: 'connected' | 'disconnected' | 'switching';
  account: string | null;
  isConnected: boolean;
}

export interface UserContextState {
  preferences?: Record<string, any>;
  permissions?: PermissionSet;
  role?: string;
}

export interface ValidationContextState {
  isValid?: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface TransactionContextState {
  pendingTransactions?: number;
  lastTransactionHash?: string;
  transactionError?: string | null;
}

/**
 * Permission and Validation Types
 */

export interface PermissionSet {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canTransfer: boolean;
  canUpdateMetadata: boolean;
  [key: string]: boolean | any;
}

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'error';
export type TransactionState = 'idle' | 'pending' | 'confirming' | 'success' | 'failed' | 'reverted';

/**
 * Unified Context State
 * Aggregates all context states into a single object
 */

export interface AdaptiveContextState {
  domain: DomainContextState;
  theme: ThemeContextState;
  device: DeviceContextState;
  workflow: WorkflowContextState;
  network: NetworkContextState;
  user: UserContextState;
  validation: ValidationContextState;
  transaction: TransactionContextState;
}

/**
 * Context Type Keys
 */

export type ContextType = 
  | 'domain'
  | 'theme'
  | 'device'
  | 'workflow'
  | 'network'
  | 'user'
  | 'validation'
  | 'transaction';

/**
 * Adaptation Types
 */

export type AdaptationValue = 
  | string
  | number
  | boolean
  | React.ReactNode
  | Record<string, any>
  | undefined
  | null;

export interface ComponentAdaptation {
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  hidden?: boolean;
  children?: React.ReactNode;
  [key: string]: AdaptationValue;
}

/**
 * Adaptation Rule
 * Defines when and how to adapt a component based on context state
 */

export interface AdaptationRule<TContextState = any> {
  when: (state: TContextState) => boolean;
  adapt: ComponentAdaptation | ((state: TContextState, props: any) => ComponentAdaptation);
  priority?: number;
}

/**
 * Component Adaptations Configuration
 * Maps context types to their adaptation rules
 */

export interface ComponentAdaptations<TProps = any> {
  domain?: AdaptationRule<DomainContextState>[];
  theme?: AdaptationRule<ThemeContextState>[];
  device?: AdaptationRule<DeviceContextState>[];
  workflow?: AdaptationRule<WorkflowContextState>[];
  network?: AdaptationRule<NetworkContextState>[];
  user?: AdaptationRule<UserContextState>[];
  validation?: AdaptationRule<ValidationContextState>[];
  transaction?: AdaptationRule<TransactionContextState>[];
  default?: ComponentAdaptation;
}

/**
 * Computed Adaptations
 * Result of applying all adaptation rules to a component
 */

export interface ComputedAdaptations {
  className?: string;
  style?: React.CSSProperties;
  props: Record<string, AdaptationValue>;
  priority: number;
}

/**
 * Polymorphic Component Props
 * Supports 'as' prop for element type polymorphism
 */

export interface PolymorphicProps<T extends React.ElementType = React.ElementType> {
  as?: T;
  asChild?: boolean;
}

/**
 * Adaptive Component Props
 * Extends component props with adaptive capabilities
 */

export type AdaptiveComponentProps<
  T extends React.ElementType,
  TProps = React.ComponentProps<T>
> = TProps & 
  PolymorphicProps<T> & {
    adaptive?: boolean;
    overrideAdaptations?: Partial<ComponentAdaptations<TProps>>;
  };

/**
 * Context Provider Props
 */

export interface AdaptiveContextProviderProps {
  children: React.ReactNode;
  initialContext?: Partial<AdaptiveContextState>;
}

/**
 * Context Hook Return Type
 */

export interface UseAdaptiveContextReturn {
  state: AdaptiveContextState;
  updateContext: <T extends ContextType>(
    type: T,
    updater: (prev: AdaptiveContextState[T]) => AdaptiveContextState[T]
  ) => void;
  getContext: <T extends ContextType>(type: T) => AdaptiveContextState[T];
}

/**
 * Adaptation Engine Options
 */

export interface AdaptationEngineOptions {
  mergeStrategy?: 'override' | 'merge' | 'compose';
  classNameMergeStrategy?: 'override' | 'append' | 'smart';
  priorityThreshold?: number;
}

/**
 * Component Registry Entry
 */

export interface ComponentRegistryEntry {
  component: React.ComponentType<any>;
  adaptations: ComponentAdaptations;
  defaultProps?: Record<string, any>;
}
