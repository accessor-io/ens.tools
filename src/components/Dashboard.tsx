import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
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
  Link as LinkIcon,
} from 'lucide-react';
import { useWeb3 } from '../lib/services';
import { fetchENSNames, getExpirationStatus, getDaysUntilExpiration, ENSDomain } from '../lib/ens';
import { wrapName, unwrapName } from '../lib/ens';
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
      change: isConnected ? `${domains.length} owned` : 'Connect wallet',
    },
    {
      title: 'Wrapped',
      value: isConnected ? domains.filter(d => d.isWrapped).length.toString() : '-',
      icon: Activity,
      change: isConnected ? `${Math.round((domains.filter(d => d.isWrapped).length / Math.max(domains.length, 1)) * 100)}%` : '-',
    },
    {
      title: 'Expiring Soon',
      value: isConnected ? domains.filter(d => {
        const days = getDaysUntilExpiration(d.expiryDate);
        return days !== null && days < 90 && days > 0;
      }).length.toString() : '-',
      icon: Clock,
      change: '< 90 days',
    },
    {
      title: 'With Resolver',
      value: isConnected ? domains.filter(d => d.resolver).length.toString() : '-',
      icon: Shield,
      change: 'Configured',
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
        {/* Welcome */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-pink-500 flex items-center justify-center flex-shrink-0">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">Connect your wallet</h2>
              <p className="text-gray-500 text-sm">
                Connect to view and manage your ENS domains, track expirations, and access all features.
              </p>
            </div>
          </div>
        </div>

        {/* Stats preview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{stat.title}</span>
                <stat.icon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-semibold text-gray-300">{stat.value}</div>
              <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-pink-300 hover:shadow-md transition-all">
            <Globe className="h-5 w-5 text-pink-500 mb-3" />
            <h3 className="text-gray-900 font-medium mb-1">Domain Management</h3>
            <p className="text-gray-500 text-sm">View and manage all your ENS names.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-pink-300 hover:shadow-md transition-all">
            <Shield className="h-5 w-5 text-pink-500 mb-3" />
            <h3 className="text-gray-900 font-medium mb-1">Security Monitoring</h3>
            <p className="text-gray-500 text-sm">Track expirations and get alerts.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-pink-300 hover:shadow-md transition-all">
            <Activity className="h-5 w-5 text-pink-500 mb-3" />
            <h3 className="text-gray-900 font-medium mb-1">Advanced Tools</h3>
            <p className="text-gray-500 text-sm">Metadata, analytics, and more.</p>
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
          <div 
            key={index} 
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-pink-200 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{stat.title}</span>
              <stat.icon className="h-4 w-4 text-pink-500" />
            </div>
            <div className="text-3xl font-semibold text-gray-900 mb-1">{stat.value}</div>
            <p className="text-xs text-gray-500 flex items-center">
              <TrendingUp className="h-3 w-3 inline mr-1.5 text-emerald-500" />
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Domains */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-gray-900 font-medium">Your ENS Names</h3>
              <p className="text-gray-500 text-sm">Recently loaded domains</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadDomains}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-gray-100" />
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
                      className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-white hover:border-pink-200 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => setSelectedDomain(domain)}
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 font-medium">{domain.name}</p>
                            {domain.isWrapped && (
                              <Badge variant="default">Wrapped</Badge>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm mt-1">
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
                      <div className="border-t border-gray-200 p-3 flex items-center gap-2 flex-wrap bg-white rounded-b-lg" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDomain(domain)}
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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
                icon={<Globe className="h-8 w-8 text-gray-400" />}
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
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-gray-900 font-medium">Alerts & Notifications</h3>
            <p className="text-gray-500 text-sm">Important updates for your domains</p>
          </div>
          <div className="p-5">
            {securityAlerts.length > 0 ? (
              <div className="space-y-3">
                {securityAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                    {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
                    {alert.type === 'info' && <Activity className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm">{alert.message}</p>
                      <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {alert.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-gray-900 font-medium">All Clear!</p>
                  <p className="text-gray-500 text-sm">No alerts for your ENS names.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Domain Statistics */}
      {domains.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-gray-900 font-medium">Portfolio Overview</h3>
            <p className="text-gray-500 text-sm">Statistics for your ENS names</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Wrapped Names</span>
                <span className="text-gray-900 font-medium">
                  {domains.filter(d => d.isWrapped).length} / {domains.length}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${(domains.filter(d => d.isWrapped).length / domains.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">With Resolvers</span>
                <span className="text-gray-900 font-medium">
                  {domains.filter(d => d.resolver).length} / {domains.length}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(domains.filter(d => d.resolver).length / domains.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active (Not Expiring)</span>
                <span className="text-gray-900 font-medium">
                  {domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length} / {domains.length}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
