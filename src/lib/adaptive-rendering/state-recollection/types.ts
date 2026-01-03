/**
 * State Recollection System Types
 * Handles module state persistence, context transitions, and dormant state management
 */

export type ModuleContext = 
  | 'editing'
  | 'browsing'
  | 'viewing'
  | 'transaction-staging'
  | 'metadata-editing'
  | 'domain-management'
  | 'marketplace'
  | 'analytics'
  | 'settings';

export type StateStatus = 'active' | 'dormant' | 'staged' | 'pending-transaction';

export type PersistenceType = 'session' | 'local' | 'none';

export interface StagedEdit {
  id: string;
  moduleContext: ModuleContext;
  domainName: string;
  editType: 'metadata' | 'address' | 'resolver' | 'fuses' | 'transfer' | 'other';
  changes: Record<string, any>;
  timestamp: number;
  status: StateStatus;
  requiresTransaction: boolean;
  canAutoSubmit: boolean;
}

export interface ModuleState {
  moduleId: string;
  context: ModuleContext;
  stagedEdits: StagedEdit[];
  activeState: Record<string, any>;
  lastActive: number;
  isDormant: boolean;
  requiresRecall: boolean;
}

export interface StateRecollectionConfig {
  moduleId: string;
  context: ModuleContext;
  requiresTransactionStaging: boolean;
  autoDormantOnContextSwitch: boolean;
  recallTriggers: string[];
  persistenceKey?: string;
  persistenceType?: PersistenceType;
}

export interface ContextTransition {
  from: ModuleContext;
  to: ModuleContext;
  timestamp: number;
  shouldDormant: boolean;
  shouldRecall: boolean;
}

export interface StateRecollectionEvent {
  type: 'edit-staged' | 'context-switched' | 'recall-triggered' | 'state-dormant' | 'state-recalled' | 'transaction-ready';
  moduleId: string;
  context: ModuleContext;
  data?: any;
  timestamp: number;
}

export interface StateRecollectionManager {
  stageEdit: (edit: Omit<StagedEdit, 'id' | 'timestamp' | 'status'>) => string;
  getStagedEdits: (moduleId?: string, context?: ModuleContext) => StagedEdit[];
  setDormant: (moduleId: string, reason?: string) => void;
  recallState: (moduleId: string, context: ModuleContext) => ModuleState | null;
  registerModule: (config: StateRecollectionConfig) => void;
  onContextTransition: (transition: ContextTransition) => void;
  getTransactionReadyEdits: (domainName?: string) => StagedEdit[];
  clearStagedEdits: (moduleId?: string, editIds?: string[]) => void;
  subscribe: (eventType: string, callback: (event: StateRecollectionEvent) => void) => () => void;
  getCurrentContext: () => ModuleContext;
  getModuleState: (moduleId: string) => ModuleState | undefined;
}
