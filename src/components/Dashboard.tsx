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
  Settings,
  Zap,
  Link as LinkIcon,
} from 'lucide-react';
import { useWeb3 } from '../lib/services/web3-provider';
import { fetchENSNames, getExpirationStatus, getDaysUntilExpiration, ENSDomain } from '../lib/ens';
import { wrapName, unwrapName, FUSES } from '../lib/ens';
import { toast } from 'sonner';
import { DomainProfile } from './domains/DomainProfile';

export function Dashboard() {
  const { address, isConnected, publicClient, walletClient } = useWeb3();
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingDomain, setProcessingDomain] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<ENSDomain | null>(null);

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

  const handleWrap = async (domain: ENSDomain) => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setProcessingDomain(domain.name);
    try {
      const toastId = toast.loading('Wrapping domain...');
      const hash = await wrapName(walletClient, {
        name: domain.name,
        owner: address,
        fuses: 0,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60), // 1 year from now
      });
      
      toast.dismiss(toastId);
      toast.success('Domain wrapped successfully', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });
      
      await loadDomains();
    } catch (error: any) {
      console.error('Error wrapping domain:', error);
      toast.error('Failed to wrap domain', {
        description: error.message || 'Please try again',
      });
    } finally {
      setProcessingDomain(null);
    }
  };

  const handleUnwrap = async (domain: ENSDomain) => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setProcessingDomain(domain.name);
    try {
      const toastId = toast.loading('Unwrapping domain...');
      const hash = await unwrapName(walletClient, publicClient, {
        name: domain.name,
        newController: address,
      });
      
      toast.dismiss(toastId);
      toast.success('Domain unwrapped successfully', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });
      
      await loadDomains();
    } catch (error: any) {
      console.error('Error unwrapping domain:', error);
      toast.error('Failed to unwrap domain', {
        description: error.message || 'Please try again',
      });
    } finally {
      setProcessingDomain(null);
    }
  };

  const stats = [
    {
      title: 'Total Domains',
      value: isConnected ? domains.length.toString() : '-',
      icon: Globe,
      trend: isConnected ? `${domains.length} owned` : 'Connect wallet',
      color: 'bg-gradient-to-br from-purple-500 to-fuchsia-600'
    },
    {
      title: 'Wrapped Names',
      value: isConnected ? domains.filter(d => d.isWrapped).length.toString() : '-',
      icon: Activity,
      trend: isConnected ? `${Math.round((domains.filter(d => d.isWrapped).length / Math.max(domains.length, 1)) * 100)}% wrapped` : 'N/A',
      color: 'bg-gradient-to-br from-blue-500 to-cyan-600'
    },
    {
      title: 'Expiring Soon',
      value: isConnected ? domains.filter(d => {
        const days = getDaysUntilExpiration(d.expiryDate);
        return days !== null && days < 90 && days > 0;
      }).length.toString() : '-',
      icon: Clock,
      trend: isConnected ? '< 90 days' : 'N/A',
      color: 'bg-gradient-to-br from-amber-500 to-orange-600'
    },
    {
      title: 'Active Resolvers',
      value: isConnected ? domains.filter(d => d.resolver).length.toString() : '-',
      icon: Shield,
      trend: isConnected ? 'Configured' : 'N/A',
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600'
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
        <Alert className="border-slate-200 bg-white">
          <Wallet className="h-4 w-4 text-slate-700" />
          <AlertTitle className="text-slate-900">Welcome to ens.tools</AlertTitle>
          <AlertDescription className="text-slate-700">
            Connect your wallet to view and manage your ENS domains. Click the "Connect Wallet" button in the top right corner to get started.
          </AlertDescription>
        </Alert>

        {/* Preview Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white border border-slate-200/60 opacity-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
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

        <Card className="bg-white border border-slate-200/60">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>What you can do with ens.tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Globe className="h-5 w-5 text-slate-900 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-900">Manage Your Domains</p>
                <p className="text-slate-600">View, configure, and manage all your ENS names in one place</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-slate-900 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-900">Security Monitoring</p>
                <p className="text-slate-600">Track expiration dates, resolver configurations, and security settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Activity className="h-5 w-5 text-slate-900 flex-shrink-0 mt-0.5" />
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
          {stats.map((stat, index) => {
            const colorClasses = [
              'bg-gradient-to-br from-violet-500 to-purple-600',
              'bg-gradient-to-br from-indigo-500 to-blue-600',
              'bg-gradient-to-br from-purple-500 to-pink-600',
              'bg-gradient-to-br from-slate-600 to-slate-700',
            ];
            return (
            <Card key={index} className="bg-white border border-slate-200/60 hover:shadow-xl hover:shadow-violet-200/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100/30 to-purple-100/30 rounded-full blur-2xl group-hover:from-violet-100/40 group-hover:to-purple-100/40 transition-all" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-slate-900 font-semibold">{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg ${colorClasses[index % colorClasses.length]} flex items-center justify-center depth-1 shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{stat.value}</div>
              <p className="text-slate-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1 !text-violet-600" />
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        )})}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Domains */}
        <Card className="bg-white border border-slate-200/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 font-semibold">Your ENS Names</CardTitle>
                <CardDescription className="text-slate-600">Recently loaded domains</CardDescription>
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
                    <div 
                      key={index} 
                      className="rounded-lg border bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedDomain(domain)}
                    >
                      <div className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-slate-900 font-medium">{domain.name}</p>
                          {domain.isWrapped && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-300">
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
                          <CheckCircle2 className="h-5 w-5 text-slate-700" />
                        )}
                        {expirationStatus === 'expiring-soon' && (
                          <AlertTriangle className="h-5 w-5 text-slate-500" />
                        )}
                        {expirationStatus === 'expired' && (
                          <AlertTriangle className="h-5 w-5 text-slate-900" />
                        )}
                        </div>
                      </div>
                      <div className="border-t border-slate-200 p-3 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => setSelectedDomain(domain)}
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          disabled={processingDomain === domain.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (domain.isWrapped) {
                              handleUnwrap(domain);
                            } else {
                              handleWrap(domain);
                            }
                          }}
                        >
                          {processingDomain === domain.name ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <LinkIcon className="h-3 w-3 mr-1" />
                              {domain.isWrapped ? 'Unwrap' : 'Wrap'}
                            </>
                          )}
                        </Button>
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
        <Card className="bg-white border border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-slate-900 font-semibold">Alerts & Notifications</CardTitle>
            <CardDescription className="text-slate-600">Important updates for your domains</CardDescription>
          </CardHeader>
          <CardContent>
            {securityAlerts.length > 0 ? (
              <div className="space-y-3">
                {securityAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                    {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-slate-900 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'info' && <Activity className="h-5 w-5 text-slate-700 flex-shrink-0 mt-0.5" />}
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
              <Alert className="border-slate-200 bg-slate-50">
                <CheckCircle2 className="h-4 w-4 text-slate-700" />
                <AlertTitle className="text-slate-900">All Clear!</AlertTitle>
                <AlertDescription className="text-slate-700">
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

      {/* Domain Profile Dialog */}
      {selectedDomain && (
        <DomainProfile
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
          onUpdate={loadDomains}
        />
      )}
    </div>
  );
}
