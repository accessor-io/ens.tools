import { ViewType } from '../App';
import { Button } from './ui/button';
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
    <div className="fixed left-0 top-0 bottom-0 z-50 flex items-center justify-center pl-3">
      <div className="h-full mx-auto py-4">
        <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-slate-900/30 px-2 h-full flex flex-col">
          {/* Subtle top accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 rounded-full opacity-60" />
          
          <div className="relative flex flex-col items-center justify-between overflow-y-auto scrollbar-hide flex-1 py-5 gap-0.5">
            {allItemsWithSection.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              // Show separator before first item of a new section (but not the very first item)
              const prevItem = allItemsWithSection[index - 1];
              const showSeparator = index > 0 && item.isFirstInSection && prevItem?.section !== item.section;
              
              return (
                <div key={item.id} className="flex flex-col items-center">
                  {showSeparator && (
                    <div className="w-6 h-px bg-slate-700/60 my-2" />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => onViewChange(item.id)}
                        variant="ghost"
                        className={cn(
                          "relative h-10 w-10 rounded-xl transition-all duration-200 flex-shrink-0 p-0",
                          isActive
                            ? "bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/25"
                            : "hover:bg-slate-800/80 text-slate-400 hover:text-slate-200",
                          "flex items-center justify-center"
                        )}
                      >
                        <Icon 
                          className={cn(
                            "transition-colors duration-200",
                            isActive ? "text-white" : ""
                          )} 
                          style={{ width: '18px', height: '18px' }} 
                        />
                        {isActive && (
                          <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-cyan-400" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="bg-slate-900 text-slate-100 border border-slate-700 text-xs px-3 py-1.5 rounded-lg shadow-xl"
                    >
                      <p className="font-medium">{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
