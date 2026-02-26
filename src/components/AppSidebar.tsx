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
  BookOpen,
  Lightbulb,
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

const sections = [
  {
    label: "Overview",
    items: [
      { id: "dashboard" as ViewType, label: "Dashboard", icon: LayoutDashboard },
      { id: "analytics" as ViewType, label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Domains",
    items: [
      { id: "domains" as ViewType, label: "Domain Management", icon: Globe },
      { id: "name-browser" as ViewType, label: "Name Browser", icon: Search },
      { id: "metadata" as ViewType, label: "Metadata Editor", icon: FileEdit },
    ],
  },
  {
    label: "Security",
    items: [
      { id: "security" as ViewType, label: "Security Monitor", icon: Shield },
      { id: "audit" as ViewType, label: "Audit Log", icon: ScrollText },
      { id: "governance" as ViewType, label: "Governance", icon: Vote },
    ],
  },
  {
    label: "Registries",
    items: [
      { id: "contracts" as ViewType, label: "Contracts", icon: FileCode },
      { id: "dao-registry" as ViewType, label: "DAO Registry", icon: Building2 },
      { id: "integrations" as ViewType, label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Workflows",
    items: [
      { id: "guided-workflow" as ViewType, label: "Manage Domains", icon: FileEdit },
      { id: "contract-registration" as ViewType, label: "Register Contract", icon: PlusCircle },
      { id: "marketplace" as ViewType, label: "Marketplace", icon: ShoppingCart },
      { id: "preflight-checker" as ViewType, label: "Preflight Checker", icon: FileCheck },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "metadata-tools" as ViewType, label: "Metadata Tools", icon: Database },
    ],
  },
  {
    label: "Reference",
    items: [
      { id: "protocol" as ViewType, label: "Protocol Reference", icon: BookOpen },
      { id: "best-practices" as ViewType, label: "Best Practices", icon: Lightbulb },
      { id: "documentation" as ViewType, label: "Documentation", icon: BookOpen },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "fee-management" as ViewType, label: "Fee Management", icon: Coins },
      { id: "master-database" as ViewType, label: "Master Database", icon: Server },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings" as ViewType, label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  return (
    <Sidebar className="w-64 bg-white border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-gray-900 leading-none">ENS Tools</h1>
            <p className="text-xs text-gray-500 mt-0.5">Domain Management</p>
          </div>
        </div>
        <WalletConnectRainbow />
      </SidebarHeader>

      <SidebarContent className="px-3 py-3 overflow-y-auto">
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="mb-1">
            <SidebarGroupLabel className="text-[11px] text-gray-400 uppercase tracking-wider font-medium px-2 mb-1">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.id)}
                      isActive={currentView === item.id}
                      className={`w-full justify-start gap-3 h-8 text-[13px] rounded-md px-2 transition-colors ${
                        currentView === item.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
