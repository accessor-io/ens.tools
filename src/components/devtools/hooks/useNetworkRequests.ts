import { useState, useEffect } from 'react';
import type { NetworkRequest } from '../types';

export function useNetworkRequests() {
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);

  useEffect(() => {
    const originalFetch = window.fetch;
    const isENSRelated = (url: string): boolean => {
      return url.includes('ens') || url.includes('eth') || url.includes('ethereum') || 
             url.includes('0x') || url.includes('namehash') || url.includes('resolver');
    };

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const [resource, init] = args;
      const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : resource.toString());
      const method = init?.method || 'GET';
      const startTime = Date.now();
      const requestId = `req-${Date.now()}-${Math.random()}`;

      const request: NetworkRequest = {
        id: requestId,
        url,
        method,
        timestamp: new Date(),
        isENSRelated: isENSRelated(url),
        requestHeaders: init?.headers as Record<string, string> || {},
        requestBody: init?.body || undefined,
      };

      setNetworkRequests(prev => [...prev, request]);

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        const clonedResponse = response.clone();
        
        let responseBody: any = null;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            responseBody = await clonedResponse.json();
          } else {
            responseBody = await clonedResponse.text();
          }
        } catch {}

        setNetworkRequests(prev => prev.map(req => 
          req.id === requestId ? {
            ...req,
            status: response.status,
            statusText: response.statusText,
            duration,
            responseHeaders: Object.fromEntries(response.headers.entries()),
            responseBody,
          } : req
        ));

        return response;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        setNetworkRequests(prev => prev.map(req => 
          req.id === requestId ? {
            ...req,
            error: error.message,
            duration,
          } : req
        ));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const clearNetwork = () => {
    setNetworkRequests([]);
  };

  return {
    networkRequests,
    clearNetwork,
  };
}


















