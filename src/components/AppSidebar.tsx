import { ViewType } from '../App';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from './ui/sidebar';
import { WalletConnectRainbow } from './WalletConnectRainbow';
import {
  LayoutDashboard,
  Globe,
  FileEdit,
  Shield,
  Vote,
  ScrollText,
  Settings as SettingsIcon,
  Network,
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
  Coins,
  Server,
} from "lucide-react";

interface AppSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function AppSidebar({
  currentView,
  onViewChange,
}: AppSidebarProps) {
  const overviewItems = [
    {
      id: "dashboard" as ViewType,
      label: "dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "analytics" as ViewType,
      label: "analytics",
      icon: BarChart3,
    },
  ];

  const domainItems = [
    {
      id: "domains" as ViewType,
      label: "domain management",
      icon: Globe,
    },
    {
      id: "name-browser" as ViewType,
      label: "name browser",
      icon: Search,
    },
    {
      id: "metadata" as ViewType,
      label: "metadata editor",
      icon: FileEdit,
    },
  ];

  const securityItems = [
    {
      id: "security" as ViewType,
      label: "security monitor",
      icon: Shield,
    },
    {
      id: "audit" as ViewType,
      label: "audit log",
      icon: ScrollText,
    },
    {
      id: "governance" as ViewType,
      label: "governance",
      icon: Vote,
    },
  ];

  const registryItems = [
    {
      id: "contracts" as ViewType,
      label: "contract registry",
      icon: FileCode,
    },
    {
      id: "dao-registry" as ViewType,
      label: "dao registry",
      icon: Building2,
    },
    {
      id: "integrations" as ViewType,
      label: "integrations",
      icon: Plug,
    },
  ];

  const workflowItems = [
    {
      id: "guided-workflow" as ViewType,
      label: "Manage Domains",
      icon: FileEdit,
    },
    {
      id: "contract-registration" as ViewType,
      label: "Register Contract",
      icon: PlusCircle,
    },
    {
      id: "marketplace" as ViewType,
      label: "Marketplace",
      icon: ShoppingCart,
    },
    {
      id: "preflight-checker" as ViewType,
      label: "Preflight Checker",
      icon: FileCheck,
    },
  ];

  const toolsItems = [
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
    {
      id: "documentation" as ViewType,
      label: "Documentation",
      icon: BookOpen,
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

  return (
    <Sidebar className="w-80 bg-white border-r border-slate-200/50 shadow-2xl glass-card">
      <SidebarHeader className="border-b border-slate-200/50 px-8 py-8 bg-gradient-to-br from-slate-50/30 via-white to-sky-50/20">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-800 via-slate-700 to-sky-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-500/30 glow-effect">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-black text-2xl text-slate-900 tracking-tight bg-gradient-to-r from-slate-900 to-sky-800 bg-clip-text text-transparent">
              ENS Tools
            </h1>
            <p className="text-sm text-slate-500 font-medium">Professional ENS management</p>
          </div>
        </div>
        <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-6 shadow-xl glass-card animate-fade-in">
          <div className="text-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 via-slate-700 to-sky-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl shadow-sky-500/30 glow-effect">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm text-slate-600 uppercase font-bold tracking-wider">Wallet Connection</div>
          </div>
          <WalletConnectRainbow />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-6 py-6 gap-4 bg-gradient-to-br from-slate-50/30 via-white to-sky-50/20">
        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="capitalize">{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Domains
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {domainItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="capitalize">{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Security & Governance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {securityItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="capitalize">{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Registries
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {registryItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="capitalize">{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Workflows
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {workflowItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Reference
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {referenceItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`w-full justify-start gap-4 h-12 text-sm transition-all duration-300 rounded-xl font-semibold ${
                      currentView === item.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {currentView === item.id && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}