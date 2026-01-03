import { ViewType } from '../App';
import { cn } from './ui/utils';
import { isViewEnabled } from '../config/feature-flags.config';

interface BottomToolbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function BottomToolbar({
  currentView,
  onViewChange,
}: BottomToolbarProps) {
  const overviewItems = [
    {
      id: "dashboard" as ViewType,
      label: "Dashboard",
    },
    {
      id: "analytics" as ViewType,
      label: "Analytics",
    },
  ];

  const domainItems = [
    {
      id: "domains" as ViewType,
      label: "Domain Management",
    },
    {
      id: "name-browser" as ViewType,
      label: "Name Browser",
    },
    {
      id: "metadata" as ViewType,
      label: "Metadata Editor",
    },
  ];

  const securityItems = [
    {
      id: "security" as ViewType,
      label: "Security Monitor",
    },
    {
      id: "audit" as ViewType,
      label: "Audit Log",
    },
    {
      id: "governance" as ViewType,
      label: "Governance",
    },
    {
      id: "dnssec" as ViewType,
      label: "DNSSEC Config",
    },
  ];

  const registryItems = [
    {
      id: "contracts" as ViewType,
      label: "Contract Registry",
    },
    {
      id: "dao-registry" as ViewType,
      label: "DAO Registry",
    },
    {
      id: "integrations" as ViewType,
      label: "Integrations",
    },
  ];

  const workflowItems = [
    {
      id: "marketplace" as ViewType,
      label: "Marketplace",
    },
    {
      id: "contract-registration" as ViewType,
      label: "Register Contract",
    },
    {
      id: "preflight-checker" as ViewType,
      label: "Preflight Checker",
    },
  ];

  const toolsItems = [
    {
      id: "metadata-tools" as ViewType,
      label: "Metadata Tools",
    },
  ];

  const referenceItems = [
    {
      id: "protocol" as ViewType,
      label: "Protocol Reference",
    },
    {
      id: "best-practices" as ViewType,
      label: "Best Practices",
    },
  ];

  const adminItems = [
    {
      id: "fee-management" as ViewType,
      label: "Fee Management",
    },
    {
      id: "master-database" as ViewType,
      label: "Master Database",
    },
  ];

  const systemItems = [
    {
      id: "settings" as ViewType,
      label: "Settings",
    },
  ];

  // Define sections with their items for proper separator logic
  const sections = [
    { id: 'overview', label: 'Overview', items: overviewItems },
    { id: 'domain', label: 'Domains', items: domainItems },
    { id: 'security', label: 'Security & Governance', items: securityItems },
    { id: 'registry', label: 'Registries', items: registryItems },
    { id: 'workflow', label: 'Workflows', items: workflowItems },
    { id: 'tools', label: 'Tools', items: toolsItems },
    { id: 'reference', label: 'Reference', items: referenceItems },
    { id: 'admin', label: 'Admin', items: adminItems },
    { id: 'system', label: 'System', items: systemItems },
  ];

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-50 w-64 glass border-r border-white/10 flex flex-col backdrop-blur-xl">
      <div className="flex-1 overflow-y-auto py-6">
        {sections.map((section) => {
          const enabledItems = section.items.filter(item => isViewEnabled(item.id));
          if (enabledItems.length === 0) return null;
          
          return (
            <div key={section.id} className="mb-8">
              <h3 className="px-4 mb-3 text-xs font-semibold text-secondary uppercase tracking-wider">
                {section.label}
              </h3>
              <div className="space-y-1 px-2">
                {enabledItems.map((item) => {
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm font-medium transition-all duration-200 rounded-lg relative overflow-hidden",
                        "hover:bg-white/5 hover:translate-x-1",
                        isActive
                          ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-l-2 border-purple-500 shadow-glow-purple"
                          : "text-secondary hover:text-white"
                      )}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 animate-pulse" />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
