import { useState, useCallback, useEffect } from 'react';
import { PublicClient } from 'viem';
import { getAllTextRecords } from '../../../lib/ens/ens-utils';
import type { ENSOperation } from '../types';

interface DomainDetails {
  name: string;
  resolvedAddress?: string | null;
  resolver?: string | null;
  expiry?: bigint | null;
  reverseName?: string | null;
  textRecordsCount: number;
  inspectedAt: Date;
}

export function useDomainInspector(
  publicClient: PublicClient | undefined,
  trackENSOperation: (op: Omit<ENSOperation, 'id' | 'timestamp'>, startTime?: number) => void
) {
  const [inspectingDomain, setInspectingDomain] = useState('');
  const [domainDetails, setDomainDetails] = useState<DomainDetails | null>(null);
  const [isLoadingDomain, setIsLoadingDomain] = useState(false);
  const [textRecords, setTextRecords] = useState<Record<string, string>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const inspectDomain = useCallback(async (domainName: string) => {
    if (!publicClient || !domainName) return;
    
    setIsLoadingDomain(true);
    setInspectingDomain(domainName);
    setTextRecords({});
    
    try {
      const normalizedName = domainName.toLowerCase().trim();
      const startTime = Date.now();
      
      const [resolvedAddress, resolver, expiry, records] = await Promise.all([
        publicClient.getEnsAddress({ name: normalizedName }).catch(() => null),
        publicClient.getEnsResolver({ name: normalizedName }).catch(() => null),
        (publicClient as any).getEnsExpiry?.({ name: normalizedName }).catch(() => null) || Promise.resolve(null),
        getAllTextRecords(publicClient, normalizedName).catch(() => []),
      ]);
      
      const reverseName = resolvedAddress 
        ? await publicClient.getEnsName({ address: resolvedAddress as any }).catch(() => null)
        : null;
      
      const duration = Date.now() - startTime;
      
      const recordsObj: Record<string, string> = {};
      records.forEach((r: { key: string; value: string }) => { recordsObj[r.key] = r.value; });
      setTextRecords(recordsObj);
      
      trackENSOperation({
        type: 'query',
        domain: normalizedName,
        operation: 'inspectDomain',
        result: 'success',
        duration,
        details: {
          resolvedAddress,
          resolver,
          expiry,
          reverseName,
          textRecordsCount: records.length,
        },
      });
      
      setDomainDetails({
        name: normalizedName,
        resolvedAddress,
        resolver,
        expiry,
        reverseName,
        textRecordsCount: records.length,
        inspectedAt: new Date(),
      });
    } catch (error: any) {
      trackENSOperation({
        type: 'query',
        domain: domainName,
        operation: 'inspectDomain',
        error: error.message,
      });
      setDomainDetails(null);
      setTextRecords({});
    } finally {
      setIsLoadingDomain(false);
    }
  }, [publicClient, trackENSOperation]);

  useEffect(() => {
    if (!autoRefresh || !publicClient || !inspectingDomain) return;
    
    const interval = setInterval(() => {
      if (inspectingDomain) {
        inspectDomain(inspectingDomain);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, inspectingDomain, inspectDomain, publicClient]);

  return {
    inspectingDomain,
    setInspectingDomain,
    domainDetails,
    isLoadingDomain,
    textRecords,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    inspectDomain,
  };
}

