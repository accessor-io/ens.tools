import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Terminal, 
  Network, 
  Code, 
  Database, 
  ChevronDown, 
  ChevronRight,
  Trash2,
  Copy,
  Download
} from 'lucide-react';
import { useWeb3 } from '../../lib/services';
import { ConsoleLogItem } from './ConsoleLogItem';

interface ConsoleLog {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  data?: any;
  stack?: string;
}

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  timestamp: Date;
  duration?: number;
  request?: any;
  response?: any;
}

export function DevTools() {
  const { address, isConnected, publicClient, walletClient } = useWeb3();
  const [activeTab, setActiveTab] = useState('console');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isMinimized, setIsMinimized] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

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
      addConsoleLog('log', message, args);
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
      addConsoleLog('error', message, args, stack);
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
      addConsoleLog('warn', message, args);
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
      addConsoleLog('info', message, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  // Intercept fetch requests
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: any[]) => {
      const [url, options] = args;
      const startTime = Date.now();
      const requestId = `req-${Date.now()}-${Math.random()}`;

      const request: NetworkRequest = {
        id: requestId,
        method: options?.method || 'GET',
        url: typeof url === 'string' ? url : url.url,
        timestamp: new Date(),
        request: options,
      };

      setNetworkRequests(prev => [...prev, request]);

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        setNetworkRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { 
                ...req, 
                status: response.status, 
                statusText: response.statusText,
                duration,
                response: response.clone()
              }
            : req
        ));

        return response;
      } catch (error) {
        setNetworkRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 0, statusText: 'Failed', duration: Date.now() - startTime }
            : req
        ));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const addConsoleLog = (type: ConsoleLog['type'], message: string, data?: any, stack?: string) => {
    setConsoleLogs(prev => [...prev, {
      id: `log-${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: new Date(),
      data,
      stack,
    }]);
  };

  const clearConsole = () => {
    setConsoleLogs([]);
  };

  const exportLogs = () => {
    const logsText = consoleLogs.map(log => {
      let text = `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}`;
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
    a.download = `console-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyAllLogs = () => {
    const logsText = consoleLogs.map(log => {
      let text = `[${log.timestamp.toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`;
      if (log.data) {
        text += '\n' + JSON.stringify(log.data, null, 2);
      }
      if (log.stack) {
        text += '\n' + log.stack;
      }
      return text;
    }).join('\n\n');

    navigator.clipboard.writeText(logsText);
  };

  const clearNetwork = () => {
    setNetworkRequests([]);
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-slate-400';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400) return 'text-red-400';
    return 'text-slate-400';
  };


  const filteredLogs = consoleLogs.filter(log => {
    const matchesSearch = !searchQuery || log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredRequests = networkRequests.filter(req => {
    if (!searchQuery) return true;
    return req.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
           req.method.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#1e1e1e] border-t border-slate-700 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Terminal className="h-3 w-3" />
          <span>DevTools</span>
          <span className="text-slate-600">•</span>
          <span>{consoleLogs.length} logs</span>
          <span className="text-slate-600">•</span>
          <span>{networkRequests.length} requests</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-slate-400 hover:text-slate-200"
          onClick={() => setIsMinimized(false)}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[400px] bg-[#1e1e1e] border-t border-slate-700 flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="h-10 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="bg-transparent h-8 p-0">
            <TabsTrigger 
              value="console" 
              className="text-xs px-3 data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-slate-400"
            >
              <Terminal className="h-3 w-3 mr-1.5" />
              Console
              {consoleLogs.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">
                  {consoleLogs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="network" 
              className="text-xs px-3 data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-slate-400"
            >
              <Network className="h-3 w-3 mr-1.5" />
              Network
              {networkRequests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">
                  {networkRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="inspector" 
              className="text-xs px-3 data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-slate-400"
            >
              <Code className="h-3 w-3 mr-1.5" />
              Inspector
            </TabsTrigger>
            <TabsTrigger 
              value="storage" 
              className="text-xs px-3 data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-slate-400"
            >
              <Database className="h-3 w-3 mr-1.5" />
              Storage
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-slate-400 hover:text-slate-200"
            onClick={() => setIsMinimized(true)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {/* Console Tab */}
          <TabsContent value="console" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="h-8 bg-[#252526] border-b border-slate-700 flex items-center gap-2 px-3 flex-shrink-0">
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    placeholder="Filter logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-6 text-xs bg-[#1e1e1e] border-slate-700 text-slate-300 placeholder:text-slate-500"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-6 text-xs bg-[#1e1e1e] border border-slate-700 text-slate-300 rounded px-2"
                  >
                    <option value="all">All</option>
                    <option value="log">Log</option>
                    <option value="error">Error</option>
                    <option value="warn">Warn</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-slate-400 hover:text-slate-200"
                    onClick={copyAllLogs}
                    title="Copy all logs"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-slate-400 hover:text-slate-200"
                    onClick={exportLogs}
                    title="Export logs"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-slate-400 hover:text-slate-200"
                    onClick={clearConsole}
                    title="Clear console"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {/* Logs */}
              <ScrollArea className="flex-1">
                <div className="font-mono text-xs">
                  {filteredLogs.length === 0 ? (
                    <div className="text-slate-500 text-center py-8">No logs</div>
                  ) : (
                    filteredLogs.map((log) => (
                      <ConsoleLogItem
                        key={log.id}
                        log={log}
                        onCopy={(text) => navigator.clipboard.writeText(text)}
                      />
                    ))
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="h-8 bg-[#252526] border-b border-slate-700 flex items-center gap-2 px-3 flex-shrink-0">
                <Input
                  placeholder="Filter requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-6 text-xs bg-[#1e1e1e] border-slate-700 text-slate-300 placeholder:text-slate-500 flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-slate-400 hover:text-slate-200"
                  onClick={clearNetwork}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {/* Requests */}
              <ScrollArea className="flex-1">
                <div className="font-mono text-xs">
                  <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-[#252526] border-b border-slate-700 text-slate-400 text-[10px] font-semibold">
                    <div className="col-span-1">Method</div>
                    <div className="col-span-6">URL</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Time</div>
                    <div className="col-span-1">Size</div>
                  </div>
                  {filteredRequests.length === 0 ? (
                    <div className="text-slate-500 text-center py-8">No requests</div>
                  ) : (
                    filteredRequests.map((req) => (
                      <div
                        key={req.id}
                        className="grid grid-cols-12 gap-2 px-2 py-1.5 hover:bg-slate-800/50 border-b border-slate-800/50"
                      >
                        <div className="col-span-1 text-blue-400 font-semibold">{req.method}</div>
                        <div className="col-span-6 text-slate-300 truncate">{req.url}</div>
                        <div className={cn("col-span-2", getStatusColor(req.status))}>
                          {req.status ? `${req.status} ${req.statusText}` : 'Pending'}
                        </div>
                        <div className="col-span-2 text-slate-400">
                          {req.duration ? `${req.duration}ms` : '-'}
                        </div>
                        <div className="col-span-1 text-slate-400">-</div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Inspector Tab */}
          <TabsContent value="inspector" className="h-full m-0 p-0">
            <div className="h-full flex flex-col p-4">
              <div className="text-slate-300 text-sm mb-4">ENS Domain Inspector</div>
              <div className="space-y-4">
                <div>
                  <div className="text-slate-400 text-xs mb-2">Wallet Connection</div>
                  <div className="bg-[#252526] p-3 rounded border border-slate-700">
                    <div className="text-slate-300 text-xs">
                      <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
                      {address && <div>Address: {address}</div>}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-2">Public Client</div>
                  <div className="bg-[#252526] p-3 rounded border border-slate-700">
                    <div className="text-slate-300 text-xs">
                      {publicClient ? 'Available' : 'Not available'}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-2">Wallet Client</div>
                  <div className="bg-[#252526] p-3 rounded border border-slate-700">
                    <div className="text-slate-300 text-xs">
                      {walletClient ? 'Available' : 'Not available'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage" className="h-full m-0 p-0">
            <div className="h-full flex flex-col p-4">
              <div className="text-slate-300 text-sm mb-4">Local Storage</div>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {Object.keys(localStorage).length === 0 ? (
                    <div className="text-slate-500 text-center py-8">No storage items</div>
                  ) : (
                    Object.keys(localStorage).map((key) => (
                      <div
                        key={key}
                        className="bg-[#252526] p-3 rounded border border-slate-700"
                      >
                        <div className="text-blue-400 text-xs font-semibold mb-1">{key}</div>
                        <div className="text-slate-300 text-xs break-all">
                          {localStorage.getItem(key)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

