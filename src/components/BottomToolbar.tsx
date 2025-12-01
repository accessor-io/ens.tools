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
        <div className="relative bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-xl shadow-2xl shadow-black/50 px-2 h-full flex flex-col">
          {/* Top accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-lime-500 to-cyan-500 rounded-full" />
          
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
                    <div className="w-5 h-px bg-zinc-800 my-2" />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => onViewChange(item.id)}
                        variant="ghost"
                        className={cn(
                          "relative h-9 w-9 rounded-lg transition-all duration-150 flex-shrink-0 p-0",
                          isActive
                            ? "bg-lime-500 text-zinc-900 shadow-md shadow-lime-500/30"
                            : "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300",
                          "flex items-center justify-center"
                        )}
                      >
                        <Icon 
                          className="transition-colors duration-150"
                          style={{ width: '16px', height: '16px' }} 
                        />
                        {isActive && (
                          <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-lime-400" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="bg-zinc-900 text-zinc-100 border border-zinc-800 text-xs px-3 py-1.5 rounded shadow-xl"
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
