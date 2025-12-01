import { useState, Suspense, useCallback, useEffect, useRef } from 'react';
import { BottomToolbar } from './components/BottomToolbar';
import { Dashboard } from './components/Dashboard';
import { DomainManagement, NameBrowser } from './components/domains';
import { MetadataEditor, MetadataTools } from './components/metadata';
import { SecurityMonitor, AuditLog } from './components/security';
import { GovernancePanel } from './components/governance';
import { Settings } from './components/Settings';
import { ProtocolReference, BestPracticesView, NamingToolkit } from './components/reference';
import { DAORegistry, IntegrationRegistry, ContractRegistry } from './components/registry';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ContractRegistration, PreflightChecker } from './components/workflows';
import { KamikoMarketplace } from './components/marketplace';
import { DNSSECConfig } from './components/dnssec';
import { FeeManagement } from './components/admin';
import { MasterDatabaseView } from './components/admin/MasterDatabaseView';
import { AdminPanel } from './components/admin/AdminPanel';
import { WalletConnectRainbow } from './components/WalletConnectRainbow';
import { RainbowKitWrapper } from './lib/providers/RainbowKitProvider';
import { Web3ProviderCompat } from './lib/services';
import { DomainProvider } from './lib/contexts/DomainContext';
import { Toaster } from './components/ui/sonner';
import { TransactionStatusPanel } from './components/TransactionStatusPanel';
import { ENSConsole } from './components/devtools/ENSConsole';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Network, Terminal, Loader2 } from 'lucide-react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { buildConfig, isViewEnabled } from './config/feature-flags.config';

// =============================================================================
// BUILD CONFIGURATION: Set which view mode to use
// =============================================================================
// Configuration is managed in src/config/feature-flags.config.ts
// Set consoleMode to true for Console Mode (developer tools, logging, debugging)
// Set consoleMode to false for App Mode (full ENS marketplace and management UI)
const ENABLE_CONSOLE_MODE = buildConfig.consoleMode;
// =============================================================================

export type ViewType = 'dashboard' | 'domains' | 'name-browser' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'analytics' | 'preflight-checker' | 'marketplace' | 'dnssec' | 'fee-management' | 'master-database' | 'admin-panel' | 'guided-workflow';

// All possible views in order of priority for fallback
const ALL_VIEWS: ViewType[] = ['dashboard', 'domains', 'name-browser', 'metadata', 'security', 'governance', 'audit', 'naming', 'protocol', 'best-practices', 'settings', 'dao-registry', 'integrations', 'metadata-tools', 'contracts', 'contract-registration', 'analytics', 'preflight-checker', 'marketplace', 'dnssec', 'fee-management', 'master-database', 'admin-panel', 'guided-workflow'];

// Get the default view - stable function that only depends on feature flags
function getDefaultView(): ViewType {
  if (isViewEnabled('dashboard')) return 'dashboard';
  return ALL_VIEWS.find(view => isViewEnabled(view)) || 'dashboard';
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>(getDefaultView);

  // Redirect to valid view if current view becomes disabled
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (!isViewEnabled(currentView) && !hasRedirected.current) {
      hasRedirected.current = true;
      setCurrentView(getDefaultView());
    } else {
      hasRedirected.current = false;
    }
  }, [currentView]);

  // Keyboard shortcuts (only active in app mode)
  const handleViewChange = useCallback((view: ViewType) => {
    // Only allow navigation to enabled views
    if (isViewEnabled(view)) {
      setCurrentView(view);
    } else {
      // Redirect to dashboard if trying to access disabled view
      setCurrentView(getDefaultView());
    }
  }, []);

  useKeyboardShortcuts(handleViewChange, !ENABLE_CONSOLE_MODE);

  const renderView = () => {
    const LoadingFallback = () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );

    // If current view is disabled, show fallback while useEffect redirects
    if (!isViewEnabled(currentView)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          {isViewEnabled('dashboard') ? <Dashboard /> : <div>No views enabled. Please check feature-flags.config.ts</div>}
        </Suspense>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return isViewEnabled('dashboard') ? (
          <Suspense fallback={<LoadingFallback />}>
            <Dashboard />
          </Suspense>
        ) : null;
      case 'domains':
        return isViewEnabled('domains') ? (
          <Suspense fallback={<LoadingFallback />}>
            <DomainManagement />
          </Suspense>
        ) : null;
      case 'name-browser':
        return isViewEnabled('name-browser') ? (
          <Suspense fallback={<LoadingFallback />}>
            <NameBrowser />
          </Suspense>
        ) : null;
      case 'metadata':
        return isViewEnabled('metadata') ? (
          <Suspense fallback={<LoadingFallback />}>
            <MetadataEditor />
          </Suspense>
        ) : null;
      case 'security':
        return isViewEnabled('security') ? (
          <Suspense fallback={<LoadingFallback />}>
            <SecurityMonitor />
          </Suspense>
        ) : null;
      case 'governance':
        return isViewEnabled('governance') ? (
          <Suspense fallback={<LoadingFallback />}>
            <GovernancePanel />
          </Suspense>
        ) : null;
      case 'audit':
        return isViewEnabled('audit') ? (
          <Suspense fallback={<LoadingFallback />}>
            <AuditLog />
          </Suspense>
        ) : null;
      case 'naming':
        return isViewEnabled('naming') ? (
          <Suspense fallback={<LoadingFallback />}>
            <NamingToolkit />
          </Suspense>
        ) : null;
      case 'protocol':
        return isViewEnabled('protocol') ? (
          <Suspense fallback={<LoadingFallback />}>
            <ProtocolReference />
          </Suspense>
        ) : null;
      case 'best-practices':
        return isViewEnabled('best-practices') ? (
          <Suspense fallback={<LoadingFallback />}>
            <BestPracticesView />
          </Suspense>
        ) : null;
      case 'settings':
        return isViewEnabled('settings') ? (
          <Suspense fallback={<LoadingFallback />}>
            <Settings />
          </Suspense>
        ) : null;
      case 'dao-registry':
        return isViewEnabled('dao-registry') ? (
          <Suspense fallback={<LoadingFallback />}>
            <DAORegistry />
          </Suspense>
        ) : null;
      case 'integrations':
        return isViewEnabled('integrations') ? (
          <Suspense fallback={<LoadingFallback />}>
            <IntegrationRegistry />
          </Suspense>
        ) : null;
      case 'metadata-tools':
        return isViewEnabled('metadata-tools') ? (
          <Suspense fallback={<LoadingFallback />}>
            <MetadataTools />
          </Suspense>
        ) : null;
      case 'contracts':
        return isViewEnabled('contracts') ? (
          <Suspense fallback={<LoadingFallback />}>
            <ContractRegistry />
          </Suspense>
        ) : null;
      case 'contract-registration':
        return isViewEnabled('contract-registration') ? (
          <Suspense fallback={<LoadingFallback />}>
            <ContractRegistration />
          </Suspense>
        ) : null;
      case 'analytics':
        return isViewEnabled('analytics') ? (
          <Suspense fallback={<LoadingFallback />}>
            <AnalyticsDashboard />
          </Suspense>
        ) : null;
      case 'preflight-checker':
        return isViewEnabled('preflight-checker') ? (
          <Suspense fallback={<LoadingFallback />}>
            <PreflightChecker />
          </Suspense>
        ) : null;
      case 'marketplace':
        return isViewEnabled('marketplace') ? (
          <Suspense fallback={<LoadingFallback />}>
            <KamikoMarketplace />
          </Suspense>
        ) : null;
      case 'dnssec':
        return isViewEnabled('dnssec') ? (
          <Suspense fallback={<LoadingFallback />}>
            <DNSSECConfig />
          </Suspense>
        ) : null;
      case 'fee-management':
        return isViewEnabled('fee-management') ? (
          <Suspense fallback={<LoadingFallback />}>
            <FeeManagement />
          </Suspense>
        ) : null;
      case 'master-database':
        return isViewEnabled('master-database') ? (
          <Suspense fallback={<LoadingFallback />}>
            <MasterDatabaseView />
          </Suspense>
        ) : null;
      case 'admin-panel':
        return isViewEnabled('admin-panel') ? (
          <Suspense fallback={<LoadingFallback />}>
            <AdminPanel />
          </Suspense>
        ) : null;
      case 'guided-workflow':
        return isViewEnabled('guided-workflow') ? (
          <Suspense fallback={<LoadingFallback />}>
            <DomainManagement />
          </Suspense>
        ) : null;
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            {isViewEnabled('dashboard') ? <Dashboard /> : <div>No views enabled. Please check build.config.ts</div>}
          </Suspense>
        );
    }
  };

  // Console-only mode - render just the console without the app components
  if (ENABLE_CONSOLE_MODE) {
    return (
      <ErrorBoundary>
        <RainbowKitWrapper>
          <Web3ProviderCompat>
            <DomainProvider>
              <div className="flex min-h-screen w-full relative bg-[#09090b]">
                <div className="flex-1 relative z-10 flex flex-col">
                  <div className="fixed top-0 left-0 right-0 z-[100] glass border-b border-zinc-800/50 px-4 py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
                        <Terminal className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h1 className="text-white font-semibold text-sm leading-tight">ens.tools</h1>
                        <p className="text-zinc-500 text-[10px] leading-tight font-mono tracking-wider">CONSOLE MODE</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <WalletConnectRainbow />
                    </div>
                  </div>
                </div>
                <ENSConsole isFullScreen={true} />
                <Toaster />
              </div>
            </DomainProvider>
          </Web3ProviderCompat>
        </RainbowKitWrapper>
      </ErrorBoundary>
    );
  }

  // App mode - render the full app without the console
  return (
    <ErrorBoundary>
      <RainbowKitWrapper>
        <Web3ProviderCompat>
          <DomainProvider>
            <div className="flex min-h-screen w-full bg-[#0a0a0b]">
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="fixed top-0 left-0 right-0 z-[100] bg-[#0a0a0b] border-b border-zinc-800 px-6 h-14 flex items-center justify-between" style={{ marginLeft: '56px' }}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Network className="h-4 w-4 text-zinc-400" />
                    </div>
                    <span className="text-white font-medium">ens.tools</span>
                  </div>
                  <WalletConnectRainbow />
                </header>
                
                {/* Main content */}
                <main 
                  className="flex-1 overflow-y-auto" 
                  style={{ 
                    marginTop: '56px', 
                    marginLeft: '56px', 
                    height: 'calc(100vh - 56px)',
                  }}
                >
                  <div className="p-6 max-w-6xl mx-auto">
                    <ErrorBoundary>
                      <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[400px]">
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                        </div>
                      }>
                        {renderView()}
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </main>
              </div>
              <BottomToolbar currentView={currentView} onViewChange={handleViewChange} />
              <TransactionStatusPanel />
              <Toaster />
            </div>
          </DomainProvider>
        </Web3ProviderCompat>
      </RainbowKitWrapper>
    </ErrorBoundary>
  );
}
