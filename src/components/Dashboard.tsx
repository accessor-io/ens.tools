import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { 
  Globe, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  Activity,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useWeb3 } from '../lib/services/web3-provider';
import { fetchENSNames, getExpirationStatus, getDaysUntilExpiration, ENSDomain } from '../lib/ens';
import { toast } from 'sonner';

export function Dashboard() {
  const { address, isConnected, publicClient } = useWeb3();
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadDomains();
    } else {
      setDomains([]);
    }
  }, [isConnected, address]);

  const loadDomains = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const fetchedDomains = await fetchENSNames(address);
      setDomains(fetchedDomains);
      
      if (fetchedDomains.length > 0) {
        toast.success('Domains loaded', {
          description: `Found ${fetchedDomains.length} ENS name${fetchedDomains.length !== 1 ? 's' : ''}`,
        });
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains', {
        description: 'Please try again or check your connection',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      title: 'Total Domains',
      value: isConnected ? domains.length.toString() : '-',
      icon: Globe,
      trend: isConnected ? `${domains.length} owned` : 'Connect wallet',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Wrapped Names',
      value: isConnected ? domains.filter(d => d.isWrapped).length.toString() : '-',
      icon: Activity,
      trend: isConnected ? `${Math.round((domains.filter(d => d.isWrapped).length / Math.max(domains.length, 1)) * 100)}% wrapped` : 'N/A',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Expiring Soon',
      value: isConnected ? domains.filter(d => {
        const days = getDaysUntilExpiration(d.expiryDate);
        return days !== null && days < 90 && days > 0;
      }).length.toString() : '-',
      icon: Clock,
      trend: isConnected ? '< 90 days' : 'N/A',
      color: 'from-amber-500 to-amber-600'
    },
    {
      title: 'Active Resolvers',
      value: isConnected ? domains.filter(d => d.resolver).length.toString() : '-',
      icon: Shield,
      trend: isConnected ? 'Configured' : 'N/A',
      color: 'from-emerald-500 to-emerald-600'
    }
  ];

  const recentDomains = domains.slice(0, 5);

  const securityAlerts = domains
    .filter(d => {
      const days = getDaysUntilExpiration(d.expiryDate);
      return (days !== null && days < 90) || !d.resolver;
    })
    .slice(0, 3)
    .map(d => {
      const days = getDaysUntilExpiration(d.expiryDate);
      if (days !== null && days < 90 && days > 0) {
        return {
          type: 'warning' as const,
          message: `${d.name} expires in ${days} days`,
          time: d.expiryDate?.toLocaleDateString() || 'Unknown',
        };
      } else if (days !== null && days < 0) {
        return {
          type: 'error' as const,
          message: `${d.name} has expired`,
          time: d.expiryDate?.toLocaleDateString() || 'Unknown',
        };
      } else if (!d.resolver) {
        return {
          type: 'info' as const,
          message: `${d.name} has no resolver configured`,
          time: 'Action needed',
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ type: 'warning' | 'error' | 'info'; message: string; time: string }>;

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Wallet className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Welcome to ens.tools</AlertTitle>
          <AlertDescription className="text-blue-800">
            Connect your wallet to view and manage your ENS domains. Click the "Connect Wallet" button in the top right corner to get started.
          </AlertDescription>
        </Alert>

        {/* Preview Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-2 opacity-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">{stat.value}</div>
                <p className="text-slate-600">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>What you can do with ens.tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-900">Manage Your Domains</p>
                <p className="text-slate-600">View, configure, and manage all your ENS names in one place</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-900">Security Monitoring</p>
                <p className="text-slate-600">Track expiration dates, resolver configurations, and security settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Activity className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-900">Advanced Tools</p>
                <p className="text-slate-600">Access naming conventions, metadata tools, and analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{stat.title}</CardTitle>
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-slate-900">{stat.value}</div>
              <p className="text-slate-600">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Domains */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your ENS Names</CardTitle>
                <CardDescription>Recently loaded domains</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDomains}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : recentDomains.length > 0 ? (
              <div className="space-y-3">
                {recentDomains.map((domain, index) => {
                  const expirationStatus = getExpirationStatus(domain.expiryDate);
                  const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-slate-900">{domain.name}</p>
                          {domain.isWrapped && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                              Wrapped
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-600">
                          {domain.expiryDate 
                            ? `Expires: ${domain.expiryDate.toLocaleDateString()} (${daysUntilExpiry} days)`
                            : 'No expiration data'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {expirationStatus === 'active' && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        )}
                        {expirationStatus === 'expiring-soon' && (
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        )}
                        {expirationStatus === 'expired' && (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertTitle>No ENS Names Found</AlertTitle>
                <AlertDescription>
                  This address doesn't own any ENS names yet.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Security Alerts */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Alerts & Notifications</CardTitle>
            <CardDescription>Important updates for your domains</CardDescription>
          </CardHeader>
          <CardContent>
            {securityAlerts.length > 0 ? (
              <div className="space-y-3">
                {securityAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                    {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'info' && <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-slate-900">{alert.message}</p>
                      <p className="text-slate-600 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {alert.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-900">All Clear!</AlertTitle>
                <AlertDescription className="text-emerald-800">
                  No alerts or warnings for your ENS names.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domain Statistics */}
      {domains.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Domain Statistics</CardTitle>
            <CardDescription>Overview of your ENS portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Wrapped Names</span>
                <span className="text-slate-900">
                  {domains.filter(d => d.isWrapped).length} / {domains.length}
                </span>
              </div>
              <Progress 
                value={(domains.filter(d => d.isWrapped).length / domains.length) * 100} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">With Resolvers</span>
                <span className="text-slate-900">
                  {domains.filter(d => d.resolver).length} / {domains.length}
                </span>
              </div>
              <Progress 
                value={(domains.filter(d => d.resolver).length / domains.length) * 100} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Active (Not Expiring Soon)</span>
                <span className="text-slate-900">
                  {domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length} / {domains.length}
                </span>
              </div>
              <Progress 
                value={(domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length / domains.length) * 100} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
