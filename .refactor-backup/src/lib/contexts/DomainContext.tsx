import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ENSDomain } from '../ens/ens-utils';

interface DomainContextType {
  selectedDomains: ENSDomain[];
  selectedDomain: ENSDomain | null;
  isBulkMode: boolean;
  selectDomain: (domain: ENSDomain) => void;
  selectDomains: (domains: ENSDomain[]) => void;
  addDomain: (domain: ENSDomain) => void;
  removeDomain: (domainName: string) => void;
  clearSelection: () => void;
  toggleDomain: (domain: ENSDomain) => void;
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

export function DomainProvider({ children }: { children: ReactNode }) {
  const [selectedDomains, setSelectedDomains] = useState<ENSDomain[]>([]);

  const selectDomain = useCallback((domain: ENSDomain) => {
    setSelectedDomains([domain]);
  }, []);

  const selectDomains = useCallback((domains: ENSDomain[]) => {
    setSelectedDomains(domains);
  }, []);

  const addDomain = useCallback((domain: ENSDomain) => {
    setSelectedDomains(prev => {
      if (prev.some(d => d.name === domain.name)) {
        return prev;
      }
      return [...prev, domain];
    });
  }, []);

  const removeDomain = useCallback((domainName: string) => {
    setSelectedDomains(prev => prev.filter(d => d.name !== domainName));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDomains([]);
  }, []);

  const toggleDomain = useCallback((domain: ENSDomain) => {
    setSelectedDomains(prev => {
      const exists = prev.some(d => d.name === domain.name);
      if (exists) {
        return prev.filter(d => d.name !== domain.name);
      } else {
        return [...prev, domain];
      }
    });
  }, []);

  const value: DomainContextType = {
    selectedDomains,
    selectedDomain: selectedDomains.length === 1 ? selectedDomains[0] : null,
    isBulkMode: selectedDomains.length > 1,
    selectDomain,
    selectDomains,
    addDomain,
    removeDomain,
    clearSelection,
    toggleDomain,
  };

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomainContext() {
  const context = useContext(DomainContext);
  if (context === undefined) {
    throw new Error('useDomainContext must be used within a DomainProvider');
  }
  return context;
}



