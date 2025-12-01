import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Terminal, 
  Network, 
  Code, 
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  Trash2,
  Copy,
  Download,
  Search,
  Globe,
  Hash,
  User,
  Zap,
  BarChart3,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Play,
  RefreshCw,
  Filter,
  Bookmark,
  BookmarkCheck,
  Settings as SettingsIcon,
  X,
  CheckCircle2,
  Save,
  Command,
  Menu,
  ArrowRight,
  Wallet,
  LogOut,
  Network as NetworkIcon,
  Eye,
  EyeOff,
  Layers,
  FileCode,
  Regex,
  Gauge,
  Plus,
  Minus
} from 'lucide-react';
import { useWeb3 } from '../../lib/services';
import { userConfigService } from '../../lib/services/user-config-service';
import { ConsoleLogItem } from './ConsoleLogItem';
import { formatAddress, getAllTextRecords } from '../../lib/ens/ens-utils';
import { isValidENSName } from '../../lib/ens/ens-helpers';
import { Badge } from '../ui/badge';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '../ui/command';
import { Dashboard } from '../Dashboard';
import { DomainManagement, NameBrowser } from '../domains';
import { MetadataEditor, MetadataTools } from '../metadata';
import { SecurityMonitor, AuditLog } from '../security';
import { GovernancePanel } from '../governance';
import { Settings } from '../Settings';
import { ProtocolReference, BestPracticesView, NamingToolkit } from '../reference';
import { DAORegistry, IntegrationRegistry, ContractRegistry } from '../registry';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { ContractRegistration, PreflightChecker } from '../workflows';
import { ENSMarketplace } from '../marketplace';
import { DNSSECConfig } from '../dnssec';
import { FeeManagement } from '../admin/FeeManagement';
import { MasterDatabaseView } from '../admin/MasterDatabaseView';
import { AdminPanel } from '../admin/AdminPanel';
import type { ViewType } from '../../App';
import { ENS_CONSOLE_SCHEMA } from '../../lib/schemas/ens-console-schema';

interface ConsoleLog {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  data?: any;
  stack?: string;
  ensContext?: {
    domain?: string;
    operation?: string;
    address?: string;
    category?: 'domain' | 'subdomain' | 'record' | 'delegation' | 'wrapper' | 'registration' | 'reverse';
  };
}

interface ENSOperation {
  id: string;
  type: 'resolve' | 'query' | 'transaction' | 'metadata';
  domain?: string;
  address?: string;
  operation: string;
  timestamp: Date;
  duration?: number;
  result?: any;
  error?: string;
  details?: Record<string, any>;
  gasUsed?: bigint;
  gasPrice?: bigint;
  transactionHash?: string;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  timestamp: Date;
  duration?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  isENSRelated: boolean;
}

interface WatchedDomain {
  id: string;
  domain: string;
  lastChecked: Date;
  lastState: any;
  checkInterval: number;
  isActive: boolean;
  changeCount: number;
}

interface PerformanceProfile {
  operation: string;
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
}

interface ENSConsoleProps {
  isFullScreen?: boolean;
}

export function ENSConsole({ isFullScreen = false }: ENSConsoleProps) {
  const { address, isConnected, publicClient, walletClient, chainId } = useWeb3();
  const { openConnectModal } = useConnectModal();
  const { disconnectAsync } = useDisconnect();
  const [activeTab, setActiveTab] = useState('console');
  
  // Get console colors from user config
  const consoleColors = React.useMemo(() => {
    if (!address) {
      return {
        background: '#3a3a3a',
        headerBackground: '#4a4a4a',
        border: '#5a5a5a',
        text: '#f5f5f5',
        textSecondary: '#d0d0d0',
        activeTab: '#3a3a3a',
        inactiveTab: '#5a5a5a',
        inputBackground: '#2d2d2d',
        inputBorder: '#5a5a5a',
      };
    }
    const config = userConfigService.getUserConfig(address);
    return config.consoleColors || {
      background: '#3a3a3a',
      headerBackground: '#4a4a4a',
      border: '#5a5a5a',
      text: '#f5f5f5',
      textSecondary: '#d0d0d0',
      activeTab: '#3a3a3a',
      inactiveTab: '#5a5a5a',
      inputBackground: '#2d2d2d',
      inputBorder: '#5a5a5a',
    };
  }, [address]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [ensOperations, setEnsOperations] = useState<ENSOperation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<ENSOperation | null>(null);
  const [inspectingDomain, setInspectingDomain] = useState('');
  const [domainDetails, setDomainDetails] = useState<any>(null);
  const [isLoadingDomain, setIsLoadingDomain] = useState(false);
  const [textRecords, setTextRecords] = useState<Record<string, string>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [savedFilters, setSavedFilters] = useState<Array<{name: string; query: string; domain: string; type: string}>>([]);
  const [bookmarkedOperations, setBookmarkedOperations] = useState<Set<string>>(new Set());
  const [operationComparison, setOperationComparison] = useState<string[]>([]);
  const [errorPatterns, setErrorPatterns] = useState<Array<{pattern: string; count: number}>>([]);
  const [appView, setAppView] = useState<ViewType | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const previousConnectionStatus = useRef<boolean | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [watchedDomains, setWatchedDomains] = useState<WatchedDomain[]>([]);
  const [useRegexSearch, setUseRegexSearch] = useState(false);
  const [performanceProfiles, setPerformanceProfiles] = useState<Map<string, PerformanceProfile>>(new Map());
  const [customScript, setCustomScript] = useState('');
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);
  const [scriptOutput, setScriptOutput] = useState<string[]>([]);
  const [batchOperations, setBatchOperations] = useState<Array<{domain: string; operation: string; params: any}>>([]);
  const [batchDomainInput, setBatchDomainInput] = useState('');
  const [consoleWidth, setConsoleWidth] = useState(1125);
  const [consoleHeight, setConsoleHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const currentHeight = consoleHeight ?? window.innerHeight - 64;
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: consoleWidth,
      height: currentHeight
    };
  }, [consoleWidth, consoleHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartPos.current) return;
      
      const deltaX = resizeStartPos.current.x - e.clientX;
      const deltaY = e.clientY - resizeStartPos.current.y;
      
      const newWidth = Math.max(400, Math.min(1920, resizeStartPos.current.width + deltaX));
      const newHeight = Math.max(300, Math.min(window.innerHeight - 64, resizeStartPos.current.height + deltaY));
      
      setConsoleWidth(newWidth);
      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartPos.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Calculate analytics
  const analytics = React.useMemo(() => {
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
      .filter(o => Date.now() - o.timestamp.getTime() < 60000) // Last minute
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

  // Enhanced console interception with ENS context
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const extractENSContext = (message: string, data?: any): ConsoleLog['ensContext'] => {
      // Detect ENS domain mentions
      const domainMatch = message.match(/([a-z0-9-]+\.eth)/i);
      const addressMatch = message.match(/0x[a-fA-F0-9]{40}/i);
      
      // Detect ENS operations and map to categories
      let operation: string | undefined;
      let category: ConsoleLog['ensContext']['category'];
      
      const msgLower = message.toLowerCase();
      
      // Domain operations
      if (msgLower.includes('transfer') && !msgLower.includes('subdomain')) {
        operation = 'transfer';
        category = 'domain';
      }
      // Subdomain operations
      else if (msgLower.includes('mintsubdomain') || msgLower.includes('createsubdomain') || 
               msgLower.includes('removesubdomain') || msgLower.includes('transfersubdomain') ||
               (msgLower.includes('subdomain') && !msgLower.includes('transfer'))) {
        operation = msgLower.includes('remove') ? 'removeSubdomain' : 
                   msgLower.includes('transfer') ? 'transferSubdomain' : 'mintSubdomain';
        category = 'subdomain';
      }
      // Record operations
      else if (msgLower.includes('setaddr') || msgLower.includes('settext') || 
               msgLower.includes('setcontenthash') || msgLower.includes('setttl') ||
               msgLower.includes('setabi') || msgLower.includes('setpubkey') ||
               msgLower.includes('setzonehash') || msgLower.includes('setresolver') ||
               msgLower.includes('removetext') || msgLower.includes('setrecord')) {
        operation = 'setRecord';
        category = 'record';
      }
      // Delegation operations
      else if (msgLower.includes('delegate') || msgLower.includes('delegation')) {
        operation = 'delegate';
        category = 'delegation';
      }
      // Wrapper operations
      else if (msgLower.includes('wrap') || msgLower.includes('unwrap') || 
               msgLower.includes('setfuses') || msgLower.includes('approval')) {
        operation = msgLower.includes('unwrap') ? 'unwrap' : 
                   msgLower.includes('fuses') ? 'setFuses' : 'wrap';
        category = 'wrapper';
      }
      // Registration operations
      else if (msgLower.includes('renew') || msgLower.includes('register') || 
               msgLower.includes('registration')) {
        operation = 'renew';
        category = 'registration';
      }
      // Reverse record operations
      else if (msgLower.includes('reverserecord') || msgLower.includes('reverse record') ||
               msgLower.includes('setreverse')) {
        operation = 'setReverseRecord';
        category = 'reverse';
      }
      // Fallback for resolve operations
      else if (msgLower.includes('resolve') || msgLower.includes('getens')) {
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
  }, []);

  // Track ENS operations - memoized
  const trackENSOperation = useCallback((operation: Omit<ENSOperation, 'id' | 'timestamp'>, startTime?: number) => {
    const duration = startTime ? Date.now() - startTime : undefined;
    setEnsOperations(prev => [...prev, {
      id: `ens-op-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      duration,
      ...operation,
    }]);
  }, []);

  // Inspect domain details - memoized
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
        publicClient.getEnsExpiry({ name: normalizedName }).catch(() => null),
        getAllTextRecords(publicClient, normalizedName).catch(() => []),
      ]);
      
      const reverseName = resolvedAddress 
        ? await publicClient.getEnsName({ address: resolvedAddress as any }).catch(() => null)
        : null;
      
      const duration = Date.now() - startTime;
      
      const recordsObj: Record<string, string> = {};
      records.forEach(r => { recordsObj[r.key] = r.value; });
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

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !publicClient || !inspectingDomain) return;
    
    const interval = setInterval(() => {
      // Refresh domain details if inspecting
      if (inspectingDomain) {
        inspectDomain(inspectingDomain);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval, inspectingDomain]);

  // Error pattern detection
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

  // Network request interception
  useEffect(() => {
    const originalFetch = window.fetch;
    const isENSRelated = (url: string): boolean => {
      return url.includes('ens') || url.includes('eth') || url.includes('ethereum') || 
             url.includes('0x') || url.includes('namehash') || url.includes('resolver');
    };

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const [resource, init] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
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

  // Performance profiling
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

    // Calculate percentiles
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

  // Domain watchlist monitoring
  useEffect(() => {
    if (!publicClient) return;

    const intervals: NodeJS.Timeout[] = [];

    watchedDomains.forEach(watched => {
      if (!watched.isActive) return;

      const interval = setInterval(async () => {
        try {
          const startTime = Date.now();
          const [resolvedAddress, resolver] = await Promise.all([
            publicClient.getEnsAddress({ name: watched.domain }).catch(() => null),
            publicClient.getEnsResolver({ name: watched.domain }).catch(() => null),
          ]);

          const currentState = { resolvedAddress, resolver, checkedAt: new Date() };
          const hasChanged = JSON.stringify(currentState) !== JSON.stringify(watched.lastState);

          if (hasChanged) {
            setWatchedDomains(prev => prev.map(w => 
              w.id === watched.id ? {
                ...w,
                lastState: currentState,
                lastChecked: new Date(),
                changeCount: w.changeCount + 1,
              } : w
            ));

            trackENSOperation({
              type: 'query',
              domain: watched.domain,
              operation: 'watchDomainChange',
              result: 'change_detected',
              duration: Date.now() - startTime,
              details: { previousState: watched.lastState, currentState },
            });
          } else {
            setWatchedDomains(prev => prev.map(w => 
              w.id === watched.id ? {
                ...w,
                lastChecked: new Date(),
              } : w
            ));
          }
        } catch (error: any) {
          trackENSOperation({
            type: 'query',
            domain: watched.domain,
            operation: 'watchDomainChange',
            error: error.message,
          });
        }
      }, watched.checkInterval);

      intervals.push(interval);
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [watchedDomains, publicClient]);

  // Command palette commands
  const commands = [
    { id: 'clear-console', label: 'Clear Console', icon: Trash2, action: () => clearConsole() },
    { id: 'clear-operations', label: 'Clear Operations', icon: Trash2, action: () => clearOperations() },
    { id: 'export-logs', label: 'Export Logs', icon: Download, action: () => exportLogs() },
    { id: 'export-operations', label: 'Export Operations', icon: Download, action: () => exportOperations() },
    { id: 'toggle-auto-refresh', label: 'Toggle Auto-Refresh', icon: RefreshCw, action: () => setAutoRefresh(!autoRefresh) },
    { id: 'open-console', label: 'Open Console Tab', icon: Terminal, action: () => setActiveTab('console') },
    { id: 'open-operations', label: 'Open Operations Tab', icon: Zap, action: () => setActiveTab('operations') },
    { id: 'open-analytics', label: 'Open Analytics Tab', icon: BarChart3, action: () => setActiveTab('analytics') },
    { id: 'open-domains', label: 'Open Domains Tab', icon: Globe, action: () => setActiveTab('domains') },
    { id: 'open-inspector', label: 'Open Inspector Tab', icon: Code, action: () => setActiveTab('inspector') },
    { id: 'open-app', label: 'Open App Tab', icon: Code, action: () => setActiveTab('app') },
    ...(isConnected 
      ? [{ id: 'disconnect-wallet', label: 'Disconnect Wallet', icon: X, action: () => handleWalletDisconnect() }]
      : [{ id: 'connect-wallet', label: 'Connect Wallet', icon: User, action: () => handleWalletConnect() }]
    ),
  ];

  const navigationCommands = [
    { id: 'dashboard', label: 'Dashboard', icon: Terminal, view: 'dashboard' as ViewType },
    { id: 'domains', label: 'Domain Management', icon: Globe, view: 'domains' as ViewType },
    { id: 'name-browser', label: 'Name Browser', icon: Search, view: 'name-browser' as ViewType },
    { id: 'metadata', label: 'Metadata Editor', icon: FileText, view: 'metadata' as ViewType },
    { id: 'security', label: 'Security Monitor', icon: AlertCircle, view: 'security' as ViewType },
    { id: 'audit', label: 'Audit Log', icon: FileText, view: 'audit' as ViewType },
    { id: 'marketplace', label: 'Marketplace', icon: Globe, view: 'marketplace' as ViewType },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, view: 'analytics' as ViewType },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, view: 'settings' as ViewType },
  ];

  const handleWalletConnect = useCallback(() => {
    if (isConnected) {
      return;
    }
    if (openConnectModal) {
      trackENSOperation({
        type: 'transaction',
        operation: 'connectWallet',
        result: 'modal-opened',
        details: { source: 'console' },
      });
      openConnectModal();
    } else {
      trackENSOperation({
        type: 'transaction',
        operation: 'connectWallet',
        error: 'Connect modal unavailable',
        details: { source: 'console' },
      });
      console.warn('RainbowKit connect modal is not available.');
    }
  }, [isConnected, openConnectModal, trackENSOperation]);

  const handleWalletDisconnect = useCallback(async () => {
    try {
      if (disconnectAsync) {
        await disconnectAsync();
      }
      trackENSOperation({
        type: 'transaction',
        operation: 'disconnectWallet',
        result: 'success',
        details: { source: 'console' },
      });
    } catch (error: any) {
      trackENSOperation({
        type: 'transaction',
        operation: 'disconnectWallet',
        error: error.message,
        details: { source: 'console' },
      });
    }
  }, [disconnectAsync, trackENSOperation]);

  const getNetworkName = (chainId: number | null): string => {
    switch (chainId) {
      case 1: return 'Ethereum';
      case 5: return 'Goerli';
      case 11155111: return 'Sepolia';
      case 137: return 'Polygon';
      case 42161: return 'Arbitrum';
      case 10: return 'Optimism';
      case 8453: return 'Base';
      default: return 'Unknown';
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setShowCommandPalette(true);
            break;
          case 'm':
            e.preventDefault();
            setShowQuickMenu(!showQuickMenu);
            break;
          case 'r':
            e.preventDefault();
            if (inspectingDomain) {
              inspectDomain(inspectingDomain);
            }
            break;
          case 'e':
            e.preventDefault();
            exportOperations();
            break;
        }
      }
      // Escape to close command palette
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowQuickMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [inspectingDomain, showQuickMenu, inspectDomain, exportOperations]);

  // Expose tracking API globally for ENS operations
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

  // Replay operation - memoized
  const replayOperation = useCallback(async (op: ENSOperation) => {
    if (!publicClient || !op.domain) return;
    
    const startTime = Date.now();
    try {
      let result: any = null;
      
      switch (op.operation) {
        case 'getEnsAddress':
          result = await publicClient.getEnsAddress({ name: op.domain });
          break;
        case 'getEnsResolver':
          result = await publicClient.getEnsResolver({ name: op.domain });
          break;
        case 'getEnsName':
          if (op.address) {
            result = await publicClient.getEnsName({ address: op.address as any });
          }
          break;
        case 'inspectDomain':
          await inspectDomain(op.domain);
          return;
        default:
          console.warn('Cannot replay operation:', op.operation);
          return;
      }
      
      const duration = Date.now() - startTime;
      trackENSOperation({
        type: op.type,
        domain: op.domain,
        address: op.address,
        operation: `replay:${op.operation}`,
        result,
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      trackENSOperation({
        type: op.type,
        domain: op.domain,
        address: op.address,
        operation: `replay:${op.operation}`,
        error: error.message,
        duration,
      });
    }
  }, [publicClient, inspectDomain, trackENSOperation]);

  const toggleBookmark = useCallback((opId: string) => {
    setBookmarkedOperations(prev => {
      const next = new Set(prev);
      if (next.has(opId)) {
        next.delete(opId);
      } else {
        next.add(opId);
      }
      return next;
    });
  }, []);

  const saveFilter = useCallback(() => {
    const filter = {
      name: `Filter ${savedFilters.length + 1}`,
      query: searchQuery,
      domain: domainFilter,
      type: filterType,
    };
    setSavedFilters(prev => [...prev, filter]);
  }, [savedFilters.length, searchQuery, domainFilter, filterType]);

  const loadFilter = useCallback((filter: typeof savedFilters[0]) => {
    setSearchQuery(filter.query);
    setDomainFilter(filter.domain);
    setFilterType(filter.type);
  }, []);

  const toggleComparison = useCallback((opId: string) => {
    setOperationComparison(prev => {
      if (prev.includes(opId)) {
        return prev.filter(id => id !== opId);
      } else if (prev.length < 2) {
        return [...prev, opId];
      } else {
        return [prev[1], opId];
      }
    });
  }, []);

  const addConsoleLog = (
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
  };

  const clearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  const clearOperations = useCallback(() => {
    setEnsOperations([]);
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

  // Advanced search with regex support - memoized
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

  // Memoize filtered logs to avoid recalculating on every render
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

  // Memoize filtered operations to avoid recalculating on every render
  const filteredOperations = useMemo(() => {
    return ensOperations.filter(op => {
      const searchText = `${op.operation} ${op.domain || ''} ${op.address || ''}`;
      const matchesSearchQuery = matchesSearch(searchText, searchQuery);
      const matchesDomain = !domainFilter || matchesSearch(op.domain || '', domainFilter);
      return matchesSearchQuery && matchesDomain;
    });
  }, [ensOperations, searchQuery, domainFilter, matchesSearch]);

  // Domain watchlist functions
  const addWatchedDomain = (domain: string, interval: number = 30000) => {
    const watched: WatchedDomain = {
      id: `watch-${Date.now()}-${Math.random()}`,
      domain: domain.toLowerCase().trim(),
      lastChecked: new Date(),
      lastState: null,
      checkInterval: interval,
      isActive: true,
      changeCount: 0,
    };
    setWatchedDomains(prev => [...prev, watched]);
  };

  const removeWatchedDomain = (id: string) => {
    setWatchedDomains(prev => prev.filter(w => w.id !== id));
  };

  const toggleWatchedDomain = (id: string) => {
    setWatchedDomains(prev => prev.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
  };

  // Batch operations
  const executeBatchOperations = async () => {
    if (!publicClient || batchOperations.length === 0) return;
    
    const startTime = Date.now();
    const results: any[] = [];
    const errors: any[] = [];

    for (const batchOp of batchOperations) {
      try {
        const opStartTime = Date.now();
        let result: any = null;

        switch (batchOp.operation) {
          case 'getEnsAddress':
            result = await publicClient.getEnsAddress({ name: batchOp.domain });
            break;
          case 'getEnsResolver':
            result = await publicClient.getEnsResolver({ name: batchOp.domain });
            break;
          case 'inspectDomain':
            await inspectDomain(batchOp.domain);
            result = 'inspected';
            break;
          default:
            throw new Error(`Unknown operation: ${batchOp.operation}`);
        }

        const duration = Date.now() - opStartTime;
        trackENSOperation({
          type: 'query',
          domain: batchOp.domain,
          operation: `batch:${batchOp.operation}`,
          result,
          duration,
        });
        results.push({ domain: batchOp.domain, operation: batchOp.operation, result, duration });
      } catch (error: any) {
        errors.push({ domain: batchOp.domain, operation: batchOp.operation, error: error.message });
        trackENSOperation({
          type: 'query',
          domain: batchOp.domain,
          operation: `batch:${batchOp.operation}`,
          error: error.message,
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    trackENSOperation({
      type: 'query',
      operation: 'executeBatch',
      result: { success: results.length, errors: errors.length, totalDuration },
      duration: totalDuration,
    });

    setBatchOperations([]);
    return { results, errors };
  };

  // Custom script execution
  const executeCustomScript = async () => {
    if (!customScript.trim() || !publicClient) return;
    
    setScriptOutput([]);
    const output: string[] = [];
    
    try {
      // Create a safe execution context
      const scriptContext = {
        console: {
          log: (...args: any[]) => {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            output.push(`[LOG] ${msg}`);
            setScriptOutput([...output]);
          },
          error: (...args: any[]) => {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            output.push(`[ERROR] ${msg}`);
            setScriptOutput([...output]);
          },
        },
        publicClient,
        walletClient,
        address,
        chainId,
        inspectDomain: (domain: string) => inspectDomain(domain),
        trackENSOperation,
        formatAddress,
        getAllTextRecords: (domain: string) => getAllTextRecords(publicClient, domain),
      };

      // Execute script in a controlled way
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction(...Object.keys(scriptContext), customScript);
      await fn(...Object.values(scriptContext));
      
      output.push('[SUCCESS] Script executed successfully');
    } catch (error: any) {
      output.push(`[ERROR] ${error.message}`);
      if (error.stack) {
        output.push(`[STACK] ${error.stack}`);
      }
    }
    
    setScriptOutput(output);
  };

  // CSV export - memoized
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
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  useEffect(() => {
    if (previousConnectionStatus.current === null) {
      previousConnectionStatus.current = isConnected;
      return;
    }
    if (!previousConnectionStatus.current && isConnected) {
      trackENSOperation({
        type: 'transaction',
        operation: 'connectWallet',
        result: 'success',
        details: {
          source: 'console',
          address: address ? formatAddress(address) : undefined,
        },
      });
    }
    previousConnectionStatus.current = isConnected;
  }, [isConnected, address, trackENSOperation]);

  if (isMinimized && !isFullScreen) {
    return (
      <div 
        className="fixed right-0 top-[64px] bottom-0 w-8 border-l flex flex-col items-center justify-center gap-2 z-40 transition-colors"
        style={{
          backgroundColor: consoleColors.background,
          borderColor: consoleColors.border,
        }}
        onMouseEnter={(e) => {
          const bg = consoleColors.background;
          const r = parseInt(bg.slice(1, 3), 16);
          const g = parseInt(bg.slice(3, 5), 16);
          const b = parseInt(bg.slice(5, 7), 16);
          const hoverR = Math.min(255, r + 20);
          const hoverG = Math.min(255, g + 20);
          const hoverB = Math.min(255, b + 20);
          e.currentTarget.style.backgroundColor = `rgb(${hoverR}, ${hoverG}, ${hoverB})`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = consoleColors.background;
        }}
      >
        <div className="writing-vertical-rl text-xs transform rotate-180 whitespace-nowrap py-2" style={{ color: consoleColors.text }}>
          <span>ENS</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[10px]" style={{ color: consoleColors.text }}>
          <span>{consoleLogs.length}</span>
          <span>{ensOperations.length}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          style={{ 
            color: consoleColors.textSecondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = consoleColors.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = consoleColors.textSecondary;
          }}
          onClick={() => setIsMinimized(false)}
          title="Expand console"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={isFullScreen ? "fixed left-0 right-0 top-[64px] bottom-0 flex flex-col z-40 shadow-2xl relative" : "fixed right-0 top-[64px] border-l flex flex-col z-40 shadow-2xl relative"}
      style={{ 
        backgroundColor: consoleColors.background,
        borderColor: consoleColors.border,
        width: isFullScreen ? '100%' : `${consoleWidth}px`,
        height: isFullScreen ? 'calc(100vh - 64px)' : (consoleHeight !== null ? `${consoleHeight}px` : 'calc(100vh - 64px)'),
        bottom: isFullScreen ? '0' : (consoleHeight !== null ? 'auto' : '0'),
        left: isFullScreen ? '0' : 'auto'
      }}
    >
      {/* Header */}
      <div 
        className="h-10 border-b flex items-center justify-between px-4 flex-shrink-0" 
        style={{ 
          backgroundColor: consoleColors.headerBackground,
          borderColor: consoleColors.border
        }}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            style={{ color: consoleColors.text }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = consoleColors.textSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = consoleColors.text;
            }}
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            title="Quick Menu (Ctrl+M)"
          >
            <Menu className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            style={{ color: consoleColors.text }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = consoleColors.textSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = consoleColors.text;
            }}
            onClick={() => setShowCommandPalette(true)}
            title="Command Palette (Ctrl+K)"
          >
            <Command className="h-3 w-3" />
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList 
            className="h-8 p-0" 
            style={{ backgroundColor: consoleColors.headerBackground }}
          >
            <TabsTrigger 
              value="console" 
              className="text-xs px-3 text-slate-100"
              style={{
                color: activeTab === 'console' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'console' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <Terminal className="h-3 w-3 mr-1.5" />
              Console
              {consoleLogs.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: consoleColors.headerBackground }}>
                  {consoleLogs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="operations" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'operations' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'operations' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <Zap className="h-3 w-3 mr-1.5" />
              ENS Operations
              {ensOperations.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: consoleColors.headerBackground }}>
                  {ensOperations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="inspector" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'inspector' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'inspector' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <Code className="h-3 w-3 mr-1.5" />
              Inspector
            </TabsTrigger>
            <TabsTrigger 
              value="domains" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'domains' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'domains' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <Globe className="h-3 w-3 mr-1.5" />
              Domains
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'analytics' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'analytics' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <BarChart3 className="h-3 w-3 mr-1.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="network" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'network' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'network' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <Network className="h-3 w-3 mr-1.5" />
              Network
              {networkRequests.filter(r => r.isENSRelated).length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: consoleColors.headerBackground }}>
                  {networkRequests.filter(r => r.isENSRelated).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'performance' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'performance' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <Gauge className="h-3 w-3 mr-1.5" />
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="scripts" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'scripts' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'scripts' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <FileCode className="h-3 w-3 mr-1.5" />
              Scripts
            </TabsTrigger>
            <TabsTrigger 
              value="app" 
              className="text-xs px-3"
              style={{
                color: activeTab === 'app' ? consoleColors.text : consoleColors.textSecondary,
                backgroundColor: activeTab === 'app' ? consoleColors.activeTab : 'transparent',
              }}
            >
              <Code className="h-3 w-3 mr-1.5" />
              App
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-green-950/30 border border-green-900/30">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-mono">
                {address ? formatAddress(address) : 'Connected'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                style={{ color: consoleColors.text }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = consoleColors.text;
                }}
                onClick={handleWalletDisconnect}
                title="Disconnect wallet"
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              style={{ color: consoleColors.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = consoleColors.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = consoleColors.text;
              }}
              onClick={handleWalletConnect}
              title="Connect wallet"
            >
              <Wallet className="h-3 w-3 mr-1" />
              <span className="text-xs">Connect</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            style={{ color: consoleColors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = consoleColors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = consoleColors.textSecondary;
            }}
            onClick={() => setIsMinimized(true)}
            title="Minimize console"
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
              <div 
                className="h-10 border-b flex items-center gap-2 px-3 flex-shrink-0" 
                style={{ 
                  backgroundColor: consoleColors.headerBackground,
                  borderColor: consoleColors.border
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: consoleColors.textSecondary }} />
                    <Input
                      placeholder="Search logs or ENS names (e.g., example.eth)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          const trimmedQuery = searchQuery.trim();
                          if (isValidENSName(trimmedQuery)) {
                            inspectDomain(trimmedQuery);
                          }
                        }
                      }}
                      className="h-7 pl-7 text-xs"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.inputBorder,
                        color: consoleColors.text,
                      }}
                    />
                  </div>
                  <Input
                    placeholder="Filter by domain..."
                    value={domainFilter}
                    onChange={(e) => setDomainFilter(e.target.value)}
                    className="h-7 w-32 text-xs"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.inputBorder,
                      color: consoleColors.text,
                    }}
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-7 text-xs rounded px-2"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.inputBorder,
                      color: consoleColors.text,
                    }}
                  >
                    <option value="all">All</option>
                    <option value="log">Log</option>
                    <option value="error">Error</option>
                    <option value="warn">Warn</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  {savedFilters.length > 0 && (
                    <div 
                      className="flex items-center gap-1 mr-2 border-r pr-2"
                      style={{ borderColor: consoleColors.border }}
                    >
                      <Filter className="h-3 w-3" style={{ color: consoleColors.text }} />
                      <select
                        value=""
                        onChange={(e) => {
                          const filter = savedFilters.find(f => f.name === e.target.value);
                          if (filter) loadFilter(filter);
                        }}
                        className="h-6 text-[10px] rounded px-1"
                        style={{
                          backgroundColor: consoleColors.inputBackground,
                          borderColor: consoleColors.inputBorder,
                          color: consoleColors.text,
                        }}
                      >
                        <option value="">Saved filters...</option>
                        {savedFilters.map((f, i) => (
                          <option key={i} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={saveFilter}
                    title="Save current filter"
                    disabled={!searchQuery && !domainFilter && filterType === 'all'}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={copyAllLogs}
                    title="Copy all logs (Ctrl+E)"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ 
                      color: useRegexSearch ? '#60a5fa' : consoleColors.text,
                      backgroundColor: useRegexSearch ? 'rgba(30, 58, 138, 0.3)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!useRegexSearch) {
                        e.currentTarget.style.color = consoleColors.textSecondary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!useRegexSearch) {
                        e.currentTarget.style.color = consoleColors.text;
                      }
                    }}
                    onClick={() => setUseRegexSearch(!useRegexSearch)}
                    title="Toggle regex search"
                  >
                    <Regex className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={exportLogs}
                    title="Export logs"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={clearConsole}
                    title="Clear console"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {/* Logs */}
              <ScrollArea className="flex-1" style={{ backgroundColor: consoleColors.background }}>
                <div className="font-mono text-xs">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8" style={{ color: consoleColors.text }}>No logs</div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="border-l-2"
                        style={{
                          borderColor: `${consoleColors.border}80`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${consoleColors.background}50`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <ConsoleLogItem
                          log={log}
                          onCopy={(text) => navigator.clipboard.writeText(text)}
                        />
                        {log.ensContext && (
                          <div className="ml-16 mb-1 flex items-center gap-2 text-[10px]" style={{ color: consoleColors.text }}>
                            {log.ensContext.domain && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-2.5 w-2.5" />
                                {log.ensContext.domain}
                              </span>
                            )}
                            {log.ensContext.operation && (
                              <span className="flex items-center gap-1">
                                <Zap className="h-2.5 w-2.5" />
                                {log.ensContext.operation}
                              </span>
                            )}
                            {log.ensContext.address && (
                              <span className="flex items-center gap-1">
                                <Hash className="h-2.5 w-2.5" />
                                {formatAddress(log.ensContext.address)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* ENS Operations Tab */}
          <TabsContent value="operations" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div 
                className="h-10 border-b flex items-center gap-2 px-3 flex-shrink-0 relative" 
                style={{ 
                  backgroundColor: consoleColors.headerBackground,
                  borderColor: consoleColors.border
                }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: consoleColors.textSecondary }} />
                  <Input
                    placeholder="Search operations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 pl-7 text-xs flex-1"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.inputBorder,
                      color: consoleColors.text,
                    }}
                  />
                </div>
                <Input
                  placeholder="Filter by domain..."
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="h-7 w-32 text-xs"
                  style={{
                    backgroundColor: consoleColors.inputBackground,
                    borderColor: consoleColors.inputBorder,
                    color: consoleColors.text,
                  }}
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ 
                      color: showOperationsMenu ? '#60a5fa' : consoleColors.text,
                      backgroundColor: showOperationsMenu ? 'rgba(30, 58, 138, 0.3)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!showOperationsMenu) {
                        e.currentTarget.style.color = consoleColors.textSecondary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!showOperationsMenu) {
                        e.currentTarget.style.color = consoleColors.text;
                      }
                    }}
                    onClick={() => setShowOperationsMenu(!showOperationsMenu)}
                    title="Show available operations"
                  >
                    <Menu className="h-3 w-3 mr-1" />
                    <span className="text-xs">Operations</span>
                    {showOperationsMenu ? (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ 
                      color: autoRefresh ? '#60a5fa' : consoleColors.text,
                      backgroundColor: autoRefresh ? 'rgba(30, 58, 138, 0.3)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!autoRefresh) {
                        e.currentTarget.style.color = consoleColors.textSecondary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!autoRefresh) {
                        e.currentTarget.style.color = consoleColors.text;
                      }
                    }}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    title="Auto-refresh"
                  >
                    <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={exportOperations}
                    title="Export operations (JSON)"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={exportToCSV}
                    title="Export operations (CSV)"
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={clearOperations}
                    title="Clear operations"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {/* Operations Menu */}
              {showOperationsMenu && (
                <div 
                  className="absolute top-full left-0 right-0 border-b max-h-96 overflow-y-auto z-50 shadow-lg"
                  style={{
                    backgroundColor: consoleColors.background,
                    borderColor: consoleColors.border,
                  }}
                >
                  <div className="p-3">
                    <div className="text-xs mb-3 font-semibold" style={{ color: consoleColors.text }}>Available ENS Operations</div>
                    <div className="space-y-4">
                      {(() => {
                        const grouped = ENS_CONSOLE_SCHEMA.reduce((acc, schema) => {
                          if (!acc[schema.category]) {
                            acc[schema.category] = [];
                          }
                          acc[schema.category].push(schema);
                          return acc;
                        }, {} as Record<string, Array<typeof ENS_CONSOLE_SCHEMA[number]>>);

                        const categoryLabels: Record<string, string> = {
                          domain: 'Domain Operations',
                          subdomain: 'Subdomain Operations',
                          record: 'Record Operations',
                          delegation: 'Delegation Operations',
                          wrapper: 'Wrapper Operations',
                          registration: 'Registration Operations',
                          reverse: 'Reverse Record Operations',
                        };

                        return Object.entries(grouped).map(([category, operations]) => (
                          <div 
                            key={category} 
                            className="border-l-2 pl-3"
                            style={{ borderColor: consoleColors.border }}
                          >
                            <div className="text-xs font-semibold mb-2 uppercase" style={{ color: consoleColors.textSecondary }}>
                              {categoryLabels[category] || category}
                            </div>
                            <div className="space-y-2">
                              {operations.map((op) => (
                                <div
                                  key={op.action}
                                  className="bg-slate-900/50 rounded p-2 hover:bg-slate-900/70 transition-colors cursor-pointer"
                                  onClick={() => {
                                    const example = op.examples[0] || `${op.action}: [example.eth]@domain`;
                                    setSearchQuery(example);
                                    setShowOperationsMenu(false);
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="text-xs font-semibold mb-1" style={{ color: consoleColors.text }}>
                                        {op.label}
                                      </div>
                                      <div className="text-[10px] mb-1" style={{ color: consoleColors.textSecondary }}>
                                        {op.description}
                                      </div>
                                      <div className="text-[10px] font-mono mt-1" style={{ color: consoleColors.textSecondary }}>
                                        {op.examples[0] || `${op.action}: [example.eth]@domain`}
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0.5"
                                      style={{
                                        backgroundColor: consoleColors.inputBackground,
                                        color: consoleColors.textSecondary,
                                        borderColor: consoleColors.inputBorder,
                                      }}
                                    >
                                      {op.action}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}
              {/* Operations */}
              <ScrollArea className="flex-1">
                <div className="font-mono text-xs">
                  <div 
                    className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b text-[10px] font-semibold"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.border,
                      color: consoleColors.textSecondary,
                    }}
                  >
                    <div className="col-span-1.5">Time</div>
                    <div className="col-span-1.5">Type</div>
                    <div className="col-span-2.5">Operation</div>
                    <div className="col-span-3">Domain/Address</div>
                    <div className="col-span-1.5">Duration</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  {filteredOperations.length === 0 ? (
                    <div className="text-center py-8" style={{ color: consoleColors.textSecondary }}>No operations</div>
                  ) : (
                    filteredOperations.map((op) => (
                      <div key={op.id}>
                        <div
                          className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b cursor-pointer transition-colors"
                          style={{
                            borderColor: `${consoleColors.border}80`,
                            backgroundColor: selectedOperation?.id === op.id ? `${consoleColors.inputBackground}cc` : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedOperation?.id !== op.id) {
                              e.currentTarget.style.backgroundColor = `${consoleColors.background}80`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedOperation?.id !== op.id) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                          onClick={() => setSelectedOperation(selectedOperation?.id === op.id ? null : op)}
                        >
                          <div className="col-span-1.5 text-[10px]" style={{ color: consoleColors.textSecondary }}>
                            {op.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="col-span-1.5">
                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                op.type === 'resolve' ? 'bg-blue-950/30 text-blue-400' :
                                op.type === 'query' ? 'bg-purple-950/30 text-purple-400' :
                                op.type === 'transaction' ? 'bg-green-950/30 text-green-400' :
                                ''
                              }`}
                              style={op.type !== 'resolve' && op.type !== 'query' && op.type !== 'transaction' ? {
                                backgroundColor: `${consoleColors.background}50`,
                                color: consoleColors.textSecondary,
                              } : {}}
                            >
                              {op.type}
                            </span>
                          </div>
                          <div className="col-span-2.5 font-semibold truncate" style={{ color: consoleColors.text }}>
                            {op.operation}
                          </div>
                          <div className="col-span-3 truncate" style={{ color: consoleColors.textSecondary }}>
                            {op.domain ? (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{op.domain}</span>
                              </span>
                            ) : op.address ? (
                              <span className="font-mono text-[10px] truncate">
                                {formatAddress(op.address)}
                              </span>
                            ) : (
                              <span style={{ color: consoleColors.textSecondary }}>-</span>
                            )}
                          </div>
                          <div className="col-span-1.5 text-[10px]" style={{ color: consoleColors.textSecondary }}>
                            {op.duration !== undefined ? `${op.duration}ms` : '-'}
                          </div>
                          <div className="col-span-2">
                            {op.error ? (
                              <span className="text-red-400 text-[10px]">Error</span>
                            ) : op.result ? (
                              <span className="text-green-400 text-[10px]">Success</span>
                            ) : (
                              <span className="text-[10px]" style={{ color: consoleColors.textSecondary }}>Pending</span>
                            )}
                          </div>
                        </div>
                        {selectedOperation?.id === op.id && (
                          <div 
                            className="col-span-12 p-3 border-b"
                            style={{
                              backgroundColor: consoleColors.inputBackground,
                              borderColor: consoleColors.border,
                            }}
                          >
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between mb-2">
                                <span style={{ color: consoleColors.textSecondary }}>Operation ID:</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => toggleBookmark(op.id)}
                                    title="Bookmark operation"
                                  >
                                    {bookmarkedOperations.has(op.id) ? (
                                      <BookmarkCheck className="h-3 w-3 text-yellow-400" />
                                    ) : (
                                      <Bookmark className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => toggleComparison(op.id)}
                                    title="Compare operations"
                                  >
                                    {operationComparison.includes(op.id) ? (
                                      <CheckCircle2 className="h-3 w-3 text-blue-400" />
                                    ) : (
                                      <SettingsIcon className="h-3 w-3" />
                                    )}
                                  </Button>
                                  {['getEnsAddress', 'getEnsResolver', 'getEnsName', 'inspectDomain'].includes(op.operation) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => replayOperation(op)}
                                      title="Replay operation"
                                    >
                                      <Play className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {op.duration !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span style={{ color: consoleColors.textSecondary }}>Duration:</span>
                                  <span style={{ color: consoleColors.text }}>{op.duration}ms</span>
                                </div>
                              )}
                              {op.error && (
                                <div>
                                  <span style={{ color: consoleColors.textSecondary }}>Error:</span>
                                  <div className="text-red-400 mt-1 font-mono text-[10px] break-all">{op.error}</div>
                                </div>
                              )}
                              {op.result && (
                                <div>
                                  <span style={{ color: consoleColors.textSecondary }}>Result:</span>
                                  <pre 
                                    className="mt-1 text-[10px] overflow-auto max-h-32 p-2 rounded"
                                    style={{
                                      color: consoleColors.text,
                                      backgroundColor: consoleColors.inputBackground,
                                    }}
                                  >
                                    {JSON.stringify(op.result, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {op.details && Object.keys(op.details).length > 0 && (
                                <div>
                                  <span style={{ color: consoleColors.textSecondary }}>Details:</span>
                                  <pre 
                                    className="mt-1 text-[10px] overflow-auto max-h-32 p-2 rounded"
                                    style={{
                                      color: consoleColors.text,
                                      backgroundColor: consoleColors.inputBackground,
                                    }}
                                  >
                                    {JSON.stringify(op.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
              <div className="text-sm mb-4" style={{ color: consoleColors.text }}>ENS Inspector</div>
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs mb-2 flex items-center justify-between" style={{ color: consoleColors.textSecondary }}>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3 w-3" />
                        Wallet Connection
                      </div>
                      {!isConnected ? (
                        <Button
                          size="sm"
                          onClick={handleWalletConnect}
                          className="h-6 px-2 text-xs"
                        >
                          <Wallet className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleWalletDisconnect}
                          className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
                        >
                          <LogOut className="h-3 w-3 mr-1" />
                          Disconnect
                        </Button>
                      )}
                    </div>
                    <div 
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-xs space-y-2" style={{ color: consoleColors.text }}>
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                              {isConnected ? 'Connected' : 'Not Connected'}
                            </span>
                          </div>
                        </div>
                        {address && (
                          <>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                              <span>Address:</span>
                              <span className="font-mono text-blue-400">{formatAddress(address)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Network:</span>
                              <div className="flex items-center gap-1">
                                <NetworkIcon className="h-3 w-3" style={{ color: consoleColors.textSecondary }} />
                                <span style={{ color: consoleColors.text }}>{getNetworkName(chainId)}</span>
                                {chainId && (
                                  <span className="text-[10px]" style={{ color: consoleColors.textSecondary }}>({chainId})</span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        {!isConnected && (
                          <div 
                            className="pt-2 border-t"
                            style={{ borderColor: consoleColors.border }}
                          >
                            <p className="text-[10px]" style={{ color: consoleColors.textSecondary }}>
                              Connect a wallet to interact with ENS domains
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-2 flex items-center gap-2" style={{ color: consoleColors.textSecondary }}>
                      <Code className="h-3 w-3" />
                      Clients
                    </div>
                    <div 
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-xs space-y-1" style={{ color: consoleColors.text }}>
                        <div>Public Client: <span className={publicClient ? 'text-green-400' : 'text-red-400'}>{publicClient ? 'Available' : 'Not available'}</span></div>
                        <div>Wallet Client: <span className={walletClient ? 'text-green-400' : 'text-red-400'}>{walletClient ? 'Available' : 'Not available'}</span></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-2 flex items-center gap-2" style={{ color: consoleColors.textSecondary }}>
                      <Globe className="h-3 w-3" />
                      ENS Stats
                    </div>
                    <div 
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-xs space-y-1" style={{ color: consoleColors.text }}>
                        <div>Total Logs: <span className="text-blue-400">{consoleLogs.length}</span></div>
                        <div>ENS Operations: <span className="text-purple-400">{ensOperations.length}</span></div>
                        <div>Resolve Operations: <span className="text-green-400">{ensOperations.filter(o => o.type === 'resolve').length}</span></div>
                        <div>Query Operations: <span className="text-yellow-400">{ensOperations.filter(o => o.type === 'query').length}</span></div>
                        <div 
                          className="pt-2 border-t mt-2"
                          style={{ borderColor: consoleColors.border }}
                        >
                          <div>Success Rate: <span className="text-green-400">{analytics.successRate}%</span></div>
                          <div>Avg Duration: <span className="text-blue-400">{analytics.avgDuration}ms</span></div>
                          <div>Recent (1min): <span className="text-purple-400">{analytics.recentOps}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Domains Tab */}
          <TabsContent value="domains" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              <div 
                className="p-4 border-b"
                style={{ borderColor: consoleColors.border }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm" style={{ color: consoleColors.text }}>Domain Inspector</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      style={{ color: consoleColors.textSecondary }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = consoleColors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = consoleColors.textSecondary;
                      }}
                      onClick={() => {
                        const domain = prompt('Enter domain to watch:');
                        if (domain) {
                          const interval = parseInt(prompt('Check interval (ms, default 30000):') || '30000');
                          addWatchedDomain(domain, interval);
                        }
                      }}
                      title="Add domain to watchlist"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Watch Domain
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter domain name (e.g., example.eth)..."
                    value={inspectingDomain}
                    onChange={(e) => setInspectingDomain(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inspectingDomain) {
                        inspectDomain(inspectingDomain);
                      }
                    }}
                    className="h-8 text-xs flex-1"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.inputBorder,
                      color: consoleColors.text,
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => inspectDomain(inspectingDomain)}
                    disabled={!inspectingDomain || isLoadingDomain || !publicClient}
                    className="h-8 px-4 text-xs"
                    title="Inspect domain (Ctrl+R to refresh)"
                  >
                    {isLoadingDomain ? 'Inspecting...' : 'Inspect'}
                  </Button>
                  {autoRefresh && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setAutoRefresh(false)}
                      title="Disable auto-refresh"
                    >
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Domain Details */}
                  {domainDetails && (
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="h-5 w-5 text-blue-400" />
                        <span className="font-semibold text-sm" style={{ color: consoleColors.text }}>{domainDetails.name}</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        {domainDetails.resolvedAddress && (
                          <div className="flex items-start justify-between">
                            <span style={{ color: consoleColors.textSecondary }}>Resolved Address:</span>
                            <span className="font-mono text-[10px] ml-4" style={{ color: consoleColors.text }}>
                              {formatAddress(domainDetails.resolvedAddress)}
                            </span>
                          </div>
                        )}
                        {domainDetails.resolver && (
                          <div className="flex items-start justify-between">
                            <span style={{ color: consoleColors.textSecondary }}>Resolver:</span>
                            <span className="font-mono text-[10px] ml-4" style={{ color: consoleColors.text }}>
                              {formatAddress(domainDetails.resolver)}
                            </span>
                          </div>
                        )}
                        {domainDetails.expiry && (
                          <div className="flex items-start justify-between">
                            <span style={{ color: consoleColors.textSecondary }}>Expiry:</span>
                            <span className="text-[10px] ml-4" style={{ color: consoleColors.text }}>
                              {new Date(Number(domainDetails.expiry) * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {domainDetails.reverseName && (
                          <div className="flex items-start justify-between">
                            <span style={{ color: consoleColors.textSecondary }}>Reverse Name:</span>
                            <span className="text-[10px] ml-4" style={{ color: consoleColors.text }}>
                              {domainDetails.reverseName}
                            </span>
                          </div>
                        )}
                        {domainDetails.textRecordsCount !== undefined && (
                          <div className="flex items-start justify-between">
                            <span style={{ color: consoleColors.textSecondary }}>Text Records:</span>
                            <span className="text-[10px] ml-4" style={{ color: consoleColors.text }}>
                              {domainDetails.textRecordsCount}
                            </span>
                          </div>
                        )}
                        <div 
                          className="flex items-start justify-between pt-2 border-t"
                          style={{ borderColor: consoleColors.border }}
                        >
                          <span style={{ color: consoleColors.textSecondary }}>Inspected At:</span>
                          <span className="text-[10px] ml-4" style={{ color: consoleColors.textSecondary }}>
                            {domainDetails.inspectedAt.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Records */}
                  {Object.keys(textRecords).length > 0 && (
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-5 w-5 text-blue-400" />
                        <span className="font-semibold text-sm" style={{ color: consoleColors.text }}>Text Records</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        {Object.entries(textRecords).map(([key, value]) => (
                          <div 
                            key={key} 
                            className="flex items-start justify-between py-1 border-b last:border-0"
                            style={{ borderColor: `${consoleColors.border}80` }}
                          >
                            <span className="font-mono text-[10px]" style={{ color: consoleColors.textSecondary }}>{key}:</span>
                            <span className="text-[10px] ml-4 break-all text-right max-w-[70%]" style={{ color: consoleColors.text }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Watchlist */}
                  {watchedDomains.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm mb-3 flex items-center gap-2" style={{ color: consoleColors.text }}>
                        <Eye className="h-4 w-4" />
                        Watched Domains
                      </div>
                      <div className="space-y-2">
                        {watchedDomains.map((watched) => (
                          <div
                            key={watched.id}
                            className="p-3 rounded border flex items-center justify-between"
                            style={{
                              backgroundColor: consoleColors.inputBackground,
                              borderColor: consoleColors.border,
                            }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Globe className="h-4 w-4 text-blue-400" />
                                <span className="font-semibold" style={{ color: consoleColors.text }}>{watched.domain}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    watched.isActive
                                      ? 'border-green-500/30 text-green-400'
                                      : ''
                                  }`}
                                  style={!watched.isActive ? {
                                    borderColor: consoleColors.border,
                                    color: consoleColors.textSecondary,
                                  } : {}}
                                >
                                  {watched.isActive ? 'Active' : 'Paused'}
                                </Badge>
                                {watched.changeCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">
                                    {watched.changeCount} changes
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px]" style={{ color: consoleColors.textSecondary }}>
                                Last checked: {watched.lastChecked.toLocaleTimeString()} | 
                                Interval: {watched.checkInterval}ms
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                style={{ color: consoleColors.text }}
                                onClick={() => toggleWatchedDomain(watched.id)}
                                title={watched.isActive ? 'Pause watching' : 'Resume watching'}
                              >
                                {watched.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                style={{ color: '#ef4444' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#f87171';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#ef4444';
                                }}
                                onClick={() => removeWatchedDomain(watched.id)}
                                title="Remove from watchlist"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Batch Operations */}
                  <div className="mb-4">
                    <div className="text-sm mb-3 flex items-center gap-2" style={{ color: consoleColors.text }}>
                      <Layers className="h-4 w-4" />
                      Batch Operations
                    </div>
                    <div 
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Domain (e.g., example.eth)"
                          value={batchDomainInput}
                          onChange={(e) => setBatchDomainInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && batchDomainInput.trim()) {
                              setBatchOperations(prev => [...prev, {
                                domain: batchDomainInput.trim(),
                                operation: 'getEnsAddress',
                                params: {}
                              }]);
                              setBatchDomainInput('');
                            }
                          }}
                          className="h-7 text-xs flex-1"
                          style={{
                            backgroundColor: consoleColors.background,
                            borderColor: consoleColors.inputBorder,
                            color: consoleColors.text,
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            if (batchDomainInput.trim()) {
                              setBatchOperations(prev => [...prev, {
                                domain: batchDomainInput.trim(),
                                operation: 'getEnsAddress',
                                params: {}
                              }]);
                              setBatchDomainInput('');
                            }
                          }}
                          disabled={!batchDomainInput.trim()}
                          title="Add to batch"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={executeBatchOperations}
                          disabled={batchOperations.length === 0 || !publicClient}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Execute ({batchOperations.length})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setBatchOperations([])}
                          disabled={batchOperations.length === 0}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {batchOperations.length > 0 && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {batchOperations.map((op, idx) => (
                            <div key={idx} className="text-xs flex items-center justify-between" style={{ color: consoleColors.textSecondary }}>
                              <span>{op.domain} - {op.operation}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                style={{ color: consoleColors.textSecondary }}
                                onClick={() => setBatchOperations(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Domain Groups */}
                  <div className="text-sm mb-3" style={{ color: consoleColors.text }}>Domain Operations</div>
                  <div className="space-y-2">
                    {ensOperations
                      .filter(op => op.domain)
                      .reduce((acc: any[], op) => {
                        const existing = acc.find(d => d.domain === op.domain);
                        if (existing) {
                          existing.operations.push(op);
                        } else {
                          acc.push({ domain: op.domain, operations: [op] });
                        }
                        return acc;
                      }, [])
                      .map((domainGroup, idx) => {
                        const successCount = domainGroup.operations.filter((o: ENSOperation) => o.result).length;
                        const errorCount = domainGroup.operations.filter((o: ENSOperation) => o.error).length;
                        const avgDuration = domainGroup.operations
                          .filter((o: ENSOperation) => o.duration !== undefined)
                          .reduce((sum: number, o: ENSOperation) => sum + (o.duration || 0), 0) / 
                          domainGroup.operations.filter((o: ENSOperation) => o.duration !== undefined).length;
                        
                        return (
                          <div 
                            key={idx} 
                            className="p-3 rounded border transition-colors cursor-pointer"
                            style={{
                              backgroundColor: consoleColors.inputBackground,
                              borderColor: consoleColors.border,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = `${consoleColors.border}cc`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = consoleColors.border;
                            }}
                            onClick={() => {
                              setInspectingDomain(domainGroup.domain);
                              inspectDomain(domainGroup.domain);
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-400" />
                                <span className="font-semibold" style={{ color: consoleColors.text }}>{domainGroup.domain}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                style={{ color: consoleColors.text }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingDomain(domainGroup.domain);
                                  inspectDomain(domainGroup.domain);
                                }}
                              >
                                Inspect
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: consoleColors.textSecondary }}>
                              <div>Operations: <span style={{ color: consoleColors.text }}>{domainGroup.operations.length}</span></div>
                              <div>Success: <span className="text-green-400">{successCount}</span></div>
                              <div>Errors: <span className="text-red-400">{errorCount}</span></div>
                              {!isNaN(avgDuration) && (
                                <div>Avg Duration: <span style={{ color: consoleColors.text }}>{Math.round(avgDuration)}ms</span></div>
                              )}
                            </div>
                            <div className="text-[10px] mt-2" style={{ color: consoleColors.textSecondary }}>
                              Last: {domainGroup.operations[domainGroup.operations.length - 1]?.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                    {ensOperations.filter(op => op.domain).length === 0 && (
                      <div className="text-center py-8" style={{ color: consoleColors.textSecondary }}>No domain operations yet</div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="h-full m-0 p-0">
            <div className="h-full flex flex-col p-4">
              <div className="text-sm mb-4 flex items-center justify-between" style={{ color: consoleColors.text }}>
                <span>Performance Analytics</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  style={{ color: consoleColors.text }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = consoleColors.textSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = consoleColors.text;
                  }}
                  onClick={exportOperations}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-xs mb-1" style={{ color: consoleColors.textSecondary }}>Total Operations</div>
                      <div className="text-2xl font-bold" style={{ color: consoleColors.text }}>{analytics.totalOps}</div>
                    </div>
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-xs mb-1" style={{ color: consoleColors.textSecondary }}>Success Rate</div>
                      <div className="text-2xl font-bold text-green-400">{analytics.successRate}%</div>
                    </div>
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-xs mb-1" style={{ color: consoleColors.textSecondary }}>Avg Duration</div>
                      <div className="text-2xl font-bold text-blue-400">{analytics.avgDuration}ms</div>
                    </div>
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-xs mb-1" style={{ color: consoleColors.textSecondary }}>Recent (1min)</div>
                      <div className="text-2xl font-bold text-purple-400">{analytics.recentOps}</div>
                    </div>
                  </div>

                  {/* Success/Error Breakdown */}
                  <div 
                    className="p-4 rounded border"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.border,
                    }}
                  >
                    <div className="text-sm mb-3 flex items-center gap-2" style={{ color: consoleColors.text }}>
                      <TrendingUp className="h-4 w-4" />
                      Operation Status
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs mb-2" style={{ color: consoleColors.textSecondary }}>Success</div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex-1 rounded-full h-2"
                            style={{ backgroundColor: consoleColors.background }}
                          >
                            <div 
                              className="bg-green-400 h-2 rounded-full transition-all"
                              style={{ width: `${analytics.totalOps > 0 ? (analytics.successOps / analytics.totalOps) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs w-12 text-right" style={{ color: consoleColors.text }}>{analytics.successOps}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs mb-2" style={{ color: consoleColors.textSecondary }}>Errors</div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex-1 rounded-full h-2"
                            style={{ backgroundColor: consoleColors.background }}
                          >
                            <div 
                              className="bg-red-400 h-2 rounded-full transition-all"
                              style={{ width: `${analytics.totalOps > 0 ? (analytics.errorOps / analytics.totalOps) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs w-12 text-right" style={{ color: consoleColors.text }}>{analytics.errorOps}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operations by Type */}
                  <div 
                    className="p-4 rounded border"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.border,
                    }}
                  >
                    <div className="text-sm mb-3 flex items-center gap-2" style={{ color: consoleColors.text }}>
                      <BarChart3 className="h-4 w-4" />
                      Operations by Type
                    </div>
                    <div className="space-y-2">
                      {Object.entries(analytics.opsByType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline"
                              className={`text-[10px] ${
                                type === 'resolve' ? 'border-blue-500/30 text-blue-400' :
                                type === 'query' ? 'border-purple-500/30 text-purple-400' :
                                type === 'transaction' ? 'border-green-500/30 text-green-400' :
                                ''
                              }`}
                              style={type !== 'resolve' && type !== 'query' && type !== 'transaction' ? {
                                borderColor: `${consoleColors.border}80`,
                                color: consoleColors.textSecondary,
                              } : {}}
                            >
                              {type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 flex-1 ml-4">
                            <div 
                              className="flex-1 rounded-full h-1.5"
                              style={{ backgroundColor: consoleColors.background }}
                            >
                              <div 
                                className={`h-1.5 rounded-full transition-all ${
                                  type === 'resolve' ? 'bg-blue-400' :
                                  type === 'query' ? 'bg-purple-400' :
                                  type === 'transaction' ? 'bg-green-400' :
                                  ''
                                }`}
                                style={{ 
                                  width: `${analytics.totalOps > 0 ? (count / analytics.totalOps) * 100 : 0}%`,
                                  backgroundColor: type !== 'resolve' && type !== 'query' && type !== 'transaction' ? consoleColors.textSecondary : undefined,
                                }}
                              />
                            </div>
                            <span className="text-xs w-8 text-right" style={{ color: consoleColors.text }}>{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error Patterns */}
                  {errorPatterns.length > 0 && (
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-sm mb-3 flex items-center gap-2" style={{ color: consoleColors.text }}>
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        Common Error Patterns
                      </div>
                      <div className="space-y-2">
                        {errorPatterns.map((pattern, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-mono text-[10px] truncate flex-1" style={{ color: consoleColors.textSecondary }}>
                              {pattern.pattern}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 ml-2">
                              {pattern.count}x
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operation Comparison */}
                  {operationComparison.length === 2 && (
                    <div 
                      className="p-4 rounded border"
                      style={{
                        backgroundColor: consoleColors.inputBackground,
                        borderColor: consoleColors.border,
                      }}
                    >
                      <div className="text-sm mb-3 flex items-center justify-between" style={{ color: consoleColors.text }}>
                        <span className="flex items-center gap-2">
                          <SettingsIcon className="h-4 w-4" />
                          Operation Comparison
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          style={{ color: consoleColors.text }}
                          onClick={() => setOperationComparison([])}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {operationComparison.map(opId => {
                          const op = ensOperations.find(o => o.id === opId);
                          if (!op) return null;
                          return (
                            <div key={opId} className="space-y-2">
                              <div className="font-semibold" style={{ color: consoleColors.text }}>{op.operation}</div>
                              <div style={{ color: consoleColors.textSecondary }}>Duration: <span style={{ color: consoleColors.text }}>{op.duration || 'N/A'}ms</span></div>
                              <div style={{ color: consoleColors.textSecondary }}>Status: <span className={op.error ? 'text-red-400' : 'text-green-400'}>{op.error ? 'Error' : 'Success'}</span></div>
                              {op.domain && <div style={{ color: consoleColors.textSecondary }}>Domain: <span style={{ color: consoleColors.text }}>{op.domain}</span></div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Performance Timeline */}
                  <div 
                    className="p-4 rounded border"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.border,
                    }}
                  >
                    <div className="text-sm mb-3 flex items-center gap-2" style={{ color: consoleColors.text }}>
                      <Clock className="h-4 w-4" />
                      Recent Performance
                    </div>
                    <div className="space-y-2">
                      {ensOperations
                        .slice(-10)
                        .reverse()
                        .map((op) => (
                          <div key={op.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] w-16" style={{ color: consoleColors.textSecondary }}>
                                {op.timestamp.toLocaleTimeString()}
                              </span>
                              <span style={{ color: consoleColors.text }}>{op.operation}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {op.duration !== undefined && (
                                <span className="text-[10px] w-12 text-right" style={{ color: consoleColors.textSecondary }}>
                                  {op.duration}ms
                                </span>
                              )}
                              {op.error ? (
                                <AlertCircle className="h-3 w-3 text-red-400" />
                              ) : op.result ? (
                                <div className="h-2 w-2 rounded-full bg-green-400" />
                              ) : null}
                            </div>
                          </div>
                        ))}
                      {ensOperations.length === 0 && (
                        <div className="text-center py-4 text-xs" style={{ color: consoleColors.textSecondary }}>No operations yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              <div 
                className="h-10 border-b flex items-center gap-2 px-3 flex-shrink-0"
                style={{
                  backgroundColor: consoleColors.headerBackground,
                  borderColor: consoleColors.border,
                }}
              >
                <div className="text-xs" style={{ color: consoleColors.textSecondary }}>Network Requests</div>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  style={{ color: consoleColors.text }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = consoleColors.textSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = consoleColors.text;
                  }}
                  onClick={() => setNetworkRequests([])}
                  title="Clear network requests"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="font-mono text-xs">
                  <div 
                    className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b text-[10px] font-semibold"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      borderColor: consoleColors.border,
                      color: consoleColors.textSecondary,
                    }}
                  >
                    <div className="col-span-2">Time</div>
                    <div className="col-span-1">Method</div>
                    <div className="col-span-5">URL</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-1">ENS</div>
                  </div>
                  {networkRequests.length === 0 ? (
                    <div className="text-center py-8" style={{ color: consoleColors.textSecondary }}>No network requests</div>
                  ) : (
                    networkRequests.map((req) => (
                      <div
                        key={req.id}
                        className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b cursor-pointer transition-colors"
                        style={{
                          borderColor: `${consoleColors.border}80`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${consoleColors.background}80`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="col-span-2 text-[10px]" style={{ color: consoleColors.textSecondary }}>
                          {req.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="col-span-1">
                          <Badge 
                            variant="outline" 
                            className="text-[10px]"
                            style={{
                              borderColor: consoleColors.border,
                              color: consoleColors.textSecondary,
                            }}
                          >
                            {req.method}
                          </Badge>
                        </div>
                        <div className="col-span-5 truncate" style={{ color: consoleColors.text }} title={req.url}>
                          {req.url}
                        </div>
                        <div className="col-span-1">
                          {req.status ? (
                            <span className={`text-[10px] ${
                              req.status >= 200 && req.status < 300 ? 'text-green-400' :
                              req.status >= 400 ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {req.status}
                            </span>
                          ) : req.error ? (
                            <span className="text-[10px] text-red-400">Error</span>
                          ) : (
                            <span className="text-[10px]" style={{ color: consoleColors.textSecondary }}>Pending</span>
                          )}
                        </div>
                        <div className="col-span-2 text-[10px]" style={{ color: consoleColors.textSecondary }}>
                          {req.duration ? `${req.duration}ms` : '-'}
                        </div>
                        <div className="col-span-1">
                          {req.isENSRelated && (
                            <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                              ENS
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="h-full m-0 p-0">
            <div className="h-full flex flex-col p-4">
              <div className="text-sm mb-4" style={{ color: consoleColors.text }}>Performance Profiles</div>
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  {Array.from(performanceProfiles.values()).length === 0 ? (
                    <div className="text-center py-8" style={{ color: consoleColors.textSecondary }}>No performance data yet</div>
                  ) : (
                    Array.from(performanceProfiles.values()).map((profile) => (
                      <div 
                        key={profile.operation} 
                        className="p-4 rounded border"
                        style={{
                          backgroundColor: consoleColors.inputBackground,
                          borderColor: consoleColors.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-sm" style={{ color: consoleColors.text }}>{profile.operation}</div>
                          <Badge 
                            variant="outline" 
                            className="text-[10px]"
                            style={{
                              borderColor: consoleColors.border,
                              color: consoleColors.textSecondary,
                            }}
                          >
                            {profile.count} operations
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="mb-1" style={{ color: consoleColors.textSecondary }}>Average</div>
                            <div className="font-mono" style={{ color: consoleColors.text }}>{Math.round(profile.avgDuration)}ms</div>
                          </div>
                          <div>
                            <div className="mb-1" style={{ color: consoleColors.textSecondary }}>Min / Max</div>
                            <div className="font-mono" style={{ color: consoleColors.text }}>{profile.minDuration}ms / {profile.maxDuration}ms</div>
                          </div>
                          <div>
                            <div className="mb-1" style={{ color: consoleColors.textSecondary }}>P50 (Median)</div>
                            <div className="font-mono" style={{ color: consoleColors.text }}>{Math.round(profile.p50)}ms</div>
                          </div>
                          <div>
                            <div className="mb-1" style={{ color: consoleColors.textSecondary }}>P95</div>
                            <div className="font-mono" style={{ color: consoleColors.text }}>{Math.round(profile.p95)}ms</div>
                          </div>
                          <div>
                            <div className="mb-1" style={{ color: consoleColors.textSecondary }}>P99</div>
                            <div className="font-mono" style={{ color: consoleColors.text }}>{Math.round(profile.p99)}ms</div>
                          </div>
                          <div>
                            <div className="mb-1" style={{ color: consoleColors.textSecondary }}>Errors</div>
                            <div className={`font-mono ${profile.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {profile.errors} ({profile.count > 0 ? ((profile.errors / profile.count) * 100).toFixed(1) : 0}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Scripts Tab */}
          <TabsContent value="scripts" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              <div 
                className="h-10 border-b flex items-center gap-2 px-3 flex-shrink-0"
                style={{
                  backgroundColor: consoleColors.headerBackground,
                  borderColor: consoleColors.border,
                }}
              >
                <div className="text-xs" style={{ color: consoleColors.textSecondary }}>Custom Scripts</div>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  style={{ color: consoleColors.text }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = consoleColors.textSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = consoleColors.text;
                  }}
                  onClick={executeCustomScript}
                  disabled={!customScript.trim() || !publicClient}
                  title="Execute script"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run
                </Button>
              </div>
              <div 
                className="flex-1 grid grid-cols-2 gap-0 border-t"
                style={{ borderColor: consoleColors.border }}
              >
                <div 
                  className="border-r flex flex-col"
                  style={{ borderColor: consoleColors.border }}
                >
                  <div 
                    className="h-8 border-b flex items-center px-3 text-xs"
                    style={{
                      backgroundColor: consoleColors.headerBackground,
                      borderColor: consoleColors.border,
                      color: consoleColors.textSecondary,
                    }}
                  >
                    Script Editor
                  </div>
                  <textarea
                    value={customScript}
                    onChange={(e) => setCustomScript(e.target.value)}
                    placeholder="// Write your custom ENS script here&#10;// Available: publicClient, walletClient, address, chainId, inspectDomain, trackENSOperation, formatAddress, getAllTextRecords&#10;&#10;const domain = 'example.eth';&#10;const address = await publicClient.getEnsAddress({ name: domain });&#10;console.log(`Resolved: ${address}`);"
                    className="flex-1 p-3 font-mono text-xs resize-none border-0 focus:outline-none"
                    style={{
                      backgroundColor: consoleColors.inputBackground,
                      color: consoleColors.text,
                    }}
                    spellCheck={false}
                  />
                </div>
                <div className="flex flex-col">
                  <div 
                    className="h-8 border-b flex items-center justify-between px-3"
                    style={{
                      backgroundColor: consoleColors.headerBackground,
                      borderColor: consoleColors.border,
                    }}
                  >
                    <div className="text-xs" style={{ color: consoleColors.textSecondary }}>Output</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      style={{ color: consoleColors.textSecondary }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = consoleColors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = consoleColors.textSecondary;
                      }}
                      onClick={() => setScriptOutput([])}
                      title="Clear output"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 font-mono text-xs" style={{ color: consoleColors.text }}>
                      {scriptOutput.length === 0 ? (
                        <div style={{ color: consoleColors.textSecondary }}>No output yet. Write a script and click Run.</div>
                      ) : (
                        scriptOutput.map((line, idx) => (
                          <div
                            key={idx}
                            className={`mb-1 ${
                              line.startsWith('[ERROR]') ? 'text-red-400' :
                              line.startsWith('[SUCCESS]') ? 'text-green-400' :
                              line.startsWith('[LOG]') ? 'text-blue-400' :
                              ''
                            }`}
                            style={!line.startsWith('[ERROR]') && !line.startsWith('[SUCCESS]') && !line.startsWith('[LOG]') ? {
                              color: consoleColors.text,
                            } : {}}
                          >
                            {line}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* App Integration Tab */}
          <TabsContent value="app" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              <div 
                className="h-10 border-b flex items-center gap-2 px-3 flex-shrink-0"
                style={{
                  backgroundColor: consoleColors.headerBackground,
                  borderColor: consoleColors.border,
                }}
              >
                <select
                  value={appView || ''}
                  onChange={(e) => setAppView(e.target.value as ViewType | null)}
                  className="h-7 text-xs rounded px-2 flex-1"
                  style={{
                    backgroundColor: consoleColors.inputBackground,
                    borderColor: consoleColors.inputBorder,
                    color: consoleColors.text,
                  }}
                >
                  <option value="">Select a view...</option>
                  <optgroup label="Overview">
                    <option value="dashboard">Dashboard</option>
                    <option value="analytics">Analytics</option>
                  </optgroup>
                  <optgroup label="Domain Management">
                    <option value="domains">Domain Management</option>
                    <option value="name-browser">Name Browser</option>
                    <option value="metadata">Metadata Editor</option>
                  </optgroup>
                  <optgroup label="Security & Governance">
                    <option value="security">Security Monitor</option>
                    <option value="audit">Audit Log</option>
                    <option value="governance">Governance</option>
                    <option value="dnssec">DNSSEC Config</option>
                  </optgroup>
                  <optgroup label="Registries">
                    <option value="contracts">Contract Registry</option>
                    <option value="dao-registry">DAO Registry</option>
                    <option value="integrations">Integrations</option>
                  </optgroup>
                  <optgroup label="Workflows">
                    <option value="marketplace">Marketplace</option>
                    <option value="contract-registration">Register Contract</option>
                    <option value="preflight-checker">Preflight Checker</option>
                  </optgroup>
                  <optgroup label="Tools">
                    <option value="naming">Naming Toolkit</option>
                    <option value="metadata-tools">Metadata Tools</option>
                  </optgroup>
                  <optgroup label="Reference">
                    <option value="protocol">Protocol Reference</option>
                    <option value="best-practices">Best Practices</option>
                  </optgroup>
                  <optgroup label="Admin">
                    <option value="fee-management">Fee Management</option>
                    <option value="master-database">Master Database</option>
                    <option value="admin-panel">Admin Panel</option>
                  </optgroup>
                  <optgroup label="Settings">
                    <option value="settings">Settings</option>
                  </optgroup>
                </select>
                {appView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    style={{ color: consoleColors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = consoleColors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = consoleColors.text;
                    }}
                    onClick={() => setAppView(null)}
                    title="Close view"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1" style={{ backgroundColor: consoleColors.background }}>
                <div className="p-4">
                  {appView === 'dashboard' && <Dashboard />}
                  {appView === 'domains' && <DomainManagement />}
                  {appView === 'name-browser' && <NameBrowser />}
                  {appView === 'metadata' && <MetadataEditor />}
                  {appView === 'security' && <SecurityMonitor />}
                  {appView === 'governance' && <GovernancePanel />}
                  {appView === 'audit' && <AuditLog />}
                  {appView === 'naming' && <NamingToolkit />}
                  {appView === 'protocol' && <ProtocolReference />}
                  {appView === 'best-practices' && <BestPracticesView />}
                  {appView === 'settings' && <Settings />}
                  {appView === 'dao-registry' && <DAORegistry />}
                  {appView === 'integrations' && <IntegrationRegistry />}
                  {appView === 'metadata-tools' && <MetadataTools />}
                  {appView === 'contracts' && <ContractRegistry />}
                  {appView === 'contract-registration' && <ContractRegistration />}
                  {appView === 'analytics' && <AnalyticsDashboard />}
                  {appView === 'preflight-checker' && <PreflightChecker />}
                  {appView === 'marketplace' && <ENSMarketplace />}
                  {appView === 'dnssec' && <DNSSECConfig />}
                  {appView === 'fee-management' && <FeeManagement />}
                  {appView === 'master-database' && <MasterDatabaseView />}
                  {appView === 'admin-panel' && <AdminPanel />}
                  {!appView && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Code className="h-12 w-12 mb-4" style={{ color: consoleColors.textSecondary }} />
                      <h3 className="text-lg font-semibold mb-2" style={{ color: consoleColors.text }}>App Integration</h3>
                      <p className="text-sm max-w-md" style={{ color: consoleColors.textSecondary }}>
                        Select a view from the dropdown above to access all application features directly within the console.
                      </p>
                      <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-left max-w-lg">
                        <div 
                          className="p-3 rounded border"
                          style={{
                            backgroundColor: consoleColors.inputBackground,
                            borderColor: consoleColors.border,
                          }}
                        >
                          <div className="font-semibold mb-1" style={{ color: consoleColors.text }}>Domain Management</div>
                          <div style={{ color: consoleColors.textSecondary }}>Manage domains, browse names, edit metadata</div>
                        </div>
                        <div 
                          className="p-3 rounded border"
                          style={{
                            backgroundColor: consoleColors.inputBackground,
                            borderColor: consoleColors.border,
                          }}
                        >
                          <div className="font-semibold mb-1" style={{ color: consoleColors.text }}>Security & Governance</div>
                          <div style={{ color: consoleColors.textSecondary }}>Monitor security, audit logs, governance</div>
                        </div>
                        <div 
                          className="p-3 rounded border"
                          style={{
                            backgroundColor: consoleColors.inputBackground,
                            borderColor: consoleColors.border,
                          }}
                        >
                          <div className="font-semibold mb-1" style={{ color: consoleColors.text }}>Registries</div>
                          <div style={{ color: consoleColors.textSecondary }}>Contract, DAO, and integration registries</div>
                        </div>
                        <div 
                          className="p-3 rounded border"
                          style={{
                            backgroundColor: consoleColors.inputBackground,
                            borderColor: consoleColors.border,
                          }}
                        >
                          <div className="font-semibold mb-1" style={{ color: consoleColors.text }}>Workflows</div>
                          <div style={{ color: consoleColors.textSecondary }}>Marketplace, registration, preflight checks</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Menu */}
      {showQuickMenu && !isMinimized && (
        <div className="absolute right-full top-0 bottom-0 w-64 bg-[#252526] border-l border-slate-700 z-30 shadow-xl" style={{ backgroundColor: '#252526' }}>
          <div className="h-10 bg-[#1e1e1e] border-b border-slate-700 flex items-center justify-between px-4">
            <span className="text-xs font-semibold text-slate-300">Quick Menu</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
              onClick={() => setShowQuickMenu(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-40px)]">
            <div className="p-2 space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-200 uppercase">Navigation</div>
              {navigationCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    setAppView(cmd.view);
                    setActiveTab('app');
                    setShowQuickMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <cmd.icon className="h-3 w-3 text-white" />
                  <span className="flex-1 text-left">{cmd.label}</span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                </button>
              ))}
              <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-200 uppercase mt-4">Wallet</div>
              {isConnected ? (
                <button
                  onClick={() => {
                    handleWalletDisconnect();
                    setShowQuickMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-300 hover:bg-slate-700 hover:text-red-200 rounded transition-colors"
                >
                  <LogOut className="h-3 w-3 text-red-300" />
                  <span className="flex-1 text-left">Disconnect Wallet</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleWalletConnect();
                    setShowQuickMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <Wallet className="h-3 w-3 text-white" />
                  <span className="flex-1 text-left">Connect Wallet</span>
                </button>
              )}
              <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-200 uppercase mt-4">Console Actions</div>
              {commands.filter(cmd => !cmd.id.includes('wallet')).map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setShowQuickMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <cmd.icon className="h-3 w-3 text-white" />
                  <span className="flex-1 text-left">{cmd.label}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Command Palette */}
      <CommandDialog
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        title="Command Palette"
        description="Type a command or search..."
      >
        <CommandInput placeholder="Type a command or search..." className="bg-[#1e1e1e] text-slate-300 border-slate-700" />
        <CommandList className="bg-[#1e1e1e]">
          <CommandEmpty className="text-slate-500">No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation" className="[&_[cmdk-group-heading]]:text-slate-400">
            {navigationCommands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                onSelect={() => {
                  setAppView(cmd.view);
                  setActiveTab('app');
                  setShowCommandPalette(false);
                }}
                className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
              >
                <cmd.icon className="h-4 w-4" />
                <span>{cmd.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Wallet" className="[&_[cmdk-group-heading]]:text-slate-400">
            {isConnected ? (
              <CommandItem
                onSelect={() => {
                  handleWalletDisconnect();
                  setShowCommandPalette(false);
                }}
                className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span>Disconnect Wallet</span>
              </CommandItem>
            ) : (
              <CommandItem
                onSelect={() => {
                  handleWalletConnect();
                  setShowCommandPalette(false);
                }}
                className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandGroup heading="Console Actions" className="[&_[cmdk-group-heading]]:text-slate-400">
            {commands.filter(cmd => !cmd.id.includes('wallet')).map((cmd) => (
              <CommandItem
                key={cmd.id}
                onSelect={() => {
                  cmd.action();
                  setShowCommandPalette(false);
                }}
                className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
              >
                <cmd.icon className="h-4 w-4" />
                <span>{cmd.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Tabs" className="[&_[cmdk-group-heading]]:text-slate-400">
            <CommandItem 
              onSelect={() => { setActiveTab('console'); setShowCommandPalette(false); }}
              className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
            >
              <Terminal className="h-4 w-4" />
              <span>Console</span>
              <CommandShortcut className="text-slate-500">⌘1</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => { setActiveTab('operations'); setShowCommandPalette(false); }}
              className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
            >
              <Zap className="h-4 w-4" />
              <span>Operations</span>
              <CommandShortcut className="text-slate-500">⌘2</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => { setActiveTab('analytics'); setShowCommandPalette(false); }}
              className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
              <CommandShortcut className="text-slate-500">⌘3</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => { setActiveTab('domains'); setShowCommandPalette(false); }}
              className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
            >
              <Globe className="h-4 w-4" />
              <span>Domains</span>
              <CommandShortcut className="text-slate-500">⌘4</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => { setActiveTab('inspector'); setShowCommandPalette(false); }}
              className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
            >
              <Code className="h-4 w-4" />
              <span>Inspector</span>
              <CommandShortcut className="text-slate-500">⌘5</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => { setActiveTab('app'); setShowCommandPalette(false); }}
              className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
            >
              <Code className="h-4 w-4" />
              <span>App</span>
              <CommandShortcut className="text-slate-500">⌘6</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {ensOperations.filter(op => op.domain).length > 0 && (
            <CommandGroup heading="Domain Operations" className="[&_[cmdk-group-heading]]:text-slate-400">
              {ensOperations
                .filter(op => op.domain)
                .slice(0, 10)
                .map((op) => (
                  <CommandItem
                    key={op.id}
                    onSelect={() => {
                      setInspectingDomain(op.domain || '');
                      inspectDomain(op.domain || '');
                      setActiveTab('domains');
                      setShowCommandPalette(false);
                    }}
                    className="text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Inspect {op.domain}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 left-0 w-4 h-4 cursor-nwse-resize bg-slate-600 hover:bg-slate-500 border-t border-r border-slate-500 z-50"
        style={{
          clipPath: 'polygon(0 100%, 100% 0, 100% 100%)'
        }}
        title="Drag to resize console"
      >
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 bg-slate-400" />
        <div className="absolute bottom-1 left-1 w-1 h-1 bg-slate-400" />
      </div>
    </div>
  );
}

