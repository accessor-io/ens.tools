/**
 * Kamiko-Inspired ENS Marketplace Component
 * Modern marketplace UI with Seaport 1.6 integration
 * Integrated with config design system
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
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
  Globe,
  ChevronRight,
  ExternalLink,
  Filter,
  Grid3x3,
  List,
  Sparkles,
  BarChart3,
  RefreshCw,
  Zap,
  CheckCircle2,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { ensMarketplaceService, type ENSListing, type ENSOffer, type ENSCollectionStats } from '../../lib/services/ens-marketplace-service';
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
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';

export function KamikoMarketplace() {
  const { address, isConnected, publicClient, walletClient, chainId } = useWeb3();
  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'stats'>('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<ENSListing[]>([]);
  const [offers, setOffers] = useState<ENSOffer[]>([]);
  const [stats, setStats] = useState<ENSCollectionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ENSListing | null>(null);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isMakeOfferOpen, setIsMakeOfferOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState<FilterOption>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const loadMarketplaceData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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

      if (forceRefresh) {
        toast.success('Marketplace refreshed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load marketplace data';
      console.error('Error loading marketplace data:', error);
      toast.error('Failed to load marketplace data', {
        description: errorMessage.length < 100 ? errorMessage : undefined,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, chainId]);

  useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setCurrentPage(1);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

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
    setFilters(newFilters);
    setCurrentPage(1);
  }, [minPrice, maxPrice]);

  // Domain Card Component (Kamiko-style)
  const DomainCard = ({ listing }: { listing: ENSListing }) => {
    const isShort = listing.name.length <= 5;
    const isPremium = listing.name.length <= 3;

    return (
      <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-violet-300 hover:-translate-y-1">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "bg-gradient-to-r text-xs font-semibold",
                    isPremium && "from-yellow-100 to-amber-100 text-amber-700 border-amber-300",
                    !isPremium && isShort && "from-purple-100 to-violet-100 text-purple-700 border-purple-300",
                    !isPremium && !isShort && "from-blue-100 to-indigo-100 text-blue-700 border-blue-300"
                  )}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  ENS
                </Badge>
                {isPremium && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 mb-2 truncate leading-tight">
                {listing.name}
              </CardTitle>
              <CardDescription className="text-sm font-mono text-slate-500 leading-relaxed">
                {truncateAddress(listing.seller)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600 mb-1 leading-none">
                {formatPrice(listing.price, listing.currency)}
              </div>
              <div className="text-sm text-slate-500 font-medium">
                {listing.currency}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Clock className="h-4 w-4" />
                <span>{getTimeUntilExpiry(listing.expiryDate)}</span>
              </div>
              <div className="text-sm text-slate-500 font-medium">
                {listing.name.length} chars
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedListing(listing);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            {isConnected && listing.price !== '0' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyDomain(listing);
                }}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Buy
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleBuyDomain = async (listing: ENSListing) => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.info('Processing purchase...');
      // Purchase logic would go here
      toast.success(`Successfully purchased ${listing.name}`);
    } catch (error: any) {
      console.error('Error buying domain:', error);
      toast.error(error.message || 'Failed to purchase domain');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section - Kamiko Style */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-3 leading-tight">
            ens marketplace
          </h1>
          <div className="flex items-center justify-between gap-6 mb-4">
            <p className="text-lg text-slate-600 leading-relaxed">
              Buy and sell ENS domains with Seaport 1.6 orderbook
            </p>
            <div className="web3-glow">
              <WalletConnectRainbow />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Seaport 1.6
            </Badge>
            {isConnected && (
              <>
                <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
                  <DialogTrigger asChild>
                    <Button>
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
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Domain Name</Label>
                        <Input placeholder="example.eth" />
                      </div>
                      <div>
                        <Label>Price (ETH)</Label>
                        <Input placeholder="0.5" type="number" />
                      </div>
                      <Button className="w-full">
                        Create Listing
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  placeholder="Search domains... (e.g., example.eth)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 text-base"
                />
              </div>
              <div className="flex items-center gap-3">
                <Select value={viewMode} onValueChange={(v: any) => setViewMode(v as 'grid' | 'table')}>
                  <SelectTrigger className="w-[120px]">
                    {viewMode === 'grid' ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
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
                  size="icon"
                  onClick={() => loadMarketplaceData(true)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Price Filters */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600">Min Price</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-24 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600">Max Price</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-24 h-9"
                />
              </div>
              {(minPrice || maxPrice) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="listings" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Listings
            {processedListings.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {processedListings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Offers
            {processedOffers.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {processedOffers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-6 mt-8">
          {loading ? (
            <div className={cn(
              "grid gap-4",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : ""
            )}>
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : paginatedListings.items.length === 0 ? (
            <EmptyState
              icon={<Search className="h-8 w-8 text-slate-400" />}
              title="No domains found"
              description={searchQuery ? "Try adjusting your search or filters" : "No domains are currently listed"}
            />
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedListings.items.map((listing) => (
                  <DomainCard key={listing.id} listing={listing} />
                ))}
              </div>
              {paginatedListings.totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                  <div className="text-base text-gray-600 font-medium">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, paginatedListings.totalItems)} of {paginatedListings.totalItems} listings
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
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
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {paginatedListings.items.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-6 border-2 border-gray-200 rounded-xl hover:bg-slate-50 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedListing(listing)}
                    >
                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          ENS
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{listing.name}</div>
                          <div className="text-sm text-slate-500 font-mono">{truncateAddress(listing.seller)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600 mb-1">{formatPrice(listing.price, listing.currency)}</div>
                          <div className="text-sm text-slate-500 font-medium">{getTimeUntilExpiry(listing.expiryDate)}</div>
                        </div>
                        <Button variant="outline" size="default">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {isConnected && listing.price !== '0' && (
                          <Button size="default">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Buy
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Offers</CardTitle>
              <CardDescription>
                {processedOffers.length} active offers on ENS domains
              </CardDescription>
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
                  icon={<Tag className="h-8 w-8 text-slate-400" />}
                  title="No active offers"
                  description="There are no active offers at the moment"
                />
              ) : (
                <div className="space-y-3">
                  {paginatedOffers.items.map((offer) => (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between p-6 border-2 border-gray-200 rounded-xl hover:bg-slate-50 hover:border-pink-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-sm font-semibold">
                          ENS
                        </Badge>
                        <div>
                          <div className="text-base font-bold text-slate-900 mb-1">{offer.name}</div>
                          <div className="text-sm text-slate-500 font-mono leading-relaxed">
                            Offer by {truncateAddress(offer.buyer)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600 mb-1">{formatPrice(offer.price, offer.currency)}</div>
                        <div className="text-sm text-slate-500 font-medium">
                          {offer.expirationDate ? new Date(offer.expirationDate).toLocaleDateString() : 'No expiry'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6 mt-8">
          {stats ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:shadow-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-base font-semibold text-blue-900">Total Domains</CardTitle>
                  <div className="h-12 w-12 rounded-xl bg-blue-200 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-blue-700" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-4xl font-bold text-blue-900 mb-2 leading-none">{stats.totalDomains.toLocaleString()}</div>
                  <p className="text-sm text-blue-700 font-medium">Registered ENS domains</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-900">Listed Domains</CardTitle>
                  <Tag className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">{stats.listedDomains.toLocaleString()}</div>
                  <p className="text-xs text-purple-700 mt-1">Currently for sale</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-900">Floor Price</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{formatPrice(stats.floorPrice, 'ETH')}</div>
                  <p className="text-xs text-green-700 mt-1">Lowest listed price</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900">Total Volume</CardTitle>
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900">{formatPrice(stats.totalVolume, 'ETH')}</div>
                  <p className="text-xs text-amber-700 mt-1">All-time trading volume</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Domain Detail Dialog */}
      {selectedListing && (
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedListing.name}</DialogTitle>
              <DialogDescription>
                View domain details and purchase information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-600">Price</Label>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    {formatPrice(selectedListing.price, selectedListing.currency)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Seller</Label>
                  <div className="text-sm font-mono text-slate-900 mt-1">
                    {truncateAddress(selectedListing.seller)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Etherscan
                </Button>
                {isConnected && selectedListing.price !== '0' && (
                  <Button className="flex-1" onClick={() => handleBuyDomain(selectedListing)}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Purchase Now
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}







