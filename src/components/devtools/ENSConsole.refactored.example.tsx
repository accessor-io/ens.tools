/**
 * REFACTORED ENSConsole Component Example
 * 
 * This demonstrates how the main ENSConsole component would look
 * after full refactoring using the new hooks and tab components.
 * 
 * The original ENSConsole.tsx (2985 lines) would be reduced to ~400 lines
 * by using this structure.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { ErrorBoundary } from './ErrorBoundary';
import { useWeb3 } from '../../lib/services';
import { 
  useConsoleLogs, 
  useENSOperations, 
  useNetworkRequests, 
  useDomainInspector 
} from './hooks';
import { 
  ConsoleTab, 
  OperationsTab, 
  AnalyticsTab, 
  NetworkTab 
} from './tabs';
import { 
  Terminal, 
  Network, 
  Code, 
  Globe,
  Zap,
  BarChart3,
  Gauge,
  FileCode,
  ChevronRight,
  Wallet,
  LogOut,
  Command,
  Menu,
} from 'lucide-react';
import { formatAddress } from '../../lib/ens/ens-utils';
import { WalletSelectionModal } from '../WalletSelectionModal';
import type { ViewType } from '../../App';

export function ENSConsoleRefactored() {
  const { address, isConnected, publicClient, walletClient, connect, disconnect, chainId } = useWeb3();
  const [activeTab, setActiveTab] = useState('console');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [appView, setAppView] = useState<ViewType | null>(null);
  const [savedFilters, setSavedFilters] = useState<Array<{name: string; query: string; domain: string; type: string}>>([]);
  const [operationComparison, setOperationComparison] = useState<string[]>([]);

  // Use custom hooks for state management
  const consoleLogs = useConsoleLogs();
  const operations = useENSOperations();
  const network = useNetworkRequests();
  const domainInspector = useDomainInspector(publicClient, operations.trackENSOperation);

  // Replay operation handler
  const replayOperation = useCallback(async (op: any) => {
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
          await domainInspector.inspectDomain(op.domain);
          return;
        default:
          console.warn('Cannot replay operation:', op.operation);
          return;
      }
      
      const duration = Date.now() - startTime;
      operations.trackENSOperation({
        type: op.type,
        domain: op.domain,
        address: op.address,
        operation: `replay:${op.operation}`,
        result,
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      operations.trackENSOperation({
        type: op.type,
        domain: op.domain,
        address: op.address,
        operation: `replay:${op.operation}`,
        error: error.message,
        duration,
      });
    }
  }, [publicClient, domainInspector, operations]);

  // Wallet handlers
  const handleWalletConnect = useCallback(async () => {
    if (isConnected) return;
    setShowWalletModal(true);
  }, [isConnected]);

  const handleWalletDisconnect = useCallback(async () => {
    try {
      disconnect();
      operations.trackENSOperation({
        type: 'transaction',
        operation: 'disconnectWallet',
        result: 'success',
      });
    } catch (error: any) {
      operations.trackENSOperation({
        type: 'transaction',
        operation: 'disconnectWallet',
        error: error.message,
      });
    }
  }, [disconnect, operations]);

  const handleWalletSelect = async (provider: any, walletId: string) => {
    if (!provider || !provider.request) {
      operations.trackENSOperation({
        type: 'transaction',
        operation: 'connectWallet',
        error: 'Invalid provider',
      });
      return;
    }

    try {
      await connect(provider);
      setShowWalletModal(false);
      operations.trackENSOperation({
        type: 'transaction',
        operation: 'connectWallet',
        result: 'success',
        details: { walletId },
      });
    } catch (error: any) {
      operations.trackENSOperation({
        type: 'transaction',
        operation: 'connectWallet',
        error: error.message,
        details: { walletId },
      });
      throw error;
    }
  };

  // Filter management
  const saveFilter = useCallback(() => {
    const filter = {
      name: `Filter ${savedFilters.length + 1}`,
      query: consoleLogs.searchQuery,
      domain: consoleLogs.domainFilter,
      type: consoleLogs.filterType,
    };
    setSavedFilters(prev => [...prev, filter]);
  }, [savedFilters.length, consoleLogs]);

  const loadFilter = useCallback((filter: typeof savedFilters[0]) => {
    consoleLogs.setSearchQuery(filter.query);
    consoleLogs.setDomainFilter(filter.domain);
    consoleLogs.setFilterType(filter.type);
  }, [consoleLogs]);

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
        }
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowQuickMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showQuickMenu]);

  if (isMinimized) {
    return (
      <div className="fixed right-0 top-[64px] bottom-0 w-8 bg-slate-800 border-l border-slate-500 flex flex-col items-center justify-center gap-2 z-40 hover:bg-slate-700 transition-colors">
        <div className="writing-vertical-rl text-xs text-white transform rotate-180 whitespace-nowrap py-2">
          <span>ENS</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[10px] text-white">
          <span>{consoleLogs.consoleLogs.length}</span>
          <span>{operations.ensOperations.length}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
          onClick={() => setIsMinimized(false)}
          title="Expand console"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="fixed right-0 top-[64px] bottom-0 w-[1125px] bg-slate-800 border-l border-slate-500 flex flex-col z-40 shadow-2xl" style={{ backgroundColor: '#1e293b' }}>
        {/* Header */}
        <div className="h-10 bg-slate-700 border-b border-slate-500 flex items-center justify-between px-4 flex-shrink-0" style={{ backgroundColor: '#334155' }}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-white hover:text-slate-100"
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              title="Quick Menu (Ctrl+M)"
            >
              <Menu className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-white hover:text-slate-100"
              onClick={() => setShowCommandPalette(true)}
              title="Command Palette (Ctrl+K)"
            >
              <Command className="h-3 w-3" />
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="bg-slate-700 h-8 p-0" style={{ backgroundColor: '#334155' }}>
              <TabsTrigger value="console" className="text-xs px-3 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-100">
                <Terminal className="h-3 w-3 mr-1.5" />
                Console
                {consoleLogs.consoleLogs.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">
                    {consoleLogs.consoleLogs.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="operations" className="text-xs px-3 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-100">
                <Zap className="h-3 w-3 mr-1.5" />
                ENS Operations
                {operations.ensOperations.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">
                    {operations.ensOperations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs px-3 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-100">
                <BarChart3 className="h-3 w-3 mr-1.5" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="network" className="text-xs px-3 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-100">
                <Network className="h-3 w-3 mr-1.5" />
                Network
                {network.networkRequests.filter(r => r.isENSRelated).length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">
                    {network.networkRequests.filter(r => r.isENSRelated).length}
                  </span>
                )}
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
                  className="h-5 w-5 p-0 text-white hover:text-red-400"
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
                className="h-7 px-2 text-white hover:text-slate-100"
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
              className="h-6 px-2 text-slate-400 hover:text-slate-200"
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
            <TabsContent value="console" className="h-full m-0 p-0">
              <ConsoleTab
                {...consoleLogs}
                savedFilters={savedFilters}
                onSaveFilter={saveFilter}
                onLoadFilter={loadFilter}
              />
            </TabsContent>

            <TabsContent value="operations" className="h-full m-0 p-0">
              <OperationsTab
                filteredOperations={operations.filteredOperations}
                searchQuery={operations.searchQuery}
                setSearchQuery={operations.setSearchQuery}
                domainFilter={operations.domainFilter}
                setDomainFilter={operations.setDomainFilter}
                autoRefresh={domainInspector.autoRefresh}
                setAutoRefresh={domainInspector.setAutoRefresh}
                onExportOperations={operations.exportOperations}
                onExportToCSV={operations.exportToCSV}
                onClearOperations={operations.clearOperations}
                onReplayOperation={replayOperation}
                publicClient={publicClient}
              />
            </TabsContent>

            <TabsContent value="analytics" className="h-full m-0 p-0">
              <AnalyticsTab
                analytics={operations.analytics}
                errorPatterns={operations.errorPatterns}
                operationComparison={operationComparison}
                ensOperations={operations.ensOperations}
                onExportOperations={operations.exportOperations}
                onClearComparison={() => setOperationComparison([])}
              />
            </TabsContent>

            <TabsContent value="network" className="h-full m-0 p-0">
              <NetworkTab
                networkRequests={network.networkRequests}
                onClearNetwork={network.clearNetwork}
              />
            </TabsContent>
          </Tabs>
        </div>

        <WalletSelectionModal
          open={showWalletModal}
          onOpenChange={setShowWalletModal}
          onWalletSelect={handleWalletSelect}
        />
      </div>
    </ErrorBoundary>
  );
}







