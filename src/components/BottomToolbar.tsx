import { ViewType } from '../App';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import {
  LayoutDashboard,
  Globe,
  FileEdit,
  Shield,
  Vote,
  ScrollText,
  Settings as SettingsIcon,
  BookOpen,
  Lightbulb,
  Sparkles,
  Building2,
  Plug,
  Database,
  FileCode,
  BarChart3,
  PlusCircle,
  FileCheck,
  ShoppingCart,
  Search,
  Lock,
  Coins,
  Server,
} from "lucide-react";
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
      icon: LayoutDashboard,
    },
    {
      id: "analytics" as ViewType,
      label: "Analytics",
      icon: BarChart3,
    },
  ];

  const domainItems = [
    {
      id: "domains" as ViewType,
      label: "Domain Management",
      icon: Globe,
    },
    {
      id: "name-browser" as ViewType,
      label: "Name Browser",
      icon: Search,
    },
    {
      id: "metadata" as ViewType,
      label: "Metadata Editor",
      icon: FileEdit,
    },
  ];

  const securityItems = [
    {
      id: "security" as ViewType,
      label: "Security Monitor",
      icon: Shield,
    },
    {
      id: "audit" as ViewType,
      label: "Audit Log",
      icon: ScrollText,
    },
    {
      id: "governance" as ViewType,
      label: "Governance",
      icon: Vote,
    },
    {
      id: "dnssec" as ViewType,
      label: "DNSSEC Config",
      icon: Lock,
    },
  ];

  const registryItems = [
    {
      id: "contracts" as ViewType,
      label: "Contract Registry",
      icon: FileCode,
    },
    {
      id: "dao-registry" as ViewType,
      label: "DAO Registry",
      icon: Building2,
    },
    {
      id: "integrations" as ViewType,
      label: "Integrations",
      icon: Plug,
    },
  ];

  const workflowItems = [
    {
      id: "marketplace" as ViewType,
      label: "Marketplace",
      icon: ShoppingCart,
    },
    {
      id: "contract-registration" as ViewType,
      label: "Register Contract",
      icon: PlusCircle,
    },
    {
      id: "preflight-checker" as ViewType,
      label: "Preflight Checker",
      icon: FileCheck,
    },
  ];

  const toolsItems = [
    {
      id: "naming" as ViewType,
      label: "Naming Toolkit",
      icon: Sparkles,
    },
    {
      id: "metadata-tools" as ViewType,
      label: "Metadata Tools",
      icon: Database,
    },
  ];

  const referenceItems = [
    {
      id: "protocol" as ViewType,
      label: "Protocol Reference",
      icon: BookOpen,
    },
    {
      id: "best-practices" as ViewType,
      label: "Best Practices",
      icon: Lightbulb,
    },
  ];

  const adminItems = [
    {
      id: "fee-management" as ViewType,
      label: "Fee Management",
      icon: Coins,
    },
    {
      id: "master-database" as ViewType,
      label: "Master Database",
      icon: Server,
    },
  ];

  const systemItems = [
    {
      id: "settings" as ViewType,
      label: "Settings",
      icon: SettingsIcon,
    },
  ];

  // Define sections with their items for proper separator logic
  const sections = [
    { id: 'overview', items: overviewItems },
    { id: 'domain', items: domainItems },
    { id: 'security', items: securityItems },
    { id: 'registry', items: registryItems },
    { id: 'workflow', items: workflowItems },
    { id: 'tools', items: toolsItems },
    { id: 'reference', items: referenceItems },
    { id: 'admin', items: adminItems },
    { id: 'system', items: systemItems },
  ];

  // Build flat list with section info for separator logic
  const allItemsWithSection = sections.flatMap(section => 
    section.items
      .filter(item => isViewEnabled(item.id))
      .map((item, idx) => ({ ...item, section: section.id, isFirstInSection: idx === 0 }))
  );

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-50 w-14 bg-[#0a0a0b] border-r border-zinc-800 flex flex-col items-center py-4">
      <div className="flex-1 flex flex-col items-center gap-1 overflow-y-auto scrollbar-hide pt-12">
        {allItemsWithSection.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const prevItem = allItemsWithSection[index - 1];
          const showSeparator = index > 0 && item.isFirstInSection && prevItem?.section !== item.section;
          
          return (
            <div key={item.id} className="flex flex-col items-center">
              {showSeparator && (
                <div className="w-6 h-px bg-zinc-800 my-2" />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="bg-zinc-900 text-white border-zinc-800 text-xs"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
