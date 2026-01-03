import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { nameBrowserService } from '../../lib/services/name-browser-service';
import { nameWatchingService } from '../../lib/services/name-watching-service';
import { premiumPriceService, PremiumPriceInfo } from '../../lib/services/premium-price-service';
import { ENSDomain, fetchDomainHistory, DomainHistoryEvent } from '../../lib/ens/ens-utils';
import { useWeb3 } from '../../lib/services';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Textarea } from '../ui/textarea';
import { Loader2, Search, Clock, AlertCircle, XCircle, Sparkles, ArrowUpDown, Filter, X, ArrowUp, ArrowDown, ArrowDownWideNarrow, Zap, Eye, FileText, Copy, Check, ChevronDown, ChevronRight, History, RefreshCw, Wallet, Globe, ArrowRightLeft, Plus, Lock, Users, Key, FileEdit, Settings as SettingsIcon, Coins, ExternalLink, Link as LinkIcon, Download, Save, Bookmark, CheckSquare, Square } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Skeleton } from '../ui/skeleton';
import { toast } from 'sonner';
import { DomainProfile } from './DomainProfile';
import { WalletConnectRainbow } from '../WalletConnectRainbow';

type SortField = 'name' | 'expiryDate' | 'registrationDate' | 'length';
type SortDirection = 'asc' | 'desc';

export function NameBrowser() {
  const { publicClient } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'expiring-soon' | 'grace-period' | 'expired' | 'premium' | 'recent'>('recent');
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50; // Reduced from 1000 for better performance
  const [totalPages, setTotalPages] = useState(1);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('registrationDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filter state
  const [minLength, setMinLength] = useState<string>('');
  const [maxLength, setMaxLength] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [domainType, setDomainType] = useState<'all' | 'wrapped' | 'direct'>('all');
  const [hasResolver, setHasResolver] = useState<'all' | 'yes' | 'no'>('all');
  const [subdomainFilter, setSubdomainFilter] = useState<'all' | 'subdomains' | 'top-level'>('all');
  const [patternFilter, setPatternFilter] = useState<'all' | 'numbers' | 'letters' | 'mixed' | 'emoji'>('all');
  const [registrationDateFrom, setRegistrationDateFrom] = useState<string>('');
  const [registrationDateTo, setRegistrationDateTo] = useState<string>('');
  const [expiryDateFrom, setExpiryDateFrom] = useState<string>('');
  const [expiryDateTo, setExpiryDateTo] = useState<string>('');
  const [hasAddress, setHasAddress] = useState<'all' | 'yes' | 'no'>('all');
  const [characterType, setCharacterType] = useState<'all' | 'letters-only' | 'numbers-only' | 'mixed' | 'punctuation'>('all');
  
  // Infinite scroll ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isInfiniteScrolling, setIsInfiniteScrolling] = useState(true);
  
  // Watching state
  const [watchedNames, setWatchedNames] = useState<Set<string>>(new Set());
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [domainHistoryCache, setDomainHistoryCache] = useState<Map<string, DomainHistoryEvent[]>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());
  
  // Premium prices cache
  const [premiumPrices, setPremiumPrices] = useState<Map<string, PremiumPriceInfo>>(new Map());
  
  // Selected domain for profile view
  const [selectedDomain, setSelectedDomain] = useState<ENSDomain | null>(null);
  
  // Bulk selection
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // Saved filter presets
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; filters: any }>>([]);
  const [presetName, setPresetName] = useState('');

  const loadDomains = async (reset: boolean = false) => {
    setLoading(true);
    try {
      const page = reset ? 0 : currentPage;
      const skip = page * pageSize;
      
      console.log(`Loading domains for tab: ${activeTab}, page: ${page}, skip: ${skip}`);
      
      const fetchedDomains = await nameBrowserService.fetchNamesByStatus(
        activeTab,
        pageSize,
        skip
      );

      console.log(`Fetched ${fetchedDomains.length} domains`);

      if (reset) {
        setDomains(fetchedDomains);
        setCurrentPage(0);
      } else {
        setDomains((prev) => [...prev, ...fetchedDomains]);
      }

      setHasMore(fetchedDomains.length === pageSize);
      // Estimate total pages (we don't have exact count, so estimate based on results)
      if (fetchedDomains.length > 0) {
        setTotalPages(Math.ceil((skip + fetchedDomains.length) / pageSize) + 1);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(0);
    setHasMore(true);
    // Update default sort based on tab
    if (activeTab === 'recent') {
      setSortField('registrationDate');
      setSortDirection('desc');
    } else if (activeTab === 'expiring-soon' || activeTab === 'grace-period' || activeTab === 'expired') {
      setSortField('expiryDate');
      setSortDirection('asc');
    } else {
      setSortField('registrationDate');
      setSortDirection('desc');
    }
    loadDomains(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load watched names
  useEffect(() => {
    const watched = nameWatchingService.getWatchedNames();
    setWatchedNames(new Set(watched.map(w => w.name.toLowerCase())));
  }, []);

  // Fetch premium prices for domains in premium tab
  useEffect(() => {
    if (activeTab === 'premium' && publicClient && domains.length > 0) {
      domains.forEach(domain => {
        fetchPremiumPrice(domain.name);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, domains, publicClient]);

  const handleLoadMore = useCallback(async () => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      setLoading(true);
      try {
        const fetchedDomains = await nameBrowserService.fetchNamesByStatus(
          activeTab,
          pageSize,
          nextPage * pageSize
        );
        setDomains((prev) => [...prev, ...fetchedDomains]);
        setHasMore(fetchedDomains.length === pageSize);
      } catch (error) {
        console.error('Error loading more domains:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [loading, hasMore, currentPage, activeTab]);

  // Infinite scroll handler
  useEffect(() => {
    if (!isInfiniteScrolling) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Load more when user is within 200px of the bottom
      if (distanceFromBottom < 200 && !loading && hasMore) {
        handleLoadMore();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isInfiniteScrolling, loading, hasMore, handleLoadMore]);

  // Filter domains
  const filteredDomains = useMemo(() => {
    let filtered = domains;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(domain => 
        domain.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Owner filter
    if (ownerFilter) {
      filtered = filtered.filter(domain => 
        domain.owner.toLowerCase().includes(ownerFilter.toLowerCase())
      );
    }

    // Length filters
    if (minLength || maxLength) {
      filtered = filtered.filter(domain => {
        const labelLength = domain.labelName?.length || domain.name.split('.')[0].length;
        if (minLength && labelLength < parseInt(minLength)) return false;
        if (maxLength && labelLength > parseInt(maxLength)) return false;
        return true;
      });
    }

    // Domain type filter
    if (domainType !== 'all') {
      filtered = filtered.filter(domain => 
        domainType === 'wrapped' ? domain.isWrapped : !domain.isWrapped
      );
    }

    // Resolver filter
    if (hasResolver !== 'all') {
      filtered = filtered.filter(domain => 
        hasResolver === 'yes' ? !!domain.resolver : !domain.resolver
      );
    }

    // Subdomain filter
    if (subdomainFilter !== 'all') {
      filtered = filtered.filter(domain => {
        const parts = domain.name.split('.');
        const isSubdomain = parts.length > 2; // subdomain.eth has 2 parts, my.subdomain.eth has 3
        return subdomainFilter === 'subdomains' ? isSubdomain : !isSubdomain;
      });
    }

    // Pattern filter (numbers, emoji)
    if (patternFilter !== 'all') {
      filtered = filtered.filter(domain => {
        const label = domain.labelName || domain.name.split('.')[0];
        
        if (patternFilter === 'numbers') {
          return /^[0-9]+$/.test(label);
        }
        
        if (patternFilter === 'emoji') {
          const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
          return emojiRegex.test(label);
        }
        
        return true;
      });
    }

    // Character type filter
    if (characterType !== 'all') {
      filtered = filtered.filter(domain => {
        const label = domain.labelName || domain.name.split('.')[0];
        
        if (characterType === 'letters-only') {
          return /^[a-zA-Z]+$/.test(label);
        }
        if (characterType === 'numbers-only') {
          return /^[0-9]+$/.test(label);
        }
        if (characterType === 'mixed') {
          return /[a-zA-Z]/.test(label) && /[0-9]/.test(label);
        }
        if (characterType === 'punctuation') {
          return /[^a-zA-Z0-9]/.test(label);
        }
        
        return true;
      });
    }

    // Has address filter - check if domain has an address record set
    if (hasAddress !== 'all') {
      filtered = filtered.filter(domain => {
        // For now, we'll check if resolver is set as a proxy for having records
        // In a full implementation, you'd check the actual address record
        const hasAddr = !!domain.resolver; // Simplified check
        return hasAddress === 'yes' ? hasAddr : !hasAddr;
      });
    }

    // Registration date range filter
    if (registrationDateFrom || registrationDateTo) {
      filtered = filtered.filter(domain => {
        if (!domain.registrationDate) return false;
        const regDate = domain.registrationDate.getTime();
        if (registrationDateFrom) {
          const fromDate = new Date(registrationDateFrom).getTime();
          if (regDate < fromDate) return false;
        }
        if (registrationDateTo) {
          const toDate = new Date(registrationDateTo).getTime() + 86400000; // Add 1 day to include the end date
          if (regDate > toDate) return false;
        }
        return true;
      });
    }

    // Expiry date range filter
    if (expiryDateFrom || expiryDateTo) {
      filtered = filtered.filter(domain => {
        if (!domain.expiryDate) return false;
        const expDate = domain.expiryDate.getTime();
        if (expiryDateFrom) {
          const fromDate = new Date(expiryDateFrom).getTime();
          if (expDate < fromDate) return false;
        }
        if (expiryDateTo) {
          const toDate = new Date(expiryDateTo).getTime() + 86400000;
          if (expDate > toDate) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [domains, searchTerm, ownerFilter, minLength, maxLength, domainType, hasResolver, subdomainFilter, patternFilter, characterType, hasAddress, registrationDateFrom, registrationDateTo, expiryDateFrom, expiryDateTo]);

  // Sort domains
  const sortedDomains = useMemo(() => {
    const sorted = [...filteredDomains];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'expiryDate':
          const aExpiry = a.expiryDate?.getTime() || 0;
          const bExpiry = b.expiryDate?.getTime() || 0;
          comparison = aExpiry - bExpiry;
          break;
        case 'registrationDate':
          const aReg = a.registrationDate?.getTime() || 0;
          const bReg = b.registrationDate?.getTime() || 0;
          comparison = aReg - bReg;
          break;
        case 'length':
          const aLength = a.labelName?.length || a.name.split('.')[0].length;
          const bLength = b.labelName?.length || b.name.split('.')[0].length;
          comparison = aLength - bLength;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredDomains, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const hasActiveFilters = searchTerm || ownerFilter || minLength || maxLength || domainType !== 'all' || hasResolver !== 'all' || hasAddress !== 'all' || subdomainFilter !== 'all' || patternFilter !== 'all' || characterType !== 'all' || registrationDateFrom || registrationDateTo || expiryDateFrom || expiryDateTo;

  // Export functionality
  const exportToCSV = () => {
    const headers = ['Name', 'Owner', 'Expiry Date', 'Registration Date', 'Type', 'Status', 'Length'];
    const rows = sortedDomains.map(domain => {
      const labelLength = domain.labelName?.length || domain.name.split('.')[0].length;
      const status = nameBrowserService.getExpirationStatus(domain.expiryDate);
      return [
        domain.name,
        domain.owner,
        formatDate(domain.expiryDate),
        formatDate(domain.registrationDate),
        domain.isWrapped ? 'Wrapped' : 'Direct',
        status,
        labelLength.toString()
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ens-names-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const exportToJSON = () => {
    const data = sortedDomains.map(domain => ({
      name: domain.name,
      owner: domain.owner,
      expiryDate: domain.expiryDate?.toISOString(),
      registrationDate: domain.registrationDate?.toISOString(),
      isWrapped: domain.isWrapped,
      resolver: domain.resolver,
      labelLength: domain.labelName?.length || domain.name.split('.')[0].length
    }));
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ens-names-${activeTab}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to JSON');
  };

  // Bulk actions
  const handleBulkWatch = () => {
    selectedDomains.forEach(name => {
      if (!watchedNames.has(name.toLowerCase())) {
        nameWatchingService.addToWatchlist(name);
      }
    });
    setWatchedNames(prev => {
      const next = new Set(prev);
      selectedDomains.forEach(name => next.add(name.toLowerCase()));
      return next;
    });
    setSelectedDomains(new Set());
    setIsSelectMode(false);
    toast.success(`Added ${selectedDomains.size} names to watchlist`);
  };

  const handleBulkUnwatch = () => {
    selectedDomains.forEach(name => {
      nameWatchingService.removeFromWatchlist(name);
    });
    setWatchedNames(prev => {
      const next = new Set(prev);
      selectedDomains.forEach(name => next.delete(name.toLowerCase()));
      return next;
    });
    setSelectedDomains(new Set());
    setIsSelectMode(false);
    toast.success(`Removed ${selectedDomains.size} names from watchlist`);
  };

  const toggleDomainSelection = (name: string) => {
    setSelectedDomains(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedDomains(new Set(sortedDomains.map(d => d.name)));
  };

  const deselectAll = () => {
    setSelectedDomains(new Set());
  };

  const clearFilters = () => {
    setSearchTerm('');
    setOwnerFilter('');
    setMinLength('');
    setMaxLength('');
    setDomainType('all');
    setHasResolver('all');
    setHasAddress('all');
    setSubdomainFilter('all');
    setPatternFilter('all');
    setCharacterType('all');
    setRegistrationDateFrom('');
    setRegistrationDateTo('');
    setExpiryDateFrom('');
    setExpiryDateTo('');
  };

  // Quick filter presets
  const quickFilters = [
    {
      id: 'short',
      label: 'Short (3-4 chars)',
      minLength: '3',
      maxLength: '4',
    },
    {
      id: 'medium',
      label: 'Medium (5-7 chars)',
      minLength: '5',
      maxLength: '7',
    },
    {
      id: 'long',
      label: 'Long (8+ chars)',
      minLength: '8',
      maxLength: '',
    },
    {
      id: 'numbers-only',
      label: 'Numbers Only',
      pattern: 'numbers' as const,
    },
    {
      id: 'emoji',
      label: 'Contains Emoji',
      pattern: 'emoji' as const,
    },
    {
      id: 'wrapped',
      label: 'Wrapped Only',
      domainType: 'wrapped' as const,
    },
    {
      id: 'has-resolver',
      label: 'Has Resolver',
      hasResolver: 'yes' as const,
    },
    {
      id: 'no-resolver',
      label: 'No Resolver',
      hasResolver: 'no' as const,
    },
    {
      id: 'subdomains',
      label: 'Subdomains',
      subdomainFilter: 'subdomains' as const,
    },
    {
      id: 'top-level',
      label: 'Top-Level Only',
      subdomainFilter: 'top-level' as const,
    },
  ];

  const applyQuickFilter = (filter: typeof quickFilters[0]) => {
    if (filter.minLength) setMinLength(filter.minLength);
    if (filter.maxLength) setMaxLength(filter.maxLength);
    if (!filter.maxLength && filter.minLength === '8') {
      setMinLength('8');
      setMaxLength('');
    }
    if (filter.domainType) setDomainType(filter.domainType);
    if (filter.hasResolver) setHasResolver(filter.hasResolver);
    if (filter.subdomainFilter) setSubdomainFilter(filter.subdomainFilter);
    if (filter.pattern) setPatternFilter(filter.pattern);
  };

  const isQuickFilterActive = (filter: typeof quickFilters[0]) => {
    if (filter.minLength && filter.maxLength) {
      return minLength === filter.minLength && maxLength === filter.maxLength;
    }
    if (filter.minLength === '8' && !filter.maxLength) {
      return minLength === '8' && maxLength === '';
    }
    if (filter.domainType) {
      return domainType === filter.domainType;
    }
    if (filter.hasResolver) {
      return hasResolver === filter.hasResolver;
    }
    if (filter.subdomainFilter) {
      return subdomainFilter === filter.subdomainFilter;
    }
    if (filter.pattern) {
      return patternFilter === filter.pattern;
    }
    return false;
  };

  const handleWatchToggle = (name: string) => {
    if (watchedNames.has(name.toLowerCase())) {
      nameWatchingService.removeFromWatchlist(name);
      setWatchedNames(prev => {
        const next = new Set(prev);
        next.delete(name.toLowerCase());
        return next;
      });
    } else {
      nameWatchingService.addToWatchlist(name);
      setWatchedNames(prev => new Set(prev).add(name.toLowerCase()));
    }
  };

  const handleNotesClick = (name: string) => {
    const existingNotes = nameWatchingService.getNotes(name);
    setCurrentNotes(existingNotes || '');
    setNotesOpen(name);
  };

  const handleSaveNotes = (name: string) => {
    nameWatchingService.updateNotes(name, currentNotes);
    setNotesOpen(null);
    setCurrentNotes('');
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
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
          setLoadingHistory(prev => new Set(prev).add(domainName));
          fetchDomainHistory(domainName).then(history => {
            setDomainHistoryCache(prev => new Map(prev).set(domainName, history));
            setLoadingHistory(prev => {
              const next = new Set(prev);
              next.delete(domainName);
              return next;
            });
          }).catch(error => {
            console.error('Error fetching history:', error);
            setLoadingHistory(prev => {
              const next = new Set(prev);
              next.delete(domainName);
              return next;
            });
          });
        }
      }
      return newSet;
    });
  };

  const refreshDomainHistory = async (domainName: string) => {
    setLoadingHistory(prev => new Set(prev).add(domainName));
    try {
      const history = await fetchDomainHistory(domainName);
      setDomainHistoryCache(prev => new Map(prev).set(domainName, history));
    } catch (error) {
      console.error('Error refreshing history:', error);
    } finally {
      setLoadingHistory(prev => {
        const next = new Set(prev);
        next.delete(domainName);
        return next;
      });
    }
  };

  const fetchPremiumPrice = useCallback(async (name: string) => {
    if (!publicClient) return;
    
    try {
      const priceInfo = await premiumPriceService.getPremiumPrice(publicClient, name);
      if (priceInfo) {
        setPremiumPrices(prev => {
          if (prev.has(name)) return prev;
          return new Map(prev).set(name, priceInfo);
        });
      }
    } catch (error) {
      console.error('Error fetching premium price:', error);
    }
  }, [publicClient]);

  const getStatusBadge = (domain: ENSDomain) => {
    const status = nameBrowserService.getExpirationStatus(domain.expiryDate);
    const days = nameBrowserService.calculateDaysUntilExpiration(domain.expiryDate);

    switch (status) {
      case 'expiring-soon':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="w-4 h-4 mr-1" />
            {days} days
          </Badge>
        );
      case 'grace-period':
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
            <AlertCircle className="w-4 h-4 mr-1" />
            Grace: {Math.abs(days || 0)} days
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <XCircle className="w-4 h-4 mr-1" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const tabs = [
    {
      value: 'recent',
      label: 'Recent',
      description: 'Recently registered domains (last 30 days)',
      icon: RefreshCw,
    },
    {
      value: 'expiring-soon',
      label: 'Expiring Soon',
      description: 'Names expiring within 90 days',
      icon: Clock,
    },
    {
      value: 'grace-period',
      label: 'Grace Period',
      description: 'Names in grace period',
      icon: AlertCircle,
    },
    {
      value: 'expired',
      label: 'Expired',
      description: 'Names expired beyond grace period',
      icon: XCircle,
    },
    {
      value: 'premium',
      label: 'Premium',
      description: 'Short names (1-5 characters)',
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">name browser</h1>
        <div className="flex items-center justify-between gap-6 mb-4">
          <p className="text-slate-600">
            Browse ENS names by expiration status, grace period, and premium categories
          </p>
          <div className="web3-glow">
            <WalletConnectRainbow />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <Alert>
                          <tab.icon className="h-5 w-5" />
              <AlertDescription>{tab.description}</AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Domains</CardTitle>
                      <CardDescription>
                        Showing {sortedDomains.length} of {domains.length} total
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        placeholder="Search by name or owner..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setSearchTerm('');
                          }
                        }}
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => setSearchTerm('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Bulk Actions */}
                    {isSelectMode && selectedDomains.size > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="text-sm text-blue-900 font-medium">
                          {selectedDomains.size} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBulkWatch}
                          className="h-7 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Watch
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBulkUnwatch}
                          className="h-7 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Unwatch
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const selected = Array.from(selectedDomains);
                            const data = sortedDomains
                              .filter(d => selected.includes(d.name))
                              .map(domain => ({
                                name: domain.name,
                                owner: domain.owner,
                                expiryDate: domain.expiryDate?.toISOString(),
                                registrationDate: domain.registrationDate?.toISOString(),
                              }));
                            const jsonContent = JSON.stringify(data, null, 2);
                            const blob = new Blob([jsonContent], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `ens-names-selected-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success(`Exported ${selectedDomains.size} names`);
                          }}
                          className="h-7 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    )}
                    
                    {/* Select Mode Toggle */}
                    <Button
                      variant={isSelectMode ? "default" : "outline"}
                      onClick={() => {
                        setIsSelectMode(!isSelectMode);
                        if (isSelectMode) {
                          setSelectedDomains(new Set());
                        }
                      }}
                      title="Toggle selection mode"
                    >
                      {isSelectMode ? (
                        <>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Select Mode
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Select
                        </>
                      )}
                    </Button>
                    
                    {/* Export Buttons */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48">
                        <div className="space-y-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={exportToCSV}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Export as CSV
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={exportToJSON}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Export as JSON
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      onClick={() => setIsInfiniteScrolling(!isInfiniteScrolling)}
                      title={isInfiniteScrolling ? "Switch to Load More button" : "Enable infinite scroll"}
                    >
                      <ArrowDownWideNarrow className={`w-5 h-5 mr-2 ${isInfiniteScrolling ? 'text-blue-600' : ''}`} />
                      {isInfiniteScrolling ? 'Auto-scroll' : 'Manual'}
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="relative">
                          <Filter className="w-5 h-5 mr-2" />
                          Filters
                            {hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                              {[searchTerm, ownerFilter, minLength, maxLength, domainType !== 'all', hasResolver !== 'all', hasAddress !== 'all', subdomainFilter !== 'all', patternFilter !== 'all', characterType !== 'all', registrationDateFrom, registrationDateTo, expiryDateFrom, expiryDateTo].filter(Boolean).length}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 max-h-[600px] overflow-y-auto">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Filters</h4>
                            {hasActiveFilters && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-8 text-xs"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Clear All
                              </Button>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="owner-filter">Owner Address</Label>
                            <Input
                              id="owner-filter"
                              placeholder="0x..."
                              value={ownerFilter}
                              onChange={(e) => setOwnerFilter(e.target.value)}
                              className="font-mono text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label htmlFor="min-length">Min Length</Label>
                              <Input
                                id="min-length"
                                type="number"
                                placeholder="1"
                                value={minLength}
                                onChange={(e) => setMinLength(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="max-length">Max Length</Label>
                              <Input
                                id="max-length"
                                type="number"
                                placeholder="10"
                                value={maxLength}
                                onChange={(e) => setMaxLength(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="domain-type">Domain Type</Label>
                            <Select value={domainType} onValueChange={(value: any) => setDomainType(value)}>
                              <SelectTrigger id="domain-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="wrapped">Wrapped</SelectItem>
                                <SelectItem value="direct">Direct</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="resolver">Has Resolver</Label>
                            <Select value={hasResolver} onValueChange={(value: any) => setHasResolver(value)}>
                              <SelectTrigger id="resolver">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="subdomain-filter">Subdomain Type</Label>
                            <Select value={subdomainFilter} onValueChange={(value: any) => setSubdomainFilter(value)}>
                              <SelectTrigger id="subdomain-filter">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Domains</SelectItem>
                                <SelectItem value="subdomains">Subdomains Only</SelectItem>
                                <SelectItem value="top-level">Top-Level Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="has-address">Has Address</Label>
                            <Select value={hasAddress} onValueChange={(value: any) => setHasAddress(value)}>
                              <SelectTrigger id="has-address">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="character-type">Character Type</Label>
                            <Select value={characterType} onValueChange={(value: any) => setCharacterType(value)}>
                              <SelectTrigger id="character-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="letters-only">Letters Only</SelectItem>
                                <SelectItem value="numbers-only">Numbers Only</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                                <SelectItem value="punctuation">Has Punctuation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Registration Date Range</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="date"
                                placeholder="From"
                                value={registrationDateFrom}
                                onChange={(e) => setRegistrationDateFrom(e.target.value)}
                              />
                              <Input
                                type="date"
                                placeholder="To"
                                value={registrationDateTo}
                                onChange={(e) => setRegistrationDateTo(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Expiry Date Range</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="date"
                                placeholder="From"
                                value={expiryDateFrom}
                                onChange={(e) => setExpiryDateFrom(e.target.value)}
                              />
                              <Input
                                type="date"
                                placeholder="To"
                                value={expiryDateTo}
                                onChange={(e) => setExpiryDateTo(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    </div>
                  </div>
                  
                  {/* Quick Filters and Saved Presets */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Zap className="w-5 h-5" />
                      <span className="font-medium">Quick Filters:</span>
                    </div>
                    
                    {/* Saved Presets */}
                    {savedPresets.length > 0 && (
                      <>
                        <div className="h-6 w-px bg-slate-300" />
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Bookmark className="w-4 h-4" />
                          <span className="font-medium">Presets:</span>
                        </div>
                            {savedPresets.map((preset, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Apply preset filters
                              const setters: Record<string, (value: any) => void> = {
                                searchTerm: setSearchTerm,
                                ownerFilter: setOwnerFilter,
                                minLength: setMinLength,
                                maxLength: setMaxLength,
                                domainType: setDomainType,
                                hasResolver: setHasResolver,
                                subdomainFilter: setSubdomainFilter,
                                patternFilter: setPatternFilter,
                              };
                              Object.entries(preset.filters).forEach(([key, value]) => {
                                const setter = setters[key];
                                if (setter) {
                                  setter(value);
                                }
                              });
                            }}
                            className="h-8 text-xs"
                          >
                            {preset.name}
                          </Button>
                        ))}
                      </>
                    )}
                    
                    {/* Save Current Filters as Preset */}
                    {hasActiveFilters && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <Save className="w-3 h-3 mr-1" />
                            Save Preset
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-2">
                            <Label>Preset Name</Label>
                            <Input
                              placeholder="e.g., Short Premium Names"
                              value={presetName}
                              onChange={(e) => setPresetName(e.target.value)}
                            />
                            <Button
                              className="w-full"
                              onClick={() => {
                                if (presetName.trim()) {
                                  const filters = {
                                    searchTerm,
                                    ownerFilter,
                                    minLength,
                                    maxLength,
                                    domainType,
                                    hasResolver,
                                    subdomainFilter,
                                    patternFilter,
                                  };
                                  setSavedPresets(prev => [...prev, { name: presetName, filters }]);
                                  setPresetName('');
                                  toast.success('Preset saved');
                                }
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {quickFilters.map((filter) => (
                      <Button
                        key={filter.id}
                        variant={isQuickFilterActive(filter) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (isQuickFilterActive(filter)) {
                            // Clear if already active
                            if (filter.minLength) {
                              setMinLength('');
                              setMaxLength('');
                            }
                            if (filter.domainType) setDomainType('all');
                            if (filter.hasResolver) setHasResolver('all');
                            if (filter.subdomainFilter) setSubdomainFilter('all');
                            if (filter.pattern) setPatternFilter('all');
                          } else {
                            applyQuickFilter(filter);
                          }
                        }}
                        className="h-8 text-xs"
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading && domains.length === 0 ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-12 w-12 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                ) : sortedDomains.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No domains found
                  </div>
                ) : (
                  <>
                    <div 
                      ref={scrollContainerRef}
                      className="rounded-md border max-h-[600px] overflow-y-auto relative"
                    >
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            {isSelectMode && (
                              <TableHead className="w-12">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    if (selectedDomains.size === sortedDomains.length) {
                                      deselectAll();
                                    } else {
                                      selectAll();
                                    }
                                  }}
                                  title="Select all"
                                >
                                  {selectedDomains.size === sortedDomains.length && sortedDomains.length > 0 ? (
                                    <CheckSquare className="h-4 w-4" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                            )}
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 -ml-3"
                                onClick={() => handleSort('name')}
                              >
                                Name
                                {sortField === 'name' ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="ml-2 h-5 w-5" />
                                  ) : (
                                    <ArrowDown className="ml-2 h-5 w-5" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-2 h-5 w-5 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                            {activeTab === 'premium' && (
                              <>
                                <TableHead>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 -ml-3"
                                    onClick={() => handleSort('length')}
                                  >
                                    Length
                                    {sortField === 'length' ? (
                                      sortDirection === 'asc' ? (
                                        <ArrowUp className="ml-2 h-5 w-5" />
                                      ) : (
                                        <ArrowDown className="ml-2 h-5 w-5" />
                                      )
                                    ) : (
                                      <ArrowUpDown className="ml-2 h-5 w-5 opacity-50" />
                                    )}
                                  </Button>
                                </TableHead>
                                <TableHead>Premium Price</TableHead>
                              </>
                            )}
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 -ml-3"
                                onClick={() => handleSort('expiryDate')}
                              >
                                Expiry Date
                                {sortField === 'expiryDate' ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="ml-2 h-5 w-5" />
                                  ) : (
                                    <ArrowDown className="ml-2 h-5 w-5" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-2 h-5 w-5 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 -ml-3"
                                onClick={() => handleSort('registrationDate')}
                              >
                                Registration Date
                                {sortField === 'registrationDate' ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="ml-2 h-5 w-5" />
                                  ) : (
                                    <ArrowDown className="ml-2 h-5 w-5" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-2 h-5 w-5 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedDomains.map((domain) => {
                            const labelLength = domain.labelName?.length || domain.name.split('.')[0].length;
                            const isWatched = watchedNames.has(domain.name.toLowerCase());
                            const notes = nameWatchingService.getNotes(domain.name);
                            const isExpanded = expandedRows.has(domain.name);
                            const premiumPrice = premiumPrices.get(domain.name);
                            return (
                              <>
                              <TableRow 
                                key={domain.id}
                                className={`transition-colors hover:bg-slate-50 ${
                                  isSelectMode ? '' : 'cursor-pointer'
                                } ${
                                  selectedDomains.has(domain.name) ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => {
                                  if (isSelectMode) {
                                    toggleDomainSelection(domain.name);
                                  } else {
                                    setSelectedDomain(domain);
                                  }
                                }}
                              >
                                {isSelectMode && (
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => toggleDomainSelection(domain.name)}
                                    >
                                      {selectedDomains.has(domain.name) ? (
                                        <CheckSquare className="h-4 w-4 text-blue-600" />
                                      ) : (
                                        <Square className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                )}
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRowExpansion(domain.name);
                                      }}
                                      className="h-5 w-5 flex items-center justify-center hover:bg-slate-200 rounded transition-colors"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-5 w-5 text-slate-400" />
                                      ) : (
                                        <ChevronRight className="h-5 w-5 text-slate-400" />
                                      )}
                                    </button>
                                    <span className="flex items-center gap-2">
                                      {domain.name}
                                      {watchedNames.has(domain.name.toLowerCase()) && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Eye className="h-4 w-4 text-blue-600" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Watched</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm" onClick={(e) => e.stopPropagation()}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                          <span>{domain.owner}</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleCopyAddress(domain.owner)}
                                          >
                                            {copiedAddress === domain.owner ? (
                                              <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                              <Copy className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-mono text-xs">{domain.owner}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>{getStatusBadge(domain)}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleWatchToggle(domain.name)}
                                          >
                                            <Eye className={`h-5 w-5 ${isWatched ? 'text-blue-600 fill-blue-600' : ''}`} />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{isWatched ? 'Remove from watchlist' : 'Add to watchlist'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleNotesClick(domain.name)}
                                          >
                                            <FileText className={`h-5 w-5 ${notes ? 'text-green-600' : ''}`} />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{notes ? 'Edit notes' : 'Add notes'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                                {activeTab === 'premium' && (
                                  <>
                                    <TableCell>
                                      <Badge variant="outline" className={labelLength <= 3 ? "bg-purple-100 text-purple-800 border-purple-300" : ""}>
                                        {labelLength} chars
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {premiumPrice ? (
                                        <div className="flex items-center gap-2">
                                          {premiumPrice.hasPremium ? (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                              <Coins className="w-4 h-4 mr-1" />
                                              {premiumPriceService.formatPrice(premiumPrice.premium)}
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                              Available
                                            </Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-sm">Loading...</span>
                                      )}
                                    </TableCell>
                                  </>
                                )}
                                <TableCell>{formatDate(domain.expiryDate)}</TableCell>
                                <TableCell>{formatDate(domain.registrationDate)}</TableCell>
                                <TableCell>
                                  {domain.isWrapped ? (
                                    <Badge variant="outline">Wrapped</Badge>
                                  ) : (
                                    <Badge variant="outline">Direct</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={activeTab === 'premium' ? (isSelectMode ? 10 : 9) : (isSelectMode ? 8 : 7)}>
                                    <div className="p-4 bg-slate-50 border-t border-l-4 border-l-blue-500">
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <History className="h-5 w-5 text-blue-600" />
                                            <h3 className="text-lg font-semibold text-slate-900">Domain History</h3>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              refreshDomainHistory(domain.name);
                                            }}
                                            className="h-8 text-sm"
                                          >
                                            <RefreshCw className="h-4 w-4 mr-1.5" />
                                            Refresh
                                          </Button>
                                        </div>
                                        
                                        {(() => {
                                          const isLoading = loadingHistory.has(domain.name);
                                          const history = domainHistoryCache.get(domain.name) || [];
                                          
                                          if (isLoading) {
                                            return (
                                              <div className="flex items-center justify-center py-8">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                                  <span>Loading history...</span>
                                                </div>
                                              </div>
                                            );
                                          }
                                          
                                          if (history.length > 0) {
                                            return (
                                              <div className="space-y-3">
                                                {history.map((event, eventIndex) => (
                                                  <div key={eventIndex} className="bg-white rounded-lg border border-slate-200 p-4">
                                                    <div className="flex items-start gap-3">
                                                      <div className="flex-shrink-0">
                                                        {event.type === 'registration' && (
                                                          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <Plus className="h-4 w-4 text-blue-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'renewal' && (
                                                          <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                                            <RefreshCw className="h-4 w-4 text-emerald-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'transfer' && (
                                                          <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                                                            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'address_change' && (
                                                          <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center">
                                                            <Globe className="h-4 w-4 text-purple-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'text_change' && (
                                                          <div className="h-9 w-9 rounded-full bg-cyan-100 flex items-center justify-center">
                                                            <FileEdit className="h-4 w-4 text-cyan-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'resolver_change' && (
                                                          <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center">
                                                            <SettingsIcon className="h-4 w-4 text-violet-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'wrapper_change' && (
                                                          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
                                                            <Lock className="h-4 w-4 text-indigo-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'approval' && (
                                                          <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center">
                                                            <Users className="h-4 w-4 text-rose-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'controller_change' && (
                                                          <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                                                            <Key className="h-4 w-4 text-orange-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'mint' && (
                                                          <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                                                            <Plus className="h-4 w-4 text-green-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'expired' && (
                                                          <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                                          </div>
                                                        )}
                                                        {event.type === 'sale' && (
                                                          <div className="h-9 w-9 rounded-full bg-yellow-100 flex items-center justify-center">
                                                            <Wallet className="h-4 w-4 text-yellow-600" />
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                          <p className="text-base font-medium text-slate-900">{event.description}</p>
                                                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                            <Clock className="h-4 w-4" />
                                                            <span>{event.date.toLocaleDateString()}</span>
                                                          </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                          <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <Wallet className="h-3.5 w-3.5" />
                                                            <span className="font-mono text-slate-700">{event.address.slice(0, 10)}...{event.address.slice(-8)}</span>
                                                          </div>
                                                          {event.txHash && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                              <Globe className="h-3.5 w-3.5" />
                                                              <span className="font-mono text-slate-700">{event.txHash.slice(0, 12)}...{event.txHash.slice(-10)}</span>
                                                            </div>
                                                          )}
                                                          {event.cost && (
                                                            <div className="text-xs text-slate-600">
                                                              <span className="font-medium">Cost:</span> <span className="font-mono text-slate-700">{event.cost} ETH</span>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div className="text-center py-8 text-sm text-slate-500">
                                              No history available
                                            </div>
                                          );
                                        })()}
                                        
                                        {/* Quick Action Buttons */}
                                        <div className="border-t border-slate-200 pt-4 mt-4">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 sm:flex-none"
                                              onClick={() => {
                                                window.open(`https://app.ens.domains/${domain.name}`, '_blank');
                                              }}
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
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`https://app.ens.domains/${domain.name}`, '_blank');
                                              }}
                                            >
                                              <LinkIcon className="h-3 w-3 mr-1" />
                                              {domain.isWrapped ? 'Unwrap' : 'Wrap'}
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
                    </div>

                    {/* Notes Dialog */}
                    {notesOpen && (
                      <div className="fixed inset-0 bg-slate-200/30 backdrop-blur-sm flex items-center justify-center z-50">
                        <Card className="w-full max-w-md">
                          <CardHeader>
                            <CardTitle>Notes for {notesOpen}</CardTitle>
                            <CardDescription>Add or edit notes for this domain</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Textarea
                              placeholder="Enter your notes here..."
                              value={currentNotes}
                              onChange={(e) => setCurrentNotes(e.target.value)}
                              rows={6}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setNotesOpen(null);
                                  setCurrentNotes('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button onClick={() => handleSaveNotes(notesOpen)}>
                                Save Notes
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-slate-600">
                        Showing {sortedDomains.length} of {domains.length} {hasMore ? '+' : ''} domains
                        {currentPage > 0 && (
                          <span className="ml-2">(Page {currentPage + 1})</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (currentPage > 0) {
                              setCurrentPage(0);
                              loadDomains(true);
                            }
                          }}
                          disabled={currentPage === 0 || loading}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (currentPage > 0) {
                              const prevPage = currentPage - 1;
                              setCurrentPage(prevPage);
                              loadDomains(true);
                            }
                          }}
                          disabled={currentPage === 0 || loading}
                        >
                          Previous
                        </Button>
                        
                        {hasMore && (
                          <Button
                            onClick={handleLoadMore}
                            disabled={loading}
                            variant="outline"
                            size="sm"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              'Load More'
                            )}
                          </Button>
                        )}
                        
                        {!hasMore && domains.length > 0 && (
                          <span className="text-sm text-slate-500">All loaded</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Domain Profile Dialog */}
      {selectedDomain && (
        <DomainProfile
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
          onUpdate={() => {
            // Refresh domains if needed
            loadDomains(true);
          }}
        />
      )}
    </div>
  );
}

