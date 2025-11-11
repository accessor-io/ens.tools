import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ENSOperation, Analytics, PerformanceProfile } from '../types';

export function useENSOperations() {
  const [ensOperations, setEnsOperations] = useState<ENSOperation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [useRegexSearch, setUseRegexSearch] = useState(false);
  const [performanceProfiles, setPerformanceProfiles] = useState<Map<string, PerformanceProfile>>(new Map());
  const [errorPatterns, setErrorPatterns] = useState<Array<{pattern: string; count: number}>>([]);

  const matchesSearch = useCallback((text: string, query: string): boolean => {
    if (!query) return true;
    if (useRegexSearch) {
      try {
        const regex = new RegExp(query, 'i');
        return regex.test(text);
      } catch {
        return text.toLowerCase().includes(query.toLowerCase());
      }
    }
    return text.toLowerCase().includes(query.toLowerCase());
  }, [useRegexSearch]);

  const filteredOperations = useMemo(() => {
    return ensOperations.filter(op => {
      const searchText = `${op.operation} ${op.domain || ''} ${op.address || ''}`;
      const matchesSearchQuery = matchesSearch(searchText, searchQuery);
      const matchesDomain = !domainFilter || matchesSearch(op.domain || '', domainFilter);
      return matchesSearchQuery && matchesDomain;
    });
  }, [ensOperations, searchQuery, domainFilter, matchesSearch]);

  const analytics = useMemo((): Analytics => {
    const totalOps = ensOperations.length;
    const successOps = ensOperations.filter(o => o.result).length;
    const errorOps = ensOperations.filter(o => o.error).length;
    const avgDuration = ensOperations
      .filter(o => o.duration !== undefined)
      .reduce((sum, o) => sum + (o.duration || 0), 0) / 
      Math.max(1, ensOperations.filter(o => o.duration !== undefined).length);
    
    const opsByType = ensOperations.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentOps = ensOperations
      .filter(o => Date.now() - o.timestamp.getTime() < 60000)
      .length;

    return {
      totalOps,
      successOps,
      errorOps,
      successRate: totalOps > 0 ? ((successOps / totalOps) * 100).toFixed(1) : '0',
      avgDuration: Math.round(avgDuration),
      opsByType,
      recentOps,
    };
  }, [ensOperations]);

  const trackENSOperation = useCallback((operation: Omit<ENSOperation, 'id' | 'timestamp'>, startTime?: number) => {
    const duration = startTime ? Date.now() - startTime : undefined;
    setEnsOperations(prev => [...prev, {
      id: `ens-op-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      duration,
      ...operation,
    }]);
  }, []);

  const clearOperations = useCallback(() => {
    setEnsOperations([]);
  }, []);

  const exportOperations = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      totalOperations: ensOperations.length,
      operations: ensOperations.map(op => ({
        id: op.id,
        type: op.type,
        operation: op.operation,
        domain: op.domain,
        address: op.address,
        timestamp: op.timestamp.toISOString(),
        duration: op.duration,
        result: op.result,
        error: op.error,
        details: op.details,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ens-operations-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [ensOperations]);

  const exportToCSV = useCallback(() => {
    const headers = ['Timestamp', 'Type', 'Operation', 'Domain', 'Address', 'Duration (ms)', 'Status', 'Error'];
    const rows = ensOperations.map(op => [
      op.timestamp.toISOString(),
      op.type,
      op.operation,
      op.domain || '',
      op.address || '',
      op.duration?.toString() || '',
      op.error ? 'Error' : op.result ? 'Success' : 'Pending',
      op.error || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ens-operations-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [ensOperations]);

  useEffect(() => {
    const profiles = new Map<string, PerformanceProfile>();
    
    ensOperations.forEach(op => {
      if (op.duration === undefined) return;
      
      const key = op.operation;
      const existing = profiles.get(key) || {
        operation: key,
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errors: 0,
        durations: [] as number[],
      };

      existing.count++;
      existing.totalDuration += op.duration;
      existing.minDuration = Math.min(existing.minDuration, op.duration);
      existing.maxDuration = Math.max(existing.maxDuration, op.duration);
      if (op.error) existing.errors++;
      if (!(existing as any).durations) (existing as any).durations = [];
      (existing as any).durations.push(op.duration);

      profiles.set(key, existing);
    });

    profiles.forEach((profile, key) => {
      const durations = (profile as any).durations || [];
      if (durations.length > 0) {
        const sorted = [...durations].sort((a, b) => a - b);
        profile.avgDuration = profile.totalDuration / profile.count;
        profile.p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
        profile.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        profile.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
        delete (profile as any).durations;
      }
    });

    setPerformanceProfiles(profiles);
  }, [ensOperations]);

  useEffect(() => {
    const patterns = new Map<string, number>();
    ensOperations
      .filter(op => op.error)
      .forEach(op => {
        const errorMsg = op.error || '';
        const pattern = errorMsg.split(':')[0] || errorMsg.substring(0, 50);
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      });
    
    setErrorPatterns(
      Array.from(patterns.entries())
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
  }, [ensOperations]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__ENS_CONSOLE_TRACK__ = trackENSOperation;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__ENS_CONSOLE_TRACK__;
      }
    };
  }, [trackENSOperation]);

  return {
    ensOperations,
    filteredOperations,
    searchQuery,
    setSearchQuery,
    domainFilter,
    setDomainFilter,
    useRegexSearch,
    setUseRegexSearch,
    analytics,
    performanceProfiles,
    errorPatterns,
    trackENSOperation,
    clearOperations,
    exportOperations,
    exportToCSV,
  };
}







