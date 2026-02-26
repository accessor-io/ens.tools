import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
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
  ArrowRight,
  Sparkles,
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to load domains';
      
      let description = 'Please try again or check your connection';
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        description = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('timeout')) {
        description = 'Request timed out. The network may be slow. Please try again.';
      }
      
      toast.error('Failed to load domains', {
        description,
        action: {
          label: 'Retry',
          onClick: () => loadDomains(),
        },
        duration: 8000,
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
        expiry: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
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
      color: 'from-[#6b7a8f] to-[#7a8a9f]',
    },
    {
      title: 'Wrapped',
      value: isConnected ? domains.filter(d => d.isWrapped).length.toString() : '-',
      icon: Activity,
      change: isConnected ? `${Math.round((domains.filter(d => d.isWrapped).length / Math.max(domains.length, 1)) * 100)}%` : '-',
      color: 'from-[#7a8a9f] to-[#8a9aaf]',
    },
    {
      title: 'Expiring Soon',
      value: isConnected ? domains.filter(d => {
        const days = getDaysUntilExpiration(d.expiryDate);
        return days !== null && days < 90 && days > 0;
      }).length.toString() : '-',
      icon: Clock,
      change: '< 90 days',
      color: 'from-[#7a8a9f] to-[#6b7a8f]',
    },
    {
      title: 'With Resolver',
      value: isConnected ? domains.filter(d => d.resolver).length.toString() : '-',
      icon: Shield,
      change: 'Configured',
      color: 'from-emerald-500 to-teal-500',
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
      <div className="space-y-10">
        {/* Premium Domain Management Interface */}
        <div className="bg-white border border-slate-200/50 rounded-3xl p-12 shadow-2xl glass-card animate-scale-in relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-20 h-20 bg-sky-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-emerald-500 rounded-full blur-3xl"></div>
          </div>

          <div className="text-center mb-10 relative z-10">
            <div className="inline-flex items-center gap-6 mb-8">
              <div className="h-5 w-5 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-full animate-pulse shadow-xl shadow-sky-500/50"></div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight bg-gradient-to-r from-slate-900 via-sky-800 to-slate-900 bg-clip-text text-transparent">
                ENS Domain Management
              </h2>
              <div className="h-5 w-5 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-full animate-pulse shadow-xl shadow-emerald-500/50"></div>
            </div>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
              Professional ENS domain tools and analytics designed for Web3 professionals and enterprises
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="text-center group">
              <div className="relative h-4 bg-slate-200 rounded-full mb-4 shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700 via-slate-600 to-sky-500 rounded-full animate-pulse shadow-lg">
                  <div className="h-full bg-gradient-to-r from-slate-600 to-sky-400 rounded-full w-4/5 transition-all duration-1000 group-hover:w-full"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
              <span className="text-sm text-slate-600 font-semibold uppercase tracking-wide">Domains</span>
            </div>
            <div className="text-center group">
              <div className="relative h-4 bg-slate-200 rounded-full mb-4 shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-500 rounded-full animate-pulse shadow-lg">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full w-3/5 transition-all duration-1000 group-hover:w-4/5"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
              <span className="text-sm text-slate-600 font-semibold uppercase tracking-wide">Analytics</span>
            </div>
            <div className="text-center group">
              <div className="relative h-4 bg-gradient-to-r from-amber-200 to-orange-200 rounded-full mb-4 shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 rounded-full animate-pulse shadow-lg">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full w-2/5 transition-all duration-1000 group-hover:w-3/5"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
              <span className="text-sm text-slate-600 font-semibold uppercase tracking-wide">Tools</span>
            </div>
          </div>

          <div className="text-center">
            <Button className="bg-gradient-to-r from-slate-800 via-slate-700 to-sky-600 hover:from-slate-900 hover:to-sky-700 text-white px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-500 hover:scale-105 hover:shadow-2xl shadow-xl shadow-sky-500/30 glow-effect animate-pulse">
              <Wallet className="w-5 h-5 mr-3" />
              Connect Wallet
            </Button>
            <p className="text-base text-slate-500 mt-4 font-medium">Connect your wallet to start managing your ENS domains</p>
          </div>
        </div>

        {/* Stats preview */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-slate-900 tracking-tight">Overview</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Card key={index} className="group bg-white border border-slate-200/50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:border-sky-200/50 animate-fade-in glass-card" style={{ animationDelay: `${index * 0.15}s` }}>
                <CardContent className="p-8 relative overflow-hidden">
                  {/* Background gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 shimmer-bg opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.title}</span>
                      <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 glow-effect`}>
                        <stat.icon className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <div className="text-4xl font-black mb-3 text-slate-900 group-hover:text-sky-900 transition-colors duration-300">{stat.value}</div>
                    <p className="text-sm text-slate-600 font-semibold group-hover:text-slate-700 transition-colors duration-300">{stat.change}</p>
                  </div>

                  {/* Decorative corner accent */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-br from-sky-400 to-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div>
          <h2 className="text-xl font-semibold mb-8 text-slate-900">Features</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <Card className="group bg-white border border-slate-200/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:border-sky-200/50 cursor-pointer animate-slide-in glass-card overflow-hidden" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-10 relative">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-sky-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                {/* Floating particles effect */}
                <div className="absolute top-6 right-6 w-1 h-1 bg-sky-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100"></div>
                <div className="absolute top-10 right-10 w-0.5 h-0.5 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200"></div>

                <div className="relative z-10">
                  <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-slate-700 via-slate-600 to-sky-500 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-all duration-300 glow-effect">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-slate-900 group-hover:text-sky-900 transition-colors duration-300">Domain Management</h3>
                  <p className="text-base leading-relaxed mb-6 text-slate-600 group-hover:text-slate-700 transition-colors duration-300">View and manage all your ENS names with an intuitive interface designed for Web3 professionals.</p>
                  <div className="flex items-center font-semibold text-sm group-hover:gap-3 transition-all gap-2 text-sky-600 group-hover:text-sky-700">
                    Learn more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="group bg-white border border-slate-200/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:border-emerald-200/50 cursor-pointer animate-slide-in glass-card overflow-hidden" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-10 relative">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-sky-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                {/* Floating particles effect */}
                <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-150"></div>
                <div className="absolute bottom-8 left-8 w-0.5 h-0.5 bg-sky-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-300"></div>

                <div className="relative z-10">
                  <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-sky-500 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-all duration-300 glow-effect">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-slate-900 group-hover:text-emerald-900 transition-colors duration-300">Security Monitoring</h3>
                  <p className="text-base leading-relaxed mb-6 text-slate-600 group-hover:text-slate-700 transition-colors duration-300">Advanced security monitoring with real-time alerts and comprehensive domain protection analytics.</p>
                  <div className="flex items-center font-semibold text-sm group-hover:gap-3 transition-all gap-2 text-emerald-600 group-hover:text-emerald-700">
                    Learn more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card-elevated hover-lift cursor-pointer group fade-in-up-delay-3" style={{ backgroundColor: '#ffffff' }}>
              <CardContent className="p-8">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br from-[#8a9aaf] to-[#7a8a9f] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gradient-animated">Advanced Tools</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#5a5a5d' }}>Metadata editing, analytics, and powerful automation features.</p>
                <div className="flex items-center font-medium text-sm group-hover:gap-2 transition-all gap-1" style={{ color: '#6b7a8f' }}>
                  Learn more <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Crystal Matrix Command Center */}
      <div className="mb-8 relative">
        <div className="absolute -top-4 -left-4 w-16 h-16 border-2 border-purple-400 clip-hexagon bg-purple-900/20 animate-pulse"></div>
        <div className="absolute -top-2 -right-2 w-12 h-12 border border-cyan-400 clip-hexagon bg-cyan-900/20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-purple-400 clip-hexagon bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <div className="w-6 h-6 border border-cyan-400 clip-hexagon bg-cyan-400 animate-pulse"></div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border border-pink-400 clip-hexagon bg-pink-900/20 animate-pulse" style={{animationDelay: '0.5s'}}></div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                CRYSTAL MATRIX
              </span>
            </h1>
            <p className="text-purple-300 text-sm">Domain Resolution Through Crystal Formation</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-8 h-8 border border-pink-400 clip-hexagon bg-pink-900/20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="grid grid-cols-3 gap-6">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 border-2 border-purple-400 clip-hexagon bg-gradient-to-br from-purple-500/10 to-cyan-500/10 transform group-hover:rotate-12 transition-transform duration-500"></div>
            <div className="relative border border-cyan-400 clip-hexagon bg-gradient-to-br from-purple-900/20 to-cyan-900/20 p-6 backdrop-blur-sm text-center">
              <div className="text-3xl font-bold text-white mb-2">1,247</div>
              <div className="text-xs text-purple-300 uppercase tracking-wider">Crystal Links</div>
              <div className="absolute bottom-2 right-2 w-2 h-2 border border-pink-400 clip-hexagon bg-pink-400 animate-pulse"></div>
            </div>
          </div>
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 border-2 border-pink-400 clip-hexagon bg-gradient-to-br from-pink-500/10 to-purple-500/10 transform group-hover:-rotate-12 transition-transform duration-500"></div>
            <div className="relative border border-purple-400 clip-hexagon bg-gradient-to-br from-pink-900/20 to-purple-900/20 p-6 backdrop-blur-sm text-center">
              <div className="text-3xl font-bold text-white mb-2">847</div>
              <div className="text-xs text-pink-300 uppercase tracking-wider">Domain Nodes</div>
              <div className="absolute bottom-2 right-2 w-2 h-2 border border-cyan-400 clip-hexagon bg-cyan-400 animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
          </div>
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 border-2 border-cyan-400 clip-hexagon bg-gradient-to-br from-cyan-500/10 to-pink-500/10 transform group-hover:rotate-6 transition-transform duration-500"></div>
            <div className="relative border border-pink-400 clip-hexagon bg-gradient-to-br from-cyan-900/20 to-pink-900/20 p-6 backdrop-blur-sm text-center">
              <div className="text-3xl font-bold text-white mb-2">99.7%</div>
              <div className="text-xs text-cyan-300 uppercase tracking-wider">Crystal Purity</div>
              <div className="absolute bottom-2 right-2 w-2 h-2 border border-purple-400 clip-hexagon bg-purple-400 animate-pulse" style={{animationDelay: '2s'}}>            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Domains */}
        <Card className="premium-card">
          <CardHeader className="pb-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold mb-2 text-white">Your ENS Names</CardTitle>
                <CardDescription className="text-slate-400">Recently loaded domains</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDomains}
                disabled={isLoading}
                className="h-9 w-9 p-0"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 w-full shimmer rounded-lg" />
                ))}
              </div>
            ) : recentDomains.length > 0 ? (
              <div className="space-y-4">
                {recentDomains.map((domain, index) => {
                  const expirationStatus = getExpirationStatus(domain.expiryDate);
                  const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
                  
                  return (
                    <div 
                      key={index} 
                      className="premium-card rounded-xl cursor-pointer group web3-glow"
                      onClick={() => setSelectedDomain(domain)}
                    >
                      <div className="flex items-center justify-between p-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow-purple">
                              <Globe className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-lg font-bold truncate" style={{ color: '#2a2a2d' }}>{domain.name}</p>
                              {domain.isWrapped && (
                                <Badge variant="default" className="mt-1">Wrapped</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-secondary ml-13">
                            {domain.expiryDate && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span>Expires {domain.expiryDate.toLocaleDateString()}</span>
                                {daysUntilExpiry !== null && (
                                  <span className="font-semibold">({daysUntilExpiry} days)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {expirationStatus === 'active' && (
                            <div className="h-10 w-10 rounded-full border flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 122, 143, 0.1)', borderColor: 'rgba(107, 122, 143, 0.3)' }}>
                              <CheckCircle2 className="h-6 w-6" style={{ color: '#7a8a9f' }} />
                            </div>
                          )}
                          {expirationStatus === 'expiring-soon' && (
                            <div className="h-10 w-10 rounded-full border flex items-center justify-center" style={{ backgroundColor: 'rgba(122, 138, 159, 0.1)', borderColor: 'rgba(122, 138, 159, 0.3)' }}>
                              <AlertTriangle className="h-6 w-6" style={{ color: '#8a9aaf' }} />
                            </div>
                          )}
                          {expirationStatus === 'expired' && (
                            <div className="h-10 w-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                              <AlertTriangle className="h-6 w-6 text-red-400" />
                            </div>
                          )}
                          <ArrowRight className="h-5 w-5 text-secondary group-hover:text-[#6b7a8f] group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      <div className="border-t p-5 flex items-center gap-3 rounded-b-xl" style={{ borderColor: 'rgba(107, 122, 143, 0.2)', backgroundColor: 'rgba(107, 122, 143, 0.03)' }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDomain(domain)}
                          className="flex-1"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          View Details
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
                          className="flex-1"
                        >
                          {processingDomain === domain.name ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <LinkIcon className="h-4 w-4 mr-2" />
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
                icon={<Globe className="h-8 w-8 text-secondary" />}
                title="No ENS Names Found"
                description="This address doesn't own any ENS names yet."
                action={{
                  label: 'Load Domains',
                  onClick: loadDomains,
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Security Alerts */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div>
              <CardTitle className="text-xl font-bold mb-2">Alerts & Notifications</CardTitle>
              <CardDescription className="text-base">Important updates for your domains</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {securityAlerts.length > 0 ? (
              <div className="space-y-4">
                {securityAlerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className="rounded-xl border-2 border-gray-200 bg-white hover:border-pink-300 hover:shadow-md transition-all p-6"
                  >
                    <div className="flex items-start gap-4">
                      {alert.type === 'warning' && (
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(122, 138, 159, 0.1)' }}>
                          <AlertTriangle className="h-6 w-6" style={{ color: '#8a9aaf' }} />
                        </div>
                      )}
                      {alert.type === 'error' && (
                        <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                      )}
                      {alert.type === 'info' && (
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(107, 122, 143, 0.1)' }}>
                          <Activity className="h-6 w-6" style={{ color: '#6b7a8f' }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold mb-2 leading-tight" style={{ color: '#ffffff' }}>{alert.message}</p>
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#6b6b85' }}>
                          <Clock className="h-4 w-4" />
                          <span>{alert.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-5 p-8 rounded-xl border-2" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)' }}>
                <div className="h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <CheckCircle2 className="h-7 w-7" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="text-lg font-bold mb-1" style={{ color: '#ffffff' }}>All Clear!</p>
                  <p className="text-base leading-relaxed" style={{ color: '#a0a0b8' }}>No alerts for your ENS names.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domain Statistics */}
      {domains.length > 0 && (
        <Card>
          <CardHeader className="pb-4 border-b" style={{ borderColor: 'rgba(107, 122, 143, 0.2)' }}>
            <div>
              <CardTitle className="text-lg md:text-xl font-bold mb-2" style={{ color: '#2a2a2d' }}>Portfolio Overview</CardTitle>
              <CardDescription className="text-sm md:text-base text-secondary">Statistics for your ENS names</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-secondary">Wrapped Names</span>
                  <span className="text-lg font-bold" style={{ color: '#2a2a2d' }}>
                    {domains.filter(d => d.isWrapped).length} / {domains.length}
                  </span>
                </div>
                <div className="h-3 bg-[#e8e8eb] rounded-full overflow-hidden">
                  <div 
                    className="h-full gradient-primary rounded-full transition-all duration-500 shadow-glow-purple"
                    style={{ width: `${(domains.filter(d => d.isWrapped).length / domains.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-secondary">With Resolvers</span>
                  <span className="text-lg font-bold" style={{ color: '#2a2a2d' }}>
                    {domains.filter(d => d.resolver).length} / {domains.length}
                  </span>
                </div>
                <div className="h-3 bg-[#e8e8eb] rounded-full overflow-hidden">
                  <div 
                    className="h-full gradient-primary rounded-full transition-all duration-500 shadow-glow-purple"
                    style={{ width: `${(domains.filter(d => d.resolver).length / domains.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-secondary">Active Domains</span>
                  <span className="text-lg font-bold" style={{ color: '#2a2a2d' }}>
                    {domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length} / {domains.length}
                  </span>
                </div>
                <div className="h-3 bg-[#e8e8eb] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#8a9aaf] to-[#7a8a9f] rounded-full transition-all duration-500 shadow-lg"
                    style={{ width: `${(domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length / domains.length) * 100}%` }}
                  />
                </div>
              </div>
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
