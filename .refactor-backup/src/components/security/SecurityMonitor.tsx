import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  Eye,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services/web3-provider';
import { fetchENSNames, ENSDomain, getDaysUntilExpiration } from '../../lib/ens';
import { notificationService } from '../../lib/services/notification-service';

export function SecurityMonitor() {
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

  useEffect(() => {
    if (domains.length > 0 && notificationService.shouldNotifyForEvent('security')) {
      const securityIssues = getSecurityIssues();
      const criticalIssues = securityIssues.filter(i => i.severity === 'critical');
      const highIssues = securityIssues.filter(i => i.severity === 'high');

      criticalIssues.forEach(issue => {
        notificationService.sendNotification({
          type: 'security',
          severity: 'critical',
          title: `Critical Security Issue: ${issue.issue}`,
          message: issue.recommendation,
          domain: issue.domain,
          timestamp: new Date().toISOString(),
          metadata: { impact: issue.impact },
        });
      });

      highIssues.forEach(issue => {
        notificationService.sendNotification({
          type: 'security',
          severity: 'high',
          title: `High Priority Issue: ${issue.issue}`,
          message: issue.recommendation,
          domain: issue.domain,
          timestamp: new Date().toISOString(),
          metadata: { impact: issue.impact },
        });
      });
    }
  }, [domains]);

  const loadDomains = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const fetchedDomains = await fetchENSNames(address);
      setDomains(fetchedDomains);
      
      if (fetchedDomains.length > 0) {
        toast.success('Domains loaded successfully');
        
        if (notificationService.shouldNotifyForEvent('security')) {
          await notificationService.sendNotification({
            type: 'security',
            severity: 'info',
            title: 'Domains Loaded',
            message: `Successfully loaded ${fetchedDomains.length} domain${fetchedDomains.length !== 1 ? 's' : ''}`,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        toast.info('No ENS names found for this address');
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains');
      
      if (notificationService.shouldNotifyForEvent('transaction')) {
        await notificationService.sendNotification({
          type: 'transaction',
          severity: 'high',
          title: 'Failed to Load Domains',
          message: 'Error loading ENS domains from blockchain',
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSecurityScore = (domain: ENSDomain): number => {
    let score = 50;
    
    if (domain.isWrapped) {
      score += 30;
    }
    
    if (domain.resolver) {
      score += 10;
    }
    
    const days = getDaysUntilExpiration(domain.expiryDate);
    if (days !== null && days > 90) {
      score += 10;
    } else if (days !== null && days < 90 && days > 0) {
      score -= 20;
    } else if (days !== null && days < 0) {
      score -= 30;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const getSecurityIssues = () => {
    const issues: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      domain: string;
      issue: string;
      recommendation: string;
      impact: string;
    }> = [];

    domains.forEach(domain => {
      const days = getDaysUntilExpiration(domain.expiryDate);
      
      if (!domain.isWrapped) {
        issues.push({
          severity: 'critical',
          domain: domain.name,
          issue: 'Domain is not wrapped',
          recommendation: 'Wrap the name and burn CANNOT_UNWRAP fuse',
          impact: 'Domain can be unwrapped, losing all protection'
        });
      }
      
      if (days !== null && days < 0) {
        issues.push({
          severity: 'critical',
          domain: domain.name,
          issue: 'Domain has expired',
          recommendation: 'Renew the domain immediately',
          impact: 'Domain is at risk of being lost'
        });
      }
      
      if (days !== null && days < 90 && days > 0) {
        issues.push({
          severity: 'high',
          domain: domain.name,
          issue: 'Domain expiring soon',
          recommendation: 'Renew the domain before expiration',
          impact: 'Risk of losing domain ownership'
        });
      }
      
      if (!domain.resolver) {
        issues.push({
          severity: 'medium',
          domain: domain.name,
          issue: 'No resolver configured',
          recommendation: 'Set a resolver address',
          impact: 'Cannot resolve domain to addresses or text records'
        });
      }
    });

    return issues;
  };

  const fuseStatus = domains.map(domain => ({
    domain: domain.name,
    fuses: domain.isWrapped ? ['CANNOT_UNWRAP', 'CANNOT_SET_RESOLVER'] : [],
    score: calculateSecurityScore(domain)
  }));

  const securityIssues = getSecurityIssues();

  const overallSecurityScore = domains.length > 0
    ? Math.round(domains.reduce((sum, d) => sum + calculateSecurityScore(d), 0) / domains.length)
    : 0;

  const criticalIssuesCount = securityIssues.filter(i => i.severity === 'critical').length;
  const highIssuesCount = securityIssues.filter(i => i.severity === 'high').length;

  const ownershipAnalysis = domains.map(domain => ({
    domain: domain.name,
    owner: domain.owner,
    controller: 'Not available',
    status: domain.isWrapped ? 'secure' : 'at-risk' as 'secure' | 'at-risk'
  }));

  const recentActivity: Array<{
    timestamp: string;
    domain: string;
    action: string;
    actor: string;
    status: 'success' | 'warning';
  }> = [];

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-slate-900">Security Monitor</h2>
          <p className="text-slate-600">Real-time security posture and threat detection</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Wallet className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Connect Your Wallet</AlertTitle>
          <AlertDescription className="text-blue-800">
            Please connect your wallet to monitor security for your ENS domains.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Security Monitor</h2>
          <p className="text-slate-600">
            {isLoading ? 'Loading...' : `Monitoring ${domains.length} domain${domains.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDomains} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Eye className="h-4 w-4 mr-2" />
            View Full Report
          </Button>
        </div>
      </div>

      {/* Security Score Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Overall Security</CardTitle>
            <Shield className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-slate-900">{overallSecurityScore}/100</div>
                <p className="text-slate-600">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  Average across domains
                </p>
                <Progress value={overallSecurityScore} className="mt-3 h-2" />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Security Issues</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-slate-900">{securityIssues.length}</div>
                <p className="text-slate-600">
                  Total issues found
                </p>
                <div className="mt-3 flex gap-2">
                  {criticalIssuesCount > 0 && (
                    <Badge variant="destructive">Critical: {criticalIssuesCount}</Badge>
                  )}
                  {highIssuesCount > 0 && (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                      High: {highIssuesCount}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Monitored Domains</CardTitle>
            <Activity className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-slate-900">{domains.length}</div>
                <p className="text-slate-600">
                  ENS names in wallet
                </p>
                <p className="text-slate-600 mt-3">
                  {domains.filter(d => d.isWrapped).length} wrapped
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues">Security Issues</TabsTrigger>
          <TabsTrigger value="fuses">Fuse Status</TabsTrigger>
          <TabsTrigger value="ownership">Ownership Analysis</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Security Issues */}
        <TabsContent value="issues">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Security Issues & Recommendations</CardTitle>
              <CardDescription>Prioritized list of security concerns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : securityIssues.length > 0 ? (
                securityIssues.map((issue, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {issue.severity === 'critical' && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                      {issue.severity === 'high' && <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />}
                      {issue.severity === 'medium' && <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />}
                      {issue.severity === 'low' && <Activity className="h-5 w-5 text-slate-600 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-slate-900">{issue.issue}</p>
                          <Badge 
                            variant={
                              issue.severity === 'critical' ? 'destructive' :
                              issue.severity === 'high' ? 'secondary' :
                              issue.severity === 'medium' ? 'default' :
                              'outline'
                            }
                            className={
                              issue.severity === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              issue.severity === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              ''
                            }
                          >
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-slate-600 mb-2">Domain: {issue.domain}</p>
                        <div className="bg-slate-50 p-3 rounded border space-y-1">
                          <p className="text-slate-700">
                            <strong>Recommendation:</strong> {issue.recommendation}
                          </p>
                          <p className="text-slate-600">
                            <strong>Impact:</strong> {issue.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button size="sm">Resolve</Button>
                  </div>
                </div>
                ))
              ) : (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-900">No Security Issues</AlertTitle>
                  <AlertDescription className="text-emerald-800">
                    All your domains are properly configured and secure.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fuse Status */}
        <TabsContent value="fuses">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Fuse Protection Status</CardTitle>
              <CardDescription>Permission burning analysis for wrapped names</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : fuseStatus.length > 0 ? (
                fuseStatus.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-slate-900">{item.domain}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {item.fuses.length > 0 ? (
                          item.fuses.map((fuse, fi) => (
                            <Badge key={fi} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <Lock className="h-3 w-3 mr-1" />
                              {fuse}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            No fuses burned
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-900">Score: {item.score}</div>
                      <Progress value={item.score} className="w-24 h-2 mt-2" />
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>No domains found</AlertTitle>
                  <AlertDescription>
                    No ENS domains found for this wallet address.
                  </AlertDescription>
                </Alert>
              )}

              {fuseStatus.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-900">Recommended Fuses for Critical Contracts:</p>
                  <ul className="text-blue-800 mt-2 space-y-1 ml-4">
                    <li>• <strong>CANNOT_UNWRAP</strong> - Prevents reverting to ERC-721</li>
                    <li>• <strong>CANNOT_SET_RESOLVER</strong> - Locks resolver address</li>
                    <li>• <strong>CANNOT_TRANSFER</strong> - Prevents ownership transfer</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ownership Analysis */}
        <TabsContent value="ownership">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Ownership & Control Analysis</CardTitle>
              <CardDescription>Separation of duties and multisig coverage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : ownershipAnalysis.length > 0 ? (
                ownershipAnalysis.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-900">{item.domain}</p>
                    {item.status === 'secure' ? (
                      <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Secure
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        At Risk
                      </Badge>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-slate-50 p-3 rounded border">
                      <p className="text-slate-600">Owner</p>
                      <p className="text-slate-900">{item.owner}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <p className="text-slate-600">Controller</p>
                      <p className="text-slate-900">{item.controller}</p>
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>No domains found</AlertTitle>
                  <AlertDescription>
                    No ENS domains found for this wallet address.
                  </AlertDescription>
                </Alert>
              )}

              {ownershipAnalysis.length > 0 && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-emerald-900">Best Practice: Separation of Duties</p>
                  <p className="text-emerald-800 mt-1">
                    Owner should be a multisig or governance contract (cold storage). Controller should be a separate operational wallet for day-to-day record management.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity */}
        <TabsContent value="activity">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Monitored transactions and state changes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {activity.status === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />}
                        {activity.status === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-slate-900">{activity.action}</p>
                          <div className="flex items-center gap-3 mt-1 text-slate-600">
                            <span>{activity.domain}</span>
                            <span>•</span>
                            <span>By {activity.actor}</span>
                            <span>•</span>
                            <span>{activity.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </div>
                  </div>
                ))
              ) : (
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertTitle>No recent activity</AlertTitle>
                  <AlertDescription>
                    Transaction history is not available through the current data source.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
