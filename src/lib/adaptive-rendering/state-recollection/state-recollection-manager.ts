import type {
  ModuleState,
  StagedEdit,
  ModuleContext,
  ContextTransition,
  StateRecollectionConfig,
  StateRecollectionEvent,
  StateRecollectionManager,
  PersistenceType,
} from './types';

/**
 * State Recollection Manager
 * Manages module state persistence, context transitions, and dormant state
 */
class StateRecollectionManagerImpl implements StateRecollectionManager {
  private moduleStates: Map<string, ModuleState> = new Map();
  private moduleConfigs: Map<string, StateRecollectionConfig> = new Map();
  private eventListeners: Map<string, Set<(event: StateRecollectionEvent) => void>> = new Map();
  private currentContext: ModuleContext = 'browsing';
  private editCounter = 0;

  /**
   * Stage an edit for later submission
   */
  stageEdit(edit: Omit<StagedEdit, 'id' | 'timestamp' | 'status'>): string {
    const editId = this.generateEditId(edit.moduleContext, edit.domainName);
    const stagedEdit: StagedEdit = {
      ...edit,
      id: editId,
      timestamp: Date.now(),
      status: edit.requiresTransaction ? 'staged' : 'active',
    };

    const moduleId = this.getModuleIdForContext(edit.moduleContext);
    const moduleState = this.getOrCreateModuleState(moduleId, edit.moduleContext);
    
    moduleState.stagedEdits.push(stagedEdit);
    moduleState.lastActive = Date.now();
    moduleState.isDormant = false;
    moduleState.requiresRecall = false;

    this.persistModuleState(moduleId, moduleState);
    this.emitEvent({
      type: 'edit-staged',
      moduleId,
      context: edit.moduleContext,
      data: { editId, edit },
      timestamp: Date.now(),
    });

    if (edit.requiresTransaction) {
      this.emitEvent({
        type: 'transaction-ready',
        moduleId,
        context: edit.moduleContext,
        data: { editId, domainName: edit.domainName },
        timestamp: Date.now(),
      });
    }

    return editId;
  }

  /**
   * Get staged edits for a module or context
   */
  getStagedEdits(moduleId?: string, context?: ModuleContext): StagedEdit[] {
    if (moduleId) {
      const state = this.moduleStates.get(moduleId);
      return state?.stagedEdits || [];
    }

    if (context) {
      const moduleIdForContext = this.getModuleIdForContext(context);
      const state = this.moduleStates.get(moduleIdForContext);
      return state?.stagedEdits || [];
    }

    const allEdits: StagedEdit[] = [];
    for (const state of this.moduleStates.values()) {
      allEdits.push(...state.stagedEdits);
    }
    return allEdits;
  }

  /**
   * Set module state to dormant
   */
  setDormant(moduleId: string, reason?: string): void {
    const state = this.moduleStates.get(moduleId);
    if (!state) return;

    state.isDormant = true;
    state.requiresRecall = true;
    state.lastActive = Date.now();

    this.persistModuleState(moduleId, state);
    this.emitEvent({
      type: 'state-dormant',
      moduleId,
      context: state.context,
      data: { reason },
      timestamp: Date.now(),
    });
  }

  /**
   * Recall module state when returning to relevant context
   */
  recallState(moduleId: string, context: ModuleContext): ModuleState | null {
    const state = this.moduleStates.get(moduleId);
    if (!state) return null;

    state.isDormant = false;
    state.requiresRecall = false;
    state.context = context;
    state.lastActive = Date.now();

    this.persistModuleState(moduleId, state);
    this.emitEvent({
      type: 'state-recalled',
      moduleId,
      context,
      data: { stagedEditsCount: state.stagedEdits.length },
      timestamp: Date.now(),
    });

    return state;
  }

  /**
   * Register a module with its configuration
   */
  registerModule(config: StateRecollectionConfig): void {
    this.moduleConfigs.set(config.moduleId, config);
    const state = this.getOrCreateModuleState(config.moduleId, config.context);
    
    const loadedState = this.loadModuleState(config.moduleId);
    if (loadedState) {
      Object.assign(state, loadedState);
    }
    
    this.persistModuleState(config.moduleId, state);
  }

  /**
   * Handle context transition
   */
  onContextTransition(transition: ContextTransition): void {
    const previousContext = this.currentContext;
    this.currentContext = transition.to;

    for (const [moduleId, config] of this.moduleConfigs.entries()) {
      const state = this.moduleStates.get(moduleId);
      if (!state) continue;

      const isLeavingEditingContext = 
        (previousContext === 'editing' || previousContext === 'metadata-editing') &&
        (transition.to === 'browsing' || transition.to === 'viewing');

      const isEnteringEditingContext =
        (transition.to === 'editing' || transition.to === 'metadata-editing') &&
        (state.context === transition.to || state.context === 'editing' || state.context === 'metadata-editing');

      if (isLeavingEditingContext && config.autoDormantOnContextSwitch) {
        if (state.stagedEdits.length > 0) {
          this.setDormant(moduleId, `Context switched from ${previousContext} to ${transition.to}`);
        }
      }

      if (isEnteringEditingContext && state.requiresRecall) {
        this.recallState(moduleId, transition.to);
      }
    }

    this.emitEvent({
      type: 'context-switched',
      moduleId: 'system',
      context: transition.to,
      data: { transition },
      timestamp: Date.now(),
    });
  }

  /**
   * Get edits ready for transaction submission
   */
  getTransactionReadyEdits(domainName?: string): StagedEdit[] {
    const allEdits = this.getStagedEdits();
    return allEdits.filter(
      (edit) =>
        edit.requiresTransaction &&
        edit.status === 'staged' &&
        (!domainName || edit.domainName === domainName)
    );
  }

  /**
   * Clear staged edits
   */
  clearStagedEdits(moduleId?: string, editIds?: string[]): void {
    if (moduleId) {
      const state = this.moduleStates.get(moduleId);
      if (state) {
        if (editIds) {
          state.stagedEdits = state.stagedEdits.filter((edit) => !editIds.includes(edit.id));
        } else {
          state.stagedEdits = [];
        }
        this.persistModuleState(moduleId, state);
      }
    } else {
      for (const [id, state] of this.moduleStates.entries()) {
        if (editIds) {
          state.stagedEdits = state.stagedEdits.filter((edit) => !editIds.includes(edit.id));
        } else {
          state.stagedEdits = [];
        }
        this.persistModuleState(id, state);
      }
    }
  }

  /**
   * Subscribe to state recollection events
   */
  subscribe(eventType: string, callback: (event: StateRecollectionEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);

    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Get current context
   */
  getCurrentContext(): ModuleContext {
    return this.currentContext;
  }

  /**
   * Get module state
   */
  getModuleState(moduleId: string): ModuleState | undefined {
    return this.moduleStates.get(moduleId);
  }

  // Private helpers

  private generateEditId(context: ModuleContext, domainName: string): string {
    const moduleId = this.getModuleIdForContext(context);
    const stateId = `edit-${Date.now()}-${++this.editCounter}`;
    return `${moduleId}.${context}.${stateId}`;
  }

  private getModuleIdForContext(context: ModuleContext): string {
    const contextToModule: Record<ModuleContext, string> = {
      'editing': 'domain-profile',
      'browsing': 'domain-browser',
      'viewing': 'domain-viewer',
      'transaction-staging': 'transaction-manager',
      'metadata-editing': 'metadata-editor',
      'domain-management': 'domain-manager',
      'marketplace': 'marketplace',
      'analytics': 'analytics',
      'settings': 'settings',
    };
    return contextToModule[context] || `module-${context}`;
  }

  private getOrCreateModuleState(moduleId: string, context: ModuleContext): ModuleState {
    let state = this.moduleStates.get(moduleId);
    if (!state) {
      state = {
        moduleId,
        context,
        stagedEdits: [],
        activeState: {},
        lastActive: Date.now(),
        isDormant: false,
        requiresRecall: false,
      };
      this.moduleStates.set(moduleId, state);
    }
    return state;
  }

  private persistModuleState(moduleId: string, state: ModuleState): void {
    const config = this.moduleConfigs.get(moduleId);
    if (!config || config.persistenceType === 'none') {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storage = config.persistenceType === 'local' ? localStorage : sessionStorage;
      const key = config.persistenceKey || `state-recollection-${moduleId}`;
      const serialized = JSON.stringify({
        stagedEdits: state.stagedEdits,
        activeState: state.activeState,
        lastActive: state.lastActive,
        isDormant: state.isDormant,
        requiresRecall: state.requiresRecall,
      });
      storage.setItem(key, serialized);
    } catch (error) {
      console.warn('Failed to persist module state:', error);
    }
  }

  private loadModuleState(moduleId: string): ModuleState | null {
    const config = this.moduleConfigs.get(moduleId);
    if (!config || config.persistenceType === 'none' || typeof window === 'undefined') {
      return null;
    }

    try {
      const storage = config.persistenceType === 'local' ? localStorage : sessionStorage;
      const key = config.persistenceKey || `state-recollection-${moduleId}`;
      const serialized = storage.getItem(key);
      if (serialized) {
        const data = JSON.parse(serialized);
        return {
          moduleId,
          context: config.context,
          stagedEdits: data.stagedEdits || [],
          activeState: data.activeState || {},
          lastActive: data.lastActive || Date.now(),
          isDormant: data.isDormant || false,
          requiresRecall: data.requiresRecall || false,
        };
      }
    } catch (error) {
      console.warn('Failed to load module state:', error);
    }

    return null;
  }

  private emitEvent(event: StateRecollectionEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in state recollection event listener:', error);
        }
      });
    }

    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in state recollection event listener:', error);
        }
      });
    }
  }
}

export const stateRecollectionManager = new StateRecollectionManagerImpl();
