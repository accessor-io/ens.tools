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
    <Sidebar className="bg-white border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 px-3 py-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
            <Globe className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-[13px] text-gray-900 leading-none truncate">ENS Tools</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Management</p>
          </div>
        </div>
        <WalletConnectRainbow />
      </SidebarHeader>

      <SidebarContent className="px-1 py-2 overflow-y-auto">
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[11px] text-gray-400 uppercase tracking-wider font-medium px-2">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.id)}
                      isActive={currentView === item.id}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
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
