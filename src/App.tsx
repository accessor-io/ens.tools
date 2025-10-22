import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
import { Dashboard } from './components/Dashboard';
import { DomainManagement } from './components/DomainManagement';
import { MetadataEditor } from './components/MetadataEditor';
import { SecurityMonitor } from './components/SecurityMonitor';
import { GovernancePanel } from './components/GovernancePanel';
import { AuditLog } from './components/AuditLog';
import { Settings } from './components/Settings';
import { ProtocolReference } from './components/ProtocolReference';
import { BestPracticesView } from './components/BestPracticesView';
import { NamingToolkit } from './components/NamingToolkit';
import { DAORegistry } from './components/DAORegistry';
import { IntegrationRegistry } from './components/IntegrationRegistry';
import { MetadataTools } from './components/MetadataTools';
import { ContractRegistry } from './components/ContractRegistry';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ContractRegistration } from './components/ContractRegistration';
import { ENSIP19Registration } from './components/ENSIP19Registration';
import { UnifiedContractRegistration } from './components/UnifiedContractRegistration';
import { WalletConnect } from './components/WalletConnect';
import { Web3Provider } from './lib/web3-provider';
import { Toaster } from './components/ui/sonner';

export type ViewType = 'dashboard' | 'domains' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'ensip19-registration' | 'unified-registration' | 'analytics';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'domains':
        return <DomainManagement />;
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
      case 'ensip19-registration':
        return <ENSIP19Registration />;
      case 'unified-registration':
        return <UnifiedContractRegistration />;
      case 'analytics':
        return <AnalyticsDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Web3Provider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1 bg-slate-50">
            <div className="sticky top-0 z-40 bg-white border-b px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-slate-900">ENS Enterprise Management System</h1>
                  <p className="text-slate-600">Centralized control for your ENS infrastructure</p>
                </div>
              </div>
              <WalletConnect />
            </div>
            <div className="p-6">
              {renderView()}
            </div>
          </main>
        </div>
        <Toaster />
      </SidebarProvider>
    </Web3Provider>
  );
}
