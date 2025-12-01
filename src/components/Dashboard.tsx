import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './ui/empty-state';
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
import { useWeb3 } from '../lib/services';
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
      title: 'TOTAL DOMAINS',
      value: isConnected ? domains.length.toString() : '-',
      icon: Globe,
      trend: isConnected ? `${domains.length} owned` : 'Connect wallet',
      color: 'bg-lime-500',
      iconColor: 'text-zinc-900'
    },
    {
      title: 'WRAPPED',
      value: isConnected ? domains.filter(d => d.isWrapped).length.toString() : '-',
      icon: Activity,
      trend: isConnected ? `${Math.round((domains.filter(d => d.isWrapped).length / Math.max(domains.length, 1)) * 100)}% wrapped` : 'N/A',
      color: 'bg-cyan-500',
      iconColor: 'text-zinc-900'
    },
    {
      title: 'EXPIRING',
      value: isConnected ? domains.filter(d => {
        const days = getDaysUntilExpiration(d.expiryDate);
        return days !== null && days < 90 && days > 0;
      }).length.toString() : '-',
      icon: Clock,
      trend: isConnected ? '< 90 days' : 'N/A',
      color: 'bg-amber-500',
      iconColor: 'text-zinc-900'
    },
    {
      title: 'RESOLVERS',
      value: isConnected ? domains.filter(d => d.resolver).length.toString() : '-',
      icon: Shield,
      trend: isConnected ? 'Configured' : 'N/A',
      color: 'bg-emerald-500',
      iconColor: 'text-zinc-900'
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
      <div className="space-y-8">
        {/* Hero section */}
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 via-transparent to-cyan-500/10" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-lime-500 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-zinc-900" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome to ens.tools</h2>
                <p className="text-zinc-400">Connect your wallet to get started</p>
              </div>
            </div>
            <p className="text-zinc-500 max-w-2xl">
              Your command center for ENS domain management. View portfolios, track expirations, 
              manage metadata, and access the marketplace - all in one place.
            </p>
          </div>
        </div>

        {/* Stats preview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="group relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold tracking-wider text-zinc-600">{stat.title}</span>
                <div className={`h-8 w-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-zinc-500 mb-1">{stat.value}</div>
              <p className="text-xs text-zinc-600">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-lime-500/30 transition-colors group">
            <div className="h-10 w-10 rounded-lg bg-lime-500/10 flex items-center justify-center mb-4 group-hover:bg-lime-500/20 transition-colors">
              <Globe className="h-5 w-5 text-lime-500" />
            </div>
            <h3 className="text-white font-semibold mb-2">Domain Management</h3>
            <p className="text-zinc-500 text-sm">View, configure, and manage all your ENS names in one unified interface.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-cyan-500/30 transition-colors group">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
              <Shield className="h-5 w-5 text-cyan-500" />
            </div>
            <h3 className="text-white font-semibold mb-2">Security Monitoring</h3>
            <p className="text-zinc-500 text-sm">Track expirations, resolver configs, and get alerts for important changes.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-violet-500/30 transition-colors group">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
              <Activity className="h-5 w-5 text-violet-500" />
            </div>
            <h3 className="text-white font-semibold mb-2">Advanced Tools</h3>
            <p className="text-zinc-500 text-sm">Access metadata editors, analytics dashboards, and marketplace features.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={index} className="group relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold tracking-wider text-zinc-500">{stat.title}</span>
              <div className={`h-8 w-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <p className="text-xs text-zinc-500 flex items-center">
              <TrendingUp className="h-3 w-3 inline mr-1.5 text-zinc-600" />
              {stat.trend}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Domains */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Your ENS Names</h3>
              <p className="text-zinc-500 text-sm">Recently loaded domains</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDomains}
              disabled={isLoading}
              className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-zinc-800" />
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
                      className="rounded-lg border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer"
                      onClick={() => setSelectedDomain(domain)}
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{domain.name}</p>
                            {domain.isWrapped && (
                              <Badge className="bg-lime-500/10 text-lime-500 border-lime-500/20 text-xs">
                                Wrapped
                              </Badge>
                            )}
                          </div>
                          <p className="text-zinc-500 text-sm mt-1">
                            {domain.expiryDate 
                              ? `Expires: ${domain.expiryDate.toLocaleDateString()} (${daysUntilExpiry} days)`
                              : 'No expiration data'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {expirationStatus === 'active' && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          )}
                          {expirationStatus === 'expiring-soon' && (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          )}
                          {expirationStatus === 'expired' && (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className="border-t border-zinc-800 p-3 flex items-center gap-2 flex-wrap" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300"
                          onClick={() => setSelectedDomain(domain)}
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300"
                          disabled={processingDomain === domain.name}
                          onClick={(e: React.MouseEvent) => {
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
              <EmptyState
                icon={<Globe className="h-8 w-8 text-zinc-600" />}
                title="No ENS Names Found"
                description="This address doesn't own any ENS names yet."
                action={{
                  label: 'Load Domains',
                  onClick: loadDomains,
                }}
              />
            )}
          </div>
        </div>

        {/* Security Alerts */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800">
            <h3 className="text-white font-semibold">Alerts & Notifications</h3>
            <p className="text-zinc-500 text-sm">Important updates for your domains</p>
          </div>
          <div className="p-5">
            {securityAlerts.length > 0 ? (
              <div className="space-y-3">
                {securityAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-lg border border-zinc-800 bg-zinc-800/50">
                    {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'info' && <Activity className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-white text-sm">{alert.message}</p>
                      <p className="text-zinc-500 text-xs flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {alert.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-white font-medium">All Clear!</p>
                  <p className="text-zinc-500 text-sm">No alerts for your ENS names.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Domain Statistics */}
      {domains.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800">
            <h3 className="text-white font-semibold">Portfolio Overview</h3>
            <p className="text-zinc-500 text-sm">Statistics for your ENS names</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Wrapped Names</span>
                <span className="text-white font-medium">
                  {domains.filter(d => d.isWrapped).length} / {domains.length}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-lime-500 rounded-full transition-all duration-500"
                  style={{ width: `${(domains.filter(d => d.isWrapped).length / domains.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">With Resolvers</span>
                <span className="text-white font-medium">
                  {domains.filter(d => d.resolver).length} / {domains.length}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${(domains.filter(d => d.resolver).length / domains.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Active (Not Expiring)</span>
                <span className="text-white font-medium">
                  {domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length} / {domains.length}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length / domains.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
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
