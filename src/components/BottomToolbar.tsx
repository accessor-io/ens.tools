import { ViewType } from "../App";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
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
} from "lucide-react";
import { cn } from "./ui/utils";

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

  const systemItems = [
    {
      id: "settings" as ViewType,
      label: "Settings",
      icon: SettingsIcon,
    },
  ];

  const allItems = [
    ...overviewItems,
    ...domainItems,
    ...securityItems,
    ...registryItems,
    ...workflowItems,
    ...toolsItems,
    ...referenceItems,
    ...systemItems,
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 z-50 flex items-center justify-center pl-2 group">
      <div className="h-full mx-auto py-3">
        <div className="relative bg-white/98 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-lg shadow-slate-900/5 px-2.5 h-full flex flex-col">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/8 via-purple-500/8 to-fuchsia-500/8 rounded-xl pointer-events-none" />
          
          <div className="relative flex flex-col items-center justify-between overflow-y-auto scrollbar-hide flex-1 py-4 gap-1">
            {allItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => onViewChange(item.id)}
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "relative !h-11 !w-11 rounded-xl transition-all duration-200 flex-shrink-0 !p-0",
                        isActive
                          ? "bg-gradient-to-br from-pink-600 via-rose-600 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25 ring-2 ring-pink-500/10"
                          : "hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:shadow-sm group-hover:text-purple-600",
                        "flex items-center justify-center"
                      )}
                    >
                      <Icon className={cn(
                        "transition-colors duration-200",
                        isActive 
                          ? "text-white" 
                          : "text-slate-600 group-hover:text-purple-600 hover:text-purple-600"
                      )} style={{ width: '20px', height: '20px' }} />
                      {isActive && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-sm" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700 text-xs px-2.5 py-1.5 rounded-lg shadow-lg">
                    <p className="font-medium">{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}