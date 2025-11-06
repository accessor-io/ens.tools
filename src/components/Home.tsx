import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Globe, 
  Shield, 
  FileCode, 
  ShoppingCart,
  BarChart3,
  Sparkles,
  Database,
  Building2,
  Search,
  FileEdit,
  Vote,
  ScrollText,
  PlusCircle,
  FileCheck,
  BookOpen,
  Zap,
  Network,
  CheckCircle2,
  ArrowRight,
  Plug,
} from 'lucide-react';
import type { ViewType } from '../App';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
  view?: ViewType;
}

function FeatureCard({ icon: Icon, title, description, badge, onClick, view }: FeatureCardProps) {
  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <Card 
      className="border border-slate-200/80 hover:shadow-lg transition-all cursor-pointer group"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Icon className="h-6 w-6 text-white" />
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full group-hover:text-purple-600"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          Explore
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

interface HomeProps {
  onNavigate?: (view: ViewType) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const featureCategories = [
    {
      title: 'Domain Management',
      description: 'Complete control over your ENS names',
      features: [
        {
          icon: Globe,
          title: 'Domain Management',
          description: 'Manage all your ENS domains in one place. View, update, and configure resolver settings.',
          view: 'domains' as ViewType,
        },
        {
          icon: Search,
          title: 'Name Browser',
          description: 'Browse and search ENS names across the network. Discover available domains and their configurations.',
          view: 'name-browser' as ViewType,
        },
        {
          icon: FileEdit,
          title: 'Metadata Editor',
          description: 'Edit and manage text records, addresses, and content hashes for your ENS names.',
          view: 'metadata' as ViewType,
        },
      ],
    },
    {
      title: 'Security & Governance',
      description: 'Enterprise-grade security monitoring and governance tools',
      features: [
        {
          icon: Shield,
          title: 'Security Monitor',
          description: 'Real-time monitoring of ENS transactions and security events. Track changes and suspicious activity.',
          view: 'security' as ViewType,
        },
        {
          icon: ScrollText,
          title: 'Audit Log',
          description: 'Complete audit trail of all ENS operations. Track every change with timestamps and details.',
          view: 'audit' as ViewType,
        },
        {
          icon: Vote,
          title: 'Governance Panel',
          description: 'Manage DAO governance for ENS domains. Propose and vote on changes with integrated tools.',
          view: 'governance' as ViewType,
        },
      ],
    },
    {
      title: 'Contract Registration',
      description: 'Register smart contracts with best practices validation',
      features: [
        {
          icon: PlusCircle,
          title: 'Register Contract',
          description: 'Guided workflow to register smart contracts with ENS names. Includes best practices validation.',
          view: 'contract-registration' as ViewType,
          badge: 'New',
        },
        {
          icon: FileCheck,
          title: 'Preflight Checker',
          description: 'Validate your ENS configuration before deployment. Check for common issues and best practices.',
          view: 'preflight-checker' as ViewType,
        },
        {
          icon: FileCode,
          title: 'Contract Registry',
          description: 'Browse and discover registered smart contracts. Find contracts by type, category, or organization.',
          view: 'contracts' as ViewType,
        },
      ],
    },
    {
      title: 'Tools & Utilities',
      description: 'Powerful tools for ENS development and management',
      features: [
        {
          icon: Sparkles,
          title: 'Naming Toolkit',
          description: 'Validate and generate ENS names following best practices. Templates and naming conventions.',
          view: 'naming' as ViewType,
        },
        {
          icon: Database,
          title: 'Metadata Tools',
          description: 'Advanced metadata management tools. Schema validation, templates, and bulk operations.',
          view: 'metadata-tools' as ViewType,
        },
        {
          icon: BookOpen,
          title: 'Best Practices',
          description: 'Interactive guide to ENS best practices. Security guidelines and naming conventions.',
          view: 'best-practices' as ViewType,
        },
      ],
    },
    {
      title: 'Registries & Discovery',
      description: 'Explore the ENS ecosystem',
      features: [
        {
          icon: Building2,
          title: 'DAO Registry',
          description: 'Discover DAOs registered with ENS. Browse governance structures and contract configurations.',
          view: 'dao-registry' as ViewType,
        },
        {
          icon: Plug,
          title: 'Integrations',
          description: 'Explore integrations and partnerships. Find services and tools that work with ENS.',
          view: 'integrations' as ViewType,
        },
        {
          icon: ShoppingCart,
          title: 'Marketplace',
          description: 'Buy and sell ENS names. Browse listings, place bids, and manage your collection.',
          view: 'marketplace' as ViewType,
        },
      ],
    },
    {
      title: 'Analytics & Insights',
      description: 'Data-driven insights into your ENS portfolio',
      features: [
        {
          icon: BarChart3,
          title: 'Analytics Dashboard',
          description: 'Comprehensive analytics for your ENS domains. Track value, usage, and trends over time.',
          view: 'analytics' as ViewType,
        },
      ],
    },
  ];

  const handleNavigate = (view: ViewType) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      // Fallback: dispatch custom event
      window.dispatchEvent(new CustomEvent('navigate', { detail: view }));
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Network className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
          ENS.tools
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          The platform for managing, registering, and discovering ENS names and smart contracts
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700"
            onClick={() => handleNavigate('contract-registration')}
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Register Contract
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => handleNavigate('domains')}
          >
            <Globe className="h-5 w-5 mr-2" />
            Manage Domains
          </Button>
        </div>
      </div>

      {/* Key Features Highlight */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80 bg-gradient-to-br from-purple-50 to-fuchsia-50">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-lg">Security First</CardTitle>
            <CardDescription>
              Built with security best practices. Real-time monitoring and audit trails.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border border-slate-200/80 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-lg">Best Practices</CardTitle>
            <CardDescription>
              Guided workflows with integrated validation against ENS best practices.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border border-slate-200/80 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-lg">Complete Solution</CardTitle>
            <CardDescription>
              Everything you need for ENS management in one integrated platform.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Feature Categories */}
      {featureCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{category.title}</h2>
            <p className="text-slate-600 mt-1">{category.description}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.features.map((feature, featureIndex) => (
              <FeatureCard
                key={featureIndex}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                badge={feature.badge}
                view={feature.view}
                onClick={() => feature.view && handleNavigate(feature.view)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* CTA Section */}
      <Card className="border border-slate-200/80 bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Ready to get started?</CardTitle>
          <CardDescription className="text-purple-100">
            Connect your wallet and start managing your ENS names today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => handleNavigate('domains')}
            >
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => handleNavigate('best-practices')}
            >
              Learn Best Practices
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

