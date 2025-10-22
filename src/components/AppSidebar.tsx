import { ViewType } from "../App";
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
} from "./ui/sidebar";
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
} from "lucide-react";

interface AppSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function AppSidebar({
  currentView,
  onViewChange,
}: AppSidebarProps) {
  const workflowItems = [
    {
      id: "preflight" as ViewType,
      label: "Preflight Checker",
      icon: FileCode,
    },
  ];

  const managementItems = [
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
    {
      id: "domains" as ViewType,
      label: "Domain Management",
      icon: Globe,
    },
    {
      id: "metadata" as ViewType,
      label: "Metadata Editor",
      icon: FileEdit,
    },
    {
      id: "security" as ViewType,
      label: "Security Monitor",
      icon: Shield,
    },
    {
      id: "governance" as ViewType,
      label: "Governance",
      icon: Vote,
    },
    {
      id: "audit" as ViewType,
      label: "Audit Log",
      icon: ScrollText,
    },
  ];

  const registryItems = [
    {
      id: "contract-registration" as ViewType,
      label: "Register Contract",
      icon: PlusCircle,
    },
    {
      id: "dao-registry" as ViewType,
      label: "DAO Registry",
      icon: Building2,
    },
    {
      id: "contracts" as ViewType,
      label: "Contract Registry",
      icon: FileCode,
    },
    {
      id: "integrations" as ViewType,
      label: "Integrations",
      icon: Plug,
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

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Network className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-slate-900">ens.tools</p>
            <p className="text-slate-600">Management Hub</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflows</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflowItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Registry</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {registryItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Documentation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {referenceItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
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