import { ViewType } from '../App';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
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
  ChevronDown,
} from 'lucide-react';
import { cn } from './ui/utils';
import { WalletConnectRainbow } from './WalletConnectRainbow';

interface TopNavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

interface NavigationItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function TopNavigation({ currentView, onViewChange }: TopNavigationProps) {
  const navigationGroups: NavigationGroup[] = [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        { id: 'dashboard' as ViewType, label: 'dashboard', icon: LayoutDashboard },
        { id: 'analytics' as ViewType, label: 'analytics', icon: BarChart3 },
      ],
    },
    {
      id: 'domains',
      label: 'Domains',
      items: [
        { id: 'domains' as ViewType, label: 'domain management', icon: Globe },
        { id: 'name-browser' as ViewType, label: 'name browser', icon: Search },
        { id: 'metadata' as ViewType, label: 'metadata editor', icon: FileEdit },
      ],
    },
    {
      id: 'security',
      label: 'Security & Governance',
      items: [
        { id: 'security' as ViewType, label: 'security monitor', icon: Shield },
        { id: 'audit' as ViewType, label: 'audit log', icon: ScrollText },
        { id: 'governance' as ViewType, label: 'governance', icon: Vote },
      ],
    },
    {
      id: 'registries',
      label: 'Registries',
      items: [
        { id: 'contracts' as ViewType, label: 'contract registry', icon: FileCode },
        { id: 'dao-registry' as ViewType, label: 'dao registry', icon: Building2 },
        { id: 'integrations' as ViewType, label: 'integrations', icon: Plug },
      ],
    },
    {
      id: 'workflows',
      label: 'Workflows',
      items: [
        { id: 'guided-workflow' as ViewType, label: 'Manage Domains', icon: FileEdit },
        { id: 'contract-registration' as ViewType, label: 'Register Contract', icon: PlusCircle },
        { id: 'marketplace' as ViewType, label: 'Marketplace', icon: ShoppingCart },
        { id: 'preflight-checker' as ViewType, label: 'Preflight Checker', icon: FileCheck },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { id: 'metadata-tools' as ViewType, label: 'Metadata Tools', icon: Database },
      ],
    },
    {
      id: 'reference',
      label: 'Reference',
      items: [
        { id: 'protocol' as ViewType, label: 'Protocol Reference', icon: BookOpen },
        { id: 'best-practices' as ViewType, label: 'Best Practices', icon: Lightbulb },
        { id: 'documentation' as ViewType, label: 'Documentation', icon: BookOpen },
      ],
    },
    {
      id: 'admin',
      label: 'Admin',
      items: [
        { id: 'fee-management' as ViewType, label: 'Fee Management', icon: Coins },
        { id: 'master-database' as ViewType, label: 'Master Database', icon: Server },
      ],
    },
    {
      id: 'system',
      label: 'System',
      items: [
        { id: 'settings' as ViewType, label: 'Settings', icon: SettingsIcon },
      ],
    },
  ];

  return (
    <nav className="space-y-6">
      {/* Premium Wallet Connection */}
      <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-6 shadow-xl glass-card animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 via-slate-700 to-sky-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl shadow-sky-500/30 glow-effect">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm text-slate-600 uppercase font-bold tracking-wider">Wallet Connection</div>
        </div>
        <WalletConnectRainbow />
      </div>

      {/* Clean Navigation */}
      <div className="space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.id} className="space-y-3">
            <h3 className="text-xs text-slate-500 uppercase tracking-wider px-2 font-semibold">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <Button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "w-full justify-start gap-3 h-11 text-sm transition-all duration-200 rounded-lg font-medium",
                      isActive
                        ? "bg-sky-50 border-sky-200 text-sky-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full shadow-sm"></div>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
