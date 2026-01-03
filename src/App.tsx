import { useState, Suspense, useCallback, useEffect, useRef, lazy } from 'react';
// Lazy load heavy components for better performance
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
import { WalletConnectRainbow } from './components/WalletConnectRainbow';
import { RainbowKitWrapper } from './lib/providers/RainbowKitProvider';
import { Web3ProviderCompat } from './lib/services';
import { DomainProvider } from './lib/contexts/DomainContext';
import { Toaster } from './components/ui/sonner';
import { TransactionStatusPanel } from './components/TransactionStatusPanel';
import { ENSConsole } from './components/devtools/ENSConsole';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Terminal, Loader2, Globe } from 'lucide-react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { buildConfig, isViewEnabled } from './config/feature-flags.config';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { AdaptiveContextProvider } from './lib/adaptive-rendering';
import { SidebarProvider } from './components/ui/sidebar';
import { bannerCustomizationService } from './lib/services/banner-customization-service';
import { AppSidebar } from './components/AppSidebar';
import { RotatingENSNames } from './components/RotatingENSNames';
import { ParallaxBackground } from './components/ParallaxBackground';

// =============================================================================
// BUILD CONFIGURATION: Set which view mode to use
// =============================================================================
// Configuration is managed in src/config/feature-flags.config.ts
// Set consoleMode to true for Console Mode (developer tools, logging, debugging)
// Set consoleMode to false for App Mode (full ENS marketplace and management UI)
const ENABLE_CONSOLE_MODE = buildConfig.consoleMode;
// =============================================================================

export type ViewType = 'dashboard' | 'domains' | 'name-browser' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'analytics' | 'preflight-checker' | 'marketplace' | 'dnssec' | 'fee-management' | 'master-database' | 'admin-panel' | 'guided-workflow' | 'ai-tools' | 'documentation';

// All possible views in order of priority for fallback
const ALL_VIEWS: ViewType[] = ['dashboard', 'domains', 'name-browser', 'metadata', 'security', 'governance', 'audit', 'naming', 'protocol', 'best-practices', 'settings', 'dao-registry', 'integrations', 'metadata-tools', 'contracts', 'contract-registration', 'analytics', 'preflight-checker', 'marketplace', 'dnssec', 'fee-management', 'master-database', 'admin-panel', 'guided-workflow', 'ai-tools', 'documentation'];

// Get the default view - stable function that only depends on feature flags
function getDefaultView(): ViewType {
  if (isViewEnabled('dashboard')) return 'dashboard';
  return ALL_VIEWS.find(view => isViewEnabled(view)) || 'dashboard';
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>(getDefaultView);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [bannerCustomization, setBannerCustomization] = useState(() => 
    bannerCustomizationService.getCustomization()
  );
  const [scrollY, setScrollY] = useState(0);

  // Listen for customization changes (e.g., from Settings page)
  useEffect(() => {
    const handleStorageChange = () => {
      setBannerCustomization(bannerCustomizationService.getCustomization());
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event from same window
    window.addEventListener('bannerCustomizationChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bannerCustomizationChanged', handleStorageChange);
    };
  }, []);

  // Parallax scroll effect for banner (throttled via requestAnimationFrame)
  useEffect(() => {
    let latestScrollY = window.scrollY;
    let ticking = false;

    const updateScroll = () => {
      setScrollY(latestScrollY);
      ticking = false;
    };

    const handleScroll = () => {
      latestScrollY = window.scrollY;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial sync
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
      const defaultView = getDefaultView();
      setCurrentView(defaultView);
    }
  }, []);

  useKeyboardShortcuts(handleViewChange, !ENABLE_CONSOLE_MODE);

  // Keyboard shortcut for help modal
  useEffect(() => {
    if (ENABLE_CONSOLE_MODE) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [ENABLE_CONSOLE_MODE]);

  const renderView = () => {
    const LoadingFallback = () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <div className="absolute inset-0 blur-xl bg-cyan-500/30 rounded-full animate-pulse" />
          </div>
          <p className="text-sm text-slate-500">Loading component...</p>
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
      case 'ai-tools':
        return isViewEnabled('ai-tools') ? (
          <Suspense fallback={<LoadingFallback />}>
            <div className="container mx-auto p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIDomainSuggestions />
                <AIMetadataGenerator />
              </div>
              <AIRAGAssistant />
              <AIConfiguration />
            </div>
          </Suspense>
        ) : null;
      case 'documentation':
        return isViewEnabled('documentation') ? (
          <Suspense fallback={<LoadingFallback />}>
            <div className="h-[calc(100vh-80px-96px)] -m-8">
              <DocumentationViewer currentView={currentView} />
            </div>
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
              <AdaptiveContextProvider>
                <div className="flex min-h-screen w-full relative bg-[#09090b]">
                <div className="flex-1 relative z-10 flex flex-col">
                  <div className="fixed top-0 left-0 right-0 z-[100] glass border-b border-zinc-800/50 px-4 py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
                        <Terminal className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h1 className="text-white font-semibold text-sm leading-tight">config</h1>
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
              </AdaptiveContextProvider>
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
            <AdaptiveContextProvider>
              <SidebarProvider>
                <ParallaxBackground />
                <div className="flex min-h-screen w-full relative bg-background">
                  {/* Animated Background with Parallax */}
                  <div 
                    className="particle-bg" 
                    style={{
                      transform: `translate3d(0, ${scrollY * 0.3}px, 0)`,
                      willChange: 'transform',
                    }}
                  />
                  
                  <AppSidebar currentView={currentView} onViewChange={handleViewChange} />

                  <div className="flex-1 flex flex-col relative z-10">
                    {/* Premium Main Interface */}
                    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/30 via-white to-sky-50/20">
                      {/* Premium Status Panel */}
                      <div className="mx-6 mt-6 mb-8 bg-white border border-slate-200/50 rounded-2xl p-8 shadow-xl glass-card animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-8">
                            <div className="flex items-center gap-4">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 animate-pulse shadow-xl shadow-emerald-500/50"></div>
                              <span className="text-slate-800 font-bold text-base uppercase tracking-wider">SYSTEM STATUS</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 text-sm font-medium">Network:</span>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-slate-900 font-bold">Ethereum</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 text-sm font-medium">ENS:</span>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                                <span className="text-sky-700 font-bold">Active</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="relative h-3 w-24 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                              <div className="absolute inset-0 bg-gradient-to-r from-slate-300 to-sky-300 rounded-full animate-pulse"></div>
                              <div className="h-full w-5/6 bg-gradient-to-r from-sky-500 via-emerald-500 to-slate-600 rounded-full animate-pulse shadow-lg"></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                              <span className="text-sm text-emerald-700 font-bold uppercase tracking-wider">Online</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <ErrorBoundary>
                          <Suspense fallback={
                            <div className="flex items-center justify-center min-h-[400px]">
                              <div className="relative">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                <div className="absolute inset-0 blur-xl bg-purple-500/30 rounded-full animate-pulse" />
                              </div>
                            </div>
                          }>
                            {renderView() || (
                              <div className="p-8 text-center">
                                <div className="text-white text-xl mb-4">No view available</div>
                                <div className="text-slate-400">Please check feature flags configuration.</div>
                                <div className="mt-4 text-sm text-slate-500">Current view: {currentView}</div>
                              </div>
                            )}
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
