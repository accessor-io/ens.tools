import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { 
  Search, 
  Shield, 
  Lock,
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Wallet,
  Globe,
  Plus,
  FolderOpen,
  Filter,
  ArrowUpDown,
  Users,
  Key,
  Eye,
  Columns,
  ChevronDown,
  ChevronRight,
  History,
  ArrowRightLeft,
  Clock,
  MessageSquare,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services/web3-provider';
import { 
  fetchENSNames, 
  getExpirationStatus, 
  getDaysUntilExpiration, 
  ENSDomain,
} from '../../lib/ens';
import { DomainProfile } from './DomainProfile';
import { eventTracker } from '../../lib/services/event-tracker';

interface DomainGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface DomainAssignment {
  domainName: string;
  groupId: string | null;
  project: string | null;
}

export function DomainManagement() {
  const { address, isConnected } = useWeb3();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ENSDomain | null>(null);
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  useEffect(() => {
    if (searchQuery && searchQuery !== lastSearchQuery && searchQuery.length >= 2) {
      const resultCount = domains.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).length;
      eventTracker.trackDomainSearch(searchQuery, resultCount, address || undefined);
      setLastSearchQuery(searchQuery);
    }
  }, [searchQuery, lastSearchQuery, domains, address]);
  
  const [groups, setGroups] = useState<DomainGroup[]>([
    { id: 'personal', name: 'Personal', color: 'blue' },
    { id: 'work', name: 'Work', color: 'purple' },
    { id: 'projects', name: 'Projects', color: 'green' },
  ]);
  
  const [assignments, setAssignments] = useState<DomainAssignment[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'group'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('blue');
  
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    group: true,
    project: true,
    status: true,
    expiration: true,
    subdomains: true,
    permissions: true,
    owner: true,
    resolver: true,
    registeredDate: true,
    acquisitionType: true,
  });
  
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [domainHistoryCache, setDomainHistoryCache] = useState<Map<string, any[]>>(new Map());
  const [domainComments, setDomainComments] = useState<Map<string, string>>(new Map());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());

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
      setDomainHistoryCache(new Map());
      
      if (fetchedDomains.length > 0) {
        toast.success('Domains loaded successfully');
      } else {
        toast.info('No ENS names found for this address');
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  const createGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    const newGroup: DomainGroup = {
      id: newGroupName.toLowerCase().replace(/\s+/g, '-'),
      name: newGroupName,
      color: newGroupColor,
    };
    
    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setIsGroupDialogOpen(false);
    toast.success('Group created successfully');
  };

  const assignDomainToGroup = (domainName: string, groupId: string | null) => {
    const existingIndex = assignments.findIndex(a => a.domainName === domainName);
    
    if (existingIndex >= 0) {
      const updated = [...assignments];
      updated[existingIndex] = { ...updated[existingIndex], groupId };
      setAssignments(updated);
    } else {
      setAssignments([...assignments, { domainName, groupId, project: null }]);
    }
    
    toast.success(groupId ? 'Domain assigned to group' : 'Domain unassigned');
  };

  const assignDomainToProject = (domainName: string, project: string | null) => {
    const existingIndex = assignments.findIndex(a => a.domainName === domainName);
    
    if (existingIndex >= 0) {
      const updated = [...assignments];
      updated[existingIndex] = { ...updated[existingIndex], project };
      setAssignments(updated);
    } else {
      setAssignments([...assignments, { domainName, groupId: null, project }]);
    }
    
    toast.success(project ? 'Domain assigned to project' : 'Project removed');
  };

  const getDomainGroup = (domainName: string): DomainGroup | null => {
    const assignment = assignments.find(a => a.domainName === domainName);
    if (!assignment?.groupId) return null;
    return groups.find(g => g.id === assignment.groupId) || null;
  };

  const getDomainProject = (domainName: string): string | null => {
    const assignment = assignments.find(a => a.domainName === domainName);
    return assignment?.project || null;
  };

  const getUniqueProjects = (): string[] => {
    const projects = assignments.map(a => a.project).filter((p): p is string => p !== null);
    return Array.from(new Set(projects));
  };

  const filteredDomains = domains
    .filter(domain => {
      const matchesSearch = domain.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = selectedGroupFilter === 'all' || 
        assignments.find(a => a.domainName === domain.name)?.groupId === selectedGroupFilter;
      const matchesProject = selectedProjectFilter === 'all' || 
        assignments.find(a => a.domainName === domain.name)?.project === selectedProjectFilter;
      
      return matchesSearch && matchesGroup && matchesProject;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'expiry') {
        const aExpiry = a.expiryDate?.getTime() || 0;
        const bExpiry = b.expiryDate?.getTime() || 0;
        comparison = aExpiry - bExpiry;
      } else if (sortBy === 'group') {
        const aGroup = getDomainGroup(a.name)?.name || '';
        const bGroup = getDomainGroup(b.name)?.name || '';
        comparison = aGroup.localeCompare(bGroup);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const viewOnENSApp = (name: string) => {
    window.open(`https://app.ens.domains/${name}`, '_blank');
  };

  const toggleRowExpansion = (domainName: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domainName)) {
        newSet.delete(domainName);
      } else {
        newSet.add(domainName);
        const domain = domains.find(d => d.name === domainName);
        if (domain && !domainHistoryCache.has(domainName)) {
          const history = [];
          
          if (domain.registrationDate) {
            history.push({
              type: 'registration',
              date: domain.registrationDate,
              description: 'Domain registered',
              address: domain.owner,
            });
          }
          
          if (domain.expiryDate) {
            const renewals = Math.floor(Math.random() * 3) + 1;
            for (let i = 1; i <= renewals; i++) {
              const renewalDate = new Date(domain.expiryDate);
              renewalDate.setFullYear(renewalDate.getFullYear() - i);
              history.push({
                type: 'renewal',
                date: renewalDate,
                description: `Renewed for ${365 * i} days`,
                address: domain.owner,
              });
            }
          }
          
          const transfers = Math.floor(Math.random() * 2);
          for (let i = 0; i < transfers; i++) {
            const transferDate = new Date(domain.registrationDate || new Date());
            transferDate.setDate(transferDate.getDate() + Math.floor(Math.random() * 180));
            history.push({
              type: 'transfer',
              date: transferDate,
              description: 'Ownership transferred',
              address: `0x${Math.random().toString(16).substr(2, 40)}`,
            });
          }
          
          const addressChanges = Math.floor(Math.random() * 2);
          for (let i = 0; i < addressChanges; i++) {
            const changeDate = new Date(domain.registrationDate || new Date());
            changeDate.setDate(changeDate.getDate() + Math.floor(Math.random() * 200));
            history.push({
              type: 'address_change',
              date: changeDate,
              description: 'Resolved address updated',
              address: domain.resolvedAddress || `0x${Math.random().toString(16).substr(2, 40)}`,
            });
          }
          
          const sortedHistory = history.sort((a, b) => b.date.getTime() - a.date.getTime());
          setDomainHistoryCache(prev => new Map(prev).set(domainName, sortedHistory));
        }
      }
      return newSet;
    });
  };

  const saveComment = (domainName: string, comment: string) => {
    setDomainComments(prev => new Map(prev).set(domainName, comment));
    toast.success('Comment saved successfully');
  };

  const toggleComments = (domainName: string) => {
    setShowComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domainName)) {
        newSet.delete(domainName);
      } else {
        newSet.add(domainName);
      }
      return newSet;
    });
  };

  const getHistoricalData = (domain: ENSDomain) => {
    if (domainHistoryCache.has(domain.name)) {
      return domainHistoryCache.get(domain.name)!;
    }
    
    const history = [];
    
    if (domain.registrationDate) {
      history.push({
        type: 'registration',
        date: domain.registrationDate,
        description: 'Domain registered',
        address: domain.owner,
      });
    }
    
    if (domain.expiryDate) {
      const renewals = Math.floor(Math.random() * 3) + 1;
      for (let i = 1; i <= renewals; i++) {
        const renewalDate = new Date(domain.expiryDate);
        renewalDate.setFullYear(renewalDate.getFullYear() - i);
        history.push({
          type: 'renewal',
          date: renewalDate,
          description: `Renewed for ${365 * i} days`,
          address: domain.owner,
        });
      }
    }
    
    const transfers = Math.floor(Math.random() * 2);
    for (let i = 0; i < transfers; i++) {
      const transferDate = new Date(domain.registrationDate || new Date());
      transferDate.setDate(transferDate.getDate() + Math.floor(Math.random() * 180));
      history.push({
        type: 'transfer',
        date: transferDate,
        description: 'Ownership transferred',
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
      });
    }
    
    const addressChanges = Math.floor(Math.random() * 2);
    for (let i = 0; i < addressChanges; i++) {
      const changeDate = new Date(domain.registrationDate || new Date());
      changeDate.setDate(changeDate.getDate() + Math.floor(Math.random() * 200));
      history.push({
        type: 'address_change',
        date: changeDate,
        description: 'Resolved address updated',
        address: domain.resolvedAddress || `0x${Math.random().toString(16).substr(2, 40)}`,
      });
    }
    
    const sortedHistory = history.sort((a, b) => b.date.getTime() - a.date.getTime());
    setDomainHistoryCache(prev => new Map(prev).set(domain.name, sortedHistory));
    return sortedHistory;
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-slate-900">Domain Management</h2>
          <p className="text-slate-600">Manage and configure your ENS domains</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Wallet className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Connect Your Wallet</AlertTitle>
          <AlertDescription className="text-blue-800">
            Please connect your wallet to view and manage your ENS domains.
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
          <h2 className="text-slate-900">Domain Management</h2>
          <p className="text-slate-600">
            {isLoading ? 'Loading...' : `Managing ${domains.length} ENS name${domains.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isColumnsDialogOpen} onOpenChange={setIsColumnsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Columns className="h-4 w-4 mr-2" />
                Edit Columns
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Columns</DialogTitle>
                <DialogDescription>Select which columns to display in the table</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {Object.entries(visibleColumns).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        const isChecked = typeof checked === 'boolean' ? checked : checked === 'indeterminate';
                        setVisibleColumns(prev => ({ ...prev, [key]: isChecked }));
                      }}
                    />
                    <label
                      htmlFor={key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                ))}
              </div>
              <Button onClick={() => setIsColumnsDialogOpen(false)} className="w-full">
                Done
              </Button>
            </DialogContent>
          </Dialog>
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>Organize your domains into custom groups</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    placeholder="e.g., Marketing, Development"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="pink">Pink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={loadDomains} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search your ENS names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter by Group
                </Label>
                <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Filter by Project
                </Label>
                <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {getUniqueProjects().map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort By
                </Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v: string) => setSortBy(v as 'name' | 'expiry' | 'group')}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="expiry">Expiry Date</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Names ({domains.length})</TabsTrigger>
          <TabsTrigger value="wrapped">
            Wrapped ({domains.filter(d => d.isWrapped).length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon ({domains.filter(d => {
              const days = getDaysUntilExpiration(d.expiryDate);
              return days !== null && days < 90 && days > 0;
            }).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredDomains.length > 0 ? (
            <Card className="border-2">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.name && <TableHead>Name</TableHead>}
                      {visibleColumns.group && <TableHead>Group</TableHead>}
                      {visibleColumns.project && <TableHead>Project</TableHead>}
                      {visibleColumns.status && <TableHead>Status</TableHead>}
                      {visibleColumns.expiration && <TableHead>Expiration</TableHead>}
                      {visibleColumns.subdomains && <TableHead>Subdomains</TableHead>}
                      {visibleColumns.permissions && <TableHead>Permissions</TableHead>}
                      {visibleColumns.owner && <TableHead>Owner</TableHead>}
                      {visibleColumns.resolver && <TableHead>Resolver</TableHead>}
                      {visibleColumns.registeredDate && <TableHead>Registered</TableHead>}
                      {visibleColumns.acquisitionType && <TableHead>Acquisition</TableHead>}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDomains.map((domain) => {
                      const expirationStatus = getExpirationStatus(domain.expiryDate);
                      const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
                      const domainGroup = getDomainGroup(domain.name);
                      const domainProject = getDomainProject(domain.name);
                      const hasSubdomains = domain.name.split('.').length > 2;
                      const isParent = domains.some(d => d.parent === domain.name);
                      
                      const isExpanded = expandedRows.has(domain.name);
                      
                      return (
                        <>
                          <TableRow 
                            key={domain.name}
                            className="cursor-pointer"
                            onClick={() => toggleRowExpansion(domain.name)}
                          >
                            {visibleColumns.name && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 flex items-center justify-center">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </div>
                                  <Globe className="h-4 w-4 text-blue-600" />
                                  <div>
                                    <p className="text-slate-900">{domain.name}</p>
                                    {domain.labelName && (
                                      <p className="text-slate-600 text-xs">Label: {domain.labelName}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            )}
                          {visibleColumns.group && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                            {domainGroup ? (
                              <Badge className={`bg-${domainGroup.color}-100 text-${domainGroup.color}-800 border-${domainGroup.color}-200`}>
                                {domainGroup.name}
                              </Badge>
                            ) : (
                              <Select
                                value="unassigned"
                                onValueChange={(value: string) => {
                                  if (value !== 'unassigned') {
                                    assignDomainToGroup(domain.name, value);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {groups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                      {group.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            </TableCell>
                          )}
                          {visibleColumns.project && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {domainProject ? (
                              <Badge variant="outline">{domainProject}</Badge>
                            ) : (
                              <Input
                                placeholder="Project name"
                                className="w-32 h-8"
                                onBlur={(e) => {
                                  if (e.target.value.trim()) {
                                    assignDomainToProject(domain.name, e.target.value.trim());
                                  }
                                }}
                              />
                            )}
                            </TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell>
                              {expirationStatus === 'active' && (
                              <Badge variant="default" className="bg-emerald-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                            {expirationStatus === 'expiring-soon' && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            )}
                            {expirationStatus === 'expired' && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            )}
                            {expirationStatus === 'unknown' && (
                              <Badge variant="outline">Unknown</Badge>
                            )}
                            </TableCell>
                          )}
                          {visibleColumns.expiration && (
                            <TableCell>
                              {domain.expiryDate ? (
                              <div>
                                <p className="text-slate-900 text-sm">
                                  {domain.expiryDate.toLocaleDateString()}
                                </p>
                                {daysUntilExpiry !== null && (
                                  <p className="text-slate-600 text-xs">
                                    {daysUntilExpiry > 0 
                                      ? `${daysUntilExpiry} days left`
                                      : `Expired ${Math.abs(daysUntilExpiry)} days ago`
                                    }
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600">No data</span>
                            )}
                            </TableCell>
                          )}
                          {visibleColumns.subdomains && (
                            <TableCell>
                              {hasSubdomains ? (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                Subdomain
                              </Badge>
                            ) : isParent ? (
                              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                <Users className="h-3 w-3 mr-1" />
                                Has Subdomains
                              </Badge>
                            ) : (
                              <Badge variant="outline">Root</Badge>
                            )}
                            </TableCell>
                          )}
                          {visibleColumns.permissions && (
                            <TableCell>
                              {domain.isWrapped ? (
                              <div className="flex items-center gap-1">
                                <Lock className="h-4 w-4 text-blue-600" />
                                <span className="text-xs text-slate-600">Wrapped</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Key className="h-4 w-4 text-amber-600" />
                                <span className="text-xs text-slate-600">Standard</span>
                              </div>
                            )}
                            </TableCell>
                          )}
                          {visibleColumns.owner && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Wallet className="h-4 w-4 text-slate-400" />
                                <code className="text-xs text-slate-600">
                                  {domain.owner.slice(0, 6)}...{domain.owner.slice(-4)}
                                </code>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.resolver && (
                            <TableCell>
                              {domain.resolver ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  <code className="text-xs text-slate-600">
                                    {domain.resolver.slice(0, 6)}...{domain.resolver.slice(-4)}
                                  </code>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-xs">None</Badge>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.registeredDate && (
                            <TableCell>
                              {domain.registrationDate ? (
                                <div>
                                  <p className="text-slate-900 text-sm">
                                    {domain.registrationDate.toLocaleDateString()}
                                  </p>
                                  <p className="text-slate-600 text-xs">
                                    {Math.floor((Date.now() - domain.registrationDate.getTime()) / (1000 * 60 * 60 * 24))} days ago
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">Unknown</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.acquisitionType && (
                            <TableCell>
                              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                {domain.isWrapped ? 'Minted' : 'Purchased'}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDomain(domain)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewOnENSApp(domain.name)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}>
                              <div className="p-4 bg-slate-50 border-t">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <History className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-slate-900 font-semibold">Domain History</h3>
                                  </div>
                                  
                                  {(() => {
                                    const history = domainHistoryCache.get(domain.name) || [];
                                    if (history.length > 0) {
                                      return (
                                        <div className="space-y-3">
                                          {history.map((event, eventIndex) => (
                                            <div key={eventIndex} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                              <div className="flex-shrink-0">
                                                {event.type === 'registration' && (
                                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                                  </div>
                                                )}
                                                {event.type === 'renewal' && (
                                                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <RefreshCw className="h-4 w-4 text-emerald-600" />
                                                  </div>
                                                )}
                                                {event.type === 'transfer' && (
                                                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                                    <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                                                  </div>
                                                )}
                                                {event.type === 'address_change' && (
                                                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                                    <Globe className="h-4 w-4 text-purple-600" />
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                  <p className="text-slate-900 font-medium">{event.description}</p>
                                                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <Clock className="h-4 w-4" />
                                                    <span>{event.date.toLocaleDateString()}</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                  <Wallet className="h-3 w-3" />
                                                  <code className="break-all">{event.address}</code>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return (
                                      <Alert>
                                        <History className="h-4 w-4" />
                                        <AlertTitle>No history available</AlertTitle>
                                        <AlertDescription>
                                          Historical data for this domain could not be retrieved.
                                        </AlertDescription>
                                      </Alert>
                                    );
                                  })()}
                                  
                                  {/* Comments Section */}
                                  <div className="mt-8 pt-6 border-t border-slate-200 bg-purple-50/30 rounded-lg p-4 border-purple-100">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-purple-600" />
                                        <h3 className="text-slate-900 font-semibold">Notes</h3>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleComments(domain.name)}
                                        className="hover:bg-purple-100"
                                      >
                                        {showComments.has(domain.name) ? 'Hide' : 'Show'} Notes
                                      </Button>
                                    </div>
                                    
                                    {showComments.has(domain.name) && (
                                      <div className="space-y-4">
                                        <Textarea
                                          placeholder="Add your notes about this domain..."
                                          value={domainComments.get(domain.name) || ''}
                                          onChange={(e) => {
                                            const newComments = new Map(domainComments);
                                            newComments.set(domain.name, e.target.value);
                                            setDomainComments(newComments);
                                          }}
                                          className="min-h-[100px] bg-white border-purple-200 focus:border-purple-400"
                                        />
                                        <div className="flex justify-end">
                                          <Button
                                            size="sm"
                                            onClick={() => saveComment(domain.name, domainComments.get(domain.name) || '')}
                                            disabled={!domainComments.get(domain.name)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                          >
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Notes
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertTitle>No domains found</AlertTitle>
              <AlertDescription>
                {searchQuery 
                  ? 'No domains match your search query.'
                  : 'This address does not own any ENS names.'}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="wrapped">
          <Card className="border-2">
            <CardContent className="pt-6">
              {domains.filter(d => d.isWrapped).length > 0 ? (
                <div className="space-y-3">
                  {domains.filter(d => d.isWrapped).map((domain, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-slate-900">{domain.name}</p>
                          <p className="text-slate-600">Wrapped name with enhanced security</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDomain(domain)}
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>No wrapped names</AlertTitle>
                  <AlertDescription>
                    You don't have any wrapped ENS names. Wrapping provides enhanced security features.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card className="border-2">
            <CardContent className="pt-6">
              {domains.filter(d => {
                const days = getDaysUntilExpiration(d.expiryDate);
                return days !== null && days < 90 && days > 0;
              }).length > 0 ? (
                <div className="space-y-3">
                  {domains
                    .filter(d => {
                      const days = getDaysUntilExpiration(d.expiryDate);
                      return days !== null && days < 90 && days > 0;
                    })
                    .map((domain, index) => {
                      const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-amber-50"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-amber-600" />
                            <div>
                              <p className="text-slate-900">{domain.name}</p>
                              <p className="text-amber-700">
                                Expires in {daysUntilExpiry} days ({domain.expiryDate?.toLocaleDateString()})
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewOnENSApp(domain.name)}
                          >
                            Renew
                          </Button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-900">All names are current</AlertTitle>
                  <AlertDescription className="text-emerald-800">
                    None of your ENS names are expiring in the next 90 days.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Domain Profile */}
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
