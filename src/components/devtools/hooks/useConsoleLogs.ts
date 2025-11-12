import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ConsoleLog } from '../types';

export function useConsoleLogs() {
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState('');
  const [useRegexSearch, setUseRegexSearch] = useState(false);

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

  const filteredLogs = useMemo(() => {
    return consoleLogs.filter(log => {
      const matchesSearchQuery = matchesSearch(
        log.message + (log.ensContext?.domain || '') + (log.ensContext?.address || ''),
        searchQuery
      );
      const matchesFilter = filterType === 'all' || log.type === filterType;
      const matchesDomain = !domainFilter || matchesSearch(log.ensContext?.domain || '', domainFilter);
      return matchesSearchQuery && matchesFilter && matchesDomain;
    });
  }, [consoleLogs, searchQuery, filterType, domainFilter, matchesSearch]);

  const addConsoleLog = useCallback((
    type: ConsoleLog['type'],
    message: string,
    data?: any,
    stack?: string,
    ensContext?: ConsoleLog['ensContext']
  ) => {
    setConsoleLogs(prev => [...prev, {
      id: `log-${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: new Date(),
      data,
      stack,
      ensContext,
    }]);
  }, []);

  const clearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    const logsText = consoleLogs.map(log => {
      let text = `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}`;
      if (log.ensContext?.domain) {
        text += ` [Domain: ${log.ensContext.domain}]`;
      }
      if (log.ensContext?.operation) {
        text += ` [Operation: ${log.ensContext.operation}]`;
      }
      if (log.data) {
        text += '\n' + JSON.stringify(log.data, null, 2);
      }
      if (log.stack) {
        text += '\n' + log.stack;
      }
      return text;
    }).join('\n\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ens-console-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [consoleLogs]);

  const copyAllLogs = useCallback(() => {
    const logsText = consoleLogs.map(log => {
      let text = `[${log.timestamp.toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`;
      if (log.ensContext?.domain) {
        text += ` [Domain: ${log.ensContext.domain}]`;
      }
      if (log.data) {
        text += '\n' + JSON.stringify(log.data, null, 2);
      }
      if (log.stack) {
        text += '\n' + log.stack;
      }
      return text;
    }).join('\n\n');

    navigator.clipboard.writeText(logsText);
  }, [consoleLogs]);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const extractENSContext = (message: string, data?: any): ConsoleLog['ensContext'] => {
      const domainMatch = message.match(/([a-z0-9-]+\.eth)/i);
      const addressMatch = message.match(/0x[a-fA-F0-9]{40}/i);
      
      let operation: string | undefined;
      let category: ConsoleLog['ensContext']['category'];
      
      const msgLower = message.toLowerCase();
      
      if (msgLower.includes('transfer') && !msgLower.includes('subdomain')) {
        operation = 'transfer';
        category = 'domain';
      } else if (msgLower.includes('mintsubdomain') || msgLower.includes('createsubdomain') || 
                 msgLower.includes('removesubdomain') || msgLower.includes('transfersubdomain') ||
                 (msgLower.includes('subdomain') && !msgLower.includes('transfer'))) {
        operation = msgLower.includes('remove') ? 'removeSubdomain' : 
                   msgLower.includes('transfer') ? 'transferSubdomain' : 'mintSubdomain';
        category = 'subdomain';
      } else if (msgLower.includes('setaddr') || msgLower.includes('settext') || 
                 msgLower.includes('setcontenthash') || msgLower.includes('setttl') ||
                 msgLower.includes('setabi') || msgLower.includes('setpubkey') ||
                 msgLower.includes('setzonehash') || msgLower.includes('setresolver') ||
                 msgLower.includes('removetext') || msgLower.includes('setrecord')) {
        operation = 'setRecord';
        category = 'record';
      } else if (msgLower.includes('delegate') || msgLower.includes('delegation')) {
        operation = 'delegate';
        category = 'delegation';
      } else if (msgLower.includes('wrap') || msgLower.includes('unwrap') || 
                 msgLower.includes('setfuses') || msgLower.includes('approval')) {
        operation = msgLower.includes('unwrap') ? 'unwrap' : 
                   msgLower.includes('fuses') ? 'setFuses' : 'wrap';
        category = 'wrapper';
      } else if (msgLower.includes('renew') || msgLower.includes('register') || 
                 msgLower.includes('registration')) {
        operation = 'renew';
        category = 'registration';
      } else if (msgLower.includes('reverserecord') || msgLower.includes('reverse record') ||
                 msgLower.includes('setreverse')) {
        operation = 'setReverseRecord';
        category = 'reverse';
      } else if (msgLower.includes('resolve') || msgLower.includes('getens')) {
        operation = 'resolve';
        category = 'record';
      }

      return {
        domain: domainMatch ? domainMatch[1] : undefined,
        operation,
        address: addressMatch ? addressMatch[0] : undefined,
        category,
      };
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      const ensContext = extractENSContext(message, args);
      addConsoleLog('log', message, args, undefined, ensContext);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const error = args[0];
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message;
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      const stack = error instanceof Error ? error.stack : undefined;
      const ensContext = extractENSContext(message, args);
      addConsoleLog('error', message, args, stack, ensContext);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      const ensContext = extractENSContext(message, args);
      addConsoleLog('warn', message, args, undefined, ensContext);
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      const ensContext = extractENSContext(message, args);
      addConsoleLog('info', message, args, undefined, ensContext);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, [addConsoleLog]);

  return {
    consoleLogs,
    filteredLogs,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    domainFilter,
    setDomainFilter,
    useRegexSearch,
    setUseRegexSearch,
    addConsoleLog,
    clearConsole,
    exportLogs,
    copyAllLogs,
  };
}








