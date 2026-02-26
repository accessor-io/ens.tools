import { useState, Suspense, useCallback, useEffect, useRef, lazy } from 'react';

// Lazy load heavy components
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const DomainManagement = lazy(() => import('./components/domains').then(m => ({ default: m.DomainManagement })));
const NameBrowser = lazy(() => import('./components/domains').then(m => ({ default: m.NameBrowser })));
const MetadataEditor = lazy(() => import('./components/metadata').then(m => ({ default: m.MetadataEditor })));
const MetadataTools = lazy(() => import('./components/metadata').then(m => ({ default: m.MetadataTools })));
const SecurityMonitor = lazy(() => import('./components/security').then(m => ({ default: m.SecurityMonitor })));
const AuditLog = lazy(() => import('./components/security').then(m => ({ default: m.AuditLog })));
const GovernancePanel = lazy(() => import('./components/governance').then(m => ({ default: m.GovernancePanel })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const ProtocolReference = lazy(() => import('./components/reference').then(m => ({ default: m.ProtocolReference })));
const BestPracticesView = lazy(() => import('./components/reference').then(m => ({ default: m.BestPracticesView })));
const NamingToolkit = lazy(() => import('./components/reference').then(m => ({ default: m.NamingToolkit })));
const DAORegistry = lazy(() => import('./components/registry').then(m => ({ default: m.DAORegistry })));
const IntegrationRegistry = lazy(() => import('./components/registry').then(m => ({ default: m.IntegrationRegistry })));
const ContractRegistry = lazy(() => import('./components/registry').then(m => ({ default: m.ContractRegistry })));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const ContractRegistration = lazy(() => import('./components/workflows').then(m => ({ default: m.ContractRegistration })));
const PreflightChecker = lazy(() => import('./components/workflows').then(m => ({ default: m.PreflightChecker })));
const KamikoMarketplace = lazy(() => import('./components/marketplace').then(m => ({ default: m.KamikoMarketplace })));
const DNSSECConfig = lazy(() => import('./components/dnssec').then(m => ({ default: m.DNSSECConfig })));
const FeeManagement = lazy(() => import('./components/admin').then(m => ({ default: m.FeeManagement })));
const MasterDatabaseView = lazy(() => import('./components/admin/MasterDatabaseView').then(m => ({ default: m.MasterDatabaseView })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const AIDomainSuggestions = lazy(() => import('./components/ai').then(m => ({ default: m.AIDomainSuggestions })));
const AIMetadataGenerator = lazy(() => import('./components/ai').then(m => ({ default: m.AIMetadataGenerator })));
const AIRAGAssistant = lazy(() => import('./components/ai').then(m => ({ default: m.AIRAGAssistant })));
const AIConfiguration = lazy(() => import('./components/ai').then(m => ({ default: m.AIConfiguration })));
const DocumentationViewer = lazy(() => import('./components/documentation').then(m => ({ default: m.DocumentationViewer })));

import { RainbowKitWrapper } from './lib/providers/RainbowKitProvider';
import { Web3ProviderCompat } from './lib/services';
import { DomainProvider } from './lib/contexts/DomainContext';
import { Toaster } from './components/ui/sonner';
import { TransactionStatusPanel } from './components/TransactionStatusPanel';
import { ENSConsole } from './components/devtools/ENSConsole';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Terminal, Loader2 } from 'lucide-react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { buildConfig, isViewEnabled } from './config/feature-flags.config';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { AdaptiveContextProvider } from './lib/adaptive-rendering';
import { SidebarProvider } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
import { WalletConnectRainbow } from './components/WalletConnectRainbow';

const ENABLE_CONSOLE_MODE = buildConfig.consoleMode;

export type ViewType = 'dashboard' | 'domains' | 'name-browser' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'analytics' | 'preflight-checker' | 'marketplace' | 'dnssec' | 'fee-management' | 'master-database' | 'admin-panel' | 'guided-workflow' | 'ai-tools' | 'documentation';

const ALL_VIEWS: ViewType[] = ['dashboard', 'domains', 'name-browser', 'metadata', 'security', 'governance', 'audit', 'naming', 'protocol', 'best-practices', 'settings', 'dao-registry', 'integrations', 'metadata-tools', 'contracts', 'contract-registration', 'analytics', 'preflight-checker', 'marketplace', 'dnssec', 'fee-management', 'master-database', 'admin-panel', 'guided-workflow', 'ai-tools', 'documentation'];

function getDefaultView(): ViewType {
  if (isViewEnabled('dashboard')) return 'dashboard';
  return ALL_VIEWS.find(view => isViewEnabled(view)) || 'dashboard';
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>(getDefaultView);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  // Redirect to valid view if current becomes disabled
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (!isViewEnabled(currentView) && !hasRedirected.current) {
      hasRedirected.current = true;
      setCurrentView(getDefaultView());
    } else {
      hasRedirected.current = false;
    }
  }, [currentView]);

  const handleViewChange = useCallback((view: ViewType) => {
    if (isViewEnabled(view)) {
      setCurrentView(view);
    } else {
      setCurrentView(getDefaultView());
    }
  }, []);

  useKeyboardShortcuts(handleViewChange, !ENABLE_CONSOLE_MODE);

  // Keyboard shortcut for help modal
  useEffect(() => {
    if (ENABLE_CONSOLE_MODE) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [ENABLE_CONSOLE_MODE]);

  const renderView = () => {
    if (!isViewEnabled(currentView)) {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          {isViewEnabled('dashboard') ? <Dashboard /> : <div className="p-8 text-gray-500">No views enabled. Check feature-flags.config.ts</div>}
        </Suspense>
      );
    }

    const viewMap: Record<string, JSX.Element | null> = {
      'dashboard': isViewEnabled('dashboard') ? <Dashboard /> : null,
      'domains': isViewEnabled('domains') ? <DomainManagement /> : null,
      'name-browser': isViewEnabled('name-browser') ? <NameBrowser /> : null,
      'metadata': isViewEnabled('metadata') ? <MetadataEditor /> : null,
      'security': isViewEnabled('security') ? <SecurityMonitor /> : null,
      'governance': isViewEnabled('governance') ? <GovernancePanel /> : null,
      'audit': isViewEnabled('audit') ? <AuditLog /> : null,
      'naming': isViewEnabled('naming') ? <NamingToolkit /> : null,
      'protocol': isViewEnabled('protocol') ? <ProtocolReference /> : null,
      'best-practices': isViewEnabled('best-practices') ? <BestPracticesView /> : null,
      'settings': isViewEnabled('settings') ? <Settings /> : null,
      'dao-registry': isViewEnabled('dao-registry') ? <DAORegistry /> : null,
      'integrations': isViewEnabled('integrations') ? <IntegrationRegistry /> : null,
      'metadata-tools': isViewEnabled('metadata-tools') ? <MetadataTools /> : null,
      'contracts': isViewEnabled('contracts') ? <ContractRegistry /> : null,
      'contract-registration': isViewEnabled('contract-registration') ? <ContractRegistration /> : null,
      'analytics': isViewEnabled('analytics') ? <AnalyticsDashboard /> : null,
      'preflight-checker': isViewEnabled('preflight-checker') ? <PreflightChecker /> : null,
      'marketplace': isViewEnabled('marketplace') ? <KamikoMarketplace /> : null,
      'dnssec': isViewEnabled('dnssec') ? <DNSSECConfig /> : null,
      'fee-management': isViewEnabled('fee-management') ? <FeeManagement /> : null,
      'master-database': isViewEnabled('master-database') ? <MasterDatabaseView /> : null,
      'admin-panel': isViewEnabled('admin-panel') ? <AdminPanel /> : null,
      'guided-workflow': isViewEnabled('guided-workflow') ? <DomainManagement /> : null,
      'ai-tools': isViewEnabled('ai-tools') ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIDomainSuggestions />
            <AIMetadataGenerator />
          </div>
          <AIRAGAssistant />
          <AIConfiguration />
        </div>
      ) : null,
      'documentation': isViewEnabled('documentation') ? (
        <div className="h-[calc(100vh-64px)]">
          <DocumentationViewer currentView={currentView} />
        </div>
      ) : null,
    };

    const component = viewMap[currentView];
    if (!component) {
      return isViewEnabled('dashboard') ? <Dashboard /> : <div className="p-8 text-gray-500">No views enabled.</div>;
    }

    return component;
  };

  // Console-only mode
  if (ENABLE_CONSOLE_MODE) {
    return (
      <ErrorBoundary>
        <RainbowKitWrapper>
          <Web3ProviderCompat>
            <DomainProvider>
              <AdaptiveContextProvider>
                <div className="flex min-h-screen w-full bg-gray-950">
                  <div className="flex-1 flex flex-col">
                    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Terminal className="h-4 w-4 text-gray-400" />
                        <span className="text-white font-medium text-sm">ENS Console</span>
                      </div>
                      <WalletConnectRainbow />
                    </div>
                  </div>
                  <ENSConsole isFullScreen={true} />
                  <Toaster />
                </div>
              </AdaptiveContextProvider>
            </DomainProvider>
          </Web3ProviderCompat>
        </RainbowKitWrapper>
      </ErrorBoundary>
    );
  }

  // App mode
  return (
    <ErrorBoundary>
      <RainbowKitWrapper>
        <Web3ProviderCompat>
          <DomainProvider>
            <AdaptiveContextProvider>
              <SidebarProvider>
                <div className="flex min-h-screen w-full bg-gray-50">
                  <AppSidebar currentView={currentView} onViewChange={handleViewChange} />

                  <div className="flex-1 flex flex-col min-w-0">
                    <main className="flex-1 overflow-y-auto">
                      <div className="p-6">
                        <ErrorBoundary>
                          <Suspense fallback={<LoadingSpinner />}>
                            {renderView()}
                          </Suspense>
                        </ErrorBoundary>
                      </div>
                    </main>
                  </div>

                  <TransactionStatusPanel />
                  <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
                  <Toaster />
                </div>
              </SidebarProvider>
            </AdaptiveContextProvider>
          </DomainProvider>
        </Web3ProviderCompat>
      </RainbowKitWrapper>
    </ErrorBoundary>
  );
}
