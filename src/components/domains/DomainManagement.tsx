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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
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
  Settings as SettingsIcon,
  FileEdit,
  Zap,
  Link as LinkIcon,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services/web3-provider';
import { historyCacheService } from '../../lib/services';
import { 
  fetchENSNames, 
  getExpirationStatus, 
  getDaysUntilExpiration, 
  ENSDomain,
  fetchDomainHistory,
  DomainHistoryEvent,
  generateBasicHistory,
} from '../../lib/ens/ens-utils';
import { wrapName, unwrapName } from '../../lib/ens';
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
  const { address, isConnected, walletClient, publicClient } = useWeb3();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ENSDomain | null>(null);
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [processingDomain, setProcessingDomain] = useState<string | null>(null);

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
  const [domainHistoryCache, setDomainHistoryCache] = useState<Map<string, DomainHistoryEvent[]>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

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
      
      // Don't clear history cache - keep it persistent
      // The cache has 7-day expiry, so old data will be refreshed automatically
      
      if (fetchedDomains.length > 0) {
        toast.success('Domains loaded successfully');
      } else {
        toast.info('No ENS names found for this address');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load domains';
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains', {
        description: errorMessage.length < 100 ? errorMessage : undefined,
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
      const errorMessage = error?.message || 'Please try again';
      toast.error('Failed to wrap domain', {
        description: errorMessage.length < 100 ? errorMessage : 'Please check your wallet and try again',
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
      const errorMessage = error?.message || 'Please try again';
      toast.error('Failed to unwrap domain', {
        description: errorMessage.length < 100 ? errorMessage : 'Please check your wallet and try again',
      });
    } finally {
      setProcessingDomain(null);
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
    eventTracker.trackGroupCreated(newGroup.id, newGroup.name, address || undefined);
    setNewGroupName('');
    setIsGroupDialogOpen(false);
    toast.success('Group created successfully');
  };

  const assignDomainToGroup = (domainName: string, groupId: string | null) => {
    const existingIndex = assignments.findIndex(a => a.domainName === domainName);
    const previousGroupId = existingIndex >= 0 ? assignments[existingIndex].groupId : null;
    
    if (existingIndex >= 0) {
      const updated = [...assignments];
      updated[existingIndex] = { ...updated[existingIndex], groupId };
      setAssignments(updated);
    } else {
      setAssignments([...assignments, { domainName, groupId, project: null }]);
    }
    
    // Log group changes
    if (groupId) {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        if (previousGroupId && previousGroupId !== groupId) {
          // Changing from one group to another
          const previousGroup = groups.find(g => g.id === previousGroupId);
          eventTracker.track({
            type: 'domain_grouped',
            address: address || undefined,
            domain: domainName,
            data: { 
              groupId, 
              groupName: group.name, 
              previousGroupId, 
              previousGroupName: previousGroup?.name 
            },
          });
        } else {
          // Assigning to a new group (no previous group)
          eventTracker.trackDomainGroup(domainName, groupId, group.name, address || undefined);
        }
      }
    } else if (previousGroupId) {
      // Unassigning from a group
      const previousGroup = groups.find(g => g.id === previousGroupId);
      if (previousGroup) {
        eventTracker.track({
          type: 'domain_grouped',
          address: address || undefined,
          domain: domainName,
          data: { groupId: null, groupName: null, previousGroupId, previousGroupName: previousGroup.name },
        });
      }
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

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const refreshDomainHistory = (domainName: string) => {
    // Clear cached history for this domain to force refresh
    historyCacheService.clearHistory(domainName);
    setDomainHistoryCache(prev => {
      const newMap = new Map(prev);
      newMap.delete(domainName);
      return newMap;
    });
    
    // Now fetch fresh data
    const domain = domains.find(d => d.name === domainName);
    if (domain) {
      fetchDomainHistory(domainName).then(history => {
        // If no history from Graph API, generate basic history
        if (history.length === 0) {
          history = generateBasicHistory(domain);
        }
        
        // Cache the history
        if (history.length > 0) {
          historyCacheService.cacheHistory(domainName, history);
        }
        
        setDomainHistoryCache(prev => new Map(prev).set(domainName, history));
      }).catch(error => {
        console.error('Error refreshing history:', error);
        const basicHistory = generateBasicHistory(domain);
        historyCacheService.cacheHistory(domainName, basicHistory);
        setDomainHistoryCache(prev => new Map(prev).set(domainName, basicHistory));
      });
    }
  };

  const toggleRowExpansion = async (domainName: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domainName)) {
        newSet.delete(domainName);
      } else {
        newSet.add(domainName);
        if (!domainHistoryCache.has(domainName) && !loadingHistory.has(domainName)) {
          // Check cache first
          const cachedHistory = historyCacheService.getCachedHistory(domainName);
          if (cachedHistory && cachedHistory.length > 0) {
            setDomainHistoryCache(prev => new Map(prev).set(domainName, cachedHistory));
            return newSet;
          }

          // If not in cache, fetch from API
          setLoadingHistory(prev => new Set(prev).add(domainName));
          fetchDomainHistory(domainName).then(history => {
            // If no history from Graph API, try to generate basic history from domain data
            if (history.length === 0) {
              const domain = domains.find(d => d.name === domainName);
              if (domain) {
                history = generateBasicHistory(domain);
              }
            }
            
            // Always cache the history - it persists for 7 days
            if (history.length > 0) {
              historyCacheService.cacheHistory(domainName, history);
            }
            
            setDomainHistoryCache(prev => new Map(prev).set(domainName, history));
            setLoadingHistory(prev => {
              const newSet = new Set(prev);
              newSet.delete(domainName);
              return newSet;
            });
          }).catch(error => {
            console.error('Error loading history for', domainName, ':', error);
            // Fallback to basic history on error
            const domain = domains.find(d => d.name === domainName);
            if (domain) {
              const basicHistory = generateBasicHistory(domain);
              historyCacheService.cacheHistory(domainName, basicHistory);
              setDomainHistoryCache(prev => new Map(prev).set(domainName, basicHistory));
            }
            setLoadingHistory(prev => {
              const newSet = new Set(prev);
              newSet.delete(domainName);
              return newSet;
            });
          });
        }
      }
      return newSet;
    });
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
                            className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <FolderOpen className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {groups.map((group) => (
                                    <DropdownMenuItem
                                      key={group.id}
                                      onClick={() => assignDomainToGroup(domain.name, group.id)}
                                    >
                                      {group.name}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => assignDomainToGroup(domain.name, null)}
                                  >
                                    Unassign
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                              <div className="p-4 bg-slate-50 border-t border-l-4 border-l-blue-500">
                                <div className="space-y-4">
                                  {/* Domain Summary */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Globe className="h-4 w-4 text-blue-600" />
                                        <span className="text-xs font-semibold text-slate-700">Resolved Address</span>
                                      </div>
                                      {domain.resolvedAddress ? (
                                        <div className="flex items-center gap-2">
                                          <code className="text-xs font-mono text-slate-900 break-all">{domain.resolvedAddress}</code>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                              navigator.clipboard.writeText(domain.resolvedAddress!);
                                              toast.success('Address copied');
                                            }}
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-500">Not set</span>
                                      )}
                                    </div>
                                    
                                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <SettingsIcon className="h-4 w-4 text-purple-600" />
                                        <span className="text-xs font-semibold text-slate-700">Resolver</span>
                                      </div>
                                      {domain.resolver ? (
                                        <div className="flex items-center gap-2">
                                          <code className="text-xs font-mono text-slate-900 break-all">{domain.resolver}</code>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                              navigator.clipboard.writeText(domain.resolver!);
                                              toast.success('Resolver copied');
                                            }}
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-500">Not set</span>
                                      )}
                                    </div>
                                    
                                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Lock className="h-4 w-4 text-indigo-600" />
                                        <span className="text-xs font-semibold text-slate-700">Status</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {domain.isWrapped ? (
                                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">Wrapped</Badge>
                                        ) : (
                                          <Badge variant="outline">Standard</Badge>
                                        )}
                                        {domain.expiryDate && (
                                          <Badge variant={getExpirationStatus(domain.expiryDate) === 'expired' ? 'destructive' : 'secondary'}>
                                            {getDaysUntilExpiration(domain.expiryDate)} days left
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4 text-green-600" />
                                        <span className="text-xs font-semibold text-slate-700">Registration Age</span>
                                      </div>
                                      {domain.registrationDate ? (
                                        <span className="text-xs text-slate-900">
                                          {Math.floor((Date.now() - domain.registrationDate.getTime()) / (1000 * 60 * 60 * 24))} days ago
                                        </span>
                                      ) : (
                                        <span className="text-xs text-slate-500">Unknown</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-slate-900 font-semibold">Domain History</h3>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => refreshDomainHistory(domain.name)}
                                      className="h-8"
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Refresh
                                    </Button>
                                  </div>
                                  
                                  {(() => {
                                    const isLoading = loadingHistory.has(domain.name);
                                    const history = domainHistoryCache.get(domain.name) || [];
                                    
                                    if (isLoading) {
                                      return (
                                        <div className="flex items-center justify-center py-8">
                                          <div className="flex items-center gap-2 text-slate-600">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span>Loading history...</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    if (history.length > 0) {
                                      return (
                                        <div className="space-y-3">
                                          {history.map((event, eventIndex) => {
                                            const eventId = `${domain.name}-${eventIndex}`;
                                            const isEventExpanded = expandedEvents.has(eventId);
                                            
                                            return (
                                            <div key={eventIndex} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                              <div 
                                                className="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => toggleEventExpansion(eventId)}
                                              >
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
                                                {event.type === 'text_change' && (
                                                  <div className="h-8 w-8 rounded-full bg-cyan-100 flex items-center justify-center">
                                                    <FileEdit className="h-4 w-4 text-cyan-600" />
                                                  </div>
                                                )}
                                                {event.type === 'resolver_change' && (
                                                  <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
                                                    <SettingsIcon className="h-4 w-4 text-violet-600" />
                                                  </div>
                                                )}
                                                {event.type === 'wrapper_change' && (
                                                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <Lock className="h-4 w-4 text-indigo-600" />
                                                  </div>
                                                )}
                                                {event.type === 'approval' && (
                                                  <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
                                                    <Users className="h-4 w-4 text-rose-600" />
                                                  </div>
                                                )}
                                                {event.type === 'controller_change' && (
                                                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                    <Key className="h-4 w-4 text-orange-600" />
                                                  </div>
                                                )}
                                                {event.type === 'metadata_change' && (
                                                  <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                                                    <FileText className="h-4 w-4 text-teal-600" />
                                                  </div>
                                                )}
                                                {event.type === 'mint' && (
                                                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                                    <Plus className="h-4 w-4 text-green-600" />
                                                  </div>
                                                )}
                                                {event.type === 'expired' && (
                                                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                                  </div>
                                                )}
                                                {event.type === 'sale' && (
                                                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                                    <Wallet className="h-4 w-4 text-yellow-600" />
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                  <p className="text-slate-900 font-medium">{event.description}</p>
                                                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <Clock className="h-4 w-4" />
                                                    <span>{event.date.toLocaleDateString()}</span>
                                                    {isEventExpanded ? (
                                                      <ChevronDown className="h-4 w-4 ml-2" />
                                                    ) : (
                                                      <ChevronRight className="h-4 w-4 ml-2" />
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                  <Wallet className="h-3 w-3" />
                                                  <code className="break-all">{event.address}</code>
                                                </div>
                                                  {event.txHash && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs p-1"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          window.open(`https://etherscan.io/tx/${event.txHash}`, '_blank');
                                                        }}
                                                      >
                                                        <ExternalLink className="h-3 w-3 mr-1" />
                                                        View TX: {event.txHash.slice(0, 8)}...{event.txHash.slice(-6)}
                                                      </Button>
                                                    </div>
                                                  )}
                                                  {event.cost && (
                                                    <div className="text-xs text-slate-600">
                                                      Cost: {(parseInt(event.cost) / 1e18).toFixed(4)} ETH
                                                    </div>
                                                  )}
                                                  {event.price && (
                                                    <div className="text-xs text-slate-600">
                                                      Price: <code className="text-slate-700">{event.price}</code>
                                                    </div>
                                                  )}
                                                  {event.expiryDate && (
                                                    <div className="text-xs text-slate-600">
                                                      Expires: {event.expiryDate.toLocaleDateString()}
                                                    </div>
                                                  )}
                                                  {event.newValue && (
                                                    <div className="text-xs text-slate-600">
                                                      Value: <code className="text-slate-700">{event.newValue}</code>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                              
                                              {/* Expandable details section */}
                                              {isEventExpanded && (
                                                <div className="border-t bg-slate-50 p-4">
                                                  <div className="grid gap-3 md:grid-cols-2">
                                                    <div>
                                                      <div className="text-xs font-semibold text-slate-700 mb-1">Event Type</div>
                                                      <div className="text-sm text-slate-900">{event.type}</div>
                                                    </div>
                                                    <div>
                                                      <div className="text-xs font-semibold text-slate-700 mb-1">Date & Time</div>
                                                      <div className="text-sm text-slate-900">{event.date.toLocaleString()}</div>
                                                    </div>
                                                    <div>
                                                      <div className="text-xs font-semibold text-slate-700 mb-1">Address</div>
                                                      <div className="text-sm text-slate-900 break-all">{event.address}</div>
                                                    </div>
                                                    {event.txHash && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Transaction Hash</div>
                                                        <div className="text-sm text-slate-900 break-all">{event.txHash}</div>
                                                      </div>
                                                    )}
                                                    {event.cost && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Cost</div>
                                                        <div className="text-sm text-slate-900">{(parseInt(event.cost) / 1e18).toFixed(4)} ETH</div>
                                                      </div>
                                                    )}
                                                    {event.price && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Price</div>
                                                        <div className="text-sm text-slate-900">{event.price}</div>
                                                      </div>
                                                    )}
                                                    {event.expiryDate && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Expiry Date</div>
                                                        <div className="text-sm text-slate-900">{event.expiryDate.toLocaleDateString()}</div>
                                                      </div>
                                                    )}
                                                    {event.previousValue && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Previous Value</div>
                                                        <div className="text-sm text-slate-900 break-all">{event.previousValue}</div>
                                                      </div>
                                                    )}
                                                    {event.newValue && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">New Value</div>
                                                        <div className="text-sm text-slate-900 break-all">{event.newValue}</div>
                                                      </div>
                                                    )}
                                                    {event.blockNumber && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Block Number</div>
                                                        <div className="text-sm text-slate-900">{parseInt(event.blockNumber).toLocaleString()}</div>
                                                      </div>
                                                    )}
                                                    {event.status && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Status</div>
                                                        <div className={`text-sm ${event.status === 'Success' ? 'text-green-600' : 'text-red-600'}`}>
                                                          {event.status}
                                                        </div>
                                                      </div>
                                                    )}
                                                    {event.gasUsed && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Gas Used</div>
                                                        <div className="text-sm text-slate-900">{parseInt(event.gasUsed).toLocaleString()}</div>
                                                      </div>
                                                    )}
                                                    {event.gasCost && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Gas Cost</div>
                                                        <div className="text-sm text-slate-900">{event.gasCost} ETH</div>
                                                      </div>
                                                    )}
                                                    {event.from && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">From</div>
                                                        <div className="text-sm text-slate-900 break-all">{event.from}</div>
                                                      </div>
                                                    )}
                                                    {event.to && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">To</div>
                                                        <div className="text-sm text-slate-900 break-all">{event.to}</div>
                                                      </div>
                                                    )}
                                                    {event.value && event.value !== '0' && (
                                                      <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Value</div>
                                                        <div className="text-sm text-slate-900">{(parseInt(event.value) / 1e18).toFixed(6)} ETH</div>
                                                      </div>
                                                    )}
                                                  </div>
                                                  
                                                  {event.txHash && (
                                                    <div className="mt-4 pt-4 border-t">
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          window.open(`https://etherscan.io/tx/${event.txHash}`, '_blank');
                                                        }}
                                                      >
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        View on Etherscan
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            );
                                          })}
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
                                  
                                  {/* Quick Action Buttons */}
                                  <div className="border-t border-slate-200 pt-4 mt-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 sm:flex-none"
                                        onClick={() => viewOnENSApp(domain.name)}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 sm:flex-none"
                                        onClick={() => {
                                          window.open(`https://app.ens.domains/${domain.name}/extend`, '_blank');
                                        }}
                                      >
                                        <Zap className="h-3 w-3 mr-1" />
                                        Renew
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 sm:flex-none"
                                        onClick={() => {
                                          window.open(`https://app.ens.domains/${domain.name}/resolve`, '_blank');
                                        }}
                                      >
                                        <SettingsIcon className="h-3 w-3 mr-1" />
                                        Resolver
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
