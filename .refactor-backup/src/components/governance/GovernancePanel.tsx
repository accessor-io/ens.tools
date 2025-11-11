import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Vote, 
  TrendingUp, 
  CheckCircle2,
  Clock,
  Users,
  DollarSign,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';

export function GovernancePanel() {
  const votingPower = {
    total: '150,000 ENS',
    delegated: '100,000 ENS',
    available: '50,000 ENS',
    votingWeight: '0.015%'
  };

  const activeProposals = [
    {
      id: 'EP-124',
      title: 'Update .eth Registrar Controller',
      description: 'Upgrade the registrar controller to support gasless renewals',
      status: 'active',
      forVotes: '4.2M ENS',
      againstVotes: '0.3M ENS',
      quorum: '1M ENS',
      endsIn: '3 days',
      support: 93
    },
    {
      id: 'EP-125',
      title: 'Treasury Diversification Strategy',
      description: 'Allocate 20% of treasury to stable yield-generating protocols',
      status: 'active',
      forVotes: '2.8M ENS',
      againstVotes: '1.1M ENS',
      quorum: '1M ENS',
      endsIn: '5 days',
      support: 72
    },
    {
      id: 'EP-126',
      title: 'Fee Structure Adjustment for Short Names',
      description: 'Reduce annual fees for 3-character .eth names from $640 to $320',
      status: 'active',
      forVotes: '3.5M ENS',
      againstVotes: '0.8M ENS',
      quorum: '1M ENS',
      endsIn: '7 days',
      support: 81
    }
  ];

  const recentVotes = [
    { proposal: 'EP-123: Name Wrapper v2 Deployment', vote: 'For', weight: '50,000 ENS', time: '2 days ago' },
    { proposal: 'EP-122: Grant for Community Tools', vote: 'For', weight: '50,000 ENS', time: '1 week ago' },
    { proposal: 'EP-121: DNS Integration Update', vote: 'Abstain', weight: '0 ENS', time: '2 weeks ago' }
  ];

  const delegates = [
    { name: 'nick.eth', votingPower: '8.2M ENS', proposals: 23, participation: '94%' },
    { name: 'brantly.eth', votingPower: '6.1M ENS', proposals: 18, participation: '89%' },
    { name: 'validator.dao', votingPower: '4.5M ENS', proposals: 31, participation: '97%' }
  ];

  const treasuryStats = [
    { label: 'Treasury Balance', value: '$42.3M', change: '+8.2%' },
    { label: 'Registration Revenue (30d)', value: '$1.2M', change: '+12%' },
    { label: 'Grants Allocated', value: '$3.5M', change: 'YTD' },
    { label: 'Community Pool', value: '$8.1M', change: 'Available' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Governance Dashboard</h2>
          <p className="text-slate-600">ENS DAO participation and voting analytics</p>
        </div>
        <Button>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open ENS Constitution
        </Button>
      </div>

      {/* Voting Power Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Total ENS Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{votingPower.total}</div>
            <p className="text-slate-600">{votingPower.votingWeight} of total supply</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Delegated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{votingPower.delegated}</div>
            <p className="text-slate-600">To 3 delegates</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Available to Vote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{votingPower.available}</div>
            <p className="text-slate-600">Self-delegated</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Participation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">87%</div>
            <p className="text-slate-600">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Last 10 proposals
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Proposals</TabsTrigger>
          <TabsTrigger value="history">Voting History</TabsTrigger>
          <TabsTrigger value="delegates">Delegates</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
        </TabsList>

        {/* Active Proposals */}
        <TabsContent value="active">
          <div className="space-y-4">
            {activeProposals.map((proposal, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
                          {proposal.id}
                        </Badge>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {proposal.endsIn}
                        </Badge>
                      </div>
                      <CardTitle>{proposal.title}</CardTitle>
                      <CardDescription className="mt-2">{proposal.description}</CardDescription>
                    </div>
                    <Button>
                      <Vote className="h-4 w-4 mr-2" />
                      Vote
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Support: {proposal.support}%</span>
                      <span>{proposal.forVotes} FOR / {proposal.againstVotes} AGAINST</span>
                    </div>
                    <Progress value={proposal.support} className="h-2" />
                    <p className="text-slate-600">Quorum: {proposal.quorum} (Reached ✓)</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Button variant="outline" className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                      Vote For
                    </Button>
                    <Button variant="outline" className="w-full">
                      Vote Against
                    </Button>
                    <Button variant="outline" className="w-full">
                      Abstain
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Voting History */}
        <TabsContent value="history">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Your Voting History</CardTitle>
              <CardDescription>Recent governance participation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentVotes.map((vote, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-slate-900">{vote.proposal}</p>
                    <div className="flex items-center gap-3 mt-1 text-slate-600">
                      <span>{vote.weight}</span>
                      <span>•</span>
                      <span>{vote.time}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={vote.vote === 'For' ? 'default' : 'secondary'}
                    className={vote.vote === 'For' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                  >
                    {vote.vote}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delegates */}
        <TabsContent value="delegates">
          <div className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Your Delegations</CardTitle>
                <CardDescription>ENS tokens delegated to representatives</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {delegates.map((delegate, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-slate-900">{delegate.name}</p>
                        <p className="text-slate-600">{delegate.votingPower} total voting power</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Undelegate
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="bg-slate-50 p-3 rounded border">
                        <p className="text-slate-600">Proposals Voted</p>
                        <p className="text-slate-900">{delegate.proposals}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border">
                        <p className="text-slate-600">Participation</p>
                        <p className="text-slate-900">{delegate.participation}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border">
                        <Button variant="ghost" size="sm" className="w-full">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full">
              <Users className="h-4 w-4 mr-2" />
              Browse All Delegates
            </Button>
          </div>
        </TabsContent>

        {/* Treasury */}
        <TabsContent value="treasury">
          <div className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {treasuryStats.map((stat, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="space-y-0 pb-2">
                    <CardTitle>{stat.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-slate-900">{stat.value}</div>
                    <p className="text-slate-600 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Treasury Management</CardTitle>
                <CardDescription>DAO-controlled funds and allocations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-700">ETH Holdings</span>
                      <span className="text-slate-900">12,450 ETH ($28.2M)</span>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-700">USDC Stablecoin</span>
                      <span className="text-slate-900">$10.1M</span>
                    </div>
                    <Progress value={24} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-700">Other Assets</span>
                      <span className="text-slate-900">$4.0M</span>
                    </div>
                    <Progress value={9} className="h-2" />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-900">Recent Treasury Activity</p>
                  <ul className="text-blue-800 mt-2 space-y-1">
                    <li>• $500K grant approved for ecosystem development</li>
                    <li>• $200K allocated to security audits</li>
                    <li>• $1.2M generated from registrations this month</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
