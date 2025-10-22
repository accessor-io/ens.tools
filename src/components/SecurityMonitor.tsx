import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  Eye
} from 'lucide-react';

export function SecurityMonitor() {
  const fuseStatus = [
    { domain: 'app.company.eth', fuses: ['CANNOT_UNWRAP', 'CANNOT_SET_RESOLVER'], score: 85 },
    { domain: 'dao.company.eth', fuses: ['CANNOT_UNWRAP', 'CANNOT_SET_RESOLVER', 'CANNOT_TRANSFER'], score: 95 },
    { domain: 'vault.company.eth', fuses: ['CANNOT_UNWRAP', 'CANNOT_SET_RESOLVER'], score: 85 },
    { domain: 'dev.company.eth', fuses: [], score: 20 },
    { domain: 'staging.company.eth', fuses: [], score: 20 }
  ];

  const securityIssues = [
    {
      severity: 'critical',
      domain: 'dev.company.eth',
      issue: 'Domain is not wrapped',
      recommendation: 'Wrap the name and burn CANNOT_UNWRAP fuse',
      impact: 'Domain can be unwrapped, losing all protection'
    },
    {
      severity: 'high',
      domain: 'app.company.eth',
      issue: 'Controller is a hot wallet',
      recommendation: 'Delegate controller role to a separate operational wallet',
      impact: 'Single point of failure for record management'
    },
    {
      severity: 'medium',
      domain: 'vault.company.eth',
      issue: 'No ABI record configured',
      recommendation: 'Add contract ABI to improve integration UX',
      impact: 'Reduced discoverability for integrators'
    },
    {
      severity: 'low',
      domain: 'staging.company.eth',
      issue: 'Missing audit trail metadata',
      recommendation: 'Add org.auditor and project.version text records',
      impact: 'Reduced transparency'
    }
  ];

  const ownershipAnalysis = [
    { domain: 'company.eth', owner: 'Gnosis Safe (5/7)', controller: 'Hot Wallet', status: 'secure' },
    { domain: 'app.company.eth', owner: 'Gnosis Safe (3/5)', controller: 'Hot Wallet', status: 'secure' },
    { domain: 'dao.company.eth', owner: 'Timelock Contract', controller: 'DAO Multisig', status: 'secure' },
    { domain: 'vault.company.eth', owner: 'Gnosis Safe (5/7)', controller: 'Hot Wallet', status: 'secure' },
    { domain: 'dev.company.eth', owner: 'EOA', controller: 'EOA', status: 'at-risk' },
    { domain: 'staging.company.eth', owner: 'EOA', controller: 'EOA', status: 'at-risk' }
  ];

  const recentActivity = [
    {
      timestamp: '2 hours ago',
      domain: 'app.company.eth',
      action: 'Text record updated',
      actor: '0x742d...35a3',
      status: 'success'
    },
    {
      timestamp: '1 day ago',
      domain: 'dao.company.eth',
      action: 'Fuse burned: CANNOT_TRANSFER',
      actor: '0xdD87...2148',
      status: 'success'
    },
    {
      timestamp: '2 days ago',
      domain: 'vault.company.eth',
      action: 'Resolver changed',
      actor: '0x5830...0225',
      status: 'warning'
    },
    {
      timestamp: '3 days ago',
      domain: 'app.company.eth',
      action: 'Address record updated',
      actor: '0x742d...35a3',
      status: 'success'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Security Monitor</h2>
          <p className="text-slate-600">Real-time security posture and threat detection</p>
        </div>
        <Button>
          <Eye className="h-4 w-4 mr-2" />
          View Full Report
        </Button>
      </div>

      {/* Security Score Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Overall Security</CardTitle>
            <Shield className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">87/100</div>
            <p className="text-slate-600">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +5 from last month
            </p>
            <Progress value={87} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Critical Issues</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">2</div>
            <p className="text-slate-600">
              Require immediate attention
            </p>
            <div className="mt-3 flex gap-2">
              <Badge variant="destructive">Critical: 1</Badge>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">High: 1</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Monitored Events</CardTitle>
            <Activity className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">127</div>
            <p className="text-slate-600">
              In the last 30 days
            </p>
            <p className="text-slate-600 mt-3">
              4 flagged for review
            </p>
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
              {securityIssues.map((issue, index) => (
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
              ))}
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
              {fuseStatus.map((item, index) => (
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
              ))}

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-900">Recommended Fuses for Critical Contracts:</p>
                <ul className="text-blue-800 mt-2 space-y-1 ml-4">
                  <li>• <strong>CANNOT_UNWRAP</strong> - Prevents reverting to ERC-721</li>
                  <li>• <strong>CANNOT_SET_RESOLVER</strong> - Locks resolver address</li>
                  <li>• <strong>CANNOT_TRANSFER</strong> - Prevents ownership transfer</li>
                </ul>
              </div>
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
              {ownershipAnalysis.map((item, index) => (
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
              ))}

              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <p className="text-emerald-900">Best Practice: Separation of Duties</p>
                <p className="text-emerald-800 mt-1">
                  Owner should be a multisig or governance contract (cold storage). Controller should be a separate operational wallet for day-to-day record management.
                </p>
              </div>
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
              {recentActivity.map((activity, index) => (
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
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
