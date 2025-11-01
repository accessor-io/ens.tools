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
import { ContractRegistration, PreflightChecker, GuidedWorkflow } from './components/workflows';
import { ENSMarketplace } from './components/marketplace';
import { WalletConnect } from './components/WalletConnect';
import { Web3Provider } from './lib/services';
import { Toaster } from './components/ui/sonner';

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
        return <GuidedWorkflow />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Web3Provider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-to-br from-violet-50 via-purple-50/50 to-stone-100">
          <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1 relative">
            {/* Pink Bezier Curve Background Elements - Behind panels */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0">
              <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1200 1600" preserveAspectRatio="none">
                {/* Abstract flowing curves - thick and varied */}
                <path
                  d="M -50,0 C 200,300 400,200 800,400 C 1000,500 1100,300 1250,100"
                  stroke="url(#pinkGradient1)"
                  strokeWidth="10"
                  fill="none"
                  className="opacity-60"
                />
                <path
                  d="M 1200,0 C 1000,400 700,600 400,500 C 200,450 0,600 -50,800"
                  stroke="url(#pinkGradient2)"
                  strokeWidth="12"
                  fill="none"
                  className="opacity-55"
                />
                <path
                  d="M 0,300 Q 300,100 600,200 T 1200,250"
                  stroke="url(#pinkGradient3)"
                  strokeWidth="8"
                  fill="none"
                  className="opacity-50"
                />
                <path
                  d="M 1200,500 Q 900,700 600,650 Q 300,600 0,700"
                  stroke="url(#pinkGradient4)"
                  strokeWidth="9"
                  fill="none"
                  className="opacity-55"
                />
                <path
                  d="M 100,800 C 300,500 500,600 700,750 C 900,900 1000,700 1100,850"
                  stroke="url(#pinkGradient5)"
                  strokeWidth="11"
                  fill="none"
                  className="opacity-50"
                />
                <path
                  d="M 1100,1000 C 900,1200 700,1100 500,1250 C 300,1400 100,1300 -50,1500"
                  stroke="url(#pinkGradient1)"
                  strokeWidth="10"
                  fill="none"
                  className="opacity-60"
                />
                <path
                  d="M 0,1200 C 200,1000 400,1100 600,1050 C 800,1000 1000,1100 1200,1200"
                  stroke="url(#pinkGradient2)"
                  strokeWidth="9"
                  fill="none"
                  className="opacity-55"
                />
                <path
                  d="M 200,200 C 400,400 800,300 1000,500"
                  stroke="url(#pinkGradient6)"
                  strokeWidth="7"
                  fill="none"
                  className="opacity-45"
                />
                <path
                  d="M 1000,800 C 1200,600 1150,400 1000,250"
                  stroke="url(#pinkGradient3)"
                  strokeWidth="8"
                  fill="none"
                  className="opacity-50"
                />
                <path
                  d="M 50,600 Q 400,400 750,550 Q 1000,700 1150,600"
                  stroke="url(#pinkGradient4)"
                  strokeWidth="9"
                  fill="none"
                  className="opacity-55"
                />
                <path
                  d="M 300,1400 C 500,1200 700,1300 900,1250 C 1100,1200 1200,1400 1250,1600"
                  stroke="url(#pinkGradient5)"
                  strokeWidth="11"
                  fill="none"
                  className="opacity-50"
                />
                <path
                  d="M 150,950 C 350,1150 550,1100 750,1200 C 950,1300 1100,1150 1200,1350"
                  stroke="url(#pinkGradient6)"
                  strokeWidth="10"
                  fill="none"
                  className="opacity-50"
                />
                <path
                  d="M 800,100 C 900,250 850,400 700,500 C 550,600 400,550 250,600"
                  stroke="url(#pinkGradient1)"
                  strokeWidth="8"
                  fill="none"
                  className="opacity-45"
                />
                <path
                  d="M 0,450 C 150,300 350,350 500,400 C 650,450 800,400 950,450"
                  stroke="url(#pinkGradient2)"
                  strokeWidth="9"
                  fill="none"
                  className="opacity-55"
                />
                <path
                  d="M 1100,1400 Q 900,1500 700,1450 Q 500,1400 300,1500 Q 100,1600 -50,1550"
                  stroke="url(#pinkGradient3)"
                  strokeWidth="10"
                  fill="none"
                  className="opacity-50"
                />
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="pinkGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="50%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="pinkGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                  <linearGradient id="pinkGradient3" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#f9a8d4" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f9a8d4" />
                  </linearGradient>
                  <linearGradient id="pinkGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fce7f3" />
                    <stop offset="50%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#fce7f3" />
                  </linearGradient>
                  <linearGradient id="pinkGradient5" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="50%" stopColor="#f9a8d4" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="pinkGradient6" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="50%" stopColor="#fce7f3" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#c4b5fd12_1px,transparent_1px),linear-gradient(to_bottom,#c4b5fd12_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 z-[1]" />
            
            {/* Soft accent gradients */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-200/20 via-purple-200/15 to-amber-100/20 rounded-full blur-3xl -z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-purple-200/20 via-violet-200/15 to-stone-200/20 rounded-full blur-3xl -z-0" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-100/15 via-purple-100/10 to-stone-100/15 rounded-full blur-3xl -z-0" />
            
            <div className="relative z-10 sticky top-0 bg-white/80 backdrop-blur-xl border-b-2 border-violet-300/60 shadow-md px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">ens.tools</h1>
                  <p className="text-slate-600 text-sm">ENS management and marketplace</p>
                </div>
              </div>
              <WalletConnect />
            </div>
            <div className="relative z-10 p-6">
              {renderView()}
            </div>
          </main>
        </div>
        <Toaster />
      </SidebarProvider>
    </Web3Provider>
  );
}
