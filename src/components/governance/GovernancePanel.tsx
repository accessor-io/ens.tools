import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ProposalsView } from './ProposalsView';
import { TreasuryView } from './TreasuryView';
import { BudgetAnalysis } from './BudgetAnalysis';
import { SpendingAnalysis } from './SpendingAnalysis';
import { Grants } from './Grants';

export function GovernancePanel() {
  const _votingPower = {
    total: '150,000 ENS',
    delegated: '100,000 ENS',
    available: '50,000 ENS',
    votingWeight: '0.015%'
  };

  const _activeProposals = [
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

  const _recentVotes = [
    { proposal: 'EP-123: Name Wrapper v2 Deployment', vote: 'For', weight: '50,000 ENS', time: '2 days ago' },
    { proposal: 'EP-122: Grant for Community Tools', vote: 'For', weight: '50,000 ENS', time: '1 week ago' },
    { proposal: 'EP-121: DNS Integration Update', vote: 'Abstain', weight: '0 ENS', time: '2 weeks ago' }
  ];

  const _delegates = [
    { name: 'nick.eth', votingPower: '8.2M ENS', proposals: 23, participation: '94%' },
    { name: 'brantly.eth', votingPower: '6.1M ENS', proposals: 18, participation: '89%' },
    { name: 'validator.dao', votingPower: '4.5M ENS', proposals: 31, participation: '97%' }
  ];

  const _treasuryStats = [
    { label: 'Treasury Balance', value: '$42.3M', change: '+8.2%' },
    { label: 'Registration Revenue (30d)', value: '$1.2M', change: '+12%' },
    { label: 'Grants Allocated', value: '$3.5M', change: 'YTD' },
    { label: 'Community Pool', value: '$8.1M', change: 'Available' }
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="grants">Grants</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals">
          <ProposalsView />
        </TabsContent>

        <TabsContent value="treasury">
          <TreasuryView />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetAnalysis />
        </TabsContent>

        <TabsContent value="spending">
          <SpendingAnalysis />
        </TabsContent>

        <TabsContent value="grants">
          <Grants />
        </TabsContent>
      </Tabs>
    </div>
  );
}
