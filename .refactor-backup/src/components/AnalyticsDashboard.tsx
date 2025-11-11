import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Activity,
  Globe,
  GitBranch,
  Zap,
  Database,
  Clock,
  DollarSign,
  Percent,
} from 'lucide-react';

export function AnalyticsDashboard() {
  const networkMetrics = [
    { chain: 'Ethereum', contracts: 23, daos: 12, tvl: '$2.4M', txns24h: 1234, color: 'from-blue-500 to-blue-600' },
    { chain: 'Polygon', contracts: 8, daos: 5, tvl: '$320K', txns24h: 5678, color: 'from-purple-500 to-purple-600' },
    { chain: 'Arbitrum', contracts: 5, daos: 3, tvl: '$180K', txns24h: 892, color: 'from-cyan-500 to-cyan-600' },
    { chain: 'Optimism', contracts: 4, daos: 2, tvl: '$150K', txns24h: 456, color: 'from-red-500 to-red-600' },
    { chain: 'Base', contracts: 3, daos: 1, tvl: '$95K', txns24h: 234, color: 'from-blue-400 to-blue-500' },
  ];

  const topDAOs = [
    { name: 'Company Protocol', ensName: 'company.eth', members: 12453, treasury: '$2.4M', proposals: 87, activity: 98 },
    { name: 'Builder Collective', ensName: 'builders.eth', members: 8234, treasury: '$850K', proposals: 156, activity: 95 },
    { name: 'Research Network', ensName: 'research.eth', members: 5678, treasury: '$1.2M', proposals: 92, activity: 87 },
    { name: 'MetaVerse Guild', ensName: 'metaverse.eth', members: 15234, treasury: '$320K', proposals: 67, activity: 82 },
    { name: 'Climate Coalition', ensName: 'climate.eth', members: 4532, treasury: '$680K', proposals: 38, activity: 79 },
  ];

  const performanceMetrics = [
    { metric: 'Total Value Locked', value: '$3.95M', change: '+12.4%', trend: 'up' as const },
    { metric: 'Active Participants', value: '46,131', change: '+8.7%', trend: 'up' as const },
    { metric: 'Governance Proposals', value: '440', change: '+15.2%', trend: 'up' as const },
    { metric: 'Cross-chain Bridges', value: '3,421', change: '+23.1%', trend: 'up' as const },
    { metric: 'API Calls (24h)', value: '132.4K', change: '+5.3%', trend: 'up' as const },
    { metric: 'Average Gas Fee', value: '12 Gwei', change: '-18.5%', trend: 'down' as const },
  ];

  const integrationMetrics = [
    { name: 'Chainlink Oracles', calls: 45678, uptime: '99.98%', status: 'healthy' },
    { name: 'The Graph Subgraphs', calls: 34567, uptime: '99.94%', status: 'healthy' },
    { name: 'IPFS Storage', calls: 23456, uptime: '99.99%', status: 'healthy' },
    { name: 'Bridge Contracts', calls: 8934, uptime: '99.92%', status: 'healthy' },
    { name: 'Treasury APIs', calls: 12456, uptime: '99.95%', status: 'healthy' },
  ];

  const recentActivity = [
    { time: '2 mins ago', action: 'Proposal Created', dao: 'company.eth', user: '0x742d...35a3' },
    { time: '5 mins ago', action: 'Treasury Transfer', dao: 'vault.company.eth', user: '0x8a2f...91b4' },
    { time: '12 mins ago', action: 'Metadata Updated', dao: 'app.company.eth', user: '0x742d...35a3' },
    { time: '18 mins ago', action: 'Member Joined', dao: 'builders.eth', user: '0x3c4e...7f2a' },
    { time: '25 mins ago', action: 'Vote Cast', dao: 'company.eth', user: '0x9d1a...8c5b' },
    { time: '32 mins ago', action: 'Contract Deployed', dao: 'registry.company.eth', user: '0x742d...35a3' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900">Advanced Analytics</h2>
        <p className="text-slate-600">Comprehensive metrics across all registries and chains</p>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {performanceMetrics.map((metric, index) => (
          <Card key={index} className="border-2">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-slate-600">{metric.metric}</p>
                <div className="flex items-end justify-between">
                  <p className="text-slate-900">{metric.value}</p>
                  <div className={`flex items-center gap-1 ${
                    metric.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>{metric.change}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="networks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="daos">Top DAOs</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Networks Tab */}
        <TabsContent value="networks" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Cross-Chain Distribution</CardTitle>
                <CardDescription>Network activity breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {networkMetrics.map((network, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${network.color}`} />
                        <span className="text-slate-700">{network.chain}</span>
                      </div>
                      <Badge variant="secondary">{network.contracts} contracts</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pl-5">
                      <div>
                        <p className="text-slate-600">DAOs</p>
                        <p className="text-slate-900">{network.daos}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">TVL</p>
                        <p className="text-slate-900">{network.tvl}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Txns/24h</p>
                        <p className="text-slate-900">{network.txns24h.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Network TVL Distribution</CardTitle>
                <CardDescription>Total value locked by chain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {networkMetrics.map((network, index) => {
                  const tvlValue = parseFloat(network.tvl.replace(/[$MK]/g, ''));
                  const tvlMultiplier = network.tvl.includes('M') ? 1000 : 1;
                  const totalTvl = networkMetrics.reduce((sum, n) => {
                    const val = parseFloat(n.tvl.replace(/[$MK]/g, ''));
                    const mult = n.tvl.includes('M') ? 1000 : 1;
                    return sum + (val * mult);
                  }, 0);
                  const percentage = ((tvlValue * tvlMultiplier) / totalTvl) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">{network.chain}</span>
                        <span className="text-slate-900">{network.tvl} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${network.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Network Statistics</CardTitle>
              <CardDescription>Detailed metrics by chain</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead>DAOs</TableHead>
                    <TableHead>TVL</TableHead>
                    <TableHead>Transactions (24h)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {networkMetrics.map((network, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${network.color}`} />
                          <span className="text-slate-900">{network.chain}</span>
                        </div>
                      </TableCell>
                      <TableCell>{network.contracts}</TableCell>
                      <TableCell>{network.daos}</TableCell>
                      <TableCell>{network.tvl}</TableCell>
                      <TableCell>{network.txns24h.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-emerald-600">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top DAOs Tab */}
        <TabsContent value="daos" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Top Performing DAOs</CardTitle>
              <CardDescription>Ranked by activity and participation</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>DAO</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Treasury</TableHead>
                    <TableHead>Proposals</TableHead>
                    <TableHead>Activity Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDAOs.map((dao, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-slate-900">{dao.name}</p>
                          <p className="text-slate-600">{dao.ensName}</p>
                        </div>
                      </TableCell>
                      <TableCell>{dao.members.toLocaleString()}</TableCell>
                      <TableCell>{dao.treasury}</TableCell>
                      <TableCell>{dao.proposals}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-blue-600"
                              style={{ width: `${dao.activity}%` }}
                            />
                          </div>
                          <span className="text-slate-900">{dao.activity}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600">Total DAO Members</p>
                    <p className="text-slate-900 mt-1">
                      {topDAOs.reduce((sum, dao) => sum + dao.members, 0).toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600">Combined Treasury</p>
                    <p className="text-slate-900 mt-1">$5.57M</p>
                  </div>
                  <Wallet className="h-8 w-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600">Total Proposals</p>
                    <p className="text-slate-900 mt-1">
                      {topDAOs.reduce((sum, dao) => sum + dao.proposals, 0)}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Integration Performance</CardTitle>
              <CardDescription>Service health and usage metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integration</TableHead>
                    <TableHead>API Calls (24h)</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrationMetrics.map((integration, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-slate-900">{integration.name}</TableCell>
                      <TableCell>{integration.calls.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="text-emerald-600">{integration.uptime}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-emerald-600">
                          {integration.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Integration Usage</CardTitle>
                <CardDescription>Call distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrationMetrics.map((integration, index) => {
                  const totalCalls = integrationMetrics.reduce((sum, i) => sum + i.calls, 0);
                  const percentage = (integration.calls / totalCalls) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">{integration.name}</span>
                        <span className="text-slate-900">
                          {integration.calls.toLocaleString()} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall platform status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50">
                  <div>
                    <p className="text-emerald-700">Average Uptime</p>
                    <p className="text-emerald-900">99.96%</p>
                  </div>
                  <Activity className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                  <div>
                    <p className="text-blue-700">Total API Calls</p>
                    <p className="text-blue-900">
                      {integrationMetrics.reduce((sum, i) => sum + i.calls, 0).toLocaleString()}
                    </p>
                  </div>
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-purple-50">
                  <div>
                    <p className="text-purple-700">Active Integrations</p>
                    <p className="text-purple-900">{integrationMetrics.length}</p>
                  </div>
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Recent Activity Feed</CardTitle>
              <CardDescription>Real-time updates from all registries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-600">{activity.dao}</span>
                        <span className="text-slate-400">•</span>
                        <code className="text-slate-600">{activity.user}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3 w-3" />
                      <span>{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Growth Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800 space-y-2">
                <p>• DAO registrations increased 23% month-over-month</p>
                <p>• Cross-chain activity up 45% with Arbitrum leading growth</p>
                <p>• Average proposal participation rate: 67% (industry leading)</p>
                <p>• New integration partnerships: +5 this quarter</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-900">Security Highlights</CardTitle>
              </CardHeader>
              <CardContent className="text-emerald-800 space-y-2">
                <p>• 100% of critical contracts use multisig protection</p>
                <p>• Zero security incidents in the last 90 days</p>
                <p>• 94% of contracts verified on block explorers</p>
                <p>• Average audit score: 9.2/10 across all DAOs</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-900">Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent className="text-purple-800 space-y-2">
                <p>• Average member participation: 42% (above industry average)</p>
                <p>• Daily active users up 18% quarter-over-quarter</p>
                <p>• Proposal success rate: 78%</p>
                <p>• Community growth rate: 12% monthly</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">Optimization Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="text-amber-800 space-y-2">
                <p>• Consider expanding to 3 additional L2 networks</p>
                <p>• 5 DAOs eligible for treasury optimization</p>
                <p>• Potential 15% gas savings with batch operations</p>
                <p>• 8 contracts due for security audits next month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
