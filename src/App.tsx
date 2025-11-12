import { useState } from 'react';
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
import { FeeManagement } from './components/admin/FeeManagement';
import { MasterDatabaseView } from './components/admin/MasterDatabaseView';
import { AdminPanel } from './components/admin/AdminPanel';
import { WalletConnectRainbow } from './components/WalletConnectRainbow';
import { RainbowKitWrapper } from './lib/providers/RainbowKitProvider';
import { Web3ProviderCompat } from './lib/services/Web3ProviderCompat';
import { DomainProvider } from './lib/contexts/DomainContext';
import { Toaster } from './components/ui/sonner';
import { JazzCupBackground } from './components/JazzCupBackground';
import { TransactionStatusPanel } from './components/TransactionStatusPanel';
import { DevTools } from './components/devtools';
import { ENSConsole } from './components/devtools/ENSConsole';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Network, Terminal, Layout } from 'lucide-react';

export type ViewType = 'dashboard' | 'domains' | 'name-browser' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'analytics' | 'preflight-checker' | 'marketplace' | 'dnssec' | 'fee-management' | 'master-database' | 'admin-panel' | 'guided-workflow';

type ViewMode = 'normal' | 'console';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('console');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'domains':
        return <DomainManagement />;
      case 'name-browser':
        return <NameBrowser />;
      case 'metadata':
        return <MetadataEditor />;
      case 'security':
        return <SecurityMonitor />;
      case 'governance':
        return <GovernancePanel />;
      case 'audit':
        return <AuditLog />;
      case 'naming':
        return <NamingToolkit />;
      case 'protocol':
        return <ProtocolReference />;
      case 'best-practices':
        return <BestPracticesView />;
      case 'settings':
        return <Settings />;
      case 'dao-registry':
        return <DAORegistry />;
      case 'integrations':
        return <IntegrationRegistry />;
      case 'metadata-tools':
        return <MetadataTools />;
      case 'contracts':
        return <ContractRegistry />;
      case 'contract-registration':
        return <ContractRegistration />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'preflight-checker':
        return <PreflightChecker />;
      case 'marketplace':
        return <KamikoMarketplace />;
      case 'dnssec':
        return <DNSSECConfig />;
      case 'fee-management':
        return <FeeManagement />;
      case 'master-database':
        return <MasterDatabaseView />;
      case 'admin-panel':
        return <AdminPanel />;
      case 'guided-workflow':
        return <DomainManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <RainbowKitWrapper>
        <Web3ProviderCompat>
          <DomainProvider>
            <div className="flex min-h-screen w-full relative">
              <JazzCupBackground />
              <div className="flex-1 relative z-10 flex flex-col">
                <div className="fixed top-0 left-0 right-0 z-[100] bg-white/98 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3 flex items-center justify-between gap-4 shadow-sm shadow-slate-900/5" style={{ marginLeft: '72px' }}>
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/10 transition-transform hover:scale-105">
                      <Network className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-slate-900 font-semibold text-base leading-tight tracking-tight">ens.tools</h1>
                      <p className="text-slate-500 text-xs leading-tight font-medium">ENS management and marketplace</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-slate-300 bg-white shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setViewMode('normal')}
                        className={`h-8 px-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                          viewMode === 'normal'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                        aria-pressed={viewMode === 'normal'}
                      >
                        <Layout className="h-4 w-4" />
                        <span>App View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('console')}
                        className={`h-8 px-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                          viewMode === 'console'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                        aria-pressed={viewMode === 'console'}
                      >
                        <Terminal className="h-4 w-4" />
                        <span>Console View</span>
                      </button>
                    </div>
                    <WalletConnectRainbow />
                  </div>
                </div>
                {viewMode === 'normal' && (
                  <main 
                    className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth" 
                    style={{ 
                      marginTop: '64px', 
                      marginLeft: '72px', 
                      marginRight: '600px', 
                      height: 'calc(100vh - 64px)', 
                      paddingBottom: '120px',
                      WebkitOverflowScrolling: 'touch',
                      scrollBehavior: 'smooth'
                    }}
                  >
                    <div className="p-6 max-w-7xl mx-auto w-full" style={{ minHeight: '100%' }}>
                      <ErrorBoundary>
                        {renderView()}
                      </ErrorBoundary>
                    </div>
                  </main>
                )}
              </div>
              {viewMode === 'normal' && <BottomToolbar currentView={currentView} onViewChange={setCurrentView} />}
              {viewMode === 'normal' && <TransactionStatusPanel />}
              <ENSConsole isFullScreen={viewMode === 'console'} />
              <Toaster />
            </div>
          </DomainProvider>
        </Web3ProviderCompat>
      </RainbowKitWrapper>
    </ErrorBoundary>
  );
}
