import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
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
import { WalletConnect } from './components/WalletConnect';
import { Web3Provider } from './lib/services';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

export type ViewType = 'dashboard' | 'domains' | 'name-browser' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'analytics' | 'preflight-checker' | 'marketplace' | 'guided-workflow';

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
      case 'guided-workflow':
        return <DomainManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Web3Provider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
            <main className="flex-1 bg-slate-50">
              <div className="sticky top-0 z-40 bg-white border-b px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-slate-900">ens.tools</h1>
                    <p className="text-slate-600">ENS management and marketplace</p>
                  </div>
                </div>
                <WalletConnect />
              </div>
              <div className="p-6">
                <ErrorBoundary>
                  {renderView()}
                </ErrorBoundary>
              </div>
            </main>
          </div>
          <Toaster />
        </SidebarProvider>
      </Web3Provider>
    </ErrorBoundary>
  );
}
