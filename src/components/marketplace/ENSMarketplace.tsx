/**
 * ENS Marketplace Component
 * Specialized marketplace for ENS domain trading
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ShoppingCart,
  Search,
  TrendingUp,
  Clock,
  Tag,
  Eye,
  Plus,
  Loader2,
  AlertTriangle,
  DollarSign,
  Home,
  Globe,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Key,
  Lock,
  Calendar,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { useTransactionManager } from '../../lib/hooks/useTransactionManager';
import { ensMarketplaceService, type ENSListing, type ENSOffer, type ENSCollectionStats } from '../../lib/services/ens-marketplace-service';
import { premiumPriceService } from '../../lib/services/premium-price-service';
import { TransactionConfirmationDialog } from '../TransactionConfirmationDialog';
import { getErrorMessage } from '../../lib/utils/error-handler';
import { Sparkles, Info, ArrowUpDown, Filter, Grid3x3, List } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import {
  formatPrice,
  sortListings,
  filterListings,
  debounce,
  truncateAddress,
  getTimeUntilExpiry,
  paginate,
  type SortOption,
  type FilterOption,
} from '../../lib/utils/marketplace-utils';

export function ENSMarketplace() {
  const { address, isConnected, publicClient, walletClient, chainId } = useWeb3();
  const txManager = useTransactionManager();
  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'stats'>('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<ENSListing[]>([]);
  const [offers, setOffers] = useState<ENSOffer[]>([]);
  const [stats, setStats] = useState<ENSCollectionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isMakeOfferOpen, setIsMakeOfferOpen] = useState(false);
  const [createListingParams, setCreateListingParams] = useState({
    name: '',
    price: '',
  });
  const [makeOfferParams, setMakeOfferParams] = useState({
    name: '',
    price: '',
  });
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [expandedListings, setExpandedListings] = useState<Set<string>>(new Set());
  const [isPremiumName, setIsPremiumName] = useState(false);
  const [premiumPriceInfo, setPremiumPriceInfo] = useState<{ name: string; hasPremium: boolean } | null>(null);
  const [showPremiumConfirmDialog, setShowPremiumConfirmDialog] = useState(false);
  const [pendingListingParams, setPendingListingParams] = useState<{ name: string; price: string } | null>(null);
  const [buyConfirmation, setBuyConfirmation] = useState<{ open: boolean; listing: ENSListing | null }>({ open: false, listing: null });
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState<FilterOption>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const loadMarketplaceData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'listings') {
        const data = await ensMarketplaceService.getActiveListings(chainId || 1);
        setListings(data);
      } else if (activeTab === 'offers') {
        const data = await ensMarketplaceService.getActiveOffers(chainId || 1);
        setOffers(data);
      } else if (activeTab === 'stats') {
        const data = await ensMarketplaceService.getCollectionStats(chainId || 1);
        setStats(data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load marketplace data';
      console.error('Error loading marketplace data:', error);
      toast.error('Failed to load marketplace data', {
        description: errorMessage.length < 100 ? errorMessage : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, chainId]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery) {
      toast.error('Please enter a domain name to search');
      return;
    }

    setLoading(true);
    try {
      const data = await ensMarketplaceService.searchDomains(searchQuery, chainId || 1);
      setListings(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search domains';
      console.error('Error searching domains:', error);
      toast.error('Failed to search domains', {
        description: errorMessage.length < 100 ? errorMessage : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, chainId]);

  useEffect(() => {
    loadMarketplaceData();
    setCurrentPage(1); // Reset to first page when switching tabs
  }, [loadMarketplaceData]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      if (query) {
        handleSearch();
      } else {
        loadMarketplaceData();
      }
    }, 500),
    [handleSearch, loadMarketplaceData]
  );

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      loadMarketplaceData();
    }
  }, [searchQuery, debouncedSearch, loadMarketplaceData]);

  const toggleListingExpansion = (listingId: string) => {
    setExpandedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const checkPremiumName = async (name: string) => {
    if (!publicClient || !name) {
      setIsPremiumName(false);
      setPremiumPriceInfo(null);
      return;
    }

    try {
      const normalizedName = name.toLowerCase().trim();
      const priceInfo = await premiumPriceService.getPremiumPrice(publicClient, normalizedName);
      
      if (priceInfo && priceInfo.hasPremium) {
        setIsPremiumName(true);
        setPremiumPriceInfo({ name: normalizedName, hasPremium: true });
      } else {
        setIsPremiumName(false);
        setPremiumPriceInfo({ name: normalizedName, hasPremium: false });
      }
    } catch (error) {
      console.error('Error checking premium name:', error);
      setIsPremiumName(false);
      setPremiumPriceInfo(null);
    }
  };

  const handleCreateListing = async () => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!createListingParams.name || !createListingParams.price) {
      toast.error('Please fill in all fields');
      return;
    }

    // Check if name is premium
    const normalizedName = createListingParams.name.toLowerCase().trim();
    const priceInfo = await premiumPriceService.getPremiumPrice(publicClient, normalizedName);
    
    if (priceInfo && priceInfo.hasPremium) {
      // Show confirmation dialog for premium names
      setPendingListingParams({ name: normalizedName, price: createListingParams.price });
      setShowPremiumConfirmDialog(true);
      return;
    }

    // Proceed with regular listing
    await proceedWithListing(normalizedName, createListingParams.price);
  };

  const proceedWithListing = async (name: string, price: string) => {
    if (!walletClient || !publicClient) return;

    setIsCreatingOrder(true);
    try {
      const namehash = `0x${Buffer.from(name).toString('hex')}`;
      
      const orderParams = await ensMarketplaceService.createDomainListing({
        name,
        namehash,
        tokenId: namehash,
        price,
        publicClient,
        walletClient,
        chainId: chainId || 1,
      });

      toast.success('ENS domain listing created');
      console.log('Order parameters:', orderParams);
      setIsCreateListingOpen(false);
      setCreateListingParams({ name: '', price: '' });
      setIsPremiumName(false);
      setPremiumPriceInfo(null);
      setShowPremiumConfirmDialog(false);
      setPendingListingParams(null);
      loadMarketplaceData();
    } catch (error: any) {
      console.error('Error creating listing:', error);
      const errorMessage = error?.message || 'Failed to create listing';
      toast.error('Failed to create listing', {
        description: errorMessage.length < 100 ? errorMessage : 'Please check your wallet and try again',
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePremiumConfirm = async () => {
    if (pendingListingParams) {
      await proceedWithListing(pendingListingParams.name, pendingListingParams.price);
    }
  };

  const handleMakeOffer = async () => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!makeOfferParams.name || !makeOfferParams.price) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const normalizedName = makeOfferParams.name.toLowerCase().trim();
      const namehash = `0x${Buffer.from(normalizedName).toString('hex')}`;
      
      const orderParams = await ensMarketplaceService.createDomainOffer({
        name: normalizedName,
        namehash,
        tokenId: namehash,
        price: makeOfferParams.price,
        publicClient,
        walletClient,
        chainId: chainId || 1,
      });

      toast.success('ENS domain offer created');
      console.log('Offer parameters:', orderParams);
      setIsMakeOfferOpen(false);
      setMakeOfferParams({ name: '', price: '' });
      loadMarketplaceData();
    } catch (error: any) {
      console.error('Error making offer:', error);
      toast.error(error.message || 'Failed to create offer');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleBuyDomain = async (listing: ENSListing) => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!address) {
      toast.error('Wallet address not available');
      return;
    }

    // Check if user is trying to buy their own listing
    if (listing.seller.toLowerCase() === address.toLowerCase()) {
      toast.error('You cannot buy your own listing');
      return;
    }

    setBuyConfirmation({ open: true, listing });
  };

  const executeBuyDomain = async () => {
    const listing = buyConfirmation.listing;
    if (!listing || !walletClient || !publicClient || !chainId) {
      return;
    }

    try {
      // Fetch or reconstruct the Seaport order for this listing
      // In production, you'd fetch the actual order from the marketplace API
      // For now, we'll create a basic order structure
      const orderParams = {
        name: listing.name,
        namehash: listing.namehash,
        tokenId: listing.tokenId,
        price: listing.price,
        seller: listing.seller,
      };

      const executeFn = async () => {
        // The buyDomain method will handle Seaport order fulfillment
        return await ensMarketplaceService.buyDomain(
          orderParams,
          publicClient,
          walletClient,
          chainId
        );
      };

      await txManager.addTransaction(executeFn, {
        description: `Buy ${listing.name} for ${listing.price} ${listing.currency}`,
        onSuccess: () => {
          setBuyConfirmation({ open: false, listing: null });
          loadMarketplaceData();
        },
      });
    } catch (error: any) {
      console.error('Error buying domain:', error);
      const errorMessage = getErrorMessage(error);
      toast.error('Failed to buy domain', {
        description: errorMessage,
      });
      throw error;
    }
  };

  // Apply filters and sorting
  const processedListings = useMemo(() => {
    let filtered = listings.filter(listing =>
      listing.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    filtered = filterListings(filtered, filters);
    filtered = sortListings(filtered, sortBy);
    
    return filtered;
  }, [listings, searchQuery, filters, sortBy]);

  const processedOffers = useMemo(() => {
    let filtered = offers.filter(offer =>
      offer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    filtered = filterListings(filtered, filters);
    filtered = sortListings(filtered, sortBy);
    
    return filtered;
  }, [offers, searchQuery, filters, sortBy]);

  // Pagination
  const paginatedListings = useMemo(() => {
    return paginate(processedListings, currentPage, pageSize);
  }, [processedListings, currentPage, pageSize]);

  const paginatedOffers = useMemo(() => {
    return paginate(processedOffers, currentPage, pageSize);
  }, [processedOffers, currentPage, pageSize]);

  // Update filters
  useEffect(() => {
    const newFilters: FilterOption = {};
    if (minPrice) newFilters.minPrice = minPrice;
    if (maxPrice) newFilters.maxPrice = maxPrice;
    if (statusFilter.length > 0) newFilters.status = statusFilter;
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, [minPrice, maxPrice, statusFilter]);

  const formatExpiryDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const daysUntilExpiry = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry < 30) return `${daysUntilExpiry} days`;
    if (daysUntilExpiry < 365) return `${Math.floor(daysUntilExpiry / 30)} months`;
    return `${Math.floor(daysUntilExpiry / 365)} years`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ENS Marketplace</h1>
          <p className="text-slate-600 mt-1">
            Buy and sell ENS domains using Seaport protocol
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Globe className="h-3 w-3 mr-1" />
            ENS Domains
          </Badge>
          {isConnected && (
            <>
              <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    List Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>List ENS Domain</DialogTitle>
                    <DialogDescription>
                      List your ENS domain for sale on the marketplace
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        Domain Name
                        {isPremiumName && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Premium
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>This is a premium name. Sale proceeds will go to ENS DAO.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </Label>
                      <Input
                        placeholder="example.eth"
                        value={createListingParams.name}
                        onChange={(e) => {
                          setCreateListingParams({ ...createListingParams, name: e.target.value });
                          if (e.target.value) {
                            checkPremiumName(e.target.value);
                          } else {
                            setIsPremiumName(false);
                            setPremiumPriceInfo(null);
                          }
                        }}
                      />
                      {isPremiumName && (
                        <Alert className="mt-2 bg-purple-50 border-purple-200">
                          <AlertTriangle className="h-4 w-4 text-purple-600" />
                          <AlertDescription className="text-purple-800">
                            This is a premium name. When sold, the full amount (minus our marketplace fee) will go to ENS DAO. You will receive 0 ETH.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div>
                      <Label>Price (ETH)</Label>
                      <Input
                        placeholder="0.5"
                        value={createListingParams.price}
                        onChange={(e) => setCreateListingParams({ ...createListingParams, price: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateListing} disabled={isCreatingOrder} className="w-full">
                      {isCreatingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Create Listing
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isMakeOfferOpen} onOpenChange={setIsMakeOfferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Tag className="h-4 w-4 mr-2" />
                    Make Offer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Make Offer on Domain</DialogTitle>
                    <DialogDescription>
                      Make an offer on an ENS domain
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Domain Name</Label>
                      <Input
                        placeholder="example.eth"
                        value={makeOfferParams.name}
                        onChange={(e) => setMakeOfferParams({ ...makeOfferParams, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Offer Price (ETH)</Label>
                      <Input
                        placeholder="0.5"
                        value={makeOfferParams.price}
                        onChange={(e) => setMakeOfferParams({ ...makeOfferParams, price: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleMakeOffer} disabled={isCreatingOrder} className="w-full">
                      {isCreatingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Make Offer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to trade ENS domains.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search ENS Domains</CardTitle>
          <CardDescription>
            Search for ENS domains by name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="example.eth"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="listings">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Listings
          </TabsTrigger>
          <TabsTrigger value="offers">
            <Tag className="h-4 w-4 mr-2" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>ENS Domain Listings</CardTitle>
                  <CardDescription>
                    {paginatedListings.totalItems} domains available for purchase
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-r-none border-r"
                      onClick={() => setViewMode('table')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="name-asc">Name: A-Z</SelectItem>
                      <SelectItem value="name-desc">Name: Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full sm:w-auto"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
              {showFilters && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Min Price (ETH)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Max Price (ETH)</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={statusFilter.join(',')}
                        onValueChange={(v) => setStatusFilter(v ? v.split(',') : [])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setStatusFilter([]);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 py-8">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : paginatedListings.items.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="h-8 w-8" />}
                  title="No Listings Found"
                  description="No ENS domains match your search. Try a different search term or create a new listing."
                  action={{
                    label: 'Search Again',
                    onClick: handleSearch,
                  }}
                />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedListings.items.map((listing) => (
                    <Card key={listing.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleListingExpansion(listing.id)}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                ENS
                              </Badge>
                              <CardTitle className="text-lg">{listing.name}</CardTitle>
                            </div>
                            <CardDescription className="text-xs font-mono">
                              {truncateAddress(listing.seller)}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Price</span>
                            <span className="text-lg font-bold text-green-600">
                              {listing.price !== '0' ? formatPrice(listing.price, listing.currency) : 'Not Listed'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Expires</span>
                            <span className="text-sm text-slate-900">
                              {getTimeUntilExpiry(listing.expiryDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Status</span>
                            <Badge
                              variant={
                                listing.status === 'active'
                                  ? 'default'
                                  : listing.status === 'sold'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {listing.status}
                            </Badge>
                          </div>
                          {listing.price !== '0' && isConnected && (
                            <Button
                              className="w-full mt-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBuyDomain(listing);
                              }}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Buy Now
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedListings.items.map((listing) => {
                      const isExpanded = expandedListings.has(listing.id);
                      return (
                        <>
                        <TableRow 
                          key={listing.id}
                          className="cursor-pointer hover:bg-slate-50 transition-colors duration-200"
                          onClick={() => toggleListingExpansion(listing.id)}
                        >
                        <TableCell>
                          <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-slate-400" />
                              )}
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              ENS
                            </Badge>
                            <div className="font-medium">{listing.name}</div>
                            {/* Note: Premium detection would require async check per listing */}
                            {/* For performance, premium status is checked during listing creation */}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {truncateAddress(listing.seller)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {listing.price !== '0' ? (
                            <div className="font-semibold text-green-600">
                              {formatPrice(listing.price, listing.currency)}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-500">
                              Not Listed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Clock className="h-3 w-3" />
                            {getTimeUntilExpiry(listing.expiryDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              listing.status === 'active'
                                ? 'default'
                                : listing.status === 'sold'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toast.info(`Viewing ${listing.name}`)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {isConnected && listing.price !== '0' && (
                              <Button
                                size="sm"
                                onClick={() => handleBuyDomain(listing)}
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Buy
                              </Button>
                            )}
                            {listing.price === '0' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setMakeOfferParams({ name: listing.name, price: '' });
                                  setIsMakeOfferOpen(true);
                                }}
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                Make Offer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="p-4 bg-slate-50 border-t">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Seller Information
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-600">Address:</span>
                                      <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                        {listing.seller}
                                      </code>
                                    </div>
                                    {listing.resolvedAddress && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-600">Resolves to:</span>
                                        <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                          {listing.resolvedAddress}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Lock className="h-5 w-5" />
                                    Domain Information
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={listing.isWrapped ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-amber-100 text-amber-800 border-amber-300"}>
                                        {listing.isWrapped ? (
                                          <>
                                            <Lock className="h-4 w-4 mr-1" />
                                            Wrapped
                                          </>
                                        ) : (
                                          <>
                                            <Key className="h-4 w-4 mr-1" />
                                            Direct
                                          </>
                                        )}
                                      </Badge>
                                    </div>
                                    {listing.resolver && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-600">Resolver:</span>
                                        <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                          {listing.resolver.slice(0, 12)}...{listing.resolver.slice(-8)}
                                        </code>
                                      </div>
                                    )}
                                    {listing.expiryDate && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-500" />
                                        <span className="text-slate-600">Expires:</span>
                                        <span>{listing.expiryDate.toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {listing.registrationDate && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-500" />
                                        <span className="text-slate-600">Registered:</span>
                                        <span>{listing.registrationDate.toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {listing.price !== '0' && (
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-slate-900 mb-1">Listed Price</h4>
                                      <div className="text-2xl font-bold text-green-600">
                                        {listing.price} {listing.currency}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`https://etherscan.io/address/${listing.seller}`, '_blank');
                                        }}
                                      >
                                        <ExternalLink className="h-5 w-5 mr-1" />
                                        View on Etherscan
                                      </Button>
                                      {isConnected && (
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBuyDomain(listing);
                                          }}
                                        >
                                          <ShoppingCart className="h-5 w-5 mr-1" />
                                          Purchase Now
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {paginatedListings.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-4">
                  <div className="text-sm text-slate-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, paginatedListings.totalItems)} of {paginatedListings.totalItems} listings
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-slate-600 px-2">
                      Page {currentPage} of {paginatedListings.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(paginatedListings.totalPages, p + 1))}
                      disabled={currentPage === paginatedListings.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Offers</CardTitle>
                  <CardDescription>
                    {paginatedOffers.totalItems} active offers on ENS domains
                  </CardDescription>
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name: A-Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 py-8">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : paginatedOffers.items.length === 0 ? (
                <EmptyState
                  icon={<Tag className="h-8 w-8" />}
                  title="No Active Offers"
                  description="There are no active offers on ENS domains. Make an offer on a domain to get started."
                  action={{
                    label: 'Browse Listings',
                    onClick: () => setActiveTab('listings'),
                  }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Offer Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOffers.items.map((offer) => (
                      <TableRow key={offer.id} className="hover:bg-slate-50 transition-colors duration-200">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              ENS
                            </Badge>
                            <div className="font-medium">{offer.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {truncateAddress(offer.buyer)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-blue-600">
                            {formatPrice(offer.price, offer.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              offer.status === 'active'
                                ? 'default'
                                : offer.status === 'accepted'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {offer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {paginatedOffers.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-slate-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, paginatedOffers.totalItems)} of {paginatedOffers.totalItems} offers
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-slate-600">
                      Page {currentPage} of {paginatedOffers.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(paginatedOffers.totalPages, p + 1))}
                      disabled={currentPage === paginatedOffers.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900">Total Domains</CardTitle>
                  <Globe className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{stats.totalDomains.toLocaleString()}</div>
                  <p className="text-xs text-blue-700 mt-1">
                    Registered ENS domains
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-900">Listed Domains</CardTitle>
                  <Tag className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">{stats.listedDomains.toLocaleString()}</div>
                  <p className="text-xs text-purple-700 mt-1">
                    Currently for sale
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-900">Floor Price</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{formatPrice(stats.floorPrice, 'ETH')}</div>
                  <p className="text-xs text-green-700 mt-1">
                    Lowest listed price
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900">Total Volume</CardTitle>
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900">{formatPrice(stats.totalVolume, 'ETH')}</div>
                  <p className="text-xs text-amber-700 mt-1">
                    All-time trading volume
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>ENS Marketplace Statistics</CardTitle>
                <CardDescription>
                  Overview of ENS domain trading activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">Average Price</div>
                    <div className="text-2xl font-bold text-slate-900">{formatPrice(stats.averagePrice, 'ETH')}</div>
                    <div className="text-xs text-slate-500">Per domain sale</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">Total Sales</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.totalSales.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Completed transactions</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">Active Offers</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.activeOffers}</div>
                    <div className="text-xs text-slate-500">Pending offers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!stats && !loading && (
            <div className="text-center py-8 text-slate-500">
              No statistics available. Click the search button to load ENS marketplace data.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Premium Name Confirmation Dialog */}
      <Dialog open={showPremiumConfirmDialog} onOpenChange={setShowPremiumConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Premium Name Listing
            </DialogTitle>
            <DialogDescription>
              Important information about listing a premium name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-purple-50 border-purple-200">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-purple-900">Sale Proceeds Go to ENS DAO</AlertTitle>
              <AlertDescription className="text-purple-800">
                This is a premium ENS name. When this domain is sold:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>The full sale amount (minus our 2.5% marketplace fee) will go to ENS DAO</li>
                  <li>You will receive <strong>0 ETH</strong> from the sale</li>
                  <li>Our marketplace fee will still be collected</li>
                </ul>
              </AlertDescription>
            </Alert>
            {pendingListingParams && (
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Domain:</span>
                  <span className="font-semibold">{pendingListingParams.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Listing Price:</span>
                  <span className="font-semibold">{pendingListingParams.price} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">You will receive:</span>
                  <span className="font-semibold text-red-600">0 ETH</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPremiumConfirmDialog(false);
                  setPendingListingParams(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePremiumConfirm}
                disabled={isCreatingOrder}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Yes, List Anyway'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buy Domain Confirmation Dialog */}
      {buyConfirmation.listing && (
        <TransactionConfirmationDialog
          open={buyConfirmation.open}
          onOpenChange={(open) => setBuyConfirmation({ ...buyConfirmation, open })}
          title="Purchase ENS Domain"
          description={`You are about to purchase ${buyConfirmation.listing.name} from the marketplace.`}
          action="Confirm Purchase"
          details={`Price: ${buyConfirmation.listing.price} ${buyConfirmation.listing.currency}\nSeller: ${buyConfirmation.listing.seller.slice(0, 10)}...${buyConfirmation.listing.seller.slice(-8)}`}
          warning="This transaction will transfer the domain to your address and send payment to the seller."
          requiresConfirmation
          onConfirm={executeBuyDomain}
        />
      )}
    </div>
  );
}

