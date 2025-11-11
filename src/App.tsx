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
import { ENSMarketplace } from './components/marketplace';
import { DNSSECConfig } from './components/dnssec';
import { FeeManagement } from './components/admin/FeeManagement';
import { MasterDatabaseView } from './components/admin/MasterDatabaseView';
import { AdminPanel } from './components/admin/AdminPanel';
import { WalletConnect } from './components/WalletConnect';
import { Web3Provider } from './lib/services';
import { DomainProvider } from './lib/contexts/DomainContext';
import { Toaster } from './components/ui/sonner';
import { JazzCupBackground } from './components/JazzCupBackground';
import { TransactionStatusPanel } from './components/TransactionStatusPanel';
import { Network } from 'lucide-react';

export type ViewType = 'dashboard' | 'domains' | 'name-browser' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'analytics' | 'preflight-checker' | 'marketplace' | 'dnssec' | 'fee-management' | 'master-database' | 'admin-panel';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

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
        return <ENSMarketplace />;
      case 'dnssec':
        return <DNSSECConfig />;
      case 'fee-management':
        return <FeeManagement />;
      case 'master-database':
        return <MasterDatabaseView />;
      case 'admin-panel':
        return <AdminPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Web3Provider>
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
            <WalletConnect />
          </div>
          <main className="flex-1 overflow-y-auto relative" style={{ marginTop: '64px', marginLeft: '72px', height: 'calc(100vh - 64px)', paddingBottom: '120px' }}>
            <div className="p-6 max-w-7xl mx-auto w-full" style={{ minHeight: '100%' }}>
              {renderView()}
            </div>
          </main>
        </div>
        <BottomToolbar currentView={currentView} onViewChange={setCurrentView} />
        <TransactionStatusPanel />
        <Toaster />
      </div>
      </DomainProvider>
    </Web3Provider>
  );
}
