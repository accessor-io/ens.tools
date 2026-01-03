import { useEffect, useState, useCallback, useRef } from 'react';
import { stateRecollectionManager } from '../state-recollection-manager';
import type {
  ModuleContext,
  StagedEdit,
  StateRecollectionEvent,
  StateRecollectionConfig,
  ModuleState,
} from '../types';

/**
 * Hook for state recollection in components
 */
export function useStateRecollection(
  moduleId: string,
  context: ModuleContext,
  config?: Partial<StateRecollectionConfig>
) {
  const [stagedEdits, setStagedEdits] = useState<StagedEdit[]>([]);
  const [isDormant, setIsDormant] = useState(false);
  const [requiresRecall, setRequiresRecall] = useState(false);
  const configRef = useRef<StateRecollectionConfig | null>(null);

  useEffect(() => {
    const fullConfig: StateRecollectionConfig = {
      moduleId,
      context,
      requiresTransactionStaging: config?.requiresTransactionStaging ?? true,
      autoDormantOnContextSwitch: config?.autoDormantOnContextSwitch ?? true,
      recallTriggers: config?.recallTriggers || [],
      persistenceKey: config?.persistenceKey || moduleId,
      persistenceType: config?.persistenceType || 'session',
    };

    stateRecollectionManager.registerModule(fullConfig);
    configRef.current = fullConfig;

    const moduleState = stateRecollectionManager.getModuleState(moduleId);
    if (moduleState) {
      setStagedEdits(moduleState.stagedEdits);
      setIsDormant(moduleState.isDormant);
      setRequiresRecall(moduleState.requiresRecall);
    }

    const unsubscribe = stateRecollectionManager.subscribe('*', (event: StateRecollectionEvent) => {
      if (event.moduleId === moduleId || event.context === context) {
        const state = stateRecollectionManager.getModuleState(moduleId);
        if (state) {
          setStagedEdits([...state.stagedEdits]);
          setIsDormant(state.isDormant);
          setRequiresRecall(state.requiresRecall);
        }
      }

      if (event.type === 'context-switched' && event.context === context && requiresRecall) {
        const recalled = stateRecollectionManager.recallState(moduleId, context);
        if (recalled) {
          setStagedEdits(recalled.stagedEdits);
          setIsDormant(false);
          setRequiresRecall(false);
        }
      }
    });

    return unsubscribe;
  }, [moduleId, context]);

  const stageEdit = useCallback(
    (edit: Omit<StagedEdit, 'id' | 'timestamp' | 'status' | 'moduleContext'>) => {
      const editId = stateRecollectionManager.stageEdit({
        ...edit,
        moduleContext: context,
      });
      const state = stateRecollectionManager.getModuleState(moduleId);
      if (state) {
        setStagedEdits([...state.stagedEdits]);
      }
      return editId;
    },
    [moduleId, context]
  );

  const clearStagedEdits = useCallback(
    (editIds?: string[]) => {
      stateRecollectionManager.clearStagedEdits(moduleId, editIds);
      const state = stateRecollectionManager.getModuleState(moduleId);
      if (state) {
        setStagedEdits([...state.stagedEdits]);
      }
    },
    [moduleId]
  );

  const getTransactionReadyEdits = useCallback(
    (domainName?: string) => {
      return stateRecollectionManager.getTransactionReadyEdits(domainName);
    },
    []
  );

  const recallState = useCallback(() => {
    const recalled = stateRecollectionManager.recallState(moduleId, context);
    if (recalled) {
      setStagedEdits(recalled.stagedEdits);
      setIsDormant(false);
      setRequiresRecall(false);
      return recalled;
    }
    return null;
  }, [moduleId, context]);

  return {
    stagedEdits,
    isDormant,
    requiresRecall,
    stageEdit,
    clearStagedEdits,
    getTransactionReadyEdits,
    recallState,
  };
}

/**
 * Hook to detect context transitions and trigger state recollection
 */
export function useContextTransition() {
  const [currentContext, setCurrentContext] = useState<ModuleContext>(
    stateRecollectionManager.getCurrentContext()
  );

  useEffect(() => {
    const unsubscribe = stateRecollectionManager.subscribe('context-switched', (event) => {
      setCurrentContext(event.context as ModuleContext);
    });

    return unsubscribe;
  }, []);

  const transitionTo = useCallback((to: ModuleContext) => {
    const from = currentContext;
    const shouldDormant =
      (from === 'editing' || from === 'metadata-editing') &&
      (to === 'browsing' || to === 'viewing');
    const shouldRecall =
      (to === 'editing' || to === 'metadata-editing') &&
      from !== to;

    stateRecollectionManager.onContextTransition({
      from,
      to,
      timestamp: Date.now(),
      shouldDormant,
      shouldRecall,
    });

    setCurrentContext(to);
  }, [currentContext]);

  return {
    currentContext,
    transitionTo,
  };
}
