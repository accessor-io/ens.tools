import { useContext } from 'react';
import { useDomainContext as useOriginalDomainContext } from '../../contexts/DomainContext';
import type { DomainContextState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access domain context state in adaptive rendering system
 * Wraps the original domain context and transforms it to DomainContextState
 */
export function useDomainContext(): DomainContextState {
  try {
    const originalContext = useOriginalDomainContext();
    
    return {
      selectedDomain: originalContext.selectedDomain,
      selectedDomains: originalContext.selectedDomains,
      isBulkMode: originalContext.isBulkMode,
      domainPermissions: undefined,
      domainMetadata: originalContext.selectedDomain
        ? {
            name: originalContext.selectedDomain.name,
            owner: originalContext.selectedDomain.owner,
            resolver: originalContext.selectedDomain.resolver,
            expiryDate: originalContext.selectedDomain.expiryDate,
            isWrapped: originalContext.selectedDomain.isWrapped,
          }
        : undefined,
    };
  } catch {
    return getDefaultContextState('domain');
  }
}
